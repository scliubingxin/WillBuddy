import {createHash} from 'node:crypto';

// Resolve expected identity from the persisted retrieval snapshot, not the UI.
export function selectOcrEvidence(store, {chatId, row, match, runId, time, expectedHash}) {
  if(typeof chatId!=='string'||chatId.length>128||!Number.isInteger(row)||row<0||!Number.isInteger(match)||match<0) throw Error('证据位置无效');
  const chat=store.data.chats?.find(c=>c.id===chatId), group=chat?.knowledgeEvidence?.[row], entry=group?.matches?.[match], source=entry?.ocrSource;
  if(!source || group.runId!==runId || group.time!==time || source.sha256!==expectedHash || typeof source.name!=='string' || !/^[a-f0-9]{64}$/.test(source.sha256||'') || !Array.isArray(source.pages) || !source.pages.length || source.pages.length>5 || source.pages.some(p=>!Number.isInteger(p)||p<1||p>100)) throw Error('原PDF证据不存在或已变化');
  return {name:source.name,sha256:source.sha256,pages:[...source.pages],regions:source.regions,regionsTruncated:source.regionsTruncated===true,fingerprint:JSON.stringify({runId:group.runId,time:group.time,entry})};
}

// Only native selection supplies the path; bytes are never sent to a model.
// A different process may still change the file after the OS opens it.
export async function openOcrSource({store,reference,choose,read,open}) {
  const before=selectOcrEvidence(store,reference);
  const selected=await choose(before);
  if(!selected)return false;
  if(typeof selected!=='string'||!selected.toLowerCase().endsWith('.pdf'))throw Error('请选择原PDF文件');
  const check=()=>{const now=selectOcrEvidence(store,reference);if(now.fingerprint!==before.fingerprint)throw Error('证据在选择期间已变化，请重试');};
  check();const bytes=await read(selected);check();
  if(!Buffer.isBuffer(bytes)||bytes.length<5||bytes.length>16*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-'||createHash('sha256').update(bytes).digest('hex')!==before.sha256)throw Error('所选PDF与此OCR来源不一致');
  const again=await read(selected);check();
  if(!Buffer.isBuffer(again)||!bytes.equals(again))throw Error('所选PDF已变化，请重新选择');
  const error=await open(selected);if(error)throw Error('无法打开原PDF：'+String(error).slice(0,200));
  return {opened:true,pages:before.pages};
}
