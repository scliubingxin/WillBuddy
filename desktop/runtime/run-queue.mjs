import { createHash } from 'node:crypto';

export const liveRunStates = new Set(['queued', 'running', 'cancelling']);
export const requestFingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function runTransition(job, status, now = Date.now()) {
    const previous = job.status;
    Object.assign(job, { status, updatedAt: now, revision: (job.revision || 0) + 1 });
    job.events = [...(job.events || []), { version: 1, type: 'run.status', jobId: job.id,
        kind: job.kind, ownerId: job.ownerId, sequence: job.revision, previous, status, time: now }].slice(-50);
}

const queues = new WeakMap();
export function sharedRunQueue(options) {
    if (!queues.has(options.store)) queues.set(options.store, createRunQueue(options));
    return queues.get(options.store);
}

/** Persistent admission and lifecycle for AI runs. Workers/approval grants never survive restart. */
export function createRunQueue({ store, active, notify = () => {}, capacity = 2, timeoutMs = 120000 }) {
    store.data.runJobs ??= [];
    const pending = new Map();
    let serial = Promise.resolve(), pumping = false, stopped = false;
    const locked = fn => {
        const result = serial.then(fn);
        serial = result.catch(() => {});
        return result;
    };
    const jobs = () => store.data.runJobs;
    const announce = () => { try { notify(); } catch {} };
    async function change(entry, status, error) {
        runTransition(entry.job, status);
        if (error) entry.job.error = error;
        if (!liveRunStates.has(status)) entry.job.finishedAt = Date.now();
        await entry.onState(entry.job);
        await store.save();
        announce();
    }
    function release(entry) {
        if (active.get(entry.slotKey) === entry.controller) active.delete(entry.slotKey);
        pending.delete(entry.job.id);
        entry.resolve(structuredClone(entry.job));
    }
    async function fail(entry, error) {
        try { await change(entry, entry.controller.signal.aborted ? 'cancelled' : 'failed', entry.controller.signal.aborted ? '请求已停止或超时' : error.message); }
        catch (diskError) {
            runTransition(entry.job, 'interrupted');
            entry.job.persistenceError = diskError.message;
            try { await entry.onState(entry.job); } catch {}
            announce();
        }
        release(entry);
    }
    async function work(entry) {
        const timer = setTimeout(() => entry.controller.abort(), timeoutMs);
        try {
            entry.controller.signal.throwIfAborted();
            const result = await entry.worker(entry.controller, entry.job);
            await locked(async () => {
                const status = entry.controller.signal.aborted ? 'cancelled' : result?.status || 'completed';
                if (!['completed', 'failed', 'cancelled'].includes(status)) throw Error('无效执行终态');
                await change(entry, status, entry.controller.signal.aborted ? '请求已停止或超时' : result?.error);
                release(entry);
            });
        } catch (error) { await locked(() => fail(entry, error)); }
        finally { clearTimeout(timer); void pump(); }
    }
    async function pump() {
        if (pumping || stopped) return;
        pumping = true;
        try {
            while (!stopped && active.size < capacity) {
                const entry = await locked(async () => {
                    if (stopped || active.size >= capacity) return;
                    const next = [...pending.values()].find(e => e.accepted && e.job.status === 'queued' && !active.has(e.slotKey));
                    if (!next) return;
                    active.set(next.slotKey, next.controller); // Reserve before saving the claim.
                    next.job.executionStartedAt = Date.now();
                    try { await change(next, 'running'); }
                    catch (error) { await fail(next, error); return; }
                    return next;
                });
                if (!entry) break;
                void work(entry);
            }
        } finally { pumping = false; }
    }
    const queue = {
        lookup: id => jobs().find(j => j.id === id),
        hasOwner: (kind, id) => [...pending.values()].some(e => e.job.kind === kind && e.job.ownerId === id),
        hasPending: () => pending.size > 0,
        pump,
        submit(spec, worker, onState = () => {}) {
            if (stopped) return Promise.reject(Error('应用正在退出'));
            if (!spec || typeof spec.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(spec.id)
                || !['conversation', 'task'].includes(spec.kind) || (typeof spec.ownerId !== 'string' || !spec.ownerId.trim() || spec.ownerId.length > 100)
                || typeof spec.fingerprint !== 'string') return Promise.reject(Error('无效执行请求'));
            const old = queue.lookup(spec.id);
            if (old) {
                if (old.kind !== spec.kind || old.ownerId !== spec.ownerId || old.fingerprint !== spec.fingerprint)
                    return Promise.reject(Error('请求标识已用于不同任务'));
                return pending.get(old.id)?.done || Promise.resolve(structuredClone(old));
            }
            if (queue.hasOwner(spec.kind, spec.ownerId)) return Promise.reject(Error('请求正在执行或排队，请先停止'));
            if (pending.size >= 20) return Promise.reject(Error('待执行模型任务已满（20 条）'));
            let resolve;
            const done = new Promise(r => { resolve = r; });
            const job = { id: spec.id, kind: spec.kind, ownerId: spec.ownerId,
                fingerprint: spec.fingerprint, label: String(spec.label || '').slice(0, 100),
                createdAt: Date.now(), revision: 0, events: [] };
            const slotKey = spec.kind === 'task' ? 'task:' + spec.ownerId : spec.ownerId;
            const entry = { job, slotKey, worker, onState, controller: new AbortController(), resolve, done };
            // Reserve owner synchronously, including while the first disk write is pending.
            pending.set(job.id, entry);
            jobs().unshift(job);
            // Bounded journal/idempotency window; never evict live entries.
            store.data.runJobs = jobs().filter((j, i) => i < 200 || pending.has(j.id));
            void locked(async () => {
                try {
                    await change(entry, 'queued');
                    entry.accepted = true;
                } catch (error) { await fail(entry, error); }
            }).then(() => pump());
            return done;
        },
        async cancel(id) {
            const entry = pending.get(id);
            if (!entry) return queue.lookup(id) ? structuredClone(queue.lookup(id)) : null;
            entry.controller.abort();
            return locked(async () => {
                if (!pending.has(id)) return structuredClone(entry.job);
                if (entry.job.status === 'queued') {
                    try { await change(entry, 'cancelled'); }
                    finally { release(entry); }
                } else await change(entry, 'cancelling');
                return structuredClone(entry.job);
            });
        },
        cancelOwner(kind, id) {
            const entry = [...pending.values()].find(e => e.job.kind === kind && e.job.ownerId === id);
            return entry ? queue.cancel(entry.job.id) : Promise.resolve(null);
        },
        stop() { stopped = true; for (const entry of pending.values()) void queue.cancel(entry.job.id).catch(() => {}); },
        async idle() { await serial; await Promise.all([...pending.values()].map(e => e.done)); await serial; }
    };
    return queue;
}
