import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, symlink, unlink } from "node:fs/promises";
import {
  generateDocument,
  documentEditor,
  updateDocumentEditor,
  inspectDocument,
} from "../runtime/documents.mjs";
import { createDocumentService } from "../services/documents.mjs";
import { createGenOfficeBridge } from "../main/genoffice.mjs";
import { messageDocuments } from "../src/ui/documents.js";
const spec = {
  title: "重复文字",
  blocks: [
    { type: "paragraph", text: "重复文字" },
    { type: "paragraph", text: "保持不变" },
  ],
};
async function fixture() {
  const store = { data: { documents: [] }, save: async () => {} };
  const service = createDocumentService({ store });
  const generated = await generateDocument("docx", JSON.stringify(spec));
  const r = await service.importFile("文档", "docx", generated.bytes);
  return { store, service, id: r.document.id };
}
test("paragraph editor targets one of identical paragraphs, retains other content and rejects forged coordinates", async () => {
  const g = await generateDocument("docx", JSON.stringify(spec)),
    editor = documentEditor("docx", g.bytes);
  const result = updateDocumentEditor("docx", g.bytes, {
    blocks: [{ ...editor.blocks[1], text: "只修改这一段" }],
  });
  assert.match(result.text, /重复文字/);
  assert.match(result.text, /只修改这一段/);
  assert.match(result.text, /保持不变/);
  assert.throws(
    () =>
      updateDocumentEditor("docx", g.bytes, {
        blocks: [{ part: "../../bad.xml", index: 0, text: "x" }],
      }),
    /坐标/,
  );
  assert.throws(
    () =>
      updateDocumentEditor("docx", g.bytes, {
        blocks: [editor.blocks[0], editor.blocks[0]],
      }),
    /重复/,
  );
});
test("source editor can replace entire Markdown/HTML including empty text, never executes it", async () => {
  for (const format of ["md", "html"]) {
    const g = await generateDocument(format, "<p>原始</p>");
    const r = updateDocumentEditor(format, g.bytes, {
      source: "<script>bad()</script>\n新内容",
    });
    assert.match(r.text, /新内容/);
    assert.equal(documentEditor(format, r.bytes).source, r.text);
  }
});
test("cell editor keeps typed constants and stores equals-prefixed values literally", async () => {
  const g = await generateDocument(
    "xlsx",
    JSON.stringify({ sheets: [{ name: "计划", rows: [["A", 12, true]] }] }),
  );
  const e = documentEditor("xlsx", g.bytes);
  assert.deepEqual(
    e.cells.map((c) => c.value),
    ["A", 12, true],
  );
  const r = updateDocumentEditor("xlsx", g.bytes, {
    cells: [{ sheetIndex: 1, address: "A1", value: "=1+2" }],
  });
  assert.match(r.text, /A1: =1\+2/);
});
test("editor save rejects denied, stale and disk-failed changes with original bytes retained", async () => {
  const { store, service, id } = await fixture();
  const e = service.editor(id),
    patch = { blocks: [{ ...e.blocks[0], text: "新标题" }] };
  assert.equal(
    (await service.updateEditor(id, 1, patch, async () => false)).status,
    "denied",
  );
  assert.equal(service.read(id).revision, 1);
  await service.updateEditor(id, 1, patch, async () => true);
  await assert.rejects(
    service.updateEditor(id, 1, patch, async () => true),
    /版本/,
  );
  store.save = async () => {
    throw Error("disk full");
  };
  const next = service.editor(id);
  await assert.rejects(
    service.updateEditor(
      id,
      2,
      { blocks: [{ ...next.blocks[0], text: "不能保存" }] },
      async () => true,
    ),
    /disk/,
  );
  assert.equal(service.read(id).revision, 2);
});
test("document cards require trusted successful run-linked tool receipts, never prose IDs or unrelated runs", () => {
  const d = { id: "real" },
    s = { documents: [d], executions: [] },
    c = { id: "chat", documentRefs: [{ id: "real", runId: "other" }] };
  assert.deepEqual(
    messageDocuments(s, c, { content: "real", runId: "mine" }),
    [],
  );
  c.documentRefs.push({ id: "real", runId: "mine" });
  assert.deepEqual(messageDocuments(s, c, { runId: "mine" }), [d]);
  s.executions = [
    {
      tool: "document_create",
      status: "succeeded",
      chatId: "chat",
      runId: "mine",
      result: { verified: true, document: d },
    },
  ];
  c.documentRefs = [];
  assert.deepEqual(messageDocuments(s, c, { runId: "mine" }), [d]);
});
test("GenOffice handoff uses an isolated copy and imports verified edited bytes as a new revision", async () => {
  const { service, id } = await fixture();
  let file;
  const bridge = createGenOfficeBridge({
    documents: service,
    platform: "darwin",
    findApp: async () => "/fixture/GenOffice.app",
    approve: async () => true,
    launch: async (app, p) => {
      file = p;
      assert.equal(app, "/fixture/GenOffice.app");
    },
  });
  try {
    await bridge.open(id, 1);
    assert.deepEqual(await readFile(file), service.bytes(id, 1).bytes);
    await assert.rejects(bridge.importEdited(id), /尚无变化/);
    const changed = await generateDocument(
      "docx",
      JSON.stringify({ ...spec, title: "GenOffice夹具保存" }),
    );
    await writeFile(file, changed.bytes);
    const r = await bridge.importEdited(id);
    assert.equal(r.document.revision, 2);
    assert.match(r.document.text, /GenOffice夹具保存/);
    assert.equal(service.bytes(id, 1).bytes.equals(changed.bytes), false);
  } finally {
    await bridge.close();
  }
});
test("GenOffice denial does not launch; invalid bytes and stale destination cannot replace an Office document", async () => {
  const { service, id } = await fixture();
  let file,
    calls = 0;
  const denied = createGenOfficeBridge({
    documents: service,
    platform: "darwin",
    findApp: async () => "/fixture",
    approve: async () => false,
    launch: async () => {
      calls++;
    },
  });
  assert.equal((await denied.open(id, 1)).status, "denied");
  assert.equal(calls, 0);
  const bridge = createGenOfficeBridge({
    documents: service,
    platform: "darwin",
    findApp: async () => "/fixture",
    approve: async () => true,
    launch: async (a, p) => {
      file = p;
    },
  });
  try {
    await bridge.open(id, 1);
    await writeFile(file, "bad");
    await assert.rejects(bridge.importEdited(id));
    assert.equal(service.read(id).revision, 1);
    const changed = await generateDocument(
      "docx",
      JSON.stringify({ ...spec, title: "外部修改" }),
    );
    await writeFile(file, changed.bytes);
    const e = service.editor(id);
    await service.updateEditor(
      id,
      1,
      { blocks: [{ ...e.blocks[0], text: "并发修改" }] },
      async () => true,
    );
    await assert.rejects(bridge.importEdited(id), /版本/);
    assert.match(service.read(id).text, /并发修改/);
  } finally {
    await bridge.close();
  }
});
test("GenOffice handoff rejects symlink substitution instead of reading it", async () => {
  const { service, id } = await fixture();
  let file;
  const bridge = createGenOfficeBridge({
    documents: service,
    platform: "darwin",
    findApp: async () => "/fixture",
    approve: async () => true,
    launch: async (a, p) => {
      file = p;
    },
  });
  try {
    await bridge.open(id, 1);
    await unlink(file);
    await symlink("/etc/passwd", file);
    await assert.rejects(bridge.importEdited(id), /普通文件/);
  } finally {
    await bridge.close();
  }
});
