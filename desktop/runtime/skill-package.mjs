import { openPackage, sha256 } from "./documents.mjs";
const decoder = new TextDecoder("utf-8", { fatal: true });
const safePath = (name) =>
  typeof name === "string" &&
  name.length <= 180 &&
  !/[\\:\x00-\x1f]/.test(name) &&
  !name.startsWith("/") &&
  name.split("/").every((p) => p && p !== "." && p !== "..");
const utf8 = (bytes) => {
  const t = decoder.decode(bytes);
  if (t.includes("\0")) throw Error("技能文本含NUL");
  return t;
};
/** ZIP is inspected in memory. Nothing is extracted or executed. */
export function parseSkillPackage(filename, input) {
  const bytes = Buffer.from(input);
  if (!bytes.length || bytes.length > 32 * 1024 * 1024)
    throw Error("Skill文件须为1字节至32MiB");
  let files;
  if (filename.toLowerCase().endsWith(".zip")) {
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
      if (bytes.readUInt32LE(i) === 0x06054b50) {
        end = i;
        break;
      }
    if (end < 0) throw Error("无效Skill ZIP");
    const count = bytes.readUInt16LE(end + 10);
    if (count > 2000) throw Error("技能包最多2000个ZIP条目");
    let p = bytes.readUInt32LE(end + 16),
      total = 0;
    for (let i = 0; i < count; i++) {
      if (p + 46 > end || bytes.readUInt32LE(p) !== 0x02014b50)
        throw Error("技能ZIP清单截断");
      const n = bytes.readUInt16LE(p + 28),
        extra = bytes.readUInt16LE(p + 30),
        comment = bytes.readUInt16LE(p + 32),
        size = bytes.readUInt32LE(p + 24),
        mode = bytes.readUInt32LE(p + 38) >>> 16;
      if (p + 46 + n + extra + comment > end) throw Error("技能ZIP清单截断");
      if ((mode & 0xf000) === 0xa000) throw Error("技能包不允许符号链接");
      total += size;
      if (size > 4194304 || total > 16777216)
        throw Error("技能包单文件最多4MiB，展开总计16MiB");
      p += 46 + n + extra + comment;
    }
    files = openPackage(bytes,{chatArchive:true});
  } else if (filename.toLowerCase().endsWith(".md")) {
    if (bytes.length > 65536) throw Error("SKILL.md最多64KiB");
    files = { "SKILL.md": bytes };
  } else throw Error("请选择 SKILL.md 或技能ZIP包");
  const entries = Object.entries(files).filter(
    ([n]) =>
      !n.endsWith("/") &&
      !n.split("/").some((p) => p === "__MACOSX" || p.startsWith("._")),
  );
  if (entries.length > 256) throw Error("技能包最多256个文件");
  for (const [n] of entries) if (!safePath(n)) throw Error("技能文件路径无效");
  const roots = entries.filter(
    ([n]) => n === "SKILL.md" || /^[^/]+\/SKILL\.md$/.test(n),
  );
  if (roots.length !== 1)
    throw Error("技能包须在根目录或单层目录包含唯一SKILL.md");
  const [root, main] = roots[0],
    prefix = root.slice(0, -8);
  if (entries.some(([n]) => !n.startsWith(prefix)))
    throw Error("技能包有入口目录外的文件");
  const source = utf8(main);
  if (source.length > 12000) throw Error("SKILL.md最多12000字符");
  const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw Error("SKILL.md需要name和description的YAML frontmatter");
  const fields = {},
    lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s|^#|^$/.test(line)) continue;
    const m = line.match(/^([a-z][a-z0-9_-]*):\s*(.*?)\s*$/i);
    if (!m) throw Error("frontmatter字段格式无效");
    if (!["name", "description"].includes(m[1])) continue;
    if (Object.hasOwn(fields, m[1])) throw Error("frontmatter字段重复");
    let value = m[2];
    if (/^[>|][-+]?$/.test(value)) {
      const parts = [];
      while (
        i + 1 < lines.length &&
        (/^\s/.test(lines[i + 1]) || !lines[i + 1].trim())
      )
        parts.push(lines[++i].trim());
      value = parts.join(value[0] === ">" ? " " : "\n").trim();
    } else if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        throw Error("frontmatter双引号无效");
      }
    } else if (value.startsWith("'")) {
      if (!value.endsWith("'")) throw Error("frontmatter单引号无效");
      value = value.slice(1, -1).replace(/''/g, "'");
    } else value = value.replace(/\s+#.*$/, "").trim();
    fields[m[1]] = value;
  }
  if (
    typeof fields.name !== "string" ||
    !fields.name.trim() ||
    fields.name.length > 64 ||
    typeof fields.description !== "string" ||
    !fields.description.trim() ||
    fields.description.length > 1024
  )
    throw Error("技能name最多64字符、description最多1024字符，均不能为空");
  if (!source.slice(match[0].length).trim())
    throw Error("技能操作正文不能为空");
  const normalized = entries.map(([name, data]) => {
    const path = name.slice(prefix.length),
      b = Buffer.from(data);
    let textReadable = false;
    try {
      textReadable = !utf8(b).includes("\0");
    } catch {}
    return {
      path,
      base64: b.toString("base64"),
      bytes: b.length,
      sha256: sha256(b),
      textReadable,
    };
  });
  return {
    name: fields.name.trim(),
    description: fields.description.trim(),
    instructions: source,
    files: normalized,
    bytes: normalized.reduce((n, f) => n + f.bytes, 0),
    sha256: sha256(bytes),
    format: filename.toLowerCase().endsWith(".zip") ? "zip" : "md",
  };
}
export function skillResource(pkg, path) {
  if (!safePath(path)) throw Error("技能资源路径无效");
  const f = pkg.files.find((f) => f.path === path);
  if (!f) throw Error("技能资源不存在");
  const bytes = Buffer.from(f.base64, "base64");
  if (bytes.length !== f.bytes || sha256(bytes) !== f.sha256)
    throw Error("技能资源完整性检查失败");
  if (!f.textReadable)
    throw Error("仅支持读取UTF-8文本资源，不执行或渲染二进制资源");
  const text = utf8(bytes);
  if (text.length > 12000)
    throw Error("资源超过12000字符，请拆分文件后重新导入");
  return { path, text, sha256: f.sha256 };
}
