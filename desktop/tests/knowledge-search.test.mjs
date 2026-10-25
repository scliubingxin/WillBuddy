import { createServer } from "node:http";
import { createConversationService } from "../services/conversation.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { Store } from "../core.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { createAgentSession } from "../services/agent-session.mjs";
import {
  knowledgeQuery,
  searchKnowledge,
} from "../runtime/knowledge-search.mjs";
const doc = (id, text) => ({
  id,
  name: id,
  text,
  revision: 1,
  sha256: createHash("sha256").update(text).digest("hex"),
});
async function fixture(work) {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-knowledge-"));
  const store = new Store(dir);
  await store.load();
  let allowed = true;
  const reads = [];
  const runtime = new ToolRuntime({
    store,
    browser: {},
    approve: async () => allowed,
  });
  const a = (
    await runtime.documents.importFile(
      "预算规则",
      "md",
      Buffer.from("采购预算上限：10000元\n报价必须经过财务核对"),
    )
  ).document;
  const b = (
    await runtime.documents.importFile(
      "供应商规则",
      "md",
      Buffer.from("供应商资质：ISO9001\n报价有效期：30天"),
    )
  ).document;
  const agent = {
    id: "knowledge-agent",
    name: "核对",
    prompt: "按真实来源核对",
    tools: [],
    knowledge: [a.id, b.id],
  };
  store.data.agents.push(agent);
  const options = {
    agent,
    store,
    executeTool: async (...args) => {
      reads.push(args[1].id);
      return runtime.execute(...args);
    },
  };
  try {
    await work({
      store,
      runtime,
      a,
      b,
      agent,
      reads,
      options,
      deny: () => {
        allowed = false;
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("Chinese phrases retrieve multiple related sources without requiring the whole query", () => {
  const out = searchKnowledge(
    [doc("budget", "采购预算：10000元"), doc("vendor", "供应商资质：ISO9001")],
    "核对采购预算和供应商资质",
  );
  assert.deepEqual(
    new Set(out.matches.map((m) => m.source.id)),
    new Set(["budget", "vendor"]),
  );
  assert.match(out.method, /not embeddings/);
});
test("NFKC and case folding find full-width Latin data while excerpts remain exact source bytes", () => {
  const d = doc("a", "第一行\n供应商 ＩＳＯ９００１ 认证\n第三行"),
    out = searchKnowledge([d], "iso9001");
  const m = out.matches[0];
  assert.ok(m);
  assert.equal(m.text, d.text.slice(m.offset, m.endOffset));
  assert.equal(m.line, 1);
  assert.equal(m.endLine, 3);
  assert.equal(m.source.sha256, d.sha256);
});
test("long lines are chunked, late matches are found and exact line/offset citations survive", () => {
  const d = doc(
    "large",
    "无关行\n" + "x".repeat(90000) + "合同退款条款：七天\n最后一行",
  );
  const m = searchKnowledge([d], "退款条款").matches[0];
  assert.match(m.text, /七天/);
  assert.ok(m.offset > 80000);
  assert.equal(m.line, 2);
  assert.equal(m.text, d.text.slice(m.offset, m.endOffset));
  assert.ok(m.text.length <= 1000);
});
test("eight matching sources remain represented under the global excerpt budget", () => {
  const ds = Array.from({ length: 8 }, (_, i) =>
    doc("d" + i, ("预算" + i + "x".repeat(997)).repeat(30)),
  );
  const out = searchKnowledge(ds, "预算");
  assert.equal(new Set(out.matches.map((m) => m.source.id)).size, 8);
  assert.ok(out.matches.reduce((n, m) => n + m.text.length, 0) <= 8000);
  assert.ok(out.resultLimited);
});
test("no hit is an explicit empty result, not fabricated evidence; invalid and oversized inputs reject", () => {
  assert.deepEqual(searchKnowledge([doc("a", "正常文档")], "zzzz").matches, []);
  for (const q of [null, "", "  ", "?!", "x".repeat(201)])
    assert.throws(() => knowledgeQuery(q));
  assert.throws(() => searchKnowledge([doc("a", "x".repeat(100001))], "x"));
  assert.throws(() => searchKnowledge([doc("a", "x"), doc("a", "x")], "x"));
  assert.throws(() => searchKnowledge([], "x"));
  assert.throws(() =>
    searchKnowledge([doc("a", "x")], "x", AbortSignal.abort()),
  );
});
test("cross-document search uses each real document permission, returns bounded sources and hides bodies in audit", async () =>
  fixture(async (f) => {
    const s = await createAgentSession(f.options);
    const schema = s.definitions.find(
      (t) => t.function.name === "knowledge_search",
    ).function.parameters;
    assert.deepEqual(schema.required, ["query"]);
    const out = await s.execute("knowledge_search", {
      query: "采购预算和供应商资质",
    });
    assert.deepEqual(f.reads, [f.a.id, f.b.id]);
    assert.equal(out.sources.length, 2);
    assert.equal(out.matches.length, 2);
    assert.equal(out.source, undefined);
    for (const m of out.matches) assert.equal(m.source.revision, 1);
    assert.ok(!JSON.stringify(f.store.data.executions).includes("10000"));
    assert.ok(JSON.stringify(out).length < 30000);
    await s.close();
  }));
test("a denial after one approved document returns no partial excerpts", async () =>
  fixture(async (f) => {
    let n = 0;
    const s = await createAgentSession({
      ...f.options,
      executeTool: async (...args) => {
        if (++n === 2) f.deny();
        return f.runtime.execute(...args);
      },
    });
    const out = await s.execute("knowledge_search", { query: "预算 资质" });
    assert.equal(out.status, "denied");
    assert.equal(out.matches, undefined);
    assert.ok(!JSON.stringify(out).includes("10000"));
  }));
test("changing an earlier source during a later read invalidates the whole result", async () =>
  fixture(async (f) => {
    let n = 0;
    const s = await createAgentSession({
      ...f.options,
      executeTool: async (...args) => {
        const out = await f.runtime.execute(...args);
        if (++n === 2)
          f.store.data.documents.find((d) => d.id === f.a.id).revision++;
        return out;
      },
    });
    await assert.rejects(
      s.execute("knowledge_search", { query: "预算 资质" }),
      /文档已变化/,
    );
  }));
test("missing and unbound documents reject before any read; single-source envelope stays compatible", async () =>
  fixture(async (f) => {
    const s = await createAgentSession(f.options);
    await assert.rejects(
      s.execute("knowledge_search", { documentId: "unbound", query: "预算" }),
      /范围/,
    );
    assert.equal(f.reads.length, 0);
    const out = await s.execute("knowledge_search", {
      documentId: f.a.id,
      query: "预算",
    });
    assert.equal(out.source.id, f.a.id);
    assert.deepEqual(f.reads, [f.a.id]);
    f.store.data.documents = f.store.data.documents.filter(
      (d) => d.id !== f.b.id,
    );
    await assert.rejects(
      s.execute("knowledge_search", { query: "预算" }),
      /移除/,
    );
    assert.deepEqual(f.reads, [f.a.id]);
  }));
test("cancellation, agent revocation, forged read receipts and read failures never release excerpts", async () => {
  for (const mode of ["cancel", "revoke", "forged", "failed"])
    await fixture(async (f) => {
      const abort = new AbortController();
      const s = await createAgentSession({
        ...f.options,
        signal: abort.signal,
        executeTool: async (...args) => {
          const out = await f.runtime.execute(...args);
          if (mode === "cancel") abort.abort();
          if (mode === "revoke") f.agent.knowledge = [];
          if (mode === "forged") out.document.sha256 = "0".repeat(64);
          if (mode === "failed")
            return { status: "failed", document: out.document };
          return out;
        },
      });
      if (mode === "failed") {
        const out = await s.execute("knowledge_search", { query: "预算" });
        assert.equal(out.status, "failed");
        assert.equal(out.matches, undefined);
      } else
        await assert.rejects(
          s.execute("knowledge_search", { query: "预算" }, abort.signal),
        );
    });
});

test("real HTTP model → multi-document Chinese retrieval → MCP quote → source-backed acceptance", async () => {
  const f = await httpStoreFixture(),
    wire = [],
    modelRequests = [],
    approvals = [];
  let closed = false;
  const h = await httpFixture(async (req, res) => {
    if (req.method === "DELETE") {
      closed = true;
      res.writeHead(204).end();
      return;
    }
    let body = "";
    for await (const c of req) body += c;
    const p = JSON.parse(body);
    if (req.url === "/chat/completions") {
      modelRequests.push(p);
      const n = modelRequests.length,
        call = (name, args) => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call" + n,
                    type: "function",
                    function: { name, arguments: JSON.stringify(args) },
                  },
                ],
              },
            },
          ],
        });
      res.setHeader("Content-Type", "application/json");
      if (n === 1)
        res.end(JSON.stringify(call("skill_read", { name: skill.name })));
      else if (n === 2)
        res.end(
          JSON.stringify(
            call("knowledge_search", { query: "采购预算和供应商资质" }),
          ),
        );
      else if (n === 3)
        res.end(
          JSON.stringify(call("mcp_0_quote", { supplier: "合成供应商" })),
        );
      else
        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "夹具验收：报价8000元，低于来源文档预算10000元。",
                },
              },
            ],
          }),
        );
      return;
    }
    wire.push({ method: p.method, session: req.headers["mcp-session-id"], p });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Mcp-Session-Id", "synthetic-session");
    if (p.method === "notifications/initialized") {
      res.writeHead(202).end();
      return;
    }
    let result =
      p.method === "initialize"
        ? {
            protocolVersion: "2025-06-18",
            capabilities: { tools: {} },
            serverInfo: { name: "fixture", version: "1" },
          }
        : p.method === "tools/list"
          ? {
              tools: [
                {
                  name: "quote",
                  description: "返回真实HTTP夹具报价",
                  inputSchema: {
                    type: "object",
                    properties: { supplier: { type: "string" } },
                    required: ["supplier"],
                    additionalProperties: false,
                  },
                },
              ],
            }
          : { content: [{ type: "text", text: "报价8000元" }] };
    if (p.method === "tools/call") {
      res.setHeader("Content-Type", "text/event-stream");
      res.end(
        "event: message\ndata: " +
          JSON.stringify({ jsonrpc: "2.0", id: p.id, result }) +
          "\n\n",
      );
    } else res.end(JSON.stringify({ jsonrpc: "2.0", id: p.id, result }));
  });
  try {
    const runtime = new ToolRuntime({
        store: f.store,
        browser: {},
        approve: async (t, d) => {
          approvals.push(t);
          return true;
        },
      }),
      { document: d } = await runtime.documents.importFile(
        "采购规则",
        "md",
        Buffer.from("采购预算：10000元"),
      );
    f.docId = d.id;
    const { document: vendor } = await runtime.documents.importFile(
      "合成合规政策",
      "md",
      Buffer.from("供应商资质：ISO9001"),
    );
    const agent = {
      id: "a",
      name: "采购",
      prompt: "帮助用户采购",
      tools: [],
      skills: [skill],
      knowledge: [d.id, vendor.id],
      mcp: [{ name: "报价", url: h.url + "/mcp" }],
    };
    f.store.data.agents.push(agent);
    f.store.data.settings = { baseUrl: h.url, model: "http-fixture" };
    const service = createConversationService({
      store: f.store,
      active: new Map(),
      key: () => "",
      view: () => f.store.data,
      executeTool: (...args) => runtime.execute(...args),
      approve: async (t) => {
        approvals.push(t);
        return true;
      },
    });
    await service.run({
      id: "chat",
      requestId: "run",
      agentId: "a",
      prompt: "核对报价",
      toolsEnabled: true,
    });
    assert.equal(modelRequests.length, 4);
    assert.deepEqual(
      modelRequests[0].tools.map((t) => t.function.name),
      ["skill_read", "knowledge_search", "mcp_0_quote"],
    );
    assert.ok(!JSON.stringify(modelRequests[0]).includes(skill.instructions));
    assert.ok(JSON.stringify(modelRequests[1]).includes(skill.instructions));
    assert.ok(JSON.stringify(modelRequests[2]).includes("10000"));
    assert.ok(JSON.stringify(modelRequests[3]).includes("8000"));
    assert.equal(wire.filter((r) => r.method === "tools/call").length, 1);
    assert.equal(wire[1].session, "synthetic-session");
    assert.equal(closed, true);
    assert.equal(approvals.length, 4);
    const observed = JSON.parse(modelRequests[2].messages.at(-1).content);
    assert.equal(observed.sources.length, 2);
    assert.equal(new Set(observed.matches.map((m) => m.source.id)).size, 2);
    assert.ok(
      observed.matches.every(
        (m) => m.source.sha256.length === 64 && m.line >= 1,
      ),
    );
    assert.ok(JSON.stringify(modelRequests[2]).includes("ISO9001"));
    assert.equal(f.store.data.chats[0].toolEvents.length, 3);
    const evidence = f.store.data.chats[0].knowledgeEvidence;
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].runId, 'run');
    assert.equal(evidence[0].matches.length, 2);
    const reloaded = new Store(f.dir); await reloaded.load();
    assert.deepEqual(reloaded.data.chats[0].knowledgeEvidence, evidence);
    assert.match(f.store.data.chats[0].messages.at(-1).content, /低于/);
    assert.ok(!JSON.stringify(f.store.data.executions).includes("合成供应商"));
    assert.ok(!JSON.stringify(f.store.data.executions).includes("10000"));
  } finally {
    await h.close();
    await f.close();
  }
});

async function httpStoreFixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-rag-http-")),
    store = new Store(dir);
  await store.load();
  return { store, dir, close: () => rm(dir, { recursive: true, force: true }) };
}
async function httpFixture(handler) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    server,
    url: "http://127.0.0.1:" + server.address().port,
    close: () => {
      server.closeAllConnections();
      return new Promise((r) => server.close(r));
    },
  };
}
const skill = {
  name: "采购评估",
  description: "核对报价",
  instructions: "检索预算及资质后再调用报价工具并验收。",
};

test("JSON escaping cannot make the model observation exceed its complete-result budget", () => {
  const ds = Array.from({ length: 8 }, (_, i) =>
    doc("controls" + i, "预算" + "\u0001".repeat(990)),
  );
  const out = searchKnowledge(ds, "预算");
  assert.ok(JSON.stringify(out).length <= 30000);
  assert.ok(out.resultLimited);
  assert.equal(out.sources.length, 8);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
  for (const m of out.matches)
    assert.equal(
      m.text,
      ds.find((d) => d.id === m.source.id).text.slice(m.offset, m.endOffset),
    );
});
