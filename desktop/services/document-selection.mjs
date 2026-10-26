import {sha256} from '../runtime/documents.mjs';
import {wordSelection} from '../runtime/word-selection.mjs';
export function resolveDocumentSelection(store,input){
 const d=store.data.documents?.find(d=>d.id===input?.documentId);
 if(!d||d.format!=='docx'||d.richSource)throw Error('仅支持导入Word原件的正文选区');
 if(d.revision!==input.revision||d.sha256!==input.sha256)throw Error('文档版本已变化，请重新选择');
 const bytes=Buffer.from(d.base64,'base64');if(sha256(bytes)!==d.sha256)throw Error('文档校验失败');
 return {documentId:d.id,name:d.name,revision:d.revision,sha256:d.sha256,request:structuredClone(input.request),...wordSelection(bytes,input.request)};
}
export function resolveDocumentSelections(store,inputs=[]){
 if(!Array.isArray(inputs)||inputs.length>3||JSON.stringify(inputs).length>40000)throw Error('最多附加3处选区');
 const result=inputs.map(s=>resolveDocumentSelection(store,s));
 if(result.reduce((n,s)=>n+s.text.length,0)>12000||JSON.stringify(result).length>50000)throw Error('选区上下文过大，请缩小范围');
 return result;
}
