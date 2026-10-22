import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import { ToolRuntime } from "../../runtime/tools.mjs";
import { documentViews } from "../../services/documents.mjs";
import { createRunQueue } from "../../runtime/run-queue.mjs";
import { createConversationService } from "../../services/conversation.mjs";
import { inspectDocument } from "../../runtime/documents.mjs";

test("real Chromium: Office create/edit/export and two concurrent model tasks with isolated cancellation", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "willbuddy-docs-ui-")),
    store = new Store(dir);
  await store.load();
  const active = new Map(),
    root = path.resolve(fileURLToPath(new URL("../../src/", import.meta.url)));
  let browser,
    page,
    queue,
    models = 0,
    exported;
  const held = [];
  const server = createServer(async (req, res) => {
    if (req.url === "/chat/completions") {
      let raw = "";
      for await (const b of req) raw += b;
      const body = JSON.parse(raw);
      models++;
      held.push({ body, res });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(" ");
      return;
    }
    try {
      const pathname = decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        ),
        file = path.resolve(
          root,
          "." + (pathname === "/" ? "/index.html" : pathname),
        );
      if (!file.startsWith(root + path.sep)) throw Error("outside");
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const address = "http://127.0.0.1:" + server.address().port;
  store.data.settings = {
    baseUrl: address,
    model: "HTTP fixture",
    hasKey: true,
  };
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
    });
    page = await browser.newPage({ viewport: { width: 1380, height: 960 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const notify = () => {
        page.evaluate(() => window.__runtime?.()).catch(() => {});
      },
      tools = new ToolRuntime({ store, approve: async () => true, notify });
    const view = () => ({
      ...structuredClone(store.data),
      documents: documentViews(store.data),
    });
    queue = createRunQueue({ store, active, notify });
    const chat = createConversationService({
      store,
      active,
      queue,
      key: () => "",
      view,
      notify,
      executeTool: (...a) => tools.execute(...a),
    });
    await page.exposeFunction("hostRun", async (n, p) => {
      if (n === "state") return view();
      if (n === "chat") return chat.run(p);
      if (n === "cancelChat") return chat.cancel(p.id);
      if (n === "cancelRun") return queue.cancel(p.id);
      if (n === "documentOperation") {
        const { operation, ...args } = p;
        return tools.execute(operation, args);
      }
      if(n === "documentEditor")return tools.documents.editor(p.id);
      if(n === "documentSaveEditor")return tools.documents.updateEditor(p.id,p.revision,p.patch,async()=>true);
      if (n === "documentExport") {
        const result = tools.documents.bytes(p.id, p.revision);
        exported = path.join(dir, "actual." + result.format);
        await writeFile(exported, result.bytes);
        assert.deepEqual(await readFile(exported), result.bytes);
        return { saved: true };
      }
      throw Error("unexpected " + n);
    });
    await page.addInitScript(() => {
      window.actwill = Object.fromEntries(
        [
          "state",
          "chat",
          "cancelChat",
          "cancelRun",
          "documentOperation",
          "documentExport", "documentEditor", "documentSaveEditor",
        ].map((n) => [n, (p) => window.hostRun(n, p)]),
      );
      window.actwill.onRuntime = (fn) => {
        window.__runtime = fn;
      };
    });
    await page.goto(address);
    await page.locator('.sidebar [data-page="library"]').click();
    await page.getByRole("button", { name: "新建文档", exact: true }).click();
    await page.locator('[name="documentName"]').fill("实际 Word");
    await page
      .locator('[name="documentContent"]')
      .fill(
        JSON.stringify({
          title: "2025 报告",
          blocks: [{ type: "paragraph", text: "真实文档内容" }],
        }),
      );
    await page.getByRole("button", { name: "审阅并创建", exact: true }).click();
    await page
      .locator("[data-document] h3")
      .filter({ hasText: "实际 Word" })
      .waitFor();
    assert.equal(store.data.documents.length, 1);
    await page.getByRole("button", { name: "精确修改", exact: true }).click();
    await page.locator('[name="find"]').fill("2025");
    await page.locator('[name="replacement"]').fill("2026");
    await page
      .getByRole("button", { name: "审阅并保存版本", exact: true })
      .click();
    await page
      .locator("[data-document] .badge")
      .filter({ hasText: "v2" })
      .waitFor();
    await page.getByRole("button", { name: "导出文件", exact: true }).click();
    for (let i = 0; i < 100 && !exported; i++)
      await new Promise((r) => setTimeout(r, 5));
    assert.match(
      inspectDocument("docx", await readFile(exported)).text,
      /2026/,
    );
    await page.getByRole("button", { name: "预览", exact: true }).click();
    await page
      .getByRole("article", { name: "成果正文" })
      .filter({ hasText: "2026" })
      .waitFor();
    await page.getByRole("button", { name: "关闭工作区", exact: true }).click();
    await page.getByRole("button", { name: /新建任务/ }).click();
    await page.locator("#prompt").fill("后台任务一");
    await page.getByRole("button", { name: "发送任务", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector('.recent [data-action="openChat"]')
        ?.textContent.includes("执行中"),
    );
    const first = store.data.chats[0].id;
    await page.locator('#prompt').fill('任务一的独立草稿');
    await page.getByRole("button", { name: /新建任务/ }).click();
    await page.locator("#prompt").fill("后台任务二");
    await page.getByRole("button", { name: "发送任务", exact: true }).click();
    await page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll('.recent [data-action="openChat"]'),
        ].filter((n) => n.textContent.includes("执行中")).length === 2,
    );
    assert.equal(active.size, 2);
    for (let i = 0; i < 100 && models < 2; i++)
      await new Promise((r) => setTimeout(r, 5));
    assert.equal(models, 2);
    const second = store.data.chats.find((c) => c.id !== first).id;
    await page.locator('#prompt').fill('任务二的独立草稿');
    await page.locator(`[data-action="openChat"][data-id="${first}"]`).click();
    assert.equal(await page.locator('#prompt').inputValue(),'任务一的独立草稿');
    await page.getByRole("button", { name: "停止生成", exact: true }).click();
    for (
      let i = 0;
      i < 100 &&
      store.data.chats.find((c) => c.id === first).run.status !== "cancelled";
      i++
    )
      await new Promise((r) => setTimeout(r, 5));
    assert.equal(
      store.data.chats.find((c) => c.id === first).run.status,
      "cancelled",
    );
    assert.equal(
      store.data.chats.find((c) => c.id === second).run.status,
      "running",
    );
    await page.locator(`[data-action="openChat"][data-id="${second}"]`).click();
    assert.equal(await page.locator('#prompt').inputValue(),'任务二的独立草稿');
    held[1].res.end(
      JSON.stringify({
        choices: [
          { message: { role: "assistant", content: "第二个任务独立完成" } },
        ],
      }),
    );
    await page
      .locator(".messages")
      .filter({ hasText: "第二个任务独立完成" })
      .waitFor();
    assert.equal(
      store.data.chats.find((c) => c.id === second).run.status,
      "completed",
    );
    // Actual HTTP model tool call -> trusted document card -> binary Office download.
    await page.getByRole('button',{name:/新建任务/}).click();
    await page.locator('#prompt').fill('生成一个可以下载并编辑的Word');
    await page.getByRole('button',{name:'发送任务',exact:true}).click();
    for(let i=0;i<100&&held.length<3;i++)await new Promise(r=>setTimeout(r,10));
    held[2].res.end(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'word',type:'function',function:{name:'document_create',arguments:JSON.stringify({name:'工具生成Word',format:'docx',content:JSON.stringify({title:'可编辑标题',blocks:[{type:'paragraph',text:'编辑前正文'}]})})}}]}}]}));
    for(let i=0;i<100&&held.length<4;i++)await new Promise(r=>setTimeout(r,10));
    held[3].res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'已创建。无需查找文档ID，点击下面的实际文件。'}}]}));
    const card=page.getByRole('region',{name:'已生成的文档'});
    await card.getByRole('button',{name:'下载 DOCX',exact:true}).waitFor();
    exported=null;
    await page.getByRole('button',{name:'下载生成文件',exact:true}).click();
    for(let i=0;i<100&&!exported;i++)await new Promise(r=>setTimeout(r,10));
    assert.match(inspectDocument('docx',await readFile(exported)).text,/编辑前正文/);
    await card.getByRole('button',{name:'编辑内容',exact:true}).click();
    await page.locator('[name="block1"]').fill('在生产界面修改后的正文');
    await page.getByRole('button',{name:'保存文档版本',exact:true}).click();
    await card.filter({hasText:'v2'}).waitFor();
    await page.getByRole('button',{name:'在工作区查看',exact:true}).click();
    await page.getByRole('article',{name:'成果正文'}).filter({hasText:'在生产界面修改后的正文'}).waitFor();
    exported=null;
    await page.getByRole('button',{name:'导出当前成果',exact:true}).click();
    for(let i=0;i<100&&!exported;i++)await new Promise(r=>setTimeout(r,10));
    assert.match(inspectDocument('docx',await readFile(exported)).text,/在生产界面修改后的正文/);
    await page.reload();
    await page.locator('.recent [data-action="openChat"]').first().click();
    await page.getByRole('region',{name:'已生成的文档'}).getByRole('button',{name:'下载 DOCX',exact:true}).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: production renderer + real DOCX codec/file export + shared service + two actual HTTP requests; native dialogs/approval bridge and model content remain fixtures",
    );
  } finally {
    queue?.stop();
    await queue?.idle();
    await browser?.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
