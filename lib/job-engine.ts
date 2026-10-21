import {db,getRecord} from './workspace';
import {runAI} from './ai-service';
import {executeConnector,webSearch} from './integrations';
import {secretFor} from './vault';
// Fence writes by the acquired revision: an expired lease does not stop an old request.
async function checkpoint(user:string,id:string,revision:number,state:any,release=true){
 const now=Date.now();
 const update=db().prepare(`UPDATE jobs SET state=?,updated=?${release?',lease=0':''} WHERE owner=? AND id=? AND revision=?`).bind(JSON.stringify(state),now,user,id,revision);
 // Completion and its artifact commit together; a stale request creates neither.
 const changed=state.status==='succeeded'?(await db().batch([
  db().prepare("INSERT INTO records(owner,id,kind,data,updated) SELECT ?,?,'artifact',?,? FROM jobs WHERE owner=? AND id=? AND revision=? ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data,updated=excluded.updated WHERE records.kind='artifact'").bind(user,'job-result-'+id,JSON.stringify({name:state.name,content:state.outputs.at(-1)?.content||'',format:'md'}),now,user,id,revision),
  update,
 ]))[1]:await update.run();
 if(!changed.meta.changes)throw new Error('任务状态已被其他请求更新，请刷新查看最新结果');
}
export function substitute(text:string,state:any){return String(text||'').replace(/\{\{(input|previous|step\.([a-zA-Z0-9_-]+))\}\}/g,(_,key,id)=>String(key==='input'?state.input:key==='previous'?state.outputs.at(-1)?.content||'':state.outputs.find((o:any)=>o.id===id)?.content||''));}
export function substituteValues(value:any,state:any):any{if(typeof value==='string')return substitute(value,state);if(Array.isArray(value))return value.map(v=>substituteValues(v,state));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,substituteValues(v,state)]));return value;}
type FlowIssue={level:'error'|'warning';code:string;message:string;nodeId?:string};
const nodeTypes=new Set(['input','ai','knowledge','search','condition','approval','action','output']);
const templatePattern=/\{\{([^{}]+)\}\}/g;
export function inspectNodes(nodes:any[]){
 const issues:FlowIssue[]=[];
 const add=(level:FlowIssue['level'],code:string,message:string,nodeId?:string)=>issues.push({level,code,message,nodeId});
 if(!Array.isArray(nodes)||!nodes.length||nodes.length>30){add('error','node_count','流程需包含 1–30 个步骤');return {valid:false,errors:issues,warnings:[],summary:{nodeCount:Array.isArray(nodes)?nodes.length:0,modelSteps:0,knowledgeSteps:0,networkSteps:0,externalActions:0,humanApprovals:0,reachableSteps:0}};}
 const ids=nodes.map(n=>n?.id),positions=new Map<string,number>();
 ids.forEach((id,index)=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(id))add('error','invalid_id',`第 ${index+1} 步的步骤标识无效`,typeof id==='string'?id:undefined);else if(positions.has(id))add('error','duplicate_id',`步骤标识“${id}”重复`,id);else positions.set(id,index);});
 nodes.forEach((node,index)=>{
  const id=typeof node?.id==='string'?node.id:undefined,type=node?.type;
  if(!nodeTypes.has(type)){add('error','unsupported_type',`第 ${index+1} 步的类型不受支持`,id);return;}
  if(type==='search'&&!node.connectorId)add('error','missing_connector','联网搜索步骤必须选择搜索连接器',id);
  if(type==='action'&&(!node.connectorId||!node.actionId))add('error','missing_action','连接器操作步骤必须选择连接器和操作',id);
  if(type==='knowledge'&&!node.spaceId)add('warning','missing_space','知识检索步骤未指定知识空间，将只使用运行时默认空间',id);
  if(['ai','knowledge','search','approval'].includes(type)&&!String(node.prompt||'').trim())add('warning','empty_prompt','该步骤没有填写指令或审阅内容',id);
  if(type==='condition'&&!node.then&&!node.otherwise)add('warning','implicit_condition_path','条件两条分支都未指定，将按顺序继续',id);
  for(const target of [node.then,node.otherwise].filter(Boolean)){
   if(target==='end')continue;const targetIndex=positions.get(target);
   if(targetIndex===undefined)add('error','missing_target',`条件分支指向不存在的步骤“${target}”`,id);
   else if(targetIndex<=index)add('error','backward_target','条件分支只能指向后续步骤或结束',id);
  }
  const text=JSON.stringify({prompt:node.prompt||'',expression:node.expression||'',args:node.args||{}});
  for(const match of text.matchAll(templatePattern)){
   const token=match[1];if(token==='input'||token==='previous')continue;
   if(!token.startsWith('step.')){add('error','unknown_template',`不支持的变量“{{${token}}}”`,id);continue;}
   const ref=token.slice(5),refIndex=positions.get(ref);
   if(refIndex===undefined)add('error','missing_reference',`引用的步骤“${ref}”不存在`,id);
   else if(refIndex>=index)add('error','future_reference',`不能引用当前或未来步骤“${ref}”`,id);
  }
 });
 const reachable=new Set<number>(),queue=[0];
 while(queue.length){const index=queue.shift()!;if(index<0||index>=nodes.length||reachable.has(index))continue;reachable.add(index);const node=nodes[index];if(node?.type==='condition')for(const target of [node.then,node.otherwise]){if(target==='end')continue;queue.push(target?positions.get(target)??nodes.length:index+1);}else queue.push(index+1);}
 nodes.forEach((node,index)=>{if(!reachable.has(index))add('warning','unreachable',`步骤“${node?.title||node?.id||index+1}”不会从流程入口到达`,node?.id);});
 const summary={nodeCount:nodes.length,modelSteps:nodes.filter(n=>n.type==='ai'||n.type==='knowledge').length,knowledgeSteps:nodes.filter(n=>n.type==='knowledge').length,networkSteps:nodes.filter(n=>n.type==='search').length,externalActions:nodes.filter(n=>n.type==='action').length,humanApprovals:nodes.filter(n=>n.type==='approval'||n.type==='action').length,reachableSteps:reachable.size};
 const errors=issues.filter(x=>x.level==='error'),warnings=issues.filter(x=>x.level==='warning');
 return {valid:!errors.length,errors,warnings,summary,boundaries:{externalActionsRequireConfirmation:true,doesNotExecute:true,modelCalls:0}};
}
export function validateNodes(nodes:any[]){const report=inspectNodes(nodes);if(!report.valid)throw new Error('流程检查失败：'+report.errors[0].message);return report;}
export async function advanceJob(user:string,id:string,credentials:any={}){
 const row=await db().prepare('SELECT state,revision,lease FROM jobs WHERE owner=? AND id=?').bind(user,id).first<any>();if(!row)throw new Error('运行记录不存在');const state=JSON.parse(row.state);if(['succeeded','cancelled','failed','waiting','executing_action'].includes(state.status))return state;if(row.lease>Date.now())return {...state,busy:true};
 const lock=await db().prepare('UPDATE jobs SET lease=?,revision=revision+1 WHERE owner=? AND id=? AND revision=? AND lease<=?').bind(Date.now()+240000,user,id,row.revision,Date.now()).run();if(!lock.meta.changes)throw new Error('任务正在由另一请求执行');const node=state.nodes[state.cursor];
 try{if(!node){state.status='succeeded';}else{
 const text=substitute(node.prompt,state);let content='';let sources:any[]=[];
 if(node.type==='approval'||node.type==='action'){state.status='waiting';state.pending={nodeId:node.id,type:node.type,title:node.title||node.type,content:text,connectorId:node.connectorId,actionId:node.actionId,args:node.args?substituteValues(node.args,state): {input:text}};if(node.type==='action'){const c=await getRecord(user,node.connectorId,'connector');if(!c.actions?.some((a:any)=>a.id===node.actionId))throw new Error('连接器操作不存在');state.pending.connectorSnapshot=c;state.pending.target=c.baseUrl;}}
 else if(node.type==='condition'){const hay=substitute(node.expression||'{{previous}}',state);const yes=node.operator==='equals'?hay===String(node.value):hay.toLowerCase().includes(String(node.value||'').toLowerCase());content=`条件结果：${yes?'满足':'不满足'}`;const target=yes?node.then:node.otherwise;state.cursor=target==='end'?state.nodes.length:target?state.nodes.findIndex((n:any)=>n.id===target):state.cursor+1;}
 else{if(node.type==='input')content=state.input;else if(node.type==='output')content=text||state.outputs.at(-1)?.content||state.input;else if(node.type==='search'){const conn=await getRecord(user,node.connectorId,'connector');if(conn.type!=='search')throw new Error('请选择搜索连接器');sources=await webSearch(text,await secretFor(user,node.connectorId,credentials.searchKey||''));content=sources.map((s,i)=>`[${i+1}] ${s.name} ${s.url}\n${s.content}`).join('\n\n');}else{const result=await runAI(user,{profileId:state.profileId,apiKey:credentials.apiKey,spaceId:node.spaceId||state.spaceId,agentId:node.agentId,messages:[{role:'user',content:`输入：${state.input}\n前一步：${state.outputs.at(-1)?.content||''}\n本步：${text}`}],instruction:'执行当前流程步骤，按事实输出。'},AbortSignal.timeout(180000));content=result.text;sources=result.sources;}state.cursor++;}
 if(state.status!=='waiting')state.outputs.push({id:node.id,title:node.title||node.type,content,sources,time:Date.now()});state.timeline.push({node:node.id,status:state.status==='waiting'?'waiting':'completed',time:Date.now()});
 if(state.cursor>=state.nodes.length&&state.status!=='waiting'){state.status='succeeded';}}
 }catch(e){state.status='failed';state.error=e instanceof Error?e.message:'执行失败';state.timeline.push({node:node?.id,status:'failed',time:Date.now()});}
 await checkpoint(user,id,row.revision+1,state);
 return state;
}
export async function decideJob(user:string,id:string,approve:boolean,credentials:any={}){
 const row=await db().prepare('SELECT state,revision,lease FROM jobs WHERE owner=? AND id=?').bind(user,id).first<any>();
 if(!row)throw new Error('任务不存在');const s=JSON.parse(row.state);
 if(s.status!=='waiting')throw new Error('当前任务不等待审批');
 const lock=await db().prepare('UPDATE jobs SET lease=?,revision=revision+1 WHERE owner=? AND id=? AND revision=? AND lease<=?').bind(Date.now()+240000,user,id,row.revision,Date.now()).run();
 if(!lock.meta.changes)throw new Error('任务已由其他请求处理');
 const node=s.pending.nodeId;
 try{
  if(!approve){s.status='cancelled';s.pending=null;s.timeline.push({node,status:'rejected',time:Date.now()});}
  else{
   let result='人工审批通过';
   if(s.pending.type==='action'){
    s.status='executing_action';s.timeline.push({node,status:'executing_action',time:Date.now()});
    await checkpoint(user,id,row.revision+1,s,false);
    await getRecord(user,s.pending.connectorId,'connector');
    const c=s.pending.connectorSnapshot;if(!c)throw new Error('操作快照不存在，请重新创建任务');
    result=JSON.stringify(await executeConnector(c,s.pending.actionId,s.pending.args,await secretFor(user,s.pending.connectorId,credentials.connectorKey||'')));
   }
   s.outputs.push({id:node,title:s.pending.title,content:result,time:Date.now()});
   s.cursor++;s.pending=null;s.status='ready';s.timeline.push({node,status:'approved',time:Date.now()});
  }
 }catch(e){s.status='failed';s.error=e instanceof Error?e.message:'操作失败，结果状态可能未知，请核对外部系统后决定是否新建任务';s.timeline.push({node,status:'failed',time:Date.now()});}
 await checkpoint(user,id,row.revision+1,s);return s;
}
