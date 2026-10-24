/** Build-time only: lockfile-pinned Office codecs, with all transitive licenses. */
import { build } from "../desktop/node_modules/esbuild/lib/main.js";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../desktop"),
  out = path.join(root, "runtime/vendor");
await mkdir(out, { recursive: true });
const result = await build({
  stdin: {
    contents: `export * as word from 'docx'; export {default as PptxGenJS} from 'pptxgenjs'; export * as zip from 'fflate'; export {DOMParser,XMLSerializer} from '@xmldom/xmldom';`,
    resolveDir: root,
  },
  // Native equivalent avoids an obsolete shim package lacking a bundled license.
  alias: {isarray:path.resolve(import.meta.dirname,"native-isarray.cjs")},
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  minify: true,
  legalComments: "eof",
  outfile: path.join(out, "office.cjs"),
  metafile: true,
});
// Resolve package directories from esbuild's cwd-relative inputs, including nested dependencies.
const dirs = new Set();
for (const file of Object.keys(result.metafile.inputs)) {
  const absolute = path.resolve(file),
    parts = absolute.split(path.sep);
  let i = parts.lastIndexOf("node_modules");
  if (i < 0) continue;
  dirs.add(
    parts.slice(0, i + (parts[i + 1].startsWith("@") ? 3 : 2)).join(path.sep),
  );
}
const licenses = [];
for (const dir of [...dirs].sort()) {
  const meta = JSON.parse(
    await readFile(path.join(dir, "package.json"), "utf8"),
  );
  let found = false;
  for (const name of await readdir(dir)) {
    if (
      /^(licen[cs]e|copying|notice)/i.test(name) &&
      (await stat(path.join(dir, name))).isFile()
    ) {
      licenses.push(
        `\n===== ${meta.name}@${meta.version}: ${name} =====\n` +
          (await readFile(path.join(dir, name), "utf8")),
      );
      found = true;
    }
  }
  if (!found) throw Error("Missing bundled license " + meta.name);
}
await writeFile(path.join(out, "OFFICE-LICENSES.txt"), licenses.join("\n"));
const bytes = await readFile(path.join(out, "office.cjs"));
await writeFile(
  path.join(out, "OFFICE-MANIFEST.json"),
  JSON.stringify(
    {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      packages: dirs.size,
      entryDependencies: JSON.parse(
        await readFile(path.join(root, "package.json"), "utf8"),
      ).devDependencies,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Offline Office codec bytes",
  bytes.length,
  "licensed packages",
  dirs.size,
);
