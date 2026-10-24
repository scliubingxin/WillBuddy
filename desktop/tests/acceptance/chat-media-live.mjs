import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { initialState } from "../../core.mjs";
test(
  "production chat renders real image/video bytes and local charts, no network until click, survives redraw and opens links",
  { timeout: 60000 },
  async () => {
    const root = path.resolve(
        fileURLToPath(new URL("../../src/", import.meta.url)),
      ),
      requests = [],
      calls = [];
    const chart = {
      type: "bar",
      title: "演示数据 · 月度收入",
      labels: ["一月", "二月", "三月"],
      series: [{ name: "收入", values: [12, 21, 18] }],
    };
    const content =
      "# 图文分析报告\n\n以下是合成验收数据。\n\n![品牌色示意](https://media.example.com/chart.png)\n\n[演示视频](https://media.example.com/demo.webm)\n\n[资料链接](https://www.example.com/report)\n\n```chart\n" +
      JSON.stringify(chart) +
      "\n```\n\n```chart\n" +
      JSON.stringify({ ...chart, type: "line" }) +
      "\n```\n\n```chart\n" +
      JSON.stringify({ ...chart, type: "pie" }) +
      "\n```";
    const server = createServer(async (req, res) => {
      try {
        const name = decodeURIComponent(
            new URL(req.url, "http://localhost").pathname,
          ),
          file = path.resolve(
            root,
            "." + (name === "/" ? "/index.html" : name),
          );
        if (!file.startsWith(root + path.sep)) throw Error();
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
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH,
      });
      const page = await browser.newPage({
          viewport: { width: 1440, height: 960 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const png = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
          "base64",
        ),
        video = await readFile(
          new URL("../fixtures/chat-sample.webm", import.meta.url),
        );
      await page.route("https://media.example.com/**", async (route) => {
        requests.push({
          url: route.request().url(),
          headers: route.request().headers(),
        });
        const isVideo = route.request().url().endsWith(".webm");
        await route.fulfill({
          status: 200,
          headers: {
            "access-control-allow-origin": "*",
            "content-type": isVideo ? "video/webm" : "image/png",
          },
          body: isVideo ? video : png,
        });
      });
      const s = initialState();
      s.settings.hasKey = true;
      s.chats = [
        {
          id: "rich",
          name: "富媒体展示验收",
          time: Date.now(),
          run: { id: "r", status: "completed" },
          messages: [{ id: "m", role: "assistant", runId: "r", content }],
        },
      ];
      await page.exposeFunction("recordLink", (p) => calls.push(p));
      await page.addInitScript((data) => {
        if (window !== window.top) return;
        window.actwill = {
          state: async () => structuredClone(data),
          onRuntime: (fn) => (window.__runtime = fn),
          openBrowser: async (p) => window.recordLink(p),
        };
      }, s);
      console.log("stage: boot");
      await page.goto("http://127.0.0.1:" + server.address().port);
      await page.locator('.recent [data-id="rich"]').click();
      await page.locator(".chat-chart svg").first().waitFor();
      assert.equal(await page.locator(".chat-chart").count(), 3);
      assert.equal(await page.locator(".chat-media").count(), 2);
      assert.equal(requests.length, 0);
      assert.equal(await page.locator(".chat-media iframe").count(), 0);
      console.log("stage: image", errors);
      await page.getByRole("button", { name: "查看图片", exact: true }).click();
      const imageFrame = page.frameLocator('iframe[title="对话图片查看器"]');
      await imageFrame.locator("img").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector(".chat-media .media-load").disabled &&
          !document.querySelector(".chat-media .preview-loading"),
      );
      await imageFrame
        .locator("img")
        .evaluate((el) =>
          Promise.race([
            el.decode(),
            new Promise((_, bad) =>
              setTimeout(() => bad(Error("image timeout")), 5000),
            ),
          ]),
        );
      assert.equal(
        await imageFrame.locator("img").evaluate((el) => el.naturalWidth),
        1,
      );
      await page
        .locator(".chat-media")
        .first()
        .getByRole("button", { name: "展开查看", exact: true })
        .click();
      assert.ok(
        await page
          .locator(".chat-media")
          .first()
          .evaluate((el) => el.classList.contains("media-expanded")),
      );
      assert.equal(requests.length, 1);
      assert.equal(requests[0].headers.referer, undefined);
      assert.equal(requests[0].headers.cookie, undefined);
      console.log("stage: video");
      await page.getByRole("button", { name: "加载视频", exact: true }).click();
      const player = page
        .frameLocator('iframe[title="对话视频播放器"]')
        .locator("video");
      await player.waitFor();
      await player.evaluate(
        (el) =>
          new Promise((ok, bad) => {
            if (el.readyState >= 1) return ok();
            setTimeout(
              () => bad(Error("video metadata timeout " + el.readyState)),
              5000,
            );
            el.addEventListener("loadedmetadata", ok, { once: true });
            el.addEventListener("error", bad, { once: true });
          }),
      );
      assert.equal(await player.evaluate((el) => el.paused), true);
      assert.equal(await player.getAttribute("autoplay"), null);
      assert.equal(await player.evaluate((el) => el.videoWidth), 160);
      await player.evaluate((el) => el.play());
      await page.waitForTimeout(200);
      assert.ok((await player.evaluate((el) => el.currentTime)) > 0);
      await player.evaluate((el) => el.pause());
      console.log("stage: redraw");
      const before = requests.length;
      await page
        .locator('iframe[title="对话视频播放器"]')
        .evaluate((el) => (window.__mediaFrame = el));
      for (let i = 0; i < 5; i++) {
        await page.locator('[data-action="sidebarToggle"]').click();
        assert.equal(
          await page.evaluate(
            () =>
              window.__mediaFrame ===
              document.querySelector('iframe[title="对话视频播放器"]'),
          ),
          true,
        );
      }
      assert.equal(requests.length, before);
      assert.equal(
        await player.evaluate((el) => typeof window.actwill),
        "undefined",
      );
      assert.equal(
        await player.evaluate((el) => typeof window.require),
        "undefined",
      );
      await page.getByRole("link", { name: "资料链接", exact: true }).click();
      assert.deepEqual(calls, [{ url: "https://www.example.com/report" }]);
      await page.locator(".chat-chart summary").first().click();
      assert.match(
        await page.locator(".chat-chart table").first().innerText(),
        /12/,
      );
      await page.setViewportSize({ width: 1000, height: 720 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const out = process.env.UI_SCREENSHOT_DIR;
      if (out) {
        await mkdir(out, { recursive: true });
        await page
          .locator(".messages-scroll")
          .evaluate((el) => (el.scrollTop = 0));
        await page.screenshot({ path: path.join(out, "chat-rich-media.png") });
        await page.locator(".chat-chart").first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, "chat-rich-charts.png") });
      }
      await page
        .locator(".chat-media")
        .nth(1)
        .getByRole("button", { name: "关闭媒体", exact: true })
        .click();
      assert.equal(
        await page.locator('iframe[title="对话视频播放器"]').count(),
        0,
      );
      await page.reload();
      await page.locator('.recent [data-id="rich"]').click();
      assert.equal(await page.locator(".chat-media iframe").count(), 0);
      assert.equal(requests.length, before);
      assert.equal(await page.locator(".chat-chart").count(), 3);
      assert.deepEqual(errors, []);
      console.log(
        "PASS real Chromium production ESM, real PNG decode/WebM metadata+playback; HTTPS responses intercepted fixture, native bridge fixture; no Mac/real remote provider/model claim",
      );
    } finally {
      await browser?.close();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
  },
);
