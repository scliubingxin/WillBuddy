import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../runtime/agent.mjs';
import {initialState} from '../core.mjs';
import {createModelService} from '../services/models.mjs';
import {createConversationService} from '../services/conversation.mjs';

const definitions=[{type:'function',function:{name:'read',parameters:{type:'object'}}}];
const call=()=>({message:{tool_calls:[{id:'one',function:{name:'read',arguments:'{}'}}]}});
test('last model call summarizes observed results without more tools or requests',async()=>{
 let requests=0,executions=0;
 const result=await runAgent({messages:[{role:'user',content:'研究'}],definitions,maxSteps:3,summarizeOnLimit:true,
  request:async(history,tools)=>{requests++;if(requests<3){assert.equal(tools,definitions);return call();}assert.equal(tools,undefined);assert.equal(history.filter(m=>m.role==='tool').length,2);assert.match(history.at(-1).content,/阶段性答复/);return {text:'已取得的资料及待核实事项',usage:{total_tokens:7}};},
  execute:async()=>{executions++;return {status:'succeeded',source:'example'};}});
 assert.equal(requests,3);assert.equal(executions,2);assert.equal(result.budgetExhausted,true);assert.equal(result.events.length,2);assert.equal(result.usage.total_tokens,7);
});
test('conversation saves an explicitly unfinished result and includes it in the next message',async()=>{
 const store={data:initialState(),save:async()=>{},log:()=>{}};store.data.settings.maxSteps=2;
 const models=createModelService({store,secrets:{}});let requests=0,executions=0,nextHistory;
 const service=createConversationService({store,models,active:new Map(),key:()=>'',view:()=>store.data,executeTool:async()=>{executions++;return {status:'succeeded',source:'recorded'};},request:async(_settings,_key,history,_signal,tools)=>{
  requests++;if(requests===1)return {message:{tool_calls:[{id:'x',function:{name:'browser_read',arguments:'{}'}}]}};
  if(requests===2){assert.equal(tools,undefined);return {text:'已查到资料，仍需核实价格。'};}
  nextHistory=history;return {text:'继续核实'};
 }});
 await service.run({id:'budget',prompt:'研究',toolsEnabled:true});
 const saved=store.data.chats[0].messages.at(-1);assert.equal(saved.budgetExhausted,true);assert.match(saved.content,/阶段性结果/);assert.match(saved.content,/仍需核实价格/);assert.equal(executions,1);
 await service.run({id:'budget',prompt:'继续'});assert.ok(nextHistory.some(m=>typeof m.content==='string'&&m.content.includes('仍需核实价格')));
});
test('unexpected tool in synthesis is rejected and never executed',async()=>{
 let requests=0,executions=0;
 await assert.rejects(runAgent({messages:[],definitions,maxSteps:2,summarizeOnLimit:true,request:async()=>{requests++;return call();},execute:async()=>{executions++;return {status:'succeeded'};}}),/最终整理阶段不能执行工具/);
 assert.equal(requests,2);assert.equal(executions,1);
});
test('normal answers, single-step limits and cancellation retain existing semantics',async()=>{
 const normal=await runAgent({messages:[],definitions,maxSteps:3,summarizeOnLimit:true,request:async()=>({text:'完成'}),execute:async()=>{throw Error('unexpected');}});
 assert.equal(normal.budgetExhausted,false);
 await assert.rejects(runAgent({messages:[],definitions,maxSteps:1,summarizeOnLimit:true,request:async()=>call(),execute:async()=>({status:'succeeded'})}),/上限/);
 const controller=new AbortController();let calls=0;
 await assert.rejects(runAgent({messages:[],definitions,maxSteps:2,summarizeOnLimit:true,signal:controller.signal,request:async()=>{calls++;if(calls===2)controller.abort();return calls===1?call():{text:'late'};},execute:async()=>({status:'succeeded'})}),/abort/i);
});
