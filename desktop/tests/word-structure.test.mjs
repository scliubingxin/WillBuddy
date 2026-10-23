import { test } from "node:test";
import assert from "node:assert/strict";
import { wordFixture } from "./helpers/word-fixture.mjs";
import { wordStructure, patchWord } from "../runtime/word-structure.mjs";
import { openPackage, sha256 } from "../runtime/documents.mjs";
import { createDocumentService } from "../services/documents.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import office from "../runtime/vendor/office.cjs";
import { JSDOM } from "jsdom";
import { mountWordRuns } from "../src/ui/word-runs.js";
import { runAgent } from "../runtime/agent.mjs";
import { complete } from "../core.mjs";
import { createServer } from "node:http";
const patch = (s, extra = { text: "正式版" }) => {
  const p = s.paragraphs.find((p) => p.text.startsWith("季度"));
  return {
    part: p.part,
    paragraph: p.paragraph,
    run: 1,
    anchor: p.runs[1].anchor,
    ...extra,
  };
};
async function service() {
  const store = {
    data: { documents: [], executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  const docs = createDocumentService({ store });
  const d = (await docs.importFile("外部Word", "docx", await wordFixture()))
    .document;
  return { store, docs, d };
}
test("imported Word: real runs, table/header coordinates and complex paragraph read-only", async () => {
  const s = wordStructure(await wordFixture()),
    p = s.paragraphs.find((p) => p.text === "季度草案");
  assert.equal(p.runs[0].bold, true);
  assert.equal(p.runs[1].italic, true);
  assert.equal(p.runs[0].italic, null);
  assert.ok(s.paragraphs.some((p) => p.text === "品牌页眉" && p.editable));
  assert.ok(s.paragraphs.some((p) => p.text === "预算1000" && p.editable));
  assert.ok(s.paragraphs.find((p) => p.text === "图片说明").reason);
  assert.ok(s.paragraphs.some((p) => !p.editable));
});
test("targeted run patch preserves every other part and other run properties", async () => {
  const b = await wordFixture(),
    s = wordStructure(b),
    out = patchWord(b, [
      patch(s, { text: "正式版", bold: true, italic: false }),
    ]),
    a = openPackage(b),
    z = openPackage(out.bytes);
  for (const name of Object.keys(a))
    if (name !== "word/document.xml")
      assert.equal(sha256(a[name]), sha256(z[name]), name);
  assert.equal(out.preservation.changedParts[0], "word/document.xml");
  const xml = Buffer.from(z["word/document.xml"]).toString();
  assert.match(xml, /正式版/);
  assert.match(xml, /w:sz w:val="28"/);
  assert.match(xml, /Arial/);
  assert.match(xml, /0078CB/);
  assert.match(xml, /w:u /);
  const p = wordStructure(out.bytes).paragraphs.find(
    (p) => p.text === "季度正式版",
  );
  assert.equal(p.runs[0].bold, true);
  assert.equal(p.runs[1].bold, true);
  assert.equal(p.runs[1].italic, false);
});
test("table text and header text can be edited without recreating table/media/styles", async () => {
  const b = await wordFixture(),
    s = wordStructure(b),
    ps = ["预算1000", "品牌页眉"].map((text) => {
      const p = s.paragraphs.find((p) => p.text === text);
      return {
        part: p.part,
        paragraph: p.paragraph,
        run: 0,
        anchor: p.runs[0].anchor,
        text: text + "更新",
      };
    });
  const out = patchWord(b, ps);
  assert.match(out.text, /预算1000更新/);
  assert.match(out.text, /品牌页眉更新/);
  assert.equal(out.preservation.changedParts.length, 2);
});
test("stale/forged/duplicate/readonly/unknown coordinates are rejected atomically", async () => {
  const b = await wordFixture(),
    s = wordStructure(b),
    good = patch(s);
  for (const x of [
    { ...good, anchor: "bad" },
    { ...good, part: "../secret" },
    { ...good, run: 999 },
    { ...good, paragraph: -1 },
    { ...good, html: "<script>" },
  ])
    assert.throws(() => patchWord(b, [x]));
  assert.throws(() => patchWord(b, [good, good]));
  assert.throws(() => patchWord(b, [good, { ...good, paragraph: 3, run: 0 }]));
  assert.match(
    wordStructure(b).paragraphs.find((p) => p.text === "季度草案").text,
    /草案/,
  );
});
test("text/mark bounds reject multiline, control, invalid unicode, oversized and empty changes", async () => {
  const b = await wordFixture(),
    s = wordStructure(b);
  for (const extra of [
    { text: "a\nb" },
    { text: "\u0000" },
    { text: "\ud800" },
    { text: "x".repeat(10001) },
    { bold: "true" },
    { text: "草案" },
    {},
  ])
    assert.throws(() => patchWord(b, [patch(s, extra)]));
  assert.throws(() => patchWord(b, []));
  assert.throws(() => patchWord(b, Array(101).fill(patch(s))));
});
test("digitally signed packages fail closed and tracked content control paragraphs stay read-only", async () => {
  const b = await wordFixture(),
    f = openPackage(b);
  f["_xmlsignatures/sig1.xml"] = new TextEncoder().encode("<Signature/>");
  assert.throws(() => wordStructure(office.zip.zipSync(f)), /签名/);
  delete f["_xmlsignatures/sig1.xml"];
  let xml = Buffer.from(f["word/document.xml"])
    .toString()
    .replace(
      /(<w:p><w:r><w:t xml:space="preserve">预算1000<\/w:t><\/w:r><\/w:p>)/,
      "<w:ins>$1</w:ins>",
    );
  f["word/document.xml"] = new TextEncoder().encode(xml);
  const s = wordStructure(office.zip.zipSync(f));
  assert.equal(s.paragraphs.find((p) => p.text === "预算1000").editable, false);
});
test("model read returns real anchors after approval, patch result and audit hide text", async () => {
  const { store, d } = await service();
  const tools = new ToolRuntime({ store, approve: async () => true });
  const read = await tools.execute("document_read", { id: d.id });
  assert.ok(read.document.wordEditing);
  const p = patch(read.document.wordEditing, { text: "秘密修改", bold: true });
  const out = await tools.execute("document_patch", {
    id: d.id,
    expectedRevision: 1,
    patches: [p],
  });
  assert.equal(out.document.revision, 2);
  assert.equal(out.verified, true);
  const audit = JSON.stringify(store.data.executions);
  assert.ok(!audit.includes("秘密修改"));
  assert.ok(!audit.includes("wordEditing"));
});
test("model patch denial, cancellation, overlong review and stale versions never publish", async () => {
  const { store, docs, d } = await service(),
    s = docs.editor(d.id, "runs"),
    p = patch(s);
  const tools = new ToolRuntime({ store, approve: async () => false });
  assert.equal(
    (
      await tools.execute("document_patch", {
        id: d.id,
        expectedRevision: 1,
        patches: [p],
      })
    ).status,
    "denied",
  );
  const token = await docs.prepare("document_patch", {
    id: d.id,
    expectedRevision: 1,
    patches: [p],
  });
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(docs.perform(token, abort.signal));
  await assert.rejects(
    docs.prepare("document_patch", {
      id: d.id,
      expectedRevision: 1,
      patches: [{ ...p, text: "x".repeat(700) }],
    }),
    /太长/,
  );
  await assert.rejects(
    docs.prepare("document_patch", {
      id: d.id,
      expectedRevision: 99,
      patches: [p],
    }),
    /版本/,
  );
  assert.equal(docs.read(d.id).revision, 1);
});
test("concurrent UI candidates recheck revision after approval; disk failure rolls back", async () => {
  const { store, docs, d } = await service(),
    p = patch(docs.editor(d.id, "runs"));
  let release;
  const held = new Promise((r) => (release = r));
  const pending = docs.updateEditor(d.id, 1, { patches: [p] }, async () => {
    await held;
    return true;
  });
  const t = await docs.prepare("document_patch", {
    id: d.id,
    expectedRevision: 1,
    patches: [p],
  });
  await docs.perform(t);
  release();
  await assert.rejects(pending, /版本/);
  const p2 = patch(docs.editor(d.id, "runs"), { text: "失败新内容" });
  store.save = async () => {
    throw Error("disk full");
  };
  await assert.rejects(
    docs.updateEditor(d.id, 2, { patches: [p2] }, async () => true),
    /disk full/,
  );
  assert.equal(docs.read(d.id).revision, 2);
});
test("UI editor edits plain text and marks, no HTML injection, retains unknown formatting server-side", async () => {
  const { docs, d } = await service(),
    s = docs.editor(d.id, "runs"),
    dom = new JSDOM('<div id="root"></div>'),
    root = dom.window.document.querySelector("#root"),
    ui = mountWordRuns(root, s);
  const spans = [...root.querySelectorAll("[data-word-run]")],
    node = spans.find((n) => n.textContent === "草案");
  node.focus();
  node.textContent = "<img src=x onerror=alert(1)>正式版";
  node.dispatchEvent(new dom.window.Event("input"));
  root.querySelector('[data-word-mark="bold"]').click();
  const ps = ui.patches();
  assert.equal(ps.length, 1);
  assert.equal(ps[0].bold, true);
  assert.ok(!root.querySelector("img"));
  const out = await docs.updateEditor(
    d.id,
    1,
    { patches: ps },
    async () => true,
  );
  assert.equal(out.document.revision, 2);
  assert.match(out.document.text, /<img/);
  dom.window.close();
});
test("actual HTTP model fixture reads real anchors and patches a Word run through standard tools", async () => {
  const { store, d } = await service(),
    runtime = new ToolRuntime({ store, approve: async () => true });
  let step = 0;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const b of req) raw += b;
    const body = JSON.parse(raw);
    assert.ok(body.tools.some((t) => t.function.name === "document_patch"));
    const last = body.messages.at(-1);
    let call;
    if (step === 0)
      call = { name: "document_read", arguments: JSON.stringify({ id: d.id }) };
    else if (step === 1) {
      const read = JSON.parse(last.content).document;
      call = {
        name: "document_patch",
        arguments: JSON.stringify({
          id: d.id,
          expectedRevision: read.revision,
          patches: [patch(read.wordEditing, { text: "模型修改", bold: true })],
        }),
      };
    } else {
      const out = JSON.parse(last.content);
      assert.equal(out.document.revision, 2);
      assert.equal(out.verified, true);
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
                    { id: "word" + step, type: "function", function: call },
                  ],
                }
              : { role: "assistant", content: "已保存并校验新版本" },
          },
        ],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const out = await runAgent({
      messages: [{ role: "user", content: "修改导入Word" }],
      request: (m, t) =>
        complete(
          {
            baseUrl: "http://127.0.0.1:" + server.address().port,
            model: "fixture",
          },
          "",
          m,
          undefined,
          t,
        ),
      execute: (...a) => runtime.execute(...a),
    });
    assert.equal(step, 3);
    assert.match(out.text, /保存/);
    assert.match(runtime.documents.read(d.id).text, /模型修改/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("unmodified paragraphs in a changed XML part retain equivalent OOXML subtrees", async () => {
  const bytes = await wordFixture(),
    s = wordStructure(bytes),
    out = patchWord(bytes, [patch(s)]),
    p = new office.DOMParser(),
    serialize = (n) => new office.XMLSerializer().serializeToString(n),
    W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const a = p.parseFromString(
      Buffer.from(openPackage(bytes)["word/document.xml"]).toString(),
      "application/xml",
    ),
    b = p.parseFromString(
      Buffer.from(openPackage(out.bytes)["word/document.xml"]).toString(),
      "application/xml",
    );
  const ap = Array.from(a.getElementsByTagNameNS(W, "p")),
    bp = Array.from(b.getElementsByTagNameNS(W, "p"));
  assert.equal(ap.length, bp.length);
  for (let i = 1; i < ap.length; i++)
    assert.equal(serialize(ap[i]), serialize(bp[i]));
});
test("oversized Word structure is not partially returned to models, and canvas Word patch is rejected", async () => {
  const { docs, d, store } = await service();
  const file = openPackage(docs.bytes(d.id, 1).bytes),
    xml = Buffer.from(file["word/document.xml"])
      .toString()
      .replace(
        "</w:body>",
        Array(45).fill("<w:p><w:r><w:t>更多内容</w:t></w:r></w:p>").join("") +
          "</w:body>",
      );
  file["word/document.xml"] = new TextEncoder().encode(xml);
  const large = (
    await docs.importFile("长文件", "docx", office.zip.zipSync(file))
  ).document;
  const token = await docs.prepare("document_read", { id: large.id }),
    read = await docs.perform(token);
  assert.equal(read.document.wordEditing, undefined);
  assert.match(read.document.wordEditingUnavailable, /上限/);
  store.data.documents.find((x) => x.id === d.id).richSource = "<p>画布</p>";
  await assert.rejects(
    docs.prepare("document_patch", {
      id: d.id,
      expectedRevision: 1,
      patches: [patch(wordStructure(await wordFixture()))],
    }),
    /画布/,
  );
});

test("actual HTTP model fixture reads paragraph anchors and inserts a real Word paragraph through standard tools", async () => {
  const { store, d } = await service(),
    runtime = new ToolRuntime({ store, approve: async () => true });
  let step = 0;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const b of req) raw += b;
    const body = JSON.parse(raw);
    assert.ok(body.tools.some((t) => t.function.name === "document_patch"));
    const last = body.messages.at(-1);
    let call;
    if (step === 0)
      call = { name: "document_read", arguments: JSON.stringify({ id: d.id }) };
    else if (step === 1) {
      const read = JSON.parse(last.content).document;
      call = {
        name: "document_patch",
        arguments: JSON.stringify({
          id: d.id,
          expectedRevision: read.revision,
          patches: [(() => { const p=read.wordEditing.paragraphs.find(p=>p.structural);return {part:p.part,paragraph:p.paragraph,anchor:p.anchor,action:"insertAfter",text:"模型结构新增"}; })()],
        }),
      };
    } else {
      const out = JSON.parse(last.content);
      assert.equal(out.document.revision, 2);
      assert.equal(out.verified, true);
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
                    { id: "word" + step, type: "function", function: call },
                  ],
                }
              : { role: "assistant", content: "已保存并校验新版本" },
          },
        ],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const out = await runAgent({
      messages: [{ role: "user", content: "修改导入Word" }],
      request: (m, t) =>
        complete(
          {
            baseUrl: "http://127.0.0.1:" + server.address().port,
            model: "fixture",
          },
          "",
          m,
          undefined,
          t,
        ),
      execute: (...a) => runtime.execute(...a),
    });
    assert.equal(step, 3);
    assert.match(out.text, /保存/);
    assert.match(runtime.documents.read(d.id).text, /模型结构新增/);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
