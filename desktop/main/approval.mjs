/** Native confirmation adapter. A cancelled queued request never opens a dialog. */
export function createApprover({ dialog, getWindow, focus }) {
    let approvalQueue = Promise.resolve();
    return function approve(title, detail, signal) {
        const result = approvalQueue.catch(() => { }).then(async () => { signal?.throwIfAborted(); focus(); const reply = await dialog.showMessageBox(getWindow(), { type: 'question', title: 'WillBuddy · 操作确认', message: title, detail, buttons: ['取消', '允许这一次'], defaultId: 0, cancelId: 0, noLink: true }); signal?.throwIfAborted(); return reply.response === 1; });
        approvalQueue = result;
        return result;
    };
}
