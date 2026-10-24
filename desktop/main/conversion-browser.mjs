/** Never shares browsing cookies, grants, preload, Node or network with conversions. */
import { randomUUID } from "node:crypto";
const blank =
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    "<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'\"><body></body>",
  );
export async function createConversionBrowser({
  BrowserWindow,
  session,
  signal,
}) {
  signal?.throwIfAborted();
  const isolated = session.fromPartition(
    "willbuddy-conversion-" + randomUUID(),
    { cache: false },
  );
  isolated.setPermissionRequestHandler((_wc, _permission, reply) =>
    reply(false),
  );
  isolated.setPermissionCheckHandler(() => false);
  isolated.webRequest.onBeforeRequest((request, reply) =>
    reply({ cancel: !request.url.startsWith("data:text/html;charset=utf-8,") }),
  );
  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    useContentSize: true,
    webPreferences: {
      session: isolated,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });
  const wc = win.webContents;
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  wc.on("will-navigate", (event) => event.preventDefault());
  wc.on("will-attach-webview", (event) => event.preventDefault());
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (!win.isDestroyed()) win.destroy();
    isolated.webRequest.onBeforeRequest(null);
    await isolated.clearStorageData();
  };
  const aborted = () => {
    close().catch(() => {});
  };
  signal?.addEventListener("abort", aborted, { once: true });
  const evaluate = async (fn, arg) => {
    signal?.throwIfAborted();
    if (closed) throw Error("转换浏览器已关闭");
    return wc.executeJavaScriptInIsolatedWorld(1008, [
      {
        code:
          typeof fn === "string"
            ? fn
            : `(${fn.toString()})(${JSON.stringify(arg) ?? "undefined"})`,
      },
    ]);
  };
  try {
    await win.loadURL(blank);
    signal?.throwIfAborted();
  } catch (e) {
    await close();
    throw e;
  }
  return {
    async setViewport({ width, height }) {
      if (!Number.isFinite(width) || width < 1 || width > 1600 || height > 1600)
        throw Error("转换视口超限");
      win.setContentSize(Math.ceil(width), Math.ceil(height));
    },
    async goto(url) {
      if (
        !url.startsWith("data:text/html;charset=utf-8,") ||
        url.length > 3000000
      )
        throw Error("转换仅接受受限内存文档");
      await win.loadURL(url);
      const size = await evaluate(() => ({
        height: document.documentElement.scrollHeight,
        count: document.querySelectorAll("*").length,
      }));
      if (size.height > 30000 || size.count > 2200)
        throw Error("文档布局超限，请分段转换");
    },
    evaluate,
    async addScript(source) {
      await evaluate(source);
    },
    async addInitScript() {
      throw Error("生产转换不接受初始化脚本");
    },
    async screenshot({ clip } = {}) {
      if (
        clip &&
        (![clip.x, clip.y, clip.width, clip.height].every(Number.isFinite) ||
          clip.width <= 0 ||
          clip.height <= 0 ||
          clip.width > 4096 ||
          clip.height > 4096)
      )
        throw Error("转换截图超限");
      return (
        await wc.capturePage(
          clip &&
            Object.fromEntries(
              Object.entries(clip).map(([k, v]) => [k, Math.round(v)]),
            ),
        )
      ).toPNG();
    },
    async screenshotElement(selector) {
      const box = await evaluate((selector) => {
        const r = document.querySelector(selector)?.getBoundingClientRect();
        return r && r.width > 0 && r.height > 0
          ? { x: r.x, y: r.y, width: r.width, height: r.height }
          : null;
      }, selector);
      return box ? this.screenshot({ clip: box }) : null;
    },
    async elementExists(selector) {
      return evaluate(
        (selector) => !!document.querySelector(selector),
        selector,
      );
    },
    async close() {
      signal?.removeEventListener("abort", aborted);
      await close();
    },
  };
}
