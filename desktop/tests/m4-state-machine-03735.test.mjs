import test from 'node:test';
import assert from 'node:assert/strict';
import {runTransition,createRunQueue} from '../runtime/run-queue.mjs';
import {recoverInterruptedWork} from '../services/recovery.mjs';
import {complete} from '../core.mjs';

test('state machine rejects revival and invalid edges without mutating journal',()=>{
 for(const [from,to] of [['completed','running'],['paused','running'],['queued','completed'],['running','queued'],['interrupted','completed'],['unknown','running']]){
  const j={id:'j',kind:'conversation',ownerId:'c',status:from,revision:4,events:[]},snapshot=JSON.stringify(j);assert.throws(()=>runTransition(j,to),/无效任务状态转换/);assert.equal(JSON.stringify(j),snapshot);
 }
});
test('legal cancellation and restart recovery keep ordered persistent events',()=>{
 const j={id:'j',kind:'conversation',ownerId:'c',revision:0,events:[]};runTransition(j,'queued',1);runTransition(j,'running',2);runTransition(j,'cancelling',3);const data={runJobs:[j],commandJobs:[],executions:[],tasks:[],chats:[]};recoverInterruptedWork(data,4);assert.equal(j.status,'interrupted');assert.deepEqual(j.events.map(e=>e.sequence),[1,2,3,4]);assert.throws(()=>runTransition(j,'running'));
});
test('mock LLM failure finalizes once and does not repeat provider requests or tools',async()=>{
 const store={data:{runJobs:[]},save:async()=>{}};let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw new TypeError('fetch failed')};
 try{const q=createRunQueue({store,active:new Map(),timeoutMs:1000});const job=await q.submit({id:'mock',kind:'conversation',ownerId:'chat',fingerprint:'f'},async()=>{await complete({baseUrl:'https://example.com',model:'mock'},'',[]);return {status:'completed'}});assert.equal(job.status,'failed');assert.equal(calls,1);assert.deepEqual(job.events.map(x=>x.status),['queued','running','failed']);assert.match(job.error,/模型请求失败/);await q.idle();}finally{globalThis.fetch=original;}
});
test('terminal publication fault is marked interrupted, never returns completed',async()=>{
 let fail=true;const store={data:{runJobs:[]},save:async()=>{}};const q=createRunQueue({store,active:new Map()});const j=await q.submit({id:'fail',kind:'task',ownerId:'task',fingerprint:'f'},async()=>({status:'completed'}),async j=>{if(j.status==='completed'&&fail){fail=false;throw Error('publication failed')}});assert.equal(j.status,'interrupted');assert.deepEqual(j.events.map(x=>x.status),['queued','running','completed','interrupted']);assert.equal(j.error,'publication failed');
});
test('concurrent repeated cancellation is idempotent while worker drains and cannot revive it',async()=>{
 const store={data:{runJobs:[]},save:async()=>{}};const active=new Map(),q=createRunQueue({store,active,timeoutMs:2000});let started,release;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);const done=q.submit({id:'cancel',kind:'conversation',ownerId:'c',fingerprint:'f'},async()=>{started();await gate;return {status:'completed'}});await ready;const a=q.cancel('cancel'),b=q.cancel('cancel');const [first,second]=await Promise.all([a,b]);assert.equal(first.status,'cancelling');assert.equal(second.status,'cancelling');assert.equal(second.events.filter(e=>e.status==='cancelling').length,1);release();const result=await done;assert.equal(result.status,'cancelled');assert.equal(result.events.filter(e=>e.status==='cancelling').length,1);assert.equal(active.size,0);
});
