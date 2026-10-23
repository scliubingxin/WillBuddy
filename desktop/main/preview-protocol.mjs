import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
export const previewScheme = {
  scheme: "willbuddy-preview",
  privileges: {
    standard: true,
    secure: true,
    codeCache: true,
    bypassCSP: false,
    supportFetchAPI: false,
    allowServiceWorkers: false,
    corsEnabled: false,
  },
};
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
/** A two-file immutable application resource route, never a filesystem proxy. */
export async function preparePreviewProtocol(directory) {
  const [html, engine, manifest] = await Promise.all([
    readFile(path.join(directory, "index.html")),
    readFile(path.join(directory, "engine.js")),
    readFile(path.join(directory, "PREVIEW-MANIFEST.json"), "utf8"),
  ]);
  const expected = JSON.parse(manifest);
  if (
    engine.length !== expected.bytes ||
    createHash("sha256").update(engine).digest("hex") !== expected.sha256
  )
    throw Error("预览引擎完整性校验失败");
  const resources = new Map([
    ["/index.html", { bytes: html, type: "text/html; charset=utf-8" }],
    ["/engine.js", { bytes: engine, type: "text/javascript; charset=utf-8" }],
  ]);
  return (request) => {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!["GET", "HEAD"].includes(request.method || "GET"))
      return new Response(null, { status: 405 });
    if (
      url.protocol !== "willbuddy-preview:" ||
      url.hostname !== "local" ||
      url.port ||
      url.username ||
      url.password ||
      url.search
    )
      return new Response(null, { status: 403 });
    const resource = resources.get(url.pathname);
    if (!resource) return new Response(null, { status: 404 });
    return new Response(request.method === "HEAD" ? null : resource.bytes, {
      status: 200,
      headers: {
        "Content-Type": resource.type,
        "Content-Security-Policy": CSP,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "no-store",
      },
    });
  };
}
