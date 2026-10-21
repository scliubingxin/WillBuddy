import { liveRunStates } from '../runtime/run-queue.mjs';
import { uid, nextDaily } from '../core.mjs';
import { requiredText as text } from './validation.mjs';
/** Workspace mutations preserve the existing persisted schema. */
export function createWorkspaceService({ store, active, view }) {
    const queued = (kind, id) => (store.data.runJobs || []).some(j => j.kind === kind && j.ownerId === id && liveRunStates.has(j.status));
    return {
        deleteChat: async (p) => {
            if (active.has(p.id) || queued('conversation', p.id))
                throw new Error('请先停止生成');
            store.data.chats = store.data.chats.filter(c => c.id !== p.id);
            await store.save();
            return view();
        },
        memory: async (p) => {
            if (p.remove)
                store.data.memories = store.data.memories.filter(m => m.id !== p.id);
            else {
                if (store.data.memories.length >= 100)
                    throw new Error('最多保存 100 条偏好');
                store.data.memories.unshift({ id: uid(), text: text(p.text, 2000) });
            }
            await store.save();
            return view();
        },
        agent: async (p) => {
            if (p.remove) {
                if (p.id === 'assistant')
                    throw new Error('不能删除默认助手');
                store.data.agents = store.data.agents.filter(a => a.id !== p.id);
            }
            else {
                const value = { id: p.id || uid(), name: text(p.name, 80), description: text(p.description || '自定义工作助手', 200), prompt: text(p.prompt, 10000) };
                const i = store.data.agents.findIndex(a => a.id === value.id);
                if (i < 0)
                    store.data.agents.push(value);
                else
                    store.data.agents[i] = value;
            }
            await store.save();
            return view();
        },
        task: async (p) => {
            if (p.remove) {
                if (active.has('task:' + p.id) || queued('task', p.id))
                    throw new Error('请等待任务结束');
                store.data.tasks = store.data.tasks.filter(t => t.id !== p.id);
            }
            else if (p.id) {
                if (queued('task', p.id)) throw Error('请先停止任务再修改定时设置');
                const t = store.data.tasks.find(t => t.id === p.id);
                if (!t)
                    throw new Error('任务不存在');
                t.enabled = !!p.enabled;
                t.nextRun = t.enabled ? nextDaily() : null;
            }
            else {
                if (store.data.tasks.length >= 50)
                    throw new Error('最多 50 个任务');
                store.data.tasks.unshift({ id: uid(), name: text(p.name, 100), prompt: text(p.prompt), enabled: !!p.enabled, nextRun: p.enabled ? nextDaily() : null, status: 'ready' });
            }
            await store.save();
            return view();
        },
        artifact: async (p) => {
            if (p.remove)
                store.data.artifacts = store.data.artifacts.filter(a => a.id !== p.id);
            else
                store.data.artifacts.unshift({ id: uid(), name: text(p.name, 100), text: text(p.text, 500000), time: Date.now() });
            await store.save();
            return view();
        }
    };
}
