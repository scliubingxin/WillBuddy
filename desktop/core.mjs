import {requestModelOptions} from './runtime/model-policy.mjs';
import {constants} from 'node:fs';
import { readCompletion } from './runtime/model-stream.mjs';
import { open, readFile, writeFile, mkdir, rename, realpath, readdir, stat, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export const uid = () => randomUUID();
export function initialState() {
    return { schema: 1, chats: [], folders: [], memories: [], tasks: [], artifacts: [], activity: [], executions: [], commandJobs: [], runJobs: [], settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', name: '我的工作空间' }, agents: [
            { id: 'assistant', name: 'WillBuddy 助手', description: '梳理思路，完成日常工作', prompt: '你是 WillBuddy 工作助手。用中文清晰地帮助用户完成工作。区分事实和假设，不编造来源。' },
            { id: 'research', name: '研究分析师', description: '从资料中提炼有依据的结论', prompt: '你是研究分析师。优先根据所提供资料分析，标注文件名及证据。不足的信息明确标为待验证，不能假装联网。' },
            { id: 'writer', name: '文档创作者', description: '把零散想法整理成专业文档', prompt: '你是专业中文写作助手。输出可直接使用的完整 Markdown 文档。不要虚构数据和承诺。' }
        ] };
}
export class Store {
    constructor(dir) { this.dir = dir; this.file = path.join(dir, 'workspace.json'); this.pending = Promise.resolve(); }
    async load() { await mkdir(this.dir, { recursive: true, mode: 0o700 }); try {
        this.data = JSON.parse(await readFile(this.file, 'utf8'));
        if (this.data.schema !== 1)
            throw new Error('不支持的数据版本');
    }
    catch (e) {
        if (e.code !== 'ENOENT')
            throw e;
        this.data = initialState();
        await this.save();
    } return this.data; }
    save() { const bytes = JSON.stringify(this.data, null, 2); this.pending = this.pending.catch(() => { }).then(async () => { const temp = this.file + '.tmp'; await writeFile(temp, bytes, { mode: 0o600 }); await rename(temp, this.file); }); return this.pending; }
    log(title, detail = '') { this.data.activity.unshift({ id: uid(), title, detail, time: Date.now() }); this.data.activity = this.data.activity.slice(0, 300); }
}
const extensions = new Set(['.txt', '.md', '.csv', '.json', '.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css', '.yaml', '.yml', '.xml', '.log']);
export async function resolveGranted(folders, folderId, relative) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder)
        throw new Error('文件夹授权已撤销');
    if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..'))
        throw new Error('无效文件路径');
    const root = await realpath(folder.path), target = await realpath(path.join(root, relative));
    const rel = path.relative(root, target);
    if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel))
        throw new Error('文件超出授权目录');
    // Refuse symlink components, even when their destination is inside the grant.
    let current = root;
    for (const piece of relative.split(/[\\/]/).filter(Boolean)) {
        current = path.join(current, piece);
        if ((await lstat(current)).isSymbolicLink())
            throw new Error('不读取符号链接');
    }
    return target;
}
export async function readGranted(folders, id, relative, {preview=false}={}) {
    const target = await resolveGranted(folders, id, relative), info = await stat(target);
    if (!info.isFile() || info.size > 1024 * 1024 || !extensions.has(path.extname(target).toLowerCase()))
        throw new Error('只支持 1 MB 以内的文本、代码、Markdown、CSV 和 JSON 文件');
    let text;
    if(preview){
        const handle=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW);
        try{const before=await handle.stat();if(!before.isFile()||before.size>1048576)throw Error('预览文件超过1 MiB');const bytes=Buffer.alloc(1048577);let n=0;while(n<bytes.length){const r=await handle.read(bytes,n,bytes.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead;}const after=await handle.stat();if(n>1048576||n!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('预览文件变化或体积超限');text=bytes.subarray(0,n).toString('utf8');}finally{await handle.close();}
    }else text = await readFile(target, 'utf8');
    if (text.includes('\0'))
        throw new Error('不支持二进制文件');
    const full=preview && path.extname(target).toLowerCase()==='.html';
    return { folderId: id, relative, name: path.basename(target), text: full?text:text.slice(0,50000), truncated: !full&&text.length>50000 };
}
export async function listGranted(folders, id, query = '') {
    const folder = folders.find(f => f.id === id);
    if (!folder)
        throw new Error('文件夹授权已撤销');
    const root = await resolveGranted(folders, id, ''), files = [];
    let visited = 0, truncated = false;
    async function walk(relative, depth) {
        if (depth > 6 || visited >= 5000 || files.length >= 300) {
            truncated = true;
            return;
        }
        const checked = await resolveGranted(folders, id, relative);
        const entries = await readdir(checked, { withFileTypes: true });
        for (const entry of entries) {
            if (++visited > 5000 || files.length >= 300) {
                truncated = true;
                break;
            }
            if (entry.name.startsWith('.') || ['node_modules', 'dist', 'build', 'vendor'].includes(entry.name) || entry.isSymbolicLink())
                continue;
            const rel = path.join(relative, entry.name);
            if (entry.isDirectory())
                await walk(rel, depth + 1);
            else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()) && rel.toLowerCase().includes(query.toLowerCase()))
                files.push({ name: entry.name, relative: rel, folderId: id });
        }
    }
    await walk('', 0);
    return { files, truncated };
}
export function modelEndpoint(baseUrl) {
    const u = new URL(baseUrl);
    if (u.username || u.password || u.search || u.hash)
        throw new Error('模型地址不能含凭据、查询参数或片段');
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)))
        throw new Error('远程模型必须使用 HTTPS；HTTP 仅限本机');
    return u.href.replace(/\/$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions';
}
export async function complete(settings, key, messages, signal, tools, options = {}) {
    if (!settings.model?.trim())
        throw new Error('请先设置模型 ID');
    const res = await fetch(modelEndpoint(settings.baseUrl), { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ model: settings.model, messages, stream: typeof options.onDelta === 'function', ...requestModelOptions(settings), ...(tools?.length ? { tools, tool_choice: "auto" } : {}) }), signal: signal || AbortSignal.timeout(120000) });
    if (!res.ok)
        throw new Error(`模型服务返回 HTTP ${res.status}，请检查地址、密钥和模型权限` + (tools?.length && [400, 422].includes(res.status) ? '；模型可能不接受 tools 参数，可关闭输入框的工具模式后重试，或选择支持工具调用的模型' : ''));
    return readCompletion(res, { signal, onDelta: options.onDelta, toolsEnabled: !!tools?.length });
}
export function nextDaily(now = new Date()) { const next = new Date(now); next.setDate(next.getDate() + 1); return next.getTime(); }
