const terminalStatuses=new Set(['completed','rejected','expired']);

export function documentAuditReceipt(id:string,proposal:any){
 const status=String(proposal?.status||''),artifact=proposal?.artifact;
 return {schemaVersion:1,proposalId:id,tool:proposal?.tool==='create_spreadsheet'?'create_spreadsheet':'unknown',status,
  proposalDigest:typeof proposal?.proposalDigest==='string'?proposal.proposalDigest:null,
  created:Number.isFinite(proposal?.created)?proposal.created:null,expiresAt:Number.isFinite(proposal?.expiresAt)?proposal.expiresAt:null,
  decided:Number.isFinite(proposal?.decided)?proposal.decided:null,completed:Number.isFinite(proposal?.completed)?proposal.completed:null,
  artifact:status==='completed'&&artifact?{id:String(artifact.id||''),name:String(artifact.name||''),size:Number(artifact.size||0),sha256:String(artifact.sha256||''),rowCount:Number(artifact.rowCount||0),columnCount:Number(artifact.columnCount||0)}:null};
}

export function approvalAuditExport(chatId:string,model:string|undefined,events:any[],generatedAt=Date.now()){
 const seen=new Set<string>(),receipts=[];
 for(const event of events||[]){const receipt=event?.receipt;if(!receipt||typeof receipt.proposalId!=='string'||seen.has(receipt.proposalId)||!terminalStatuses.has(receipt.status))continue;seen.add(receipt.proposalId);receipts.push({schemaVersion:1,proposalId:receipt.proposalId,tool:receipt.tool,status:receipt.status,proposalDigest:receipt.proposalDigest??null,created:receipt.created??null,expiresAt:receipt.expiresAt??null,decided:receipt.decided??null,completed:receipt.completed??null,artifact:receipt.artifact??null});}
 return {schemaVersion:1,brand:'幕云AI',kind:'document_approval_audit',chatId,model:model||null,generatedAt,receipts};
}
