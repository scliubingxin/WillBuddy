import {checkServicePolicy} from './project-service-policy.mjs';
import {createBrowserPermissions} from './browser-permissions.mjs';
import { createDocumentService } from '../services/documents.mjs';
import { uid } from '../core.mjs';
import { prepareCommand, runCommand, commandJson } from './command.mjs';

export class ToolRuntime {
    constructor({ store, browser, approve, notify = () => {}, convertDocument, beforeCli }) {
        Object.assign(this, { store, browser, approve, notify, beforeCli });
        this.documents = createDocumentService({store,notify,convertDocument});
        this.browserPermissions = createBrowserPermissions();
    }

    async execute(name, args, signal, { chatId, runId, jobId, onRecord, projectService, manual = false } = {}) {
        const auditArgs = structuredClone(args);
        if (name.startsWith('document_')) { delete auditArgs.content; delete auditArgs.html; delete auditArgs.replacements; delete auditArgs.cells; delete auditArgs.patches; auditArgs.note='文档正文/修改内容不写入执行审计'; }
        if (name === 'browser_fill' && 'text' in auditArgs) auditArgs.text = '[输入文本已隐藏]';
        const record = { id: uid(), tool: name, args: auditArgs, chatId, runId, jobId,
            time: Date.now(), status: 'pending_approval' };
        this.store.data.executions.unshift(record);
        // Keep audits for live queue jobs even when many browser operations are recorded.
        const live = new Set((this.store.data.commandJobs || []).filter(j => ['queued', 'pending_approval', 'running', 'cancelling'].includes(j.status)).map(j => j.id));
        this.store.data.executions = this.store.data.executions.filter((r, i) => i < 200 || live.has(r.jobId));
        let prepared, documentToken;
        try {
            await this.store.save();
            await onRecord?.(record);
            this.notify();
            signal?.throwIfAborted();
            if (!['cli_execute', 'browser_open', 'browser_read', 'browser_snapshot', 'browser_click', 'browser_fill', 'document_create', 'document_read', 'document_edit', 'document_convert', 'document_write', 'document_patch','document_insert_image'].includes(name)) throw new Error('未知工具');
            let command, readScope;
            if (['browser_read', 'browser_snapshot'].includes(name)) {
                readScope = this.browser.list().find(w => w.id === args.id);
                if (!readScope) throw new Error('浏览器窗口已关闭或不存在');
                record.receipt = { operation: name, ...readScope };
            }
            if (name === 'cli_execute') { projectService=checkServicePolicy(projectService,args);command = await prepareCommand(this.store.data.folders, args); if(projectService){command.timeoutMs=projectService.maxDurationMs;record.projectService=projectService;}record.command = command; }
            if (['browser_click', 'browser_fill'].includes(name)) { prepared = await this.browser.prepareAction(name, args, signal); record.receipt = this.browser.receipt(prepared); }
            if (name.startsWith('document_')) documentToken = await this.documents.prepare(name,args,signal);
            const title = documentToken ? '文档操作 · ' + name : name === 'cli_execute' ? (projectService?'启动项目开发服务':'执行本机 CLI') : name === 'browser_read' ? '读取网页内容' : name === 'browser_snapshot' ? '检查网页元素' : name === 'browser_click' ? '点击网页元素' : name === 'browser_fill' ? '填写网页文本框' : '打开浏览器';
            const detail = documentToken ? documentToken.detail : prepared ? JSON.stringify(record.receipt, null, 2) + (name === 'browser_fill' ? '\n将填写（不自动提交）：\n' + prepared.inputText : '\n点击可能触发网页业务操作，请核对网址与目标。')
                : name === 'cli_execute' ? JSON.stringify(command, null, 2) + '\nCLI 会以当前账号权限运行，可访问工作目录以外的文件，不是文件夹沙箱。' + (projectService?'\n开发服务最长30分钟；日志保留最近尾部，退出/停止会终止进程；不表示业务就绪。':'') + (chatId ? '\nstdout/stderr 将发给当前模型。' : '')
                : readScope ? JSON.stringify(readScope, null, 2) + '\n将读取当前页正文；对话发起的读取会将正文发给模型。' : String(args.url);
            const browserScope = this.browserPermissions.scope(name,args,{runId,readScope,prepared});
            const remembered = this.browserPermissions.has(browserScope);
            const decision = (manual && name === 'browser_open') || remembered ? true
                : await this.approve(title,detail,signal,{browserScope});
            const allowed = decision === true || (browserScope && decision?.allowed === true);
            if (!allowed) {
                record.status = 'denied';
                record.result = {status:'denied',message:'用户拒绝该操作，不得声称执行成功'};
                return record.result;
            }
            this.browserPermissions.check(browserScope);
            if(browserScope && decision?.browserTask === true) this.browserPermissions.allow(browserScope);
            record.authorization = remembered ? 'browser_task_origin' : browserScope && decision?.browserTask ? 'browser_task_origin_granted' : 'once';
            if(browserScope) record.authorizationScope = {runId:browserScope.runId,origin:browserScope.origin};
            signal?.throwIfAborted();
            if (readScope && this.browser.list().find(w => w.id === args.id)?.url !== readScope.url) throw new Error('审批期间网页地址发生变化，请重新确认');
            record.status = 'running';
            record.startedAt=Date.now();
            await this.store.save();
            await onRecord?.(record); // A durable queue claim must succeed before any side effect.
            signal?.throwIfAborted();
            this.browserPermissions.check(browserScope);
            if (readScope && this.browser.list().find(w => w.id === args.id)?.url !== readScope.url) throw Error('网页已变化，请重新确认');
            this.notify();
            let result;
            if (documentToken) result = await this.documents.perform(documentToken,signal);
            else if (name === 'cli_execute') {
                await this.beforeCli?.(args,projectService);
                const checked = await prepareCommand(this.store.data.folders, args);
                if (checked.cwd !== command.cwd || checked.executable !== command.executable) throw new Error('工作目录或程序路径在审批期间发生变化，请重新执行');
                if(projectService)checked.timeoutMs=projectService.maxDurationMs;
                const persistence = new AbortController();
                const commandSignal = signal ? AbortSignal.any([signal, persistence.signal]) : persistence.signal;
                let streamed = 0, lastSaved = 0, checkpoint = Promise.resolve(), diskError;
                result = await runCommand(checked, { signal: commandSignal,...(projectService?{outputMode:'tail',maxBytes:65536}:{}), onOutput: chunk => {
                    const part = projectService?chunk.text:chunk.text.slice(0, Math.max(0, 50000 - streamed));
                    streamed += part.length;
                    record.partial = ((record.partial || '') + part).slice(projectService?-50000:0);
                    if(projectService)record.logPolicy='最近50000字符；结果stdout/stderr合计最近64KiB';
                    const now = Date.now(),publish=now-lastSaved>=500;
                    if (publish) {
                        lastSaved = now;
                        checkpoint = this.store.save().catch(error => { diskError = error; persistence.abort(); });
                    }
                    if(!projectService||publish)this.notify();
                } });
                await checkpoint;
                if (diskError) throw diskError;
                delete record.partial;
                if(args.args.includes("--json")&&!result.truncated){const data=commandJson(result.stdout);if(data!==undefined)result.structuredOutput=data;}
            } else if (name === 'browser_open') result = await this.browser.open(args.url, args.external === true, signal);
            else if (name === 'browser_read') result = await this.browser.read(args.id, signal);
            else if (name === 'browser_snapshot') result = await this.browser.snapshot(args.id, signal);
            else if (prepared) result = await this.browser.perform(prepared, signal);
            else throw new Error('未知工具');
            record.result = documentToken && result.document ? {...result,document:(( {text,history,editableHtml,wordEditing,spreadsheetEditing,...rest})=>rest)(result.document)} : result;
            record.status = result.status || 'succeeded';
            return result;
        } catch (error) {
            record.status = signal?.aborted ? 'cancelled' : 'failed';
            record.result = { status: record.status, error: error.message };
            if (signal?.aborted) throw error;
            return record.result;
        } finally {
            if (prepared) this.browser.discard(prepared);
            record.finishedAt = Date.now();
            this.store.log('工具执行 · ' + record.status, name);
            await this.store.save();
            this.notify();
        }
    }
}
