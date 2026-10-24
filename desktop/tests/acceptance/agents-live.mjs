import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import { createWorkspaceService } from "../../services/workspace.mjs";
test(
  "production agent editor persists real knowledge/skills/tool allowlist/MCP/ReAct configuration",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "wb-agent-ui-")),
      store = new Store(dir);
    await store.load();
    store.data.documents = [
      { id: "doc", name: "合成采购规则", format: "md", revision: 1 },
    ];
    const view = () => structuredClone(store.data),
      workspace = createWorkspaceService({ store, active: new Map(), view }),
      root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      );
    let browser;
    const server = createServer(async (req, res) => {
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
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH,
      });
      const page = await browser.newPage({
          viewport: { width: 1440, height: 1000 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.exposeFunction("hostState", view);
      await page.exposeFunction("hostAgent", (p) => workspace.agent(p));
      await page.addInitScript(() => {
        if (window !== top) return;
        window.actwill = {
          state: () => window.hostState(),
          agent: (p) => window.hostAgent(p),
        };
      });
      await page.goto(
        "http://127.0.0.1:" + server.address().port + "/index.html",
      );
      await page.locator('[data-page="agents"]').click();
      await page.locator('[data-action="newAgent"]').click();
      const modal = page.locator("#modal");
      await modal.locator('[name="name"]').fill("采购专员");
      await modal.locator('[name="description"]').fill("使用实际知识和工具");
      await modal.locator('[name="prompt"]').fill("先核对预算再验收报价");
      await modal.locator('[name="knowledge"]').check();
      await modal.getByText("手工技能 / 原有配置", { exact: true }).click();
      await modal
        .getByRole("button", { name: "添加技能", exact: true })
        .click();
      await modal.locator("[name=skillName]").fill("采购验收");
      await modal.locator("[name=skillDescription]").fill("核对预算");
      await modal
        .locator("[name=skillInstructions]")
        .fill("读取预算后再调用报价；按实际返回验收。");
      for (const el of await modal.locator("[name=agentTool]").all())
        await el.uncheck();
      await modal.locator("[name=agentTool][value=document_create]").check();
      await modal.getByText("原有内嵌 MCP 配置", { exact: true }).click();
      await modal
        .getByRole("button", { name: "添加 MCP 服务", exact: true })
        .click();
      await modal.locator("[name=mcpName]").fill("本机报价");
      await modal.locator("[name=mcpUrl]").fill("http://localhost:3000/mcp");
      await modal.locator("[name=maxSteps]").fill("7");
      await modal.locator("#modalSubmit").click();
      await modal.waitFor({ state: "hidden" });
      assert.equal(store.data.agents.at(-1).skills[0].name, "采购验收");
      assert.deepEqual(store.data.agents.at(-1).tools, ["document_create"]);
      assert.equal(store.data.agents.at(-1).maxSteps, 7);
      assert.deepEqual(store.data.agents.at(-1).knowledge, ["doc"]);
      await page.reload();
      await page.locator('[data-page="agents"]').click();
      const card = page.locator(".card").filter({
        has: page.getByRole("heading", { name: "采购专员", exact: true }),
      });
      await card.getByRole("button", { name: "编辑", exact: true }).click();
      assert.equal(
        await modal.locator("[name=skillName]").inputValue(),
        "采购验收",
      );
      assert.equal(
        await modal.locator("[name=mcpUrl]").inputValue(),
        "http://localhost:3000/mcp",
      );
      assert.equal(await modal.locator("[name=agentTool]:checked").count(), 1);
      const reload = new Store(dir);
      await reload.load();
      assert.equal(reload.data.agents.at(-1).maxSteps, 7);
      assert.deepEqual(errors, []);
      console.log(
        "PASS production UI → real workspace service → persisted/reloaded agent registry; native IPC fixture. MCP/model execution independently real HTTP fixture-tested.",
      );
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
