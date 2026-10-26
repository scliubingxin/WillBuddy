import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  generateDocument,
  editDocument,
  inspectDocument,
  openPackage,
} from "../runtime/documents.mjs";
import {
  createDocumentService,
  documentViews,
} from "../services/documents.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { Store } from "../core.mjs";
import { runAgent } from "../runtime/agent.mjs";
import office from "../runtime/vendor/office.cjs";
const fixtures = {
  docx: {
    title: "项目报告",
    blocks: [
      { type: "heading", text: "业务目标" },
      { type: "paragraph", text: "2025 年收入增长" },
      {
        type: "table",
        rows: [
          ["项目", "金额"],
          ["测试", "123"],
        ],
      },
    ],
  },
  xlsx: {
    sheets: [
      {
        name: "计划",
        rows: [
          ["项目", "预算"],
          ["2025", 123],
          ['=HYPERLINK("https://example.com")', true],
        ],
      },
    ],
  },
  pptx: {
    slides: [
      {
        title: "2025 项目报告",
        bullets: ["业务目标", "执行步骤"],
        notes: "讲者备注",
      },
    ],
  },
};
const fixture = () => {
  const store = {
    data: { documents: [], executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  return { store, service: createDocumentService({ store }) };
};
for (const format of ["docx", "xlsx", "pptx", "md", "html"])
  test("real " + format + " generation, inspection and editing", async () => {
    const source = fixtures[format]
      ? JSON.stringify(fixtures[format])
      : format === "html"
        ? "<h1>2025 报告</h1>"
        : "# 2025 报告\n\n原文";
    const generated = await generateDocument(format, source);
    assert.ok(generated.size > 0);
    assert.equal(generated.sha256.length, 64);
    const changes =
      format === "xlsx"
        ? {
            cells: [
              { sheetIndex: 1, address: "B2", value: 999 },
              { sheetIndex: 1, address: "A4", value: "新增" },
            ],
          }
        : { replacements: [{ find: "2025", replace: "2026" }] };
    const edited = editDocument(format, generated.bytes, changes);
    assert.notEqual(edited.sha256, generated.sha256);
    assert.match(edited.text, format === "xlsx" ? /999/ : /2026/);
    assert.equal(
      inspectDocument(format, generated.bytes).sha256,
      generated.sha256,
    );
  });
test("independent Python Office parsers open real generated and edited packages", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "willbuddy-office-"));
  try {
    for (const f of ["docx", "xlsx", "pptx"]) {
      const r = await generateDocument(f, JSON.stringify(fixtures[f]));
      const e = editDocument(
        f,
        r.bytes,
        f === "xlsx"
          ? { cells: [{ sheetIndex: 1, address: "B2", value: 999 }] }
          : { replacements: [{ find: "2025", replace: "2026" }] },
      );
      await writeFile(path.join(dir, "test." + f), e.bytes);
    }
    const result = execFileSync(
      "python3",
      [
        "-c",
        `import sys\nfrom docx import Document\nfrom openpyxl import load_workbook\nfrom pptx import Presentation\np=sys.argv[1]\nd=Document(p+'/test.docx');assert any('2026' in x.text for x in d.paragraphs);assert d.tables[0].cell(1,1).text=='123'\nw=load_workbook(p+'/test.xlsx');assert w['计划']['B2'].value==999;assert w['计划']['A3'].data_type=='s'\ns=Presentation(p+'/test.pptx');assert '2026' in s.slides[0].shapes[0].text;assert '讲者备注' in s.slides[0].notes_slide.notes_text_frame.text\nprint('python-docx/openpyxl/python-pptx passed')`,
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.match(result, /passed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("edits preserve untouched ZIP parts, paragraph run styles and tables", async () => {
  const created = await generateDocument("docx", JSON.stringify(fixtures.docx)),
    files = openPackage(created.bytes),
    enc = new TextEncoder();
  let xml = new TextDecoder().decode(files["word/document.xml"]);
  xml = xml.replace(
    "2025 年收入增长",
    "20</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>25 年收入增长",
  );
  files["word/document.xml"] = enc.encode(xml);
  const bytes = office.zip.zipSync(files),
    changed = editDocument("docx", bytes, {
      replacements: [{ find: "2025", replace: "2026" }],
    }),
    after = openPackage(changed.bytes);
  assert.match(changed.text, /2026/);
  assert.match(new TextDecoder().decode(after["word/document.xml"]), /<w:b/);
  for (const name of Object.keys(files))
    if (name !== "word/document.xml")
      assert.deepEqual(after[name], files[name], name);
});
test("read-only imported source, optimistic revisions, one-shot approvals, durable restart and conflict", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "willbuddy-doc-store-"));
  try {
    const store = new Store(dir);
    await store.load();
    const service = createDocumentService({ store }),
      input = await generateDocument("md", "# 原文");
    const r = await service.importFile("原件", "md", input.bytes);
    const id = r.document.id;
    const a = await service.prepare("document_edit", {
        id,
        expectedRevision: 1,
        replacements: [{ find: "原文", replace: "新版A" }],
      }),
      b = await service.prepare("document_edit", {
        id,
        expectedRevision: 1,
        replacements: [{ find: "原文", replace: "新版B" }],
      });
    await service.perform(a);
    await assert.rejects(service.perform(a), /凭证/);
    await assert.rejects(service.perform(b), /版本/);
    const reload = new Store(dir);
    await reload.load();
    const d = reload.data.documents[0];
    assert.equal(d.revision, 2);
    assert.equal(
      Buffer.from(d.history[0].base64, "base64").toString(),
      "# 原文",
    );
    assert.equal(input.bytes.toString(), "# 原文");
    assert.ok(!("base64" in documentViews(reload.data)[0]));
    assert.ok(!("base64" in documentViews(reload.data)[0].history[0]));
    assert.equal(service.bytes(id, 2).bytes.toString(), "# 新版A");
    await assert.rejects(
      service.prepare("document_edit", {
        id,
        expectedRevision: 1,
        replacements: [],
      }),
      /版本/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("denial, cancellation, and failed persistence do not create document versions; audits hide content", async () => {
  const { store } = fixture();
  let approve = false;
  const tools = new ToolRuntime({ store, approve: async () => approve });
  const args = { name: "机密", format: "md", content: "# secret text" };
  let result = await tools.execute("document_create", args);
  assert.equal(result.status, "denied");
  assert.equal(store.data.documents.length, 0);
  assert.ok(!JSON.stringify(store.data.executions).includes("secret text"));
  approve = true;
  const controller = new AbortController();
  tools.approve = async () => {
    controller.abort();
    return true;
  };
  await assert.rejects(
    tools.execute("document_create", args, controller.signal),
  );
  assert.equal(store.data.documents.length, 0);
  const g = fixture(),
    prepared = await g.service.prepare("document_create", args);
  g.store.save = async () => {
    throw Error("disk full");
  };
  await assert.rejects(g.service.perform(prepared), /disk full/);
  assert.equal(g.store.data.documents.length, 0);
});
test("model tool loop creates, reads and modifies an actual Word document", async () => {
  const { store } = fixture(),
    tools = new ToolRuntime({ store, approve: async () => true });
  let stage = 0,
    id;
  const result = await runAgent({
    messages: [{ role: "user", content: "创建2025报告再改成2026" }],
    execute: (...a) => tools.execute(...a),
    request: async (history) => {
      const call = (name, args) => ({
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "t" + stage,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
      });
      if (stage++ === 0)
        return call("document_create", {
          name: "报告",
          format: "docx",
          content: JSON.stringify(fixtures.docx),
        });
      const output = JSON.parse(history.at(-1).content);
      assert.equal(output.status, "succeeded");
      id = output.document.id;
      if (stage === 2) return call("document_read", { id });
      if (stage === 3)
        return call("document_edit", {
          id,
          expectedRevision: output.document.revision,
          replacements: [{ find: "2025", replace: "2026" }],
        });
      return { text: "已根据真实工具结果完成第2版 Word 报告" };
    },
  });
  assert.match(result.text, /第2版/);
  assert.equal(store.data.documents[0].revision, 2);
  assert.match(
    inspectDocument("docx", tools.documents.bytes(id, 2).bytes).text,
    /2026/,
  );
  assert.ok(!JSON.stringify(store.data.executions).includes("年收入增长"));
});
test("package limits reject duplicate paths, traversal, external relationships, DTD, macro/embedded payloads and CRC corruption", async () => {
  const base = openPackage(
      (await generateDocument("docx", JSON.stringify(fixtures.docx))).bytes,
    ),
    enc = new TextEncoder();
  const archive = (extra) => office.zip.zipSync({ ...base, ...extra });
  for (const extra of [
    { "../escape": enc.encode("x") },
    { "WORD/document.xml": enc.encode("<root/>") },
    { "word/vbaProject.bin": enc.encode("macro") },
    { "word/embeddings/ole.bin": enc.encode("ole") },
    {
      "word/_rels/document.xml.rels": enc.encode(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship TargetMode="Extern&#97;l" Target="https://example.com"/></Relationships>',
      ),
    },
    {
      "word/document.xml": enc.encode('<!DOCTYPE x [<!ENTITY x "evil">]><x/>'),
    },
  ])
    assert.throws(() => inspectDocument("docx", archive(extra)));
  const corrupt = Buffer.from(archive({}));
  const central = corrupt.indexOf(Buffer.from("504b0102", "hex"));
  corrupt[central + 16] ^= 1;
  assert.throws(() => openPackage(corrupt), /CRC/);
  assert.throws(() => openPackage(Buffer.alloc(4 * 1024 * 1024 + 1)), /4 MiB/);
});
test("invalid specs, missing replacements, invalid cells and unsupported formula workbook updates fail closed", async () => {
  for (const [f, s] of [
    ["xlsx", { sheets: [{ name: "../invalid", rows: [] }] }],
    ["docx", { blocks: [{ type: "script", text: "x" }] }],
    ["pptx", { slides: [{ title: "x", bullets: [null] }] }],
  ])
    await assert.rejects(generateDocument(f, JSON.stringify(s)));
  const x = await generateDocument("xlsx", JSON.stringify(fixtures.xlsx));
  assert.throws(
    () =>
      editDocument("xlsx", x.bytes, {
        cells: [{ sheetIndex: 1, address: "../A1", value: "x" }],
      }),
    /地址/,
  );
  const redacted=editDocument("xlsx",x.bytes,{replacements:[{find:"2025",replace:"2026"}]});
  assert.match(redacted.text,/2026/);
  const files = openPackage(x.bytes),
    enc = new TextEncoder();
  files["xl/worksheets/sheet1.xml"] = enc.encode(
    new TextDecoder()
      .decode(files["xl/worksheets/sheet1.xml"])
      .replace("<v>123</v>", '<f>WEBSERVICE("https://example.com")</f><v>3</v>'),
  );
  assert.throws(
    () =>
      editDocument("xlsx", office.zip.zipSync(files), {
        cells: [{ sheetIndex: 1, address: "A1", value: "x" }],
      }),
    /公式/,
  );
  const md = await generateDocument("md", "原文");
  assert.throws(
    () =>
      editDocument("md", md.bytes, {
        replacements: [{ find: "不存在", replace: "x" }],
      }),
    /不存在/,
  );
});
test("bounded native import and staged export preserve selected original until publication; retained versions export exact bytes", async () => {
  const { readDocumentSource, writeDocumentDestination } = await import(
    "../main/document-files.mjs"
  );
  const dir = await mkdtemp(path.join(tmpdir(), "willbuddy-doc-destination-"));
  try {
    const target = path.join(dir, "report.md");
    await writeFile(target, "旧文件");
    assert.equal(
      await writeDocumentDestination(target, Buffer.from("新文件")),
      Buffer.byteLength("新文件"),
    );
    assert.equal((await readDocumentSource(target)).toString(), "新文件");
    const huge = path.join(dir, "huge");
    await writeFile(huge, Buffer.alloc(4 * 1024 * 1024 + 1));
    await assert.rejects(readDocumentSource(huge), /4 MiB/);
    const f = fixture();
    let t = await f.service.prepare("document_create", {
      name: "版本",
      format: "md",
      content: "旧版",
    });
    const r = await f.service.perform(t);
    t = await f.service.prepare("document_edit", {
      id: r.document.id,
      expectedRevision: 1,
      replacements: [{ find: "旧版", replace: "新版" }],
    });
    await f.service.perform(t);
    assert.equal(f.service.bytes(r.document.id, 1).bytes.toString(), "旧版");
    assert.equal(f.service.bytes(r.document.id, 2).bytes.toString(), "新版");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("two concurrent document creations persist both without replacing each other", async () => {
  const f = fixture();
  const tokens = await Promise.all(
    ["甲", "乙"].map((name) =>
      f.service.prepare("document_create", {
        name,
        format: "md",
        content: name,
      }),
    ),
  );
  const results = await Promise.all(tokens.map((t) => f.service.perform(t)));
  assert.equal(f.store.data.documents.length, 2);
  assert.notEqual(results[0].document.id, results[1].document.id);
});
test("actual HTTP model protocol completes create/read/edit receipts through real Office tools", async () => {
  const { createServer } = await import("node:http"),
    { complete } = await import("../core.mjs");
  const f = fixture(),
    runtime = new ToolRuntime({ store: f.store, approve: async () => true });
  let step = 0,
    received = false;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const p of req) body += p;
    const request = JSON.parse(body);
    assert.ok(request.tools.some((t) => t.function.name === "document_create"));
    const last = request.messages.at(-1),
      prior = last.role === "tool" ? JSON.parse(last.content) : null;
    let call;
    if (step === 0)
      call = {
        name: "document_create",
        arguments: JSON.stringify({
          name: "HTTP报告",
          format: "docx",
          content: JSON.stringify(fixtures.docx),
        }),
      };
    else if (step === 1)
      call = {
        name: "document_read",
        arguments: JSON.stringify({ id: prior.document.id }),
      };
    else if (step === 2) {
      received = prior.document.text.includes("2025");
      call = {
        name: "document_edit",
        arguments: JSON.stringify({
          id: prior.document.id,
          expectedRevision: prior.document.revision,
          replacements: [{ find: "2025", replace: "2026" }],
        }),
      };
    }
    step++;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: call
              ? {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    { id: "call" + step, type: "function", function: call },
                  ],
                }
              : { role: "assistant", content: "Word 第2版已创建并验证" },
          },
        ],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const result = await runAgent({
      messages: [{ role: "user", content: "创建并修改文档" }],
      request: (messages, tools) =>
        complete(
          {
            baseUrl: "http://127.0.0.1:" + server.address().port,
            model: "HTTP fixture",
          },
          "",
          messages,
          undefined,
          tools,
        ),
      execute: (...a) => runtime.execute(...a),
    });
    assert.equal(step, 4);
    assert.equal(received, true);
    assert.match(result.text, /第2版/);
    assert.match(
      inspectDocument(
        "docx",
        runtime.documents.bytes(f.store.data.documents[0].id, 2).bytes,
      ).text,
      /2026/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
