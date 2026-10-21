import {unzipSync,strFromU8} from 'fflate';
import {parseCSV,toSpreadsheetCSV,type DataTable} from './data-engine';
import {buildDocx} from './docx-export';
import {buildXlsx} from './xlsx-export';
export {buildDocx} from './docx-export';
export {buildXlsx} from './xlsx-export';
const xmlEscape=(s:unknown)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function exportCsv(name:string,columns:string[],rows:Record<string,unknown>[]){
 const {csv,protectedCells}=toSpreadsheetCSV(columns,rows);
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 try{
  const a=document.createElement('a');a.href=url;
  a.download=(name+'.csv').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');a.click();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return {protectedCells};
}
function xml(raw:string){const x=new DOMParser().parseFromString(raw,'application/xml');if(x.querySelector('parsererror'))throw new Error('文件 XML 内容无效');return x;}
function texts(doc:Document,tag:string){return Array.from(doc.getElementsByTagNameNS('*',tag)).map(n=>n.textContent||'');}
function unpack(bytes:Uint8Array){let total=0;return unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(total>25000000||f.originalSize>15000000)throw new Error('解压后内容过大');return /\.xml$/.test(f.name);}});}
export async function extractFile(file:File):Promise<{name:string,text:string,table?:DataTable}>{
 if(file.size>10000000)throw new Error('当前文件上限为 10MB');const ext=file.name.split('.').pop()?.toLowerCase();let text='',table:DataTable|undefined;
 if(['docx','pptx','xlsx'].includes(ext||'')){const entries=unpack(new Uint8Array(await file.arrayBuffer()));
 if(ext==='docx'){if(!entries['word/document.xml'])throw new Error('无效 Word 文件');text=texts(xml(strFromU8(entries['word/document.xml'])),'p').join('\n');}
 if(ext==='pptx'){text=Object.keys(entries).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)?.[1])-Number(b.match(/slide(\d+)/)?.[1])).map((n,i)=>`第 ${i+1} 页\n`+texts(xml(strFromU8(entries[n])),'t').join('\n')).join('\n\n');}
 if(ext==='xlsx'){const shared=entries['xl/sharedStrings.xml']?texts(xml(strFromU8(entries['xl/sharedStrings.xml'])),'si'):[];const name=Object.keys(entries).find(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n));if(!name)throw new Error('工作簿没有可读取的工作表');const sheet=xml(strFromU8(entries[name]));const rows=Array.from(sheet.getElementsByTagNameNS('*','row')).map(r=>{const result:string[]=[];for(const cell of Array.from(r.getElementsByTagNameNS('*','c'))){const addr=cell.getAttribute('r')||'A1';let idx=0;for(const c of addr.replace(/\d/g,''))idx=idx*26+c.charCodeAt(0)-64;const t=cell.getAttribute('t'),v=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';result[idx-1]=t==='s'?shared[Number(v)]||'':v;if(t==='inlineStr')result[idx-1]=Array.from(cell.getElementsByTagNameNS('*','t')).map(x=>x.textContent).join('');}return Array.from({length:result.length},(_,i)=>result[i]||'');});text=rows.map(r=>r.map(c=>'"'+c.replace(/"/g,'""')+'"').join(',')).join('\n');table=parseCSV(text);}}
 else if(ext==='pdf'){const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const doc=await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true}).promise;try{if(doc.numPages>200)throw new Error('当前 PDF 上限为 200 页');const pages=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();pages.push(`第 ${i} 页\n`+content.items.map((x:any)=>x.str||'').join(' '));}text=pages.join('\n\n');}finally{await doc.destroy();}if(text.replace(/第 \d+ 页/g,'').trim().length<15)throw new Error('这份 PDF 没有可提取文字，扫描件需要 OCR 服务');}
 else if(['txt','md','csv','json','yaml','yml','xml','vtt','html','htm','js','ts','py','log'].includes(ext||'')){text=await file.text();if(ext==='csv')table=parseCSV(text);if(['html','htm'].includes(ext||'')){const d=new DOMParser().parseFromString(text,'text/html');d.querySelectorAll('script,style').forEach(n=>n.remove());text=d.body.textContent||'';}}
 else throw new Error('支持 PDF、DOCX、PPTX、XLSX、CSV 和常见文本文件');
 if(!text.trim())throw new Error('文件没有可提取的文字');if(text.length>200000)throw new Error('解析文本超过 20 万字符，请拆分文件');return {name:file.name,text,table};
}
export function exportDocx(name:string,text:string){const bytes=buildDocx(text);const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));const a=document.createElement('a');a.href=url;a.download=(name+'.docx').replace(/[\\/:*?"<>|]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exportXlsx(name:string,columns:string[],rows:Record<string,unknown>[]){const bytes=buildXlsx(columns,rows),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=(name+'.xlsx').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function printDocument(name:string,text:string){const w=window.open('','_blank');if(!w)throw new Error('请允许弹出窗口后再导出 PDF');w.document.write(`<!doctype html><html lang="zh-CN"><head><title>${xmlEscape(name)}</title><style>body{font:15px/1.9 'Microsoft YaHei',sans-serif;max-width:760px;margin:50px auto;color:#25344c}h1{font-size:26px}pre{white-space:pre-wrap;font:inherit}@media print{body{margin:0}@page{size:A4;margin:20mm}}</style></head><body><h1>${xmlEscape(name)}</h1><pre>${xmlEscape(text)}</pre></body></html>`);w.document.close();w.focus();w.print();}
