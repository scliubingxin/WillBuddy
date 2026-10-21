import { complete, uid, nextDaily } from '../core.mjs';
/** Scheduled work service; platform notifications and secrets are injected. */
export function createTaskService({ store, active, key, view, notifyCompleted = () => { }, request = complete }) {
    async function run(id) {
        const task = store.data.tasks.find(t => t.id === id);
        if (!task)
            throw new Error('任务不存在');
        if (task.status === 'running')
            throw new Error('任务正在执行');
        if (active.size >= 2)
            throw new Error('已有两个任务正在执行，请稍后再试');
        task.status = 'running';
        task.error = '';
        task.lastRun = Date.now();
        task.nextRun = task.enabled ? nextDaily() : null;
        const controller = new AbortController();
        active.set('task:' + id, controller);
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
            await store.save();
            controller.signal.throwIfAborted();
            const result = await request(store.data.settings, key(), [{ role: 'system', content: '你是 WillBuddy 定时工作助手。仅根据任务描述输出结果。没有联网或本机工具，不能假装查询了实时数据。' }, { role: 'user', content: task.prompt }], controller.signal);
            task.status = 'done';
            task.result = result.text;
            store.data.artifacts.unshift({ id: uid(), name: task.name, text: result.text, time: Date.now() });
            store.log('任务已完成', task.name);
            notifyCompleted(task);
        }
        catch (e) {
            task.status = 'failed';
            task.error = e.name === 'AbortError' ? '请求超时或已取消' : e.message;
            store.log('任务执行失败', task.name);
        }
        finally {
            clearTimeout(timeout);
            active.delete('task:' + id);
            await store.save();
        }
        return view();
    }
    return { run };
}
