import {test} from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {tmpdir} from 'node:os';import {mkdtemp,rm,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {officeNavigation,officeNavigationEvent,officeTypingEvent} from '../src/shared/office-navigation.js';import {officeDirectory,officePython} from './helpers/office-kit-runtime.mjs';import {Store} from '../core.mjs';import {generateDocument} from '../runtime/documents.mjs';import {createDocumentService} from '../services/documents.mjs';import {createOfficeWorkspace} from '../services/office-workspace.mjs';import {startOfficeKit} from '../runtime/office-kit.mjs';
test('canvas typing forwards only printable committed characters, never shortcuts or composition',()=>{for(const key of ['a','中','😀',' '])assert.equal(officeTypingEvent({key}),key);for(const e of [{key:'Enter'},{key:'ArrowLeft'},{key:'a',ctrlKey:true},{key:'a',metaKey:true},{key:'a',altKey:true},{key:'a',isComposing:true},{key:'a',keyCode:229},{key:'\n'},{key:'Process'}])assert.equal(officeTypingEvent(e),null);});
test('Word navigation rejects arbitrary keys, raw codes, modifiers and composition events',()=>{
 for(const p of [{key:'Delete',shift:false,control:false},{key:'ArrowRight',shift:1,control:false},{key:'Home',shift:false,control:false,keyCode:1028},{key:'Home',shift:false,control:false,op:'paste'}])assert.throws(()=>officeNavigation(p));
 for(const extra of [{isComposing:true},{keyCode:229},{altKey:true},{metaKey:true},{key:'Enter'},{key:'a'}])assert.equal(officeNavigationEvent({key:'ArrowRight',...extra}),null);
 assert.deepEqual(officeNavigationEvent({key:'ArrowRight',shiftKey:true}),{key:'ArrowRight',shift:true,control:false});
});
async function fixture(driver,format='docx'){
 const dir=await mkdtemp(path.join(tmpdir(),'wb-navigation-')),store=new Store(dir);await store.load();const documents=createDocumentService({store}),d=(await documents.importFile('Navigation',format,(await generateDocument(format,JSON.stringify(format==='docx'?{blocks:[{type:'paragraph',text:'Before TARGET after'}]}:{sheets:[{name:'Sheet1',rows:[['Cell']]}]}))).bytes)).document;
 const kit=createOfficeWorkspace({documents,directory:path.join(dir,'kit'),runtime:async()=>({python:officePython,officeDirectory}),approve:async()=>true,...driver&&{driver}});return {dir,store,documents,d,kit};
}
test('real Kit keyboard selects a substring; formatting preserves every outside character and size',{timeout:60000},async()=>{
 const f=await fixture();try{const s=await f.kit.open(f.d.id,1),id=s.sessionId;
 const nav=(key,shift=false,control=false)=>f.kit.operation(id,'navigate',{key,shift,control});
 await nav('Home',false,true);for(let i=0;i<7;i++)await nav('ArrowRight');for(let i=0;i<6;i++)await nav('ArrowRight',true);
 let shot=await f.kit.snapshot(id);assert.equal(shot.selection,'TARGET');assert.equal(shot.revision,1);assert.equal(shot.dirty,false);assert.equal(shot.sequence,14);assert.equal(shot.history.undo,0);
 await f.kit.formatSelection(id,{sequence:shot.sequence,selection:shot.selection,fontSize:22});const file=path.join(f.dir,'selected.docx');await writeFile(file,f.documents.bytes(f.d.id,2).bytes);
 execFileSync('python3',['-c',`from docx import Document
import sys
runs=[r for p in Document(sys.argv[1]).paragraphs for r in p.runs if r.text]
assert ''.join(r.text for r in runs)=='Before TARGET after'
for r in runs:
 if 'TARGET' in r.text: assert r.text=='TARGET' and r.font.size and r.font.size.pt==22, [(x.text, x.font.size.pt if x.font.size else None) for x in runs]
 else: assert r.font.size is None or r.font.size.pt!=22, [(x.text, x.font.size.pt if x.font.size else None) for x in runs]
`,file]);
 shot=await f.kit.snapshot(id);await nav('ArrowLeft');assert.equal((await f.kit.snapshot(id)).selection,'');await assert.rejects(f.kit.formatSelection(id,{sequence:shot.sequence,selection:shot.selection,fontSize:18}),/变化/);assert.equal(f.documents.read(f.d.id).revision,2);
 }finally{await f.kit.shutdown();await rm(f.dir,{recursive:true,force:true});}
});
test('host rejects malformed navigation before worker dispatch and rechecks queued revision',async()=>{
 let calls=0,release;const wait=new Promise(r=>release=r);const f=await fixture(async()=>({close(){},async request(op){if(op==='navigate'){calls++;if(calls===1)await wait;}return {};}}));try{const s=await f.kit.open(f.d.id,1),id=s.sessionId;
 await assert.rejects(f.kit.operation(id,'navigate',{key:'Delete',shift:false,control:false}),/导航/);assert.equal(calls,0);
 const first=f.kit.operation(id,'navigate',{key:'Home',shift:false,control:true});while(calls===0)await new Promise(r=>setImmediate(r));const next=f.kit.operation(id,'navigate',{key:'End',shift:true,control:true});await f.documents.replaceBytes(f.d.id,1,(await generateDocument('docx',JSON.stringify({blocks:[{type:'paragraph',text:'External update'}]}))).bytes);release();await first;await assert.rejects(next,/其他任务/);assert.equal(calls,1);assert.equal(f.kit.meta(id).dirty,false);
 }finally{release?.();await f.kit.shutdown();await rm(f.dir,{recursive:true,force:true});}
});
test('native worker independently rejects bad keys and extra payload without changing selection',{timeout:60000},async()=>{
 let worker;const f=await fixture(async o=>(worker=await startOfficeKit(o)));try{const s=await f.kit.open(f.d.id,1);await worker.request('navigate',{key:'Home',shift:false,control:true});const before=await f.kit.snapshot(s.sessionId);
 for(const p of [{key:'Delete',shift:false,control:false},{key:'ArrowRight',shift:false,control:false,code:1027},{key:'Home',shift:'true',control:false}])await assert.rejects(worker.request('navigate',p),/Invalid Word/);
 assert.equal((await f.kit.snapshot(s.sessionId)).selection,before.selection);assert.equal(f.kit.meta(s.sessionId).sequence,0);assert.equal(f.documents.read(f.d.id).revision,1);
 }finally{await f.kit.shutdown();await rm(f.dir,{recursive:true,force:true});}
});
test('spreadsheet navigation never dispatches Word-only key events',async()=>{
 let calls=0;const f=await fixture(async()=>({close(){},async request(){calls++;return {};}}),'xlsx');try{const s=await f.kit.open(f.d.id,1);await assert.rejects(f.kit.operation(s.sessionId,'navigate',{key:'Home',shift:false,control:true}),/仅支持Word/);assert.equal(calls,0);}finally{await f.kit.shutdown();await rm(f.dir,{recursive:true,force:true});}
});
