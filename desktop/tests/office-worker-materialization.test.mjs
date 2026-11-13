import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {OFFICE_WORKER_FILES} from '../runtime/office-worker-bundle.mjs';
import {materializeOfficeWorker} from '../runtime/office-kit.mjs';
test('embedded Office files equal the source and are materialized exactly',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-worker-'));
 try{await materializeOfficeWorker(dir);for(const name of ['worker.py','ABI.json']){
  const source=await readFile(new URL('../runtime/office-kit/'+name,import.meta.url));
  assert.deepEqual(Buffer.from(OFFICE_WORKER_FILES[name].text),source);
  assert.deepEqual(await readFile(path.join(dir,name)),source);
  assert.equal((await stat(path.join(dir,name))).mode&0o777,0o600);
 }}finally{await rm(dir,{recursive:true,force:true});}
});
test('corrupted worker write is rejected before launching an engine',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-worker-corrupt-'));
 try{let count=0;await assert.rejects(materializeOfficeWorker(dir,{write:async(p,_bytes,o)=>{count++;await writeFile(p,'+) {',o);}}),/Office内核文件写入校验失败：worker.py/);assert.equal(count,1);}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('existing files are never overwritten',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-worker-existing-'));
 try{await writeFile(path.join(dir,'worker.py'),'old');await assert.rejects(materializeOfficeWorker(dir),{code:'EEXIST'});assert.equal(await readFile(path.join(dir,'worker.py'),'utf8'),'old');}
 finally{await rm(dir,{recursive:true,force:true});}
});
