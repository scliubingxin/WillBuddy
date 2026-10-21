import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Store} from '../core.mjs';
import {createCommandService} from '../services/commands.mjs';
import {ToolRuntime} from '../runtime/tools.mjs';
import {recoverInterruptedWork} from '../services/recovery.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(await fn())return;await sleep(10);}throw Error('condition timed out');}
async function fixture(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-queue-')),store=new Store(dir);await store.load();store.data.folders=[{id:'f',path:dir}];
 const active=new Map();let approvals=0;const runtime=new ToolRuntime({store,approve:async()=>{approvals++;return true;}});
 const service=createCommandService({store,active,executeTool:(...args)=>runtime.execute(...args)});
 const command=(id,js='console.log("real queued output")')=>({id,executable:process.execPath,args:['-e',js],folderId:'f',timeoutMs:3000});
 try{await fn({dir,store,active,runtime,service,command,approvals:()=>approvals});}
 finally{service.stop();await service.idle();await rm(dir,{recursive:true,force:true});}
}
const job=(s,id)=>s.data.commandJobs.find(j=>j.id===id);
const terminal=j=>j&&!['queued','pending_approval','running','cancelling'].includes(j.status);
const occupy=f=>{f.active.set('chat-a',new AbortController());f.active.set('task:b',new AbortController());};

test('queue accepts duplicate IDs once, executes real Node once, persists events/output across reload',()=>fixture(async f=>{
 const p=f.command('once','require("fs").appendFileSync("marker","x");console.log("queued ✓");console.error("diagnostic")');
 await Promise.all([f.service.enqueue(p),f.service.enqueue(p),f.service.enqueue(p)]);await until(()=>terminal(job(f.store,'once')));await f.service.idle();
 assert.equal(await readFile(path.join(f.dir,'marker'),'utf8'),'x');assert.equal(f.approvals(),1);
 const loaded=new Store(f.dir);await loaded.load();const saved=job(loaded,'once');assert.equal(saved.status,'succeeded');assert.equal(saved.result.exitCode,0);assert.match(loaded.data.executions[0].result.stdout,/queued ✓/);assert.match(loaded.data.executions[0].result.stderr,/diagnostic/);assert.equal(saved.result.stdout,undefined);
 assert.ok(saved.executionId);assert.equal(loaded.data.executions[0].jobId,'once');assert.deepEqual(saved.events.map(e=>e.sequence),saved.events.map((_,i)=>i+1));assert.ok(saved.events.some(e=>e.status==='running'));
 await assert.rejects(f.service.enqueue({...p,args:['--version']}),/不同命令/);
}));
test('FIFO shares capacity with chats/tasks; queued cancel never requests approval',()=>fixture(async f=>{
 occupy(f);await f.service.enqueue(f.command('first'));await f.service.enqueue(f.command('second'));assert.equal(job(f.store,'first').status,'queued');assert.equal(f.approvals(),0);
 await f.service.cancel('first');f.active.clear();await f.service.pump();await until(()=>terminal(job(f.store,'second')));assert.equal(job(f.store,'first').status,'cancelled');assert.equal(f.approvals(),1);
}));
test('restart pauses queued work and interrupts claims without automatic replay',()=>fixture(async f=>{
 occupy(f);await f.service.enqueue(f.command('pending'));f.store.data.commandJobs.push({...structuredClone(job(f.store,'pending')),id:'running',status:'running',revision:8});await f.store.save();
 const loaded=new Store(f.dir);await loaded.load();recoverInterruptedWork(loaded.data,123);let executed=0;
 const restart=createCommandService({store:loaded,active:new Map(),executeTool:async()=>{executed++;}});await restart.pump();await restart.idle();assert.equal(executed,0);assert.equal(job(loaded,'pending').status,'paused');assert.equal(job(loaded,'running').status,'interrupted');assert.equal(job(loaded,'running').events.at(-1).time,123);restart.stop();
}));
test('retry requires current revision and fresh approval; duplicate/fork retries do not duplicate effects',()=>fixture(async f=>{
 await f.service.enqueue(f.command('failed','process.exitCode=7'));await until(()=>terminal(job(f.store,'failed')));const previous=job(f.store,'failed');
 await assert.rejects(f.service.retry({id:'wrong',retryOf:'failed',revision:0}),/状态已变化/);
 const p={id:'retry',retryOf:'failed',revision:previous.revision};await Promise.all([f.service.retry(p),f.service.retry(p)]);await until(()=>terminal(job(f.store,'retry')));assert.equal(f.approvals(),2);assert.equal(previous.retryId,'retry');assert.equal(job(f.store,'retry').retryOf,'failed');await assert.rejects(f.service.retry({...p,id:'fork'}),/已有重试/);
}));
test('running cancellation remains available from reloaded persisted state',()=>fixture(async f=>{
 await f.service.enqueue(f.command('cancel','console.log("started");setInterval(()=>{},50)'));await until(()=>f.store.data.executions[0]?.partial?.includes('started'));
 const loaded=JSON.parse(await readFile(f.store.file,'utf8'));assert.equal(loaded.commandJobs[0].id,'cancel');await f.service.cancel(loaded.commandJobs[0].id);await until(()=>terminal(job(f.store,'cancel')));await f.service.idle();assert.equal(job(f.store,'cancel').status,'cancelled');assert.equal(f.active.size,0);
}));
test('queued commands recheck revoked grants before approval/execution',()=>fixture(async f=>{
 occupy(f);await f.service.enqueue(f.command('revoked'));f.store.data.folders=[];f.active.clear();await f.service.pump();await until(()=>terminal(job(f.store,'revoked')));assert.equal(f.approvals(),0);assert.equal(job(f.store,'revoked').status,'failed');assert.match(job(f.store,'revoked').result.error,/撤销/);
}));
test('failed acceptance/claim persistence never approves or launches',()=>fixture(async f=>{
 const save=f.store.save.bind(f.store);f.store.save=async()=>{throw Error('disk full');};await assert.rejects(f.service.enqueue(f.command('rejected')),/disk full/);assert.equal(f.store.data.commandJobs.length,0);assert.equal(f.approvals(),0);
 f.store.save=save;occupy(f);await f.service.enqueue(f.command('claim'));f.store.save=async()=>{throw Error('claim disk full');};f.active.clear();await f.service.pump();assert.equal(job(f.store,'claim').status,'interrupted');assert.equal(f.active.size,0);assert.equal(f.approvals(),0);f.store.save=save;
}));
test('running state must persist after approval before a real child may spawn',()=>fixture(async f=>{
 const save=f.store.save.bind(f.store);f.store.save=async()=>{if(job(f.store,'claim')?.status==='running')throw Error('running persistence failure');return save();};
 await f.service.enqueue(f.command('claim','require("fs").writeFileSync("should-not-exist","bad")'));await until(()=>terminal(job(f.store,'claim')));await f.service.idle();assert.equal(f.approvals(),1);await assert.rejects(readFile(path.join(f.dir,'should-not-exist')),{code:'ENOENT'});assert.equal(f.active.size,0);f.store.save=save;
}));
test('partial output checkpoint survives recovery before process completion',()=>fixture(async f=>{
 await f.service.enqueue(f.command('partial','console.log("durable partial");setInterval(()=>{},50)'));await until(async()=>JSON.parse(await readFile(f.store.file,'utf8')).executions[0]?.partial?.includes('durable partial'));
 const loaded=JSON.parse(await readFile(f.store.file,'utf8'));recoverInterruptedWork(loaded);assert.equal(loaded.commandJobs[0].status,'interrupted');assert.match(loaded.executions[0].partial,/durable partial/);await f.service.cancel('partial');await until(()=>terminal(job(f.store,'partial')));
}));
test('output checkpoint disk failure stops child and records failure',()=>fixture(async f=>{
 const save=f.store.save.bind(f.store);let failed=false;f.store.save=async()=>{if(!failed&&f.store.data.executions[0]?.partial){failed=true;throw Error('checkpoint disk full');}return save();};
 await f.service.enqueue(f.command('io','console.log("checkpoint");setInterval(()=>{},50)'));await until(()=>terminal(job(f.store,'io')));await f.service.idle();assert.equal(failed,true);assert.equal(job(f.store,'io').status,'failed');assert.match(job(f.store,'io').result.error,/checkpoint disk full/);assert.equal(f.active.size,0);
}));
test('forget retains execution audit/history and refuses live jobs',()=>fixture(async f=>{
 f.store.data.memories=[{id:'keep',text:'retain'}];await f.service.enqueue(f.command('history'));await until(()=>terminal(job(f.store,'history')));await f.service.forget('history');assert.equal(f.store.data.commandJobs.length,0);assert.equal(f.store.data.executions.length,1);assert.equal(f.store.data.memories[0].text,'retain');occupy(f);await f.service.enqueue(f.command('live'));await assert.rejects(f.service.forget('live'),/先停止/);
}));
test('queue validates argv/grants and bounds pending requests',()=>fixture(async f=>{
 for(const p of [{...f.command('bad'),args:'shell text'},{...f.command('bad'),relative:'../'},{...f.command('bad'),timeoutMs:1},{...f.command('bad'),id:'../bad'}])await assert.rejects(f.service.enqueue(p));occupy(f);for(let i=0;i<20;i++)await f.service.enqueue(f.command('q'+i));await assert.rejects(f.service.enqueue(f.command('overflow')),/20/);assert.equal(f.approvals(),0);
}));

test('cancellation while approval is open cannot execute after dialog later accepts',()=>fixture(async f=>{
 let answer;const ready=new Promise(r=>{f.runtime.approve=async()=>{r();return new Promise(resolve=>{answer=resolve;});};});
 await f.service.enqueue(f.command('approval','require("fs").writeFileSync("never","bad")'));await ready;await f.service.cancel('approval');answer(true);await until(()=>terminal(job(f.store,'approval')));await assert.rejects(readFile(path.join(f.dir,'never')),{code:'ENOENT'});assert.equal(job(f.store,'approval').status,'cancelled');
}));
test('two simultaneous queue claims occupy capacity before persistence and third waits',()=>fixture(async f=>{
 const answers=[];f.runtime.approve=()=>new Promise(r=>answers.push(r));await f.service.enqueue(f.command('a'));await f.service.enqueue(f.command('b'));await f.service.enqueue(f.command('c'));
 await until(()=>answers.length===2);assert.equal(f.active.size,2);assert.equal(job(f.store,'c').status,'queued');await f.service.cancel('c');for(const answer of answers)answer(false);await until(()=>terminal(job(f.store,'a'))&&terminal(job(f.store,'b')));assert.equal(job(f.store,'a').status,'denied');assert.equal(job(f.store,'b').status,'denied');
}));
