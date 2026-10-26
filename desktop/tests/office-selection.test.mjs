import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wordFixture} from './helpers/word-fixture.mjs';
import {wordSelection,selectionPatches,guardSelectionPatch} from '../runtime/word-selection.mjs';
import {patchWord,wordStructure} from '../runtime/word-structure.mjs';
import {resolveDocumentSelection} from '../services/document-selection.mjs';
import {openPackage,sha256,generateDocument,editDocument} from '../runtime/documents.mjs';
import {runAgent} from '../runtime/agent.mjs';
import office from '../runtime/vendor/office.cjs';
const request={kind:'text',blockText:'季度草案',start:1,end:3,text:'度草',occurrence:0};
test('source reconciled selection crosses runs and retains all untouched parts',async()=>{
 const b=await wordFixture(),s=wordSelection(b,request),patches=selectionPatches(s,'正式');
 guardSelectionPatch([{documentId:'d',...s}],'document_patch',{id:'d',patches});
 const out=patchWord(b,patches),a=openPackage(b),z=openPackage(out.bytes);
 assert.equal(wordStructure(out.bytes).paragraphs[0].text,'季正式案');
 for(const n of Object.keys(a))if(n!=='word/document.xml')assert.equal(sha256(a[n]),sha256(z[n]),n);
});
test('whole table uses original paragraph/run anchors, refuses outside text and structural changes',async()=>{
 const s=wordSelection(await wordFixture(),{kind:'table',rows:[['预算1000','负责人']],occurrence:0});
 assert.equal(s.rows,1);assert.equal(s.columns,2);assert.equal(s.editable,true);
 const p=s.paragraphs[0],patch={part:p.part,paragraph:p.paragraph,run:0,anchor:p.runs[0].anchor,text:'预算2000'};
 guardSelectionPatch([{documentId:'d',...s}],'document_patch',{id:'d',patches:[patch]});
 assert.throws(()=>guardSelectionPatch([{documentId:'d',...s}],'document_patch',{id:'d',patches:[{...patch,action:'deleteParagraph'}]}),/不能/);
 assert.throws(()=>guardSelectionPatch([{documentId:'d',...s}],'document_edit',{id:'d'}),/仅允许/);
 assert.throws(()=>guardSelectionPatch([{documentId:'d',...s}],'document_patch',{id:'other',patches:[patch]}),/仅允许/);
});
test('stale, tampered, forged, excessive, partial outside selection fail closed',async()=>{
 const b=await wordFixture(),input={documentId:'d',revision:1,sha256:sha256(b),request};const store={data:{documents:[{id:'d',revision:1,sha256:sha256(b),format:'docx',base64:b.toString('base64')}]}};
 const s=resolveDocumentSelection(store,input);
 assert.throws(()=>resolveDocumentSelection(store,{...input,revision:2}),/变化/);
 assert.throws(()=>wordSelection(b,{...request,text:'伪造'}),/无效/);
 assert.throws(()=>wordSelection(b,{...request,occurrence:5}),/对应/);
 const ps=selectionPatches(s,'新');assert.throws(()=>guardSelectionPatch([s],'document_patch',{id:'d',patches:[{...ps[0],text:'破坏前缀'}]}),/越过/);
 assert.throws(()=>selectionPatches(s,'\n'),/仅支持/);
 store.data.documents[0].base64=Buffer.from('bad').toString('base64');assert.throws(()=>resolveDocumentSelection(store,input),/校验/);
});
test('literal XLSX shared/inline rich text patch preserves formulas, style, merges and chart parts',async()=>{
 const original=await generateDocument('xlsx',JSON.stringify({sheets:[{name:'预算',rows:[['客户张三','客户张三'],[123,{formula:'SUM(A2:A2)'}]]}]}));
 const files=openPackage(original.bytes);files['xl/charts/chart1.xml']=new TextEncoder().encode('<chart xmlns="urn:test"/>');
 const b=Buffer.from(office.zip.zipSync(files));const out=editDocument('xlsx',b,{replacements:[{find:'张三',replace:'匿名'}]});
 const z=openPackage(out.bytes);assert.match(out.text,/匿名/);assert.doesNotMatch(out.text,/张三/);
 for(const n of Object.keys(files))if(!out.preservation.changedParts.includes(n))assert.equal(sha256(files[n]),sha256(z[n]),n);
 assert.equal(out.preservation.formulasRecalculated,false);
 assert.throws(()=>editDocument('xlsx',b,{replacements:[{find:'不存在',replace:'x'}]}),/不存在/);
 assert.throws(()=>editDocument('xlsx',b,{replacements:[{find:'张三',replace:'x'}],cells:[{sheetIndex:1,address:'A1',value:1}]}),/分开/);
});
test('ReAct supports more than 12 tools with explicit 96-round upper bound and cancellation',async()=>{
 let rounds=0,calls=0;const defs=[{type:'function',function:{name:'check'}}];
 const out=await runAgent({messages:[],definitions:defs,maxSteps:96,request:async()=>++rounds<=14?{message:{tool_calls:[{id:String(rounds),function:{name:'check',arguments:'{}'}}]}}:{text:'done'},execute:async()=>{calls++;return{status:'succeeded'};}});
 assert.equal(out.text,'done');assert.equal(calls,14);
 await assert.rejects(runAgent({messages:[],maxSteps:97}),/1至96/);
 const c=new AbortController();c.abort();await assert.rejects(runAgent({messages:[],signal:c.signal}),/abort/i);
});
