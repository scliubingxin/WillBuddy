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
/** Fixed immutable Office/media resources, never a filesystem proxy or data URL route. */
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
  const mediaRoot = path.join(directory, "../media");
  const mediaManifest = JSON.parse(
    await readFile(path.join(mediaRoot, "MEDIA-MANIFEST.json"), "utf8"),
  );
  const mediaCsp =
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src https: blob:; media-src https:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const resources = new Map([
    ["/index.html", { bytes: html, type: "text/html; charset=utf-8" }],
    ["/engine.js", { bytes: engine, type: "text/javascript; charset=utf-8" }],
  ]);
  for (const [url, file, type] of [
    [
      "/media/index.html",
      path.join(mediaRoot, "index.html"),
      "text/html; charset=utf-8",
    ],
    [
      "/media/frame.js",
      path.join(mediaRoot, "frame.js"),
      "text/javascript; charset=utf-8",
    ],
  ]) {
    const bytes = await readFile(file),
      entry = mediaManifest.files.find((e) => e.name === path.basename(file));
    if (
      !entry ||
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw Error("媒体组件完整性校验失败");
    resources.set(url, { bytes, type, csp: mediaCsp });
  }
  const pdfRoot=path.join(directory,'../pdf'),pdfManifest=JSON.parse(await readFile(path.join(pdfRoot,'PDF-MANIFEST.json'),'utf8'));
  for(const name of ['index.html','engine.js']){const bytes=await readFile(path.join(pdfRoot,name));if(name==='engine.js'&&(bytes.length!==pdfManifest.bytes||createHash('sha256').update(bytes).digest('hex')!==pdfManifest.sha256))throw Error('PDF组件完整性失败');resources.set('/pdf/'+name,{bytes,type:name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8',csp:CSP});}
  const htmlRoot=path.join(directory,'../html');
  const htmlCsp="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; frame-src about:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  for(const name of ['index.html','frame.js'])resources.set('/html/'+name,{bytes:await readFile(path.join(htmlRoot,name)),type:name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8',csp:htmlCsp});
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
        "Content-Security-Policy": resource.csp || CSP,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "no-store",
      },
    });
  };
}
