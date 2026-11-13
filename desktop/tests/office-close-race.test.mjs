import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Store} from '../core.mjs';
import {generateDocument} from '../runtime/documents.mjs';
import {createDocumentService} from '../services/documents.mjs';
import {createOfficeWorkspace} from '../services/office-workspace.mjs';

async function fixture(request){
 const dir=await mkdtemp(path.join(tmpdir(),'wb-close-race-'));
 const store=new Store(dir);await store.load();
 const docs=createDocumentService({store});
 const bytes=(await generateDocument('docx',JSON.stringify({blocks:[{type:'paragraph',text:'Original'}]}))).bytes;
 const doc=(await docs.importFile('Document','docx',bytes)).document;
 let closed=0;
 const kit=createOfficeWorkspace({documents:docs,directory:path.join(dir,'kit'),runtime:async()=>({}),approve:async()=>true,driver:async()=>({request,close(){closed++;}})});
 const id=(await kit.open(doc.id,1)).sessionId;
 return {dir,kit,docs,doc,id,get closed(){return closed;},async cleanup(){await kit.shutdown();await rm(dir,{recursive:true,force:true});}};
}

test('a mutation queued after close cannot run while an earlier operation completes',async()=>{
 let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r),calls=[];
 const f=await fixture(async op=>{calls.push(op);if(op==='mouse'){entered();await gate;}return {};});
 try{
  const first=f.kit.operation(f.id,'mouse',{type:0,x:1,y:1});await started;
  const closing=f.kit.close(f.id);const late=f.kit.operation(f.id,'command',{command:'.uno:Bold'});
  release();await first;await closing;await assert.rejects(late,/会话已结束/);
  assert.deepEqual(calls,['mouse']);assert.equal(f.closed,1);assert.equal(f.docs.read(f.doc.id).revision,1);
 }finally{release();await f.cleanup();}
});

test('concurrent close requests close the worker once',async()=>{
 let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const f=await fixture(async op=>{if(op==='mouse'){entered();await gate;}return {};});
 try{
  const first=f.kit.operation(f.id,'mouse',{type:0,x:1,y:1});await started;
  const a=f.kit.close(f.id),b=f.kit.close(f.id);release();await first;await Promise.all([a,b]);
  assert.equal(f.closed,1);assert.throws(()=>f.kit.meta(f.id),/已结束/);
 }finally{release();await f.cleanup();}
});

test('failed close save preserves dirty session and does not dispatch queued operation until close completes',async()=>{
 let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r),calls=[];let saves=0;
 const f=await fixture(async op=>{calls.push(op);if(op==='save'){if(++saves===1)throw Error('first save failed');entered();await gate;throw Error('retry save failed');}return {};});
 try{
  await assert.rejects(f.kit.operation(f.id,'command',{command:'.uno:Bold'}),/first save failed/);
  const closing=f.kit.close(f.id);await started;const later=f.kit.operation(f.id,'mouse',{type:0,x:1,y:1});
  assert.deepEqual(calls,['command','save','save']);release();await assert.rejects(closing,/retry save failed/);
  await assert.rejects(later,/retry save failed/);assert.equal(f.kit.meta(f.id).dirty,true);assert.equal(f.closed,0);assert.equal(f.docs.read(f.doc.id).revision,1);
 }finally{release();await f.cleanup();}
});
