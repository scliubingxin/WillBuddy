/** Run against the private deployed Site using an authorized Sites credential.
 * ZHIXING_SITE_URL and SITES_TEST_AUTHORIZATION are provided in process env.
 * The latter is a complete header value; never write it or the model key to disk.
 * This suite makes exactly three real model requests, with no retries.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const origin=new URL(process.env.ZHIXING_SITE_URL||'https://zhixing-ai-workbench.keith-cooper602824.chatgpt.site');
if(origin.protocol!=='https:'||!origin.hostname.endsWith('.chatgpt.site'))throw new Error('Expected a private Sites HTTPS origin');
const auth=process.env.SITES_TEST_AUTHORIZATION;if(!auth)throw new Error('Missing authorized Site test credential');
const cases=JSON.parse(readFileSync(new URL('./acceptance/cases.json',import.meta.url),'utf8'));const results=[];
for(const c of cases){const start=Date.now();try{const r=await fetch(new URL('/api/chat',origin),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin.origin,'OAI-Sites-Authorization':auth},body:JSON.stringify({profileId:'managed-deepseek',messages:[{role:'user',content:c.input}]}),signal:AbortSignal.timeout(90000)});let d;try{d=await r.json()}catch{d={error:'Non-JSON response'}}if(!r.ok)throw new Error('HTTP '+r.status+': '+String(d.error||'request failed').slice(0,160));let passed=false;if(c.assertion.startsWith('json-')){const j=JSON.parse(d.text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));passed=c.assertion==='json-task'?j.tasks?.[0]?.owner==='张三'&&j.tasks[0].due==='2026-09-20'&&j.tasks[0].task?.includes('巡检'):j.total===35&&j.highest==='A';}else passed=/(无法|不能|缺少|没有|尚未|不具备)/.test(d.text)&&!/[0-9]+(?:\.\d+)?\s*(万元|亿元|元|美元)/.test(d.text);results.push({id:c.id,passed:!!passed&&!d.truncated,model:d.model,usage:d.usage,elapsed:Date.now()-start,truncated:!!d.truncated});}catch(e){results.push({id:c.id,passed:false,error:e.name==='TimeoutError'?'Timeout':String(e.message).slice(0,200),elapsed:Date.now()-start});break;}}
const report={at:new Date().toISOString(),expected:cases.length,completed:results.length,passed:results.length===cases.length&&results.every(r=>r.passed),results};mkdirSync('outputs',{recursive:true});writeFileSync('outputs/live-model-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
