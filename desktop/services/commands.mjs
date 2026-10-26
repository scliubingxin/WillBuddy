import {projectServicePolicy,checkServicePolicy} from '../runtime/project-service-policy.mjs';
import {projectDiagnostic} from '../runtime/project-diagnostics.mjs';
import { prepareCommand } from '../runtime/command.mjs';

export const liveCommandStates = new Set(['queued', 'pending_approval', 'running', 'cancelling']);
const retryable = new Set(['paused', 'interrupted', 'failed', 'cancelled', 'denied', 'timed_out', 'output_limit', 'inherited_pipes']);

// Versioned, persisted state transitions. These events carry no command secrets/output.
export function commandTransition(job, status, now = Date.now()) {
    const previous = job.status;
    job.status = status;
    job.updatedAt = now;
    job.revision = (job.revision || 0) + 1;
    job.events = [...(job.events || []), { version: 1, type: 'command.status', jobId: job.id,
        sequence: job.revision, previous, status, time: now }].slice(-50);
}

function request(p) {
    if (!p || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(p.id))
        throw new Error('命令需要稳定且有效的请求标识');
    if (typeof p.folderId !== 'string' || typeof (p.relative ?? '') !== 'string')
        throw new Error('请选择授权工作目录');
    return { executable: p.executable, args: p.args, folderId: p.folderId,
        relative: p.relative ?? '', timeoutMs: p.timeoutMs ?? 120000 };
}

/** Durable manual CLI queue. An app restart never starts an old job by itself. */
export function createCommandService({ store, active, executeTool, notify = () => {}, capacity = 2 }) {
    store.data.commandJobs ??= [];
    let serial = Promise.resolve(), pumping = false, stopped = false;
    const workers = new Set(), servicePolicies=new Map();
    const locked = fn => {
        const result = serial.then(fn);
        serial = result.catch(() => {});
        return result;
    };
    const find = id => {
        const job = store.data.commandJobs.find(j => j.id === id);
        if (!job) throw new Error('命令记录不存在');
        return job;
    };
    const persist = async () => { await store.save(); notify(); };

    async function enqueue(p, retryOf, expectedRevision, servicePolicy) {
        const args = request(p), fingerprint = JSON.stringify(servicePolicy?{args,servicePolicy}:args);
        const job = await locked(async () => {
            if (stopped) throw new Error('应用正在退出');
            const old = store.data.commandJobs.find(j => j.id === p.id);
            if (old) {
                if (old.fingerprint !== fingerprint || old.retryOf !== retryOf)
                    throw new Error('请求标识已用于不同命令，不能覆盖');
                return old;
            }
            const parent = retryOf ? find(retryOf) : null;
            if (parent && (!retryable.has(parent.status) || parent.revision !== expectedRevision || parent.retryId))
                throw new Error('命令状态已变化或已有重试，请刷新后检查');
            if (store.data.commandJobs.length >= 200) throw new Error('命令记录已满，请清理已结束的队列记录');
            if (store.data.commandJobs.filter(j => liveCommandStates.has(j.status)).length >= 20)
                throw new Error('待执行命令已满（20 条）');
            await prepareCommand(store.data.folders, args);
            if(servicePolicy)checkServicePolicy(servicePolicy,args);
            const next = { id: p.id, kind: servicePolicy?'project_service':'cli',...(servicePolicy?{projectService:servicePolicy}:{}), request: structuredClone(args), fingerprint,
                retryOf, createdAt: Date.now(), revision: 0, events: [] };
            commandTransition(next, 'queued');
            store.data.commandJobs.unshift(next);
            if (parent) parent.retryId = next.id;
            try { await persist(); }
            catch (error) {
                store.data.commandJobs = store.data.commandJobs.filter(j => j !== next);
                if (parent) delete parent.retryId;
                throw error;
            }
            if(servicePolicy)servicePolicies.set(next.id,servicePolicy);
            return next;
        });
        // Return acceptance without waiting for approval/process completion.
        const snapshot = structuredClone(job);
        void pump();
        return snapshot;
    }

    async function work(job, controller) {
        try {
            controller.signal.throwIfAborted();
            const result = await executeTool('cli_execute', structuredClone(job.request), controller.signal, {
                jobId: job.id,
                projectService:servicePolicies.get(job.id),
                onRecord: record => locked(async () => {
                    job.executionId = record.id;
                    if(record.startedAt){job.startedAt=record.startedAt;if(job.projectService)job.deadlineAt=record.startedAt+job.projectService.maxDurationMs;}
                    if (job.status !== 'cancelling') commandTransition(job, record.status);
                    await persist();
                })
            });
            await locked(async () => {
                // stdout/stderr live in the linked audit, not duplicated in workspace.json.
                job.result = Object.fromEntries(['status', 'exitCode', 'signal', 'elapsedMs', 'truncated', 'outputBytes', 'error']
                    .filter(key => result[key] !== undefined).map(key => [key, result[key]]));
                if(job.request.folderId.startsWith('project:'))job.diagnostic=projectDiagnostic(result);
                commandTransition(job, result.status || 'failed');
                job.finishedAt = Date.now();
                await persist();
            });
        } catch (error) {
            await locked(async () => {
                // A failure after claim can have side effects; a retry always needs approval.
                commandTransition(job, controller.signal.aborted ? 'cancelled' : 'interrupted');
                job.error = error.message;
                if(job.request.folderId.startsWith('project:'))job.diagnostic=projectDiagnostic({status:job.status,error:error.message});
                job.finishedAt = Date.now();
                await persist();
            }).catch(error => { job.persistenceError = error.message; notify(); });
        } finally {
            active.delete('cli:' + job.id);
            servicePolicies.delete(job.id);
            void pump();
        }
    }

    async function pump() {
        if (pumping || stopped) return;
        pumping = true;
        try {
            while (!stopped && active.size < capacity) {
                const claimed = await locked(async () => {
                    if (stopped || active.size >= capacity) return;
                    // Oldest accepted first; only jobs accepted in this running instance are queued.
                    const serviceActive=store.data.commandJobs.some(j=>j.kind==='project_service'&&active.has('cli:'+j.id));
                    const job = store.data.commandJobs.slice().reverse().find(j => j.status === 'queued' && (j.kind!=='project_service'||(!serviceActive&&servicePolicies.has(j.id))));
                    if (!job) return;
                    const controller = new AbortController();
                    active.set('cli:' + job.id, controller); // reserve before asynchronous persistence
                    commandTransition(job, 'pending_approval');
                    try { await persist(); }
                    catch (error) {
                        active.delete('cli:' + job.id);
                        commandTransition(job, 'interrupted');
                        job.error = error.message;
                        notify();
                        return;
                    }
                    return { job, controller };
                });
                if (!claimed) break;
                const worker = work(claimed.job, claimed.controller);
                workers.add(worker);
                void worker.finally(() => workers.delete(worker));
            }
        } finally { pumping = false; }
    }

    return {
        enqueue:p=>enqueue(p),
        enqueueProjectService:(p,{projectId,stepId})=>enqueue(p,undefined,undefined,projectServicePolicy(projectId,stepId)),
        pump,
        async cancel(id) {
            return locked(async () => {
                const job = find(id);
                if (!liveCommandStates.has(job.status)) return structuredClone(job);
                const controller = active.get('cli:' + id);
                commandTransition(job, controller ? 'cancelling' : 'cancelled');
                if (!controller){job.finishedAt = Date.now();servicePolicies.delete(id);}
                // Cancellation takes effect even if persisting its status fails.
                controller?.abort();
                await persist();
                return structuredClone(job);
            });
        },
        async retry(p) {
            const old = find(p.retryOf);
            if(old.kind==='project_service')throw Error('开发服务请从代码项目页重新确认启动，不复用旧服务审批');
            if (!retryable.has(old.status)) throw new Error('只能重试失败、暂停或中断的命令');
            if (p.revision !== old.revision) throw new Error('命令状态已变化，请刷新后重试');
            return enqueue({ ...structuredClone(old.request), id: p.id }, old.id, p.revision);
        },
        async forget(id) {
            return locked(async () => {
                const job = find(id);
                if (liveCommandStates.has(job.status)) throw new Error('请先停止命令');
                store.data.commandJobs = store.data.commandJobs.filter(j => j !== job);
                try { await persist(); }
                catch (error) { store.data.commandJobs.unshift(job); throw error; }
                servicePolicies.delete(id);
                // Audit executions remain independent; forgetting also removes this idempotency key.
                return true;
            });
        },
        stop() { stopped = true; for (const [id, controller] of active) if (id.startsWith('cli:')) controller.abort(); },
        async idle() { await serial; await Promise.all([...workers]); await serial; }
    };
}
