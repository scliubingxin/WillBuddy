import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual Workbench delete handler, including its revision URL and conflict refresh behavior.
const source=readFileSync('app/workbench.tsx','utf8');
const handler=source.slice(source.indexOf(' async function remove()'),source.indexOf(' async function createTemplate'));
assert.ok(handler.includes('baseUpdated')&&handler.includes('reloadChat'),'delete handler carries revisions and reloads stale chats');
assert.ok(handler.includes("op:'restore_chat'")&&handler.includes('switchChat(restored.id'),'restore handler uses the opaque deletion token and opens only the server-restored chat');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;

async function scenario({target={id:'chat-a',kind:'chat',updated:9},active=true,doc=false,conflict=false}={}){
 let path='',reloaded=0,refreshed=0,newChats=0,closed=false,error='';
 const noop=()=>{};
 const confirm={id:target.id,name:'资源',...(doc?{doc:true}:{})};
 const context={confirm,records:[target],chatId:active?target.id:'chat-current',chatUpdated:active&&target.kind==='chat'?7:null,selectedSpace:'',spaceId:'',agentId:'',Number,encodeURIComponent,
  setSaving:noop,setSelectedSpace:noop,setSpaceId:noop,setAgentId:noop,setConfirm:value=>{closed=value===null},newChat:()=>{newChats++},
  reloadChat:async()=>{reloaded++},refresh:async()=>{refreshed++},toast:{success:noop,error:value=>{error=value}},
  api:async value=>{path=value;if(conflict)throw Error('对话已在另一页面更新，请刷新后再删除');return {ok:true}}};
 vm.createContext(context);vm.runInContext(js,context);await context.remove();
 if(conflict){assert.equal(reloaded,active?1:0);assert.equal(refreshed,active?0:1);assert.match(error,/另一页面/);assert.equal(closed,false);assert.equal(newChats,0);}
 else{assert.equal(closed,true);assert.equal(refreshed,1);assert.equal(newChats,active&&!doc?1:0);}
 cases++;return path;
}

assert.match(await scenario(),/api\/workspace\?id=chat-a&baseUpdated=7$/,'active chat uses the revision currently displayed');
assert.match(await scenario({active:false}),/api\/workspace\?id=chat-a&baseUpdated=9$/,'background chat uses its listed server revision');
assert.doesNotMatch(await scenario({target:{id:'agent-a',kind:'agent',updated:4},active:false}),/baseUpdated/,'non-chat deletion keeps the generic contract');
assert.doesNotMatch(await scenario({target:{id:'doc-a',kind:'document',updated:4},active:false,doc:true}),/baseUpdated/,'document deletion keeps its separate contract');
await scenario({conflict:true});
await scenario({active:false,conflict:true});

async function restoreScenario({fails=false}={}){
 let body,opened='',refreshed=0,error='';const item={id:'chat-deleted',name:'已删对话',deleted:123};
 const context={busy:false,saving:false,setSaving(){},api:async(path,value)=>{body=value;if(fails)throw Error('已删除对话不存在或已恢复');return {updated:456}},refresh:async()=>{refreshed++;return {records:[{id:item.id,kind:'chat',name:item.name,messages:[{role:'user',content:'原消息'}],updated:456}]}},switchChat:id=>{opened=id},toast:{success(){},error:value=>{error=value}}};
 vm.createContext(context);vm.runInContext(js,context);await context.restoreChat(item);
 if(fails){assert.match(error,/不存在|已恢复/);assert.equal(opened,'');}else{assert.equal(JSON.stringify(body),JSON.stringify({op:'restore_chat',id:item.id,deleted:item.deleted}));assert.equal(opened,item.id);}
 assert.ok(refreshed>=1);cases++;
}
await restoreScenario();await restoreScenario({fails:true});
console.log(`PASS: ${cases} composer delete/restore scenarios (actual handler, simulated IO)`);
