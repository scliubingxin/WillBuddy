import {createModelService} from '../../services/models.mjs';
import {parseChatUpload} from '../../runtime/chat-archive.mjs';
import office from '../../runtime/vendor/office.cjs';
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
  "production UI configures two models, routes fast/extreme/manual effort and understands actual multi-file ZIP",
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
    const models=createModelService({store,secrets:{seal:k=>Buffer.from(k).toString('base64'),open:c=>Buffer.from(c,'base64').toString()}});
    let browser;
    const view = () =>
        structuredClone({
          ...store.data,modelProfiles:models.view(),
          documents:documentViews(store.data),
        }),
      server = createServer(async (req, res) => {
        if (req.url.endsWith("/chat/completions")) {
          let body = "";
          for await (const c of req) body += c;
          requests.push({...JSON.parse(body),receivedAuth:req.headers.authorization,receivedPath:req.url});
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
      store,models,

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
      await page.exposeFunction('hostModelUpdate',async p=>{await models.update(p);return view();});
      await page.exposeFunction('hostAttachmentImport',async()=>{
        const zipped=office.zip.zipSync({'预算/report.docx':generated.bytes,'规则/rules.txt':Buffer.from('报价上限20000元'),'image.png':Buffer.from('unsupported-binary')});
        const parsed=parseChatUpload('合成资料.zip',zipped),docs=await documents.importBatch(parsed.items);
        return {attachments:docs.map((d,i)=>({documentId:d.id,revision:d.revision,sha256:d.sha256,name:d.name,text:d.text,archive:parsed.items[i].archive,entryPath:parsed.items[i].entryPath})),skipped:parsed.skipped};
      });
      await page.exposeFunction("hostChat", (p) => conversation.run(p));
      await page.addInitScript(() => {
        if (window !== top) return;
        window.actwill = {
          state: () => window.hostState(),
          modelProfile:p=>window.hostModelUpdate(p),
          chatAttachmentImport:()=>window.hostAttachmentImport(),
          chat: (p) => window.hostChat(p),
        };
      });
      await page.goto(base + "/index.html");
      async function configure(name,kind,protocol,effort,key){
        await page.locator('.profile[data-action="settings"]').click();
        await page.locator('#modal [data-action="modelEdit"]').first().click();
        await page.locator('#modal [name="name"]').fill(name);
        await page.locator('#modal [name="baseUrl"]').fill(base+'/'+name);
        await page.locator('#modal [name="model"]').fill(name+'-id');
        await page.locator('#modal [name="kind"]').selectOption(kind);
        await page.locator('#modal [name="protocol"]').selectOption(protocol);
        await page.locator('#modal [name="effort"]').selectOption(effort);
        await page.locator('#modal [name="apiKey"]').fill(key);
        await page.locator('#modalSubmit').click();
        await page.waitForFunction(()=>!document.querySelector('#modal').open);
      }
      await configure('speed','fast','none','off','fast-synthetic-key');
      await configure('deep','extreme','openai','high','deep-synthetic-key');
      assert.equal(requests.length,0);assert.equal(models.view().length,2);
      assert.ok(!JSON.stringify(models.view()).includes('synthetic-key'));
      await page.getByRole('button',{name:'上传问答附件',exact:true}).click();
      await page.locator('#modal').waitFor({state:'visible'});
      assert.match(await page.locator('#modal').textContent(),/image.png/);
      await page.locator('#modal header button').click();
      assert.equal(await page.locator('.attachment-chip').count(),2);
      assert.match(await page.locator('.chips').textContent(),/预算\/report.docx/);
      await page.locator('#toolMode').uncheck();
      await page.locator('#modelChoice').selectOption('auto:fast');
      await page.locator('#prompt').fill('请根据压缩包比较预算与上限');
      await page.getByRole('button',{name:'发送任务',exact:true}).click();
      await page.locator('.message.assistant').waitFor();
      assert.equal(requests[0].receivedPath,'/speed/chat/completions');assert.equal(requests[0].model,'speed-id');assert.equal(requests[0].receivedAuth,'Bearer fast-synthetic-key');
      assert.equal(requests[0].reasoning_effort,undefined);
      assert.match(requests[0].messages.at(-1).content,/24680/);
      assert.match(requests[0].messages.at(-1).content,/20000/);
      assert.match(requests[0].messages.at(-1).content,/合成资料.zip \/ 规则\/rules.txt/);
      await page.locator('#modelChoice').selectOption('auto:extreme');
      await page.locator('#prompt').fill('深入分析');await page.getByRole('button',{name:'发送任务',exact:true}).click();
      await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);
      assert.equal(requests[1].receivedPath,'/deep/chat/completions');assert.equal(requests[1].model,'deep-id');assert.equal(requests[1].reasoning_effort,'high');assert.equal(requests[1].receivedAuth,'Bearer deep-synthetic-key');
      const deep=models.view().find(p=>p.name==='deep');
      await page.locator('#modelChoice').selectOption('profile:'+deep.id);await page.locator('#modelEffort').selectOption('low');
      await page.locator('#prompt').fill('指定模型低强度');await page.getByRole('button',{name:'发送任务',exact:true}).click();
      await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===3);
      assert.equal(requests[2].reasoning_effort,'low');
      await page.reload();await page.locator('.recent [data-action="openChat"]').first().click();
      assert.equal(await page.locator('#modelChoice').inputValue(),'profile:'+deep.id);assert.equal(await page.locator('#modelEffort').inputValue(),'low');
      assert.match(await page.locator('.message.user .message-files').first().textContent(),/report.docx/);
      const restored=new Store(dir);await restored.load();assert.equal(restored.data.modelProfiles.length,2);assert.equal(restored.data.documents.length,2);
      assert.ok(!JSON.stringify(restored.data).includes('fast-synthetic-key'));assert.equal(requests.length,3);assert.deepEqual(network,[]);
      console.log('PASS real production model forms/ZIP bytes/DOCX extraction/HTTP wire headers and reasoning; picker/IPC/keychain and model semantics fixtures');
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
