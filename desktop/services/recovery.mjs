/** Mark interrupted work without replaying previously approved side effects. */
export function recoverInterruptedWork(data, now = Date.now()) {
    for (const record of data.executions)
        if (['running', 'pending_approval'].includes(record.status)) {
            record.status = 'interrupted';
            record.result = { status: 'interrupted', error: '应用退出中断了执行，不会自动重放' };
        }
    for (const t of data.tasks)
        if (t.status === 'running') {
            t.status = 'failed';
            t.error = '应用退出中断了上次执行，请手动重试';
        }
    for (const chat of data.chats)
        if (chat.run?.status === 'running') {
            chat.run.status = 'interrupted';
            chat.run.finishedAt = now;
            for (const message of chat.messages || [])
                if (message.streaming) {
                    message.streaming = false;
                    message.partial = true;
                    message.error = true;
                }
        }
}
