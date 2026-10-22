/** Native-dialog destinations only. Renderer/model never supplies a filesystem path. */
import { open, rename, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function readDocumentSource(source) {
  const file = await open(source, "r");
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > 4 * 1024 * 1024)
      throw Error("文档最多 4 MiB");
    const buffer = Buffer.alloc(4 * 1024 * 1024 + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        count,
        buffer.length - count,
        count,
      );
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > 4 * 1024 * 1024) throw Error("文档读取体积超限");
    const after = await file.stat();
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      count !== before.size
    )
      throw Error("读取期间文件变化");
    return buffer.subarray(0, count);
  } finally {
    await file.close();
  }
}
export async function writeDocumentDestination(destination, bytes) {
  const temporary = path.join(
    path.dirname(destination),
    ".willbuddy-" + randomUUID() + ".tmp",
  );
  let file,
    published = false;
  try {
    file = await open(temporary, "wx", 0o600);
    await file.writeFile(bytes);
    await file.sync();
    await file.close();
    file = null;
    const checked = await readFile(temporary);
    if (!checked.equals(bytes)) throw Error("导出暂存核验失败");
    await rename(temporary, destination);
    published = true;
    const actual = await readDocumentSource(destination);
    if (!actual.equals(bytes)) throw Error("导出回读核验失败");
    return actual.length;
  } finally {
    await file?.close();
    if (!published)
      await unlink(temporary).catch((e) => {
        if (e.code !== "ENOENT") throw e;
      });
  }
}
