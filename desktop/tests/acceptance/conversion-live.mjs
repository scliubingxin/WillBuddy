import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Store } from "../../core.mjs";
import { ToolRuntime } from "../../runtime/tools.mjs";
import { documentViews } from "../../services/documents.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createDocumentConverter } from "../../runtime/document-converter.mjs";
import { conversionDriver } from "../helpers/conversion-driver.mjs";
import { openPackage } from "../../runtime/documents.mjs";
import { createDocumentService } from "../../services/documents.mjs";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
test("actual GenOffice engine + real Chromium: editable Markdown/HTML Word, safe source and revision approval", async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  const dir = await mkdtemp(path.join(tmpdir(), "wb-convert-"));
  let clean = "",
    requests = [];
  const convert = createDocumentConverter({
    createDriver: () =>
      conversionDriver(browser, {
        onClean: (s) => {
          clean = s;
        },
        onRequest: (u) => requests.push(u),
      }),
  });
  try {
    const result = await convert(
      "md",
      "# 中文项目方案\n\n这是**加粗内容**。\n\n- 调研\n- 验收\n\n| 项目 | 预算 |\n| --- | --- |\n| 开发 | 1280 |",
    );
    console.log(result.conversion, result.text);
    const files = openPackage(result.bytes),
      xml = Buffer.from(files["word/document.xml"]).toString();
    assert.match(xml, /中文项目方案/);
    assert.match(xml, /加粗内容/);
    assert.match(xml, /<w:tbl>/);
    assert.match(xml, /<w:b/);
    assert.match(xml, /<w:numPr>/);
    await writeFile(path.join(dir, "actual.docx"), result.bytes);
    const parsed = execFileSync(
      "python3",
      [
        "-c",
        'from docx import Document; import sys; d=Document(sys.argv[1]); assert len(d.tables)==1; assert "1280" in d.tables[0].cell(1,1).text; assert any(r.bold for p in d.paragraphs for r in p.runs); print("Independent python-docx table and bold checks passed")',
        path.join(dir, "actual.docx"),
      ],
      { encoding: "utf8" },
    );
    console.log(parsed.trim());
    const malicious =
      '<meta http-equiv="refresh" content="0;url=https://blocked.example"><script>fetch("https://blocked.example/secret")</script><img src="file:///etc/passwd"><iframe src="https://blocked.example"></iframe><p style="background-image:url(https://blocked.example/pixel);color:#0078cb" onclick="bad()">安全正文</p><a href="https://blocked.example">链接文字</a>';
    const safe = await convert("html", malicious);
    assert.match(safe.text, /安全正文/);
    assert.ok(
      !/blocked\.example|file:\/\/\/etc|<script|<iframe|<img|onclick/.test(
        clean,
      ),
    );
    assert.deepEqual(requests, []);
    const store = { data: { documents: [] }, save: async () => {} },
      service = createDocumentService({ store, convertDocument: convert });
    const imported = await service.importFile(
      "报告",
      "md",
      Buffer.from("# 源文档\n\n正文"),
    );
    const token = await service.prepare("document_convert", {
      id: imported.document.id,
      expectedRevision: 1,
    });
    const converted = await service.perform(token);
    assert.equal(converted.document.format, "docx");
    assert.equal(converted.verified, true);
    assert.equal(service.read(imported.document.id).revision, 1);
    assert.match(service.bytes(converted.document.id, 1).name, /Word/);
    console.log(
      "PASS: real GenOffice HTML/Markdown extraction + editable OOXML generation + independent Python reader; Electron/native approvals remain untested.",
    );
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("production Word canvas -> real GenOffice -> revision edit and actual DOCX export", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-canvas-")),
    store = new Store(dir);
  await store.load();
  let exported;
  const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
    }),
    page = await browser.newPage({ viewport: { width: 1380, height: 960 } });
  const root = path.resolve(
    fileURLToPath(new URL("../../src/", import.meta.url)),
  );
  const server = createServer(async (req, res) => {
    try {
      const file = path.resolve(
        root,
        "." + (req.url === "/" ? "/index.html" : req.url),
      );
      if (!file.startsWith(root + path.sep)) throw Error("outside");
      res.setHeader(
        "Content-Type",
        {
          ".js": "text/javascript",
          ".html": "text/html",
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
  const converter = createDocumentConverter({
      createDriver: () => conversionDriver(browser),
    }),
    tools = new ToolRuntime({
      store,
      approve: async () => true,
      convertDocument: converter,
    });
  try {
    await page.exposeFunction("host", async (n, p) => {
      if (n === "state")
        return {
          ...structuredClone(store.data),
          documents: documentViews(store.data),
        };
      if (n === "documentOperation") {
        const { operation, ...args } = p;
        return tools.execute(operation, args);
      }
      if (n === "documentRichEditor") return tools.documents.richEditor(p.id);
      if (n === "documentExport") {
        const r = tools.documents.bytes(p.id, p.revision);
        exported = path.join(dir, "export.docx");
        await writeFile(exported, r.bytes);
        return { saved: true };
      }
      throw Error("unexpected bridge " + n);
    });
    await page.addInitScript(() => {
      window.actwill = Object.fromEntries(
        [
          "state",
          "documentOperation",
          "documentRichEditor",
          "documentExport",
        ].map((n) => [n, (p) => window.host(n, p)]),
      );
      window.actwill.onRuntime = () => {};
      window.actwill.onStream = () => {};
    });
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator('.sidebar [data-page="library"]').click();
    await page
      .getByRole("button", { name: "写 Word 文档", exact: true })
      .click();
    await page.locator('[name="canvasName"]').fill("内部Word画布验收");
    const canvas = page.getByRole("textbox", { name: "Word正文", exact: true });
    await canvas.fill("可编辑标题");
    await canvas.press("ControlOrMeta+A");
    await page.getByRole("button", { name: "标题", exact: true }).click();
    await canvas.press("End");
    await canvas.press("Enter");
    await page.getByRole("button", { name: "正文", exact: true }).click();
    await canvas.pressSequentially("正文内容");
    await canvas.press("Home");
    await canvas.press("Shift+End");
    await page.getByRole("button", { name: "粗体", exact: true }).click();
    await canvas.press("End");
    await canvas.press("Enter");
    await page.getByRole("button", { name: "正文", exact: true }).click();
    await page.getByRole("button", { name: "插入表格", exact: true }).click();
    await page
      .getByRole("button", { name: "保存为 Word", exact: true })
      .click();
    await page
      .locator("[data-document] .badge")
      .filter({ hasText: "v1" })
      .waitFor();
    assert.equal(store.data.documents.length, 1);
    const id = store.data.documents[0].id;
    assert.match(store.data.documents[0].text, /可编辑标题/);
    assert.equal(store.data.documents[0].format, "docx");
    assert.ok(store.data.documents[0].richSource);
    await page.getByRole("button", { name: "Word 画布", exact: true }).click();
    await canvas.locator("h2").first().fill("修改后的标题");
    await page.addStyleTag({
      content:
        'body::after{content:"真实引擎验收 · 合成测试数据 · 原生桥与审批为夹具";position:fixed;bottom:4px;left:12px;background:white;color:#0078cb;z-index:99999;font-size:11px}',
    });
    await mkdir(path.resolve(root, "../../docs/images"), { recursive: true });
    await page.screenshot({
      path: path.resolve(root, "../../docs/images/word-canvas.png"),
    });
    await page
      .getByRole("button", { name: "保存为 Word", exact: true })
      .click();
    await page
      .locator("[data-document] .badge")
      .filter({ hasText: "v2" })
      .waitFor();
    await page.getByRole("button", { name: "导出文件", exact: true }).click();
    for (let i = 0; i < 100 && !exported; i++)
      await new Promise((r) => setTimeout(r, 10));
    assert.equal((await readFile(exported)).subarray(0, 2).toString(), "PK");
    const word = execFileSync(
      "python3",
      [
        "-c",
        'from docx import Document; import sys; d=Document(sys.argv[1]); assert any("修改后的标题" in p.text for p in d.paragraphs); assert len(d.tables)==1; print("UI-exported editable DOCX parsed independently")',
        exported,
      ],
      { encoding: "utf8" },
    );
    console.log(word.trim());
    const reloaded = new Store(dir);
    await reloaded.load();
    assert.equal(reloaded.data.documents.find((d) => d.id === id).revision, 2);
    assert.ok(reloaded.data.documents[0].richSource);
    assert.equal(reloaded.data.documents[0].history.length, 1);
    await page.reload();
    await page.locator('.sidebar [data-page="library"]').click();
    await page.getByRole("button", { name: "Word 画布", exact: true }).click();
    await canvas.filter({ hasText: "修改后的标题" }).waitFor();
    console.log(
      "PASS: production UI editing -> actual upstream GenOffice engine -> persisted revisions -> actual Word export. Native IPC/approval are fixtures.",
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
