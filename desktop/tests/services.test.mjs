import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../core.mjs';
import {createConversationService} from '../services/conversation.mjs';
import {createTaskService} from '../services/tasks.mjs';
import {recoverInterruptedWork} from '../services/recovery.mjs';
import {createRegistrar} from '../main/ipc.mjs';
import {createApprover} from '../main/approval.mjs';

function fixture(extra={}) {
  const store={data:initialState(),save:async()=>{},log:()=>{}};
  const active=new Map();
  return {store,active,key:()=>'',view:()=>store.data,executeTool:async()=>({status:'denied'}),...extra};
}

test('trusted IPC accepts only the exact live window, main frame and entry URL',async()=>{
  const handles=new Map(),frame={url:'file:///desktop/src/index.html'},webContents={mainFrame:frame};
  let window={webContents,isDestroyed:()=>false},calls=0;
  createRegistrar({ipcMain:{handle:(n,h)=>handles.set(n,h)},getWindow:()=>window,entryURL:frame.url})('state',p=>{calls++;return p;});
  const call=handles.get('actwill:state'),valid={sender:webContents,senderFrame:frame};
  assert.deepEqual(await call(valid),{});
  for(const event of [{...valid,sender:{}},{...valid,senderFrame:{url:frame.url}},{...valid,senderFrame:{url:'https://evil.example'}}])await assert.rejects(call(event),/不可信/);
  frame.url+='?spoof';await assert.rejects(call(valid),/不可信/);window=null;await assert.rejects(call(valid),/不可信/);assert.equal(calls,1);
});

test('native approval serializes dialogs and skips requests cancelled while queued',async()=>{
  let finish,count=0;
  const approve=createApprover({getWindow:()=>({}),focus:()=>{},dialog:{showMessageBox:async()=>{count++;return new Promise(r=>{finish=r;});}}});
  const first=approve('first','details'),controller=new AbortController();
  const second=approve('second','details',controller.signal);controller.abort();
  const rejected=assert.rejects(second,{name:'AbortError'});
  await new Promise(r=>setImmediate(r));assert.equal(count,1);finish({response:1});assert.equal(await first,true);await rejected;assert.equal(count,1);
});

test('conversation service owns model/tool lifecycle and run-scoped audit context without Electron',async()=>{
  const f=fixture(),calls=[];let round=0;
  f.executeTool=async(...args)=>{calls.push(args);return {status:'denied'};};
  f.request=async()=>++round===1?{message:{role:'assistant',content:null,tool_calls:[{id:'call',type:'function',function:{name:'browser_open',arguments:JSON.stringify({url:'https://example.com'})}}]}}:{text:'用户未批准打开网页。',usage:{total_tokens:8}};
  const service=createConversationService(f);
  const out=await service.run({id:'c',prompt:'打开网页',toolsEnabled:true});
  assert.equal(out.chatId,'c');assert.equal(f.active.size,0);assert.equal(out.chats[0].run.status,'completed');
  assert.equal(calls.length,1);assert.equal(calls[0][3].runId,out.chats[0].run.id);assert.equal(calls[0][3].chatId,'c');assert.match(out.chats[0].messages.at(-1).content,/未批准/);
});

test('attachment rejection and shared concurrency limits cannot leak a running slot or call the model',async()=>{
  let requested=0;const f=fixture({request:async()=>{requested++;return {text:'unexpected'};},readAttachment:async()=>{throw new Error('授权已撤销');}}),service=createConversationService(f);
  await assert.rejects(service.run({id:'bad',prompt:'读取文件',files:[{folderId:'revoked',relative:'x'}]}),/授权已撤销/);
  assert.equal(f.active.size,0);assert.equal(f.store.data.chats.length,0);assert.equal(requested,0);
  f.active.set('task:one',new AbortController());f.active.set('cli:two',new AbortController());
  await assert.rejects(service.run({prompt:'测试'}),/正在执行/);assert.equal(requested,0);
});

test('conversation cancellation and provider failure persist distinct final states and release slots',async()=>{
  const f=fixture();let started;
  f.request=async(_s,_k,_m,signal)=>{started?.();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));};
  const service=createConversationService(f),ready=new Promise(r=>{started=r;});
  const running=service.run({id:'cancel',prompt:'执行'});await ready;service.cancel('cancel');await running;
  assert.equal(f.store.data.chats[0].run.status,'cancelled');assert.equal(f.active.size,0);assert.ok(f.store.data.chats[0].run.finishedAt);
  f.request=async()=>{throw new Error('provider unavailable');};
  await createConversationService(f).run({id:'fail',prompt:'测试'});assert.equal(f.store.data.chats[0].run.status,'failed');assert.match(f.store.data.chats[0].messages.at(-1).content,/provider unavailable/);assert.equal(f.active.size,0);
});

test('task service reserves capacity before async persistence and releases it on storage failure',async()=>{
  const f=fixture();f.store.data.tasks=['a','b','c'].map(id=>({id,name:id,prompt:id,status:'ready'}));const writes=[];
  f.store.save=()=>new Promise(r=>{writes.push(r);});const service=createTaskService({...f,request:async()=>({text:'done'})});
  const first=service.run('a'),second=service.run('b');
  assert.equal(f.active.size,2);await assert.rejects(service.run('c'),/两个任务/);
  for(const c of f.active.values())c.abort();f.store.save=async()=>{};
  for(const release of writes)release();await Promise.all([first,second]);assert.equal(f.active.size,0);
  const g=fixture();g.store.data.tasks=[{id:'x',name:'x',prompt:'x',status:'ready'}];let count=0,models=0;
  g.store.save=async()=>{if(++count===1)throw new Error('disk full');};
  await createTaskService({...g,request:async()=>{models++;}}).run('x');assert.equal(g.active.size,0);assert.equal(g.store.data.tasks[0].status,'failed');assert.equal(models,0);
});

test('restart recovery marks running work without executing or replaying approvals',()=>{
  const data={executions:[{status:'pending_approval'},{status:'running'},{status:'succeeded'}],tasks:[{status:'running'}],chats:[{run:{status:'running'}},{run:{status:'completed'}}]};
  recoverInterruptedWork(data,123);assert.deepEqual(data.executions.map(x=>x.status),['interrupted','interrupted','succeeded']);assert.equal(data.chats[0].run.finishedAt,123);assert.equal(data.tasks[0].status,'failed');assert.equal(data.chats[1].run.status,'completed');
});

test('workspace mutations preserve records and reject deletion of active work or default agent',async()=>{
  const {createWorkspaceService}=await import('../services/workspace.mjs');const f=fixture(),workspace=createWorkspaceService(f);
  await workspace.memory({text:'简洁中文'});assert.equal(f.store.data.memories[0].text,'简洁中文');
  await assert.rejects(workspace.agent({remove:true,id:'assistant'}),/默认助手/);
  f.store.data.chats=[{id:'busy'},{id:'saved'}];f.active.set('busy',new AbortController());
  await assert.rejects(workspace.deleteChat({id:'busy'}),/停止/);assert.equal(f.store.data.chats.length,2);
  await workspace.deleteChat({id:'saved'});assert.deepEqual(f.store.data.chats.map(c=>c.id),['busy']);
  await workspace.task({name:'daily',prompt:'写摘要',enabled:true});assert.ok(f.store.data.tasks[0].nextRun);
  await workspace.artifact({name:'原文',text:'# 内容'});assert.equal(f.store.data.artifacts[0].text,'# 内容');
});

test('task completion persists a real service result and notifies through an injected platform adapter',async()=>{
  const f=fixture();f.store.data.tasks=[{id:'x',name:'摘要',prompt:'写摘要',enabled:true,status:'ready'}];let notified;
  await createTaskService({...f,request:async(_s,_k,m)=>{assert.equal(m[1].content,'写摘要');return {text:'实际模型接口夹具结果'};},notifyCompleted:t=>{notified=t.id;}}).run('x');
  assert.equal(f.active.size,0);assert.equal(notified,'x');assert.equal(f.store.data.tasks[0].status,'done');assert.equal(f.store.data.artifacts[0].text,'实际模型接口夹具结果');
});
