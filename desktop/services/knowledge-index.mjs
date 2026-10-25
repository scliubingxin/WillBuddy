import { createHash } from "node:crypto";
import {
  knowledgeChunks,
  knowledgeQuery,
  searchKnowledge,
  validateKnowledgeDocuments,
} from "../runtime/knowledge-search.mjs";
import {
  INDEX_VERSION,
  buildKnowledgePostings,
  indexedCandidates,
} from "../runtime/knowledge-index.mjs";
const hash = (s) => createHash("sha256").update(s, "utf16le").digest("hex");
const bytes = (x) => Buffer.byteLength(JSON.stringify(x));
const digest = (entry) => hash(JSON.stringify(entry));
const rowMatches = (row, d) =>
  !!row &&
  !!d &&
  row.id === d.id &&
  row.revision === d.revision &&
  row.sha256 === d.sha256;
const payload = (e) => {
  const { checksum, ...body } = e;
  return body;
};
const validated = new WeakSet();
function trust(entry) {
  for (const chunk of entry.chunks) Object.freeze(chunk);
  Object.freeze(entry.chunks);
  for (const list of Object.values(entry.postings)) Object.freeze(list);
  Object.freeze(entry.postings);
  Object.freeze(entry);
  validated.add(entry);
  return entry;
}
function usable(e, d, chunks, locale) {
  if (
    !e ||
    e.version !== INDEX_VERSION ||
    !rowMatches(e, d) ||
    e.textSha256 !== hash(d.text) ||
    e.locale !== locale
  )
    return false;
  if (validated.has(e)) return true;
  if (
    bytes(e) > 2097152 ||
    e.checksum !== digest(payload(e)) ||
    JSON.stringify(e.chunks) !== JSON.stringify(chunks) ||
    !e.postings ||
    typeof e.postings !== "object" ||
    Array.isArray(e.postings)
  )
    return false;
  const valid = Object.entries(e.postings).every(
    ([key, list]) =>
      Array.from(key).length <= 2 &&
      Array.isArray(list) &&
      list.length <= chunks.length &&
      list.every(
        (i, j) =>
          Number.isInteger(i) &&
          i >= 0 &&
          i < chunks.length &&
          (j === 0 || i > list[j - 1]),
      ),
  );
  if (valid) trust(e);
  return valid;
}
const services = new WeakMap();
export function sharedKnowledgeIndex(store) {
  if (!services.has(store))
    services.set(store, createKnowledgeIndexService({ store }));
  return services.get(store);
}
// Derived data only. This API is internal and requires the session's approval /
// source-version check callback. Never exposes a cache-only model/IPC read route.
export function createKnowledgeIndexService({ store }) {
  let queue = Promise.resolve();
  return {
    clear() {
      const work = async () => {
        const old = store.data.knowledgeIndexes;
        delete store.data.knowledgeIndexes;
        try {
          await store.save();
        } catch (e) {
          store.data.knowledgeIndexes = old;
          throw e;
        }
      };
      const next = queue.catch(() => {}).then(work);
      queue = next;
      return next;
    },
    searchApproved({ documents, query, signal, check }) {
      const work = async () => {
        if (typeof check !== "function")
          throw Error("知识索引缺少已批准来源校验");
        const guard = () => {
          signal?.throwIfAborted();
          check();
          for (const d of documents)
            if (
              !(store.data.documents || []).some((live) => rowMatches(d, live))
            )
              throw Error("知识来源已变化");
        };
        guard();
        knowledgeQuery(query);
        const old = store.data.knowledgeIndexes;
        let entries = Array.isArray(old)
          ? old.filter((e) =>
              (store.data.documents || []).some((d) => rowMatches(e, d)),
            )
          : [];
        const byId = new Map(),
          locale = Intl.DateTimeFormat().resolvedOptions().locale;
        const diagnostics = {
          version: INDEX_VERSION,
          kind: "persistent lexical prefix postings; not embeddings",
          built: 0,
          reused: 0,
          uncached: 0,
          sourceChunks: 0,
          candidateChunks: 0,
        };
        // Validate document inputs before considering any cache; no hidden full scan.
        validateKnowledgeDocuments(documents);
        for (const d of documents) {
          await new Promise((resolve) => setImmediate(resolve));
          guard();
          const chunks = knowledgeChunks(d.text, signal),
            cached = entries.find((e) => e.id === d.id);
          if (usable(cached, d, chunks, locale)) {
            byId.set(d.id, cached.postings);
            diagnostics.reused++;
            continue;
          }
          entries = entries.filter((e) => e.id !== d.id);
          const postings = buildKnowledgePostings(d.text, chunks, signal);
          const entry = {
            version: INDEX_VERSION,
            id: d.id,
            revision: d.revision,
            sha256: d.sha256,
            textSha256: hash(d.text),
            locale,
            chunks,
            postings,
          };
          entry.checksum = digest(entry);
          if (!postings || bytes(entry) > 2097152) {
            diagnostics.uncached++;
            continue;
          }
          trust(entry);
          entries.unshift(entry);
          byId.set(d.id, postings);
          diagnostics.built++;
        }
        while (entries.length > 16 || bytes(entries) > 8388608) entries.pop();
        guard();
        if (JSON.stringify(old || []) !== JSON.stringify(entries)) {
          store.data.knowledgeIndexes = entries;
          let saved = false;
          try {
            await store.save();
            saved = true;
            guard();
          } catch (e) {
            store.data.knowledgeIndexes = old;
            if (saved) {
              try {
                await store.save();
              } catch {
                throw Error(
                  "索引取消或来源变化后，回滚写入失败；未返回片段，下次查询将重新校验",
                );
              }
            }
            throw e;
          }
        }
        guard();
        return searchKnowledge(documents, query, signal, {
          diagnostics,
          selectChunks: (d, chunks, terms) =>
            byId.has(d.id)
              ? indexedCandidates(byId.get(d.id), terms)
              : undefined,
        });
      };
      const next = queue.catch(() => {}).then(work);
      queue = next;
      return next;
    },
  };
}
