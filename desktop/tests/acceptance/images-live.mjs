import {largePNG} from '../helpers/large-png.mjs';
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import { createImageService, imageViews } from "../../services/images.mjs";
import { createConversationService } from "../../services/conversation.mjs";
test(
  "real UI imports image, explicitly sends image_url to real HTTP fixture, previews offline and reloads disk state",
  { timeout: 60000 },
  async () => {
    const root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      ),
      dir = await mkdtemp(path.join(tmpdir(), "wb-image-live-")),
      store = new Store(dir),
      requests = [];
    await store.load();
    const png = largePNG(),
      images = createImageService({ store, decode: async () => png });
    let browser;
    const view = () =>
        structuredClone({
          ...store.data,
          imageAttachments: imageViews(store.data),
        }),
      server = createServer(async (req, res) => {
        if (req.url === "/chat/completions") {
          let body = "";
          for await (const c of req) body += c;
          requests.push(JSON.parse(body));
          if(body.includes("FAIL_IMAGE_TEST")){res.writeHead(500).end("synthetic model failure");return;}
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content:
                      "测试模型已收到图片结构；此回复为夹具，不是真实视觉识别。",
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
      images,
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
      await page.exposeFunction("hostImageImport", () =>
        images.importFile("synthetic.png", png),
      );
      await page.exposeFunction("hostImagePreview", (p) =>
        images.preview(p.id),
      );
      await page.exposeFunction("hostChat", (p) => conversation.run(p));
      await page.addInitScript(() => {
        if (window !== top) return;
        window.actwill = {
          state: () => window.hostState(),
          imageImport: () => window.hostImageImport(),
          imagePreview: (p) => window.hostImagePreview(p),
          chat: (p) => window.hostChat(p),
        };
      });
      await page.goto(base + "/index.html");
      await page.locator("[data-composer-trigger=add]").click();await page.getByRole("button", { name: "添加图片", exact: true }).click();
      await page.locator("#sendImages").waitFor();
      assert.equal(await page.locator("#sendImages").isChecked(), false);
      const thumb=page.locator('img[data-composer-image]');await thumb.waitFor();await thumb.evaluate(async img=>{if(!img.src)await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});await img.decode();});assert.equal(await thumb.evaluate(i=>i.naturalWidth),3000);
      assert.equal(requests.length, 0);
      assert.equal(store.data.imageAttachments.length, 1);
      await page.locator("#sendImages").check();
      await page.locator("#prompt").fill("请检查这张合成测试图片");
      await page.getByRole("button", { name: "发送任务", exact: true }).click();
      await page.locator(".message.assistant").waitFor();
      assert.equal(requests.length, 1);
      assert.equal(
        requests[0].messages.at(-1).content[1].image_url.url,
        "data:image/png;base64," + png.toString("base64"),
      );
      assert.equal(await page.locator(".message.user .local-image").count(), 1);
      await page
        .getByRole("button", { name: "查看本机图片", exact: true })
        .click();
      const image = page
        .frameLocator('iframe[title="对话图片查看器"]')
        .locator("img");
      await image.waitFor();
      await image.evaluate((el) => el.decode());
      assert.equal(await image.evaluate((el) => el.naturalWidth), 3000);
      assert.deepEqual(network, []);
      await page.reload();
      await page.locator('.recent [data-action="openChat"]').first().click();
      await page
        .getByRole("button", { name: "查看本机图片", exact: true })
        .click();
      await page
        .frameLocator('iframe[title="对话图片查看器"]')
        .locator("img")
        .waitFor();
      const restored = new Store(dir);
      await restored.load();
      assert.equal(
        restored.data.imageAttachments[0].base64,
        png.toString("base64"),
      );
      assert.equal(
        restored.data.chats[0].messages[0].images[0].id,
        store.data.imageAttachments[0].id,
      );
      assert.equal(requests.length, 1);
      await page.getByRole('button',{name:'新建任务',exact:false}).click();
      await page.locator('[data-composer-trigger=add]').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.locator('#sendImages').check();
      await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.locator('.message.assistant').waitFor();assert.equal(requests.length,2);assert(requests[1].messages.at(-1).content[0].text.startsWith('请分析这些图片。'));
      await page.getByRole('button',{name:'新建任务',exact:false}).click();await page.locator('[data-composer-trigger=add]').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.locator('#sendImages').check();await page.locator('#prompt').fill('FAIL_IMAGE_TEST');await page.getByRole('button',{name:'发送任务',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#prompt')?.value==='FAIL_IMAGE_TEST');assert.equal(await page.locator('img[data-composer-image]').count(),1);assert.equal(requests.length,3);
      console.log(
        "PASS real PNG decode and real HTTP multimodal wire payload; native picker/normalizer and model response fixtures, not native Mac or actual vision semantics",
      );
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await rm(dir, { recursive: true, force: true });
    }
  },
);
