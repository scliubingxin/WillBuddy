import {mkdtemp,mkdir,writeFile,readFile,rm,open,lstat} from 'node:fs/promises';import {constants} from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {randomBytes,createHash} from 'node:crypto';import {StringDecoder} from 'node:string_decoder';
import {inspectDocument} from './documents.mjs';
import {OFFICE_WORKER_FILES} from './office-worker-bundle.mjs';import {officeFontEnvironment} from './office-fonts.mjs';import {commandEnvironment} from './command.mjs';import {createIsolatedWorkerPool} from './isolated-worker-pool.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const profile='<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Common/Load"><prop oor:name="UpdateDocMode" oor:op="fuse"><value>0</value></prop></item></oor:items>';
async function worker({runtime,root}){
 const config=await runtime();const dir=await mkdtemp(path.join(root,'worker-'));let child,closed;
 try{await mkdir(path.join(dir,'profile/user'),{recursive:true,mode:0o700});await mkdir(path.join(dir,'jobs'),{mode:0o700});await writeFile(path.join(dir,'profile/user/registrymodifications.xcu'),profile,{flag:'wx',mode:0o600});
  for(const name of ['preview-pool.py','ABI.json']){const f=OFFICE_WORKER_FILES[name],bytes=Buffer.from(f.text,'utf8'),target=path.join(dir,name);if(digest(bytes)!==f.sha256)throw Error('Office资源校验失败');await writeFile(target,bytes,{flag:'wx',mode:0o600});if(digest(await readFile(target))!==f.sha256)throw Error('Office资源写入校验失败');}
  const fonts=await officeFontEnvironment({directory:dir,officeDirectory:config.officeDirectory});child=spawn(config.python,[path.join(dir,'preview-pool.py'),config.officeDirectory,dir],{cwd:dir,env:{...commandEnvironment(),...fonts,PYTHONNOUSERSITE:'1'},shell:false,stdio:['pipe','pipe','pipe']});let buffer='',stderr='',id=0,dead=false,death;const pending=new Map(),decoder=new StringDecoder('utf8');closed=new Promise(r=>child.once('close',r));
  const die=error=>{if(dead)return;dead=true;death=error;for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();try{child.kill('SIGKILL');}catch{}};
  child.on('error',die);child.once('exit',(code,sig)=>die(Error('Office预览进程退出 '+(sig||code))));child.stdin.on('error',die);child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-1000)});
  child.stdout.on('data',b=>{buffer+=decoder.write(b);if(Buffer.byteLength(buffer)>100000)return die(Error('Office预览协议响应超限'));let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.startsWith('WBKIT '))continue;let r;try{r=JSON.parse(line.slice(6))}catch{return die(Error('Office预览协议无效'))}const p=pending.get(r.id);if(!p)continue;pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(r.error)):p.resolve(r.ready?{ready:true}:r.result);}});
  function wait(k){return new Promise((resolve,reject)=>{if(dead)return reject(death);const timer=setTimeout(()=>die(Error('Office预览进程超时')),30000);pending.set(k,{resolve,reject,timer});});}
  await wait(0);return {dir,request(op,data={}){if(dead)return Promise.reject(death);const k=++id,p=wait(k);try{child.stdin.write(JSON.stringify({id:k,op,...data})+'\n',e=>{if(e)die(e)})}catch(e){die(e)}return p;},async close(){die(Error('Office预览进程关闭'));await closed;await rm(dir,{recursive:true,force:true});},get pid(){return child.pid;}};
 }catch(e){if(child&&child.exitCode===null)child.kill('SIGKILL');if(closed)await closed;await rm(dir,{recursive:true,force:true});throw e;}
}
export async function readPreviewPdf(file){
 const max=16*1024*1024,s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size<5||s.size>max)throw Error('Office预览输出无效或超限');
 const h=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{
  const opened=await h.stat();if(!opened.isFile()||opened.dev!==s.dev||opened.ino!==s.ino||opened.size!==s.size)throw Error('Office预览输出已变化');
  const chunks=[];let total=0;while(total<=max){const part=Buffer.allocUnsafe(Math.min(65536,max+1-total)),r=await h.read(part,0,part.length,null);if(!r.bytesRead)break;total+=r.bytesRead;chunks.push(part.subarray(0,r.bytesRead));}
  const after=await h.stat();if(total>max||total!==opened.size||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs)throw Error('Office预览输出已变化或超限');
  const b=Buffer.concat(chunks,total);if(b.subarray(0,5).toString()!=='%PDF-')throw Error('Office预览不是有效PDF');return b;
 }finally{await h.close();}
}
export function createOfficePreviewPool({runtime,directory,capacity=2,timeoutMs=60000}){
 let root;const ready=(async()=>{await mkdir(directory,{recursive:true,mode:0o700});root=await mkdtemp(path.join(directory,'pool-'));return root;})();
 const pool=createIsolatedWorkerPool({capacity,timeoutMs,create:async()=>worker({runtime,root:await ready}),reset:async w=>(await w.request('reset'))?.clean===true,destroy:w=>w.close()});
 return {async preview(d,signal){if(!['docx','xlsx','pptx'].includes(d.format))throw Error('Office格式无效');inspectDocument(d.format,d.bytes);return pool.run(async(w,s)=>{s.throwIfAborted();const jobId=randomBytes(16).toString('hex'),job=path.join(w.dir,'jobs',jobId);await mkdir(job,{mode:0o700});try{await mkdir(path.join(job,'output'),{mode:0o700});await writeFile(path.join(job,'document.'+d.format),d.bytes,{flag:'wx',mode:0o600});s.throwIfAborted();await w.request('render',{jobId,format:d.format});s.throwIfAborted();return await readPreviewPdf(path.join(job,'output/document.pdf'));}finally{await rm(job,{recursive:true,force:true});}},{signal});},async close(){await pool.close();await ready;await rm(root,{recursive:true,force:true});},stats:()=>pool.stats()};
}
