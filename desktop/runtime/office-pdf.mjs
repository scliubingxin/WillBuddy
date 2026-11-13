import {startOfficeKit} from './office-kit.mjs';
// Deadline/abort also covers an adapter which resolves its factory late.
function abortable(promise,signal,onLate=()=>{}){
 return new Promise((resolve,reject)=>{
  let done=false;const abort=()=>{if(done)return;done=true;reject(signal.reason||Error('Office PDF已取消'));};
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  Promise.resolve(promise).then(value=>{signal?.removeEventListener('abort',abort);if(done){try{onLate(value);}catch{}return;}done=true;resolve(value);},error=>{signal?.removeEventListener('abort',abort);if(!done){done=true;reject(error);}});
 });
}
export async function exportOfficePdf({runtime,directory,format,signal,driver=startOfficeKit}){
 if(!['docx','xlsx','pptx'].includes(format))throw Error('Office PDF格式无效');signal?.throwIfAborted();let worker;
 try{
  const config=await abortable(Promise.resolve().then(runtime),signal);signal?.throwIfAborted();
  worker=await abortable(Promise.resolve().then(()=>{signal?.throwIfAborted();return driver({...config,directory,format,timeoutMs:60000,signal});}),signal,w=>w?.close());
  signal?.throwIfAborted();await abortable(worker.request('export_pdf'),signal);signal?.throwIfAborted();
 }finally{worker?.close();if(worker?.closed)await worker.closed;}
}
