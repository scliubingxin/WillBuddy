import {test} from 'node:test';import assert from 'node:assert/strict';
// DOM and native bridge are intentionally simulated: this verifies the real
// controller's wiring and failure behavior, not rendering or Electron IPC.
test('Office controller submits bounded literal TSV and preserves failed drafts',async()=>{
 const els=new Map(),calls=[];let fail=false,revision=1;
 class Element{constructor(){this.value='';this.checked=false;this.hidden=true;this.dataset={};this.clientHeight=700;this.width=900;this.height=700;this.selectionStart=0;this.selectionEnd=0;}addEventListener(){}setAttribute(){}replaceChildren(){}append(){}focus(){}getBoundingClientRect(){return {height:700,width:900,left:0,top:0};}getContext(){return {drawImage(){},fillRect(){}};}}
 const el=key=>{if(!els.has(key))els.set(key,new Element());return els.get(key);};
 globalThis.document={querySelector:el,querySelectorAll:()=>[],createElement:()=>new Element()};globalThis.Image=class{decode(){return Promise.resolve();}};
 const state=()=>({documentId:'doc',name:'Budget',format:'xlsx',revision,sequence:7,sha256:'hash',dirty:false,width:900,height:700,x:0,y:0,scale:15,documentWidth:15000,documentHeight:10000,parts:['Sheet1'],part:0,selection:'old',cells:{ref:'A1:B1',rows:1,columns:2,part:0,fingerprint:'a'.repeat(64)},history:{undo:0,redo:0},events:{},png:''});
 globalThis.window={addEventListener(){},willbuddyOffice:{onError(){},async invoke(op,p){if(op==='info')return {...state(),messages:[],models:[]};if(op==='snapshot')return state();if(op==='manualUpdateCells'){calls.push(p);if(fail)throw Error('审计不可用');revision++;return state();}throw Error('unexpected '+op);}}};
 try{await import('../src/office/office.js?manual-cells-ui');for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));assert.equal(el('#literal-cells-option').hidden,false);el('#edit-text').value='00123\t=1+2';el('#literal-cells').checked=true;el('#insert').onclick();for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert.deepEqual(calls[0].values,[[{text:'00123'},{text:'=1+2'}]]);assert.equal(calls[0].sequence,7);assert.equal(el('#edit-text').value,'');
 fail=true;el('#edit-text').value='a\tb';el('#insert').onclick();for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));assert.equal(calls.length,2);assert.equal(el('#edit-text').value,'a\tb');assert.match(el('#error').textContent,/审计不可用/);
 el('#edit-text').value='wrong-shape';el('#insert').onclick();for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));assert.equal(calls.length,2);assert.match(el('#error').textContent,/行列数/);assert.equal(el('#edit-text').value,'wrong-shape');
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.Image;}
});
