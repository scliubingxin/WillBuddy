/** Serialized native confirmations with active/queued cancellation and bounded lifetime. */
export function createApprover({
  dialog,
  getWindow,
  focus,
  timeoutMs = 60000,
}) {
  let queue = Promise.resolve(),
    generation = new AbortController(),
    nativePending = false;
  function approve(title, detail, signal, { browserScope } = {}) {
    const epoch = generation.signal;
    const result = queue
      .catch(() => {})
      .then(async () => {
        const local = new AbortController();
        const combined = AbortSignal.any([
          epoch,
          local.signal,
          ...(signal ? [signal] : []),
        ]);
        combined.throwIfAborted();
        if (nativePending)
          throw Error("上一个系统确认框尚未关闭，请按 Esc 取消后重试");
        focus();
        const parent = getWindow();
        // Parentless macOS message boxes are synchronous and cannot honor AbortSignal.
        if (!parent || parent.isDestroyed?.())
          throw Error("工作台窗口不可用，未打开确认框");
        if (browserScope && browserScope.origin.length > 200)
          throw Error("网站地址过长，无法安全确认");
        const displayDetail =
          detail +
          (browserScope
            ? `\n\n可选择允许本任务在 ${browserScope.origin} 继续打开、读取、检查、点击和填写。跨站或新任务需重新确认；点击可能提交网页业务。可从工具页或菜单撤销。`
            : "");
        if (
          displayDetail.length > 1000 ||
          displayDetail.split("\n").length > 20
        )
          throw Error("确认信息过长，已阻止操作。请缩短参数或拆分修改批次");
        const timer = setTimeout(
          () =>
            local.abort(
              new DOMException("操作确认超时，已取消", "TimeoutError"),
            ),
          timeoutMs,
        );
        let abort;
        try {
          const cancelled = new Promise((_, reject) => {
            abort = () => reject(combined.reason);
            combined.addEventListener("abort", abort, { once: true });
          });
          nativePending = true;
          const native = Promise.resolve()
            .then(() => {
              combined.throwIfAborted();
              return dialog.showMessageBox(parent, {
                type: "question",
                title: "WillBuddy · 操作确认",
                message: title,
                detail: displayDetail,
                buttons: browserScope
                  ? ["取消", "允许这一次", "本任务本站点允许"]
                  : ["取消", "允许这一次"],
                defaultId: 0,
                cancelId: 0,
                noLink: true,
                textWidth: 500,
                signal: combined,
              });
            })
            .finally(() => {
              nativePending = false;
            });
          const reply = await Promise.race([native, cancelled]);
          combined.throwIfAborted();
          if (browserScope && reply.response === 2)
            return { allowed: true, browserTask: true };
          return reply.response === 1;
        } finally {
          clearTimeout(timer);
          combined.removeEventListener("abort", abort);
        }
      });
    queue = result;
    return result;
  }
  approve.cancelAll = () => {
    generation.abort();
    generation = new AbortController();
  };
  return approve;
}
