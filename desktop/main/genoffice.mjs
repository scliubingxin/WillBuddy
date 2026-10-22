/** Optional GenOffice handoff: isolated copy, explicit review, optimistic import.
 * No remote editor, arbitrary executable, CLI args or renderer-provided path.
 */
import { mkdtemp, chmod, writeFile, lstat, rm, access } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readDocumentSource } from "./document-files.mjs";
import { inspectDocument } from "../runtime/documents.mjs";
const exec = promisify(execFile);
export function createGenOfficeBridge({
  documents,
  approve,
  platform = process.platform,
  findApp = async () => {
    for (const candidate of [
      path.join(homedir(), "Applications/GenOffice.app"),
      "/Applications/GenOffice.app",
    ]) {
      try {
        await access(path.join(candidate, "Contents/MacOS/GenOffice"));
        return candidate;
      } catch {}
    }
    throw Error(
      "未找到 GenOffice。请先安装官方 Apple 芯片版 GenOffice 到 Applications；WillBuddy 内置内容编辑和生成无需安装它。",
    );
  },
  launch = async (app, file) => {
    await exec("/usr/bin/open", ["-a", app, "--", file], {
      timeout: 15000,
      maxBuffer: 64000,
      env: {
        HOME: homedir(),
        PATH: "/usr/bin:/bin",
        TMPDIR: tmpdir(),
        LANG: "en_US.UTF-8",
      },
    });
  },
  read = (file) => readDocumentSource(file, { noFollow: true }),
}) {
  const sessions = new Map(),
    busy = new Set();
  const guard =
    (fn) =>
    async (id, ...args) => {
      if (busy.has(id)) throw Error("此文档的GenOffice操作正在进行");
      busy.add(id);
      try {
        return await fn(id, ...args);
      } finally {
        busy.delete(id);
      }
    };
  async function discard(id) {
    const s = sessions.get(id);
    if (s) {
      sessions.delete(id);
      await rm(s.directory, { recursive: true, force: true });
    }
  }
  return {
    open: guard(async (id, revision, signal) => {
      if (platform !== "darwin")
        throw Error(
          "GenOffice 应用接续当前仅支持 macOS；内置编辑器可跨平台使用",
        );
      const app = await findApp(),
        source = documents.bytes(id, revision);
      if (
        !(await approve(
          "在 GenOffice 中编辑副本",
          `${source.name}.${source.format}\n将本地副本交给已安装的 GenOffice。其权限、联网与AI设置由该应用管理。\n保存后、退出WillBuddy前点击「收回编辑结果」。退出会清理临时副本；不会自动覆盖文档。`,
          signal,
        ))
      )
        return { status: "denied" };
      signal?.throwIfAborted();
      documents.bytes(id, revision);
      if (sessions.has(id))
        throw Error("此文档已有编辑副本，请先收回结果或重启应用后重新打开");
      if (sessions.size >= 5)
        throw Error("最多同时编辑5个外部副本，请先收回结果");
      const directory = await mkdtemp(
        path.join(tmpdir(), "willbuddy-genoffice-"),
      );
      await chmod(directory, 0o700);
      const file = path.join(directory, "document." + source.format);
      try {
        await writeFile(file, source.bytes, { mode: 0o600, flag: "wx" });
        signal?.throwIfAborted();
        await launch(app, file);
        signal?.throwIfAborted();
        sessions.set(id, {
          directory,
          file,
          revision,
          format: source.format,
          sha256: source.sha256,
        });
        return { status: "opened", id, revision };
      } catch (e) {
        await rm(directory, { recursive: true, force: true });
        throw e;
      }
    }),
    importEdited: guard(async (id, signal) => {
      const s = sessions.get(id);
      if (!s)
        throw Error(
          "没有本次启动创建的GenOffice编辑副本，请先点击「GenOffice 编辑」",
        );
      const metadata = await lstat(s.file);
      if (!metadata.isFile() || metadata.isSymbolicLink())
        throw Error("编辑副本不是普通文件");
      const bytes = await read(s.file),
        check = inspectDocument(s.format, bytes);
      if (check.sha256 === s.sha256)
        throw Error("副本尚无变化，请先在GenOffice保存；此会话仍保留");
      if (
        !(await approve(
          "收回 GenOffice 编辑结果",
          `${documents.read(id).name}.${s.format}\n第 ${s.revision} → ${s.revision + 1} 版，${bytes.length} 字节。\n内容摘要：${check.text.replace(/\s+/g, " ").slice(0, 300)}\nSHA-256 ${check.sha256}\n原始导入文件不变。`,
          signal,
        ))
      )
        return { status: "denied" };
      signal?.throwIfAborted();
      const again = await read(s.file);
      if (inspectDocument(s.format, again).sha256 !== check.sha256)
        throw Error("审批期间副本改变，请重新收回");
      const result = await documents.replaceBytes(
        id,
        s.revision,
        again,
        signal,
      );
      await discard(id);
      return result;
    }),
    async close() {
      for (const id of [...sessions.keys()]) await discard(id);
    },
  };
}
