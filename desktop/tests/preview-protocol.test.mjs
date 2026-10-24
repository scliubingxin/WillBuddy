import { test } from "node:test";
import assert from "node:assert/strict";
import {
  preparePreviewProtocol,
  previewScheme,
} from "../main/preview-protocol.mjs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";
import { mountOfficePreview } from "../src/ui/office-preview.js";
test("preview route serves only two verified static resources and preserves restrictive CSP", async () => {
  const dir = path.resolve(import.meta.dirname, "../src/preview"),
    handler = await preparePreviewProtocol(dir);
  for (const n of ["index.html", "engine.js"]) {
    const r = handler({ url: "willbuddy-preview://local/" + n, method: "GET" });
    assert.equal(r.status, 200);
    assert.deepEqual(
      Buffer.from(await r.arrayBuffer()),
      await readFile(path.join(dir, n)),
    );
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    assert.match(
      r.headers.get("Content-Security-Policy"),
      /connect-src 'none'/,
    );
  }
  assert.equal(
    handler({ url: "willbuddy-preview://local/index.html", method: "HEAD" })
      .status,
    200,
  );
  for (const url of [
    "willbuddy-preview://evil/index.html",
    "willbuddy-preview://local/main.mjs",
    "willbuddy-preview://local/engine.js?path=/secret",
    "willbuddy-preview://local/%2e%2e/core.mjs",
    "file:///etc/passwd",
    "willbuddy-preview://user:pass@local/index.html",
  ])
    assert.notEqual(handler({ url, method: "GET" }).status, 200);
  assert.equal(
    handler({ url: "willbuddy-preview://local/index.html", method: "POST" })
      .status,
    405,
  );
  assert.equal(previewScheme.privileges.bypassCSP, false);
  assert.equal(previewScheme.privileges.supportFetchAPI, false);
  assert.equal(previewScheme.privileges.allowServiceWorkers, false);
});
test("tampered packaged preview engine fails before protocol registration", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-proto-"));
  try {
    await writeFile(path.join(dir, "index.html"), "trusted");
    await writeFile(path.join(dir, "engine.js"), "changed");
    await writeFile(
      path.join(dir, "PREVIEW-MANIFEST.json"),
      JSON.stringify({
        bytes: 8,
        sha256: createHash("sha256").update("original").digest("hex"),
      }),
    );
    await assert.rejects(preparePreviewProtocol(dir), /完整性校验/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("file-host preview uses application protocol; forged messages rejected and dispose blocks late bytes", async () => {
  const dom = new JSDOM(
      '<body><div data-document-id="a" data-revision="1"></div></body>',
      { url: "file:///app/src/index.html" },
    ),
    win = dom.window,
    host = win.document.querySelector("div");
  let calls = 0,
    resolve;
  const stop = mountOfficePreview(host, () => {
    calls++;
    return new Promise((r) => (resolve = r));
  });
  const frame = host.querySelector("iframe"),
    token = frame.src.split("#")[1];
  assert.ok(frame.src.startsWith("willbuddy-preview://local/"));
  assert.equal(frame.getAttribute("sandbox"), "allow-scripts");
  win.dispatchEvent(
    new win.MessageEvent("message", {
      source: win,
      data: { token, kind: "office-ready" },
    }),
  );
  win.dispatchEvent(
    new win.MessageEvent("message", {
      source: frame.contentWindow,
      data: { token: "wrong", kind: "office-ready" },
    }),
  );
  assert.equal(calls, 0);
  win.dispatchEvent(
    new win.MessageEvent("message", {
      source: frame.contentWindow,
      data: { token, kind: "office-ready" },
    }),
  );
  assert.equal(calls, 1);
  stop();
  resolve({ base64: "secret" });
  await Promise.resolve();
  assert.equal(host.querySelector("iframe"), null);
  win.close();
});
test('component startup timeout explains phase and manual retry creates a fresh token without reading documents',()=>{const dom=new JSDOM('<body><div data-document-id="a" data-revision="1"></div></body>',{url:'file:///app/src/index.html'}),win=dom.window,host=win.document.querySelector('div'),timers=[];win.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length;};win.clearTimeout=()=>{};let calls=0;const stop=mountOfficePreview(host,async()=>{calls++;return {};});const original=host.querySelector('iframe').src;assert.equal(timers[0].ms,5000);timers[0].fn();assert.match(host.textContent,/文件尚未开始渲染/);assert.equal(calls,0);host.querySelector('button').click();assert.notEqual(host.querySelector('iframe').src,original);assert.equal(calls,0);stop();win.close();});
