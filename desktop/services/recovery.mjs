import { runTransition } from '../runtime/run-queue.mjs';
import { commandTransition } from './commands.mjs';
/** Mark interrupted work without replaying previously approved side effects. */
export function recoverInterruptedWork(data, now = Date.now()) {
    data.runJobs ??= [];
    for (const job of data.runJobs) {
        if (['queued', 'running', 'cancelling'].includes(job.status)) {
            runTransition(job, job.status === 'queued' ? 'paused' : 'interrupted', now);
            job.finishedAt = now;
            job.error = '应用退出中断了请求，请核查后手动重新发起；不会重放工具';
        }
    }
    data.commandJobs ??= [];
    for (const job of data.commandJobs) {
        if (['queued', 'pending_approval', 'running', 'cancelling'].includes(job.status)) {
            commandTransition(job, job.status === 'queued' ? 'paused' : 'interrupted', now);
            job.error = '应用退出；命令可能已有副作用，核对后手动重试并重新审批';
            job.finishedAt = now;
        }
    }
    for (const record of data.executions)
        if (['running', 'pending_approval'].includes(record.status)) {
            record.status = 'interrupted';
            record.result = { status: 'interrupted', error: '应用退出中断了执行，不会自动重放' };
        }
    for (const t of data.tasks)
        if (['queued', 'running', 'cancelling'].includes(t.status)) {
            t.status = t.status === 'queued' ? 'paused' : 'interrupted';
            t.error = '应用退出中断了上次执行，请手动重试';
        }
    for (const chat of data.chats)
        if (['queued', 'running', 'cancelling'].includes(chat.run?.status)) {
            chat.run.status = chat.run.status === 'queued' ? 'paused' : 'interrupted';
            chat.run.revision = (chat.run.revision || 0) + 1;
            chat.run.finishedAt = now;
            for (const message of chat.messages || [])
                if (message.streaming) {
                    message.streaming = false;
                    message.partial = true;
                    message.error = true;
                }
        }
}
