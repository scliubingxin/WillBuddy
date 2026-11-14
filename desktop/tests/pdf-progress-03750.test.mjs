import test from 'node:test';
import assert from 'node:assert/strict';
import {createPdfImportControl} from '../main/pdf-import-control.mjs';

test('progress belongs only to the current running job and advances in page order',()=>{
 let n=0;const control=createPdfImportControl({notify:()=>n++}),a=control.start();
 assert.equal(control.progress(a,{page:3,index:1,total:2,secret:'not exposed'}),true);
 assert.deepEqual(control.view().progress,{page:3,index:1,total:2});
 assert.equal(control.progress(a,{page:4,index:1,total:2}),false);
 assert.equal(control.progress(a,{page:5,index:2,total:2}),false);
 assert.equal(control.progress(a,{page:4,index:2,total:2}),true);
 control.cancel(a.id);assert.equal(control.progress(a,{page:5,index:3,total:3}),false);control.finish(a);
 const b=control.start();assert.equal(control.progress(a,{page:1,index:1,total:1}),false);assert.equal(control.view().progress,undefined);control.finish(b);assert.equal(n,7);
});
test('composer shows page progress while retaining cancel control',async()=>{
 const {compactComposer}=await import('../src/ui/composer.js');const html=compactComposer({state:{agents:[],pdfImport:{id:'job',progress:{page:8,index:2,total:3}}},selections:[],files:[],images:[],icon:()=>'',escape:String,modelName:'m',modelMarkup:''});assert.match(html,/第 8 页（2\/3）/);assert.match(html,/data-action="cancelPdfImport"/);
});
