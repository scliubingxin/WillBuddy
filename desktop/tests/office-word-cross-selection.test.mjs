import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import {tmpdir} from 'node:os';import {Store} from '../core.mjs';import {generateDocument} from '../runtime/documents.mjs';import {createDocumentService} from '../services/documents.mjs';import {createOfficeWorkspace} from '../services/office-workspace.mjs';import {officeDirectory,officePython} from './helpers/office-kit-runtime.mjs';
test('manual Word cross-paragraph replacement saves actual DOCX',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'wb-cross-')),store=new Store(dir);await store.load();const documents=createDocumentService({store}),file=(await generateDocument('docx',JSON.stringify({blocks:[{type:'paragraph',text:'First TARGET'},{type:'paragraph',text:'Second END'},{type:'paragraph',text:'Third'}]}))).bytes,d=(await documents.importFile('test','docx',file)).document,kit=createOfficeWorkspace({documents,directory:path.join(dir,'kit'),runtime:async()=>({python:officePython,officeDirectory}),approve:async()=>true});try{let id=(await kit.open(d.id,1)).sessionId;await kit.operation(id,'command',{command:'.uno:SelectAll'});let s=await kit.snapshot(id);assert.equal(s.selection,'First TARGET\nSecond END\nThird');await kit.manualReplaceSelection(id,{sequence:s.sequence,selection:s.selection,text:'合并后的内容'});assert.equal(documents.read(d.id).revision,2);execFileSync('python3',['-c',"from docx import Document;import io,sys;d=Document(io.BytesIO(sys.stdin.buffer.read()));assert [p.text for p in d.paragraphs]==['合并后的内容']"],{input:documents.bytes(d.id,2).bytes});}finally{await kit.shutdown();await rm(dir,{recursive:true,force:true});}});

test('cross paragraph receipt validates untouched text and rejects unsupported structures',async()=>{
 const {wordTextVerifier}=await import('../runtime/office-word-format.mjs');const office=(await import('../runtime/vendor/office.cjs')).default;
 const make=async values=>(await generateDocument('docx',JSON.stringify({blocks:values.map(text=>({type:'paragraph',text}))}))).bytes;
 const original=await make(['before TARGET','Second after','untouched']),verify=wordTextVerifier(original,'TARGET\nSecond','NEW');
 verify(await make(['before NEW after','untouched']));
 assert.throws(()=>verify(original),/不一致/);
 assert.throws(()=>verify((()=>{const f=office.zip.unzipSync(original);let s=new TextDecoder().decode(f['word/document.xml']);s=s.replace('untouched','damaged');f['word/document.xml']=new TextEncoder().encode(s);return Buffer.from(office.zip.zipSync(f));})()),/不一致/);
 const files=office.zip.unzipSync(original);let xml=new TextDecoder().decode(files['word/document.xml']);xml=xml.replace('<w:p>','<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr>');files['word/document.xml']=new TextEncoder().encode(xml);assert.throws(()=>wordTextVerifier(Buffer.from(office.zip.zipSync(files)),'TARGET\nSecond','NEW'),/编号或分节/);
 assert.throws(()=>wordTextVerifier(original,'TARGET\n','NEW'),/不得为空/);
 const ambiguous=await make(['TARGET','Second','TARGET','Second']);assert.throws(()=>wordTextVerifier(ambiguous,'TARGET\nSecond','NEW'),/唯一/);
});

test('Word multiline manual replacement produces real paragraphs and preserves later paragraphs',{timeout:60000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-word-multiline-')),store=new Store(dir);await store.load();const documents=createDocumentService({store}),file=(await generateDocument('docx',JSON.stringify({blocks:[{type:'paragraph',text:'First'},{type:'paragraph',text:'Second'}]}))).bytes,d=(await documents.importFile('test','docx',file)).document,kit=createOfficeWorkspace({documents,directory:path.join(dir,'kit'),runtime:async()=>({python:officePython,officeDirectory}),approve:async()=>true});
 try{const id=(await kit.open(d.id,1)).sessionId;await kit.operation(id,'command',{command:'.uno:SelectAll'});const s=await kit.snapshot(id);assert.equal(s.selection,'First\nSecond');await kit.manualReplaceSelection(id,{sequence:s.sequence,selection:s.selection,text:'一行\n二行'});assert.equal(documents.read(d.id).revision,2);execFileSync('python3',['-c',"from docx import Document;import io,sys;d=Document(io.BytesIO(sys.stdin.buffer.read()));assert [p.text for p in d.paragraphs]==['一行','二行']"],{input:documents.bytes(d.id,2).bytes});}finally{await kit.shutdown();await rm(dir,{recursive:true,force:true});}
});

test('multiline receipt preserves text outside target and bounds paragraph count',async()=>{
 const {wordTextVerifier}=await import('../runtime/office-word-format.mjs');const make=async values=>(await generateDocument('docx',JSON.stringify({blocks:values.map(text=>({type:'paragraph',text}))}))).bytes;
 const before=await make(['before TARGET after','untouched']),verify=wordTextVerifier(before,'TARGET','one\ntwo');verify(await make(['before one','two after','untouched']));
 assert.throws(()=>verify(before),/不一致/);
 assert.throws(()=>wordTextVerifier(before,'TARGET',Array(102).join('\n')),/100段/);
 assert.throws(()=>wordTextVerifier(before,'TARGET','one\rtwo'),/不受支持/);
});
