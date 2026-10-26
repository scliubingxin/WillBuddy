/** Literal text redaction without calculating/rebuilding the workbook. */
import office from './vendor/office.cjs';
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main', X='http://www.w3.org/XML/1998/namespace';
export function replaceSpreadsheetText(files,replacements){
 if(Object.keys(files).some(n=>n.toLowerCase().startsWith('_xmlsignatures/')))throw Error('带数字签名的工作簿不可修改');
 const counts=replacements.map(()=>0),changedParts=[];
 const names=Object.keys(files).filter(n=>n==='xl/sharedStrings.xml'||/^xl\/worksheets\/[^/]+\.xml$/.test(n));
 for(const name of names){
  const doc=new office.DOMParser({onError:()=>{throw Error('工作簿XML无效');}}).parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(files[name]),'application/xml');
  const nodes=(n,s)=>Array.from(n.getElementsByTagNameNS(S,s));
  const groups=name==='xl/sharedStrings.xml'?nodes(doc,'si'):nodes(doc,'c').filter(c=>c.getAttribute('t')==='inlineStr'&&!nodes(c,'f').length).flatMap(c=>nodes(c,'is'));
  let modified=false;
  for(const group of groups){
   // Phonetic guides/extension structures are not safely writable as ordinary text.
   if(nodes(group,'rPh').length||nodes(group,'phoneticPr').length)continue;
   const ts=nodes(group,'t');
   for(let k=0;k<replacements.length;k++){
    const {find,replace}=replacements[k];const text=ts.map(t=>t.textContent).join('');let at=0,hits=[];
    while((at=text.indexOf(find,at))>=0){hits.push(at);at+=find.length;}
    for(const start of hits.reverse()){let offset=0;for(const t of ts){const value=t.textContent,lo=Math.max(start-offset,0),hi=Math.min(start+find.length-offset,value.length);if(hi>lo){t.textContent=value.slice(0,lo)+(start>=offset&&start<offset+value.length?replace:'')+value.slice(hi);t.setAttributeNS(X,'xml:space','preserve');}offset+=value.length;}counts[k]++;modified=true;}
   }
  }
  if(modified){files[name]=new TextEncoder().encode(new office.XMLSerializer().serializeToString(doc));changedParts.push(name);}
 }
 if(counts.some(n=>!n))throw Error('查找文字不存在于可修改的字符串（不修改公式、数字或复杂注音）');
 return {changes:counts.reduce((a,b)=>a+b,0),changedParts};
}
