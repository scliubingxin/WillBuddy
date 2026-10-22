import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import { Store } from "../../core.mjs";
import { ToolRuntime } from "../../runtime/tools.mjs";
import { documentViews } from "../../services/documents.mjs";
import { documentEditor } from "../../runtime/documents.mjs";
const spec = {
  sheets: [
    {
      name: "计划",
      rows: [
        ["项目", "单价", "数量", "金额"],
        ["调研", 120, 3, { formula: "B2*C2" }],
        ["开发", 250, 4, { formula: "B3*C3" }],
        ["合计", null, null, { formula: "SUM(D2:D3)" }],
        ["均价", { formula: "ROUND(AVERAGE(B2:B3),2)" }],
        ["状态", { formula: 'IF(D4>1500,"超预算","正常")' }],
        ["普通文本", "=SUM(D2:D3)"],
      ],
    },
    {
      name: "汇总",
      rows: [
        ["预算结果"],
        [{ formula: "'计划'!D4" }],
        [{ formula: "MAX('计划'!B2:B3)" }],
      ],
    },
  ],
};
test("real production Chromium XLSX formula preview/edit/export/reload + independent openpyxl and LibreOffice recalculation sample", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-formula-ui-")),
    store = new Store(dir);
  await store.load();
  const root = path.resolve(
    fileURLToPath(new URL("../../src/", import.meta.url)),
  );
  let exported,
    saveCalls = 0;
  const runtime = new ToolRuntime({ store, approve: async () => true }),
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
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  try {
    await page.exposeFunction("host", async (n, p) => {
      if (n === "state")
        return {
          ...structuredClone(store.data),
          documents: documentViews(store.data),
        };
      if (n === "documentOperation") {
        const { operation, ...args } = p;
        return runtime.execute(operation, args);
      }
      if (n === "documentEditor") return docs.editor(p.id);
      if (n === "documentSaveEditor") {
        saveCalls++;
        return docs.updateEditor(p.id, p.revision, p.patch, async () => true);
      }
      if (n === "documentExport") {
        const x = docs.bytes(p.id, p.revision);
        exported = path.join(dir, "export.xlsx");
        await writeFile(exported, x.bytes);
        return { saved: true };
      }
      throw Error("unexpected bridge " + n);
    });
    await page.addInitScript(() => {
      window.actwill = Object.fromEntries(
        [
          "state",
          "documentOperation",
          "documentEditor",
          "documentSaveEditor",
          "documentExport",
        ].map((n) => [n, (p) => window.host(n, p)]),
      );
    });
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator('[data-page="library"]').click();
    await page.getByRole("button", { name: "新建文档", exact: true }).click();
    await page.locator('[name="documentName"]').fill("季度预算（验收样本）");
    await page.locator('[name="format"]').selectOption("xlsx");
    await page.locator('[name="documentContent"]').fill(JSON.stringify(spec));
    await page.getByRole("button", { name: "审阅并创建", exact: true }).click();
    await page
      .locator("[data-document] h3")
      .filter({ hasText: "季度预算" })
      .waitFor();
    assert.equal(store.data.documents.length, 1);
    await page.getByRole("button", { name: "编辑内容", exact: true }).click();
    await page.getByLabel("计划!C2", { exact: true }).fill("5");
    await page
      .locator('tr:has(input[aria-label="计划!D4"]) [data-result]')
      .filter({ hasText: "1600" })
      .waitFor();
    await page.locator('[data-sheet-tab="2"]').click();
    await page
      .locator('tr:has(input[aria-label="汇总!A2"]) [data-result]')
      .filter({ hasText: "1600" })
      .waitFor();
    await page.locator('[data-sheet-tab="1"]').click();
    assert.equal(
      await page.getByLabel("计划!C2", { exact: true }).inputValue(),
      "5",
    );
    await page.getByLabel("新增单元格地址", { exact: true }).fill("F10");
    await page.locator("[data-sheet-add]").click();
    await page
      .getByLabel("计划!F10 类型", { exact: true })
      .selectOption("formula");
    await page
      .getByLabel("计划!F10", { exact: true })
      .fill('WEBSERVICE("https://blocked.example/secret")');
    await page
      .getByRole("button", { name: "保存表格新版本", exact: true })
      .click();
    assert.equal(saveCalls, 0);
    assert.equal(docs.list()[0].revision, 1);
    assert.equal(await page.locator("#modal").evaluate((n) => n.open), true);
    assert.ok(!requests.some((u) => u.includes("blocked.example")));
    await page.getByLabel("计划!F10", { exact: true }).fill("ROUND(D4/3,2)");
    await page
      .locator('tr:has(input[aria-label="计划!F10"]) [data-result]')
      .filter({ hasText: "533.33" })
      .waitFor();
    await page.locator("[data-formulas-only]").check();
    await page.locator("#modal").evaluate((n) => (n.scrollTop = 0));
    await mkdir(new URL("../../../docs/images/", import.meta.url), {
      recursive: true,
    });
    await page.screenshot({
      path: fileURLToPath(
        new URL(
          "../../../docs/images/spreadsheet-formulas.png",
          import.meta.url,
        ),
      ),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "保存表格新版本", exact: true })
      .click();
    await page.waitForFunction(() => !document.querySelector("#modal").open);
    assert.equal(saveCalls, 1);
    assert.equal(docs.list()[0].revision, 2);
    await page.getByRole("button", { name: "导出文件", exact: true }).click();
    assert.ok(exported);
    const before = documentEditor("xlsx", await readFile(exported));
    assert.equal(before.cells.find((c) => c.address === "D4").value, 1600);
    const read = execFileSync(
      "python3",
      [
        "-c",
        `from openpyxl import load_workbook
import sys
f=load_workbook(sys.argv[1],data_only=False);v=load_workbook(sys.argv[1],data_only=True)
assert f['计划']['D4'].value=='=SUM(D2:D3)'
assert v['计划']['D4'].value==1600 and v['汇总']['A2'].value==1600
assert v['计划']['F10'].value==533.33 and v['计划']['B6'].value=='超预算'
assert f['计划']['B7'].data_type=='s' and f['计划']['B7'].value=='=SUM(D2:D3)'
print('openpyxl: explicit formulas, updated caches, cross-sheet results and inert text passed')`,
        exported,
      ],
      { encoding: "utf8" },
    );
    console.log(read.trim());
    const out = path.join(dir, "libreoffice"),
      profile = path.join(dir, "lo-profile");
    await mkdir(out);
    const lo = execFileSync(
      "soffice",
      [
        "--headless",
        "-env:UserInstallation=" + pathToFileURL(profile).href,
        "--convert-to",
        "xlsx",
        "--outdir",
        out,
        exported,
      ],
      { encoding: "utf8", timeout: 30000 },
    );
    console.log(lo.trim());
    const compared = execFileSync(
      "python3",
      [
        "-c",
        `from openpyxl import load_workbook
import sys,math
f=load_workbook(sys.argv[1],data_only=False);a=load_workbook(sys.argv[1],data_only=True);b=load_workbook(sys.argv[2],data_only=True);count=0
for s in f:
 for row in s:
  for c in row:
   if c.data_type=='f':
    x=a[s.title][c.coordinate].value;y=b[s.title][c.coordinate].value
    assert (math.isclose(x,y,rel_tol=1e-10,abs_tol=1e-8) if isinstance(x,(int,float)) else x==y),(s.title,c.coordinate,x,y)
    count+=1
assert count==8
print('Independent LibreOffice recalculation agrees for',count,'formula cells; this is a bounded sample, not Excel parity')`,
        exported,
        path.join(out, "export.xlsx"),
      ],
      { encoding: "utf8" },
    );
    console.log(compared.trim());
    const reload = new Store(dir);
    await reload.load();
    assert.equal(reload.data.documents[0].revision, 2);
    assert.equal(reload.data.documents[0].sha256, docs.list()[0].sha256);
    await page.reload();
    await page.locator('[data-page="library"]').click();
    await page.getByRole("button", { name: "编辑内容", exact: true }).click();
    await page
      .locator('tr:has(input[aria-label="计划!D4"]) [data-result]')
      .filter({ hasText: "1600" })
      .waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
