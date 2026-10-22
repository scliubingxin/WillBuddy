import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormula, calculateWorkbook } from "../src/shared/formula-core.js";
import {
  generateDocument,
  editDocument,
  documentEditor,
  openPackage,
} from "../runtime/documents.mjs";
import { createDocumentService } from "../services/documents.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import office from "../runtime/vendor/office.cjs";
import { JSDOM } from "jsdom";
import { mountSpreadsheet } from "../src/ui/spreadsheet.js";
import { runAgent } from "../runtime/agent.mjs";
import { complete } from "../core.mjs";
import { createServer } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const sheet = (entries, name = "预算") => ({
  name,
  cells: new Map(
    Object.entries(entries).map(([k, v]) => [
      k,
      typeof v === "object" && v !== null ? v : { value: v },
    ]),
  ),
});
const calc = (formula, values = {}) =>
  calculateWorkbook([sheet({ ...values, Z1: { formula } })]).values.get("0!Z1");
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
const create = () => generateDocument("xlsx", JSON.stringify(spec));
const values = (bytes) => documentEditor("xlsx", bytes).cells;
const at = (bytes, address, sheetIndex = 1) =>
  values(bytes).find(
    (c) => c.sheetIndex === sheetIndex && c.address === address,
  );
async function fixture() {
  const store = {
    data: { documents: [], executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  const docs = createDocumentService({ store });
  const d = (await docs.importFile("预算", "xlsx", (await create()).bytes))
    .document;
  return { store, docs, d };
}
test("formula grammar: precedence, unary, percent, power, comparisons and decimals", () => {
  assert.equal(calc("2+3*4"), 14);
  assert.equal(calc("(2+3)*4"), 20);
  assert.equal(calc("-2^2"), 4);
  assert.equal(calc("2^3^2"), 512);
  assert.equal(calc("50%*200"), 100);
  assert.equal(calc("1.5e2/3"), 50);
  assert.equal(calc("3>=2"), true);
});
test("same/cross-sheet and absolute references resolve by actual worksheet names", () => {
  const s = [
    sheet({ A1: 3, A2: 4, B1: { formula: "SUM($A$1:A2)" } }, "月报"),
    sheet({ A1: { formula: "'月报'!B1*2" } }, "汇总"),
  ];
  assert.equal(calculateWorkbook(s).values.get("1!A1"), 14);
  const escaped = [
    sheet({ A1: 9 }, "O'Brien"),
    sheet({ A1: { formula: "'O''Brien'!A1" } }, "Sum"),
  ];
  assert.equal(calculateWorkbook(escaped).values.get("1!A1"), 9);
});
test("aggregation ignores text/boolean references, supports counts/min/max/average", () => {
  const v = { A1: 2, A2: 8, A3: "not a number", A4: true };
  assert.equal(calc("SUM(A1:A4)", v), 10);
  assert.equal(calc("AVERAGE(A1:A4)", v), 5);
  assert.equal(calc("MIN(A1:A4)", v), 2);
  assert.equal(calc("MAX(A1:A4)", v), 8);
  assert.equal(calc("COUNT(A1:A4)", v), 2);
  assert.equal(calc("SUM(TRUE,2)"), 3);
  assert.equal(calc('COUNT("text",2)'), 1);
});
test("IF is lazy for computation; ROUND and cached string/bool/error results are explicit", () => {
  assert.equal(calc('IF(TRUE,"通过",1/0)'), "通过");
  assert.equal(calc("ROUND(-1.235,2)"), -1.24);
  assert.deepEqual(calc("1/0"), { error: "#DIV/0!" });
  assert.deepEqual(calc("SUM(A1:A2)", { A1: { value: { error: "#N/A" } } }), {
    error: "#N/A",
  });
  assert.deepEqual(calc("AVERAGE(A1:A2)"), { error: "#DIV/0!" });
});
test("cycles including inactive IF branches and missing sheet references reject the workbook", () => {
  for (const entries of [
    { A1: { formula: "A1" } },
    { A1: { formula: "B1" }, B1: { formula: "A1" } },
    { A1: { formula: "IF(FALSE,A1,1)" } },
  ])
    assert.throws(() => calculateWorkbook([sheet(entries)]), /循环/);
  assert.throws(() => calc("'不存在'!A1"), /不存在/);
});
test("no host execution, external references, named expressions or unsupported functions", () => {
  for (const f of [
    'WEBSERVICE("https://example.com")',
    'HYPERLINK("file:///tmp/x")',
    'INDIRECT("A1")',
    "NOW()",
    "_xlfn.SUM(A1:A2)",
    "[1]Sheet!A1",
    "Table1[金额]",
    "process.exit()",
    "globalThis.x=1",
    "SUM(1,,2)",
    "A0",
    "XFE1",
  ])
    assert.throws(() => parseFormula(f), /公式/);
  assert.equal(globalThis.x, undefined);
});
test("parser/range/cell/formula/operation bounds fail closed", () => {
  assert.throws(() => parseFormula("1".repeat(1001)));
  assert.throws(() => parseFormula("SUM(A1:A10001)"));
  assert.throws(() => parseFormula("(".repeat(65) + "1" + ")".repeat(65)));
  assert.throws(
    () =>
      calculateWorkbook([
        sheet(
          Object.fromEntries(
            Array.from({ length: 5001 }, (_, i) => ["A" + (i + 1), 1]),
          ),
        ),
      ]),
    /5000/,
  );
  assert.throws(
    () =>
      calculateWorkbook([
        sheet(
          Object.fromEntries(
            Array.from({ length: 1001 }, (_, i) => [
              "A" + (i + 1),
              { formula: "1" },
            ]),
          ),
        ),
      ]),
    /1000/,
  );
  assert.throws(
    () =>
      calculateWorkbook([
        sheet(
          Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => [
              "K" + (i + 1),
              { formula: "SUM(A1:J1000)" },
            ]),
          ),
        ),
      ]),
    /计算量/,
  );
});
test("actual XLSX formula creation writes formula text plus recomputed caches; strings stay inert", async () => {
  const g = await create();
  assert.equal(at(g.bytes, "D4").value, 1360);
  assert.equal(at(g.bytes, "A2", 2).value, 1360);
  assert.equal(at(g.bytes, "B7").value, "=SUM(D2:D3)");
  assert.equal(at(g.bytes, "B7").formula, undefined);
  const xml = Buffer.from(
    openPackage(g.bytes)["xl/worksheets/sheet1.xml"],
  ).toString();
  assert.match(xml, /<f>SUM\(D2:D3\)<\/f><v>1360<\/v>/);
});
test("changing an input recomputes dependents across worksheets and formula text can be replaced", async () => {
  const g = await create(),
    e = editDocument("xlsx", g.bytes, {
      cells: [
        { sheetIndex: 1, address: "C2", value: 5 },
        {
          sheetIndex: 2,
          address: "A3",
          value: { formula: "MIN('计划'!B2:B3)" },
        },
      ],
    });
  assert.equal(at(e.bytes, "D4").value, 1600);
  assert.equal(at(e.bytes, "B6").value, "超预算");
  assert.equal(at(e.bytes, "A2", 2).value, 1600);
  assert.equal(at(e.bytes, "A3", 2).value, 120);
});
test("new formula cell uses explicit objects; no automatic string-to-formula conversion", async () => {
  const g = await create(),
    e = editDocument("xlsx", g.bytes, {
      cells: [
        { sheetIndex: 1, address: "F20", value: { formula: "D4*10%" } },
        { sheetIndex: 1, address: "G20", value: "=D4*10%" },
      ],
    });
  assert.equal(at(e.bytes, "F20").value, 136);
  assert.equal(at(e.bytes, "G20").formula, undefined);
  assert.throws(() =>
    editDocument("xlsx", g.bytes, {
      cells: [
        {
          sheetIndex: 1,
          address: "F20",
          value: { formula: "SUM(A1)", url: "x" },
        },
      ],
    }),
  );
  assert.throws(
    () =>
      editDocument("xlsx", g.bytes, {
        cells: [
          { sheetIndex: 1, address: "A1", value: 1 },
          { sheetIndex: 1, address: "A1", value: 2 },
        ],
      }),
    /重复/,
  );
});
test("Excel formula error cells export as OOXML error type and do not become fabricated numbers", async () => {
  const g = await generateDocument(
    "xlsx",
    JSON.stringify({
      sheets: [
        {
          name: "错误",
          rows: [
            [
              { formula: "1/0" },
              { formula: 'IF(TRUE,"提示",0)' },
              { formula: "1>0" },
            ],
          ],
        },
      ],
    }),
  );
  assert.deepEqual(at(g.bytes, "A1").value, { error: "#DIV/0!" });
  assert.equal(at(g.bytes, "B1").value, "提示");
  assert.equal(at(g.bytes, "C1").value, true);
  const xml = Buffer.from(
    openPackage(g.bytes)["xl/worksheets/sheet1.xml"],
  ).toString();
  assert.match(xml, /t="e"><f>1\/0<\/f><v>#DIV\/0!<\/v>/);
});
test("unsupported/shared/array/cycle formula imports remain readable but edits fail without publishing", async () => {
  const g = await create();
  for (const f of [
    '<f>WEBSERVICE("https://example.com")</f>',
    '<f t="shared" si="0">B2*C2</f>',
    "<f>D2</f>",
  ]) {
    const entries = openPackage(g.bytes);
    entries["xl/worksheets/sheet1.xml"] = new TextEncoder().encode(
      Buffer.from(entries["xl/worksheets/sheet1.xml"])
        .toString()
        .replace("<f>B2*C2</f>", f),
    );
    const b = office.zip.zipSync(entries);
    const store = { data: { documents: [] }, save: async () => {} },
      docs = createDocumentService({ store }),
      d = (await docs.importFile("不支持", "xlsx", b)).document;
    await assert.rejects(
      docs.prepare("document_edit", {
        id: d.id,
        expectedRevision: 1,
        cells: [{ sheetIndex: 1, address: "C2", value: 9 }],
      }),
    );
    assert.equal(docs.read(d.id).revision, 1);
  }
});
test("stale calcChain references are removed, including after replacing the last formula with a constant", async () => {
  const g = await generateDocument(
      "xlsx",
      JSON.stringify({
        sheets: [{ name: "单表", rows: [[1, { formula: "A1+1" }]] }],
      }),
    ),
    files = openPackage(g.bytes),
    enc = new TextEncoder();
  files["xl/calcChain.xml"] = enc.encode(
    '<calcChain xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><c r="B1" i="1"/></calcChain>',
  );
  files["xl/_rels/workbook.xml.rels"] = enc.encode(
    Buffer.from(files["xl/_rels/workbook.xml.rels"])
      .toString()
      .replace(
        "</Relationships>",
        '<Relationship Id="chain" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>',
      ),
  );
  files["[Content_Types].xml"] = enc.encode(
    Buffer.from(files["[Content_Types].xml"])
      .toString()
      .replace(
        "</Types>",
        '<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>',
      ),
  );
  const e = editDocument("xlsx", office.zip.zipSync(files), {
      cells: [{ sheetIndex: 1, address: "B1", value: 7 }],
    }),
    out = openPackage(e.bytes);
  assert.equal(out["xl/calcChain.xml"], undefined);
  assert.ok(
    !Buffer.from(out["xl/_rels/workbook.xml.rels"])
      .toString()
      .includes("calcChain"),
  );
  assert.ok(
    !Buffer.from(out["[Content_Types].xml"]).toString().includes("calcChain"),
  );
});
test("styles and unrelated package parts survive actual imported openpyxl workbook edits", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-sheet-style-"));
  try {
    const p = path.join(dir, "styled.xlsx");
    execFileSync("python3", [
      "-c",
      'from openpyxl import Workbook; from openpyxl.styles import Font; import sys; w=Workbook(); s=w.active; s.title="预算"; s["A1"]=2; s["B1"]="=A1*3"; s["B1"].font=Font(bold=True,color="0078CB"); w.save(sys.argv[1])',
      p,
    ]);
    const { readFile } = await import("node:fs/promises");
    const b = await readFile(p),
      a = openPackage(b),
      e = editDocument("xlsx", b, {
        cells: [{ sheetIndex: 1, address: "A1", value: 4 }],
      }),
      out = openPackage(e.bytes);
    assert.deepEqual(a["xl/styles.xml"], out["xl/styles.xml"]);
    await writeFile(p, e.bytes);
    execFileSync("python3", [
      "-c",
      'from openpyxl import load_workbook; import sys; f=load_workbook(sys.argv[1],data_only=False); v=load_workbook(sys.argv[1],data_only=True); assert f.active["B1"].value=="=A1*3"; assert v.active["B1"].value==12; assert f.active["B1"].font.bold; assert f.active["B1"].font.color.rgb.endswith("0078CB")',
      p,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("chart/table/signature and malformed cell packages are rejected by the edit gate", async () => {
  const g = await create();
  for (const extra of [
    "xl/charts/chart1.xml",
    "xl/tables/table1.xml",
    "_xmlsignatures/sig.xml",
  ]) {
    const f = openPackage(g.bytes);
    f[extra] = new TextEncoder().encode("<x/>");
    assert.throws(() =>
      editDocument("xlsx", office.zip.zipSync(f), {
        cells: [{ sheetIndex: 1, address: "C2", value: 8 }],
      }),
    );
  }
  const f = openPackage(g.bytes);
  f["xl/worksheets/sheet1.xml"] = new TextEncoder().encode(
    Buffer.from(f["xl/worksheets/sheet1.xml"])
      .toString()
      .replace('r="C2"', 'r="c2"'),
  );
  assert.throws(() => documentEditor("xlsx", office.zip.zipSync(f)), /大写/);
});
test("approval denial/cancellation/version conflicts and disk failure retain exact original bytes", async () => {
  const { docs, d, store } = await fixture(),
    original = docs.bytes(d.id, 1).bytes;
  const t = await docs.prepare("document_edit", {
    id: d.id,
    expectedRevision: 1,
    cells: [{ sheetIndex: 1, address: "C2", value: 5 }],
  });
  const c = new AbortController();
  c.abort();
  await assert.rejects(docs.perform(t, c.signal));
  const denied = await docs.updateEditor(
    d.id,
    1,
    { cells: [{ sheetIndex: 1, address: "C2", value: 5 }] },
    async () => false,
  );
  assert.equal(denied.status, "denied");
  store.save = async () => {
    throw Error("disk failure");
  };
  await assert.rejects(
    docs.updateEditor(
      d.id,
      1,
      { cells: [{ sheetIndex: 1, address: "C2", value: 5 }] },
      async () => true,
    ),
    /disk failure/,
  );
  assert.equal(docs.read(d.id).revision, 1);
  assert.deepEqual(docs.bytes(d.id, 1).bytes, original);
  await assert.rejects(
    docs.prepare("document_edit", {
      id: d.id,
      expectedRevision: 9,
      cells: [{ sheetIndex: 1, address: "C2", value: 5 }],
    }),
    /版本/,
  );
});
test("approved model read exposes bounded sheet coordinates, audit excludes formulas and cell bodies", async () => {
  const { store, d } = await fixture(),
    runtime = new ToolRuntime({ store, approve: async () => true });
  const read = await runtime.execute("document_read", { id: d.id });
  assert.equal(read.document.spreadsheetEditing.sheets[0].name, "计划");
  const e = await runtime.execute("document_edit", {
    id: d.id,
    expectedRevision: 1,
    cells: [
      { sheetIndex: 1, address: "F1", value: { formula: "ROUND(D4,2)" } },
    ],
  });
  assert.equal(e.verified, true);
  const audit = JSON.stringify(store.data.executions);
  assert.ok(!audit.includes("ROUND(D4,2)"));
  assert.ok(!audit.includes("spreadsheetEditing"));
});
test("production editor shares formula core: live preview, explicit formula mode, validation and sparse new cells", async () => {
  const g = await create(),
    editor = documentEditor("xlsx", g.bytes),
    dom = new JSDOM('<div id="s"></div>'),
    root = dom.window.document.querySelector("#s"),
    ui = mountSpreadsheet(root, editor);
  const input = root.querySelector('[aria-label="计划!C2"]');
  input.value = "5";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.match(root.textContent, /1600/);
  let patch = ui.patch();
  assert.equal(patch.cells[0].value, 5);
  const f = root.querySelector('[aria-label="计划!B7"]');
  f.value = "=1+1";
  f.dispatchEvent(new dom.window.Event("input"));
  assert.equal(ui.patch().cells.find((c) => c.address === "B7").value, "=1+1");
  root.querySelector('[aria-label="新增单元格地址"]').value = "G20";
  root.querySelector("[data-sheet-add]").click();
  assert.ok(root.querySelector('[aria-label="计划!G20"]'));
  dom.window.close();
});
test("actual HTTP tool loop reads workbook structure, updates input and verifies recomputed XLSX receipt", async () => {
  const { store, d } = await fixture(),
    runtime = new ToolRuntime({ store, approve: async () => true });
  let step = 0;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const b of req) raw += b;
    const body = JSON.parse(raw),
      last = body.messages.at(-1);
    assert.ok(body.tools.some((t) => t.function.name === "document_edit"));
    let call;
    if (step === 0)
      call = { name: "document_read", arguments: JSON.stringify({ id: d.id }) };
    else if (step === 1) {
      const read = JSON.parse(last.content).document;
      assert.equal(
        read.spreadsheetEditing.cells.find((c) => c.address === "D4").formula,
        "SUM(D2:D3)",
      );
      call = {
        name: "document_edit",
        arguments: JSON.stringify({
          id: d.id,
          expectedRevision: read.revision,
          cells: [{ sheetIndex: 1, address: "C2", value: 5 }],
        }),
      };
    } else {
      assert.equal(JSON.parse(last.content).document.revision, 2);
      assert.equal(JSON.parse(last.content).verified, true);
    }
    step++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: call
              ? {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    { id: "sheet" + step, type: "function", function: call },
                  ],
                }
              : { role: "assistant", content: "表格第2版已保存并重算" },
          },
        ],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await runAgent({
      messages: [{ role: "user", content: "将调研数量改成5并更新汇总" }],
      request: (m, t) =>
        complete(
          {
            baseUrl: "http://127.0.0.1:" + server.address().port,
            model: "HTTP fixture",
          },
          "",
          m,
          undefined,
          t,
        ),
      execute: (...a) => runtime.execute(...a),
    });
    assert.equal(step, 3);
    assert.equal(at(runtime.documents.bytes(d.id, 2).bytes, "D4").value, 1600);
    assert.equal(
      at(runtime.documents.bytes(d.id, 2).bytes, "A2", 2).value,
      1600,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("readonly error constants remain error constants in the renderer, malformed off-row cells reject edits", async () => {
  const g = await create(),
    editor = documentEditor("xlsx", g.bytes);
  editor.cells.push({
    sheetIndex: 1,
    address: "Z20",
    value: { error: "#N/A" },
  });
  const dom = new JSDOM('<div id="r"></div>'),
    root = dom.window.document.querySelector("#r"),
    ui = mountSpreadsheet(root, editor);
  assert.equal(root.querySelector('[aria-label="计划!Z20"]').disabled, true);
  assert.deepEqual(ui.patch(), { cells: [] });
  dom.window.close();
  const f = openPackage(g.bytes);
  f["xl/worksheets/sheet1.xml"] = new TextEncoder().encode(
    Buffer.from(f["xl/worksheets/sheet1.xml"])
      .toString()
      .replace("</sheetData>", '<c r="F90"><f>1+1</f><v>2</v></c></sheetData>'),
  );
  assert.throws(() => documentEditor("xlsx", office.zip.zipSync(f)), /非标准/);
});
