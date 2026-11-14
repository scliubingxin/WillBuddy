import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createPdfImportControl} from '../main/pdf-import-control.mjs';
import {recognizePdf} from '../runtime/pdf-ocr.mjs';
import {runCommand} from '../runtime/command.mjs';
import {importChatPdf} from '../services/pdf-chat-import.mjs';

test('cancel targets only current import; repeated and stale stop requests cannot cancel a later job',()=>{
  let updates=0;const c=createPdfImportControl({notify:()=>updates++});
  const a=c.start();assert.throws(()=>c.start(),/正在识别/);assert.equal(c.cancel('wrong'),false);assert.equal(c.cancel(a.id),true);assert.equal(a.signal.aborted,true);assert.equal(c.cancel(a.id),false);assert.equal(c.view().cancelling,true);c.finish(a);
  const b=c.start();assert.equal(c.cancel(a.id),false);c.finish(a);assert.equal(c.view().id,b.id);assert.equal(b.signal.aborted,false);c.close();assert.equal(b.signal.aborted,true);c.finish(b);assert.equal(c.view(),null);assert.equal(updates,5);
});

test('stopping during real child execution terminates it and removes the private PDF temporary directory',{timeout:10000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-cancel-pdf-'));const c=new AbortController();let invoked=false,childStatus;
 const run=async(command,options)=>{if(!invoked){invoked=true;return {status:'succeeded',stdout:'Pages: 1\n'};}
   const timer=setTimeout(()=>c.abort(),200);
   try{const result=await runCommand({executable:process.execPath,args:['-e','setInterval(()=>{},1000)'],cwd:command.cwd,timeoutMs:5000},options);childStatus=result.status;return result;}finally{clearTimeout(timer);}
 };
 try{await assert.rejects(recognizePdf({source:{bytes:Buffer.from('%PDF-fixture'),name:'x.pdf',sha256:'a'},tools:{executable:'/fake/ocr',pdfinfo:'/fake/info',pdftoppm:'/fake/render'},directory:dir,signal:c.signal,run}));assert.equal(childStatus,'cancelled');assert.deepEqual(await readdir(dir),[]);}finally{await rm(dir,{recursive:true,force:true});}
});

test('cancelling before OCR completes cannot create a document',async()=>{
 const c=new AbortController();let saved=0;
 const pending=importChatPdf({file:'/file.pdf',read:async()=>Buffer.from('%PDF-test'),confirm:async()=> 'eng',tools:async()=>({}),directory:'/tmp',signal:c.signal,documents:{importFile:async()=>{saved++;}},recognize:async({signal})=>{await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));signal.throwIfAborted();}});
 await new Promise(r=>setImmediate(r));c.abort();await assert.rejects(pending);assert.equal(saved,0);
});

test('composer displays a stop control only for the current import',async()=>{
 const {compactComposer}=await import('../src/ui/composer.js');const args={state:{agents:[],pdfImport:{id:'job1',cancelling:false}},files:[],images:[],icon:()=>'',escape:s=>String(s),modelName:'model',modelMarkup:''};const html=compactComposer(args);assert.match(html,/data-action="cancelPdfImport" data-id="job1"/);args.state.pdfImport=null;assert.doesNotMatch(compactComposer(args),/data-action="cancelPdfImport"/);
});
