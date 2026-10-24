import { complete, uid, nextDaily } from '../core.mjs';
import { sharedRunQueue, requestFingerprint } from '../runtime/run-queue.mjs';
/** Model-only routines use the same persisted queue and cancellation as conversations. */
export function createTaskService({ store, active, key, view, notify = () => {}, notifyCompleted = () => {}, request = complete, queue = sharedRunQueue({store,active,notify}) }) {
    async function run(id, { scheduledFor, requestId } = {}) {
        const task = store.data.tasks.find(t => t.id === id);
        if (!task) throw Error('任务不存在');
        const runId = requestId || (scheduledFor !== undefined ? 'schedule-' + requestFingerprint({id,scheduledFor}) : uid());
        if (queue.hasOwner('task',id) && !queue.lookup(runId)) throw Error('任务正在执行或排队');
        const prompt = task.prompt, name = task.name;
        const fingerprint = requestFingerprint({id,prompt,name,scheduledFor});
        if (scheduledFor !== undefined && (!Number.isFinite(scheduledFor) || !task.enabled
            || task.nextRun !== scheduledFor || scheduledFor > Date.now()) && !queue.lookup(runId)) throw Error('定时任务已变化或尚未到期');
        const nextRun = task.enabled ? nextDaily() : null;
        await queue.submit({id:runId,kind:'task',ownerId:id,label:name,fingerprint}, async controller => {
            const result = await request(store.data.settings,key(),[
                {role:'system',content:'你是 WillBuddy 定时工作助手。仅根据任务描述输出结果。没有联网或本机工具，不能假装查询了实时数据。'},
                {role:'user',content:prompt}
            ],controller.signal);
            // Providers may ignore abort and deliver late replies. Never save/notify those as success.
            controller.signal.throwIfAborted();
            task.result = result.text;
            store.data.artifacts.unshift({id:uid(),name,text:result.text,time:Date.now(),runId});
            store.log('任务已完成',name);
            return {status:'completed'};
        }, job => {
            task.runId=runId;
            task.runRevision=job.revision;
            task.status=job.status === 'completed' ? 'done' : job.status;
            task.error=job.error || (job.status === 'cancelled' ? '请求已停止或超时' : '');
            if (job.status === 'queued') { task.lastRun=job.createdAt;task.nextRun=nextRun; }
        });
        const record=queue.lookup(runId);
        if (record?.status === 'completed') {
            // Only the worker creates an artifact; duplicate requests must not repeat notification.
            if (!record.notified) {
                record.notified=true;
                await store.save();
                notifyCompleted(task);
            }
        }
        return view();
    }
    return {run,cancel:id=>queue.cancelOwner('task',id)};
}
