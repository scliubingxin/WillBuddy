import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Store,initialState} from '../core.mjs';
import {createRunQueue,requestFingerprint} from '../runtime/run-queue.mjs';
import {createConversationService} from '../services/conversation.mjs';
import {createTaskService} from '../services/tasks.mjs';
import {createWorkspaceService} from '../services/workspace.mjs';
import {recoverInterruptedWork} from '../services/recovery.mjs';
import {createCommandService} from '../services/commands.mjs';
import {ToolRuntime} from '../runtime/tools.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<300;i++){if(await fn())return;await sleep(5);}throw Error('condition timed out');}
async function fixture(fn){const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-runs-')),store=new Store(dir);await store.load();const active=new Map(),queue=createRunQueue({store,active});const deps={store,active,queue,key:()=>'',view:()=>structuredClone(store.data),executeTool:async()=>({status:'denied'})};try{await fn({...deps,dir});}finally{queue.stop();await queue.idle();await rm(dir,{recursive:true,force:true});}}
const spec=(id,kind='conversation',ownerId=id)=>({id,kind,ownerId,label:'测试',fingerprint:requestFingerprint({id,kind,ownerId})});
const hold=signal=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});if(signal.aborted)reject(signal.reason);});
const occupy=f=>{f.active.set('external:1',new AbortController());f.active.set('external:2',new AbortController());};

test('shared model queue persists FIFO acceptance, honors external CLI slots and cancels queued work',()=>fixture(async f=>{
 occupy(f);let calls=0;const a=f.queue.submit(spec('a'),async()=>{calls++;return {status:'completed'};}),b=f.queue.submit(spec('b','task'),async()=>{calls++;});
 await until(()=>f.store.data.runJobs.every(j=>j.status==='queued'));await f.queue.cancel('b');assert.equal((await b).status,'cancelled');assert.equal(calls,0);
 f.active.clear();await f.queue.pump();assert.equal((await a).status,'completed');assert.equal(calls,1);const saved=JSON.parse(await readFile(f.store.file));assert.equal(saved.runJobs.find(j=>j.id==='a').status,'completed');assert.deepEqual(saved.runJobs.find(j=>j.id==='a').events.map(e=>e.sequence),[1,2,3]);
}));
test('same ID shares completion and conflicting IDs/owners cannot overwrite running work',()=>fixture(async f=>{
 let calls=0;const worker=async c=>{calls++;await hold(c.signal);};const a=f.queue.submit(spec('same'),worker);const duplicate=f.queue.submit(spec('same'),()=>{throw Error('replayed');});await until(()=>calls===1);
 await assert.rejects(f.queue.submit({...spec('same'),fingerprint:'changed'},worker),/不同/);await assert.rejects(f.queue.submit(spec('fork','conversation','same'),worker),/正在执行/);await f.queue.cancel('same');assert.equal((await a).status,'cancelled');assert.equal((await duplicate).status,'cancelled');assert.equal(calls,1);
}));
test('restart pauses queued jobs and interrupts claims; persisted IDs never recreate workers',()=>fixture(async f=>{
 occupy(f);const pending=f.queue.submit(spec('pending'),async()=>{throw Error('must not run');});await until(()=>f.queue.lookup('pending').status==='queued');const snapshot=structuredClone(f.store.data);snapshot.runJobs.push({...structuredClone(snapshot.runJobs[0]),id:'claimed',status:'running'});recoverInterruptedWork(snapshot,456);
 const loaded={data:snapshot,save:async()=>{},log:()=>{}},restart=createRunQueue({store:loaded,active:new Map()});let calls=0;const previous=await restart.submit(spec('pending'),async()=>{calls++;});await restart.pump();assert.equal(previous.status,'paused');assert.equal(snapshot.runJobs[1].status,'interrupted');assert.equal(calls,0);restart.stop();await f.queue.cancel('pending');await pending;
}));
test('accept/claim disk failures never reach the model and release their owner/slot',()=>fixture(async f=>{
 const save=f.store.save.bind(f.store);let calls=0;f.store.save=async()=>{throw Error('disk full');};const rejected=await f.queue.submit(spec('disk'),async()=>{calls++;});assert.equal(rejected.status,'interrupted');assert.equal(calls,0);assert.equal(f.queue.hasPending(),false);f.store.save=save;
 f.store.save=async()=>{if(f.queue.lookup('claim')?.status==='running')throw Error('claim failed');return save();};const failed=await f.queue.submit(spec('claim'),async()=>{calls++;});assert.equal(failed.status,'failed');assert.equal(f.active.size,0);assert.equal(calls,0);f.store.save=save;
}));
test('cancelled late task completion cannot save artifacts, results or completion notifications',()=>fixture(async f=>{
 f.store.data.tasks=[{id:'task',name:'测试',prompt:'提示',enabled:false,status:'ready'}];let deliver,started=false,notifications=0;
 const tasks=createTaskService({...f,request:async()=>{started=true;return new Promise(r=>{deliver=r;});},notifyCompleted:()=>notifications++});const running=tasks.run('task',{requestId:'late'});await until(()=>started);await tasks.cancel('task');deliver({text:'late forbidden result'});await running;
 assert.equal(f.store.data.tasks[0].status,'cancelled');assert.equal(f.store.data.tasks[0].result,undefined);assert.equal(f.store.data.artifacts.length,0);assert.equal(notifications,0);
}));
test('a scheduled occurrence is deduplicated across concurrent delivery and persisted reload',()=>fixture(async f=>{
 const due=Date.now()-500;f.store.data.tasks=[{id:'daily',name:'摘要',prompt:'每日提示',enabled:true,status:'ready',nextRun:due}];let calls=0,notifications=0;const service=createTaskService({...f,request:async()=>{calls++;return {text:'one result'};},notifyCompleted:()=>notifications++});
 await Promise.all([service.run('daily',{scheduledFor:due}),service.run('daily',{scheduledFor:due})]);assert.equal(calls,1);assert.equal(f.store.data.artifacts.length,1);assert.equal(notifications,1);assert.ok(f.store.data.tasks[0].nextRun>due);
 const loaded=new Store(f.dir);await loaded.load();recoverInterruptedWork(loaded.data);const restart=createTaskService({store:loaded,active:new Map(),key:()=>'',view:()=>loaded.data,request:async()=>{calls++;return {text:'duplicate'};},notifyCompleted:()=>notifications++});await restart.run('daily',{scheduledFor:due});assert.equal(calls,1);assert.equal(notifications,1);assert.equal(loaded.data.artifacts.length,1);
}));
test('conversation IDs deduplicate streamed work and reject changed prompt without extra user messages',()=>fixture(async f=>{
 let calls=0;const service=createConversationService({...f,request:async(_s,_k,_m,_signal,_tools,options)=>{calls++;await options.onDelta('首段');return {text:'首段'};}});const p={id:'chat',requestId:'turn',prompt:'原始请求'};
 await Promise.all([service.run(p),service.run(p).catch(e=>{assert.match(e.message,/正在执行/);})]);await service.run(p);assert.equal(calls,1);assert.equal(f.store.data.chats[0].messages.length,2);await assert.rejects(service.run({...p,prompt:'其他请求'}),/不同/);assert.equal(calls,1);
}));
test('queued conversation rechecks revoked attachment grants before contacting model/tools',()=>fixture(async f=>{
 await writeFile(path.join(f.dir,'context.md'),'local source');f.store.data.folders=[{id:'f',path:f.dir}];occupy(f);let models=0,tools=0;const service=createConversationService({...f,request:async()=>{models++;},executeTool:async()=>{tools++;}});const running=service.run({id:'chat',requestId:'grant',prompt:'读取资料',files:[{folderId:'f',relative:'context.md'}]});await until(()=>f.queue.lookup('grant')?.status==='queued');f.store.data.folders=[];f.active.clear();await f.queue.pump();await running;assert.equal(models,0);assert.equal(tools,0);assert.equal(f.store.data.chats[0].run.status,'failed');assert.match(f.store.data.chats[0].run.error,/撤销/);
}));
test('workspace cannot delete or toggle queued owners; queue and scheduler payloads never contain keys',()=>fixture(async f=>{
 occupy(f);f.store.data.settings.encryptedKey='test encrypted fixture';f.store.data.tasks=[{id:'task',prompt:'提示',name:'测试',status:'ready'}];const service=createTaskService({...f});const running=service.run('task',{requestId:'wait'});await until(()=>f.queue.lookup('wait')?.status==='queued');const workspace=createWorkspaceService(f);await assert.rejects(workspace.task({id:'task',remove:true}),/等待任务/);await assert.rejects(workspace.task({id:'task',enabled:true}),/先停止/);assert.equal(JSON.stringify(f.store.data.runJobs).includes('encrypted'),false);await service.cancel('task');await running;
}));
test('all request kinds share capacity while actual CLI child output remains available',()=>fixture(async f=>{
 f.store.data.folders=[{id:'f',path:f.dir}];let started=0;const tasks=createTaskService({...f,request:async(_s,_k,_m,signal)=>{started++;return hold(signal);}});f.store.data.tasks=[{id:'a',name:'a',prompt:'a'},{id:'b',name:'b',prompt:'b'}];const runs=['a','b'].map(id=>tasks.run(id));await until(()=>started===2);
 let approvals=0;const runtime=new ToolRuntime({store:f.store,approve:async()=>{approvals++;return true;}});const commands=createCommandService({...f,executeTool:(...args)=>runtime.execute(...args)});await commands.enqueue({id:'real-cli',executable:process.execPath,args:['-e','console.log("shared slot child")'],folderId:'f'});assert.equal(approvals,0);assert.equal(f.store.data.commandJobs[0].status,'queued');await tasks.cancel('a');await runs[0];await commands.pump();await until(()=>f.store.data.commandJobs[0].status==='succeeded');assert.match(f.store.data.executions[0].result.stdout,/shared slot child/);assert.equal(f.active.size,1);await tasks.cancel('b');await runs[1];commands.stop();await commands.idle();
}));
test('admission owner is reserved while disk persistence is pending and no slot is overwritten',()=>fixture(async f=>{
 const save=f.store.save.bind(f.store);let release;f.store.save=()=>new Promise(r=>{release=r;});const running=f.queue.submit(spec('queued'),async c=>hold(c.signal));assert.equal(f.queue.hasOwner('conversation','queued'),true);await assert.rejects(f.queue.submit(spec('other','conversation','queued'),async()=>{}),/正在执行/);await until(()=>release);f.store.save=save;release();await until(()=>f.queue.lookup('queued').status==='running');await f.queue.cancel('queued');await running;assert.equal(f.active.size,0);
}));
test('queue bounds pending admissions and times out uncompleted model work',()=>fixture(async f=>{
 occupy(f);const requests=[];for(let i=0;i<20;i++)requests.push(f.queue.submit(spec('q'+i),async()=>{}));await assert.rejects(f.queue.submit(spec('overflow'),async()=>{}),/20/);f.queue.stop();await Promise.all(requests);
 const store={data:initialState(),save:async()=>{}},active=new Map(),queue=createRunQueue({store,active,timeoutMs:20});const ended=await queue.submit(spec('timeout'),async c=>hold(c.signal));assert.equal(ended.status,'cancelled');assert.equal(active.size,0);queue.stop();
}));

test('occupied legacy slot keys cannot be overwritten by a differently named owner',()=>fixture(async f=>{
 const controller=new AbortController();f.active.set('task:collision',controller);let ran=false;const pending=f.queue.submit(spec('collision-job','conversation','task:collision'),async()=>{ran=true;});await until(()=>f.queue.lookup('collision-job')?.status==='queued');await f.queue.pump();assert.equal(ran,false);assert.equal(f.active.get('task:collision'),controller);await f.queue.cancel('collision-job');await pending;
}));
test('future schedule is rejected and queued chats cannot be deleted before cancellation',()=>fixture(async f=>{
 f.store.data.tasks=[{id:'future',name:'未来',prompt:'提示',enabled:true,nextRun:Date.now()+60000}];const tasks=createTaskService(f);await assert.rejects(tasks.run('future',{scheduledFor:f.store.data.tasks[0].nextRun}),/尚未到期/);assert.equal(f.store.data.runJobs.length,0);
 occupy(f);const service=createConversationService(f);const pending=service.run({id:'chat',requestId:'queued-chat',prompt:'提示'});await until(()=>f.queue.lookup('queued-chat')?.status==='queued');await assert.rejects(createWorkspaceService(f).deleteChat({id:'chat'}),/先停止/);await service.cancel('chat');await pending;
}));

test('cancel during attachment preflight cannot start a model after the read finishes',()=>fixture(async f=>{
 let release,calls=0;const service=createConversationService({...f,readAttachment:()=>new Promise(r=>{release=r;}),request:async()=>{calls++;return {text:'must not happen'};}});
 const running=service.run({id:'preflight',requestId:'preflight-turn',prompt:'资料',files:[{folderId:'f',relative:'x.md'}]});await until(()=>release);await service.cancel('preflight');release({text:'source',name:'x.md'});await assert.rejects(running,{name:'AbortError'});assert.equal(calls,0);assert.equal(f.store.data.chats.length,0);
}));
test('revocation while queued attachment read is awaiting prevents provider access',()=>fixture(async f=>{
 f.store.data.folders=[{id:'f',path:f.dir}];let reads=0,release,calls=0;const service=createConversationService({...f,readAttachment:async()=>{if(++reads===1)return {text:'preflight',name:'x.md'};return new Promise(r=>{release=r;});},request:async()=>{calls++;return {text:'must not happen'};}});
 const running=service.run({id:'revoke',requestId:'revoke-turn',prompt:'资料',files:[{folderId:'f',relative:'x.md'}]});await until(()=>release);f.store.data.folders=[];release({text:'source',name:'x.md'});await running;assert.equal(calls,0);assert.match(f.store.data.chats[0].run.error,/撤销/);
}));
