import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// Exercise the actual component handler with deferred IO, not a copied algorithm.
const source=readFileSync('app/workbench.tsx','utf8');
const handler=source.slice(source.indexOf(' async function send()'),source.indexOf(' async function storeArtifact'));
assert.ok(handler.includes('async function send()'));
assert.ok(source.includes('重新发送')&&source.includes('onClick={send}'),'failed chat exposes retry action');
assert.ok(source.includes('恢复已完成回复')&&source.includes('onClick={resumeLast}'),'dangling user message exposes completed-response recovery');
const js=ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
let cases=0;
async function scenario({draft='',failure=false,saveFailure=false,blocked=false,retry=false,currentName=''}={}){
 let input='原始问题',saved=0,savedName='',resolve,reject,request;
 const pending=new Promise((yes,no)=>{resolve=yes;reject=no});
 const noop=()=>{};
 const context={prompt:input,messages:retry?[{role:'user',content:input,requestId:'request-retry-1'}]:[],currentChatName:currentName,busy:false,ensureModel:()=>!blocked,writeChatDraft:noop,
  chatId:'chat',chatUpdated:1,crypto:{randomUUID:()=> 'request-new-1'},spaceId:'',agentId:'',mode:'chat',profileId:'model',keys:{},scope:'general',web:false,datasetId:'',attachments:[],of:()=>[],modeInfo:{chat:{instruction:''}},abort:{},AbortController,
  setPrompt:value=>{input=typeof value==='function'?value(input):value},setChatId:noop,setMessages:noop,setBusy:noop,setChatError:noop,setStatus:noop,setAttachments:noop,
  saveChat:async data=>{saved++;savedName=data.name;if(saveFailure)throw Error('save failed')},reloadChat:async()=>{},
  api:async(_,body)=>{request=body;return pending},refresh:async()=>{},toast:{warning:noop,error:noop}};
 vm.createContext(context);vm.runInContext(js,context);
 const operation=context.send();
 if(blocked){await operation;assert.equal(input,'原始问题');assert.equal(saved,0);cases++;return}
 assert.equal(input,'','clear before first IO completes');
 if(saveFailure){await operation;assert.equal(input,'原始问题');assert.equal(request,undefined);cases++;return}
 await Promise.resolve();input=draft;
 if(failure)reject(Object.assign(Error('cancelled'),{name:'AbortError'}));else resolve({text:'回复',usageSaved:true});
 await operation;
 assert.equal(request.messages[0].content,'原始问题');
 assert.equal(request.messages.length,1,'retry does not duplicate the last user message');
 assert.equal(request.requestId,retry?'request-retry-1':'request-new-1','logical send keeps one request id across retry');
 if(currentName)assert.equal(savedName,currentName,'sending another message preserves a custom conversation name');
 assert.equal(input,draft||(failure?'原始问题':''));cases++;
}
await scenario();await scenario({draft:'下一条草稿'});
await scenario({failure:true});await scenario({failure:true,draft:'下一条草稿'});
await scenario({saveFailure:true});await scenario({blocked:true});await scenario({retry:true});await scenario({currentName:'自定义任务名称'});
async function recoveryScenario({failure=false,missingId=false}={}){
 let current=[{role:'user',content:'待恢复',...(missingId?{}:{requestId:'request-recover-1'})}],saved=0,requestPath='',error='';
 const noop=()=>{};
 const context={messages:current,busy:false,chatId:'chat',spaceId:'',agentId:'',mode:'chat',
  setBusy:noop,setChatError:value=>{error=value},setStatus:noop,setMessages:value=>{current=value},
  refresh:async()=>{},toast:{success:noop,error:noop},encodeURIComponent,
  api:async path=>{requestPath=path;if(failure)throw Error('仍在处理中');return {text:'已恢复',model:'fixture',usageSaved:true}}};
 vm.createContext(context);vm.runInContext(js,context);await context.resumeLast();
 if(missingId){assert.equal(requestPath,'');assert.equal(saved,0)}
 else if(failure){assert.match(error,/处理中/);assert.equal(saved,0)}
 else{assert.equal(requestPath,'/api/chat?chatId=chat&requestId=request-recover-1');assert.equal(current.length,2);assert.equal(current[1].content,'已恢复');assert.equal(current[1].requestId,'request-recover-1');assert.equal(saved,0)}
 cases++;
}
await recoveryScenario();await recoveryScenario({failure:true});await recoveryScenario({missingId:true});
console.log(`PASS: ${cases} composer send scenarios (actual handler, simulated IO; no model calls)`);
