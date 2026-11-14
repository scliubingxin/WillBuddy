import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOcrTsv} from '../runtime/image-ocr.mjs';
const header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n';
const row=(line,word,text)=>`5\t1\t1\t1\t${line}\t${word}\t1\t1\t5\t5\t90\t${text}\n`;
test('word coordinates reference exact UTF-16 text offsets across lines and non-BMP characters',()=>{
 const r=parseOcrTsv(header+row(1,1,'😀')+row(1,2,'中文')+row(2,1,'文档'),100,100);
 assert.equal(r.text,'😀 中文\n文档');
 assert.deepEqual(r.boxes.map(b=>[b.textStart,b.textEnd]),[[0,2],[3,5],[6,8]]);
 for(const b of r.boxes)assert.equal(r.text.slice(b.textStart,b.textEnd),b.text);
});
test('repeated words have distinct offsets and clipped boxes do not truncate text',()=>{
 const r=parseOcrTsv(header+Array.from({length:65},(_,i)=>row(1,i+1,'same')).join(''),100,100);
 assert.equal(r.boxes.length,64);assert.equal(r.boxesTruncated,true);assert.equal(r.text.split(' ').length,65);
 for(const [i,b] of r.boxes.entries()){assert.equal(r.text.slice(b.textStart,b.textEnd),'same');assert.equal(b.textStart,i*5);}
});
