import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createRich,extractHtml} from '../src/ui/markdown.js';

test('full GFM handles nested lists, italic, strike, task lists, tables, multiline code and safe links',()=>{
 const dom=new JSDOM('<!doctype html>'),render=createRich(dom.window);const text='# 标题\n\n*斜体* 与 ~~删除~~ 和 **加粗**\n\n- 外层\n  - 内层\n\n- [x] 完成\n\n| 名称 | 值 |\n| --- | --- |\n| 中文 | **1** |\n\n```html\n<div>保留代码</div>\n```\n\n[来源](https://example.com/report)';dom.window.document.body.innerHTML=render.rich(text);const d=dom.window.document;assert.equal(d.querySelector('h1').textContent,'标题');assert.equal(d.querySelector('em').textContent,'斜体');assert.equal(d.querySelector('del').textContent,'删除');assert.ok(d.querySelector('ul ul li'));assert.equal(d.querySelector('input').disabled,true);assert.equal(d.querySelector('input').checked,true);assert.equal(d.querySelector('table tbody td').textContent,'中文');assert.equal(d.querySelector('pre code').textContent.trim(),'<div>保留代码</div>');assert.equal(d.querySelector('a').getAttribute('href'),'https://example.com/report');dom.window.close();
});

test('HTML renders semantic content but cannot inject scripts, application actions, IDs, CSS or unsafe navigation',()=>{
 const dom=new JSDOM('<!doctype html>'),render=createRich(dom.window);dom.window.document.body.innerHTML=render.rich('<h2 id="app">HTML 标题</h2><div style="position:fixed" data-action="deleteChat" onclick="window.pwned=1">正文</div><table><tr><td>单元格</td></tr></table><script>window.pwned=1</script><svg onload="alert(1)"></svg><form><button data-action="revoke">提交</button><input type="text"></form><a href="javascript:alert(1)">坏链接</a><a href="file:///etc/passwd">文件</a><a href="https://name:secret@example.com">凭据</a><img src="https://tracker.example/pixel" onerror="alert(1)" alt="说明"><iframe src="https://example.com"></iframe>');const d=dom.window.document;assert.equal(d.querySelector('h2').textContent,'HTML 标题');assert.equal(d.querySelector('td').textContent,'单元格');assert.equal(d.querySelector('[data-action], [onclick], [id], [style], script, svg, form, button, iframe, img, input'),null);assert.equal(d.querySelectorAll('a[href]').length,0);assert.match(d.body.textContent,/图片：说明/);dom.window.close();
});

test('HTML fences retain original source while supporting explicit static preview extraction',()=>{
 const source='<!doctype html><html><body><h1>网页成果</h1></body></html>';assert.equal(extractHtml('说明\n```html\n'+source+'\n```'),source);assert.equal(extractHtml(source),source);assert.equal(extractHtml('普通 Markdown'),null);const dom=new JSDOM('<!doctype html>');const html=createRich(dom.window).rich('```html\n'+source+'\n```');assert.match(html,/&lt;html&gt;/);dom.window.close();
});


test('preview-only styling preserves layout classes while ordinary chat HTML still strips all styles',()=>{
 const dom=new JSDOM('<!doctype html>'),renderer=createRich(dom.window),source='<style>#report{color:blue}</style><section id="report" class="card" style="padding:24px">报告<script>alert(1)</script><a href="https://example.com">跳转</a></section>';
 const frame=renderer.sanitizeHtml(source,{links:false,preview:true});assert.match(frame,/<style>/);assert.match(frame,/id="report"/);assert.match(frame,/class="card"/);assert.match(frame,/style="padding:24px"/);assert.ok(!frame.includes('<script'));assert.ok(!frame.includes('href='));
 const ordinary=renderer.rich(source);assert.ok(!ordinary.includes('<style'));assert.ok(!ordinary.includes('style='));assert.ok(!ordinary.includes('class="card"'));dom.window.close();
});
