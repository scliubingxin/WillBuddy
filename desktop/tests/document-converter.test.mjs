import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocumentService } from "../services/documents.mjs";
import { generateDocument } from "../runtime/documents.mjs";
import { createDocumentConverter } from "../runtime/document-converter.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { messageDocuments } from "../src/ui/documents.js";
async function fixture() {
  const store = {
    data: { documents: [], executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  const g = await generateDocument(
    "docx",
    JSON.stringify({
      title: "真实二进制",
      blocks: [{ type: "paragraph", text: "可编辑正文" }],
    }),
  );
  const convertDocument = async () => ({
    ...g,
    sourceHtml: "<h1>真实二进制</h1><p>可编辑正文</p>",
  });
  return {
    store,
    convertDocument,
    service: createDocumentService({ store, convertDocument }),
  };
}
test("conversion creates a separate Word with source revision receipt and retains original bytes", async () => {
  const { service } = await fixture();
  const original = await service.importFile(
    "原件",
    "md",
    Buffer.from("# 原件"),
  );
  const token = await service.prepare("document_convert", {
    id: original.document.id,
    expectedRevision: 1,
  });
  const r = await service.perform(token);
  assert.equal(r.document.format, "docx");
  assert.equal(r.document.hasRichSource, true);
  assert.notEqual(r.document.id, original.document.id);
  assert.equal(r.document.conversionSource.revision, 1);
  assert.equal(
    service.bytes(original.document.id, 1).bytes.toString(),
    "# 原件",
  );
  await assert.rejects(service.perform(token), /凭证/);
});
test("conversion refuses a source edited while awaiting approval", async () => {
  const { service } = await fixture();
  const r = await service.importFile("原文", "md", Buffer.from("# 旧版"));
  const id = r.document.id;
  const token = await service.prepare("document_convert", {
    id,
    expectedRevision: 1,
  });
  await service.updateEditor(id, 1, { source: "# 新版" }, async () => true);
  await assert.rejects(service.perform(token), /版本/);
  assert.equal(service.list().length, 1);
});
test("rich Word write persists revision and rejects stale concurrent edits", async () => {
  const { service } = await fixture();
  const first = await service.perform(
      await service.prepare("document_write", {
        name: "Word",
        html: "<h1>标题</h1>",
      }),
    ),
    id = first.document.id;
  assert.match(service.richEditor(id).html, /真实二进制/);
  const t1 = await service.prepare("document_write", {
      id,
      expectedRevision: 1,
      html: "<h1>版本2</h1>",
    }),
    t2 = await service.prepare("document_write", {
      id,
      expectedRevision: 1,
      html: "<h1>版本3</h1>",
    });
  await service.perform(t1);
  await assert.rejects(service.perform(t2), /版本/);
  assert.equal(service.read(id).revision, 2);
  assert.equal(service.read(id).history.length, 1);
});
test("rich write to non-canvas import is refused rather than silently rebuilding original layout", async () => {
  const { service } = await fixture();
  const g = await generateDocument(
    "docx",
    JSON.stringify({ title: "导入", blocks: [] }),
  );
  const r = await service.importFile("原文件", "docx", g.bytes);
  await assert.rejects(
    service.prepare("document_write", {
      id: r.document.id,
      expectedRevision: 1,
      html: "<p>替换</p>",
    }),
    /仅本机画布/,
  );
});
test("denied rich write does not save a document and audits exclude HTML source", async () => {
  const { store, convertDocument } = await fixture();
  const runtime = new ToolRuntime({
    store,
    convertDocument,
    approve: async () => false,
  });
  const r = await runtime.execute("document_write", {
    name: "草稿",
    html: "<p>PRIVATE_HTML</p>",
  });
  assert.equal(r.status, "denied");
  assert.equal(store.data.documents.length, 0);
  assert.ok(!JSON.stringify(store.data.executions).includes("PRIVATE_HTML"));
});
test("conversion disk failure rolls back candidate; successful Word write becomes a trusted chat card", async () => {
  const { store, service, convertDocument } = await fixture();
  const token = await service.prepare("document_write", {
    name: "报告",
    html: "<p>报告</p>",
  });
  store.save = async () => {
    throw Error("disk full");
  };
  await assert.rejects(service.perform(token), /disk full/);
  assert.equal(service.list().length, 0);
  store.save = async () => {};
  const runtime = new ToolRuntime({
    store,
    convertDocument,
    approve: async () => true,
  });
  const r = await runtime.execute(
    "document_write",
    { name: "报告", html: "<p>PRIVATE</p>" },
    undefined,
    { chatId: "c", runId: "r" },
  );
  assert.equal(r.status, "succeeded");
  assert.ok(!JSON.stringify(store.data.executions).includes("PRIVATE"));
  assert.equal(
    messageDocuments(
      { documents: service.list(), executions: store.data.executions },
      { id: "c" },
      { runId: "r" },
    ).length,
    1,
  );
});
test("unsupported formats, empty source and cancelled request do not create a conversion browser", async () => {
  let count = 0;
  const convert = createDocumentConverter({
    createDriver: async () => {
      count++;
    },
  });
  await assert.rejects(convert("docx", "x"), /仅支持/);
  await assert.rejects(convert("html", ""), /为空/);
  const c = new AbortController();
  c.abort();
  await assert.rejects(convert("html", "<p>x</p>", c.signal));
  assert.equal(count, 0);
});
test("timeout rejects even a delayed driver factory and closes its late browser", async () => {
  let finish,
    closed = 0;
  const convert = createDocumentConverter({
    timeoutMs: 20,
    createDriver: () =>
      new Promise((r) => {
        finish = r;
      }),
  });
  const alive = setTimeout(() => {}, 100);
  try {
    await assert.rejects(convert("html", "<p>正文</p>"), /abort|timeout/i);
    finish({
      close: async () => {
        closed++;
      },
    });
    await new Promise((r) => setImmediate(r));
    assert.equal(closed, 1);
  } finally {
    clearTimeout(alive);
  }
});

test("Electron conversion adapter isolates session, denies permissions, URLs, popups and Node access", async () => {
  const { createConversionBrowser } = await import(
    "../main/conversion-browser.mjs"
  );
  const { EventEmitter } = await import("node:events");
  let config,
    partition,
    before,
    permission,
    check,
    destroyed = false,
    cleared = false,
    codes = [];
  const session = {
    fromPartition: (id) => {
      partition = id;
      return {
        setPermissionRequestHandler: (f) => {
          permission = f;
        },
        setPermissionCheckHandler: (f) => {
          check = f;
        },
        webRequest: {
          onBeforeRequest: (f) => {
            before = f;
          },
        },
        clearStorageData: async () => {
          cleared = true;
        },
      };
    },
  };
  class Window extends EventEmitter {
    constructor(c) {
      super();
      config = c;
      this.webContents = new EventEmitter();
      this.webContents.setWindowOpenHandler = (f) => {
        this.popup = f;
      };
      this.webContents.executeJavaScriptInIsolatedWorld = async (
        world,
        code,
      ) => {
        codes.push({ world, code });
        return { height: 100, count: 2 };
      };
    }
    async loadURL() {}
    setContentSize() {}
    isDestroyed() {
      return destroyed;
    }
    destroy() {
      destroyed = true;
    }
  }
  const driver = await createConversionBrowser({
    BrowserWindow: Window,
    session,
  });
  assert.match(partition, /^willbuddy-conversion-/);
  assert.equal(config.show, false);
  assert.equal(config.webPreferences.nodeIntegration, false);
  assert.equal(config.webPreferences.sandbox, true);
  assert.equal(config.webPreferences.contextIsolation, true);
  assert.ok(!config.webPreferences.preload);
  assert.equal(check(), false);
  let granted;
  permission(null, "camera", (v) => {
    granted = v;
  });
  assert.equal(granted, false);
  for (const url of [
    "https://example.com/",
    "file:///etc/passwd",
    "data:image/png,xx",
  ]) {
    let result;
    before({ url }, (v) => {
      result = v;
    });
    assert.equal(result.cancel, true);
  }
  await assert.rejects(driver.goto("https://example.com"), /内存文档/);
  await driver.goto("data:text/html;charset=utf-8,%3Cp%3E");
  assert.equal(codes[0].world, 1008);
  await driver.close();
  assert.equal(destroyed, true);
  assert.equal(cleared, true);
});

test("rich source is returned only by approved document_read and never retained in tool audit", async () => {
  const { store, convertDocument } = await fixture();
  const runtime = new ToolRuntime({
    store,
    convertDocument,
    approve: async () => true,
  });
  const r = await runtime.execute("document_write", {
    name: "私有画布",
    html: "<p>秘密</p>",
  });
  const id = r.document.id;
  const read = await runtime.execute("document_read", { id });
  assert.match(read.document.editableHtml, /真实二进制/);
  assert.ok(!JSON.stringify(store.data.executions).includes("editableHtml"));
  await assert.rejects(
    runtime.documents.prepare("document_edit", {
      id,
      expectedRevision: 1,
      replacements: [{ find: "正文", replace: "修改" }],
    }),
    /画布/,
  );
});
