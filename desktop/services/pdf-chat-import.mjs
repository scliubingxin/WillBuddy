import path from 'node:path';
import {createHash} from 'node:crypto';
import {recognizePdf} from '../runtime/pdf-ocr.mjs';
import {makeOcrDocument} from '../runtime/ocr-provenance.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function validatePdfRange(range) {
  if(range===undefined)return {startPage:1,endPage:'first5'};
  if(!range || typeof range!=='object' || Array.isArray(range) || Object.keys(range).some(k=>!['startPage','endPage'].includes(k)) || !Number.isInteger(range.startPage) || !Number.isInteger(range.endPage) || range.startPage<1 || range.endPage>100 || range.endPage<range.startPage || range.endPage-range.startPage>=5)throw Error('请选择1至100页内连续最多5页');
  return {startPage:range.startPage,endPage:range.endPage};
}
/** The host supplies a native-selected path and a bounded no-follow reader.
 * Raw bytes are temporary; only recognized text is stored after consent. */
export async function importChatPdf({file,read,confirm,tools,documents,directory,signal,range,onProgress=()=>{},recognize=recognizePdf}) {
  if(typeof file!=='string'||!file.toLowerCase().endsWith('.pdf')||typeof read!=='function'||typeof confirm!=='function')throw Error('PDF选择无效');
  const selected=validatePdfRange(range);
  const original=await read(file);signal?.throwIfAborted();
  if(!Buffer.isBuffer(original)||original.length<5||original.length>16*1024*1024||original.subarray(0,5).toString()!=='%PDF-')throw Error('PDF无效或超过16MiB');
  const name=path.basename(file), hash=sha(original);
  const language=await confirm({name,sha256:hash,maxPages:5,...selected});signal?.throwIfAborted();
  if(language===null || language===false)return false;
  if(!['eng','chi_sim','chi_sim+eng'].includes(language))throw Error('OCR语言无效');
  const guard=async()=>{signal?.throwIfAborted();const current=await read(file);if(!Buffer.isBuffer(current)||sha(current)!==hash)throw Error('选择的PDF在识别期间变化，请重新选择');signal?.throwIfAborted();};
  await guard();const engine=await tools();await guard();
  const source={folderId:'selected-pdf',name,sha256:hash,bytes:original};
  const result=await recognize({source,tools:engine,directory,...selected,language,signal,guard,onProgress});
  await guard();const {text,provenance}=makeOcrDocument(result.source,result.pages);
  const base=name.slice(0,-4).replace(/[\u0000-\u001f/\\]/g,' ').trim().slice(0,80)||'PDF';
  const saved=await documents.importFile(base+'-OCR','md',Buffer.from(text,'utf8'),signal,guard,provenance);
  const d=saved.document, included=result.pages.length, total=result.source.totalPages, first=result.pages[0].page, last=result.pages.at(-1).page;
  return {attachments:[{documentId:d.id,revision:d.revision,sha256:d.sha256,name:d.name,text:d.text}],skipped:[],notice:`已识别第${first}–${last}页（共${total}页）；识别可能有误。${total>included?'其余页面未识别，不会发送给模型。':''}发送后识别文字将交给当前模型。`};
}
