/** Saved OOXML receipt for bounded, unambiguous Word character formatting.
 * Does not equate native completion with success or promise layout/OOXML fidelity.
 */
import office from './vendor/office.cjs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {openPackage,inspectDocument} from './documents.mjs';
import {normalizeOfficeFormat} from './office-format.mjs';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const all=(n,name)=>Array.from(n.getElementsByTagNameNS(W,name));
const children=(n,name)=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===W&&(!name||x.localName===name));
const attr=(n,key)=>n?.getAttributeNS(W,key)||null;
function toggle(pr,name){const node=children(pr,name)[0];if(!node)return null;const v=attr(node,'val');if(v===null||v==='1'||v==='true'||v==='on')return true;if(v==='0'||v==='false'||v==='off')return false;throw Error('Word文字格式值无效');}
const WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function inlinePictures(buffer){
 const files=openPackage(buffer),result={};
 const parse=name=>{if(!files[name])throw Error('Word图片关系缺失');return new office.DOMParser({onError:()=>{throw Error('Word图片关系XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');};
 for(const name of Object.keys(files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(k)).sort()){
  const doc=parse(name),pictures=Array.from(doc.getElementsByTagNameNS(WP,'inline')),rows=[];if(!pictures.length)continue;
  const relName=path.posix.join(path.posix.dirname(name),'_rels',path.posix.basename(name)+'.rels'),rels=Array.from(parse(relName).getElementsByTagNameNS('*','Relationship'));
  for(const drawing of pictures){
   const blips=Array.from(drawing.getElementsByTagNameNS(A,'blip'));if(!blips.length)continue;
   if(blips.length!==1)throw Error('Word行内图片关系不受支持');
   const id=blips[0].getAttributeNS(R,'embed');if(!id||blips[0].getAttributeNS(R,'link'))throw Error('Word行内图片必须使用内部资源');
   const matches=rels.filter(rel=>rel.getAttribute('Id')===id);if(matches.length!==1)throw Error('Word行内图片关系无效');
   const rel=matches[0],target=rel.getAttribute('Target');if(!target||rel.getAttribute('TargetMode')==='External'||!rel.getAttribute('Type').endsWith('/image'))throw Error('Word行内图片关系不受支持');
   const resolved=target.startsWith('/')?path.posix.normalize(target.slice(1)):path.posix.normalize(path.posix.join(path.posix.dirname(name),target));
   if(!/^word\/media\/[^/]+$/i.test(resolved)||!files[resolved])throw Error('Word行内图片资源不存在');
   const ext=Array.from(drawing.childNodes).filter(n=>n.nodeType===1&&n.namespaceURI===WP&&n.localName==='extent');
   if(ext.length!==1)throw Error('Word行内图片尺寸无效');
   const dims=['cx','cy'].map(key=>{const raw=ext[0].getAttribute(key);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<=0)throw Error('Word行内图片尺寸无效');return Number(raw);});
   rows.push({sha256:createHash('sha256').update(files[resolved]).digest('hex'),dims});
  }
  if(rows.length)result[name]=rows;
 }
 return result;
}
function wordMediaReceipt(bytes){
 const media=buffer=>Object.entries(openPackage(buffer)).filter(([name])=>/^word\/media\/[^/]+$/i.test(name)).map(([,value])=>createHash('sha256').update(value).digest('hex')).sort();
 const sourceMedia=media(bytes),sourceInline=inlinePictures(bytes);
 return output=>{if(JSON.stringify(media(output))!==JSON.stringify(sourceMedia))throw Error('Word保存图片内容与原文不一致，未发布新版本');if(JSON.stringify(inlinePictures(output))!==JSON.stringify(sourceInline))throw Error('Word保存行内图片引用或尺寸与原文不一致，未发布新版本');};
}
function snapshot(bytes){
 inspectDocument('docx',bytes);const files=openPackage(bytes);if(Object.keys(files).some(k=>k.toLowerCase().startsWith('_xmlsignatures/')))throw Error('带签名Word不支持格式修改');
 let count=0,total=0;const parts={};
 for(const name of Object.keys(files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(k)).sort()){
  const xml=new office.DOMParser({onError:()=>{throw Error('Word格式验收XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');
  parts[name]=all(xml,'p').map(p=>{
   const text=all(p,'t').map(t=>t.textContent).join('');if(++count>2000||(total+=text.length)>100000)throw Error('Word格式验收限2000段、10万字符');
   let simple=Array.from(p.childNodes).filter(x=>x.nodeType===1).every(x=>x.namespaceURI===W&&['pPr','r'].includes(x.localName));
   for(let n=p.parentNode;n?.nodeType===1;n=n.parentNode)if(n.namespaceURI===W&&['ins','del','moveFrom','moveTo','sdt','customXml'].includes(n.localName))simple=false;
   const runs=children(p,'r').map(r=>{
    if(Array.from(r.childNodes).filter(x=>x.nodeType===1).some(x=>x.namespaceURI!==W||!['rPr','t'].includes(x.localName))||all(r,'rPrChange').length)simple=false;
    const pr=children(r,'rPr')[0],fonts=children(pr,'rFonts')[0];
    return {text:children(r,'t').map(t=>t.textContent).join(''),fontName:[attr(fonts,'ascii'),attr(fonts,'hAnsi')],fontNameAsian:attr(fonts,'eastAsia'),fontSize:attr(children(pr,'sz')[0],'val'),fontColor:attr(children(pr,'color')[0],'val')?.toUpperCase()||null,backgroundColor:attr(children(pr,'shd')[0],'fill')?.toUpperCase()||null,bold:toggle(pr,'b'),italic:toggle(pr,'i'),underline:attr(children(pr,'u')[0],'val')};
   });
   const parent=p.parentNode,body=parent?.namespaceURI===W&&parent.localName==='body';
   const bodyOrder=body?Array.from(parent.childNodes).filter(n=>n.nodeType===1).indexOf(p):-1;
   const crossSafe=body&&!all(p,'sectPr').length&&!all(p,'numPr').length;
   return {text,simple,runs,bodyOrder,crossSafe};
  });
 }
 if(!parts['word/document.xml'])throw Error('Word缺少正文');return parts;
}
// A manual selection must identify one simple body paragraph uniquely.  The
// saved document is checked independently; native paste success is insufficient.
export function wordTextVerifier(bytes,selection,replacement){
 if(typeof selection!=='string'||!selection||selection.length>12000||typeof replacement!=='string'||replacement.length>4000||/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(selection+replacement))throw Error('Word选区或替换文字不受支持');
 const inserted=replacement.split('\n');if(inserted.length>100)throw Error('Word替换限100段');
 const before=snapshot(bytes),paragraphs=before['word/document.xml'],matches=[],segments=selection.split('\n');
 if(segments.some(s=>!s))throw Error('Word跨段选区两端及中间段落不得为空');
 for(let index=0;index+segments.length<=paragraphs.length;index++){
  const first=paragraphs[index];for(let at=first.text.indexOf(segments[0]);at>=0;at=first.text.indexOf(segments[0],at+1)){
   if(segments.length===1||at+segments[0].length===first.text.length&&segments.slice(1).every((segment,j)=>{const p=paragraphs[index+j+1];return j===segments.length-2?p.text.startsWith(segment):p.text===segment;}))matches.push({index,at});
  }
 }
 if(matches.length!==1)throw Error('Word选区无法唯一对应正文，请选择更完整文字');
 const {index,at}=matches[0],selected=paragraphs.slice(index,index+segments.length),p=selected[0];
 if(selected.some(item=>!item.simple))throw Error('含域、链接、图片或修订的Word段落暂不支持选区修改');
 if((selected.length>1||inserted.length>1)&&selected.some((item,i)=>!item.crossSafe||item.bodyOrder!==p.bodyOrder+i))throw Error('跨段修改仅支持无编号或分节的连续正文顶层段落');
 const texts=parts=>Object.fromEntries(Object.entries(parts).map(([name,ps])=>[name,ps.map(item=>item.text)]));
 const expected=texts(before),last=selected[selected.length-1],result=[...inserted];result[0]=p.text.slice(0,at)+result[0];result[result.length-1]+=last.text.slice(segments.length===1?at+selection.length:segments[segments.length-1].length);expected['word/document.xml'].splice(index,selected.length,...result);
 // Compare content rather than ZIP member names: an office engine may rename
 // media while saving. This protects bytes, not anchors, crops or relationships.
 const verifyMedia=wordMediaReceipt(bytes);
 const flatten=rows=>rows.flatMap((row,i)=>{const styles=row.simple?row.runs.flatMap(run=>Array.from({length:run.text.length},()=>run)):Array.from({length:row.text.length},()=>null);return i<rows.length-1?[...styles,null]:styles;});
 const offset=paragraphs.slice(0,index).reduce((n,row)=>n+row.text.length+1,0)+at,oldStyles=Object.fromEntries(Object.entries(before).map(([name,rows])=>[name,flatten(rows)]));
 // A uniformly styled selection can be replaced only if its explicitly set
 // text properties survive on the replacement. Mixed styles remain checked
 // outside the selection, but are not claimed to be reproduced inside it.
 const selectedStyles=oldStyles['word/document.xml'].slice(offset,offset+selection.length).filter(Boolean),uniform={};
 for(const key of ['fontSize','fontColor','backgroundColor','bold','italic','underline','fontNameAsian']){
  const value=selectedStyles[0]?.[key];if(value!==null&&value!==undefined&&selectedStyles.every(item=>item[key]===value))uniform[key]=value;
 }
 for(let k=0;k<2;k++){const value=selectedStyles[0]?.fontName?.[k];if(value&&selectedStyles.every(item=>item.fontName?.[k]===value))uniform['fontName'+k]=value;}
 function checkStyles(after){for(const [name,rows] of Object.entries(before)){
  const old=oldStyles[name],now=flatten(after[name]),text=rows.map(row=>row.text).join('\n');
  for(let i=0;i<old.length;i++){
   if(name==='word/document.xml'&&i>=offset&&i<offset+selection.length)continue;
   const j=name==='word/document.xml'&&i>=offset+selection.length?i+replacement.length-selection.length:i,source=old[i],target=now[j],ch=text[i];if(!source)continue;
   for(const key of ['fontSize','fontColor','backgroundColor','bold','italic','underline'])if(source[key]!==null&&source[key]!==undefined&&target?.[key]!==source[key])throw Error('Word未选文字的直接格式发生变化，未发布新版本');
   if(/[\p{Script=Latin}\u0000-\u007f]/u.test(ch))for(let k=0;k<2;k++)if(source.fontName[k]&&target?.fontName?.[k]!==source.fontName[k])throw Error('Word未选文字字体发生变化，未发布新版本');
   if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch)&&source.fontNameAsian&&target?.fontNameAsian!==source.fontNameAsian)throw Error('Word未选文字字体发生变化，未发布新版本');
  }
 }}
 function checkReplacement(after){const styles=flatten(after['word/document.xml']);for(let i=0;i<replacement.length;i++){
  const ch=replacement[i];if(ch==='\n')continue;const target=styles[offset+i];
  for(const [key,value] of Object.entries(uniform)){
   if(key==='fontNameAsian'&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch))continue;
   if(key.startsWith('fontName')&&key!=='fontNameAsian'&&!/[\p{Script=Latin}\u0000-\u007f]/u.test(ch))continue;
   const actual=key==='fontName0'?target?.fontName?.[0]:key==='fontName1'?target?.fontName?.[1]:target?.[key];
   if(actual!==value)throw Error('Word替换文字的直接格式发生变化，未发布新版本');
  }
 }}
 return output=>{const after=snapshot(output);if(JSON.stringify(texts(after))!==JSON.stringify(expected))throw Error('Word保存文字与选区修改不一致，未发布新版本');checkStyles(after);checkReplacement(after);verifyMedia(output);};
}
export function wordFormatVerifier(bytes,selection,format){
 const data=normalizeOfficeFormat(format);
 if(typeof selection!=='string'||!selection||selection.length>12000||/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(selection))throw Error('Word格式核验仅支持纯文字段落选区');
 const before=snapshot(bytes),paragraphs=before['word/document.xml'],body=paragraphs.map(p=>p.text).join('\n'),matches=[];
 for(let at=body.indexOf(selection);at>=0;at=body.indexOf(selection,at+1))matches.push(at);
 if(matches.length!==1)throw Error('Word选区无法唯一对应正文，请选择更完整文字');
 const at=matches[0],targets=[];let position=0;
 for(const [index,p] of paragraphs.entries()){
  const start=Math.max(0,at-position),end=Math.min(p.text.length,at+selection.length-position);
  if(end>start){if(!p.simple)throw Error('含域、链接、图片或修订的Word段落暂不修改格式');targets.push({index,start,end});}
  position+=p.text.length+1;
 }
 if(!targets.length)throw Error('Word选区没有可核验文字');
 const texts=parts=>Object.fromEntries(Object.entries(parts).map(([name,ps])=>[name,ps.map(p=>p.text)]));
 const original=JSON.stringify(texts(before));
 const verifyMedia=wordMediaReceipt(bytes);
 return output=>{
  const after=snapshot(output);if(JSON.stringify(texts(after))!==original)throw Error('Word格式输出正文或页眉页脚文字变化，未发布新版本');
  for(const {index,start,end:limit} of targets){
   const p=after['word/document.xml'][index];if(!p.simple)throw Error('Word格式输出段落结构无法验收');
   let offset=0,covered=0;
   for(const r of p.runs){const end=offset+r.text.length,overlap=Math.max(0,Math.min(end,limit)-Math.max(offset,start));offset=end;if(!overlap)continue;covered+=overlap;
    for(const [key,value] of Object.entries(data)){
     const expected=key==='fontSize'?String(value*2):key.endsWith('Color')?value.slice(1):value;
     if(key==='fontName'?!r.fontName.every(v=>v===expected):r[key]!==expected)throw Error('Word选区格式未完整写入DOCX：'+key+'，未发布新版本');
    }
   }
   if(covered!==limit-start)throw Error('Word格式输出选区覆盖不完整');
  }
  verifyMedia(output);

 };
}
