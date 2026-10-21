// Four bounded real calls through production API handlers in isolated workerd + D1/R2.
// The local test identity is never sent to production. Secret stays in process memory.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createWorkerFixture,WorkerResponse} from './worker-fixture.mjs';
const key=process.env.DEEPSEEK_API_KEY;
if(!key)throw new Error('Missing process secret DEEPSEEK_API_KEY');
const selected=process.argv[2]?.split(',');
if(selected?.some(id=>!['hello','knowledge-citation','no-evidence','data-calculation'].includes(id)))throw new Error('Unknown acceptance case');
let requests=0;
const fixture=await createWorkerFixture({bindings:{DEEPSEEK_API_KEY:key},outboundService:async req=>{
 if(req.url!=='https://api.deepseek.com/chat/completions'||req.method!=='POST')throw new Error('Unexpected external target');
 const body=await req.text(),payload=JSON.parse(body);
 if(++requests>4||payload.max_tokens>2048||payload.model!=='deepseek-flash')throw new Error('Acceptance budget exceeded');
 // Local workerd cannot resolve external DNS here. Explicit Node egress bridge;
 // workerd still validates fetch options. This is not production egress evidence.
 const r=await fetch(req.url,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',Authorization:req.headers.get('Authorization')},body,signal:AbortSignal.timeout(90000)});
 return new WorkerResponse(await r.arrayBuffer(),{status:r.status,headers:{'Content-Type':r.headers.get('Content-Type')||'application/json'}});
}});
const results=[];
const call=async(path,payload)=>{
 const r=await fixture.mf.dispatchFetch('http://fixture.test'+path,{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','Origin':'http://fixture.test','oai-authenticated-user-id':'synthetic-acceptance-user'},body:payload?JSON.stringify(payload):undefined});
 const data=await r.json();if(!r.ok)throw new Error(`Application HTTP ${r.status}: ${String(data.error||'failure').slice(0,180)}`);return data;
};
try{
 const db=await fixture.mf.getD1Database('DB');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
  for(const sql of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 }
 await call('/api/workspace',{id:'acceptance-space',kind:'space',data:{name:'合成采购规则'}});
 await call('/api/documents',{space:'acceptance-space',name:'采购审批.txt',text:'单笔采购金额超过五万元，需要部门负责人和财务负责人两级审批。紧急采购也不得跳过财务复核。'});
 const dataset=await call('/api/data',{op:'import',name:'合成金额',csv:'区域,金额\nA,30\nB,5'});
 const cases=[
  {id:'hello',input:'请只回复：幕云AI连接正常。',verify:d=>d.text.includes('幕云AI连接正常')},
  {id:'knowledge-citation',input:'六万元的采购需要谁审批？根据采购资料回答并引用来源编号。',extra:{spaceId:'acceptance-space'},verify:d=>d.text.includes('部门负责人')&&d.text.includes('财务负责人')&&d.citationAudit.status==='valid'&&d.sources[0]?.retrieval?.locator==='片段 1'},
  {id:'no-evidence',input:'火星基地氧气产量是多少？',extra:{spaceId:'acceptance-space'},verify:d=>/无法|不能|未提供|没有|不足|缺少/.test(d.text)&&d.sources.length===0},
  {id:'data-calculation',input:'根据计算结果，只输出合计金额的数字。',extra:{datasetId:dataset.id,dataQuery:{metric:'金额',aggregate:'sum'}},verify:d=>d.text.trim()==='35'&&d.explanation?.aggregate==='sum'},
 ].filter(c=>!selected||selected.includes(c.id));
 for(const c of cases){
  const start=Date.now();
  try{const d=await call('/api/chat',{profileId:'managed-deepseek',messages:[{role:'user',content:c.input}],...c.extra});
   const passed=!!c.verify(d)&&!d.truncated&&d.usageSaved;
   results.push({id:c.id,passed,usage:d.usage,elapsed:Date.now()-start,truncated:d.truncated});
   if(!passed)break;
  }catch(e){results.push({id:c.id,passed:false,error:e.message,elapsed:Date.now()-start});break;}
 }
 const workspace=await call('/api/workspace');
 const report={date:new Date().toISOString(),scope:'production application handlers in local workerd with real isolated D1/R2 and real DeepSeek via Node egress bridge; synthetic local identity, not production login/network',expected:cases.length,requests,completed:results.length,usageRows:workspace.usage.length,passed:results.length===cases.length&&results.every(r=>r.passed)&&workspace.usage.length===cases.length,results};
 mkdirSync('outputs',{recursive:true});writeFileSync('outputs/worker-live-report'+(selected?'-selected':'')+'.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));assert.ok(report.passed,'Real Worker/application acceptance failed');
}finally{await fixture.dispose();}
