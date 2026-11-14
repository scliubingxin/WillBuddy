import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent, toolDefinitions} from '../runtime/agent.mjs';
import {validateToolArguments} from '../runtime/tool-arguments.mjs';
const call=(id,name,args)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
test('a bad later tool never permits the earlier action',async()=>{
 for(const args of [{id:7},{},{id:'ok',extra:true}]){
  let runs=0;
  await assert.rejects(runAgent({messages:[],request:async()=>({message:{tool_calls:[call('1','document_read',{id:'first'}),call('2','document_read',args)]}}),execute:async()=>{runs++}}),/结构约束/);
  assert.equal(runs,0);
 }
});
test('nested array bounds, anyOf and enum are checked before execution',async()=>{
 const edit=toolDefinitions.find(t=>t.function.name==='document_edit').function.parameters;
 for(const value of [{formula:42},{formula:'x',extra:1},[]]) assert.equal(validateToolArguments({id:'a',expectedRevision:1,cells:[{sheetIndex:1,address:'A1',value}]},edit),false);
 for(const value of [null,3,true,'x',{formula:'SUM(A1:A2)'}]) assert.equal(validateToolArguments({id:'a',expectedRevision:1,cells:[{sheetIndex:1,address:'A1',value}]},edit),true);
});
test('bounded schema checking and unicode lengths',()=>{
 assert.equal(validateToolArguments({x:'😀'}, {type:'object',properties:{x:{type:'string',maxLength:1}}}),true);
 let value={}, schema={type:'object',properties:{}}; const root=value, top=schema;
 for(let i=0;i<40;i++){value.x={};value=value.x;schema.properties.x={type:'object',properties:{}};schema=schema.properties.x;}
 assert.equal(validateToolArguments(root,top),false);
});
test('valid batch runs and legacy no-schema definitions remain compatible',async()=>{
 const definitions=[{function:{name:'a'}},{function:{name:'b',parameters:{type:'object',required:['n'],properties:{n:{type:'integer',minimum:1}},additionalProperties:false}}}];
 let n=0;const calls=[];const r=await runAgent({messages:[],definitions,request:async()=>++n===1?{message:{tool_calls:[call('1','a',{}),call('2','b',{n:1})]}}:{message:{content:'ok'}},execute:async name=>{calls.push(name);return {status:'succeeded'}}});
 assert.equal(r.text,'ok');assert.deepEqual(calls,['a','b']);
});
test('first-party PPT fill pattern is preflighted before any tool in a batch runs',async()=>{let executions=0;const {runAgent,toolDefinitions}=await import('../runtime/agent.mjs');const calls=[{id:'a',type:'function',function:{name:'browser_open',arguments:JSON.stringify({url:'https://example.com'})}},{id:'b',type:'function',function:{name:'document_edit',arguments:JSON.stringify({id:'doc',expectedRevision:1,pptLayer:{slide:1,id:'shape',anchor:'anchor',fill:'not-a-color'}})}}];await assert.rejects(runAgent({messages:[],definitions:toolDefinitions,request:async()=>({message:{tool_calls:calls}}),execute:async()=>{executions++;return {status:'succeeded'};}}),/结构约束/);assert.equal(executions,0);});
test('safe first-party color validation accepts valid colors without evaluating arbitrary remote regex',async()=>{const {validateToolArguments}=await import('../runtime/tool-arguments.mjs');const schema={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};for(const s of ['#0078CB','#abcdef','#012345'])assert.equal(validateToolArguments(s,schema),true);for(const s of ['#fff','#1234567','0078CB','#ABCDEF\n'])assert.equal(validateToolArguments(s,schema),false);assert.equal(validateToolArguments('anything',{type:'string',pattern:'(a+)+$'}),true);});
