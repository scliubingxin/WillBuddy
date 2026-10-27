import {bindPresetFilters} from './ui/preset-catalog.js';
import {codeProjectsView} from './ui/code-projects.js';
import {createComposerImages} from './ui/composer-images.js';
import {compactComposer,createComposerMenus} from './ui/composer.js';
import {modelPicker,modelLibrary,modelForm,modelChoiceLabel} from './ui/models.js';
import {capabilityTabs,skillsPage,mcpPage,mcpAuthFields} from './ui/capability-library.js';
import {agentEditor,bindAgentEditor,readAgentEditor} from './ui/agent-editor.js';
import {imageCards} from './ui/image-cards.js';
import {mountHtmlPreview} from './ui/html-preview.js';
import {installChatMedia} from './ui/chat-media.js';
import {mountOfficePreview} from './ui/office-preview.js';
import {createOfficeWorkspace} from './ui/office-workspace.js';
import {mountSpreadsheet} from './ui/spreadsheet.js';
import {mountWordRuns} from './ui/word-runs.js';
import {mountWordCanvas} from './ui/word-canvas.js';
import {documentLibrary,documentExamples,messageDocuments} from './ui/documents.js';
import { escape, rich, htmlPreview } from './ui/markdown.js';
import * as views from './ui/workspace.js';
function viewContext() { return { state, chatId, pending, previewTabs, previewId, previewSource, previewZoom, sideTab, icon, composer, action, date, taskStatus, trace, executionRecords, executionRow, rich, htmlPreview, previewHtml, previewInteractive, openedDetails }; }
installChatMedia(document,{readImage:id=>invoke('imagePreview',{id})});
const api = window.actwill;
const browserTargets = new Map();
const $ = s => document.querySelector(s);
const paths = { spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z', chat: 'M5 4h14v12H9l-4 4Z', folder: 'M3 7V5h6l2 3h10v12H3Z', grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z', agent: 'M5 7h14v13H5ZM12 3v4M8 12h1m6 0h1m-7 4h6', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', settings: 'M4 7h16M4 17h16M8 4v6m8 4v6', search: 'M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm6-2 6 6', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-5-5 5 5-5 5', up: 'M12 20V4m-6 6 6-6 6 6', file: 'M5 3h9l5 5v13H5Zm9 0v6h5M8 13h8m-8 4h6', link: 'm9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 8a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1', check: 'm5 12 4 4L19 6', close: 'm5 5 14 14M5 19 19 5', activity: 'M3 12h4l3-8 4 16 3-8h4', download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4', shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z', stop: 'M6 6h12v12H6Z' };
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
const pendingChats=new Set();
let state = { chats: [], folders: [], memories: [], agents: [], tasks: [], artifacts: [], activity: [], settings: { model: '尚未配置', name: '我的工作空间' } }, page = 'home', chatId = '', agentId = 'assistant', files = [], images = [], sendImages = false, pending = false, folderId = '', fileResults = [], fileTruncated = false, searchTerm = '', draft = '', toolsEnabled = true, activeCommand = '', toolDraft = { url: 'https://example.com', executable: 'node', args: '["--version"]', folderId: '', relative: '' };
let selections=[];
let modelChoice='legacy',modelEffort='';
let capabilityTab='agents';const busyMcp=new Set();
const nav = [['home', 'chat', '工作台'], ['feed', 'activity', '动态'], ['library', 'grid', '成果中心'], ['files', 'folder', '本地文件'], ['agents', 'agent', '智能体'], ['tools', 'activity', '浏览器与 CLI'], ['tasks', 'clock', '自动化'], ['context', 'spark', '我的记忆']];
let sidebarCollapsed = false, sidePanel = false, sideTab = 'preview', previewId = '', previewTabs = [], previewSource = false, previewHtml = false, previewInteractive = false, previewZoom = 100, recentQuery = '', pickerKind = '', pickerItems = [], pickerIndex = 0, pickerSerial = 0;
const openedDetails = new Set();
const taskWorkspaces = new Map();
function switchChat(next) { taskWorkspaces.set(chatId, { previewTabs, previewId, sidePanel, sideTab, draft, files, selections, images, sendImages, agentId,modelChoice,modelEffort }); const saved = taskWorkspaces.get(next); previewTabs = saved?.previewTabs || []; previewId = saved?.previewId || ''; sidePanel = saved?.sidePanel || false; sideTab = saved?.sideTab || 'preview'; draft=saved?.draft||''; files=saved?.files||[];selections=saved?.selections||[];images=saved?.images||[];sendImages=saved?.sendImages||false; modelChoice=saved?.modelChoice||state.chats.find(c=>c.id===next)?.modelChoice||'legacy';modelEffort=saved?.modelEffort??state.chats.find(c=>c.id===next)?.modelEffort??'';chatId = next; agentId=saved?.agentId||state.chats.find(c=>c.id===next)?.agentId||agentId; closePicker(); }
const toolNames = { cli_execute: '运行命令', browser_open: '打开网页', browser_read: '读取网页正文', browser_snapshot: '检查页面元素', browser_click: '点击页面元素', browser_fill: '填写文本框' };
const statusNames = { pending_approval: '等待你确认', running: '执行中', succeeded: '已完成', completed: '已完成', opened: '已打开', read: '已读取', inspected: '已检查', clicked: '已发送点击', filled: '已填写', failed: '失败', denied: '已拒绝', cancelled: '已取消', interrupted: '已中断', queued: '排队中', paused: '已暂停', cancelling: '正在停止', timed_out: '已超时', output_limit: '输出超限', inherited_pipes: '子进程未关闭' };
function taskStatus(c) {
    if (c.run)
        return statusNames[c.run.status] || '待查看';
    return c.messages?.at(-1)?.error ? '失败' : c.messages?.some(m => m.role === 'assistant') ? '已完成' : '待继续';
}
function recentRows() { return [...state.chats].sort((a, b) => (b.time || 0) - (a.time || 0)).filter(c => c.name.toLowerCase().includes(recentQuery.toLowerCase())).slice(0, 40).map(c => `<button class="${chatId === c.id && page === 'chat' ? 'selected' : ''}" data-action="openChat" data-id="${escape(c.id)}" title="${escape(c.name)} · ${taskStatus(c)}"><span class="recent-name">${escape(c.name)}</span><small class="${c.run?.status === 'running' ? 'live' : ''}">${['queued','running','cancelling'].includes(c.run?.status) ? statusNames[c.run.status] : date(c.time || 0)}</small></button>`).join('') || '<p>还没有任务。从一个具体目标开始。</p>'; }
function executionRecords(runId) { return (state.executions || []).filter(r => r.chatId === chatId && (!runId || r.runId === runId)).slice().reverse(); }
function executionRow(r) { const output = r.tool === 'cli_execute' ? [r.partial || r.result?.stdout || '', r.result?.stderr ? 'stderr:\n' + r.result.stderr : '', r.result?.error || '', r.result?.exitCode !== undefined ? '退出码：' + r.result.exitCode : ''].filter(Boolean).join('\n') : JSON.stringify(r.result || {}, null, 2); return `<details class="execution-step" data-detail="${escape(r.id)}" ${openedDetails.has(r.id) ? 'open' : ''}><summary>${icon(r.tool === 'cli_execute' ? 'activity' : 'link')}<span>${toolNames[r.tool] || escape(r.tool)}</span><span class="step-status ${['failed', 'denied', 'cancelled', 'interrupted'].includes(r.status) ? 'issue' : ''}">${escape(statusNames[r.status] || r.status)}</span><span class="step-time">${r.finishedAt ? ((r.finishedAt - r.time) / 1000).toFixed(1) + 's' : date(r.time)}</span></summary><div class="step-detail"><b>实际参数</b><pre>${escape(JSON.stringify(r.command || r.receipt || r.args, null, 2))}</pre>${output && output !== '{}' ? `<b>执行结果</b><pre>${escape(output)}</pre>` : ''}${r.status === 'pending_approval' ? '<p>请在系统确认窗口核对目标与参数；此处不能代替原生授权。</p>' : ''}</div></details>`; }
function commandQueue() { return views.commandQueue({state, action, date, statusNames}); }
function trace(runId) { const rows = executionRecords(runId); return rows.length ? `<section class="run-trace" aria-label="实际执行过程"><div class="trace-label">${icon('activity')}执行过程 · ${rows.length} 步</div>${rows.map(executionRow).join('')}</section>` : ''; }
function openPreview(item) {
    const existing = previewTabs.find(t => t.id === item.id);
    if (existing)
        Object.assign(existing, item);
    else {
        previewTabs.push(item);
        if (previewTabs.length > 8)
            previewTabs.shift();
    }
    previewId = item.id;
    sidePanel = true;
    sideTab = 'preview';
    previewSource = false;
    previewHtml = /\.html?$/i.test(item.name||'');
    previewInteractive = previewHtml;
    render();
}
function previewPanel() { return views.previewPanel(viewContext()); }
function toast(message) { $('#toast').textContent = message; $('#toast').style.display = 'block'; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').style.display = 'none', 4500); }
async function invoke(name, payload) {
    if (!api)
        throw new Error('当前为界面预览。请通过 npm start 启动桌面应用以使用此功能。');
    try { return await api[name](payload); }
    catch(error) { throw new Error(String(error?.message||'操作失败，请重试').replace(/^Error invoking remote method ['"][^'"]+['"]:\s*(?:Error:\s*)?/,'').replace(/^Error:\s*/,'')); }
}
async function update(name, payload) { applyState(await invoke(name, payload)); render(); return state; }
function action(label, act, id = '', kind = 'secondary') { return `<button type="button" class="${kind}" data-action="${act}" data-id="${escape(id)}">${label}</button>`; }
function empty(title, desc, button = '') { return `<div class="empty">${icon('spark')}<h3>${title}</h3><p>${desc}</p>${button}</div>`; }
function heading(kicker, title, desc, button = '') { return `<div class="page-title"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div>${button}</div>`; }
function date(t) { return new Date(t).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
const boundComposers=new WeakSet();
const composerMenus=createComposerMenus($('#app'));
const composerImages=createComposerImages($('#app'),id=>invoke('imagePreview',{id}));
window.addEventListener('pagehide',()=>{composerMenus.dispose();composerImages.dispose();});
const officeWorkspace = createOfficeWorkspace($('#app'), host => host.classList.contains('html-host')?mountHtmlPreview(host):mountOfficePreview(host, invoke));
window.addEventListener('pagehide', () => officeWorkspace.dispose());
function render() {
    composerMenus.beforeRender();
    pending=pendingChats.has(chatId);
    const previousComposer=$('#prompt');
    const oldScroll = $('.messages-scroll'), scrollTop = oldScroll?.scrollTop || 0, stick = !oldScroll || oldScroll.scrollHeight - oldScroll.scrollTop - oldScroll.clientHeight < 90;
    const focused = document.activeElement?.id, selection = focused === 'prompt' ? [$('#prompt').selectionStart, $('#prompt').selectionEnd] : null;
    const active = nav.find(n => n[0] === page);
    const name = state.settings.name || '我的工作空间';
    $('#app').className = sidebarCollapsed ? 'sidebar-collapsed' : '';
    const markup = `<div class="titlebar"></div><aside class="sidebar"><div class="brand"><span class="brand-mark"><img src="assets/logo.png" alt="WillBuddy 工具 logo"></span><div>WillBuddy<small>你的桌面工作伙伴</small></div></div><button class="new" data-action="new">${icon('plus')}<span>新建任务</span><span>⌘ N</span></button><nav class="nav">${nav.filter(n => ['home', 'feed', 'library', 'files', 'agents'].includes(n[0])).map(([id, i, title]) => `<button class="${page === id ? 'active' : ''}" data-page="${id}">${icon(i)}<span>${title}</span></button>`).join('')}<details class="more-nav" ${['tools', 'tasks', 'context'].includes(page) ? 'open' : ''}><summary>${icon('grid')}<span>更多工具</span></summary>${nav.filter(n => ['tools', 'tasks', 'context'].includes(n[0])).map(([id, i, title]) => `<button class="${page === id ? 'active' : ''}" data-page="${id}">${icon(i)}<span>${title}</span></button>`).join('')}</details></nav><div class="recent"><div class="recent-header"><span>任务 <small>${state.chats.length}</small></span><button data-action="search" aria-label="搜索任务与成果">${icon('search')}</button></div><input id="recentQuery" aria-label="筛选历史任务" placeholder="筛选任务" value="${escape(recentQuery)}"><div id="recentList">${recentRows()}</div></div><button class="profile" data-action="settings"><div class="avatar">WB</div><div>${escape(name)}<small>${escape(state.settings.model)} · 本地工作空间</small></div>${icon('settings')}</button></aside><main class="main"><header class="topbar"><div><button class="icon-button" data-action="sidebarToggle" aria-label="${sidebarCollapsed ? '展开' : '收起'}侧栏">${icon('grid')}</button><span class="topbar-title">${escape(page === 'chat' ? state.chats.find(c => c.id === chatId)?.name || '新任务' : active?.[2] || '工作台')}</span></div><div><button class="topbar-action" data-page="tasks" aria-label="查看后台任务">后台 ${(state.runJobs||[]).filter(j=>['running','cancelling'].includes(j.status)).length} 执行 · ${(state.runJobs||[]).filter(j=>j.status==='queued').length} 排队</button>${page === 'chat' ? `<button class="topbar-action" data-action="panelTab" data-id="execution">${icon('activity')}执行过程</button>` : ''}<button class="topbar-action ${sidePanel ? 'chosen' : ''}" data-action="panelToggle">${icon('file')}工作区</button><button class="status" data-action="settings"><span class="dot ${state.settings.hasKey ? 'on' : ''}"></span>${state.settings.hasKey ? escape(state.settings.model) : '连接模型'}</button></div></header><div class="workbench ${sidePanel ? 'with-panel' : ''}"><div class="workspace ${page === 'chat' ? 'conversation-space' : ''}">${content()}</div>${sidePanel ? previewPanel() : ''}</div></main>`;
    officeWorkspace.update(markup, `${page}:${chatId}`);
    if(previousComposer&&$('#prompt'))$('#prompt').replaceWith(previousComposer);
    composerMenus.afterRender(`${page}:${chatId}`);
    composerImages.update();
    bindPresetFilters($('#app'));
    $('#sendImages')?.addEventListener('change',e=>sendImages=e.target.checked);
    const composer = $('#prompt');
    if(composer&&composer.value!==draft)composer.value=draft;
    if (composer&&!boundComposers.has(composer)) {
        boundComposers.add(composer);
        composer.addEventListener('input', () => { draft = composer.value; updatePicker(); });
        composer.addEventListener('keydown', e => {
            if (e.isComposing)
                return;
            if (pickerKind && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault();
                if (e.key === 'Escape') {
                    closePicker();
                    return;
                }
                if (e.key === 'Enter') {
                    choosePicker(pickerIndex).catch(e => toast(e.message));
                    return;
                }
                pickerIndex = (pickerIndex + (e.key === 'ArrowDown' ? 1 : -1) + Math.max(1, pickerItems.length)) % Math.max(1, pickerItems.length);
                paintPicker();
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
    }
    $('#recentQuery')?.addEventListener('input', e => { recentQuery = e.target.value; $('#recentList').innerHTML = recentRows(); });
    $('#toolMode')?.addEventListener('change', e => { toolsEnabled = e.target.checked; });
    for (const name of ['url', 'executable', 'args', 'folderId', 'relative'])
        $('#tool-' + name)?.addEventListener('input', e => { toolDraft[name] = e.target.value; });
    $('#modelChoice')?.addEventListener('change',e=>{modelChoice=e.target.value;modelEffort='';render();});
    $('#modelEffort')?.addEventListener('change',e=>{modelEffort=e.target.value;render();});
    $('#agent')?.addEventListener('change', e => agentId = e.target.value);
    $('#folderSelect')?.addEventListener('change', e => { folderId = e.target.value; loadFiles(); });
    $('#fileQuery')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            searchTerm = e.target.value;
            loadFiles();
        }
    });
    const scroller = $('.messages-scroll');
    if (scroller)
        scroller.scrollTop = stick ? scroller.scrollHeight : scrollTop;
    if (focused && document.getElementById(focused)) {
        document.getElementById(focused).focus({ preventScroll: true });
        if (selection)
            $('#prompt').setSelectionRange(...selection);
    }
    if (pickerKind)
        paintPicker();
}
function chatLive() { return pending || ['queued','running','cancelling'].includes(state.chats.find(c=>c.id===chatId)?.run?.status); }
function composer() {return compactComposer({selections,state,agentId,files,images,sendImages,live:chatLive(),toolsEnabled,icon,escape,modelName:modelChoiceLabel(state,modelChoice,modelEffort),modelMarkup:modelPicker(state,modelChoice,modelEffort,escape)});}

function homeContent() { return views.homeContent(viewContext()); }
function conversationContent() { return views.conversationContent(viewContext()); }
function closePicker() {
    pickerKind = '';
    pickerItems = [];
    pickerSerial++;
    const node = $('#inlinePicker');
    if (node)
        node.hidden = true;
}
function paintPicker() {
    const node = $('#inlinePicker');
    if (!node)
        return;
    node.hidden = !pickerKind;
    node.innerHTML = `<div class="picker-title">${pickerKind === '/' ? '选择已有智能体' : '附加授权目录中的资料'}<small>↑ ↓ 选择 · Enter 确认 · Esc 关闭</small></div>${pickerItems.map((t, i) => `<button role="option" aria-selected="${i === pickerIndex}" data-action="pickerChoose" data-id="${i}">${icon(pickerKind === '/' ? 'agent' : 'file')}<span>${escape(t.name)}<small>${escape(t.description || t.relative || '')}</small></span></button>`).join('') || `<p>${pickerKind === '/' ? '没有匹配的智能体' : '没有匹配的文本文件，可在本地文件页授权目录'}</p>`}${pickerKind === '@' ? '<button class="picker-browse" data-page="files">浏览已授权文件夹 ↗</button>' : ''}`;
}
async function updatePicker(force) {
    const node = $('#prompt');
    if (!node)
        return;
    const token = draft.slice(0, node.selectionStart).match(/(?:^|\s)([@/])([^\s]*)$/);
    const kind = force || token?.[1];
    if (!kind) {
        closePicker();
        return;
    }
    const query = force ? '' : token[2], serial = ++pickerSerial;
    pickerKind = kind;
    pickerIndex = 0;
    if (kind === '/') {
        pickerItems = state.agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
        paintPicker();
        return;
    }
    pickerItems = [];
    paintPicker();
    try {
        const groups = await Promise.all(state.folders.slice(0, 5).map(f => invoke('listFiles', { id: f.id, query })));
        if (serial !== pickerSerial)
            return;
        pickerItems = groups.flatMap(g => g.files || []).filter(f => !files.some(a => a.folderId === f.folderId && a.relative === f.relative)).slice(0, 10);
        paintPicker();
    }
    catch (e) {
        if (serial === pickerSerial) {
            closePicker();
            toast(e.message);
        }
    }
}
async function choosePicker(index) {
    const item = pickerItems[index];
    if (!item)
        return;
    const kind = pickerKind, node = $('#prompt'), at = node?.selectionStart ?? draft.length;
    const prefix = draft.slice(0, at);
    if (kind === '/')
        agentId = item.id;
    else {
        if (files.length >= 32)
            throw new Error('每次最多附加 32 个文件');
        const f = await invoke('readFile', { folderId: item.folderId, relative: item.relative });
        if (!files.some(a => a.folderId === f.folderId && a.relative === f.relative))
            files.push(f);
    }
    draft = prefix.replace(/(^|\s)[@/][^\s]*$/, '$1') + draft.slice(at);
    closePicker();
    render();
    $('#prompt')?.focus();
}
function content() {
    if (page === 'home')
        return homeContent();
    if (page === 'chat')
        return conversationContent();
    if (page === 'tools')
        return `<div class="page">${heading('DESKTOP TOOLS', '让助手真正开始行动。', '浏览器首次确认可选“本任务本站点允许”，后续同任务同站点不反复弹窗；新任务或跨站重新确认。CLI仍逐次确认。确认框可按Esc取消，60秒未响应自动取消。', action('刷新执行记录', 'refresh')+action('撤销浏览器授权','revokeBrowserApprovals')+action('取消所有确认框','cancelApprovals'))}
 <div class="tool-grid"><section class="tool-panel"><h2>浏览器</h2><p class="description">内置浏览器支持检查元素、点击与填写；系统浏览器使用你平常的浏览器，但助手不能读取其内容。</p><label>网址<input id="tool-url" aria-label="浏览器网址" value="${escape(toolDraft.url)}" placeholder="https://example.com"></label><div class="toolbar">${action('打开内置浏览器', 'browserOpen', '', 'primary')}${action('在系统浏览器打开', 'externalBrowser')}</div><div class="browser-list">${(state.browsers || []).map(b => `<div class="file-row"><div>${escape(b.title || '网页')}<small>${escape(b.url)}</small></div>${action('读取正文', 'browserRead', b.id)}${action('检查元素', 'browserInspect', b.id)}</div>`).join('')}</div></section>
 <section class="tool-panel"><h2>CLI 命令</h2><p class="description">非交互执行，返回真实输出及退出码。命令以当前账号权限运行；工作目录不是权限沙箱。</p><label>程序名 / 绝对路径<input id="tool-executable" aria-label="CLI 程序" value="${escape(toolDraft.executable)}" placeholder="node / python3 / git / codex"></label><label>参数（JSON 字符串数组）<textarea id="tool-args" aria-label="CLI 参数">${escape(toolDraft.args)}</textarea></label><label>授权工作目录<select id="tool-folderId" aria-label="CLI 工作目录"><option value="">请选择文件夹</option>${state.folders.map(f => `<option value="${f.id}" ${toolDraft.folderId === f.id ? 'selected' : ''}>${escape(f.name)}</option>`).join('')}</select></label><label>子目录（可留空）<input id="tool-relative" value="${escape(toolDraft.relative)}"></label><div class="toolbar">${action('审阅并执行', 'commandRun', '', 'primary')}${action('授权文件夹', 'folder')}</div><p class="description">例如 node + ["--version"]，或 codex + ["exec","检查此项目的测试失败原因"]。需要先在电脑上安装并配置对应 CLI。</p></section></div>
 ${commandQueue()}<div class="section-head"><h2>实际执行记录</h2><small>包含模型和手动发起的操作</small></div>${(state.executions || []).map(r => `<details class="execution" ${['running', 'pending_approval'].includes(r.status) ? 'open' : ''}><summary><span>${escape(r.tool)}</span><span class="badge">${escape(r.status)}</span><small>${date(r.time)}</small></summary><pre>${escape(JSON.stringify(r.command || r.args, null, 2))}</pre>${r.partial ? `<pre class="terminal">${escape(r.partial)}</pre>` : ''}${r.result ? `<pre class="terminal">${escape(r.tool === 'cli_execute' ? [r.result.stdout || '', r.result.stderr ? 'stderr:\n' + r.result.stderr : '', r.result.error || '', 'status: ' + r.result.status, 'exit code: ' + r.result.exitCode].join('\n') : JSON.stringify(r.result, null, 2))}</pre>` : ''}</details>`).join('') || empty('还没有执行记录', '可先打开一个网页，或授权项目目录后执行 node --version。')}</div>`;
    if (page === 'files')
        return `<div class="page">${heading('LOCAL KNOWLEDGE', '让本地知识，触手可及。', '仅列出已授权目录中的文本和代码文件。选择文件后可预览、附加到对话。', action(icon('plus') + '授权文件夹', 'folder'))}${state.folders.length ? `<div class="file-search"><select id="folderSelect" aria-label="文件夹">${state.folders.map(f => `<option value="${f.id}" ${f.id === folderId ? 'selected' : ''}>${escape(f.name)}</option>`).join('')}</select><input id="fileQuery" placeholder="按文件名搜索，按 Enter 确认" value="${escape(searchTerm)}"><button class="secondary" data-action="fileSearch">${icon('search')}搜索</button><button class="secondary" data-action="revoke" data-id="${escape(folderId)}">撤销授权</button></div><p class="description">不自动上传。单个文件最大 1 MB，每次最多附加 32 个文件。Word/PDF 可使用原 Web 工作台处理。</p>${fileResults.map((f, i) => `<div class="file-row">${icon('file')}<div>${escape(f.name)}<small>${escape(f.relative)}</small></div>${action('预览', 'previewFile', i)}${action('附加到对话', 'attachFile', i)}</div>`).join('') || empty('暂无匹配的文件', '支持 Markdown、TXT、CSV、JSON 与常见代码文件；隐藏文件和依赖目录不会列出。')}${fileTruncated ? '<p class="description">列表已达到扫描上限（300 个结果 / 5000 个目录项 / 深度 6），可选择更小的文件夹。</p>' : ''}` : empty('选择你的第一个文件夹', '通过系统窗口授予文件夹访问权限。你可以随时在这里撤销。', action('选择文件夹', 'folder', '', 'primary'))}</div>`;
    if (page === 'agents' && capabilityTab!=='agents')return `<div class="page">${capabilityTabs(capabilityTab)}${capabilityTab==='skills'?skillsPage(state):mcpPage(state,busyMcp)}</div>`;
    if (page === 'agents')
        return `<div class="page">${capabilityTabs('agents')}${heading('YOUR AI TEAM', '为每一种工作，找到好搭档。', '配置知识文档、Skills、MCP、工具和提示词，通过 ReAct 循环完成任务。', action('清除检索索引','clearKnowledgeIndex')+action(icon('plus') + '新建智能体', 'newAgent'))}<div class="cards">${state.agents.map(a => `<div class="card"><span class="tile-icon">${icon('agent')}</span><h3>${escape(a.name)}</h3><p>${escape(a.description)}</p><small>${(a.knowledge||[]).length} 份知识 · ${(a.skills||[]).length+(a.skillIds||[]).length} 项技能 · ${(a.mcp||[]).length+(a.mcpIds||[]).length} 个 MCP · ReAct ${a.maxSteps||32} 轮</small><div class="actions">${action('开始对话', 'useAgent', a.id, 'primary')}${action('编辑', 'editAgent', a.id)}${a.id !== 'assistant' ? action('删除', 'deleteAgent', a.id) : ''}</div></div>`).join('')}</div></div>`;
    if (page === 'tasks')
        return `<div class="page">${heading('MISSION CONTROL', '把重复的工作，交给自动化。', '任务结果自动归入成果中心；执行失败可查看原因并手动重试。', action(icon('plus') + '新建任务', 'newTask'))}<div class="banner">每日任务从创建或启用时间起，每隔一天执行一次。应用必须运行，电脑休眠或退出时不执行；恢复后补执行一次。任务仅调用模型，不具备联网、发信或文件操作能力。</div><div class="toolbar">${action('刷新状态', 'refresh')}${action('打开本地 Office 执行器 ↗', 'runner')}</div><br>${views.runQueue({state,action,date,statusNames})}${state.tasks.length ? `<div class="cards">${state.tasks.map(t => `<div class="card"><span class="badge">${escape(({ ready: '待执行', done: '已完成', ...statusNames })[t.status] || t.status)}</span><h3>${escape(t.name)}</h3><p>${escape(t.prompt.slice(0, 160))}</p><div class="meta">${t.enabled ? '每日执行 · 下次 ' + date(t.nextRun) : '仅手动运行'}</div>${t.error ? `<p class="task-error">${escape(t.error)}</p>` : ''}<div class="actions">${!['queued','running','cancelling'].includes(t.status) ? action('立即运行', 'runTask', t.id, 'primary') : action('停止任务', 'cancelTask', t.id, 'danger')}${t.result ? action('查看结果', 'taskResult', t.id) : ''}${!['queued','running','cancelling'].includes(t.status) ? action(t.enabled ? '暂停定时' : '开启每日', 'toggleTask', t.id) + action('删除', 'deleteTask', t.id) : ''}</div></div>`).join('')}</div>` : empty('从一个小任务开始', '例如：根据固定提示词生成每日写作练习。真实数据需要在提示中提供。', action('创建任务', 'newTask', '', 'primary'))}</div>`;
    if (page === 'library')
        return `<div class="page">${heading('YOUR LIBRARY', '好成果，值得留下。', '对话与自动化生成的成果都在这里，可随时预览和导出。')}${documentLibrary({state,action,date})}${state.artifacts.length ? `<div class="cards">${state.artifacts.map(a => `<div class="card"><span class="tile-icon amber">${icon('file')}</span><h3>${escape(a.name)}</h3><p>${escape(a.text.slice(0, 110))}…</p><div class="meta">${date(a.time)}</div><div class="actions">${action('查看', 'viewArtifact', a.id)}${action('导出', 'exportArtifact', a.id)}${action('删除', 'deleteArtifact', a.id)}</div></div>`).join('')}</div>` : empty('还没有保存的成果', '在助手回复下点击“保存到成果中心”，或完成一个自动化任务。')}</div>`;
    if (page === 'context')
        return `<div class="page">${heading('PERSONAL CONTEXT', '记住对你重要的事。', '手动保存工作背景与偏好。这些内容会在每次对话时发送给当前模型。', action(icon('plus') + '添加记忆', 'newMemory'))}${state.memories.length ? state.memories.map(m => `<div class="file-row">${icon('spark')}<div>${escape(m.text)}</div>${action('删除', 'deleteMemory', m.id)}</div>`).join('') : empty('从一句话认识你', '例如“请用简洁的中文回答，优先给出行动建议”。')}</div>`;
    if (page === 'feed')
        return `<div class="page">${heading('YOUR FEED', '每一步，都有迹可循。', '查看本机产生的对话、文件授权、任务执行与导出记录。', action('刷新', 'refresh'))}${state.activity.length ? state.activity.map(a => `<div class="activity-row">${icon('activity')}<div>${escape(a.title)}<small>${escape(a.detail)}</small></div><span class="meta">${date(a.time)}</span></div>`).join('') : empty('工作空间已准备好', '连接模型、授权一个文件夹，或开始第一次对话。')}</div>`;
    return '';
}
function modal(title, body, submit, handler) {
    const d = $('#modal');
    d.onclick=null;
    d.onclose=()=>d.querySelectorAll('[data-mcp-secret],input[type="password"]').forEach(el=>el.value='');
    d.innerHTML = `<form method="dialog" novalidate><header><h2>${escape(title)}</h2><button type="button" data-modal-close class="icon-button" value="cancel" aria-label="关闭">${icon('close')}</button></header>${body}<footer><button type="button" data-modal-close value="cancel" class="secondary">关闭</button>${submit ? `<button type="button" id="modalSubmit" class="primary">${submit}</button>` : ''}</footer></form>`;
    for(const close of d.querySelectorAll("[data-modal-close]"))close.onclick=()=>d.close();
    if (!d.open)
        d.showModal();
    if (handler)
        $('#modalSubmit').onclick = async () => {
            if(!d.querySelector('form').reportValidity())return;
            const button = $('#modalSubmit');
            button.disabled = true;
            try {
                const data=new FormData(d.querySelector('form'));
                d.querySelectorAll('[data-mcp-secret]').forEach(el=>el.value='');
                await handler(data);
                d.close();
            }
            catch (e) {
                toast(e.message);
            }
            finally {
                button.disabled = false;
            }
        };
}
function input(label, name, value = '', type = 'text') { return `<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" required></label>`; }
function area(label, name, value = '') { return `<label>${label}<textarea name="${name}" required>${escape(value)}</textarea></label>`; }
async function loadFiles() {
    if (!state.folders.length) {
        fileResults = [];
        render();
        return;
    }
    if (!state.folders.some(f => f.id === folderId))
        folderId = state.folders[0].id;
    const r = await invoke('listFiles', { id: folderId, query: searchTerm });
    fileResults = r.files;
    fileTruncated = r.truncated;
    render();
}
async function send() {
    if (chatLive() || (!draft.trim()&&!images.length))
        return;
    if (!api) {
        toast('请在桌面应用中配置模型后使用。');
        return;
    }
    if(!draft.trim()&&images.length&&!sendImages){toast('请勾选本轮发送图片，或输入文字');return;}
    const prompt = draft.trim()?draft:'请分析这些图片。';
    const id = chatId || crypto.randomUUID();
    const selectedSelections=[...selections];
    const selected = [...files], selectedImages=[...images], selectedConsent=sendImages;
    chatId = id;
    page = 'chat';
    pendingChats.add(id); pending = true;
    draft = '';
    files = [];selections=[];images=[];sendImages=false;
    if (!state.chats.some(c => c.id === id))
        state.chats.unshift({ id, agentId, name: prompt.slice(0, 36), messages: [] });
    state.chats.find(c => c.id === id).messages.push({ role: 'user', content: prompt,documents:selected.filter(f=>f.documentId),images:selectedImages,imagesSent:selectedConsent });
    render();
    try {
        applyState(await invoke('chat', { id, requestId:crypto.randomUUID(), prompt, selections:selectedSelections.map(({documentId,revision,sha256,request})=>({documentId,revision,sha256,request})), agentId, toolsEnabled,modelChoice,modelEffort,images:selectedImages.map(i=>i.id),sendImages:selectedConsent, documents:selected.filter(f=>f.documentId).map(({documentId,revision,sha256,name,archive,entryPath})=>({documentId,revision,sha256,name,archive,entryPath})), files: selected.filter(f=>!f.documentId).map(({ folderId, relative }) => ({ folderId, relative })) }));
    }
    catch (e) {
        toast(e.message);
        applyState(await invoke('state'));
        if(chatId===id&&!draft&&!files.length&&!images.length){draft = prompt;files = selected;selections=selectedSelections;images=selectedImages;sendImages=selectedConsent;}
    }
    finally {
        const reply=state.chats.find(c=>c.id===id)?.messages?.at(-1);
        if(reply?.error&&selectedImages.length&&chatId===id&&!draft&&!files.length&&!images.length){draft=prompt;files=selected;images=selectedImages;sendImages=selectedConsent;toast('发送未成功，已恢复文字和图片，请检查错误后手动重试');}
        pendingChats.delete(id); pending = pendingChats.has(chatId);
        render();
    }
}
async function navigate(next) {
    page = next;
    if (next === 'files') {
        await loadFiles();
    }
    else
        render();
}
async function handle(actionId, id) {
    if(actionId==='continueReply'){
      const c=state.chats.find(c=>c.id===chatId),failed=c?.messages?.[Number(id)];if(!failed||(failed.continuation!==true&&!(failed.continuation===undefined&&failed.error&&/长度上限/.test(failed.content))))throw Error('没有可继续的文字');
      const partial=c.messages.filter(m=>m.runId===failed.runId&&m.partial&&m.content).at(-1);if(!partial)throw Error('未保留可续写内容');
      draft='请从下方已接收内容的末尾继续，只输出尚未完成的文字，不重复前文或执行工具。以下是原回复末尾：\n'+partial.content.slice(-16000);toolsEnabled=false;render();await send();return;
    }
    if(actionId==='detachSelection'){selections.splice(Number(id),1);render();return;}
    if (actionId === 'sidebarToggle') {
        sidebarCollapsed = !sidebarCollapsed;
        render();
        return;
    }
    if (actionId === 'panelToggle') {
        sidePanel = !sidePanel;
        render();
        return;
    }
    if (actionId === 'panelClose') {
        sidePanel = false;
        render();
        return;
    }
    if (actionId === 'panelTab') {
        sideTab = id;
        sidePanel = true;
        render();
        return;
    }
    if (actionId === 'previewSelect') {
        previewId = id;
        render();
        return;
    }
    if (actionId === 'previewClose') {
        const index = previewTabs.findIndex(t => t.id === id);
        previewTabs = previewTabs.filter(t => t.id !== id);
        if (previewId === id)
            previewId = previewTabs[Math.max(0, index - 1)]?.id || previewTabs.at(-1)?.id || '';
        render();
        return;
    }
    if(actionId==='previewInteractive'){previewHtml=true;previewSource=false;previewInteractive=!previewInteractive;render();return;}
    if (actionId === 'previewHtml') {
        previewHtml = !previewHtml;
        previewSource = false;
        render();
        return;
    }
    if (actionId === 'previewMode') {
        previewSource = !previewSource;
        render();
        return;
    }
    if (actionId === 'previewZoom') {
        previewZoom = Math.max(80, Math.min(120, previewZoom + Number(id) * 10));
        render();
        return;
    }
    if(actionId==='documentExportVersion'){const [doc,revision]=id.split(':');await invoke('documentExport',{id:doc,revision:Number(revision)});return;}
    if(actionId==='revokeBrowserApprovals'||actionId==='cancelApprovals'){await invoke(actionId);toast(actionId==='cancelApprovals'?'已取消当前与排队的确认；也可按 ⌘⇧Esc':'已撤销全部浏览器任务授权');return;}
    if (actionId==='documentImport') {await invoke('documentImport');await update('state');return;}
    if(actionId==='officeCollect'){const result=await invoke('officeCollect',{id});if(result.status==='succeeded'){await update('state');toast('LibreOffice结果已保存新版本');}return;}
    if(state.officeNative&&id&&['documentCanvas','documentWordEditor','documentEditor'].includes(actionId)&&['docx','xlsx','pptx'].includes(state.documents?.find(d=>d.id===id)?.format)){const d=state.documents.find(d=>d.id===id);await invoke(state.officeWorkspace?'officeOpen':'officeEdit',{id,revision:d.revision});await update('state');toast(state.officeWorkspace?'已打开WillBuddy Office，编辑直接保存，无需收回':'已启动内置LibreOffice；保存并退出后点击收回编辑结果');return;}
    if (actionId==='documentCanvas') {
        const editor=id?await invoke('documentRichEditor',{id}):{name:'新文档',html:'<h1>项目方案</h1><p>在这里编辑正文，选择文字后可设置格式。</p>'};
        let canvas;
        modal('Word 写作画布',input('文档名称','canvasName',editor.name)+'<p>支持标题、粗体、列表、表格；使用本机GenOffice引擎生成可编辑DOCX。此画布不是导入Word的保真排版编辑器。</p><div id="wordCanvas"></div>','保存为 Word',async f=>{
            const result=await invoke('documentOperation',{operation:'document_write',name:f.get('canvasName'),...(id?{id,expectedRevision:editor.revision}:{}),html:canvas.html()});
            if(result.status!=='succeeded')throw Error(result.error||'未保存');await update('state');toast('真实Word已保存，可在成果中心下载');
        });
        canvas=mountWordCanvas($('#wordCanvas'),editor.html);return;
    }
    if (actionId==='documentNew') {
        modal('新建文档',input('名称','documentName','新文档')+'<label>文件格式<select name="format" id="documentFormat">'+Object.keys(documentExamples).map(f=>'<option>'+f+'</option>').join('')+'</select></label>'+area('内容（Office 使用结构化 JSON；可让 AI 代写）','documentContent',documentExamples.docx),'审阅并创建',async f=>{const result=await invoke('documentOperation',{operation:'document_create',name:f.get('documentName'),format:f.get('format'),content:f.get('documentContent')});if(result.status!=='succeeded')throw Error(result.error||result.message||'未保存');await update('state');toast('文档已创建并校验，可导出');});
        $('#documentFormat').onchange=e=>{$('#modal [name="documentContent"]').value=documentExamples[e.target.value];};return;
    }
    if (actionId?.startsWith('document')) {
        const d=(state.documents||[]).find(x=>x.id===id);if(!d)throw Error('文档不存在');
        if(actionId==='documentConvert'){toast('正在本机转换为Word…');const result=await invoke('documentOperation',{operation:'document_convert',id,expectedRevision:d.revision});if(result.status==='denied')return;if(result.status!=='succeeded')throw Error(result.error||'转换未完成');await update('state');const doc=result.document;openPreview({id:'document:'+doc.id,name:doc.name+'.docx',text:doc.text,kind:'document',documentId:doc.id});toast('真实Word文档已保存，可直接导出');return;}
        if(['documentGenOffice','documentGenOfficeImport'].includes(actionId)){openPreview({id:'document:'+d.id,name:d.name+'.'+d.format,text:d.text,kind:'document',documentId:d.id});return;}
        if(actionId==='documentWordEditor'){
            const editor=await invoke('documentEditor',{id,mode:'runs'});let word;
            modal('Word 分段编辑 · '+d.name,'<div id="wordRuns"></div>','保存Word新版本',async()=>{
                const result=await invoke('documentSaveEditor',{id,revision:editor.revision,patch:{patches:word.patches()}});
                if(result.status!=='succeeded')throw Error(result.error||'未保存');await update('state');toast('新版本已保存，未修改部件通过校验');
            });word=mountWordRuns($('#wordRuns'),editor);return;
        }
        if(actionId==='documentEditor'){
            const editor=await invoke('documentEditor',{id});
            if(editor.kind==='cells'){
                let sheet;modal('表格计算编辑 · '+d.name,'<div id="spreadsheetEditor"></div>','保存表格新版本',async()=>{
                    const result=await invoke('documentSaveEditor',{id,revision:editor.revision,patch:sheet.patch()});
                    if(result.status!=='succeeded')throw Error(result.error||'未保存');await update('state');toast('表格与公式缓存已保存，可下载XLSX');
                });sheet=mountSpreadsheet($('#spreadsheetEditor'),editor);return;
            }
            const fields=editor.kind==='source'?area('文档原文','source',editor.source):editor.kind==='blocks'?editor.blocks.map((b,i)=>area((d.format==='pptx'?'演示文本块 ':'段落 ')+(i+1),'block'+i,b.text)).join(''):editor.cells.map((c,i)=>input('工作表 '+c.sheetIndex+' · '+c.address,'cell'+i,c.value===null?'':String(c.value))).join('');
            modal('编辑内容 · '+d.name, '<p>修改当前文档内容并保存新版本。Word/PPT 为段落内容编辑，整段修改采用首文字样式；保留其他文件部件。复杂排版暂不支持在此编辑，请在工作区预览。</p><div class="editor-fields">'+fields.replace(/ required/g,'')+'</div>','保存文档版本',async f=>{
                const patch=editor.kind==='source'?{source:f.get('source')}:editor.kind==='blocks'?{blocks:editor.blocks.flatMap((b,i)=>f.get('block'+i)!==b.text?[{...b,text:f.get('block'+i)}]:[])}:{cells:editor.cells.flatMap((c,i)=>{const v=f.get('cell'+i);if(v===(c.value===null?'':String(c.value)))return [];return [{...c,value:typeof c.value==='number'&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):typeof c.value==='boolean'&&['true','false'].includes(v)?v==='true':v}];})};
                const result=await invoke('documentSaveEditor',{id,revision:editor.revision,patch});if(result.status!=='succeeded')throw Error(result.error||'未保存');await update('state');toast('编辑已保存，可下载新版本');
            });return;
        }
        if(actionId==='documentView'){openPreview({id:'document:'+id,name:d.name+'.'+d.format,text:d.text,kind:'document',documentId:id});return;}
        if(actionId==='documentHistory'){modal('历史版本 · '+d.name,d.history.map(h=>`<div class="file-row"><div>v${h.revision} · ${date(h.time)}<small>${h.size} 字节 · ${escape(h.sha256)}</small></div>${action('导出此版本','documentExportVersion',id+':'+h.revision)}</div>`).join(''));return;}
        if(actionId==='documentExport'){await invoke('documentExport',{id,revision:d.revision});return;}
        if(actionId==='documentContinue'){switchChat('');page='home';toolsEnabled=true;draft=`请先调用 document_read 读取文档「${d.name}.${d.format}」（id=${id}，当前版本 ${d.revision}），再根据以下要求调用 ${d.hasRichSource?'document_write（保留editableHtml结构）':d.format==='docx'?'document_patch（使用wordEditing片段坐标，保留其他样式）':'document_edit'} 保存新版本。修改要求：`;render();$('#prompt')?.focus();return;}
        if(actionId==='documentEdit'){
            const body=d.format==='xlsx'?area('单元格修改 JSON（sheetIndex 指 sheetN.xml，从 1 开始）','cells','[{"sheetIndex":1,"address":"A1","value":"新内容"}]'):input('查找原文（Word/PPT 不跨段落）','find')+area('替换内容','replacement','新内容');
            modal('精确修改 · '+d.name,body,'审阅并保存版本',async f=>{const changes=d.format==='xlsx'?{cells:JSON.parse(f.get('cells'))}:{replacements:[{find:f.get('find'),replace:f.get('replacement')}]};const r=await invoke('documentOperation',{operation:'document_edit',id,expectedRevision:d.revision,...changes});if(r.status!=='succeeded')throw Error(r.error||r.message||'未保存');await update('state');toast('新版本已保存，原始导入文件不变');});return;
        }
        if(actionId==='documentDelete'){modal('删除文档与本地版本','<p>请先导出所需版本；原始导入文件不受影响。</p>','删除',async()=>{await invoke('documentDelete',{id});await update('state');});return;}
    }
    if (actionId === 'previewExport') {
        const item = previewTabs.find(t => t.id === previewId);
        if (item?.documentId){const d=(state.documents||[]).find(x=>x.id===item.documentId);if(!d)throw Error('文档已删除');await invoke('documentExport',{id:d.id,revision:d.revision});}
        else if(item) await invoke('exportText', { name: item.name, text: item.text });
        return;
    }
    if (actionId === 'previewContinue') {
        const item = previewTabs.find(t => t.id === previewId);
        if (item) {
            if(item.documentId){const d=(state.documents||[]).find(x=>x.id===item.documentId);switchChat('');page='home';toolsEnabled=true;draft=`请先 document_read 文档 id=${item.documentId}，再 ${d?.hasRichSource?'document_write（基于editableHtml保留其他结构）':d?.format==='docx'?'document_patch（使用wordEditing片段坐标）':'document_edit'}。修改要求：`;render();return;}
            const addition = `请继续修改「${item.name}」。修改要求：\n\n参考原文${item.text.length > 14000 ? '（前 14000 字符）' : ''}：\n${item.text.slice(0, 14000)}`;
            if (draft.length + addition.length > 20000)
                throw new Error('当前草稿过长，请先整理草稿再继续修改');
            draft += (draft ? '\n\n' : '') + addition;
            page = chatId ? 'chat' : 'home';
            render();
            $('#prompt')?.focus();
        }
        return;
    }
    if (actionId === 'previewMessage') {
        const c = state.chats.find(c => c.id === chatId), m = c?.messages[Number(id)];
        const docs=messageDocuments(state,c,m||{});
        if(docs.length){for(const d of docs)openPreview({id:'document:'+d.id,name:d.name+'.'+d.format,text:d.text,kind:'document',documentId:d.id});return;}
        if (m)
            openPreview({ id: 'message:' + chatId + ':' + id, name: c.name, text: m.content, kind: 'message' });
        return;
    }
    if (actionId === 'attachedPreview') {
        const f = files[Number(id)];
        if(f?.documentId){openPreview({id:'document:'+f.documentId,name:f.name,text:f.text,kind:'document',documentId:f.documentId});return;}
        if (f)
            openPreview({ id: 'file:' + f.folderId + ':' + f.relative, name: f.name, text: f.text, kind: 'file' });
        return;
    }
    if (actionId === 'contextPicker') {
        await updatePicker('@');
        $('#prompt')?.focus();
        return;
    }
    if (actionId === 'pickerChoose') {
        await choosePicker(Number(id));
        return;
    }
    if (actionId === 'send')
        return send();
    if (actionId === 'browserOpen' || actionId === 'externalBrowser') {
        const result = await invoke('openBrowser', { url: toolDraft.url, external: actionId === 'externalBrowser' });
        await update('state');
        if (result.error)
            throw new Error(result.error);
        toast('浏览器已打开');
        return;
    }
    if (actionId === 'browserInspect') {
        const result = await invoke('inspectBrowser', { id });
        if (result.error)
            throw new Error(result.error);
        if (result.status === 'denied') {
            toast('已取消检查');
            return;
        }
        browserTargets.clear();
        for (const target of result.elements)
            browserTargets.set(result.snapshotId + ':' + target.ref, { id: result.id, snapshotId: result.snapshotId, ref: target.ref, target });
        modal('可操作页面元素', `<p>${escape(result.url)} · 操作后需要重新检查</p>${result.elements.map(t => `<div class="file-row"><div>${escape(t.label)}<small>${escape(t.tag)} · ${escape(t.ref)}</small></div>${action(t.kind === 'input' ? '填写' : '点击', t.kind === 'input' ? 'browserFill' : 'browserClick', result.snapshotId + ':' + t.ref)}</div>`).join('') || '<p>未找到可操作元素；跨域 iframe 和密码等字段不会提供。</p>'}${result.truncated ? '<p>列表已截断：最多 120 个元素。</p>' : ''}`);
        return;
    }
    if (actionId === 'browserClick' || actionId === 'browserFill') {
        const target = browserTargets.get(id);
        if (!target)
            throw new Error('元素快照已失效，请重新检查');
        const payload = { id: target.id, snapshotId: target.snapshotId, ref: target.ref, operation: actionId === 'browserFill' ? 'browser_fill' : 'browser_click' };
        const run = async (text) => {
            const result = await invoke('browserAction', { ...payload, ...(text === undefined ? {} : { text }) });
            if (result.error)
                throw new Error(result.error);
            browserTargets.clear();
            await update('state');
            toast('浏览器操作：' + result.status + '；继续前请重新检查页面');
            return result;
        };
        if (actionId === 'browserFill') {
            modal('填写：' + target.target.label, '<p>输入将替换该字段内容；不会自动提交。原生窗口会再次展示具体目标和文本。</p>' + area('输入文本', 'browserText'), '审阅并填写', async (f) => run(String(f.get('browserText') || '')));
        }
        else {
            await run();
            $('#modal').close();
        }
        return;
    }
    if (actionId === 'browserRead') {
        const result = await invoke('readBrowser', { id });
        await update('state');
        if (result.error)
            throw new Error(result.error);
        if (result.status === 'denied') {
            toast('已取消读取');
            return;
        }
        modal('网页正文', `<p>${escape(result.url)}</p><pre>${escape(result.text)}</pre>`);
        return;
    }
    if (actionId === 'commandRun') {
        if (activeCommand) return;
        let args;
        try { args = JSON.parse(toolDraft.args); }
        catch { throw new Error('参数需要填写 JSON 数组，例如 ["--version"]'); }
        if (!toolDraft.folderId) throw new Error('请先选择授权工作目录');
        const request = { ...toolDraft, args, id: crypto.randomUUID() };
        activeCommand = request.id;
        try {
            const job = await invoke('enqueueCommand', request);
            applyState(await invoke('state'));
            toast('命令已受理：' + (statusNames[job.status] || job.status));
        } finally { activeCommand = ''; render(); }
        return;
    }
    if (actionId === 'commandCancelJob') {
        await invoke('cancelCommand', { id });
        await update('state');
        toast('已请求停止命令');
        return;
    }
    if (actionId === 'commandRetryJob') {
        const job = state.commandJobs?.find(j => j.id === id);
        if (!job) throw new Error('命令记录不存在');
        await invoke('retryCommand', { retryOf: id, revision: job.revision, id: crypto.randomUUID() });
        await update('state');
        toast('已创建新执行，仍需系统确认');
        return;
    }
    if (actionId === 'commandForgetJob') {
        await invoke('forgetCommand', { id });
        await update('state');
        return;
    }
    if (actionId === 'stop') {
        await invoke('cancelChat', { id: chatId });
        return;
    }
    if (actionId === 'new') {
        switchChat('');
        draft = '';
        files = [];selections=[];images=[];sendImages=false;
        page = 'home';
        render();
        return;
    }
    if (actionId === 'openChat') {
        switchChat(id);
        page = 'chat';
        render();
        return;
    }
    if(actionId==='settings'){modal('模型接入与自动选择',modelLibrary(state,escape));return;}
    if(actionId==='modelEdit'){const p=(state.modelProfiles||[]).find(p=>p.id===id)||{};modal(p.id?'编辑模型':'添加模型',modelForm(p,state.settings.secureStorage,escape),'保存模型',async f=>{const payload={...Object.fromEntries(f),id:p.id,revision:p.revision};for(const k of ['supportsOff','tools','vision','enabled','persistKey','clearKey'])payload[k]=f.has(k);const secret=document.querySelector('#modal [name="apiKey"]');if(secret)secret.value='';await update('modelProfile',payload);toast('模型配置已保存，未发送网络请求');});return;}
    if(actionId==='modelRemove'){const p=(state.modelProfiles||[]).find(p=>p.id===id);if(p)modal('删除模型配置','<p>移除此配置及保存的密钥；排队或执行中的请求不会自动换模型。</p>','删除',async()=>{await update('modelProfile',{id:p.id,revision:p.revision,remove:true});});return;}
    if (actionId === 'legacySettings') {
        modal('连接你的模型', `<p>支持 Chat Completions 兼容 API。远程服务使用 HTTPS，本机 Ollama 可用 http://127.0.0.1:11434/v1。内容只会发送到你填写的地址。</p>${input('工作空间名称', 'name', state.settings.name)}${input('Base URL', 'baseUrl', state.settings.baseUrl || 'https://api.deepseek.com')}${input('模型 ID', 'model', state.settings.model === '尚未配置' ? 'deepseek-chat' : state.settings.model)}<label>API Key ${state.settings.hasKey ? '（留空保留当前密钥）' : ''}<input name="apiKey" type="password" autocomplete="off"></label><label class="check"><input type="checkbox" name="persistKey" ${state.settings.secureStorage ? '' : 'disabled'}>使用系统钥匙串加密保存新密钥</label><label class="check"><input type="checkbox" name="clearKey">清除当前保存的密钥</label><p>${state.settings.secureStorage ? '未勾选时，新密钥只保留至应用退出。' : '系统加密存储不可用，新密钥只在本次运行中保留。'}保存配置不会发送测试请求；可通过一次真实对话验证连接。</p>`, '保存配置', async (f) => { await update('settings', { ...Object.fromEntries(f), persistKey: f.has('persistKey'), clearKey: f.has('clearKey') }); toast('模型配置已保存'); });
        return;
    }
    if (actionId === 'folder') {
        state = await invoke('pickFolder');
        folderId = state.folders.at(-1)?.id || '';
        page = 'files';
        await loadFiles();
        return;
    }
    if (actionId === 'revoke') {
        if (!id)
            return;
        modal('撤销文件夹授权', '<p>今后不能再读取该文件夹。已发送的对话和模型服务商持有的内容不会自动删除。</p>', '撤销授权', async () => { await update('removeFolder', { id }); files = files.filter(f => f.folderId !== id); folderId = ''; await loadFiles(); });
        return;
    }
    if (actionId === 'fileSearch') {
        searchTerm = $('#fileQuery').value;
        return loadFiles();
    }
    if(actionId==='codeProjects'){
        applyState(await invoke('state'));
        modal('代码项目与运行环境',codeProjectsView({projects:state.codeProjects,jobs:state.commandJobs,escape}));return;
    }
    if(actionId==='projectImport'){const p=await invoke('projectImport');if(p)return handle('codeProjects');return;}
    if(actionId==='projectLogs'){$('#modal').close();await navigate('tools');return;}
    if(actionId==='projectRun'||actionId==='projectRunService'){const split=id.indexOf(':');await invoke('projectRun',{id:id.slice(0,split),stepId:id.slice(split+1),service:actionId==='projectRunService'});applyState(await invoke('state'));$('#modal').close();await navigate('tools');toast('已加入持久命令队列，请核对系统确认中的实际命令');return;}
    if(actionId==='attachImage'){
        if(images.length>=8)throw Error('每次最多8张图片');
        const scope=chatId,presentPage=page,row=await invoke('imageImport');
        applyState(await invoke('state'));
        if(row&&scope===chatId&&presentPage===page){images.push(row);sendImages=false;}else if(row)toast('图片已保存在本机图片库，可按需附加');render();return;
    }
    if(actionId==='detachImage'){images.splice(Number(id),1);sendImages=false;render();return;}
    if(actionId==='imageLibrary'){
        applyState(await invoke('state'));
        modal('本机图片', '<p>选择附加图片后，默认仅本机保存；发送像素需勾选输入框中的选项。历史消息引用的图片不能在此移除。</p>'+(state.imageAttachments||[]).map(i=>`<div class="file-row"><div>${escape(i.name)}<small>${i.width} × ${i.height}</small></div><button type="button" data-action="imageAttachStored" data-id="${escape(i.id)}">附加</button><button type="button" data-action="imageRemove" data-id="${escape(i.id)}">移除未使用图片</button></div>`).join(''));return;
    }
    if(actionId==='imageAttachStored'){if(images.length>=8)throw Error('每次最多8张图片');const i=(state.imageAttachments||[]).find(i=>i.id===id);if(i&&!images.some(i=>i.id===id))images.push(i);sendImages=false;$('#modal').close();render();return;}
    if(actionId==='imageRemove'){await update('imageRemove',{id});images=images.filter(i=>i.id!==id);$('#modal').close();return;}
    if(actionId==='reattachDocument'){
        if(files.length>=32)throw Error('每次最多32份附件');
        const d=(state.documents||[]).find(d=>d.id===id);
        if(!d)throw Error('附件已移除，请重新上传');
        if(!files.some(f=>f.documentId===id))files.push({documentId:d.id,revision:d.revision,sha256:d.sha256,name:d.name,text:d.text});
        render();toast('已重新附加当前保存版本，请核对后发送');return;
    }
    if (actionId === 'attach') {
        if(files.length>=32)throw Error('每次最多32份附件');
        const scope=chatId,presentPage=page;
        const row=await invoke('chatAttachmentImport');
        applyState(await invoke('state'));
        if(row&&scope===chatId&&presentPage===page){const added=row.attachments||[row];if(row.project)toast('已识别代码项目，可在＋菜单的代码项目与运行环境中准备和启动');if(files.length+added.length>32)throw Error('合计超过32份，导入副本已保存到成果中心，请分批附加');files.push(...added);toast('已附加'+added.length+'份，点击发送后正文交给当前模型');if(row.skipped?.length)modal('ZIP解压报告','<p>已附加'+added.length+'份；以下文件未作为正文理解：</p>'+row.skipped.map(x=>'<p>'+escape(x.path)+'：'+escape(x.reason)+'</p>').join(''));}
        else if(row)toast('文档已保存到成果中心；对话已切换，未自动附加');
        render();$('#prompt')?.focus();return;
    }
    if (actionId === 'detach') {
        files.splice(Number(id), 1);
        render();
        return;
    }
    if (actionId === 'previewFile') {
        const f = await invoke('previewFile', fileResults[Number(id)]);
        if(f.truncated)toast('文本预览已截断；HTML文件使用完整预览');
        openPreview({ id: 'file:' + f.folderId + ':' + f.relative, name: f.name, text: f.text, kind: 'file' });
        return;
    }
    if (actionId === 'attachFile') {
        if (files.length >= 32)
            throw new Error('每次最多附加 32 个文件');
        const f = await invoke('readFile', fileResults[Number(id)]);
        if (!files.some(x => x.folderId === f.folderId && x.relative === f.relative))
            files.push(f);
        page = chatId ? 'chat' : 'home';
        render();
        $('#prompt')?.focus();
        return;
    }
    if (actionId === 'suggest') {
        agentId = id === 'writer' ? 'writer' : id === 'research' ? 'research' : 'assistant';
        draft = ({ research: '请帮我研究以下问题。先明确目标、证据来源和信息缺口，再给出有依据的结论。\n研究问题：', writer: '请根据以下背景起草一份项目方案，包含目标、实施步骤、交付物与验收标准。\n项目背景：', summary: '请根据我附加的资料，提取关键事实、决策和下一步行动，标出信息缺口。\n整理要求：', project: '请检查我授权的项目。先列出检查步骤，获得工具批准后运行必要命令，依据实际结果报告问题与改进建议。\n项目与检查目标：' })[id];
        render();
        $('#prompt')?.focus();
        return;
    }
    if(actionId==='capabilityTab'){capabilityTab=id;render();return;}
    if(actionId==='addPresetSkill'){const out=await invoke('skillPreset',{id});applyState(out.state);render();toast('技能已添加，可在智能体中绑定');return;}
    if(actionId==='uploadSkill'){const out=await invoke('skillImport');applyState(out.state);render();if(out.imported)toast('技能已上传，可在智能体中绑定');return;}
    if(actionId==='inspectSkill'){const out=await invoke('skillRead',{id});modal(out.name,`<p>${escape(out.description)}</p><pre class="skill-source">${escape(out.text)}</pre><h3>资源文件</h3>${out.files.map(f=>`<p>${escape(f.path)} · ${f.bytes} 字节</p>`).join('')}`);return;}
    if(actionId==='toggleSkill'||actionId==='removeSkill'){const item=(state.skillPackages||[]).find(s=>s.id===id);applyState(await invoke('skillUpdate',{id,...(actionId==='removeSkill'?{remove:true}:{enabled:!item.enabled})}));render();return;}
    if(actionId==='clearKnowledgeIndex'){await invoke('clearKnowledgeIndex');toast('已清除派生检索索引，文档与对话保留；后续获批查询会重建');return;}
    if(actionId==='newMcp'||actionId==='editMcp'||actionId==='newPresetMcp'){const preset=actionId==='newPresetMcp'?(state.capabilityPresets?.mcp||[]).find(p=>p.id===id):null;if(actionId==='newPresetMcp'&&!preset)throw Error('预置连接器不存在');const c=(state.mcpConnections||[]).find(c=>preset?c.url.replace(/\/$/,'')===preset.url.replace(/\/$/,''):c.id===id)||(preset?{name:preset.title,url:preset.url,auth:preset.auth,description:preset.description}:{});modal(c.id?'配置 MCP 连接':'添加 MCP 连接',input('连接名称','name',c.name)+input('服务地址（Streamable HTTP）','url',c.url||'','url')+mcpAuthFields(c)+`<label>简介<input name="description" maxlength="200" value="${escape(c.description||'')}"></label><label class="check"><input type="checkbox" name="enabled" ${c.enabled===false?'':'checked'}>启用连接</label><p>支持HTTPS或本机HTTP；支持手动Bearer Token；暂不支持OAuth登录、自动刷新或stdio。保存不会联网，测试只发现目录，不调用业务工具。</p>`,'保存',async f=>{const out=await invoke('mcpConnection',{id:c.id,name:f.get('name'),url:f.get('url'),description:f.get('description'),auth:f.get('auth'),token:f.get('token'),enabled:f.has('enabled')});applyState(out.state);render();});return;}
    if(actionId==='removeMcp'){const out=await invoke('mcpConnection',{id,remove:true});applyState(out.state);render();return;}
    if(actionId==='cancelMcpTest'){await invoke('mcpCancelTest',{id});return;}
    if(actionId==='testMcp'){busyMcp.add(id);render();try{const out=await invoke('mcpTest',{id});applyState(out.state);toast('已发现 '+out.result.count+' 项工具');}finally{busyMcp.delete(id);applyState(await invoke('state'));render();}return;}
    if (actionId === 'newAgent' || actionId === 'editAgent') {
        const a = state.agents.find(a => a.id === id) || {};
        modal(a.id ? '编辑智能体' : '创建智能体', input('名称', 'name', a.name) + input('简介', 'description', a.description) + area('角色指令', 'prompt', a.prompt) + agentEditor(a,state.documents||[],state), '保存', async (f) => update('agent', {name:f.get('name'),description:f.get('description'),prompt:f.get('prompt'),...readAgentEditor(f,$('#modal')),id:a.id}));
        bindAgentEditor($('#modal'),{uploadSkill:async()=>{const out=await invoke('skillImport');applyState(out.state);return out;},saveMcp:async p=>{const out=await invoke('mcpConnection',p);applyState(out.state);return out;},onError:toast});
        return;
    }
    if (actionId === 'useAgent') {
        switchChat('');
        agentId = id;
        page = 'home';
        draft = '';
        files = [];selections=[];images=[];sendImages=false;
        render();
        return;
    }
    if (actionId === 'newMemory') {
        modal('添加记忆', '<p>偏好将加入每次对话的上下文，可随时删除。</p>' + area('工作背景或偏好', 'text'), '保存', async (f) => update('memory', { text: f.get('text') }));
        return;
    }
    if (actionId === 'newTask') {
        modal('创建自动化任务', input('任务名称', 'name') + area('任务提示词', 'prompt') + '<label class="check"><input name="enabled" type="checkbox">每天在此时刻执行（应用需要保持运行）</label>', '创建任务', async (f) => update('task', { name: f.get('name'), prompt: f.get('prompt'), enabled: f.has('enabled') }));
        return;
    }
    if (actionId === 'cancelTask' || actionId === 'cancelRun') {
        await invoke(actionId, {id}); await update('state'); return;
    }
    if (actionId === 'runTask') {
        toast('任务开始执行，可稍后刷新状态');
        const result = invoke('runTask', { id, requestId:crypto.randomUUID() });
        await new Promise(r => setTimeout(r, 150));
        applyState(await invoke('state'));
        render();
        applyState(await result);
        render();
        toast('任务执行已结束');
        return;
    }
    if (actionId === 'toggleTask') {
        await update('task', { id, enabled: !state.tasks.find(t => t.id === id).enabled });
        return;
    }
    if (actionId === 'taskResult') {
        const t = state.tasks.find(t => t.id === id);
        modal(t.name, `<pre>${escape(t.result)}</pre>`);
        return;
    }
    if (actionId === 'refresh') {
        await update('state');
        return;
    }
    if (actionId === 'runner') {
        await invoke('openRunner');
        toast('已打开本地 Office 执行器');
        return;
    }
    if (actionId === 'saveMessage' || actionId === 'exportMessage') {
        const c = state.chats.find(c => c.id === chatId), m = c.messages[Number(id)];
        if (actionId === 'saveMessage') {
            await update('artifact', { name: c.name, text: m.content });
            toast('已保存到成果中心');
        }
        else {
            const docs=messageDocuments(state,c,m);
            if(docs.length===1)await invoke('documentExport',{id:docs[0].id,revision:docs[0].revision});
            else if(docs.length){modal('下载生成文件',docs.map(d=>action(d.name+'.'+d.format,'documentExport',d.id)).join(''));}
            else await invoke('exportText', { name: c.name, text: m.content });
        }
        return;
    }
    if (actionId === 'exportChat') {
        const c = state.chats.find(c => c.id === chatId);
        if (!c?.messages.length)
            throw new Error('暂无可导出的对话');
        await invoke('exportText', { name: c.name, text: c.messages.map(m => `## ${m.role === 'user' ? '你' : 'WillBuddy'}\n\n${m.content}`).join('\n\n') });
        return;
    }
    if (actionId === 'viewArtifact' || actionId === 'exportArtifact') {
        const a = state.artifacts.find(a => a.id === id);
        if (actionId === 'viewArtifact')
            openPreview({ id: 'artifact:' + id, name: a.name, text: a.text, kind: 'artifact' });
        else
            await invoke('exportText', { name: a.name, text: a.text });
        return;
    }
    const deleteMethods = { deleteArtifact: 'artifact', deleteTask: 'task', deleteMemory: 'memory', deleteAgent: 'agent', deleteChat: 'deleteChat' };
    if (deleteMethods[actionId]) {
        modal('确认删除', '<p>此操作会从当前本地工作空间移除该项目。</p>', '删除', async () => {
            await update(deleteMethods[actionId], { id, remove: true });
            if (actionId === 'deleteChat') {
                chatId = '';
                page = 'home';
                render();
            }
        });
        return;
    }
    if (actionId === 'search') {
        modal('搜索工作空间', '<label>搜索对话、成果、智能体<input id="globalSearch" placeholder="输入关键词"></label><div id="searchResults"></div>');
        $('#globalSearch').oninput = e => { const q = e.target.value.toLowerCase(); $('#searchResults').innerHTML = q ? [...state.chats.map(c => ({ ...c, type: 'openChat' })), ...state.artifacts.map(a => ({ ...a, type: 'viewArtifact' })), ...state.agents.map(a => ({ ...a, type: 'useAgent' }))].filter(x => x.name.toLowerCase().includes(q)).slice(0, 20).map(x => `<div class="file-row"><div>${escape(x.name)}</div><button class="secondary" data-action="${x.type}" data-id="${x.id}" data-search-result="true">打开</button></div>`).join('') || '<p>未找到匹配项目</p>' : ''; };
        return;
    }
}
document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b)
        return;
    if(b.dataset.action)e.preventDefault();
    try {
        if (b.dataset.searchResult)
            $('#modal').close();
        if (b.dataset.page)
            await navigate(b.dataset.page);
        else if (b.dataset.action)
            await handle(b.dataset.action, b.dataset.id);
    }
    catch (err) {
        toast(err.message);
    }
});
document.addEventListener('toggle', e => {
    const d = e.target;
    if (!d.matches?.('details[data-detail]') || !d.isConnected)
        return;
    if (d.open)
        openedDetails.add(d.dataset.detail);
    else
        openedDetails.delete(d.dataset.detail);
    document.querySelectorAll('details[data-detail]').forEach(other => {
        if (other !== d && other.dataset.detail === d.dataset.detail && other.open !== d.open)
            other.open = d.open;
    });
}, true);
document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !$('#modal').open) {
        e.preventDefault();
        handle('new').catch(e => toast(e.message));
    }
});
async function boot() {
    try {
        if (api) {
            applyState(await invoke('state'));
        }
        render();
    }
    catch (e) {
        $('#app').textContent = '工作空间加载失败：' + e.message;
    }
}
let runtimeTimer;
api?.onRuntime?.(() => {
    clearTimeout(runtimeTimer);
    runtimeTimer = setTimeout(async () => {
        try {
            applyState(await invoke('state'));
            if (!$('#modal').open && ['chat', 'tools', 'tasks'].includes(page))
                render();
        }
        catch (e) {
            toast(e.message);
        }
    }, 120);
});
const streamUpdates = new Map();
const liveStreams = new Map();
function applyState(next) {
    for (let i=0;i<(next.runJobs || []).length;i++) {
        const incoming=next.runJobs[i],old=(state.runJobs || []).find(j=>j.id===incoming.id);
        if (old && old.revision > incoming.revision) next.runJobs[i]=old;
    }
    for (let i=0;i<next.tasks.length;i++) {
        const incoming=next.tasks[i],old=state.tasks.find(t=>t.id===incoming.id);
        if (old && ((old.lastRun || 0) > (incoming.lastRun || 0) ||
            (old.runId && old.runId===incoming.runId && (old.runRevision || 0) > (incoming.runRevision || 0)))) next.tasks[i]=old;
    }
    for (let i = 0; i < next.chats.length; i++) {
        const incoming = next.chats[i], previous = state.chats.find(c => c.id === incoming.id);
        if (previous?.run && ((previous.run.id === incoming.run?.id && (previous.run.revision || 0) > (incoming.run.revision || 0)) || previous.run.startedAt > (incoming.run?.startedAt || 0) || (previous.run.id === incoming.run?.id && !['queued','running','cancelling'].includes(previous.run.status) && ['queued','running','cancelling'].includes(incoming.run.status))))
            next.chats[i] = previous;
    }
    for (const [id, local] of liveStreams) {
        const chat = next.chats.find(c => c.id === local.chatId);
        if (!chat || chat.run?.id !== local.message.runId || chat.run.status !== 'running') {
            liveStreams.delete(id);
            continue;
        }
        const message = chat.messages.find(m => m.id === id);
        if (message?.sequence >= local.message.sequence)
            continue;
        if (message)
            Object.assign(message, local.message);
        else
            chat.messages.push({ ...local.message });
    }
    state = next;
    for(const tabs of [previewTabs,...[...taskWorkspaces.values()].map(w=>w.previewTabs||[])])for(const t of tabs){if(t.documentId){const d=(state.documents||[]).find(d=>d.id===t.documentId);if(d){t.text=d.text;t.name=d.name+'.'+d.format;}}}
}
let streamPaintTimer;
api?.onStream?.(event => {
    if (event?.version !== 1 || event.type !== 'text' || typeof event.content !== 'string' || event.content.length > 4 * 1024 * 1024 || !Number.isSafeInteger(event.sequence))
        return;
    const chat = state.chats.find(c => c.id === event.chatId);
    if (!chat)
        return;
    if (chat.run?.id === event.runId && !['queued','running'].includes(chat.run.status))
        return;
    if (chat.run && chat.run.id !== event.runId && chat.run.startedAt >= event.startedAt)
        return;
    chat.run = { ...chat.run, id: event.runId, status: 'running', startedAt: event.startedAt };
    let message = chat.messages.find(m => m.id === event.messageId);
    if (message && message.sequence >= event.sequence)
        return;
    if (!message) {
        message = { id: event.messageId, role: 'assistant', content: '', runId: event.runId, time: event.time };
        chat.messages.push(message);
    }
    Object.assign(message, { content: event.content, sequence: event.sequence, streaming: true, intermediate: true });
    liveStreams.set(event.messageId, { chatId: event.chatId, message: { ...message } });
    streamUpdates.set(event.messageId, message);
    if (!streamPaintTimer)
        streamPaintTimer = setTimeout(() => {
            streamPaintTimer = undefined;
            if (page !== 'chat' || $('#modal').open)
                return;
            const chat = state.chats.find(c => c.id === chatId);
            let missing = false;
            const scroller = $('.messages-scroll'), stick = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 90;
            for (const message of streamUpdates.values())
                if (message.runId === chat?.run?.id && chat.run.status === 'running') {
                    const node = [...document.querySelectorAll('[data-message-id]')].find(n => n.dataset.messageId === message.id);
                    if (node) {
                        node.querySelector('.message-content').innerHTML = rich(message.content);
                        node.dataset.streaming = 'true';
                    }
                    else
                        missing = true;
                }
            streamUpdates.clear();
            if (missing)
                render();
            else if (stick && scroller)
                scroller.scrollTop = scroller.scrollHeight;
        }, 40);
});
document.addEventListener('click', event => { const link = event.target.closest('a.rendered-link'); if (!link)
    return; event.preventDefault(); const url = link.getAttribute('href'); if (url && /^https?:\/\//i.test(url))
    invoke('openBrowser', { url }).catch(error => toast(error.message)); });
boot();

// A preview frame has no native bridge. Reconcile its explicit selection on the host.
document.addEventListener('office-selection',async e=>{
 const scope=chatId;try{
  const selected=await invoke('documentSelection',e.detail.input);
  if(scope!==chatId)return;
  if(e.detail.action==='edit'){
   if(selected.kind!=='text'||!selected.editable)throw Error('此选区仅可附加问答，复杂段落不能直接编辑');
   modal('编辑选中文字','<p>仅替换以下选区，保留未修改文字与其他文档部件。</p><blockquote>'+escape(selected.text)+'</blockquote>'+area('替换为','replacement',selected.text),'保存Word新版本',async f=>{const r=await invoke('documentSelectionReplace',{...e.detail.input,replacement:f.get('replacement')});if(r.status!=='succeeded')throw Error('未保存选区');await update('state');toast('已保存选区修改，原件保留');});return;
  }
  if(selections.length>=3)throw Error('每轮最多3处选区');selections.push(selected);toolsEnabled=true;page=chatId?'chat':'home';render();$('#prompt')?.focus();toast('选区已附加，发送后交给当前模型；修改范围受限于选区');
 }catch(err){toast(err.message);}
});

// Explicit double-click opens an owned Office editor window; never infer filesystem paths.
document.addEventListener('dblclick',event=>{if(!state.officeWorkspace||event.target.closest('button,a,input,textarea'))return;const card=event.target.closest('[data-document]');const d=state.documents?.find(d=>d.id===card?.dataset.document);if(d&&['docx','xlsx','pptx'].includes(d.format))invoke('officeOpen',{id:d.id,revision:d.revision}).catch(e=>toast(e.message));});
