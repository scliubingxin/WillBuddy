import {inspectDocument} from '../runtime/documents.mjs';
/** Native selection imports a private copy. Sending grants this turn only. */
export function readChatDocument(store, ref) {
  const d=(store.data.documents||[]).find(d=>d.id===ref.documentId);
  if(!d||d.revision!==ref.revision||d.sha256!==ref.sha256)throw Error('问答附件已移除或版本变化，请重新添加');
  const bytes=Buffer.from(d.base64,'base64'), checked=inspectDocument(d.format,bytes);
  if(checked.sha256!==ref.sha256)throw Error('问答附件校验失败');
  if(!checked.text.trim())throw Error('附件未提取到可问答正文；扫描件和图片内容需视觉/OCR支持');
  return {name:d.attachmentSource?d.attachmentSource.archive+' / '+d.attachmentSource.entryPath:(d.format==='md'&&/\.[a-z0-9]+$/i.test(d.name)?d.name:d.name.replace(new RegExp('(?:\\.'+d.format+')+$','i'),'')+'.'+d.format),text:checked.text,truncated:false,attachmentSource:d.attachmentSource};
}
export function validateChatDocuments(store, refs) {
  if(!Array.isArray(refs)||refs.length>32)throw Error('每次最多32份问答附件');
  const ids=new Set();let count=0;
  return refs.map(ref=>{
    if(!ref||typeof ref.documentId!=='string'||!Number.isInteger(ref.revision)||typeof ref.sha256!=='string'||ids.has(ref.documentId))throw Error('问答附件引用无效');
    ids.add(ref.documentId);const d=readChatDocument(store,ref);count+=d.text.length;
    if(count>100000)throw Error('附件正文合计超过10万字符，请拆分发送');
    return {documentId:ref.documentId,revision:ref.revision,sha256:ref.sha256,name:d.name,...(d.attachmentSource||{})};
  });
}
