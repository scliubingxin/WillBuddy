/** Offline classic script: module scripts fail CORS in an opaque sandbox. */
import { build } from "../desktop/node_modules/esbuild/lib/main.js";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const directory = new URL("../desktop/src/media/", import.meta.url);
await build({
  entryPoints: [new URL("frame-source.js", directory).pathname],
  outfile: new URL("frame.js", directory).pathname,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome148",
});
const files = [];
for (const name of ["index.html", "frame.js"]) {
  const bytes = await readFile(new URL(name, directory));
  files.push({
    name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  new URL("MEDIA-MANIFEST.json", directory),
  JSON.stringify({ files }, null, 2) + "\n",
);
console.log("Bundled self-contained media frame; no runtime dependencies.");
