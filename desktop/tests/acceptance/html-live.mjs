import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { initialState } from "../../core.mjs";
test(
  "full-size script-rendered HTML opens from authorized file preview, isolated interactions work and survive redraw",
  { timeout: 60000 },
  async () => {
    const root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      ),
      input = process.env.HTML_ACCEPTANCE_FILE;
    const source = input
      ? await readFile(input, "utf8")
      : '<!doctype html><html><head><style>h1{color:rgb(0,120,203)}</style></head><body><main id="root"></main><!--' +
        "long ".repeat(52000) +
        '--><script>document.querySelector("#root").innerHTML="<h1>完整动态原型</h1><button id=increment>点击计数</button><output id=count>0</output>";let n=0;document.querySelector("#increment").onclick=()=>{document.querySelector("#count").textContent=++n;localStorage.setItem("count",n)};</script></body></html>';
    assert.ok(source.length > 50000);
    const reads = [],
      network = [];
    let browser;
    const server = createServer(async (req, res) => {
      try {
        const file = path.resolve(
          root,
          "." + new URL(req.url, "http://localhost").pathname,
        );
        if (!file.startsWith(root + path.sep)) throw Error();
        res.setHeader(
          "Content-Type",
          file.endsWith(".html")
            ? "text/html"
            : file.endsWith(".js")
              ? "text/javascript"
              : file.endsWith(".css")
                ? "text/css"
                : "application/octet-stream",
        );
        res.end(await readFile(file));
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
          viewport: { width: 1500, height: 1000 },
        }),
        base = "http://127.0.0.1:" + server.address().port,
        s = initialState();
      s.folders = [{ id: "grant", name: "测试授权", path: "/not-sent" }];
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (!r.url().startsWith(base)) network.push(r.url());
      });
      await page.exposeFunction("hostPreview", (p) => {
        reads.push(p);
        return {
          folderId: "grant",
          relative: "prototype.html",
          name: "prototype.html",
          text: source,
          truncated: false,
        };
      });
      await page.addInitScript((data) => {
        if (window !== top) return;
        window.actwill = {
          state: async () => structuredClone(data),
          listFiles: async () => ({
            files: [
              {
                folderId: "grant",
                relative: "prototype.html",
                name: "prototype.html",
              },
            ],
          }),
          previewFile: (p) => window.hostPreview(p),
        };
      }, s);
      await page.goto(base + "/index.html");
      await page.locator('[data-page="files"]').click();
      await page.locator('[data-action="previewFile"]').click();
      const driver = page.frameLocator('iframe[title="HTML 隔离交互预览"]'),
        frame = driver.frameLocator('iframe[title="HTML 交互内容"]');
      if (input) {
        await frame
          .getByRole("heading", {
            name: "你好，今天有什么采购任务？",
            exact: true,
          })
          .waitFor();
        await frame.getByRole("button", { name: /评估候选供应商/ }).click();
        await frame.locator("#wh-create").waitFor();
        assert.ok((await frame.locator("body").innerText()).includes("候选"));
      } else {
        await frame
          .getByRole("heading", { name: "完整动态原型", exact: true })
          .waitFor();
        await frame
          .getByRole("button", { name: "点击计数", exact: true })
          .click();
        assert.equal(await frame.locator("#count").textContent(), "1");
        assert.equal(
          await frame
            .locator("body")
            .evaluate(() => localStorage.getItem("count")),
          "1",
        );
      }
      assert.equal(
        await frame.locator("body").evaluate(() => typeof window.actwill),
        "undefined",
      );
      assert.equal(
        await frame.locator("body").evaluate(() => typeof window.require),
        "undefined",
      );
      assert.equal(
        await frame.locator("body").evaluate(() => {
          try {
            return parent.document.title;
          } catch {
            return "isolated";
          }
        }),
        "isolated",
      );
      await page
        .locator(".html-host iframe")
        .evaluate((el) => (window.__htmlFrame = el));
      for (let i = 0; i < 3; i++)
        await page.locator('[data-action="sidebarToggle"]').click();
      assert.equal(
        await page.evaluate(
          () =>
            window.__htmlFrame === document.querySelector(".html-host iframe"),
        ),
        true,
      );
      assert.equal(reads.length, 1);
      assert.deepEqual(network, []);
      assert.equal(
        await page.locator(".html-host").getAttribute("data-html-source"),
        source,
      );
      console.log(
        JSON.stringify({
          sourceChars: source.length,
          privateUserSample: !!input,
          readCount: reads.length,
          networkRequests: network.length,
          mainErrors: errors.filter(
            (e) => !e.includes("Content Security Policy"),
          ).length,
        }),
      );
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
  },
);
