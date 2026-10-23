import { normalizeImageFixture } from "../helpers/image-workbook.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { generateDocument } from "../../runtime/documents.mjs";
import { Store } from "../../core.mjs";
import {
  createDocumentService,
  documentViews,
} from "../../services/documents.mjs";
import ExcelJS from "exceljs";
test("production UI click Preview renders actual Word, styled multi-sheet Excel and all PPT slides offline", async () => {
  const root = path.resolve(import.meta.dirname, "../../src"),
    dir = await mkdtemp(path.join(tmpdir(), "wb-preview-")),
    store = new Store(dir);
  await store.load();
  const service = createDocumentService({ store });
  let nativeCalls = 0,
    previewReads = 0,
    browser;
  const server = createServer(async (req, res) => {
    try {
      const f = path.resolve(
        root,
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!f.startsWith(root + "/")) throw Error();
      res.setHeader(
        "Content-Type",
        f.endsWith(".html")
          ? "text/html"
          : f.endsWith(".js")
            ? "text/javascript"
            : "application/octet-stream",
      );
      res.end(await readFile(f));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
    });
    const page = await browser.newPage(),
      external = [],
      errors = [];
    page.on("request", (r) => {
      if (
        !r.url().startsWith(origin) &&
        !r.url().startsWith("data:") &&
        !r.url().startsWith("blob:")
      )
        external.push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.exposeFunction("hostRun", (name, p) => {
      if (name === "state")
        return {
          ...structuredClone(store.data),
          documents: documentViews(store.data),
        };
      if (name === "documentPreview") {
        previewReads++;
        return service.preview(p.id, p.revision);
      }
      nativeCalls++;
      throw Error("Unexpected " + name);
    });
    await page.addInitScript(() => {
      window.actwill = {
        state: async () => {
          const value = await window.hostRun("state");
          window.__stateCalls = (window.__stateCalls || 0) + 1;
          return value;
        },
        documentPreview: (p) => window.hostRun("documentPreview", p),
        onRuntime: (fn) => (window.__runtime = fn),
      };
    });
    const word = await generateDocument(
      "docx",
      JSON.stringify({
        title: "完整报告",
        blocks: [
          {
            type: "table",
            rows: [
              ["项目", "数值"],
              ["订单", "42"],
            ],
          },
          { type: "paragraph", text: "最后一段也能看到" },
        ],
      }),
    );
    const wb = new ExcelJS.Workbook(),
      s = wb.addWorksheet("销售总表");
    s.addRow(["季度收入报告"]);
    s.mergeCells("A1:C1");
    s.getCell("A1").font = {
      bold: true,
      size: 20,
      color: { argb: "FF0078CB" },
    };
    s.addRow(["产品", "数量", "金额"]);
    s.addRow(["服务", 5, 1600]);
    const second = wb.addWorksheet("第二张表");
    second.addRow(["末表内容"]);
    const image = wb.addImage({
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
        "base64",
      ),
      extension: "png",
    });
    s.getColumn(4).width = 8;
    s.getColumn(4).hidden = true;
    s.getCell("A5").value = "隐藏行";
    s.getRow(5).hidden = true;
    s.getColumn(2).width = 18;
    s.getRow(2).height = 30;
    s.addImage(image, {
      tl: { col: 1, row: 1 },
      ext: { width: 48, height: 32 },
    });
    s.addImage(image, { tl: { col: 4, row: 3 }, br: { col: 6, row: 6 } });
    second.addImage(image, {
      tl: { col: 0, row: 0 },
      ext: { width: 24, height: 20 },
    });

    const excelBytes = normalizeImageFixture(
      Buffer.from(await wb.xlsx.writeBuffer()),
    );
    await writeFile(path.join(dir, "anchors.xlsx"), excelBytes);
    execFileSync(
      "python3",
      [
        "-c",
        `import sys,openpyxl
w=openpyxl.load_workbook(sys.argv[1]);s=w.worksheets[0]
assert len(s._images)==2 and len(w.worksheets[1]._images)==1
assert s._images[0].anchor._from.col==1 and s._images[0].anchor._from.row==1
assert s._images[1].anchor.to.col==6 and s._images[1].anchor.to.row==6
assert any(d.min<=4<=d.max and d.hidden for d in s.column_dimensions.values()) and s.row_dimensions[5].hidden
print('Independent openpyxl anchors and hidden dimensions passed')`,
        path.join(dir, "anchors.xlsx"),
      ],
      { stdio: "inherit" },
    );
    const ppt = await generateDocument(
      "pptx",
      JSON.stringify({
        slides: [
          { title: "第一张幻灯片", bullets: ["实际内容"] },
          { title: "第二张幻灯片", bullets: ["最后一页"] },
        ],
      }),
    );
    for (const [format, bytes] of [
      ["docx", word.bytes],
      ["xlsx", excelBytes],
      ["pptx", ppt.bytes],
    ]) {
      const { document: d } = await service.importFile(
        "预览-" + format,
        format,
        bytes,
      );
      await page.goto(origin + "/index.html");
      await page.locator(".sidebar [data-page=library]").click();
      await page
        .locator(`[data-document="${d.id}"] [data-action=documentView]`)
        .click();
      assert.equal(
        await page.locator("[data-action=documentGenOffice]").count(),
        0,
      );
      const frame = page.frameLocator("iframe.office-frame");
      await frame
        .locator("body[data-ready=true],body[data-error=true]")
        .waitFor({ timeout: 30000 });
      assert.equal(
        await frame.locator("body").getAttribute("data-error"),
        null,
        await frame.locator("#status").innerText(),
      );
      if (format === "docx") {
        await frame.getByText("最后一段也能看到", { exact: true }).waitFor();
        assert.ok(await frame.locator("table").count());
      }
      if (format === "xlsx") {
        assert.equal(await frame.locator('td[colspan="3"]').count(), 1);
        assert.equal(
          await frame
            .locator("section:not([hidden]) [data-address=A1]")
            .evaluate((e) => e.style.fontWeight),
          "bold",
        );
        const positions = await frame
          .locator("section:not([hidden])")
          .evaluate((section) => {
            const table = section
                .querySelector("table")
                .getBoundingClientRect(),
              images = [
                ...section.querySelectorAll("img.spreadsheet-image"),
              ].map((e) => {
                const r = e.getBoundingClientRect();
                return {
                  left: r.left - table.left,
                  top: r.top - table.top,
                  width: r.width,
                  height: r.height,
                  loaded: e.complete && e.naturalWidth > 0,
                };
              });
            const at = (a) => {
              const r = section
                .querySelector("[data-address=" + a + "]")
                .getBoundingClientRect();
              return { left: r.left - table.left, top: r.top - table.top };
            };
            return { images, one: at("B2"), two: at("E4"), end: at("G7") };
          });
        assert.equal(positions.images.length, 2);
        assert.ok(positions.images.every((i) => i.loaded));
        for (const [image, cell] of [
          [positions.images[0], positions.one],
          [positions.images[1], positions.two],
        ]) {
          assert.ok(
            Math.abs(image.left - cell.left) < 2,
            JSON.stringify(positions),
          );
          assert.ok(
            Math.abs(image.top - cell.top) < 2,
            JSON.stringify(positions),
          );
        }
        assert.equal(Math.round(positions.images[0].width), 48);
        assert.equal(Math.round(positions.images[0].height), 32);
        assert.ok(
          Math.abs(
            positions.images[1].width -
              (positions.end.left - positions.two.left),
          ) < 2,
          JSON.stringify(positions),
        );
        assert.ok(
          Math.abs(
            positions.images[1].height -
              (positions.end.top - positions.two.top),
          ) < 2,
          JSON.stringify(positions),
        );
        await frame
          .getByRole("button", { name: "第二张表", exact: true })
          .click();
        await frame.getByText("末表内容", { exact: true }).waitFor();
        assert.equal(
          await frame
            .locator("section:not([hidden]) img.spreadsheet-image")
            .count(),
          1,
        );
        const initialReads = previewReads;
        await page.evaluate(() => {
          window.__previewFrame = document.querySelector("iframe.office-frame");
          document.querySelector(".preview-scroll").scrollTop = 73;
        });
        for (let i = 0; i < 12; i++) {
          const calls = await page.evaluate(() => window.__stateCalls);
          await page.evaluate(() => window.__runtime());
          await page.waitForFunction((n) => window.__stateCalls > n, calls);
          await page.locator("[data-action=sidebarToggle]").click();
        }
        assert.equal(
          previewReads,
          initialReads,
          "runtime updates must not re-read binary",
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.__previewFrame ===
              document.querySelector("iframe.office-frame"),
          ),
          true,
        );
        await frame.getByText("末表内容", { exact: true }).waitFor();
        assert.equal(await frame.locator("section:not([hidden])").count(), 1);
        await page.locator("[data-action=sidebarToggle]").click();
        assert.equal(previewReads, initialReads);
        assert.equal(
          await page.evaluate(
            () =>
              window.__previewFrame ===
              document.querySelector("iframe.office-frame"),
          ),
          true,
        );
        // New revision must never reuse the old rendered document.
        const prepared = await service.prepare("document_edit", {
          id: d.id,
          expectedRevision: d.revision,
          cells: [{ sheetIndex: 1, address: "B3", value: 9 }],
        });
        await service.perform(prepared);
        const calls = await page.evaluate(() => window.__stateCalls);
        await page.evaluate(() => window.__runtime());
        await page.waitForFunction((n) => window.__stateCalls > n, calls);
        await page.locator("[data-action=sidebarToggle]").click();
        await page.waitForFunction(
          () =>
            window.__previewFrame !==
            document.querySelector("iframe.office-frame"),
        );
        await frame.locator("body[data-ready=true]").waitFor();
        assert.equal(previewReads, initialReads + 1);
        await frame
          .locator("section:not([hidden]) [data-address=B3]")
          .filter({ hasText: "9" })
          .waitFor();
      }
      if (format === "pptx")
        await frame.getByText("第二张幻灯片", { exact: true }).waitFor();
    }
    assert.equal(nativeCalls, 0);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
