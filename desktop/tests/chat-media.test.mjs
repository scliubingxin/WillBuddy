import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createRich } from "../src/ui/markdown.js";
import { mediaUrl } from "../src/ui/media-policy.js";
import { chartSpec, chartFigure } from "../src/ui/charts.js";
import { installChatMedia } from "../src/ui/chat-media.js";
import { createOfficeWorkspace } from "../src/ui/office-workspace.js";
import { preparePreviewProtocol } from "../main/preview-protocol.mjs";
const chart = {
  type: "bar",
  title: "季度合计",
  labels: ["一月", "二月"],
  series: [{ name: "收入", values: [3, -2] }],
};
test("media rejects local/inline/credentials/private/numeric/malformed endpoints, accepts public HTTPS", () => {
  for (const s of [
    "file:///etc/passwd",
    "data:image/png;base64,xxx",
    "javascript:alert(1)",
    "http://example.com/a",
    "https://u:p@example.com/a",
    "https://127.0.0.1/a",
    "https://[::1]/",
    "https://2130706433/",
    "https://0x7f000001/",
    "https://localhost/a",
    "https://foo.local/a",
    "https://example.com:9443/",
    "https://example.com/a\n",
    "https://example.com\\@localhost/",
  ])
    assert.equal(mediaUrl(s), null, s);
  assert.equal(
    mediaUrl("https://cdn.example.com/a.png?x=1&y=2"),
    "https://cdn.example.com/a.png?x=1&y=2",
  );
});
test("Markdown and semantic HTML create inert media cards, video links, and website cards without loading", () => {
  const d = new JSDOM("<body></body>"),
    r = createRich(d.window);
  d.window.document.body.innerHTML = r.rich(
    '![效果](https://cdn.example.com/a.png)\n\n[演示](https://cdn.example.com/v.webm)\n\n[官网](https://example.com/report)\n\n<video autoplay src="https://cdn.example.com/b.mp4" onplay="alert(1)"></video>',
  );
  const doc = d.window.document;
  assert.equal(doc.querySelectorAll(".chat-media").length, 3);
  assert.equal(
    doc.querySelectorAll('.media-load[data-media-kind="video"]').length,
    2,
  );
  assert.equal(
    doc.querySelectorAll("iframe,img,video,[src],script,[onplay],[autoplay]")
      .length,
    0,
  );
  assert.equal(
    doc.querySelector(".web-link-card small").textContent,
    "example.com",
  );
  assert.equal(
    doc.querySelector(".media-load").dataset.mediaUrl,
    "https://cdn.example.com/a.png",
  );
  d.window.close();
});
test("untrusted controls, CSS, SVG and spoofed data actions cannot enter chat; bad URLs stay inert", () => {
  const d = new JSDOM("<body></body>");
  d.window.document.body.innerHTML = createRich(d.window).rich(
    '<button class="media-load" data-media-url="https://evil.example/a" data-action="deleteChat">攻击</button><svg><script>alert(1)</script></svg><iframe src="https://evil.example"></iframe><img src="file:///secret" onerror="alert(1)"><video src="javascript:alert(1)"></video>',
  );
  assert.equal(
    d.window.document.querySelector(
      "[data-action], [data-media-url], iframe, svg, img, video, script, [onerror]",
    ),
    null,
  );
  d.window.close();
});
test("static HTML preview retains network-free inert media placeholders", () => {
  const d = new JSDOM("<body></body>"),
    r = createRich(d.window),
    html = r.sanitizeHtml(
      '<img src="https://cdn.example/a"><video src="https://cdn.example/b"></video>',
      { preview: true, links: false },
    );
  assert.ok(!/src=|data-media|<button|<video|<img/.test(html));
  d.window.close();
});
test("bounded bar/line/pie charts render local SVG and exact accessible data without execution", () => {
  const d = new JSDOM("<body></body>");
  for (const type of ["bar", "line", "pie"]) {
    const spec = { ...chart, type, series: [{ name: "数值", values: [3, 2] }] };
    const f = chartFigure(d.window.document, chartSpec(JSON.stringify(spec)));
    assert.ok(f.querySelector("svg"));
    assert.equal(f.querySelector("tbody")?.textContent, undefined);
    assert.match(f.querySelector("table").textContent, /数值/);
    assert.equal(
      f.querySelector("script,image,foreignObject,a,[href],[onclick]"),
      null,
    );
  }
  const source = "说明\n```chart\n" + JSON.stringify(chart) + "\n```";
  d.window.document.body.innerHTML = createRich(d.window).rich(source);
  assert.equal(
    d.window.document.querySelector("figcaption").textContent,
    "季度合计",
  );
  assert.equal(
    d.window.document.querySelectorAll(".chat-chart rect").length,
    2,
  );
  assert.match(d.window.document.querySelector("table").textContent, /-2/);
  d.window.close();
});
test("invalid/oversized/incomplete chart data falls back to readable source, not misleading graphs", () => {
  for (const bad of [
    { ...chart, type: "javascript" },
    { ...chart, labels: [] },
    { ...chart, series: [{ name: "A", values: [null, 1] }] },
    { ...chart, type: "pie" },
    { ...chart, labels: Array(31).fill("A") },
  ])
    assert.throws(() => chartSpec(JSON.stringify(bad)));
  const d = new JSDOM("<body></body>"),
    r = createRich(d.window);
  assert.ok(!r.rich("```chart\n" + JSON.stringify(chart)).includes("<svg"));
  assert.match(r.rich('```chart\n{"type":"exec"}\n```'), /图表未渲染/);
  assert.equal(
    (
      r
        .rich(
          Array(8)
            .fill("```chart\n" + JSON.stringify(chart) + "\n```")
            .join("\n\n"),
        )
        .match(/class="chat-chart"/g) || []
    ).length,
    6,
  );
  d.window.close();
});
test("media handshake is frame/token-bound, single-use; close cancels and late messages stay inert", () => {
  const d = new JSDOM("<body></body>", { url: "file:///app/src/index.html" }),
    w = d.window;
  w.document.body.innerHTML = createRich(w).rich(
    "![图](https://cdn.example.com/a.png)",
  );
  const stop = installChatMedia(w.document);
  w.document.querySelector(".media-load").click();
  const f = w.document.querySelector("iframe"),
    token = f.src.split("#")[1];
  assert.equal(f.getAttribute("sandbox"), "allow-scripts");
  assert.equal(f.referrerPolicy, "no-referrer");
  let posts = 0;
  f.contentWindow.postMessage = () => posts++;
  for (const [source, t] of [
    [w, token],
    [f.contentWindow, "bad"],
  ])
    w.dispatchEvent(
      new w.MessageEvent("message", {
        source,
        data: { kind: "media-ready", token: t },
      }),
    );
  assert.equal(posts, 0);
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: f.contentWindow,
      data: { kind: "media-ready", token },
    }),
  );
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: f.contentWindow,
      data: { kind: "media-ready", token },
    }),
  );
  assert.equal(posts, 1);
  w.document.querySelector(".media-stop").click();
  assert.equal(w.document.querySelector("iframe"), null);
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: w,
      data: { kind: "media-complete", token },
    }),
  );
  assert.equal(w.document.querySelector("iframe"), null);
  stop();
  w.close();
});
test("media error and boot timeout release frame and allow fresh-token explicit retry", () => {
  const d = new JSDOM("<body></body>", { url: "file:///app/src/index.html" }),
    w = d.window,
    timers = [];
  w.setTimeout = (fn) => {
    timers.push(fn);
    return timers.length;
  };
  w.clearTimeout = () => {};
  w.document.body.innerHTML = createRich(w).rich(
    "![图](https://cdn.example.com/a.png)",
  );
  const stop = installChatMedia(w.document),
    b = w.document.querySelector(".media-load");
  b.click();
  const old = w.document.querySelector("iframe").src;
  timers[0]();
  assert.equal(w.document.querySelector("iframe"), null);
  assert.equal(b.disabled, false);
  assert.match(w.document.body.textContent, /再次点击/);
  b.click();
  assert.notEqual(w.document.querySelector("iframe").src, old);
  stop();
  w.close();
});
test("unrelated conversation redraws keep connected media; message mutation/scope change disposes", () => {
  const d = new JSDOM('<body><div id="app"></div></body>'),
    app = d.window.document.querySelector("#app"),
    view = createOfficeWorkspace(app, () => () => {}),
    markup = (v = "原文") =>
      `<aside class="sidebar"></aside><main><header class="topbar"></header><div class="workbench"><div class="workspace"><div class="chat"><div class="chat-heading"></div><div class="messages-scroll"><div class="messages">${v}</div></div><textarea id="prompt"></textarea></div></div></div></main>`;
  view.update(markup(), "chat:a");
  const scroll = app.querySelector(".messages-scroll"),
    card = d.window.document.createElement("figure");
  card.className = "chat-media";
  card.innerHTML = '<iframe class="chat-media-frame"></iframe>';
  scroll.append(card);
  const frame = card.firstChild;
  for (let i = 0; i < 10; i++) {
    view.update(markup(), "chat:a");
    assert.equal(app.querySelector("iframe"), frame);
    assert.ok(frame.isConnected);
  }
  view.update(markup("变更"), "chat:a");
  assert.equal(app.querySelector("iframe"), null);
  view.update(markup(), "chat:b");
  assert.equal(app.querySelector("iframe"), null);
  view.dispose();
  d.window.close();
});
test("only fixed media files receive network media CSP; Office and parent remain network-free", async () => {
  const route = await preparePreviewProtocol(
    new URL("../src/preview/", import.meta.url).pathname,
  );
  for (const name of ["media/index.html", "media/frame.js"]) {
    const r = route({
      url: "willbuddy-preview://local/" + name,
      method: "GET",
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("Content-Security-Policy"), /media-src https:/);
    assert.match(
      r.headers.get("Content-Security-Policy"),
      /connect-src 'none'/,
    );
  }
  const office = route({ url: "willbuddy-preview://local/index.html" });
  assert.ok(!office.headers.get("Content-Security-Policy").includes("https:"));
  for (const name of [
    "media/secret",
    "media/index.html?url=https://example.com",
    "ui/charts.js",
  ])
    assert.notEqual(
      route({ url: "willbuddy-preview://local/" + name }).status,
      200,
    );
});
test("at most three media sessions load at once; closing permits another explicit load", () => {
  const d = new JSDOM("<body></body>", { url: "file:///app/src/index.html" }),
    w = d.window;
  w.document.body.innerHTML = createRich(w).rich(
    Array(4).fill("![图](https://cdn.example.com/a.png)").join("\n\n"),
  );
  const stop = installChatMedia(w.document),
    buttons = [...w.document.querySelectorAll(".media-load")];
  buttons.forEach((b) => b.click());
  assert.equal(w.document.querySelectorAll("iframe").length, 3);
  assert.match(w.document.body.textContent, /最多同时打开3/);
  w.document.querySelector(".media-stop").click();
  buttons[3].click();
  assert.equal(w.document.querySelectorAll("iframe").length, 3);
  stop();
  w.close();
});
test("media resource tampering fails before protocol registration", async () => {
  const { mkdtemp, cp, writeFile, rm } = await import("node:fs/promises"),
    { tmpdir } = await import("node:os"),
    path = await import("node:path");
  const temp = await mkdtemp(path.join(tmpdir(), "wb-media-tamper-"));
  try {
    await cp(
      new URL("../src/preview/", import.meta.url),
      path.join(temp, "preview"),
      { recursive: true },
    );
    await cp(
      new URL("../src/media/", import.meta.url),
      path.join(temp, "media"),
      { recursive: true },
    );
    await writeFile(path.join(temp, "media/frame.js"), "tampered");
    await assert.rejects(
      preparePreviewProtocol(path.join(temp, "preview")),
      /媒体组件完整性/,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
