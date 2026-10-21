import assert from 'node:assert/strict';
import {createWorkerFixture,WorkerResponse} from './worker-fixture.mjs';
let outbound=0,mode=200,redirectTargets=0,checks=0;
const fixture=await createWorkerFixture({outboundService:async req=>{
 outbound++;
 if(new URL(req.url).hostname==='redirect.example.com')redirectTargets++;
 if(mode>=300&&mode<400)return new WorkerResponse(null,{status:mode,headers:{Location:'https://redirect.example.com/collect'}});
 if(mode!==200)return new WorkerResponse('untrusted provider detail',{status:mode});
 return new WorkerResponse(JSON.stringify({choices:[{message:{content:'连接成功'},finish_reason:'stop'}],usage:{prompt_tokens:7,completion_tokens:3}}),{headers:{'Content-Type':'application/json'}});
}});
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const invoke=async(path,body)=>{const r=await fixture.mf.dispatchFetch('http://fixture.test'+path,{method:'POST',body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
try{
 const legacy=await(await fixture.mf.dispatchFetch('http://fixture.test/legacy')).json();
 check(legacy.reproduced&&outbound===0,'legacy redirect:error fails before sending any request in actual workerd');
 let result=await invoke('/model',{baseUrl:'https://provider.example.com'});
 check(result.status===200&&result.data.text==='连接成功'&&outbound===1,'fixed model request executes in workerd');
 check(result.data.usage.input===7&&result.data.usage.output===3,'provider usage survives workerd transport');
 result=await invoke('/remote',{url:'https://provider.example.com/resources'});
 check(result.status===200,'connector transport executes in workerd');
 for(const status of [301,302,303,307,308]){
  mode=status;
  for(const [path,payload] of [['/model',{baseUrl:'https://provider.example.com'}],['/remote',{url:'https://provider.example.com/resources'}]]){
   const before=outbound;result=await invoke(path,payload);
   check(result.status===400&&result.data.error.includes('重定向'),`${path} explicitly rejects HTTP ${status}`);
   check(outbound===before+1&&redirectTargets===0,`${path} never follows HTTP ${status} with credentials`);
  }
 }
 mode=401;result=await invoke('/model',{baseUrl:'https://provider.example.com'});
 check(result.data.error.includes('鉴权')&&!result.data.error.includes('untrusted'),'provider 401 remains distinct and sanitized');
 const anonymous=await fixture.mf.dispatchFetch('http://fixture.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 check(anonymous.status===401,'actual Worker rejects anonymous application API access');
 console.log(`PASS: ${checks} workerd runtime assertions; actual Worker fetch and handlers, simulated provider. No model charges.`);
}finally{await fixture.dispose();}
