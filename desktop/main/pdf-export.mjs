import path from 'node:path';
import {sha256} from '../runtime/documents.mjs';
// Only a native save dialog chooses the destination; the renderer supplies a document ID and revision.
export async function exportDocumentPdf({id,revision,documents,office,chooseDestination,writeDestination}) {
 if(!office)throw Error('当前环境没有内置 Office 转换引擎');
 const original=documents.bytes(id,revision);
 if(!['docx','xlsx','pptx'].includes(original.format))throw Error('仅支持导出 Word、Excel 或 PowerPoint 为 PDF');
 const destination=await chooseDestination(original.name.replace(/[\\/:*?"<>|]/g,'_')+'.pdf');
 if(!destination)return {status:'cancelled'};
 const check=()=>{const current=documents.bytes(id,revision);if(documents.read(id).revision!==revision||current.sha256!==original.sha256||current.revision!==original.revision)throw Error('文档已变化，请重新导出');};
 check();
 const result=await office.preview(id,revision);
 check();
 if(result.id!==id||result.revision!==original.revision||result.sha256!==original.sha256||typeof result.base64!=='string')throw Error('PDF转换结果与原文档不匹配');
 const bytes=Buffer.from(result.base64,'base64');
 if(bytes.length<8||bytes.length>16*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(Math.max(0,bytes.length-1024)).includes(Buffer.from('%%EOF'))||sha256(bytes)!==result.pdfSha256)throw Error('PDF转换结果校验失败');
 await writeDestination(destination,bytes,{maxBytes:16*1024*1024,beforePublish:check});
 return {status:'succeeded',name:path.basename(destination),bytes:bytes.length,sha256:result.pdfSha256,sourceRevision:original.revision};
}
