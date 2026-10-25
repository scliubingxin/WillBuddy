// Deterministic, local lexical retrieval. Only accepts text already released by
// the document permission service; never reads the store, disk or network.
export const normalizeKnowledge = (s) =>
  s.normalize("NFKC").toLocaleLowerCase();
export function knowledgeQuery(query) {
  if (typeof query !== "string" || !query.trim() || query.length > 200)
    throw Error("知识查询须为1–200字符");
  const phrase = normalizeKnowledge(query.trim()),
    terms = new Set();
  for (const word of phrase.match(/[\p{L}\p{N}_]+/gu) || []) {
    if (/\p{Script=Han}/u.test(word)) {
      const chars = Array.from(word);
      if (chars.length === 1) terms.add(word);
      for (let i = 0; i + 1 < chars.length; i++)
        terms.add(chars[i] + chars[i + 1]);
    } else terms.add(word);
  }
  if (!terms.size) throw Error("知识查询需要文字或数字");
  if (terms.size > 64) throw Error("知识查询词过多，请缩小查询");
  return { phrase, terms: [...terms] };
}
const sourceOf = (d) => ({
  id: d.id,
  name: d.name,
  revision: d.revision,
  sha256: d.sha256,
});
export function validateKnowledgeDocuments(documents) {
  if (!Array.isArray(documents) || !documents.length || documents.length > 8)
    throw Error("知识检索限1–8份已批准文档");
  const seen = new Set();
  for (const d of documents) {
    if (
      !d ||
      typeof d.id !== "string" ||
      d.id.length > 200 ||
      typeof d.name !== "string" ||
      d.name.length > 100 ||
      seen.has(d.id) ||
      typeof d.text !== "string" ||
      d.text.length > 100000 ||
      !Number.isInteger(d.revision) ||
      d.revision < 1 ||
      !/^[a-f0-9]{64}$/.test(d.sha256)
    )
      throw Error("知识来源无效或超过10万字符");
    seen.add(d.id);
  }
}
export function knowledgeChunks(text, signal) {
  const starts = [0];
  for (let i = 0; i < text.length; i++)
    if (text[i] === "\n") starts.push(i + 1);
  const lineAt = (offset) => {
    let lo = 0,
      hi = starts.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid;
    }
    return lo + 1;
  };
  const chunks = [];
  for (let offset = 0; offset < text.length; ) {
    signal?.throwIfAborted();
    let end = Math.min(offset + 1000, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end - 1);
      if (newline > offset + 800) end = newline + 1;
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    chunks.push({
      offset,
      endOffset: end,
      line: lineAt(offset),
      endLine: lineAt(end - 1),
    });
    if (end === text.length) break;
    offset = end - 200;
    if (/[\uDC00-\uDFFF]/.test(text[offset])) offset++;
  }
  return chunks;
}

export function searchKnowledge(documents, query, signal, options = {}) {
  const { phrase, terms } = knowledgeQuery(query);
  validateKnowledgeDocuments(documents);
  const candidates = [],
    coverage = [];
  for (let index = 0; index < documents.length; index++) {
    signal?.throwIfAborted();
    const d = documents[index];

    const chunks = knowledgeChunks(d.text, signal);
    const selectedChunks = options.selectChunks?.(d, chunks, terms);
    if (options.diagnostics) {
      options.diagnostics.sourceChunks += chunks.length;
      options.diagnostics.candidateChunks +=
        selectedChunks?.size ?? chunks.length;
    }
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      signal?.throwIfAborted();
      if (selectedChunks && !selectedChunks.has(chunkIndex)) continue;
      const chunk = chunks[chunkIndex],
        { offset, endOffset } = chunk;
      const text = d.text.slice(offset, endOffset),
        normalized = normalizeKnowledge(text);
      const matchedTerms = terms.filter((t) => normalized.includes(t));
      const score =
        matchedTerms.length +
        (normalized.includes(phrase) ? terms.length + 4 : 0);
      if (score)
        candidates.push({
          source: sourceOf(d),
          ...chunk,
          text,
          score,
          matchedTerms,
          sourceIndex: index,
        });
    }
    coverage.push({
      ...sourceOf(d),
      characters: d.text.length,
      chunks: chunks.length,
      sourceTruncated: d.truncated === true || d.hasRichSource === true,
    });
  }
  candidates.sort(
    (a, b) =>
      b.score - a.score || a.sourceIndex - b.sourceIndex || a.offset - b.offset,
  );
  const selected = [],
    used = new Set();
  // Include the strongest matching chunk from each document before filling
  // remaining slots, so one repetitive document cannot hide another source.
  for (const c of candidates)
    if (!used.has(c.source.id)) {
      selected.push(c);
      used.add(c.source.id);
    }
  for (const c of candidates) {
    if (selected.length >= 8) break;
    if (
      !selected.some(
        (s) =>
          s.source.id === c.source.id &&
          s.offset < c.endOffset &&
          c.offset < s.endOffset,
      )
    )
      selected.push(c);
  }
  selected.sort(
    (a, b) =>
      b.score - a.score || a.sourceIndex - b.sourceIndex || a.offset - b.offset,
  );
  let budget = 8000;
  const matches = selected
    .map(({ sourceIndex, ...c }) => c)
    .filter((c) => {
      if (c.text.length > budget) return false;
      budget -= c.text.length;
      return true;
    });
  const output = {
    status: "succeeded",
    ...(options.diagnostics ? { index: { ...options.diagnostics } } : {}),
    method:
      "bounded lexical chunks; NFKC + Latin tokens + Chinese bigrams; not embeddings",
    sources: coverage,
    matches,
    truncated: coverage.some((d) => d.sourceTruncated),
    resultLimited: candidates.length > matches.length,
    limits: {
      documents: 8,
      charactersPerSource: 100000,
      chunksPerSource: 168,
      matches: 8,
      excerptCharacters: 8000,
      serializedCharacters: 30000,
    },
  };
  return boundKnowledgeResult(output);
}
export function boundKnowledgeResult(output) {
  while (JSON.stringify(output).length > 30000 && output.matches.length) {
    output.matches.pop();
    output.resultLimited = true;
  }
  if (JSON.stringify(output).length > 30000) throw Error("知识来源元数据超限");
  return output;
}
