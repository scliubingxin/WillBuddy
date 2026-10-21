import {body,bucket,db,failure,getRecord,guard,json,owner} from '@/lib/workspace';
import {createSpreadsheet,DOCUMENT_PROPOSAL_TTL_MS,spreadsheetProposalDigest,spreadsheetSpec} from '@/lib/document-agent';
import {documentToolsEnabled} from '@/lib/runtime-capabilities';
import {approvalAuditExport,documentAuditReceipt} from '@/lib/document-audit';

export async function POST(req:Request){
 try{
  guard(req);if(!documentToolsEnabled())throw new Error('文档生成工具尚未启用');const user=owner(req),input=await body(req,5000);
  if(input?.action==='audit'){
   if(typeof input.chatId!=='string'||input.chatId.length>100||(input.model!==undefined&&(typeof input.model!=='string'||input.model.length>200))||!Array.isArray(input.ids)||input.ids.length<1||input.ids.length>20)throw new Error('审批凭证导出请求无效');
   const ids:string[]=[...new Set(input.ids as string[])];if(ids.length!==input.ids.length||ids.some(id=>typeof id!=='string'||id.length<1||id.length>100))throw new Error('审批凭证导出请求无效');
   const events=[];
   for(const id of ids){const auditRow=await db().prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='tool_request'").bind(user,id).first<{data:string}>();if(!auditRow)throw new Error('审批记录不存在或无权访问');const proposal=JSON.parse(auditRow.data);if(typeof proposal.chatId!=='string'||proposal.chatId!==input.chatId)throw new Error('审批记录不属于当前对话');const receipt=documentAuditReceipt(id,proposal);if(!['completed','rejected','expired'].includes(receipt.status))throw new Error('审批记录尚未结束');events.push({receipt});}
   return json({audit:approvalAuditExport(input.chatId,input.model,events)});
  }
  if(typeof input?.id!=='string'||input.id.length>100||typeof input.chatId!=='string'||input.chatId.length<1||input.chatId.length>100||!['approve','reject','status'].includes(input.action))throw new Error('工具审批请求无效');
  const row=await db().prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='tool_request'").bind(user,input.id).first<{data:string}>();
  if(!row)throw new Error('工具提议不存在');
  const proposal=JSON.parse(row.data);
  if(typeof proposal.chatId!=='string'||proposal.chatId!==input.chatId)throw new Error('工具提议不属于当前对话');
  await getRecord(user,proposal.chatId,'chat');
  if(proposal.status==='completed'&&proposal.artifact)return json({status:'completed',artifact:proposal.artifact,proposalDigest:proposal.proposalDigest,receipt:documentAuditReceipt(input.id,proposal),reused:true});
  if(proposal.status==='rejected')return json({status:'rejected',proposalDigest:proposal.proposalDigest,receipt:documentAuditReceipt(input.id,proposal),reused:true});
  if(proposal.status==='expired')return json({status:'expired',expiresAt:proposal.expiresAt,proposalDigest:proposal.proposalDigest,receipt:documentAuditReceipt(input.id,proposal),reused:true});
  if(proposal.status!=='pending')throw new Error('工具提议正在处理，请稍后刷新');
  const expiresAt=Number(proposal.expiresAt||0)||Number(proposal.created||0)+DOCUMENT_PROPOSAL_TTL_MS;
  if(!Number.isFinite(expiresAt)||Date.now()>=expiresAt){
   const expired={...proposal,status:'expired',expiresAt,decided:Date.now()};
   const changed=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='tool_request' AND data=?").bind(JSON.stringify(expired),Date.now(),user,input.id,row.data).run();
   if(!changed.meta.changes)throw new Error('提议状态已改变，请刷新');
   return json({status:'expired',expiresAt,receipt:documentAuditReceipt(input.id,expired)});
  }
  if(input.action==='status')return json({status:'pending',expiresAt,proposalDigest:proposal.proposalDigest});
  if(input.action==='reject'){
   const rejected={...proposal,status:'rejected',decided:Date.now()};
   const changed=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='tool_request' AND data=?").bind(JSON.stringify(rejected),Date.now(),user,input.id,row.data).run();
   if(!changed.meta.changes)throw new Error('提议状态已改变，请刷新');
   return json({status:'rejected',proposalDigest:proposal.proposalDigest,receipt:documentAuditReceipt(input.id,rejected)});
  }
  const claimed={...proposal,status:'executing',decided:Date.now()},claimedData=JSON.stringify(claimed);
  const claim=await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='tool_request' AND data=?").bind(claimedData,Date.now(),user,input.id,row.data).run();
  if(!claim.meta.changes)throw new Error('提议状态已改变，请刷新');
  try{
   if(proposal.tool!=='create_spreadsheet'||typeof proposal.arguments!=='string'||typeof proposal.proposalDigest!=='string')throw new Error('工具提议内容无效');
   const verifiedDigest=await spreadsheetProposalDigest(spreadsheetSpec(proposal.arguments));
   if(verifiedDigest!==proposal.proposalDigest)throw new Error('提议内容完整性校验失败，请重新提出文件要求');
   const file=await createSpreadsheet(proposal.arguments),artifactId=crypto.randomUUID(),objectKey=`${user}/chat-artifacts/${artifactId}.xlsx`;
   await bucket().put(objectKey,file.bytes,{httpMetadata:{contentType:file.mime}});
   const {bytes,mime,...metadata}=file,artifact={id:artifactId,...metadata,url:'/api/artifact-file?id='+encodeURIComponent(artifactId)};
   try{
    const now=Date.now(),artifactData={...metadata,objectKey,format:'xlsx',content:`表格成果：${file.rowCount} 行、${file.columnCount} 列。SHA-256：${file.sha256}`},completed={...claimed,status:'completed',completed:now,artifact};
    const [artifactWrite,proposalWrite]=await db().batch([
     db().prepare("INSERT INTO records(owner,id,kind,data,updated) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND kind='chat') AND EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND kind='tool_request' AND data=?)").bind(user,artifactId,'artifact',JSON.stringify(artifactData),now,user,proposal.chatId,user,input.id,claimedData),
     db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='tool_request' AND data=? AND EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND kind='chat')").bind(JSON.stringify(completed),now,user,input.id,claimedData,user,proposal.chatId)
    ]);
    if(artifactWrite.meta.changes!==1||proposalWrite.meta.changes!==1)throw new Error('原始对话或提议状态已改变，未交付文件');
    return json({status:'completed',artifact,receipt:documentAuditReceipt(input.id,completed)});
   }catch(error){await Promise.all([bucket().delete(objectKey),db().prepare("DELETE FROM records WHERE owner=? AND id=? AND kind='artifact'").bind(user,artifactId).run()]);throw error;}
  }catch(error){
   await db().prepare("UPDATE records SET data=?,updated=? WHERE owner=? AND id=? AND kind='tool_request' AND data=? AND EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND kind='chat')").bind(JSON.stringify({...proposal,status:'pending',lastError:error instanceof Error?error.message:'生成失败'}),Date.now(),user,input.id,claimedData,user,proposal.chatId).run();
   throw error;
  }
 }catch(e){return failure(e);}
}
