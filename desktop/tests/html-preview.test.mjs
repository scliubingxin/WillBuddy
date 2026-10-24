import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { readGranted } from "../core.mjs";
import { readFilePreview } from "../services/file-preview.mjs";
import {
  allowPreviewNavigation,
  protectPreviewNavigation,
} from "../main/preview-navigation.mjs";
import { preparePreviewProtocol } from "../main/preview-protocol.mjs";
import { JSDOM } from "jsdom";
import { mountHtmlPreview } from "../src/ui/html-preview.js";
import { createOfficeWorkspace } from "../src/ui/office-workspace.js";
test("authorized HTML preview reads complete >200k source; model attachment stays bounded; files/links/size/grants fail closed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-html-"));
  try {
    const source =
      "<!doctype html><body>" +
      "x".repeat(250000) +
      "<script>window.done=true</script></body>";
    await writeFile(path.join(dir, "p.html"), source);
    const folders = [{ id: "f", path: dir }],
      store = { data: { folders } };
    assert.equal(
      (await readFilePreview(store, { folderId: "f", relative: "p.html" }))
        .text,
      source,
    );
    assert.equal(
      (await readGranted(folders, "f", "p.html")).text.length,
      50000,
    );
    assert.equal((await readGranted(folders, "f", "p.html")).truncated, true);
    await symlink("p.html", path.join(dir, "link.html"));
    await assert.rejects(
      readFilePreview(store, { folderId: "f", relative: "link.html" }),
    );
    await assert.rejects(
      readFilePreview(store, { folderId: "f", relative: "../p.html" }),
    );
    await writeFile(path.join(dir, "big.html"), "x".repeat(1048577));
    await assert.rejects(
      readFilePreview(store, { folderId: "f", relative: "big.html" }),
    );
    await assert.rejects(
      readFilePreview(store, { folderId: "x", relative: "p.html" }),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("revocation while file preview reads prevents returning bytes", async () => {
  const store = { data: { folders: [{ id: "f", path: "/fixture" }] } };
  await assert.rejects(
    readFilePreview(store, { folderId: "f", relative: "a.html" }, async () => {
      store.data.folders = [];
      return { text: "secret" };
    }),
    /授权已撤销/,
  );
});
test("workspace frame navigation allows exact internal viewers/srcdoc, denies external/file/data/credentials/query and main-frame changes", () => {
  for (const url of [
    "about:srcdoc",
    "about:blank",
    "willbuddy-preview://local/html/index.html#abc",
    "willbuddy-preview://local/index.html",
  ])
    assert.equal(allowPreviewNavigation(url), true);
  for (const url of [
    "https://example.com",
    "file:///secret",
    "data:text/html,evil",
    "javascript:alert(1)",
    "willbuddy-preview://evil/html/index.html",
    "willbuddy-preview://u:p@local/html/index.html",
    "willbuddy-preview://local/html/index.html?path=/etc/passwd",
  ])
    assert.equal(allowPreviewNavigation(url), false);
  const c = new EventEmitter();
  protectPreviewNavigation(c);
  let blocks = 0;
  c.emit("will-frame-navigate", {
    url: "https://example.com",
    preventDefault() {
      blocks++;
    },
  });
  c.emit("will-frame-navigate", {
    url: "about:blank",
    isMainFrame: true,
    preventDefault() {
      blocks++;
    },
  });
  assert.equal(blocks, 2);
});
test("HTML wrapper has fixed routes and network-free CSP without changing Office restrictions", async () => {
  const route = await preparePreviewProtocol(
    new URL("../src/preview", import.meta.url).pathname,
  );
  for (const name of ["index.html", "frame.js"]) {
    const r = route({ url: "willbuddy-preview://local/html/" + name });
    assert.equal(r.status, 200);
    assert.match(
      r.headers.get("Content-Security-Policy"),
      /connect-src 'none'/,
    );
    assert.match(
      r.headers.get("Content-Security-Policy"),
      /script-src 'self' 'unsafe-inline'/,
    );
  }
  assert.notEqual(
    route({ url: "willbuddy-preview://local/html/secret.html" }).status,
    200,
  );
  assert.ok(
    !route({ url: "willbuddy-preview://local/index.html" })
      .headers.get("Content-Security-Policy")
      .includes("unsafe-inline'; style"),
  );
});
test("HTML handoff checks frame/source/token, sends full source once; timeout/dispose prevent late work", () => {
  const dom = new JSDOM('<body><div class="html-host"></div></body>', {
      url: "file:///app/src/index.html",
    }),
    w = dom.window,
    host = w.document.querySelector("div");
  host.dataset.htmlSource = "<!doctype html>" + "x".repeat(220000);
  const timers = [];
  w.setTimeout = (fn) => {
    timers.push(fn);
    return timers.length;
  };
  w.clearTimeout = () => {};
  const stop = mountHtmlPreview(host),
    f = host.querySelector("iframe"),
    token = f.src.split("#")[1],
    sent = [];
  f.contentWindow.postMessage = (m) => sent.push(m);
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: w,
      data: { kind: "html-ready", token },
    }),
  );
  assert.equal(sent.length, 0);
  for (let i = 0; i < 2; i++)
    w.dispatchEvent(
      new w.MessageEvent("message", {
        source: f.contentWindow,
        data: { kind: "html-ready", token },
      }),
    );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].source, host.dataset.htmlSource);
  stop();
  timers.forEach((fn) => fn());
  assert.equal(host.querySelector("iframe"), null);
  w.close();
});
test("same HTML full source keeps connected frame; modified source invalidates and releases", () => {
  const dom = new JSDOM('<body><div id="app"></div></body>'),
    a = dom.window.document.querySelector("#app");
  let starts = 0,
    stops = 0;
  const v = createOfficeWorkspace(a, (h) => {
      starts++;
      h.innerHTML = "<iframe></iframe>";
      return () => stops++;
    }),
    markup = (text) =>
      `<aside class="sidebar"></aside><header class="topbar"></header><div class="workbench"><div class="workspace"></div><aside class="session-panel"><div class="preview-scroll"><article class="document-preview"><div class="html-host" data-document-id="f" data-html-source="${text}"></div></article></div></aside></div>`;
  v.update(markup("a"), "files");
  const f = a.querySelector("iframe");
  v.update(markup("a"), "files");
  assert.equal(a.querySelector("iframe"), f);
  v.update(markup("b"), "files");
  assert.deepEqual([starts, stops], [2, 1]);
  v.dispose();
  dom.window.close();
});
