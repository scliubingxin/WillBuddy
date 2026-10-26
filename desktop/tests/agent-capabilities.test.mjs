import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { Store } from "../core.mjs";
import { agentCapabilities, mcpUrl } from "../services/agent-profile.mjs";
import { createWorkspaceService } from "../services/workspace.mjs";
import { createAgentSession } from "../services/agent-session.mjs";
import { McpClient } from "../runtime/mcp.mjs";
import { runAgent } from "../runtime/agent.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { createConversationService } from "../services/conversation.mjs";
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-agents-")),
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
  description: "核对供应商报价",
  instructions:
    "先检索知识文档中的采购预算，再调用报价工具，最后核对是否超出预算。",
};
test("agent capabilities are bounded typed registries, not arbitrary executable or credential configuration", () => {
  assert.deepEqual(agentCapabilities({ tools: [] }).tools, []);
  for (const p of [
    { tools: ["fake"] },
    { tools: ["browser_open", "browser_open"] },
    { maxSteps: 99 },
    { skills: [skill, skill] },
    { knowledge: ["x", "x"] },
    { mcp: [{ name: "bad", url: "http://example.com/mcp" }] },
  ])
    assert.throws(() => agentCapabilities(p));
  for (const u of [
    "file:///tmp/a",
    "https://u:p@example.com",
    "https://example.com?secret=x",
    "http://192.168.1.1/mcp",
  ])
    assert.throws(() => mcpUrl(u));
  assert.equal(
    mcpUrl("http://localhost:3000/mcp"),
    "http://localhost:3000/mcp",
  );
});
test("workspace persists profile with knowledge/skill/tool/MCP and rolls back on disk failure", async () => {
  const f = await fixture();
  try {
    const ws = createWorkspaceService({
      store: f.store,
      active: new Map(),
      view: () => f.store.data,
    });
    f.store.data.documents = [{ id: "doc" }];
    await ws.agent({
      name: "采购",
      prompt: "协助采购",
      knowledge: ["doc"],
      skills: [skill],
      tools: [],
      maxSteps: 6,
      mcp: [],
    });
    const a = f.store.data.agents.at(-1);
    assert.equal(a.skills[0].instructions, skill.instructions);
    const reload = new Store(f.dir);
    await reload.load();
    assert.deepEqual(reload.data.agents.at(-1), a);
    const before = structuredClone(f.store.data.agents);
    f.store.save = async () => {
      throw Error("disk");
    };
    await assert.rejects(ws.agent({ ...a, prompt: "changed" }), /disk/);
    assert.deepEqual(f.store.data.agents, before);
    await assert.rejects(
      ws.agent({ name: "bad", prompt: "bad", knowledge: ["missing"] }),
    );
  } finally {
    await f.close();
  }
});
test("tool schemas and execution both enforce per-agent allowlist; unknown calls never reach runtime", async () => {
  let executed = 0;
  const result = await runAgent({
    messages: [],
    definitions: [],
    request: async (history) =>
      history.length
        ? { text: "已拒绝" }
        : {
            message: {
              role: "assistant",
              tool_calls: [
                { id: "t", function: { name: "cli_execute", arguments: "{}" } },
              ],
            },
          },
    execute: () => {
      executed++;
    },
  });
  assert.equal(executed, 0);
  assert.equal(result.events[0].status, "failed");
});
test("skills load on demand, body stays out of system prompt/audit; profile edits invalidate active sessions", async () => {
  const f = await fixture();
  try {
    const agent = {
      id: "a",
      name: "a",
      prompt: "p",
      skills: [skill],
      tools: [],
    };
    f.store.data.agents.push(agent);
    const s = await createAgentSession({
      agent: structuredClone(agent),
      store: f.store,
    });
    assert.ok(!s.context.includes(skill.instructions));
    assert.ok(s.context.includes("采购评估"));
    assert.equal(
      (await s.execute("skill_read", { name: skill.name })).skill.instructions,
      skill.instructions,
    );
    assert.ok(
      !JSON.stringify(f.store.data.executions).includes(skill.instructions),
    );
    f.store.data.agents.at(-1).skills = [];
    assert.throws(s.check, /配置已变更/);
    await assert.rejects(s.execute("skill_read", { name: skill.name }));
  } finally {
    await f.close();
  }
});
test("knowledge retrieval is agent-scoped, approved, source/revision anchored, and honors denial", async () => {
  const f = await fixture();
  try {
    const runtime = new ToolRuntime({
      store: f.store,
      browser: {},
      approve: async () => true,
    });
    const { document: d } = await runtime.documents.importFile(
      "采购规则",
      "md",
      Buffer.from("采购预算：10000元\n供应商需具备资质\n报价应在预算之内"),
    );
    const agent = { id: "a", prompt: "p", tools: [], knowledge: [d.id] };
    f.store.data.agents.push(agent);
    const s = await createAgentSession({
      agent,
      store: f.store,
      executeTool: (...args) => runtime.execute(...args),
    });
    await assert.rejects(
      s.execute("knowledge_search", { documentId: "other", query: "预算" }),
    );
    const out = await s.execute("knowledge_search", {
      documentId: d.id,
      query: "预算",
    });
    assert.equal(out.source.id, d.id);
    assert.equal(out.source.revision, 1);
    assert.equal(out.matches[0].line, 1);
    assert.match(out.matches[0].text, /10000/);
    runtime.approve = async () => false;
    assert.equal(
      (await s.execute("knowledge_search", { documentId: d.id, query: "预算" }))
        .status,
      "denied",
    );
    await s.close();
  } finally {
    await f.close();
  }
});
test("MCP discovery denial and disk failure cause zero network calls", async () => {
  const f = await fixture();
  try {
    const a = {
      id: "a",
      prompt: "p",
      tools: [],
      mcp: [{ name: "local", url: "http://localhost:1234/mcp" }],
    };
    f.store.data.agents.push(a);
    let clients = 0;
    const base = {
      agent: a,
      store: f.store,
      clientFactory: () => {
        clients++;
      },
    };
    await assert.rejects(
      createAgentSession({ ...base, approve: async () => false }),
      /拒绝/,
    );
    assert.equal(clients, 0);
    f.store.save = async () => {
      throw Error("disk");
    };
    await assert.rejects(
      createAgentSession({ ...base, approve: async () => true }),
      /disk/,
    );
    assert.equal(clients, 0);
  } finally {
    await f.close();
  }
});
test("MCP client rejects redirects, malformed IDs, unsupported schemas and oversized replies without retry", async () => {
  let count = 0;
  const client = new McpClient("http://localhost/mcp", {
    fetcher: async () => {
      count++;
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: 999, result: {} }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });
  await assert.rejects(client.rpc("tools/list"), /ID/);
  assert.equal(count, 1);
  const large = new McpClient("http://localhost/mcp", {
    fetcher: async () => new Response("x".repeat(1048577)),
  });
  await assert.rejects(large.rpc("tools/list"), /1MiB/);
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(client.rpc("tools/list", {}, abort.signal));
  assert.equal(count, 1);
});
test("real HTTP model → skill → approved knowledge → MCP SSE result → model acceptance, with session cleanup", async () => {
  const f = await fixture(),
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
            call("knowledge_search", { documentId: f.docId, query: "预算" }),
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
    const agent = {
      id: "a",
      name: "采购",
      prompt: "帮助用户采购",
      tools: [],
      skills: [skill],
      knowledge: [d.id],
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
    assert.ok(JSON.stringify(modelRequests[0]).includes(skill.instructions));
    assert.ok(JSON.stringify(modelRequests[1]).includes(skill.instructions));
    assert.ok(JSON.stringify(modelRequests[2]).includes("10000"));
    assert.ok(JSON.stringify(modelRequests[3]).includes("8000"));
    assert.equal(wire.filter((r) => r.method === "tools/call").length, 1);
    assert.equal(wire[1].session, "synthetic-session");
    assert.equal(closed, true);
    assert.equal(approvals.length, 3);
    assert.equal(f.store.data.chats[0].toolEvents.length, 3);
    assert.match(f.store.data.chats[0].messages.at(-1).content, /低于/);
    assert.ok(!JSON.stringify(f.store.data.executions).includes("合成供应商"));
    assert.ok(!JSON.stringify(f.store.data.executions).includes("10000"));
  } finally {
    await h.close();
    await f.close();
  }
});
test("MCP schema/cursor limits and wrong protocol versions fail closed", async () => {
  for (const kind of ["schema", "cursor", "version"]) {
    let count = 0;
    const c = new McpClient("http://localhost/mcp", {
      fetcher: async (url, options) => {
        const p = JSON.parse(options.body);
        count++;
        if (p.method === "notifications/initialized")
          return new Response(null, { status: 202 });
        let result =
          p.method === "initialize"
            ? { protocolVersion: kind === "version" ? "unknown" : "2025-06-18" }
            : {
                tools:
                  kind === "schema"
                    ? [
                        {
                          name: "x",
                          inputSchema: {
                            type: "object",
                            properties: {
                              x: { $ref: "https://elsewhere/schema" },
                            },
                          },
                        },
                      ]
                    : [],
                nextCursor: kind === "cursor" ? "same" : undefined,
              };
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: p.id, result }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    });
    await assert.rejects(c.discover());
    assert.ok(count <= 4);
  }
});
test("MCP call denial, long parameters, profile deletion and cancellation never execute a remote action", async () => {
  const f = await fixture();
  try {
    let calls = 0,
      closed = 0;
    const a = {
      id: "a",
      prompt: "p",
      tools: [],
      mcp: [{ name: "service", url: "http://localhost/mcp" }],
    };
    f.store.data.agents.push(a);
    const abort = new AbortController(),
      s = await createAgentSession({
        agent: a,
        store: f.store,
        signal: abort.signal,
        approve: async (title) => title === "连接智能体 MCP",
        clientFactory: () => ({
          discover: async () => [
            {
              name: "action",
              description: "test",
              inputSchema: { type: "object" },
            },
          ],
          call: async () => {
            calls++;
          },
          close: async () => {
            closed++;
          },
        }),
      });
    await assert.rejects(
      s.execute("mcp_0_action", { x: "x".repeat(601) }),
      /600/,
    );
    await assert.rejects(s.execute("mcp_0_action", {}), /拒绝/);
    assert.equal(calls, 0);
    abort.abort();
    await assert.rejects(s.execute("mcp_0_action", {}));
    await s.close();
    assert.equal(closed, 1);
  } finally {
    await f.close();
  }
});
test("MCP active HTTP request observes abort without implicit retry", async () => {
  let calls = 0;
  const h = await httpFixture(async (req, res) => {
    calls++;
    req.resume();
  });
  try {
    const c = new McpClient(h.url + "/mcp"),
      abort = new AbortController();
    const pending = c.rpc("tools/list", {}, abort.signal);
    while (!calls) await new Promise((r) => setTimeout(r, 5));
    abort.abort();
    await assert.rejects(pending);
    assert.equal(calls, 1);
  } finally {
    await h.close();
  }
});
