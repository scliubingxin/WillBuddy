import {createGenOfficeBridge} from './main/genoffice.mjs';
import {readDocumentSource,writeDocumentDestination} from './main/document-files.mjs';
import {documentViews} from './services/documents.mjs';
import { sharedRunQueue } from './runtime/run-queue.mjs';
import { createCommandService } from './services/commands.mjs';
import { createWorkspaceService } from './services/workspace.mjs';
import { createApprover } from './main/approval.mjs';
import { createRegistrar } from './main/ipc.mjs';
import { createConversationService } from './services/conversation.mjs';
import { createTaskService } from './services/tasks.mjs';
import { recoverInterruptedWork } from './services/recovery.mjs';
import { requiredText as text } from './services/validation.mjs';
import { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu, safeStorage, shell, Notification } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { ToolRuntime } from './runtime/tools.mjs';
import { chooseUserDataDirectory } from './runtime/identity.mjs';
import { BrowserService } from './runtime/browser.mjs';
import { Store, uid, listGranted, readGranted, modelEndpoint } from './core.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
let win, store, sessionKey = '', runner, closing = false, tick, shortcutReady = false;
const active = new Map();
const browser = new BrowserService({ BrowserWindow, shell });
const notifyRuntime = () => {
    if (win && !win.isDestroyed())
        win.webContents.send('actwill:runtime');
};
const approve = createApprover({ dialog, getWindow: () => win, focus });
let toolRuntime, genoffice;
const executeTool = (...args) => toolRuntime.execute(...args);
const view = () => { const { encryptedKey, ...settings } = store.data.settings; return { ...store.data, documents:documentViews(store.data), settings: { ...settings, hasKey: !!sessionKey || !!encryptedKey, keySaved: !!encryptedKey, secureStorage: safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text' }, browsers: browser.list(), desktop: { platform: process.platform, shortcutReady } }; };
function key() {
    if (sessionKey)
        return sessionKey;
    const encrypted = store.data.settings.encryptedKey;
    return encrypted ? safeStorage.decryptString(Buffer.from(encrypted, 'base64')) : '';
}
const register = createRegistrar({ ipcMain, getWindow: () => win, entryURL: new URL('./src/index.html', import.meta.url).href });
async function launch() {
    win = new BrowserWindow({ width: 1380, height: 920, minWidth: 860, minHeight: 640, title: 'WillBuddy', icon: path.join(here, 'assets/icon-512.png'), backgroundColor: '#ffffff', titleBarStyle: 'hiddenInset', ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 20, y: 20 } } : {}), webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    win.on('close', e => {
        if (!closing && process.platform === 'darwin') {
            e.preventDefault();
            win.hide();
        }
    });
    await win.loadFile(path.join(here, 'src/index.html'));
}
function focus() {
    if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
    }
}
let conversations, tasks, commands, runs;
const runTask = (id, options) => tasks.run(id, options);
app.setPath('userData', await chooseUserDataDirectory(app.getPath('appData')));
// Preserve the pre-rename OS cryptographic/application identity for existing keys.
app.setName('Actwill AI');
app.setAboutPanelOptions({ applicationName: 'WillBuddy', applicationVersion: '0.10.1' });
if (!app.requestSingleInstanceLock())
    app.quit();
else {
    app.on('second-instance', focus);
    app.whenReady().then(async () => {
        if (process.platform === 'darwin')
            app.dock.setIcon(path.join(here, 'assets/icon-1024.png'));
        store = new Store(app.getPath('userData'));
        await store.load();
        const defaultAgent = store.data.agents.find(a => a.id === 'assistant');
        if (defaultAgent?.name === 'Actwill 助手')
            defaultAgent.name = 'WillBuddy 助手';
        if (defaultAgent?.prompt === '你是 Actwill 工作助手。用中文清晰地帮助用户完成工作。区分事实和假设，不编造来源。')
            defaultAgent.prompt = '你是 WillBuddy 工作助手。用中文清晰地帮助用户完成工作。区分事实和假设，不编造来源。';
        store.data.executions ??= [];
        toolRuntime = new ToolRuntime({ store, browser, approve, notify: notifyRuntime });
        genoffice=createGenOfficeBridge({documents:toolRuntime.documents,approve});
        recoverInterruptedWork(store.data);
        commands = createCommandService({ store, active, executeTool, notify: notifyRuntime });
        runs = sharedRunQueue({store, active, notify:notifyRuntime});
        conversations = createConversationService({ queue:runs, store, active, key, view, executeTool, releaseToolGrants:id=>toolRuntime.browserPermissions.release(id), notify: notifyRuntime,notifyStream:event=>{if(win&&!win.isDestroyed())win.webContents.send('actwill:stream',event);} });
        tasks = createTaskService({ queue:runs, notify:notifyRuntime, store, active, key, view, notifyCompleted: task => {
                if (Notification.isSupported())
                    new Notification({ title: 'WillBuddy · 任务完成', body: task.name }).show();
            } });
        await store.save();
        Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'WillBuddy', submenu: [{ label: '显示工作台', click: focus }, { label: '取消所有操作确认', accelerator: 'CommandOrControl+Shift+Escape', click: () => approve.cancelAll() }, { label: '撤销浏览器任务授权', click: () => { toolRuntime.browserPermissions.revoke(); approve.cancelAll(); } }, { role: 'about' }, { type: 'separator' }, { role: 'quit' }] }, { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }, { label: '视图', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] }]));
        const workspace = createWorkspaceService({ store, active, view });
        for (const [name, handler] of Object.entries(workspace))
            register(name, handler);
        register('state', () => view());
        register('settings', async (p) => {
            if (active.size || runs.hasPending())
                throw new Error('请等待当前请求结束再修改模型');
            if (p.baseUrl)
                modelEndpoint(p.baseUrl);
            const s = store.data.settings;
            if (p.baseUrl)
                s.baseUrl = text(p.baseUrl, 500);
            if (p.model)
                s.model = text(p.model, 200);
            if (p.name)
                s.name = text(p.name, 100);
            if (p.clearKey) {
                delete s.encryptedKey;
                sessionKey = '';
            }
            if (typeof p.apiKey === 'string' && p.apiKey) {
                if (p.apiKey.length > 2000)
                    throw new Error('密钥过长');
                if (p.persistKey) {
                    if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text')
                        throw new Error('系统钥匙串不可用，请取消“加密保存密钥”后仅在本次运行使用');
                    s.encryptedKey = safeStorage.encryptString(p.apiKey).toString('base64');
                    sessionKey = '';
                }
                else {
                    sessionKey = p.apiKey;
                    delete s.encryptedKey;
                }
            }
            await store.save();
            return view();
        });
        register('pickFolder', async () => {
            const result = await dialog.showOpenDialog(win, { title: '选择授权给 WillBuddy 的文件夹', properties: ['openDirectory'] });
            if (!result.canceled) {
                const folderPath = result.filePaths[0];
                if (!store.data.folders.some(f => f.path === folderPath)) {
                    store.data.folders.push({ id: uid(), name: path.basename(folderPath), path: folderPath });
                    store.log('已授权本地文件夹', path.basename(folderPath));
                    await store.save();
                }
            }
            return view();
        });
        register('removeFolder', async (p) => { store.data.folders = store.data.folders.filter(f => f.id !== p.id); store.log('已撤销文件夹授权'); await store.save(); return view(); });
        register('listFiles', p => listGranted(store.data.folders, p.id, String(p.query || '').slice(0, 200)));
        register('readFile', p => readGranted(store.data.folders, p.folderId, p.relative));
        register('chat', p => conversations.run(p));
        register('revokeBrowserApprovals', () => { toolRuntime.browserPermissions.revoke(); approve.cancelAll(); return true; });
        register('cancelApprovals', () => { approve.cancelAll(); return true; });
        register('openBrowser', p => executeTool('browser_open', p, undefined, { manual: true }));
        register('readBrowser', p => executeTool('browser_read', p));
        register('inspectBrowser', p => executeTool('browser_snapshot', p));
        register('browserAction', p => {
            const { operation, ...args } = p;
            if (!['browser_click', 'browser_fill'].includes(operation))
                throw new Error('未知浏览器操作');
            return executeTool(operation, args);
        });
        register('enqueueCommand', p => commands.enqueue(p));
        register('retryCommand', p => commands.retry(p));
        register('forgetCommand', p => commands.forget(p.id));
        register('cancelCommand', p => commands.cancel(p.id));
        register('cancelChat', p => conversations.cancel(p.id));
        register('runTask', p => runTask(p.id, {requestId:p.requestId}));
        register('cancelTask', p => tasks.cancel(p.id));
        register('cancelRun', p => runs.cancel(p.id));
        register('documentOperation', p => {
            const {operation,...args}=p;
            if (!['document_create','document_read','document_edit'].includes(operation)) throw Error('未知文档操作');
            return executeTool(operation,args);
        });
        register('genofficeOpen', p => genoffice.open(p.id,p.revision));
        register('genofficeImport', p => genoffice.importEdited(p.id));
        register('documentEditor', p => toolRuntime.documents.editor(p.id));
        register('documentSaveEditor', p => toolRuntime.documents.updateEditor(p.id,p.revision,p.patch,approve));
        register('documentRead', p => toolRuntime.documents.read(p.id));
        register('documentDelete', p => toolRuntime.documents.remove(p.id));
        register('documentImport', async () => {
            const result=await dialog.showOpenDialog(win,{title:'导入可编辑文档（原文件不变）',properties:['openFile'],filters:[{name:'文档',extensions:['docx','xlsx','pptx','md','html']}]});
            if(result.canceled)return false;
            const source=result.filePaths[0],bytes=await readDocumentSource(source);
            return toolRuntime.documents.importFile(path.basename(source,path.extname(source)),path.extname(source).slice(1).toLowerCase(),bytes);
        });
        register('documentExport', async p => {
            const selected=toolRuntime.documents.bytes(p.id,p.revision);
            const result=await dialog.showSaveDialog(win,{title:'导出文档',defaultPath:selected.name.replace(/[\\/:*?"<>|]/g,'_')+'.'+selected.format,filters:[{name:selected.format.toUpperCase(),extensions:[selected.format]}]});
            if(result.canceled)return false;
            // Dialog explicitly authorizes the destination; recheck version after user interaction.
            toolRuntime.documents.bytes(p.id,p.revision);
            const written=await writeDocumentDestination(result.filePath,selected.bytes);
            store.log('已导出文档',path.basename(result.filePath));await store.save();
            return {saved:true,sha256:selected.sha256,bytes:written};
        });
        register('exportText', async (p) => {
            const content = text(p.text, 500000);
            const result = await dialog.showSaveDialog(win, { title: '保存成果', defaultPath: (p.name || 'WillBuddy 成果').replace(/[\\/:*?"<>|]/g, '_') + '.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
            if (!result.canceled) {
                await writeFile(result.filePath, content, 'utf8');
                store.log('已导出文件', path.basename(result.filePath));
                await store.save();
                return true;
            }
            return false;
        });
        register('openRunner', async () => {
            const runnerPath = path.resolve(here, '../local-runner/server.py');
            if (app.isPackaged)
                throw new Error('安装版请使用源码包中的 local-runner/server.py；具体依赖见运行说明');
            await stat(runnerPath);
            if (!runner) {
                runner = spawn(process.platform === 'win32' ? 'python' : 'python3', [runnerPath, '--port', '8765'], { cwd: path.dirname(runnerPath), stdio: 'ignore' });
                runner.on('error', () => { runner = null; });
                runner.on('exit', () => { runner = null; });
            }
            for (let i = 0; i < 30; i++) {
                try {
                    const r = await fetch('http://127.0.0.1:8765/', { signal: AbortSignal.timeout(300) });
                    if (r.ok && (await r.text()).includes('X-Muyun-Session')) {
                        await shell.openExternal('http://127.0.0.1:8765');
                        return true;
                    }
                }
                catch { }
                await new Promise(r => setTimeout(r, 100));
            }
            throw new Error('本地执行器未就绪，请检查 Python 3.10+ 或端口占用');
        });
        await launch();
        shortcutReady = globalShortcut.register('CommandOrControl+Shift+Space', focus);
        tick = setInterval(() => {
            void commands.pump();
            void runs.pump();
            for (const t of store.data.tasks) {
                if (t.enabled && t.nextRun && t.nextRun <= Date.now() && !['queued','running','cancelling'].includes(t.status))
                    runTask(t.id, {scheduledFor:t.nextRun}).catch(() => { });
            }
        }, 1000);
    }).catch(e => { dialog.showErrorBox('WillBuddy 启动失败', e.message); app.quit(); });
    app.on('activate', focus);
    app.on('before-quit', () => {
        genoffice?.close().catch(()=>{});
        closing = true;
        approve.cancelAll();
        toolRuntime?.browserPermissions.revoke();
        commands?.stop();
        runs?.stop();
        clearInterval(tick);
        globalShortcut.unregisterAll();
        for (const c of active.values())
            c.abort();
        browser.closeAll();
        runner?.kill();
    });
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            app.quit();
    });
}
