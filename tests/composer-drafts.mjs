import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync('lib/chat-drafts.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
vm.runInNewContext(js,{exports,window:undefined,encodeURIComponent});
const {chatDraftKey,readChatDraft,writeChatDraft}=exports;

function memoryStorage(){
 const values=new Map();
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

let cases=0;
const storage=memoryStorage();
writeChatDraft('', '新对话草稿',storage);
assert.equal(readChatDraft('',storage),'新对话草稿');cases++;
writeChatDraft('chat-a','会话 A 草稿',storage);
writeChatDraft('chat-b','会话 B 草稿',storage);
assert.equal(readChatDraft('chat-a',storage),'会话 A 草稿');
assert.equal(readChatDraft('chat-b',storage),'会话 B 草稿');cases++;
writeChatDraft('chat-a','',storage);
assert.equal(readChatDraft('chat-a',storage),'');cases++;
writeChatDraft('long','字'.repeat(20050),storage);
assert.equal(readChatDraft('long',storage).length,20000);cases++;
const unavailable={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
assert.equal(readChatDraft('chat',unavailable),'');
assert.doesNotThrow(()=>writeChatDraft('chat','内容',unavailable));cases++;
assert.notEqual(chatDraftKey(''),chatDraftKey('chat'));
assert.ok(chatDraftKey('chat/一').includes(encodeURIComponent('chat/一')));cases++;

const component=readFileSync('app/workbench.tsx','utf8');
assert.ok(component.includes("writeChatDraft(chatId,'');setPrompt('')"),'send clears persisted draft before request');
assert.ok(component.includes("setPrompt(readChatDraft(id))"),'chat switch restores its own draft');
console.log(`PASS: ${cases} per-chat session draft scenarios (real helper; no browser or model calls)`);
