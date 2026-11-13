import {test} from 'node:test';
import assert from 'node:assert/strict';
// Production controller with simulated DOM/IPC, deliberately delayed replies.
test('Office keeps newer spreadsheet and AI drafts when an earlier operation completes',async()=>{
 const els=new Map(),calls=[];let revision=1,releaseWrite,releaseChat;
 class Element{constructor(){this.value='';this.checked=false;this.hidden=true;this.dataset={};this.clientHeight=700;this.width=900;this.height=700;this.handlers={};}addEventListener(n,f){this.handlers[n]=f;}setAttribute(){}replaceChildren(){}append(){}focus(){}getBoundingClientRect(){return {height:700,width:900,left:0,top:0};}getContext(){return {drawImage(){},fillRect(){}};}}
 const el=k=>{if(!els.has(k))els.set(k,new Element());return els.get(k);};
 globalThis.document={querySelector:el,querySelectorAll:()=>[],createElement:()=>new Element()};globalThis.Image=class{decode(){return Promise.resolve();}};
 const state=()=>({documentId:'doc',name:'Budget',format:'xlsx',revision,sequence:7,sha256:'hash',dirty:false,width:900,height:700,x:0,y:0,scale:15,documentWidth:15000,documentHeight:10000,parts:['Sheet1'],part:0,selection:'old',cells:{ref:'A1',rows:1,columns:1,part:0,fingerprint:'a'.repeat(64)},history:{undo:0,redo:0},events:{},png:''});
 globalThis.window={addEventListener(){},willbuddyOffice:{onError(){},async invoke(op,p){if(op==='info')return {...state(),messages:[],models:[]};if(op==='snapshot')return state();if(op==='manualUpdateCells'){calls.push(p);await new Promise(r=>releaseWrite=r);revision++;return state();}if(op==='chat'){calls.push(p);await new Promise(r=>releaseChat=r);return {messages:[]};}throw Error('unexpected '+op);}}};
 const tick=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
 try{await import('../src/office/office.js?draft-preservation');await tick();el('#edit-text').value='first';el('#insert').onclick();await tick();assert.equal(typeof releaseWrite,'function');el('#edit-text').value='intermediate';el('#edit-text').handlers.input();el('#edit-text').value='first';el('#edit-text').handlers.input();releaseWrite();await tick();assert.equal(el('#edit-text').value,'first');assert.equal(calls[0].values[0][0],'first');
 el('#prompt').value='first question';el('#ask').onsubmit({preventDefault(){}});await tick();assert.equal(typeof releaseChat,'function');el('#prompt').value='intermediate';el('#prompt').handlers.input();el('#prompt').value='first question';el('#prompt').handlers.input();releaseChat();await tick();assert.equal(el('#prompt').value,'first question');assert.equal(calls[1].prompt,'first question');
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.Image;}
});

test('Office preserves a newer Word draft after selected text or insertion completes',async()=>{
 const els=new Map();let revision=1,release,waiting;
 class Element{constructor(){this.value='';this.hidden=true;this.dataset={};this.width=900;this.height=700;this.clientHeight=700;this.handlers={};}addEventListener(n,f){this.handlers[n]=f;}setAttribute(){}replaceChildren(){}append(){}focus(){}getBoundingClientRect(){return {height:700,width:900,left:0,top:0};}getContext(){return {drawImage(){},fillRect(){}};}}
 const el=k=>{if(!els.has(k))els.set(k,new Element());return els.get(k);};globalThis.document={querySelector:el,querySelectorAll:()=>[],createElement:()=>new Element()};globalThis.Image=class{decode(){return Promise.resolve();}};
 const state=()=>({documentId:'word',name:'Word',format:'docx',revision,sequence:5,sha256:'hash',dirty:false,width:900,height:700,x:0,y:0,scale:15,documentWidth:15000,documentHeight:10000,parts:['Page'],part:0,selection:'Old',history:{undo:0,redo:0},events:{},png:''});
 globalThis.window={addEventListener(){},willbuddyOffice:{onError(){},async invoke(op){if(op==='info')return {...state(),messages:[],models:[]};if(op==='snapshot')return state();if(op==='manualReplaceSelection'||op==='operation'){waiting=op;await new Promise(r=>release=r);revision++;return state();}throw Error('unexpected '+op);}}};
 const tick=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
 try{await import('../src/office/office.js?word-draft-preservation');await tick();el('#edit-selection').onclick();el('#edit-text').value='First replacement';el('#insert').onclick();await tick();assert.equal(waiting,'manualReplaceSelection');el('#edit-selection').onclick();el('#edit-text').value='Next Word draft';el('#edit-text').handlers.input();release();await tick();assert.equal(el('#edit-text').value,'Next Word draft');assert.equal(el('#cancel-selection').hidden,false);assert.equal(el('#insert').textContent,'保存选区修改');el('#cancel-selection').onclick();
 el('#edit-text').value='First insertion';el('#insert').onclick();await tick();assert.equal(waiting,'operation');el('#edit-text').value='Next insertion draft';release();await tick();assert.equal(el('#edit-text').value,'Next insertion draft');
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.Image;}
});
