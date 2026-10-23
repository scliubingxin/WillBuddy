import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDocumentService,
  documentViews,
} from "../services/documents.mjs";
import { generateDocument } from "../runtime/documents.mjs";
import { readFile } from "node:fs/promises";
const fixture = () => {
  const store = { data: { documents: [] }, save: async () => {} };
  return { store, service: createDocumentService({ store }) };
};
test("preview returns exact verified revision bytes without general-state leakage", async () => {
  const { store, service } = fixture(),
    bytes = (
      await generateDocument(
        "docx",
        JSON.stringify({ blocks: [{ type: "paragraph", text: "真实内容" }] }),
      )
    ).bytes;
  const { document: d } = await service.importFile("报告", "docx", bytes);
  assert.deepEqual(
    Buffer.from(service.preview(d.id, 1).base64, "base64"),
    bytes,
  );
  assert.equal(documentViews(store.data)[0].base64, undefined);
  assert.throws(() => service.preview(d.id, 2), /版本/);
  assert.throws(() => service.preview("missing", 1), /不存在/);
  store.data.documents[0].base64 = "corrupt";
  assert.throws(() => service.preview(d.id, 1), /校验/);
});
test("preview rejects text formats without changing stored documents", async () => {
  const { store, service } = fixture(),
    { document: d } = await service.importFile(
      "原文",
      "md",
      Buffer.from("# 原文"),
    );
  const before = structuredClone(store.data);
  assert.throws(() => service.preview(d.id, 1), /文本预览/);
  assert.deepEqual(store.data, before);
});
test("preview sandbox has no network, native bridge or external GenOffice UI", async () => {
  const html = await readFile(
    new URL("../src/preview/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /frame-src 'none'/);
  const cards = await readFile(
    new URL("../src/ui/documents.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(cards, /documentGenOffice/);
});
