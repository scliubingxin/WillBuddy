import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../core.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { createAgentSession } from "../services/agent-session.mjs";
import {
  createKnowledgeIndexService,
  sharedKnowledgeIndex,
} from "../services/knowledge-index.mjs";
import { searchKnowledge } from "../runtime/knowledge-search.mjs";
const doc = (id, text) => ({
  id,
  name: id,
  text,
  revision: 1,
  sha256: createHash("sha256").update(text).digest("hex"),
});
const unindexed = (r) => {
  const { index, ...rest } = r;
  return rest;
};
async function fixture(work) {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-index-")),
    store = new Store(dir);
  await store.load();
  const documents = [
    doc("rules", "无关内容\n".repeat(15000) + "预算退款规则 ＩＳＯ９００１"),
    doc("vendor", "供应商资质 ISO9001"),
  ];
  store.data.documents = documents.map(({ text, ...d }) => d);
  try {
    await work({
      store,
      dir,
      documents,
      search: (docs = documents, query = "预算 资质") =>
        sharedKnowledgeIndex(store).searchApproved({
          documents: docs,
          query,
          check: () => {},
        }),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("inverted index reduces scored chunks while preserving exact scan ranking/text/coordinates", async () =>
  fixture(async (f) => {
    const a = await f.search();
    const expected = searchKnowledge(f.documents, "预算 资质");
    assert.deepEqual(unindexed(a), expected);
    assert.equal(a.index.built, 2);
    assert.ok(a.index.candidateChunks < a.index.sourceChunks / 2);
    const b = await f.search();
    assert.equal(b.index.reused, 2);
    assert.equal(b.index.built, 0);
    assert.deepEqual(unindexed(a), unindexed(b));
  }));
test("index survives Store reload and is actually reused without a separate text-read route", async () =>
  fixture(async (f) => {
    await f.search();
    const loaded = new Store(f.dir);
    await loaded.load();
    const result = await createKnowledgeIndexService({
      store: loaded,
    }).searchApproved({
      documents: f.documents,
      query: "预算",
      check: () => {},
    });
    assert.equal(result.index.reused, 2);
    assert.equal(result.index.built, 0);
    assert.ok(result.matches.length);
    assert.equal(
      f.store.data.knowledgeIndexes.some((e) => Object.hasOwn(e, "text")),
      false,
    );
  }));
test("CJK/fullwidth/Latin infix/single-character/astral Unicode results match the original scanner", async () =>
  fixture(async (f) => {
    const ds = [
      doc(
        "unicode",
        "项目\n预算 ＡＢＣ 𠀀汉 financeBudgetaryValue \n退款和退款 😀",
      ),
    ];
    f.store.data.documents = ds;
    for (const query of [
      "预算",
      "abc",
      "Budget",
      "b",
      "𠀀汉",
      "退款",
      "zzzz",
    ]) {
      const out = await f.search(ds, query);
      assert.deepEqual(unindexed(out), searchKnowledge(ds, query));
    }
  }));
test("revision/SHA or extracted text changes rebuild; removed documents are pruned on next approved query", async () =>
  fixture(async (f) => {
    await f.search();
    f.documents[0] = {
      ...f.documents[0],
      revision: 2,
      sha256: "b".repeat(64),
      text: "新预算9000元",
    };
    f.store.data.documents = f.documents;
    const result = await f.search();
    assert.equal(result.index.built, 1);
    assert.equal(result.index.reused, 1);
    assert.match(JSON.stringify(result.matches), /9000/);
    const changed = [{ ...f.documents[0], text: "预算8000元" }];
    const b = await f.search(changed, "预算");
    assert.equal(b.index.built, 1);
    assert.match(b.matches[0].text, /8000/);
    f.store.data.documents = [f.documents[1]];
    await f.search([f.documents[1]], "资质");
    assert.equal(f.store.data.knowledgeIndexes.length, 1);
  }));
test("checksum corruption, unknown algorithm, malformed rows are rebuilt rather than trusted", async () =>
  fixture(async (f) => {
    await f.search();
    f.store.data.knowledgeIndexes[0] = {
      ...structuredClone(f.store.data.knowledgeIndexes[0]),
      postings: {},
    };
    let out = await f.search();
    assert.equal(out.index.built, 1);
    assert.equal(out.matches.length, 2);
    f.store.data.knowledgeIndexes = f.store.data.knowledgeIndexes.map((e) => ({
      ...structuredClone(e),
      version: 999,
    }));
    out = await f.search();
    assert.equal(out.index.built, 2);
    f.store.data.knowledgeIndexes = [null, "invalid"];
    out = await f.search();
    assert.equal(out.index.built, 2);
  }));
test("large dictionaries fall back to exact full scan with an explicit uncached counter", async () =>
  fixture(async (f) => {
    const ds = [
      doc(
        "large",
        Array.from({ length: 30000 }, (_, i) =>
          String.fromCodePoint(0x20000 + i),
        ).join(""),
      ),
    ];
    f.store.data.documents = ds;
    const query = ds[0].text.slice(-2);
    const out = await f.search(ds, query);
    assert.equal(out.index.uncached, 1);
    assert.equal(out.index.built, 0);
    assert.deepEqual(unindexed(out), searchKnowledge(ds, query));
  }));
test("cache history is bounded and clear removes only derived data", async () =>
  fixture(async (f) => {
    const service = sharedKnowledgeIndex(f.store);
    for (let i = 0; i < 20; i++) {
      const ds = [doc("d" + i, "预算")];
      f.store.data.documents.push(...ds);
      await f.search(ds, "预算");
    }
    assert.equal(f.store.data.knowledgeIndexes.length, 16);
    assert.ok(
      Buffer.byteLength(JSON.stringify(f.store.data.knowledgeIndexes)) <=
        8388608,
    );
    const before = structuredClone(f.store.data.documents);
    await service.clear();
    assert.equal(f.store.data.knowledgeIndexes, undefined);
    assert.deepEqual(f.store.data.documents, before);
  }));
test("save failure rolls the cache field back and returns no excerpts; clear failure preserves cache", async () =>
  fixture(async (f) => {
    const save = f.store.save;
    f.store.save = async () => {
      throw Error("disk failure");
    };
    await assert.rejects(f.search(), /disk failure/);
    assert.equal(f.store.data.knowledgeIndexes, undefined);
    f.store.save = save;
    await f.search();
    const before = structuredClone(f.store.data.knowledgeIndexes);
    f.store.save = async () => {
      throw Error("disk failure");
    };
    await assert.rejects(sharedKnowledgeIndex(f.store).clear(), /disk failure/);
    assert.deepEqual(f.store.data.knowledgeIndexes, before);
  }));
test("cancellation/configuration revocation before work causes no cache or excerpts", async () =>
  fixture(async (f) => {
    const s = sharedKnowledgeIndex(f.store);
    for (const mode of ["cancel", "revoke"])
      await assert.rejects(
        s.searchApproved({
          documents: f.documents,
          query: "预算",
          signal: mode === "cancel" ? AbortSignal.abort() : undefined,
          check: () => {
            if (mode === "revoke") throw Error("revoked");
          },
        }),
      );
    assert.equal(f.store.data.knowledgeIndexes, undefined);
    await assert.rejects(
      s.searchApproved({ documents: f.documents, query: "预算" }),
      /已批准/,
    );
  }));
test("serialized concurrent approved queries merge rather than overwrite independent index entries", async () =>
  fixture(async (f) => {
    await Promise.all(f.documents.map((d) => f.search([d], "预算 资质")));
    assert.equal(f.store.data.knowledgeIndexes.length, 2);
  }));
test("warm index cannot bypass document approval; late denial releases no matches", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-index-auth-")),
    store = new Store(dir);
  await store.load();
  let allowed = true,
    reads = 0;
  const runtime = new ToolRuntime({
    store,
    browser: {},
    approve: async () => allowed,
  });
  try {
    const a = (
      await runtime.documents.importFile(
        "规则",
        "md",
        Buffer.from("预算10000元"),
      )
    ).document;
    const agent = {
      id: "a",
      name: "a",
      prompt: "p",
      tools: [],
      knowledge: [a.id],
    };
    store.data.agents.push(agent);
    const s = await createAgentSession({
      agent,
      store,
      executeTool: (...args) => {
        reads++;
        return runtime.execute(...args);
      },
    });
    const first = await s.execute("knowledge_search", { query: "预算" });
    assert.equal(first.index.built, 1);
    allowed = false;
    const second = await s.execute("knowledge_search", { query: "预算" });
    assert.equal(second.status, "denied");
    assert.equal(second.matches, undefined);
    assert.equal(reads, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("verified in-memory postings are frozen; replacement corruption still rebuilds", async () =>
  fixture(async (f) => {
    await f.search();
    const entry = f.store.data.knowledgeIndexes[0];
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.postings));
    assert.ok(Object.isFrozen(Object.values(entry.postings)[0]));
    assert.throws(() => {
      entry.postings.fake = [0];
    });
  }));
test("cancellation after cache write restores the old field on disk and releases no excerpts", async () =>
  fixture(async (f) => {
    const controller = new AbortController(),
      save = f.store.save.bind(f.store);
    let writes = 0;
    f.store.save = async () => {
      await save();
      if (++writes === 1) controller.abort();
    };
    await assert.rejects(
      sharedKnowledgeIndex(f.store).searchApproved({
        documents: f.documents,
        query: "预算",
        signal: controller.signal,
        check: () => {},
      }),
    );
    assert.equal(f.store.data.knowledgeIndexes, undefined);
    const loaded = new Store(f.dir);
    await loaded.load();
    assert.equal(loaded.data.knowledgeIndexes, undefined);
    assert.equal(writes, 2);
  }));
test("aggregate serialized cache budget evicts oldest groups rather than exceed8MiB", async () =>
  fixture(async (f) => {
    const fake = Array.from({ length: 12 }, (_, i) => ({
      id: "old" + i,
      revision: 1,
      sha256: "a".repeat(64),
      padding: "x".repeat(1048576),
    }));
    f.store.data.documents.push(...fake.map(({ padding, ...d }) => d));
    f.store.data.knowledgeIndexes = fake;
    await f.search();
    assert.ok(
      Buffer.byteLength(JSON.stringify(f.store.data.knowledgeIndexes)) <=
        8388608,
    );
    assert.ok(f.store.data.knowledgeIndexes.length < 12);
  }));
test("legacy single-source envelope plus index metadata remains a complete bounded JSON result", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-index-budget-")),
    store = new Store(dir);
  await store.load();
  const d = doc(
    "controls",
    ("预算" + String.fromCharCode(1).repeat(998)).repeat(40),
  );
  store.data.documents = [d];
  const agent = { id: "a", tools: [], knowledge: [d.id] };
  store.data.agents.push(agent);
  try {
    const s = await createAgentSession({
      agent,
      store,
      executeTool: async () => ({ status: "succeeded", document: d }),
    });
    const result = await s.execute("knowledge_search", {
      documentId: d.id,
      query: "预算",
    });
    assert.ok(JSON.stringify(result).length <= 30000);
    assert.equal(result.resultLimited, true);
    assert.ok(result.matches.length < 8);
    assert.equal(result.source.id, d.id);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("deterministic mixed-script queries preserve full-scan results across repeated indexed lookups", async () =>
  fixture(async (f) => {
    let seed = 123456;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };
    const words = [
      "预算",
      "退款",
      "供应商",
      "Finance",
      "Budgetary",
      "ＡＢＣ",
      "𠀀汉",
      "1234",
      "_key",
      "é",
      "İ",
      "\n",
    ];
    const text = Array.from(
        { length: 1500 },
        () => words[random() % words.length],
      ).join(" "),
      ds = [doc("mixed", text)];
    f.store.data.documents = ds;
    for (let i = 0; i < 35; i++) {
      const query = words[random() % (words.length - 1)];
      const result = await f.search(ds, query);
      assert.deepEqual(unindexed(result), searchKnowledge(ds, query));
    }
  }));
