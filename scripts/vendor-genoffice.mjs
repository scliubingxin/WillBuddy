/** Reproducible pinned Apache-2.0 GenOffice subset. Reuses existing licensed docx. */
import { build } from "../desktop/node_modules/esbuild/lib/main.js";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  source = path.join(root, "vendor/genoffice-html2docx/src"),
  out = path.join(root, "desktop/runtime/vendor");
const names = new Set();
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) await walk(f);
    else if (e.name.endsWith(".ts")) {
      const s = await readFile(f, "utf8");
      for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]docx['"]/g))
        for (const n of m[1].split(",")) if (n.trim()) names.add(n.trim());
    }
  }
}
await walk(source);
const r = await build({
  entryPoints: [path.join(source, "index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  minify: false,
  legalComments: "eof",
  external: ["./office.cjs"],
  outfile: path.join(out, "genoffice.cjs"),
  metafile: true,
  plugins: [
    {
      name: "raw-source",
      setup(b) {
        b.onResolve({ filter: /\?raw$/ }, (a) => ({
          path: path.resolve(a.resolveDir, a.path.slice(0, -4)),
          namespace: "raw",
        }));
        b.onLoad({ filter: /.*/, namespace: "raw" }, async (a) => ({
          contents: await readFile(a.path, "utf8"),
          loader: "text",
        }));
      },
    },
    {
      name: "existing-docx",
      setup(b) {
        b.onResolve({ filter: /^docx$/ }, () => ({
          path: "docx",
          namespace: "existing",
        }));
        b.onLoad({ filter: /.*/, namespace: "existing" }, () => ({
          contents: `import * as office from './office.cjs'; export const {${[...names].sort().join(",")}}=office.word;`,
          resolveDir: out,
        }));
      },
    },
  ],
});
await build({
  entryPoints: [path.join(root, "desktop/runtime/conversion-sanitizer.js")],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "chrome130",
  minify: true,
  outfile: path.join(out, "conversion-sanitizer.js"),
  legalComments: "eof",
});
const files = [];
for (const input of Object.keys(r.metafile.inputs).filter(
  (f) => !f.startsWith("existing:") && !f.startsWith("raw:"),
)) {
  const p = path.resolve(input);
  files.push({
    path: path.relative(root, p),
    sha256: createHash("sha256")
      .update(await readFile(p))
      .digest("hex"),
  });
}
async function sourceHashes(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sourceHashes(p)));
    else
      out.push({
        path: path.relative(root, p),
        sha256: createHash("sha256")
          .update(await readFile(p))
          .digest("hex"),
      });
  }
  return out;
}
const provenance = {
  project: "GenOffice HTML to DOCX",
  upstream: "https://github.com/genspark-ai/genoffice",
  commit: "342abce4280ea92bf7e59580f1ecaf9b562d0f72",
  license:
    "Apache-2.0; LICENSE and NOTICE in vendor/genoffice-html2docx; no ee, fonts or native sidecars",
  modifications:
    "Upstream src copied unmodified; build-time raw imports and docx namespace shim reuse WillBuddy office.cjs",
  docx: "9.13.0; existing OFFICE-LICENSES.txt/office.cjs; no extra install at runtime",
  files,
  upstreamSources: await sourceHashes(source),
  runtimeOfficeSha256: createHash("sha256")
    .update(await readFile(path.join(out, "office.cjs")))
    .digest("hex"),
};
await writeFile(
  path.join(out, "GENOFFICE-MANIFEST.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
await writeFile(
  path.join(out, "GenOffice-LICENSE.txt"),
  await readFile(path.join(root, "vendor/genoffice-html2docx/LICENSE")),
);
await writeFile(
  path.join(out, "GenOffice-NOTICE.txt"),
  await readFile(path.join(root, "vendor/genoffice-html2docx/NOTICE")),
);
console.log(
  "Built pinned GenOffice converter; " + names.size + " docx exports reused.",
);
