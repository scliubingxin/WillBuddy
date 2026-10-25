import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import {createDocumentService,documentViews} from "../../services/documents.mjs";
import {generateDocument} from "../../runtime/documents.mjs";
import { createConversationService } from "../../services/conversation.mjs";
test(
  "production UI selects DOCX attachment, sends real extracted text to HTTP model and retains attachment metadata",
  { timeout: 60000 },
  async () => {
    const root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      ),
      dir = await mkdtemp(path.join(tmpdir(), "wb-image-live-")),
      store = new Store(dir),
      requests = [];
    await store.load();
    const documents=createDocumentService({store});
    const generated=await generateDocument('docx',JSON.stringify({title:'合成预算附件',blocks:[{type:'paragraph',text:'合成项目预算为24680元。'}]}));
    let browser;
    const view = () =>
        structuredClone({
          ...store.data,
          documents:documentViews(store.data),
        }),
      server = createServer(async (req, res) => {
        if (req.url === "/chat/completions") {
          let body = "";
          for await (const c of req) body += c;
          requests.push(JSON.parse(body));
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      "测试模型已收到附件正文：预算24680元（合成HTTP夹具回复）。",
                  },
                },
              ],
            }),
          );
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
      model: "vision-http-fixture",
      hasKey: true,
    };
    const conversation = createConversationService({
      store,

      active: new Map(),
      key: () => "",
      view,
      executeTool: () => {},
    });
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH,
      });
      const page = await browser.newPage(),
        network = [];
      page.on("request", (r) => {
        if (!r.url().startsWith(base) && !r.url().startsWith("blob:"))
          network.push(r.url());
      });
      await page.exposeFunction("hostState", view);
      await page.exposeFunction('hostAttachmentImport',async()=>{
        const {document:d}=await documents.importFile('合成预算.docx','docx',generated.bytes);
        return {documentId:d.id,revision:d.revision,sha256:d.sha256,name:d.name,text:d.text};
      });
      await page.exposeFunction("hostChat", (p) => conversation.run(p));
      await page.addInitScript(() => {
        if (window !== top) return;
        window.actwill = {
          state: () => window.hostState(),
          chatAttachmentImport:()=>window.hostAttachmentImport(),
          chat: (p) => window.hostChat(p),
        };
      });
      await page.goto(base + "/index.html");
      await page.getByRole('button',{name:'上传问答附件',exact:true}).click();
      await page.locator('.attachment-chip').waitFor();
      assert.match(await page.locator('.attachment-chip').textContent(),/合成预算/);
      assert.equal(requests.length,0);
      await page.locator('#toolMode').uncheck();
      await page.locator('#prompt').fill('附件预算是多少？');
      await page.getByRole('button',{name:'发送任务',exact:true}).click();
      await page.locator('.message.assistant').waitFor();
      assert.equal(requests.length,1);
      assert.match(requests[0].messages.at(-1).content,/预算为24680元/);
      assert.equal(requests[0].tools,undefined);
      assert.match(await page.locator('.message.user .message-files').textContent(),/合成预算.docx/);
      assert.equal(await page.locator('.attachment-chip').count(),0);
      await page.reload();
      await page.locator('.recent [data-action="openChat"]').first().click();
      await page.locator('.message.user .message-files').waitFor();
      const restored=new Store(dir);await restored.load();
      assert.equal(restored.data.chats[0].messages[0].documents[0].sha256,store.data.documents[0].sha256);
      assert.equal(requests.length,1);assert.deepEqual(network,[]);
      await page.getByRole('button',{name:'附加当前版本',exact:true}).click();
      await page.locator('.attachment-chip').waitFor();
      assert.equal(requests.length,1);
      await page.locator('.attachment-chip [data-action="detach"]').click();
      assert.equal(await page.locator('.attachment-chip').count(),0);
      console.log('PASS production composer → actual DOCX parser → real HTTP request; native picker/IPC and response semantics are fixtures, not Mac/provider acceptance');
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
