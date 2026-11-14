import test from 'node:test';
import assert from 'node:assert/strict';
import {ToolRuntime,isPublicWebOpen} from '../runtime/tools.mjs';
import {complete} from '../core.mjs';
import {bulletFontSize,generateDocument,openPackage} from '../runtime/documents.mjs';

test('public background open is audited without approval; reads and external opens still ask',async()=>{
 const store={data:{executions:[]},save:async()=>{},log:()=>{}};let approvals=0, opens=0;
 const browser={open:async()=>{opens++;return {status:'opened',id:'x'}},list:()=>[{id:'x',url:'https://example.com/',title:'x'}],read:async()=>({status:'read'})};
 const rt=new ToolRuntime({store,browser,approve:async()=>{approvals++;return false}});
 assert.equal((await rt.execute('browser_open',{url:'https://example.com'},undefined,{runId:'r'})).status,'opened');
 assert.equal(approvals,0);assert.equal(store.data.executions[0].authorization,'background_web_open');
 assert.equal((await rt.execute('browser_read',{id:'x'},undefined,{runId:'r'})).status,'denied');
 assert.equal((await rt.execute('browser_open',{url:'https://example.com',external:true},undefined,{runId:'r'})).status,'denied');
 assert.equal((await rt.execute('browser_open',{url:'http://127.0.0.1:1234'},undefined,{runId:'r'})).status,'denied');
 assert.equal(opens,1);assert.equal(approvals,3);
 for(const url of ['file:///x','https://a:secret@example.com','http://localhost','http://127.0.0.1','http://[::1]','http://work.local'])assert.equal(isPublicWebOpen(url),false,url);
});
test('fetch failures classify known causes without leaking error content or retrying',async()=>{
 const original=globalThis.fetch;let n=0;try{for(const [code,expected] of [['ENOTFOUND',/域名解析/],['ECONNREFUSED',/连接被拒绝/],['CERT_HAS_EXPIRED',/安全连接/],['OTHER',/无法连接/]]){globalThis.fetch=async()=>{n++;const e=new TypeError('fetch failed secret');e.cause={code};throw e};await assert.rejects(complete({baseUrl:'https://example.com',model:'x'},'secret',[]),e=>expected.test(e.message)&&!e.message.includes('secret'));}assert.equal(n,4);}finally{globalThis.fetch=original;}
});
test('Chinese dense slides receive explicit smaller font and top alignment in real OOXML',async()=>{
 const short=['简短内容'],dense=Array(12).fill('关于近期交易的背景、关键风险、财务数据与影响需要仔细核实并明确标注来源。');
 assert.equal(bulletFontSize(short),22);assert.ok(bulletFontSize(dense)<22);
 const p=await generateDocument('pptx',JSON.stringify({slides:[{title:'分析',bullets:dense}]}));const f=openPackage(p.bytes);const xml=Buffer.from(f['ppt/slides/slide1.xml']).toString();assert.match(xml,/Microsoft YaHei/);assert.match(xml,/anchor="t"/);assert.match(xml,/wrap="square"/);assert.ok(xml.includes('关键风险'));
});
