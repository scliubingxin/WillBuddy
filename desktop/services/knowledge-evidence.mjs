/** Capture only successful registered retrieval observations, never assistant prose.
 * Snapshots remain historical chat content; they do not grant future document reads.
 */
export function recordKnowledgeEvidence(chat, runId, result, documents, time = Date.now()) {
  if (result?.status !== 'succeeded') return;
  if (!Array.isArray(result.matches) || result.matches.length > 8 || !Array.isArray(result.sources))
    throw Error('知识证据结果无效');
  const matches = result.matches.map(m => {
    const s = m.source, live = documents.find(d => d.id === s?.id);
    if (!live || live.revision !== s.revision || live.sha256 !== s.sha256 ||
        typeof s.name !== 'string' || s.name.length > 100 ||
        typeof m.text !== 'string' || m.text.length > 1000 ||
        !Number.isInteger(m.offset) || m.offset < 0 ||
        !Number.isInteger(m.endOffset) || m.endOffset - m.offset !== m.text.length ||
        !Number.isInteger(m.line) || m.line < 1 ||
        !Number.isInteger(m.endLine) || m.endLine < m.line ||
        !/^[a-f0-9]{64}$/.test(s.sha256)) throw Error('知识证据来源已变化或坐标无效');
    return {source:{id:s.id,name:s.name,revision:s.revision,sha256:s.sha256},
      line:m.line,endLine:m.endLine,offset:m.offset,endOffset:m.endOffset,text:m.text};
  });
  const sources = result.sources.map(s => ({id:s.id,name:s.name,revision:s.revision,
    sha256:s.sha256,sourceTruncated:s.sourceTruncated === true}));
  if (sources.length > 8 || sources.some(s => !documents.some(d =>
    d.id === s.id && d.revision === s.revision && d.sha256 === s.sha256)))
    throw Error('知识证据覆盖范围无效');
  const row = {runId,time,matches,sources,resultLimited:result.resultLimited===true};
  // Preserve whole retrieval groups, never cut a coordinate or excerpt in half.
  const rows = [...(chat.knowledgeEvidence || []),row];
  const size = () => rows.reduce((n,r) => n + JSON.stringify(r).length,0);
  while (rows.length > 12 || size() > 96000) rows.shift();
  chat.knowledgeEvidence = rows;
}
