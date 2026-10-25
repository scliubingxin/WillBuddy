import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fixtureSecrets } from "./helpers/mcp-secrets.mjs";
import { Store } from "../core.mjs";
import { McpClient } from "../runtime/mcp.mjs";
import { createCapabilityLibrary } from "../services/capability-library.mjs";
import {
  bearerToken,
  mcpViews,
  createMcpClientFactory,
} from "../services/mcp-access.mjs";
import { createMcpSecretCodec } from "../main/mcp-secrets.mjs";
import { createAgentSession } from "../services/agent-session.mjs";
import { mcpAuthFields } from "../src/ui/capability-library.js";
const TOKEN = "synthetic-bearer-token-123456789";
async function fixture(work) {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-mcp-auth-")),
    store = new Store(dir);
  await store.load();
  const s = fixtureSecrets(),
    library = createCapabilityLibrary({
      store,
      secrets: s.codec,
      approve: async () => true,
    });
  try {
    await work({ store, dir, library, ...s });
  } finally {
    library.close();
    await rm(dir, { recursive: true, force: true });
  }
}
const config = (url = "https://example.com/mcp") => ({
  name: "认证连接",
  url,
  enabled: true,
  auth: "bearer",
  token: TOKEN,
});
const json = (id, result) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "content-type": "application/json" },
  });
test("bearer syntax blocks header injection, prefixes, whitespace, short and oversized values", () => {
  for (const t of [
    "",
    null,
    "abc",
    "Bearer " + TOKEN,
    TOKEN + "\r\nx: y",
    "x".repeat(4097),
    "汉字".repeat(8),
  ])
    assert.throws(() => bearerToken(t));
  assert.equal(bearerToken(TOKEN), TOKEN);
});
test("OS adapter refuses unavailable/basic_text and hides decrypt errors, with no plaintext fallback", () => {
  for (const backend of ["basic_text", "unavailable"]) {
    let used = 0;
    const codec = createMcpSecretCodec({
      isEncryptionAvailable: () => backend !== "unavailable",
      getSelectedStorageBackend: () => backend,
      encryptString: () => used++,
    });
    assert.throws(() => codec.seal(TOKEN), /安全存储/);
    assert.throws(() => codec.open("x"), /安全存储/);
    assert.equal(used, 0);
  }
  const codec = createMcpSecretCodec({
    isEncryptionAvailable: () => true,
    decryptString: () => {
      throw Error(TOKEN);
    },
  });
  assert.throws(
    () => codec.open("x"),
    (e) => !e.message.includes(TOKEN) && /无法解密/.test(e.message),
  );
});
test("persistent config encrypts token before save; state is metadata only and listing does not decrypt", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    assert.equal(f.opens(), 0);
    assert.ok(f.store.data.mcpConnections[0].encryptedToken);
    assert.ok(!(await readFile(f.store.file, "utf8")).includes(TOKEN));
    const state = mcpViews(f.store.data);
    assert.equal(state[0].hasToken, true);
    assert.equal(state[0].auth, "bearer");
    assert.equal(state[0].encryptedToken, undefined);
    assert.ok(!JSON.stringify(state).includes(TOKEN));
    const loaded = new Store(f.dir);
    await loaded.load();
    assert.equal(loaded.data.mcpConnections[0].id, id);
  }));
test("leave blank preserves only same-address bearer; changed address requires reentry; none clears; test result invalidates", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    const old = f.store.data.mcpConnections[0].encryptedToken;
    await f.library.connection({ ...config(), id, token: "" });
    assert.equal(f.store.data.mcpConnections[0].encryptedToken, old);
    assert.equal(f.opens(), 0);
    await assert.rejects(
      f.library.connection({
        ...config("https://example.com/new"),
        id,
        token: "",
      }),
      /填写新的/,
    );
    assert.equal(f.store.data.mcpConnections[0].url, "https://example.com/mcp");
    f.store.data.mcpConnections[0].lastTest = {
      status: "succeeded",
      tools: [],
    };
    await f.library.connection({ ...config(), id, auth: "none", token: "" });
    assert.equal(f.store.data.mcpConnections[0].encryptedToken, undefined);
    assert.equal(f.store.data.mcpConnections[0].lastTest, undefined);
    await assert.rejects(
      f.library.connection({ ...config(), id, token: "" }),
      /填写新的/,
    );
  }));
test("failed encryption or disk save rolls config back and never silently downgrades to anonymous", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    const before = structuredClone(f.store.data.mcpConnections);
    const save = f.store.save;
    f.store.save = async () => {
      throw Error("disk full");
    };
    await assert.rejects(
      f.library.connection({
        ...config(),
        id,
        token: "synthetic-rotation-token",
      }),
      /disk full/,
    );
    assert.deepEqual(f.store.data.mcpConnections, before);
    f.store.save = save;
    const unavailable = createCapabilityLibrary({ store: f.store });
    await assert.rejects(
      unavailable.connection({ ...config(), id }),
      /安全存储/,
    );
    const factory = createMcpClientFactory({ store: f.store });
    assert.throws(
      () => factory(before[0].url, { id, revision: before[0].revision }),
      /凭据不可用/,
    );
  }));
test("denied probe/discovery cannot decrypt or contact the endpoint", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    let calls = 0;
    const library = createCapabilityLibrary({
      store: f.store,
      secrets: f.codec,
      approve: async () => false,
      clientFactory: () => {
        calls++;
        throw Error();
      },
    });
    await assert.rejects(library.probe(id), /拒绝/);
    assert.equal(calls, 0);
    assert.equal(f.opens(), 0);
    const agent = {
      id: "auth-agent",
      name: "a",
      prompt: "p",
      tools: [],
      mcpIds: [id],
    };
    f.store.data.agents.push(agent);
    await assert.rejects(
      createAgentSession({
        agent,
        store: f.store,
        secrets: f.codec,
        approve: async () => false,
        executeTool: () => {
          throw Error();
        },
      }),
      /拒绝/,
    );
    assert.equal(f.opens(), 0);
    assert.ok(!JSON.stringify(f.store.data.executions).includes(TOKEN));
  }));
test("HTTP401/403 do not read/echo response body, refresh token, or retry", async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    const c = new McpClient("https://example.com/mcp", {
      token: TOKEN,
      fetcher: async () => {
        calls++;
        return new Response(TOKEN, { status });
      },
    });
    await assert.rejects(
      c.discover(),
      (e) => e.message.includes(String(status)) && !e.message.includes(TOKEN),
    );
    assert.equal(calls, 1);
    await c.close();
    assert.equal(calls, 1);
  }
});
test("literal token echoed in tools and parse/transport errors is not released", async () => {
  const c = new McpClient("https://example.com/mcp", {
    token: TOKEN,
    fetcher: async (u, p) => {
      const { id } = JSON.parse(p.body);
      return json(id, { content: [{ type: "text", text: TOKEN }] });
    },
  });
  const out = await c.call("quote", {});
  assert.ok(!JSON.stringify(out).includes(TOKEN));
  assert.match(JSON.stringify(out), /凭据已隐藏/);
  for (const fetcher of [
    async () => new Response("{invalid " + TOKEN),
    async () => {
      throw Error("Authorization: Bearer " + TOKEN);
    },
  ]) {
    const bad = new McpClient("https://example.com/mcp", {
      token: TOKEN,
      fetcher,
    });
    await assert.rejects(bad.call("x", {}), (e) => !e.message.includes(TOKEN));
  }
});
test("changed credentials invalidate subsequent request and DELETE cleanup", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    let calls = 0;
    const factory = createMcpClientFactory({
      store: f.store,
      secrets: f.codec,
      fetcher: async (u, p) => {
        calls++;
        return json(JSON.parse(p.body).id, {});
      },
    });
    const c = factory(config().url, { id, revision: 1 });
    assert.equal(f.opens(), 1);
    await c.call("x", {});
    assert.equal(calls, 1);
    c.session = "fixture";
    await f.library.connection({
      ...config(),
      id,
      token: "synthetic-new-token-123",
    });
    await assert.rejects(c.call("x", {}), /变更/);
    await c.close();
    assert.equal(calls, 1);
    await assert.rejects(c.call("x", {}), /已关闭/);
  }));
test("configuration drift while HTTP is in flight withholds returned tool data", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    let release, started;
    const ready = new Promise((r) => (started = r)),
      wait = new Promise((r) => (release = r));
    const c = createMcpClientFactory({
      store: f.store,
      secrets: f.codec,
      fetcher: async (u, p) => {
        started();
        await wait;
        return json(JSON.parse(p.body).id, {
          content: [{ text: "private quote" }],
        });
      },
    })(config().url, { id, revision: 1 });
    const request = c.call("quote", {});
    await ready;
    f.store.data.mcpConnections[0].enabled = false;
    release();
    await assert.rejects(request, /变更/);
    await c.close();
  }));
test("real HTTP bearer initializes/lists/calls/deletes on exact endpoint; bodies/audit/state stay credential-free", async () =>
  fixture(async (f) => {
    const wire = [];
    const server = createServer(async (req, res) => {
      wire.push({
        url: req.url,
        method: req.method,
        authorization: req.headers.authorization,
      });
      assert.equal(req.headers.authorization, "Bearer " + TOKEN);
      if (req.method === "DELETE") {
        res.writeHead(204).end();
        return;
      }
      let text = "";
      for await (const c of req) text += c;
      assert.ok(!text.includes(TOKEN));
      const p = JSON.parse(text);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Mcp-Session-Id", "synthetic-session");
      if (p.method === "notifications/initialized") {
        res.writeHead(202).end();
        return;
      }
      const result =
        p.method === "initialize"
          ? { protocolVersion: "2025-06-18" }
          : p.method === "tools/list"
            ? {
                tools: [
                  {
                    name: "quote",
                    description: "quote " + TOKEN,
                    inputSchema: { type: "object", properties: {} },
                  },
                ],
              }
            : { content: [{ type: "text", text: "8000 " + TOKEN }] };
      if (p.method === "tools/call") {
        res.setHeader("Content-Type", "text/event-stream");
        res.end(
          "event: message\ndata: " +
            JSON.stringify({ jsonrpc: "2.0", id: p.id, result }) +
            "\n\n",
        );
      } else res.end(JSON.stringify({ jsonrpc: "2.0", id: p.id, result }));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const url = "http://127.0.0.1:" + server.address().port + "/exact-mcp";
      const { id } = await f.library.connection(config(url));
      const agent = {
        id: "agent",
        name: "a",
        prompt: "p",
        tools: [],
        mcpIds: [id],
      };
      f.store.data.agents.push(agent);
      const session = await createAgentSession({
        agent,
        store: f.store,
        secrets: f.codec,
        approve: async () => true,
        executeTool: () => {
          throw Error();
        },
      });
      const result = await session.execute("mcp_0_quote", {});
      assert.match(JSON.stringify(result), /8000/);
      assert.ok(!JSON.stringify(result).includes(TOKEN));
      assert.ok(!JSON.stringify(session.definitions).includes(TOKEN));
      await session.close();
      assert.equal(wire.length, 5);
      assert.ok(wire.every((w) => w.url === "/exact-mcp"));
      assert.equal(wire.at(-1).method, "DELETE");
      assert.ok(!JSON.stringify(f.store.data.executions).includes(TOKEN));
      assert.ok(!JSON.stringify(mcpViews(f.store.data)).includes(TOKEN));
      assert.ok(!(await readFile(f.store.file, "utf8")).includes(TOKEN));
    } finally {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
  }));
test("password configuration fields never prefill a saved plaintext/ciphertext token", () => {
  const html = mcpAuthFields({
    auth: "bearer",
    hasToken: true,
    encryptedToken: TOKEN,
  });
  assert.match(html, /type="password"/);
  assert.ok(!html.includes(TOKEN));
  assert.match(html, /已保存/);
});

test("real HTTP redirect never forwards the bearer to a second endpoint", async () => {
  let first = 0,
    second = 0;
  const server = createServer((req, res) => {
    if (req.url === "/start") {
      first++;
      res.writeHead(302, { Location: "/stolen" }).end();
    } else {
      second++;
      res.end("unexpected");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const c = new McpClient(
      "http://127.0.0.1:" + server.address().port + "/start",
      { token: TOKEN },
    );
    await assert.rejects(c.call("x", {}));
    assert.equal(first, 1);
    assert.equal(second, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("changing credentials while approval is open prevents both decryption and first network request", async () =>
  fixture(async (f) => {
    const { id } = await f.library.connection(config());
    let calls = 0;
    const library = createCapabilityLibrary({
      store: f.store,
      secrets: f.codec,
      approve: async () => {
        await f.library.connection({
          ...config(),
          id,
          token: "synthetic-new-approved-token",
        });
        return true;
      },
      clientFactory: () => {
        calls++;
        throw Error("unexpected");
      },
    });
    await assert.rejects(library.probe(id));
    assert.equal(calls, 0);
    assert.equal(f.opens(), 0);
  }));

test("credential client endpoint cannot be retargeted after construction", async () => {
  let target;
  const c = new McpClient("https://example.com/only", {
    token: TOKEN,
    fetcher: async (url, p) => {
      target = url;
      return json(JSON.parse(p.body).id, {});
    },
  });
  assert.throws(() => {
    c.url = "https://other.example/steal";
  });
  await c.call("x", {});
  assert.equal(target, "https://example.com/only");
  await c.close();
});
