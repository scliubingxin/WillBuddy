/** Reconcile an untrusted rendered selection against the current OOXML. */
import office from './vendor/office.cjs';
import {wordStructure} from './word-structure.mjs';
import {openPackage} from './documents.mjs';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes=(n,s)=>Array.from(n.getElementsByTagNameNS(W,s));
const norm=s=>s.replace(/\u00a0/g,' ');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function wordSelection(bytes,request){
 if(!request||JSON.stringify(request).length>20000)throw Error('选区无效或过大');
 const paragraphs=wordStructure(bytes).paragraphs.filter(p=>p.part==='word/document.xml');
 if(!Number.isInteger(request.occurrence)||request.occurrence<0)throw Error('选区位置无效');
 if(request.kind==='text'){
  const {blockText,start,end,text}=request;
  if(typeof blockText!=='string'||typeof text!=='string'||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>blockText.length||text.length>4000||norm(blockText.slice(start,end))!==norm(text))throw Error('选中文字或范围无效');
  for(const i of [start,end])if(i>0&&i<blockText.length&&/[\uD800-\uDBFF]/.test(blockText[i-1])&&/[\uDC00-\uDFFF]/.test(blockText[i]))throw Error('选区不能拆分Unicode字符');
  const p=paragraphs.filter(p=>norm(p.text)===norm(blockText))[request.occurrence];
  if(!p)throw Error('选区无法与原Word对应，请重新选择');
  return {kind:'text',text:p.text.slice(start,end),range:{start,end},paragraphs:[p],editable:p.editable};
 }
 if(request.kind!=='table'||!Array.isArray(request.rows)||!request.rows.length||request.rows.length>30||request.rows.some(r=>!Array.isArray(r)||!r.length||r.length>16||r.some(c=>typeof c!=='string'||c.length>4000)))throw Error('表格选区无效或超限');
 const doc=new office.DOMParser().parseFromString(new TextDecoder().decode(openPackage(bytes)['word/document.xml']),'application/xml');
 const all=nodes(doc,'p');
 const direct=(n,s)=>Array.from(n.childNodes).filter(c=>c.namespaceURI===W&&c.localName===s);
 const tables=nodes(doc,'tbl').filter(t=>!nodes(t,'tbl').length).filter(t=>same(direct(t,'tr').map(r=>direct(r,'tc').map(c=>nodes(c,'p').map(p=>norm(nodes(p,'t').map(t=>t.textContent).join(''))).join('\n'))),request.rows.map(r=>r.map(norm))));
 const table=tables[request.occurrence];if(!table)throw Error('表格无法与原Word对应，请重新选择');
 const selected=nodes(table,'p').map(p=>paragraphs.find(x=>x.paragraph===all.indexOf(p)));
 const text=request.rows.map(r=>r.join('\t')).join('\n');
 if(selected.some(p=>!p)||selected.length>100||text.length>8000)throw Error('表格选区结构或大小不支持');
 return {kind:'table',text,rows:request.rows.length,columns:Math.max(...request.rows.map(r=>r.length)),paragraphs:selected,editable:selected.every(p=>p.editable)};
}
export function selectionPatches(s,replacement){
 if(s.kind!=='text'||!s.editable||typeof replacement!=='string'||replacement.length>2000||/[\r\n\x00-\x08]/.test(replacement))throw Error('仅支持简单单段选中文字替换（最多2000字）');
 let offset=0,inserted=false;const p=s.paragraphs[0],{start,end}=s.range;
 return p.runs.flatMap(r=>{const a=offset;offset+=r.text.length;const lo=Math.max(start,a),hi=Math.min(end,offset);if(hi<=lo)return [];const text=r.text.slice(0,lo-a)+(inserted?'':replacement)+r.text.slice(hi-a);inserted=true;return [{part:p.part,paragraph:p.paragraph,anchor:r.anchor,run:r.run,text}];});
}
export function guardSelectionPatch(selections,name,args){
 if(!selections.length||!['document_patch','document_edit','document_write'].includes(name))return;
 if(!args.id)return;
 const permitted=selections.filter(s=>s.documentId===args.id);
 if(!permitted.length||name!=='document_patch')throw Error('本轮仅允许用document_patch修改附加的Word选区');
 if(!Array.isArray(args.patches)||!args.patches.length)throw Error('选区补丁为空');
 for(const patch of args.patches){
  if(patch.action)throw Error('选区修改不能增删段落');
  let ok=false;
  for(const s of permitted){if(!s.editable)continue;const p=s.paragraphs.find(p=>p.part===patch.part&&p.paragraph===patch.paragraph);const r=p?.runs.find(r=>r.run===patch.run);if(!r||r.anchor!==patch.anchor)continue;
   if(s.kind==='table'){ok=true;break;}
   if(patch.bold!==undefined||patch.italic!==undefined||typeof patch.text!=='string')continue;
   let offset=0;for(const prev of p.runs){if(prev.run===r.run)break;offset+=prev.text.length;}
   const lo=Math.max(0,s.range.start-offset),hi=Math.min(r.text.length,s.range.end-offset);
   if(hi<=lo)continue;const prefix=r.text.slice(0,lo),suffix=r.text.slice(hi);
   if(patch.text.length>=prefix.length+suffix.length&&patch.text.startsWith(prefix)&&patch.text.endsWith(suffix)){ok=true;break;}
  }
  if(!ok)throw Error('补丁越过所选文字/表格或选区只读');
 }
}
