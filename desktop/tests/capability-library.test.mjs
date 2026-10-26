import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { Store } from "../core.mjs";
import office from "../runtime/vendor/office.cjs";
import { parseSkillPackage, skillResource } from "../runtime/skill-package.mjs";
import {
  createCapabilityLibrary,
  resolveCapabilities,
  skillViews,
} from "../services/capability-library.mjs";
import { createWorkspaceService } from "../services/workspace.mjs";
import { createSkillImporter } from "../main/skill-files.mjs";
import { createAgentSession } from "../services/agent-session.mjs";
import { createConversationService } from "../services/conversation.mjs";
const skill =
    "---\nname: purchase-review\ndescription: >\n  核对预算，读取参考资料\n  然后检查报价。\nmetadata:\n  author: fixture\nallowed-tools: cli_execute\n---\n先读取 references/rules.md，再检查报价。",
  buf = (s) => Buffer.from(s),
  zip = (files) =>
    Buffer.from(
      office.zip.zipSync(
        Object.fromEntries(
          Object.entries(files).map(([n, b]) => [
            n,
            typeof b === "string" ? buf(b) : b,
          ]),
        ),
      ),
    );
async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-cap-")),
    store = new Store(dir);
  await store.load();
  const library = createCapabilityLibrary({ store });
  return {
    dir,
    store,
    library,
    close: () => rm(dir, { recursive: true, force: true }),
  };
}
test("imports actual MD and ZIP with frontmatter, resources and opaque binary assets without executing scripts", () => {
  const md = parseSkillPackage("custom.md", buf(skill));
  assert.equal(md.name, "purchase-review");
  assert.match(md.description, /然后/);
  const p = parseSkillPackage(
    "skill.zip",
    zip({
      "purchase-review/SKILL.md": skill,
      "purchase-review/references/rules.md": "预算10000",
      "purchase-review/scripts/run.sh": "touch /tmp/never-executed",
      "purchase-review/assets/template.bin": Buffer.from([0, 255]),
    }),
  );
  assert.equal(p.files.length, 4);
  assert.equal(skillResource(p, "references/rules.md").text, "预算10000");
  assert.throws(() => skillResource(p, "assets/template.bin"));
  assert.throws(() => skillResource(p, "../outside"));
  assert.throws(() => skillResource(p, "missing"));
  p.files[1].base64 = buf("changed").toString("base64");
  assert.throws(() => skillResource(p, p.files[1].path), /完整性/);
});
test("rejects traversal, case duplicates, extra roots, missing entry, huge expansion and malformed metadata before import", () => {
  const bad = [
    zip({ "../SKILL.md": skill }),
    zip({ "SKILL.md": skill, "skill.md": skill }),
    zip({ "a/SKILL.md": skill, "outside.md": "x" }),
    zip({ "readme.md": "no" }),
    zip({ "SKILL.md": skill, "large.txt": Buffer.alloc(4194305) }),
    buf("---\nname: x\n---\nbody"),
  ];
  for (const [i, b] of bad.entries())
    assert.throws(() =>
      parseSkillPackage(i === bad.length - 1 ? "SKILL.md" : "skill.zip", b),
    );
  assert.throws(() => parseSkillPackage("x.exe", buf(skill)));
  assert.throws(() =>
    parseSkillPackage("x.md", buf(skill + "x".repeat(12000))),
  );
});
test("symlink ZIP and CRC corruption are rejected", () => {
  const b = zip({ "SKILL.md": skill });
  const central = b.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  const link = Buffer.from(b);
  link.writeUInt32LE((0xa1ff << 16) >>> 0, central + 38);
  assert.throws(() => parseSkillPackage("x.zip", link), /符号链接/);
  const corrupt = Buffer.from(b);
  corrupt[central + 16] ^= 1;
  assert.throws(() => parseSkillPackage("x.zip", corrupt), /CRC/);
});
test("library metadata omits bodies, imports persist, duplicate/failed writes roll back", async () => {
  const f = await setup();
  try {
    const { id } = await f.library.importSkill("x.md", buf(skill));
    assert.equal(skillViews(f.store.data)[0].instructions, undefined);
    assert.ok(!JSON.stringify(skillViews(f.store.data)).includes("先读取"));
    const reload = new Store(f.dir);
    await reload.load();
    assert.equal(
      createCapabilityLibrary({ store: reload }).readSkill(id).text,
      skill,
    );
    await assert.rejects(f.library.importSkill("x.md", buf(skill)), /已导入/);
    const previous = JSON.stringify(f.store.data.skillPackages);
    f.store.save = async () => {
      throw Error("disk");
    };
    await assert.rejects(f.library.skill({ id, enabled: false }), /disk/);
    assert.equal(JSON.stringify(f.store.data.skillPackages), previous);
  } finally {
    await f.close();
  }
});
test("agent binds registry IDs, rejects missing/disabled/duplicate capabilities and protects referenced deletion", async () => {
  const f = await setup();
  try {
    const { id } = await f.library.importSkill("x.md", buf(skill));
    const { id: mcpId } = await f.library.connection({
      name: "local",
      url: "http://localhost:3000/mcp",
      enabled: true,
    });
    const ws = createWorkspaceService({
      store: f.store,
      active: new Map(),
      view: () => f.store.data,
    });
    await ws.agent({
      name: "buyer",
      prompt: "p",
      tools: [],
      skillIds: [id],
      mcpIds: [mcpId],
    });
    const a = f.store.data.agents.at(-1);
    assert.equal(a.skills.length, 0);
    assert.equal(
      resolveCapabilities(f.store.data, a).profile.skills[0].name,
      "purchase-review",
    );
    await assert.rejects(f.library.skill({ id, remove: true }), /解除绑定/);
    await assert.rejects(
      f.library.connection({ id: mcpId, remove: true }),
      /解除绑定/,
    );
    await f.library.skill({ id, enabled: false });
    await assert.rejects(ws.agent({ ...a }), /停用/);
    assert.throws(() => resolveCapabilities(f.store.data, a));
    await assert.rejects(
      ws.agent({ name: "x", prompt: "p", skillIds: ["missing"] }),
    );
  } finally {
    await f.close();
  }
});
test("bound skills load resources only on demand, cannot read another package, disable invalidates active session", async () => {
  const f = await setup();
  try {
    const { id } = await f.library.importSkill(
      "x.zip",
      zip({ "SKILL.md": skill, "references/rules.md": "预算10000" }),
    );
    const a = { id: "a", prompt: "p", tools: [], skillIds: [id] };
    f.store.data.agents.push(a);
    const session = await createAgentSession({ agent: a, store: f.store });
    assert.ok(!session.context.includes("预算10000"));
    const loaded = await session.execute("skill_read", {
      name: "purchase-review",
    });
    assert.equal(loaded.resources.length, 2);
    const result = await session.execute("skill_resource", {
      name: "purchase-review",
      path: "references/rules.md",
    });
    assert.equal(result.resource.text, "预算10000");
    await assert.rejects(
      session.execute("skill_resource", { name: "other", path: "SKILL.md" }),
    );
    assert.ok(!JSON.stringify(f.store.data.executions).includes("预算10000"));
    await f.library.skill({ id, enabled: false });
    assert.throws(session.check);
    await session.close();
  } finally {
    await f.close();
  }
});
test("native Skill picker ignores renderer paths; cancel, missing parent and symlink fail safely", async () => {
  const f = await setup();
  try {
    let calls = 0;
    const window = { isDestroyed: () => false };
    const cancelled = createSkillImporter({
      dialog: { showOpenDialog: async () => ({ canceled: true }) },
      getWindow: () => window,
      library: { importSkill: () => calls++ },
    });
    assert.equal(await cancelled("/etc/passwd"), null);
    await assert.rejects(
      createSkillImporter({
        dialog: {},
        getWindow: () => null,
        library: f.library,
      })(),
    );
    await writeFile(path.join(f.dir, "SKILL.md"), skill);
    await symlink("SKILL.md", path.join(f.dir, "link.md"));
    const importer = createSkillImporter({
      dialog: {
        showOpenDialog: async () => ({
          filePaths: [path.join(f.dir, "link.md")],
        }),
      },
      getWindow: () => window,
      library: { importSkill: () => calls++ },
    });
    await assert.rejects(importer());
    assert.equal(calls, 0);
  } finally {
    await f.close();
  }
});
test("MCP save does not connect; probe approval/actual discovery/cancel/edited-target checks and rollback", async () => {
  const f = await setup();
  try {
    let calls = 0,
      closed = 0;
    const library = createCapabilityLibrary({
      store: f.store,
      approve: async () => true,
      clientFactory: () => ({
        discover: async () => {
          calls++;
          return [{ name: "echo", description: "fixture" }];
        },
        close: async () => closed++,
      }),
    });
    const { id } = await library.connection({
      name: "local",
      url: "http://localhost:3000/mcp",
      enabled: true,
    });
    assert.equal(calls, 0);
    assert.equal((await library.probe(id)).count, 1);
    assert.equal(closed, 1);
    assert.equal(f.store.data.mcpConnections[0].lastTest.status, "succeeded");
    const a = { id: "a", prompt: "p", tools: [], mcpIds: [id] };
    f.store.data.agents.push(a);
    const s = await createAgentSession({
      agent: a,
      store: f.store,
      approve: async () => true,
      clientFactory: () => ({
        discover: async () => [],
        close: async () => {},
      }),
    });
    await library.connection({
      id,
      name: "changed",
      url: "http://localhost:3000/mcp",
      enabled: true,
    });
    assert.throws(s.check, /变更/);
    await s.close();
    const denied = createCapabilityLibrary({
      store: f.store,
      approve: async () => false,
      clientFactory: () => {
        throw Error("must not connect");
      },
    });
    await assert.rejects(denied.probe(id), /拒绝/);
    assert.equal(calls, 1);
    f.store.save = async () => {
      throw Error("disk");
    };
    await assert.rejects(
      library.connection({
        id,
        name: "bad",
        url: "http://localhost:3001/mcp",
        enabled: true,
      }),
      /disk/,
    );
    assert.equal(f.store.data.mcpConnections[0].name, "changed");
  } finally {
    await f.close();
  }
});
test("actual HTTP model uses uploaded Skill + resource and shared MCP ID in ReAct loop", async () => {
  const f = await setup();
  let modelCount = 0,
    toolCalls = 0;
  const requests = [],
    server = createServer(async (req, res) => {
      if (req.method === "DELETE") {
        res.writeHead(204).end();
        return;
      }
      let body = "";
      for await (const c of req) body += c;
      const p = JSON.parse(body);
      res.setHeader("content-type", "application/json");
      if (req.url === "/chat/completions") {
        requests.push(p);
        modelCount++;
        const actions = [
            ["skill_read", { name: "purchase-review" }],
            [
              "skill_resource",
              { name: "purchase-review", path: "references/rules.md" },
            ],
            ["mcp_0_quote", {}],
          ],
          a = actions[modelCount - 1];
        res.end(
          JSON.stringify({
            choices: [
              {
                message: a
                  ? {
                      role: "assistant",
                      tool_calls: [
                        {
                          id: "c" + modelCount,
                          type: "function",
                          function: {
                            name: a[0],
                            arguments: JSON.stringify(a[1]),
                          },
                        },
                      ],
                    }
                  : {
                      role: "assistant",
                      content: "夹具验收：报价8000，预算10000。",
                    },
              },
            ],
          }),
        );
      } else {
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
                      description: "fixture",
                      inputSchema: { type: "object", properties: {} },
                    },
                  ],
                }
              : (toolCalls++,
                { content: [{ type: "text", text: "报价8000" }] });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: p.id, result }));
      }
    });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const url = "http://127.0.0.1:" + server.address().port,
      { id } = await f.library.importSkill(
        "x.zip",
        zip({ "SKILL.md": skill, "references/rules.md": "预算10000" }),
      ),
      { id: mcp } = await f.library.connection({
        name: "fixture",
        url: url + "/mcp",
        enabled: true,
      });
    f.store.data.agents.push({
      id: "buyer",
      name: "buyer",
      prompt: "采购",
      tools: [],
      skillIds: [id],
      mcpIds: [mcp],
    });
    f.store.data.settings = { baseUrl: url, model: "fixture" };
    await createConversationService({
      store: f.store,
      active: new Map(),
      key: () => "",
      view: () => f.store.data,
      approve: async () => true,
      executeTool: () => {
        throw Error("unexpected builtin");
      },
    }).run({
      id: "chat",
      requestId: "registry-run",
      agentId: "buyer",
      prompt: "核对报价",
      toolsEnabled: true,
    });
    assert.equal(modelCount, 4);
    assert.equal(toolCalls, 1);
    assert.ok(!JSON.stringify(requests[0]).includes("预算10000"));
    assert.ok(JSON.stringify(requests[2]).includes("预算10000"));
    assert.match(f.store.data.chats[0].messages.at(-1).content, /8000/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await f.close();
  }
});
test("MCP probe cancellation aborts in-flight discovery and clears pending state", async () => {
  const f = await setup();
  try {
    let started, resolveStarted;
    started = new Promise((r) => (resolveStarted = r));
    let closed = 0;
    const library = createCapabilityLibrary({
      store: f.store,
      approve: async () => true,
      clientFactory: () => ({
        discover: (signal) =>
          new Promise((resolve, reject) => {
            resolveStarted();
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
          }),
        close: async () => closed++,
      }),
    });
    const { id } = await library.connection({
      name: "pending",
      url: "http://localhost:1234/mcp",
      enabled: true,
    });
    const pending = library.probe(id);
    await started;
    library.cancelProbe(id);
    await assert.rejects(pending);
    assert.equal(closed, 1);
    assert.equal(f.store.data.executions[0].status, "cancelled");
    assert.equal(f.store.data.mcpConnections[0].lastTest, undefined);
  } finally {
    await f.close();
  }
});
test("MCP edit during native approval prevents even initial discovery network", async () => {
  const f = await setup();
  try {
    let calls = 0,
      library;
    library = createCapabilityLibrary({
      store: f.store,
      approve: async () => {
        const c = f.store.data.mcpConnections[0];
        await library.connection({ ...c, enabled: false });
        return true;
      },
      clientFactory: () => {
        calls++;
        throw Error("network should not start");
      },
    });
    const { id } = await library.connection({
      name: "pending",
      url: "http://localhost:1234/mcp",
      enabled: true,
    });
    await assert.rejects(library.probe(id));
    assert.equal(calls, 0);
  } finally {
    await f.close();
  }
});
test('late native upload result cannot bind a Skill into a different agent editor',async()=>{const {JSDOM}=await import('jsdom'),{agentEditor,bindAgentEditor}=await import('../src/ui/agent-editor.js');const dom=new JSDOM('<dialog open id="m"></dialog>'),modal=dom.window.document.querySelector('#m');modal.innerHTML='<form><input name="prompt" value="first">'+agentEditor({},[],{})+'</form>';let finish;const pending=new Promise(r=>finish=r);bindAgentEditor(modal,{uploadSkill:()=>pending});modal.querySelector('[data-agent-upload]').click();modal.innerHTML='<form><input name="prompt" value="second">'+agentEditor({},[],{})+'</form>';finish({imported:{id:'late'},state:{skillPackages:[{id:'late',name:'late',description:'test',enabled:true,files:[]}]}});await new Promise(r=>setTimeout(r,0));assert.equal(modal.querySelector('[name=prompt]').value,'second');assert.equal(modal.querySelectorAll('[name=skillId]').length,0);dom.window.close();});
