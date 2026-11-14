import {createPdfImportControl} from './main/pdf-import-control.mjs';
import {openOcrSource} from './services/ocr-source-open.mjs';
import {previewOcrSource} from './services/ocr-source-preview.mjs';
import {importChatPdf,validatePdfRange} from './services/pdf-chat-import.mjs';
import {bundledPdfOcrTools} from './runtime/pdf-ocr.mjs';
import {exportDocumentPdf} from './main/pdf-export.mjs';
import {createOfficeWorkspace} from './services/office-workspace.mjs';
import {createOfficeChat} from './services/office-chat.mjs';
import {createOfficeWindows} from './main/office-windows.mjs';
import {bundledExecutable,runtimeRoot} from './runtime/bundled-runtime.mjs';
import {createLibreOffice} from './services/libreoffice.mjs';
import {resolveDocumentSelection} from './services/document-selection.mjs';
import {selectionPatches} from './runtime/word-selection.mjs';
import {capabilityPresets} from './runtime/capability-presets.mjs';
import {createCodeProjects} from './services/code-projects.mjs';
import {createLegacyModelSettings} from './services/legacy-model-settings.mjs';
import {createModelService} from './services/models.mjs';
import {createModelSecretCodec} from './main/model-secrets.mjs';
import {parseChatUpload} from './runtime/chat-archive.mjs';
import {sharedKnowledgeIndex} from './services/knowledge-index.mjs';
import {sharedVectorIndex} from './services/knowledge-vector.mjs';
import {createMcpSecretCodec} from './main/mcp-secrets.mjs';
import {mcpViews} from './services/mcp-access.mjs';
import {createCapabilityLibrary,skillViews} from './services/capability-library.mjs';
import {createSkillImporter} from './main/skill-files.mjs';
import {readFilePreview} from './services/file-preview.mjs';
import {protectPreviewNavigation} from './main/preview-navigation.mjs';
import {createImageService,imageViews} from './services/images.mjs';
import {createImageImporter,normalizeNativeImage} from './main/image-files.mjs';
import {previewScheme,preparePreviewProtocol} from './main/preview-protocol.mjs';
import {createConversionBrowser} from './main/conversion-browser.mjs';
import {createDocumentConverter} from './runtime/document-converter.mjs';
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
import { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu, safeStorage, shell, Notification, session, protocol, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { ToolRuntime } from './runtime/tools.mjs';
import { chooseUserDataDirectory } from './runtime/identity.mjs';
import { BrowserService } from './runtime/browser.mjs';
import { Store, uid, listGranted, readGranted } from './core.mjs';
protocol.registerSchemesAsPrivileged([previewScheme]);
const here = path.dirname(fileURLToPath(import.meta.url));
let win, store, sessionKey = '', runner, closing = false, tick, shortcutReady = false;
const active = new Map();
const browser = new BrowserService({ BrowserWindow, shell });
const notifyRuntime = () => {
    if (win && !win.isDestroyed())
        win.webContents.send('actwill:runtime');
};
const approve = createApprover({ dialog, getWindow: () => win, focus });
let toolRuntime, genoffice, models, projects, libreoffice, officeWindows;
const pdfImports = createPdfImportControl({notify: notifyRuntime});
const executeTool = (...args) => toolRuntime.execute(...args);
const view = () => { const { encryptedKey, ...settings } = store.data.settings; const {knowledgeIndexes,knowledgeVectorIndexes,modelProfiles,codeProjects,...publicData}=store.data; return { ...publicData, pdfImport: pdfImports.view(), officeNative:!!libreoffice,officeWorkspace:!!officeWindows,officeEdits:libreoffice?.sessions()||[], capabilityPresets:capabilityPresets(), codeProjects:projects?.view()||[], modelProfiles:models?.view()||[], mcpConnections:mcpViews(store.data), documents:documentViews(store.data), skillPackages:skillViews(store.data), imageAttachments:imageViews(store.data), settings: { ...settings, hasKey: !!sessionKey || !!encryptedKey, keySaved: !!encryptedKey, secureStorage: safeStorage.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== 'basic_text' }, browsers: browser.list(), desktop: { platform: process.platform, shortcutReady } }; };
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
    protectPreviewNavigation(win.webContents);
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
app.setAboutPanelOptions({ applicationName: 'WillBuddy', applicationVersion: app.getVersion() });
if (!app.requestSingleInstanceLock())
    app.quit();
else {
    app.on('second-instance', focus);
    app.whenReady().then(async () => {
        protocol.handle(previewScheme.scheme,await preparePreviewProtocol(path.join(here,"src/preview")));
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
        const convertDocument=createDocumentConverter({createDriver:signal=>createConversionBrowser({BrowserWindow,session,signal})});
        toolRuntime = new ToolRuntime({ store, browser, approve, notify: notifyRuntime, convertDocument,beforeCli:(args,policy)=>projects?.validate(args,policy) });
        const officeRuntime=async()=>({python:await bundledExecutable('python'),officeDirectory:path.dirname(await bundledExecutable('office'))});
        if(runtimeRoot()){await bundledExecutable('python');await bundledExecutable('office');libreoffice=createLibreOffice({documents:toolRuntime.documents,directory:path.join(store.dir,'office-runtime'),executable:()=>bundledExecutable('office'),pdfRuntime:officeRuntime,approve,notify:notifyRuntime,previewPoolEnabled:store.data.settings.officePreviewPool===true});}
        genoffice=createGenOfficeBridge({documents:toolRuntime.documents,approve});
        recoverInterruptedWork(store.data);
        commands = createCommandService({ store, active, executeTool, notify: notifyRuntime });
        projects=createCodeProjects({store,directory:path.join(app.getPath('userData'),'code-projects'),approve,commands});
        register('projectRun',p=>projects.run(p.id,p.stepId,{service:p.service===true}));
        register('projectImport',async()=>{const result=await dialog.showOpenDialog(win,{title:'导入代码项目ZIP（不自动执行）',properties:['openFile'],filters:[{name:'代码项目ZIP',extensions:['zip']}]});if(result.canceled)return false;const source=result.filePaths?.[0];if(!source)throw Error('未选择代码包');return projects.importArchive(path.basename(source),await readDocumentSource(source,{noFollow:true,maxBytes:32*1024*1024,label:'代码ZIP'}));});
        runs = sharedRunQueue({store, active, notify:notifyRuntime});
        const mcpSecrets=createMcpSecretCodec(safeStorage);
        models=createModelService({store,secrets:createModelSecretCodec(safeStorage),legacyKey:key});
        register('modelProfile',async p=>{await models.update(p);return view();});
        app.on('before-quit',()=>models.close());
        const images=createImageService({store,decode:bytes=>normalizeNativeImage(nativeImage,bytes)});
        register('imageImport',createImageImporter({dialog,getWindow:()=>win,nativeImage,images}));
        register('imagePreview',p=>images.preview(p.id));
        register('imageRemove',async p=>{await images.remove(p.id);return view();});
        conversations = createConversationService({ approve, models, secrets:mcpSecrets, images, queue:runs, store, active, key, view, executeTool, releaseToolGrants:id=>toolRuntime.releaseGrants(id), notify: notifyRuntime,notifyStream:event=>{if(win&&!win.isDestroyed())win.webContents.send('actwill:stream',event);} });
        if(runtimeRoot()){
            const kit=createOfficeWorkspace({documents:toolRuntime.documents,directory:path.join(store.dir,'office-kit'),runtime:officeRuntime,approve,notify:notifyRuntime,audit:async event=>{const prev=store.data.executions;store.data.executions=[event,...prev.filter(e=>e.id!==event.id)].slice(0,300);try{await store.save();}catch(e){store.data.executions=prev;throw e;}notifyRuntime();}});
            const officeChat=createOfficeChat({store,kit,models,key,approve,queue:runs,notify:notifyRuntime});
            officeWindows=createOfficeWindows({BrowserWindow,ipcMain,here,kit,chat:officeChat,models,documents:toolRuntime.documents,dialog});
            register('officeOpen',p=>officeWindows.open(p.id,p.revision));
        }
        tasks = createTaskService({ models, queue:runs, notify:notifyRuntime, store, active, key, view, notifyCompleted: task => {
                if (Notification.isSupported())
                    new Notification({ title: 'WillBuddy · 任务完成', body: task.name }).show();
            } });
        await store.save();
        Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'WillBuddy', submenu: [{ label: '显示工作台', click: focus }, { label: '取消所有操作确认', accelerator: 'CommandOrControl+Shift+Escape', click: () => approve.cancelAll() }, { label: '撤销浏览器任务授权', click: () => { toolRuntime.revokeGrants(); approve.cancelAll(); } }, { role: 'about' }, { type: 'separator' }, { role: 'quit' }] }, { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }, { label: '视图', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] }]));
        const workspace = createWorkspaceService({ store, active, view });
        for (const [name, handler] of Object.entries(workspace))
            register(name, handler);
        const capabilityLibrary=createCapabilityLibrary({store,approve,secrets:mcpSecrets,notify:notifyRuntime});
        const importSkill=createSkillImporter({dialog,getWindow:()=>win,library:capabilityLibrary});
        app.on('before-quit',()=>capabilityLibrary.close());
        register('skillImport',async()=>{const imported=await importSkill();return {imported,state:view()};});
        register('skillPreset',async p=>{const imported=await capabilityLibrary.installPreset(p.id);return {imported,state:view()};});
        register('skillRead',p=>capabilityLibrary.readSkill(p.id));
        register('skillUpdate',async p=>{await capabilityLibrary.skill(p);return view();});
        register('mcpConnection',async p=>{const saved=await capabilityLibrary.connection(p);return {saved,state:view()};});
        register('mcpTest',async p=>{const result=await capabilityLibrary.probe(p.id);return {result,state:view()};});
        register('mcpCancelTest',p=>{capabilityLibrary.cancelProbe(p.id);return true;});
        register('clearKnowledgeIndex',async()=>{await sharedVectorIndex(store).clear();await sharedKnowledgeIndex(store).clear();return true;});
        register('state', () => view());
        const updateLegacySettings=createLegacyModelSettings({store,safeStorage,getSessionKey:()=>sessionKey,setSessionKey:value=>{sessionKey=value;},isBusy:()=>active.size>0||runs.hasPending()});
        register('settings',async p=>{await updateLegacySettings(p);return view();});
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
        register('previewFile',p=>readFilePreview(store,p));
        register('readFile', p => readGranted(store.data.folders, p.folderId, p.relative));
        register('chat', p => conversations.run(p));
        register('revokeBrowserApprovals', () => { toolRuntime.revokeGrants(); approve.cancelAll(); return true; });
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
            if (!['document_create','document_read','document_edit','document_convert','document_write','document_patch','document_insert_image'].includes(operation)) throw Error('未知文档操作');
            return executeTool(operation,args);
        });
        register('genofficeOpen', p => genoffice.open(p.id,p.revision));
        register('genofficeImport', p => genoffice.importEdited(p.id));
        register('documentRichEditor', p => toolRuntime.documents.richEditor(p.id));
        register('documentSelection', p=>resolveDocumentSelection(store,p));
        register('documentSelectionReplace', p=>{const selected=resolveDocumentSelection(store,p);return toolRuntime.documents.updateEditor(selected.documentId,selected.revision,{patches:selectionPatches(selected,p.replacement)},approve);});
        register('officeEdit',p=>{if(!libreoffice)throw Error('源码开发环境没有内置LibreOffice');return libreoffice.edit(p.id,p.revision);});
        register('officeCollect',p=>{if(!libreoffice)throw Error('源码开发环境没有内置LibreOffice');return libreoffice.collect(p.id);});
        register('documentPreview',p=>libreoffice?libreoffice.preview(p.id,p.revision):toolRuntime.documents.preview(p.id,p.revision));
        register('documentEditor', p => toolRuntime.documents.editor(p.id,p.mode));
        register('documentSaveEditor', p => toolRuntime.documents.updateEditor(p.id,p.revision,p.patch,approve));
        register('documentRead', p => toolRuntime.documents.read(p.id));
        register('documentDelete', p => toolRuntime.documents.remove(p.id));
        register('cancelPdfImport', p => pdfImports.cancel(p.id));
        register('previewOcrSource', p => previewOcrSource({store,reference:p,directory:store.dir,choose:async source=>{
            const r=await dialog.showOpenDialog(win,{title:'选择原PDF以定位OCR来源',properties:['openFile'],filters:[{name:'PDF',extensions:['pdf']}]});
            return r.canceled?null:r.filePaths?.length===1?r.filePaths[0]:null;
        },tools:bundledPdfOcrTools,read:f=>readDocumentSource(f,{noFollow:true,maxBytes:16*1024*1024,label:'PDF'}),readImage:f=>readDocumentSource(f,{noFollow:true,maxBytes:4*1024*1024,label:'页面图片'})}));
        register('openOcrSource', p => openOcrSource({store,reference:p,choose:async source=>{
            const r=await dialog.showOpenDialog(win,{title:'选择原PDF以核对OCR来源（第 '+source.pages.join('、')+' 页）',properties:['openFile'],filters:[{name:'PDF',extensions:['pdf']}]});
            return r.canceled?null:r.filePaths?.length===1?r.filePaths[0]:null;
        },read:f=>readDocumentSource(f,{noFollow:true,maxBytes:16*1024*1024,label:'PDF'}),open:f=>shell.openPath(f)}));
        register('chatAttachmentImport', async p => {
            const range=p.pdfRange===undefined?undefined:validatePdfRange(p.pdfRange);
            const result=await dialog.showOpenDialog(win,{title:'上传文档、PDF或ZIP（发送时正文交给当前模型）',properties:['openFile'],filters:[{name:'文档 / PDF / ZIP',extensions:range?['pdf']:['pdf','zip','docx','xlsx','pptx','md','txt','csv','json','html','js','ts','py','yaml','yml','css','sql','java','go','rs','sh']}]});
            if(result.canceled)return false;
            if(result.filePaths?.length!==1)throw Error('每次选择一个文档或ZIP');
            const source=result.filePaths[0];
            if(range&&!source.toLowerCase().endsWith('.pdf'))throw Error('指定页识别仅支持PDF');
            if(source.toLowerCase().endsWith('.pdf')){const job=pdfImports.start();try{return await importChatPdf({file:source,range,directory:store.dir,signal:job.signal,onProgress:progress=>pdfImports.progress(job,progress),documents:toolRuntime.documents,tools:bundledPdfOcrTools,read:f=>readDocumentSource(f,{noFollow:true,maxBytes:16*1024*1024,label:'PDF'}),confirm:async({name,startPage,endPage})=>{const rangeText=endPage==='first5'?'前5页（不足5页则全部识别）':'第 '+startPage+'–'+endPage+' 页';const choice=await dialog.showMessageBox(win,{type:'question',title:'本机识别 PDF 附件',message:'识别 '+name.replace(/[\u0000-\u001f]/g,' ').slice(0,150)+' 的'+rangeText,detail:'仅在本机识别；发送后识别文字会交给当前模型。所选范围之外的页面不会识别。OCR可能有误，请核对原文。',buttons:['中英混合','中文','英文','取消'],defaultId:3,cancelId:3,noLink:true,signal:AbortSignal.any([job.signal,AbortSignal.timeout(60000)])});return ['chi_sim+eng','chi_sim','eng',null][choice.response]??null;}});}finally{pdfImports.finish(job);}}
            const bytes=await readDocumentSource(source,{noFollow:true,maxBytes:source.toLowerCase().endsWith(".zip")?32*1024*1024:4*1024*1024,label:source.toLowerCase().endsWith(".zip")?"ZIP压缩包":"文档"});
            let project,projectError;if(source.toLowerCase().endsWith('.zip')){try{project=await projects.importArchive(path.basename(source),bytes);}catch(e){projectError=e.message;}}
            const parsed=parseChatUpload(path.basename(source),bytes),documents=await toolRuntime.documents.importBatch(parsed.items);
            return {project,projectError,attachments:documents.map((d,i)=>({documentId:d.id,revision:d.revision,sha256:d.sha256,name:d.name,text:d.text,archive:parsed.items[i].archive,entryPath:parsed.items[i].entryPath})),skipped:parsed.skipped};
        });
        register('documentImport', async () => {
            const result=await dialog.showOpenDialog(win,{title:'导入可编辑文档（原文件不变）',properties:['openFile'],filters:[{name:'文档',extensions:['docx','xlsx','pptx','md','html']}]});
            if(result.canceled)return false;
            const source=result.filePaths[0],bytes=await readDocumentSource(source);
            return toolRuntime.documents.importFile(path.basename(source,path.extname(source)),path.extname(source).slice(1).toLowerCase(),bytes);
        });
        register('documentExportPdf',async p=>exportDocumentPdf({id:p.id,revision:p.revision,documents:toolRuntime.documents,office:libreoffice,chooseDestination:async defaultPath=>{const result=await dialog.showSaveDialog(win,{title:'导出为 PDF',defaultPath,filters:[{name:'PDF',extensions:['pdf']}]});return result.canceled?null:result.filePath;},writeDestination:writeDocumentDestination}));
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
    app.on('before-quit', (event) => {
        pdfImports.close();
        if(officeWindows?.hasUnsaved()){event.preventDefault();dialog.showMessageBoxSync({type:'warning',message:'WillBuddy Office有尚未保存的修改',detail:'请在文档窗口重试保存后退出；不会丢弃未保存内容。'});return;}
        if(libreoffice?.sessions().length){const choice=dialog.showMessageBoxSync(win,{type:'warning',message:'有LibreOffice编辑副本尚未收回',detail:'请先保存并退出内置编辑窗口，再返回收回新版本。放弃退出会清理尚未回收的副本。',buttons:['返回处理','放弃副本并退出'],defaultId:0,cancelId:0});if(choice===0){event.preventDefault();return;}}
        officeWindows?.close().catch(()=>{});
        libreoffice?.close().catch(()=>{});
        genoffice?.close().catch(()=>{});
        closing = true;
        approve.cancelAll();
        toolRuntime?.revokeGrants();
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
