import { normalizeKnowledge } from "./knowledge-search.mjs";
export const INDEX_VERSION = 1;
// Prefix unigrams/bigrams only narrow candidates. Original approved text always
// determines exact substring matches, scores and excerpts, including Latin infixes.
const gramKey = (term) => Array.from(term).slice(0, 2).join("");
export function buildKnowledgePostings(text, chunks, signal) {
  const postings = new Map();
  let refs = 0,
    characters = 0;
  for (let i = 0; i < chunks.length; i++) {
    signal?.throwIfAborted();
    const c = chunks[i],
      chars = Array.from(normalizeKnowledge(text.slice(c.offset, c.endOffset))),
      keys = new Set();
    characters += chars.length;
    if (characters > 2000000) return null;
    for (let j = 0; j < chars.length; j++) {
      if (!/[\p{L}\p{N}_]/u.test(chars[j])) continue;
      keys.add(chars[j]);
      if (j + 1 < chars.length && /[\p{L}\p{N}_]/u.test(chars[j + 1]))
        keys.add(chars[j] + chars[j + 1]);
    }
    for (const key of keys) {
      if (!postings.has(key)) postings.set(key, []);
      postings.get(key).push(i);
      refs++;
    }
    if (postings.size > 50000 || refs > 150000) return null;
  }
  return Object.fromEntries(
    [...postings].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}
export function indexedCandidates(postings, terms) {
  const hits = new Set();
  for (const term of terms)
    for (const i of postings[gramKey(term)] || []) hits.add(i);
  return hits;
}
