import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startOfficeKit} from '../runtime/office-kit.mjs';

test('real worker closing stdin rejects pending requests instead of crashing the host',{timeout:10000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wb-pipe-'));
 try{
  const executable=path.join(dir,'closed-pipe');
  await writeFile(executable,'#!/usr/bin/python3\nimport os,time\nos.close(0)\nprint(\'WBKIT {"id":0,"ready":true}\',flush=True)\ntime.sleep(5)\n');
  await chmod(executable,0o700);
  const worker=await startOfficeKit({python:executable,officeDirectory:dir,directory:dir,format:'docx',timeoutMs:3000});
  const requests=[worker.request('snapshot'),worker.request('snapshot')];
  const results=await Promise.allSettled(requests);
  assert(results.every(result=>result.status==='rejected'&&/输入管道故障/.test(result.reason.message)));
  await worker.closed;
  assert.throws(()=>process.kill(worker.pid,0));
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('normal worker requests still complete in order',{timeout:10000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wb-pipe-ok-'));
 try{
  const executable=path.join(dir,'worker-fixture');
  await writeFile(executable,'#!/usr/bin/python3\nimport sys,json\nprint(\'WBKIT {"id":0,"ready":true}\',flush=True)\nfor line in sys.stdin:\n request=json.loads(line)\n print("WBKIT "+json.dumps({"id":request["id"],"result":{"operation":request["op"]}}),flush=True)\n');
  await chmod(executable,0o700);
  const worker=await startOfficeKit({python:executable,officeDirectory:dir,directory:dir,format:'docx',timeoutMs:3000});
  assert.deepEqual(await Promise.all([worker.request('one'),worker.request('two')]),[{operation:'one'},{operation:'two'}]);
  worker.close();await worker.closed;
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('missing worker executable rejects startup',{timeout:10000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wb-pipe-missing-'));
 try{await assert.rejects(startOfficeKit({python:path.join(dir,'missing'),officeDirectory:dir,directory:dir,format:'docx',timeoutMs:3000}),/ENOENT/);}
 finally{await rm(dir,{recursive:true,force:true});}
});
