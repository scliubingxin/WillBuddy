import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
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
    const view = () =>
        structuredClone({
          ...store.data,
          skillPackages: skillViews(store.data),
        }),
      approvals = [],
      library = createCapabilityLibrary({
        store,
        approve: async (t) => {
          approvals.push(t);
          return true;
        },
      }),
      workspace = createWorkspaceService({ store, active: new Map(), view });
    let modelCount = 0,
      mcpCalls = 0,
      browser;
    const server = createServer(async (req, res) => {
      if (req.url === "/mcp" || req.url === "/chat/completions") {
        if (req.method === "DELETE") {
          res.writeHead(204).end();
          return;
        }
        let body = "";
        for await (const c of req) body += c;
        const p = JSON.parse(body);
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/mcp") {
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
          const steps = [
              ["skill_read", { name: "procurement-check" }],
              [
                "skill_resource",
                { name: "procurement-check", path: "references/rules.md" },
              ],
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
      active: new Map(),
      key: () => "",
      view,
      approve: async (t) => {
        approvals.push(t);
        return true;
      },
      executeTool: () => {
        throw Error("must use bound registries");
      },
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
      await modal.locator("#modalSubmit").click();
      await modal.waitFor({ state: "hidden" });
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
      await modal
        .getByRole("button", { name: "保存连接并选中", exact: true })
        .click();
      await modal.getByText("备用报价", { exact: true }).waitFor();
      assert.equal(await modal.locator("[name=mcpId]:checked").count(), 2);
      const secondary = store.data.mcpConnections.find(
        (c) => c.name === "备用报价",
      );
      await modal
        .locator('[name=mcpId][value="' + secondary.id + '"]')
        .uncheck();
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
      assert.equal(modelCount, 4);
      assert.equal(mcpCalls, 1);
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
      assert.deepEqual(errors, []);
      console.log(
        "PASS real ZIP/service/store + production UI import/configure/probe/bind/reload + four real HTTP model requests/MCP tool; native picker/IPC/approvals and model semantics fixtures.",
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
