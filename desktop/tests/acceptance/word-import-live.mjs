import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import { ToolRuntime } from "../../runtime/tools.mjs";
import { documentViews } from "../../services/documents.mjs";
import { wordFixture } from "../helpers/word-fixture.mjs";
import { openPackage, sha256 } from "../../runtime/documents.mjs";

test("production Chromium: import existing DOCX, run text/marks/header/table edit, binary export and disk reload", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-word-import-")),
    store = new Store(dir);
  await store.load();
  const input = await wordFixture(),
    root = path.resolve(fileURLToPath(new URL("../../src/", import.meta.url)));
  let exported,
    approvals = 0;
  const runtime = new ToolRuntime({
      store,
      approve: async () => {
        approvals++;
        return true;
      },
    }),
    docs = runtime.documents;
  const server = createServer(async (req, res) => {
    try {
      const f = path.resolve(
        root,
        "." + (req.url === "/" ? "/index.html" : req.url),
      );
      if (!f.startsWith(root + path.sep)) throw Error("outside");
      res.setHeader(
        "content-type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
        }[path.extname(f)] || "application/octet-stream",
      );
      res.end(await readFile(f));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
    }),
    page = await browser.newPage({ viewport: { width: 1440, height: 1060 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.exposeFunction("host", async (n, p) => {
      if (n === "state")
        return {
          ...structuredClone(store.data),
          documents: documentViews(store.data),
        };
      if (n === "documentImport")
        return docs.importFile("导入的品牌报告", "docx", input);
      if (n === "documentEditor") return docs.editor(p.id, p.mode);
      if (n === "documentSaveEditor")
        return docs.updateEditor(p.id, p.revision, p.patch, async () => {
          approvals++;
          return true;
        });
      if (n === "documentExport") {
        const d = docs.bytes(p.id, p.revision);
        exported = path.join(dir, "edited.docx");
        await writeFile(exported, d.bytes);
        return { saved: true };
      }
      throw Error("unexpected " + n);
    });
    await page.addInitScript(() => {
      window.actwill = Object.fromEntries(
        [
          "state",
          "documentImport",
          "documentEditor",
          "documentSaveEditor",
          "documentExport",
        ].map((n) => [n, (p) => window.host(n, p)]),
      );
    });
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator('[data-page="library"]').click();
    await page.getByRole("button", { name: "导入文档", exact: true }).click();
    await page
      .locator("[data-document] h3")
      .filter({ hasText: "导入的品牌报告" })
      .waitFor();
    await page
      .getByRole("button", { name: "Word 分段编辑", exact: true })
      .click();
    await page.locator("#wordRuns [data-word-run]").first().waitFor();
    const run = page.locator("[data-word-run]").filter({ hasText: "草案" });
    await run.fill("正式版");
    await page.locator('[data-word-mark="bold"]').click();
    await page.locator('[data-word-mark="italic"]').click();
    const table = page
      .locator("[data-word-run]")
      .filter({ hasText: "预算1000" });
    await table.fill("预算2800");
    const header = page
      .locator("[data-word-run]")
      .filter({ hasText: "品牌页眉" });
    await header.fill("WillBuddy 品牌页眉");
    assert.equal(
      await page.locator(".word-readonly [contenteditable]").count(),
      0,
    );
    assert.ok((await page.locator(".word-readonly").count()) >= 2);
    await mkdir(new URL("../../../docs/images/", import.meta.url), {
      recursive: true,
    });
    await page.screenshot({
      path: fileURLToPath(
        new URL("../../../docs/images/imported-word.png", import.meta.url),
      ),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "保存Word新版本", exact: true })
      .click();
    await page.waitForFunction(() => !document.querySelector("#modal").open);
    assert.equal(docs.list()[0].revision, 2);
    assert.equal(approvals, 1);
    await page.getByRole("button", { name: "导出文件", exact: true }).click();
    await page.waitForFunction(() => true);
    assert.ok(exported);
    const output = await readFile(exported),
      a = openPackage(input),
      b = openPackage(output);
    for (const n of Object.keys(a))
      if (!["word/document.xml", "word/header1.xml"].includes(n))
        assert.equal(sha256(a[n]), sha256(b[n]), n);
    const result = execFileSync(
      "python3",
      [
        "-c",
        `from docx import Document
import sys
x=Document(sys.argv[1]); p=x.paragraphs[0]
assert p.text=='季度正式版'
assert p.runs[0].bold and p.runs[0].font.color.rgb.__str__()=='0078CB'
assert p.runs[1].bold and p.runs[1].italic is False and p.runs[1].font.size.pt==14
assert x.tables[0].cell(0,0).text=='预算2800'
assert x.sections[0].header.paragraphs[0].text=='WillBuddy 品牌页眉'
assert len(x.inline_shapes)==1
assert x.sections[0].footer.paragraphs[0].text=='保留页脚'
print('python-docx: text, direct formatting, existing size/color, table, image, header/footer passed')`,
        exported,
      ],
      { encoding: "utf8" },
    );
    console.log(result.trim());
    assert.equal(sha256(docs.bytes(docs.list()[0].id, 1).bytes), sha256(input));
    const reloaded = new Store(dir);
    await reloaded.load();
    assert.equal(reloaded.data.documents[0].revision, 2);
    assert.equal(reloaded.data.documents[0].sha256, sha256(output));
    await page.reload();
    await page.locator('[data-page="library"]').click();
    await page
      .getByRole("button", { name: "Word 分段编辑", exact: true })
      .click();
    await page
      .locator("[data-word-run]")
      .filter({ hasText: "正式版" })
      .waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
