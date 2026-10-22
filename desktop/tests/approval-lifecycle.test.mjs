import { test } from "node:test";
import assert from "node:assert/strict";
import { createApprover } from "../main/approval.mjs";
import { ToolRuntime } from "../runtime/tools.mjs";
import { createBrowserPermissions } from "../runtime/browser-permissions.mjs";
const turn = () => new Promise((r) => setImmediate(r));
test("active native dialog receives AbortSignal, cancels and releases queued work", async () => {
  let shown = 0,
    firstSignal;
  const approve = createApprover({
    getWindow: () => ({}),
    focus: () => {},
    dialog: {
      showMessageBox: (_window, options) => {
        shown++;
        if (shown === 2) return Promise.resolve({ response: 1 });
        firstSignal = options.signal;
        return new Promise((r) =>
          options.signal.addEventListener("abort", () => r({ response: 0 }), {
            once: true,
          }),
        );
      },
    },
  });
  const c = new AbortController(),
    first = approve("active", "details", c.signal),
    second = approve("next", "details");
  const rejected = assert.rejects(first, { name: "AbortError" });
  await turn();
  assert.ok(firstSignal);
  c.abort();
  await rejected;
  assert.equal(await second, true);
  assert.equal(shown, 2);
});
test("emergency cancellation closes active and cancels queued requests without late acceptance", async () => {
  let resolve,
    shown = 0;
  const approve = createApprover({
    getWindow: () => ({}),
    focus: () => {},
    dialog: {
      showMessageBox: () => {
        shown++;
        return new Promise((r) => {
          resolve = r;
        });
      },
    },
  });
  const a = approve("a", ""),
    b = approve("b", "");
  const rejected = Promise.all([assert.rejects(a), assert.rejects(b)]);
  await turn();
  approve.cancelAll();
  await rejected;
  assert.equal(shown, 1);
  await assert.rejects(approve("new", ""), /尚未关闭/);
  resolve({ response: 1 });
  await turn();
});
test("timeout cancels a hung adapter and never treats a late Allow as approval", async () => {
  let finish, signal;
  const approve = createApprover({
    timeoutMs: 15,
    getWindow: () => ({}),
    focus: () => {},
    dialog: {
      showMessageBox: (_w, o) => {
        signal = o.signal;
        return new Promise((r) => (finish = r));
      },
    },
  });
  await assert.rejects(approve("a", ""), { name: "TimeoutError" });
  assert.equal(signal.aborted, true);
  finish({ response: 1 });
  await turn();
});
test("missing parent fails closed and task consent is explicit, never the default", async () => {
  let calls = 0;
  const missing = createApprover({
    getWindow: () => null,
    focus: () => {},
    dialog: {
      showMessageBox: async () => {
        calls++;
      },
    },
  });
  await assert.rejects(missing("a", ""), /窗口/);
  assert.equal(calls, 0);
  const approve = createApprover({
    getWindow: () => ({}),
    focus: () => {},
    dialog: {
      showMessageBox: async (_w, o) => {
        assert.equal(o.defaultId, 0);
        assert.equal(o.cancelId, 0);
        assert.equal(o.buttons.length, 3);
        return { response: 2 };
      },
    },
  });
  assert.deepEqual(
    await approve("browser", "", undefined, {
      browserScope: { origin: "https://example.com", runId: "r" },
    }),
    { allowed: true, browserTask: true },
  );
});
test("browser grant exact origin/run, known cross-origin target, revoke and completion boundaries", () => {
  const p = createBrowserPermissions(),
    scope = p.scope(
      "browser_open",
      { url: "https://example.com/a" },
      { runId: "r" },
    );
  p.allow(scope);
  assert.equal(
    p.has(
      p.scope("browser_open", { url: "https://example.com/b" }, { runId: "r" }),
    ),
    true,
  );
  for (const [url, runId] of [
    ["http://example.com", "r"],
    ["https://example.com:8443", "r"],
    ["https://other.example", "r"],
    ["https://example.com", "another"],
  ])
    assert.equal(p.has(p.scope("browser_open", { url }, { runId })), false);
  assert.equal(
    p.scope(
      "browser_click",
      {},
      {
        runId: "r",
        prepared: {
          url: "https://example.com",
          target: { href: "https://elsewhere.example" },
        },
      },
    ),
    null,
  );
  p.release("r");
  assert.equal(p.has(scope), false);
  p.allow(scope);
  p.revoke();
  assert.throws(() => p.check(scope), /撤销/);
  assert.throws(() => p.allow(scope), /撤销/);
  assert.equal(p.scope("cli_execute", {}, { runId: "r" }), null);
});
test("runtime reuses browser consent only in same run/site; CLI remains individual approval", async () => {
  const store = {
    data: { settings: {}, executions: [], documents: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  let approvals = 0;
  const browser = {
    list: () => [{ id: "w", url: "https://example.com/path" }],
    open: async () => ({ status: "opened" }),
    read: async () => ({ status: "read", text: "actual fixture" }),
    snapshot: async () => ({ status: "inspected" }),
  };
  const runtime = new ToolRuntime({
    store,
    browser,
    approve: async (_t, _d, _s, context) => {
      approvals++;
      return context?.browserScope
        ? { allowed: true, browserTask: true }
        : false;
    },
  });
  await runtime.execute(
    "browser_open",
    { url: "https://example.com" },
    undefined,
    { runId: "r" },
  );
  await runtime.execute("browser_read", { id: "w" }, undefined, { runId: "r" });
  await runtime.execute("browser_snapshot", { id: "w" }, undefined, {
    runId: "r",
  });
  assert.equal(approvals, 1);
  assert.equal(store.data.executions[0].authorization, "browser_task_origin");
  await runtime.execute("browser_read", { id: "w" }, undefined, {
    runId: "another",
  });
  assert.equal(approvals, 2);
  runtime.browserPermissions.revoke();
  await runtime.execute("browser_read", { id: "w" }, undefined, { runId: "r" });
  assert.equal(approvals, 3);
});
test("revocation during persistence blocks an automatically authorized browser action", async () => {
  const store = {
    data: { executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  let reads = 0;
  const runtime = new ToolRuntime({
    store,
    browser: {
      list: () => [{ id: "w", url: "https://example.com" }],
      read: async () => {
        reads++;
        return { status: "read" };
      },
    },
    approve: async () => ({ allowed: true, browserTask: true }),
  });
  await runtime.execute("browser_read", { id: "w" }, undefined, { runId: "r" });
  let saves = 0;
  store.save = async () => {
    if (++saves === 2) runtime.browserPermissions.revoke();
  };
  const result = await runtime.execute("browser_read", { id: "w" }, undefined, {
    runId: "r",
  });
  assert.equal(result.status, "failed");
  assert.equal(reads, 1);
});
test("oversized approval never opens an off-screen native sheet; Word approval uses human summary", async () => {
  let calls = 0;
  const approve = createApprover({
    getWindow: () => ({}),
    focus: () => {},
    dialog: {
      showMessageBox: async () => {
        calls++;
        return { response: 1 };
      },
    },
  });
  await assert.rejects(approve("CLI", "x".repeat(1001)), /过长/);
  await assert.rejects(approve("CLI", "x\n".repeat(21)), /过长/);
  assert.equal(calls, 0);
  const store = {
    data: { documents: [], executions: [], folders: [] },
    save: async () => {},
    log: () => {},
  };
  let actualDetail;
  const runtime = new ToolRuntime({
    store,
    approve: async (title, detail) => {
      actualDetail = detail;
      return true;
    },
  });
  const result = await runtime.execute("document_create", {
    name: "长报告",
    format: "docx",
    content: JSON.stringify({
      title: "分析报告",
      blocks: [{ type: "paragraph", text: "这是报告正文。".repeat(1000) }],
    }),
  });
  assert.equal(result.status, "succeeded");
  assert.ok(actualDetail.length < 700);
  assert.ok(!actualDetail.includes('"blocks"'));
  assert.match(actualDetail, /摘要/);
});
test('navigation during body read cannot return another origin under old consent',async()=>{const {BrowserService}=await import('../runtime/browser.mjs');const b=new BrowserService({});let url='https://example.com';b.windows.set('w',{isDestroyed:()=>false,getTitle:()=>'',webContents:{getURL:()=>url,executeJavaScript:async()=>{url='https://elsewhere.example';return 'must not leak';}}});await assert.rejects(b.read('w'),/导航/);});
