import { sharedKnowledgeIndex } from "../../services/knowledge-index.mjs";
import { fixtureSecrets } from "../helpers/mcp-secrets.mjs";
import { mcpViews } from "../../services/mcp-access.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ToolRuntime } from "../../runtime/tools.mjs";
import { Store } from "../../core.mjs";
import office from "../../runtime/vendor/office.cjs";
import {
  createCapabilityLibrary,
  skillViews,
} from "../../services/capability-library.mjs";
import { createWorkspaceService } from "../../services/workspace.mjs";
import { createConversationService } from "../../services/conversation.mjs";
test(
  "production UI uploads real Skill ZIP, configures/tests MCP, binds registries and runs actual HTTP ReAct",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "wb-cap-ui-")),
      store = new Store(dir);
    await store.load();
    const root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      ),
      source =
        "---\nname: procurement-check\ndescription: 核对采购预算\n---\n先读取references/rules.md，再查询MCP报价。",
      bytes = Buffer.from(
        office.zip.zipSync({
          "procurement-check/SKILL.md": Buffer.from(source),
          "procurement-check/references/rules.md": Buffer.from("预算10000元"),
        }),
      );
    const token = "synthetic-ui-bearer-123456789",
      secrets = fixtureSecrets().codec,
      wire = [];
    const view = () => {
        const { knowledgeIndexes, ...publicData } = store.data;
        return structuredClone({
          ...publicData,
          mcpConnections: mcpViews(store.data),
          skillPackages: skillViews(store.data),
        });
      },
      approvals = [],
      library = createCapabilityLibrary({
        store,
        secrets,
        approve: async (t) => {
          approvals.push(t);
          return true;
        },
      }),
      workspace = createWorkspaceService({ store, active: new Map(), view });
    const runtime = new ToolRuntime({
      store,
      browser: {},
      approve: async (t) => {
        approvals.push(t);
        return true;
      },
    });
    await runtime.documents.importFile(
      "合成采购规则",
      "md",
      Buffer.from("采购预算：10000元"),
    );
    await runtime.documents.importFile(
      "合成合规规则",
      "md",
      Buffer.from("供应商资质：ISO9001"),
    );
    let retrieval, reusedRetrieval;
    let modelCount = 0,
      mcpCalls = 0,
      browser;
    const server = createServer(async (req, res) => {
      if (req.url === "/mcp" || req.url === "/chat/completions") {
        if (req.url === "/mcp") {
          wire.push({ method: req.method, auth: req.headers.authorization });
          assert.equal(req.headers.authorization, "Bearer " + token);
        } else assert.ok(!(req.headers.authorization || "").includes(token));
        if (req.method === "DELETE") {
          res.writeHead(204).end();
          return;
        }
        let body = "";
        for await (const c of req) body += c;
        assert.ok(!body.includes(token));
        const p = JSON.parse(body);
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/mcp") {
          res.setHeader("Mcp-Session-Id", "synthetic-ui-session");
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
                        description: "测试报价工具",
                        inputSchema: { type: "object", properties: {} },
                      },
                    ],
                  }
                : (mcpCalls++,
                  { content: [{ type: "text", text: "报价8000元" }] });
          res.end(JSON.stringify({ jsonrpc: "2.0", id: p.id, result }));
        } else {
          if (modelCount === 3)
            retrieval = JSON.parse(p.messages.at(-1).content);
          if (modelCount === 4)
            reusedRetrieval = JSON.parse(p.messages.at(-1).content);
          const steps = [
              ["skill_read", { name: "procurement-check" }],
              [
                "skill_resource",
                { name: "procurement-check", path: "references/rules.md" },
              ],
              ["knowledge_search", { query: "核对采购预算和供应商资质" }],
              ["knowledge_search", { query: "预算资质" }],
              ["mcp_0_quote", {}],
            ],
            action = steps[modelCount++];
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: action
                    ? {
                        role: "assistant",
                        tool_calls: [
                          {
                            id: "c" + modelCount,
                            type: "function",
                            function: {
                              name: action[0],
                              arguments: JSON.stringify(action[1]),
                            },
                          },
                        ],
                      }
                    : {
                        role: "assistant",
                        content:
                          "夹具验收：预算10000元，报价8000元，未超预算。",
                      },
                },
              ],
            }),
          );
        }
        return;
      }
      try {
        const f = path.resolve(
          root,
          "." + new URL(req.url, "http://localhost").pathname,
        );
        if (!f.startsWith(root + path.sep)) throw Error();
        res.setHeader(
          "Content-Type",
          f.endsWith(".html")
            ? "text/html"
            : f.endsWith(".js")
              ? "text/javascript"
              : f.endsWith(".css")
                ? "text/css"
                : "application/octet-stream",
        );
        res.end(await readFile(f));
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://127.0.0.1:" + server.address().port;
    store.data.settings = {
      baseUrl: base,
      model: "http-fixture",
      hasKey: true,
    };
    const conversation = createConversationService({
      store,
      secrets,
      active: new Map(),
      key: () => "",
      view,
      approve: async (t) => {
        approvals.push(t);
        return true;
      },
      executeTool: (...args) => runtime.execute(...args),
    });
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH,
      });
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1000 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.exposeFunction("hostState", view);
      await page.exposeFunction("hostClearIndex", () =>
        sharedKnowledgeIndex(store).clear(),
      );
      let uploads = 0;
      await page.exposeFunction("hostSkillImport", async () => ({
        imported: await library.importSkill(
          "skill.zip",
          uploads++ === 0
            ? bytes
            : Buffer.from(
                office.zip.zipSync({
                  "SKILL.md": Buffer.from(
                    source.replaceAll("procurement-check", "inline-skill"),
                  ),
                }),
              ),
        ),
        state: view(),
      }));
      await page.exposeFunction("hostSkillRead", (p) =>
        library.readSkill(p.id),
      );
      await page.exposeFunction("hostMcp", async (p) => ({
        saved: await library.connection(p),
        state: view(),
      }));
      await page.exposeFunction("hostTest", async (p) => ({
        result: await library.probe(p.id),
        state: view(),
      }));
      await page.exposeFunction("hostAgent", (p) => workspace.agent(p));
      await page.exposeFunction("hostChat", (p) => conversation.run(p));
      await page.addInitScript(() => {
        if (window !== top) return;
        window.actwill = {
          state: () => window.hostState(),
          clearKnowledgeIndex: () => window.hostClearIndex(),
          skillImport: () => window.hostSkillImport(),
          skillRead: (p) => window.hostSkillRead(p),
          mcpConnection: (p) => window.hostMcp(p),
          mcpTest: (p) => window.hostTest(p),
          agent: (p) => window.hostAgent(p),
          chat: (p) => window.hostChat(p),
        };
      });
      await page.goto(base + "/index.html");
      await page.locator("[data-page=agents]").click();
      await page
        .getByRole("tab", { name: "Skills 技能库", exact: true })
        .click();
      await page
        .getByRole("button", { name: "上传 Skill", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "procurement-check", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "查看内容", exact: true }).click();
      assert.match(
        await page.locator(".skill-source").textContent(),
        /references\/rules.md/,
      );
      await page.locator("#modal button[aria-label=关闭]").click();
      await page.getByRole("tab", { name: "MCP 连接器", exact: true }).click();
      await page
        .getByRole("button", { name: "添加 MCP 连接", exact: true })
        .click();
      const modal = page.locator("#modal");
      await modal.locator("[name=name]").fill("本机采购报价");
      await modal.locator("[name=url]").fill(base + "/mcp");
      await modal.locator("[name=auth]").selectOption("bearer");
      await modal.locator("[name=token]").fill(token);
      await modal.locator("#modalSubmit").click();
      await modal.waitFor({ state: "hidden" });
      assert.equal(wire.length, 0);
      assert.equal(await modal.locator("[name=token]").inputValue(), "");
      await page.getByRole("button", { name: "配置", exact: true }).click();
      assert.equal(await modal.locator("[name=token]").inputValue(), "");
      assert.match(
        await modal.locator("[name=token]").getAttribute("placeholder"),
        /已保存/,
      );
      await modal.locator("button[aria-label=关闭]").click();
      await page.getByRole("button", { name: "测试连接", exact: true }).click();
      await page.getByText("上次发现 1 项工具", { exact: false }).waitFor();
      assert.equal(mcpCalls, 0);
      await page.getByRole("tab", { name: "智能体", exact: true }).click();
      await page.locator("[data-action=newAgent]").click();
      await modal.locator("[name=name]").fill("采购专员");
      await modal.locator("[name=description]").fill("使用已上传技能和MCP");
      await modal.locator("[name=prompt]").fill("检查报价是否超预算");
      await modal.locator("[name=skillId]").check();
      await modal.locator("[name=mcpId]").check();
      await modal
        .getByRole("button", { name: "上传 Skill", exact: true })
        .click();
      await modal.getByText("inline-skill", { exact: true }).waitFor();
      assert.equal(await modal.locator("[name=skillId]:checked").count(), 2);
      assert.equal(
        await modal.locator("[name=prompt]").inputValue(),
        "检查报价是否超预算",
      );
      await modal
        .getByRole("button", { name: "配置新的 MCP", exact: true })
        .click();
      await modal.locator("[name=registryMcpName]").fill("备用报价");
      await modal
        .locator("[name=registryMcpUrl]")
        .fill(base + "/mcp-secondary");
      await modal.locator("[name=registryMcpauth]").selectOption("bearer");
      await modal
        .locator("[name=registryMcptoken]")
        .fill("synthetic-secondary-bearer-123");
      await modal
        .getByRole("button", { name: "保存连接并选中", exact: true })
        .click();
      await modal.getByText("备用报价", { exact: true }).waitFor();
      assert.equal(
        await modal.locator("[name=registryMcptoken]").inputValue(),
        "",
      );
      assert.equal(await modal.locator("[name=mcpId]:checked").count(), 2);
      const secondary = store.data.mcpConnections.find(
        (c) => c.name === "备用报价",
      );
      await modal
        .locator('[name=mcpId][value="' + secondary.id + '"]')
        .uncheck();
      for (const box of await modal.locator("[name=knowledge]").all())
        await box.check();
      for (const field of await modal.locator("[name=agentTool]").all())
        await field.uncheck();
      await modal.locator("#modalSubmit").click();
      await modal.waitFor({ state: "hidden" });
      const agent = store.data.agents.at(-1);
      assert.equal(agent.skillIds.length, 2);
      assert.equal(agent.mcpIds.length, 1);
      assert.equal(agent.skills.length, 0);
      await page.reload();
      await page.locator("[data-page=agents]").click();
      const card = page.locator(".card").filter({
        has: page.getByRole("heading", { name: "采购专员", exact: true }),
      });
      await card.getByRole("button", { name: "编辑", exact: true }).click();
      assert.equal(await modal.locator("[name=skillId]:checked").count(), 2);
      assert.equal(await modal.locator("[name=mcpId]:checked").count(), 1);
      await modal.locator("button[aria-label=关闭]").click();
      await card.getByRole("button", { name: "开始对话", exact: true }).click();
      assert.equal(await page.locator("#agent").inputValue(), agent.id);
      await page.locator("#prompt").fill("核对采购预算和报价");
      await page.getByRole("button", { name: "发送任务", exact: true }).click();
      await page
        .getByText("夹具验收：预算10000元，报价8000元，未超预算。", {
          exact: false,
        })
        .first()
        .waitFor();
      assert.equal(modelCount, 6);
      assert.equal(retrieval.index.built, 2);
      assert.equal(reusedRetrieval.index.reused, 2);
      assert.equal(reusedRetrieval.index.built, 0);
      assert.equal(view().knowledgeIndexes, undefined);
      assert.equal(retrieval.sources.length, 2);
      assert.equal(new Set(retrieval.matches.map((m) => m.source.id)).size, 2);
      assert.ok(retrieval.matches.some((m) => m.text.includes("ISO9001")));
      assert.ok(
        retrieval.matches.every(
          (m) => m.line >= 1 && m.source.sha256.length === 64,
        ),
      );
      assert.equal(mcpCalls, 1);
      const evidence = page.getByRole("region", { name: "本轮知识检索依据" });
      // section is exposed as a named region by aria-label.
      await evidence.waitFor();
      assert.equal(await evidence.locator("details").count(), 4);
      const beforeExpand = approvals.length;
      await evidence.locator("summary").first().click();
      await page.getByRole("button", { name: "收起侧栏", exact: true }).click();
      assert.equal(await evidence.locator("details[open]").count(), 1);
      assert.equal(approvals.length, beforeExpand);
      assert.ok(
        (await evidence.locator("pre").first().textContent()).length > 0,
      );
      assert.match(await evidence.textContent(), /与当前文档版本一致/);
      await page.reload();
      await page.locator("[data-action=openChat]").first().click();
      await page.getByRole("region", { name: "本轮知识检索依据" }).waitFor();
      assert.equal(modelCount, 6);
      assert.equal(mcpCalls, 1);
      const budgetDoc = store.data.documents.find(
        (d) => d.name === "合成采购规则",
      );
      const edited = await runtime.execute("document_edit", {
        id: budgetDoc.id,
        expectedRevision: 1,
        replacements: [{ find: "10000", replace: "9000" }],
      });
      assert.equal(edited.status, "succeeded");
      await page.reload();
      await page.locator("[data-action=openChat]").first().click();
      const stale = page.getByRole("region", { name: "本轮知识检索依据" });
      await stale.waitFor();
      assert.match(await stale.textContent(), /来源已更新/);
      assert.match(await stale.textContent(), /10000/);
      assert.ok(!(await stale.textContent()).includes("9000"));
      assert.equal(modelCount, 6);
      const restored = new Store(dir);
      await restored.load();
      assert.equal(
        restored.data.agents.at(-1).skillIds[0],
        store.data.skillPackages[0].id,
      );
      assert.equal(
        restored.data.mcpConnections.find((c) => c.name === "本机采购报价")
          .lastTest.tools[0].name,
        "quote",
      );
      assert.ok(!JSON.stringify(view().skillPackages).includes(source));
      assert.ok(!JSON.stringify(view()).includes(token));
      assert.ok(!(await readFile(store.file, "utf8")).includes(token));
      assert.ok(wire.length >= 9);
      assert.ok(wire.every((r) => r.auth === "Bearer " + token));
      assert.equal(restored.data.knowledgeIndexes.length, 2);
      const approvedDocs = [];
      for (const d of restored.data.documents) {
        const out = await runtime.execute("document_read", { id: d.id });
        approvedDocs.push(out.document);
      }
      const afterRestart = await sharedKnowledgeIndex(restored).searchApproved({
        documents: approvedDocs,
        query: "预算",
        check: () => {},
      });
      // Budget was edited above; its old index must rebuild, the other must reuse.
      assert.equal(afterRestart.index.built, 1);
      assert.equal(afterRestart.index.reused, 1);
      await page.locator("[data-page=agents]").click();
      await page
        .getByRole("button", { name: "清除检索索引", exact: true })
        .click();
      await page.getByText("已清除派生检索索引", { exact: false }).waitFor();
      assert.equal(store.data.knowledgeIndexes, undefined);
      assert.equal(store.data.documents.length, 2);
      assert.equal(modelCount, 6);
      assert.deepEqual(errors, []);
      console.log(
        "PASS real ZIP/service/store + production UI import/configure/probe/bind/reload + six real HTTP model requests/persisted index build+reuse/approved multi-document retrieval/authenticated MCP tool; native picker/IPC/approvals and model semantics fixtures.",
      );
    } finally {
      library.close();
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
