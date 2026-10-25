import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {recordKnowledgeEvidence} from '../services/knowledge-evidence.mjs';
import {knowledgeEvidence} from '../src/ui/knowledge-evidence.js';
const source={id:'doc',name:'采购规则',revision:1,sha256:'a'.repeat(64)};
const result=(text='预算10000元')=>({status:'succeeded',sources:[source],matches:[{source,line:2,endLine:2,offset:10,endOffset:10+text.length,text}]});
test('successful observations retain source coordinates, not query or model claims, and clone inputs',()=>{
 const chat={};const r=result();recordKnowledgeEvidence(chat,'r',r,[source],123);
 r.matches[0].text='forged';assert.equal(chat.knowledgeEvidence[0].matches[0].text,'预算10000元');
 assert.equal(chat.knowledgeEvidence[0].time,123);assert.equal(chat.knowledgeEvidence[0].runId,'r');
 assert.equal(chat.knowledgeEvidence[0].query,undefined);
});
test('denial and failed results do not create evidence; forged coordinates and stale sources reject atomically',()=>{
 const chat={};for(const status of ['denied','failed','cancelled'])recordKnowledgeEvidence(chat,'r',{...result(),status},[source]);
 assert.equal(chat.knowledgeEvidence,undefined);
 for(const r of [{...result(),matches:[{...result().matches[0],offset:-1}]},result()])
 assert.throws(()=>recordKnowledgeEvidence(chat,'r',r,[{...source,revision:2}]));
 assert.equal(chat.knowledgeEvidence,undefined);
});
test('snapshot retention is bounded by complete groups and serialized character cost',()=>{
 const chat={};for(let i=0;i<20;i++)recordKnowledgeEvidence(chat,'r'+i,result(),[source]);
 assert.equal(chat.knowledgeEvidence.length,12);assert.equal(chat.knowledgeEvidence[0].runId,'r8');
 const r=result('\u0001'.repeat(1000));r.matches=Array.from({length:8},()=>structuredClone(r.matches[0]));
 for(let i=0;i<5;i++)recordKnowledgeEvidence(chat,'big'+i,r,[source]);
 assert.ok(chat.knowledgeEvidence.reduce((n,r)=>n+JSON.stringify(r).length,0)<=96000);
 assert.equal(chat.knowledgeEvidence.at(-1).matches.length,8);
});
test('UI isolates run IDs, uses escaped plain text and reveals exact snapshot with current/stale/deleted status',()=>{
 const chat={};recordKnowledgeEvidence(chat,'r',result('<img src=x onerror=alert(1)>'),[source]);
 const dom=new JSDOM(knowledgeEvidence(chat,'r',[source]));
 assert.equal(dom.window.document.querySelectorAll('img,script,iframe').length,0);
 assert.match(dom.window.document.querySelector('pre').textContent,/<img/);
 assert.match(dom.window.document.querySelector('summary').textContent,/当前文档版本一致/);
 assert.equal(knowledgeEvidence(chat,'other',[source]),'');
 assert.match(knowledgeEvidence(chat,'r',[{...source,sha256:'b'.repeat(64)}]),/来源已更新/);
 assert.match(knowledgeEvidence(chat,'r',[]),/来源已移除/);
});
test('empty and incomplete coverage are explicit, and old chats need no migration',()=>{
 assert.equal(knowledgeEvidence({},'r',[]),'');const chat={};
 recordKnowledgeEvidence(chat,'r',{status:'succeeded',matches:[],sources:[{...source,sourceTruncated:true}],resultLimited:true},[source]);
 assert.match(knowledgeEvidence(chat,'r',[source]),/没有匹配片段/);
 assert.match(knowledgeEvidence(chat,'r',[source]),/提取不完整/);
});
