import {randomUUID} from 'node:crypto';

// This is a transient, single-job controller. No file names or contents are exposed.
export function createPdfImportControl({notify = () => {}, timeoutMs = 180000} = {}) {
  let current = null;
  return {
    start() {
      if (current) throw Error('已有 PDF 附件正在识别，请稍后重试');
      const controller = new AbortController();
      const job = {id: randomUUID(), controller, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)])};
      current = job;
      notify();
      return job;
    },
    view() { return current ? {id: current.id, cancelling: current.signal.aborted, ...(current.progress ? {progress: {...current.progress}} : {})} : null; },
    progress(job, value) {
      if (current !== job || job.signal.aborted || !value || !Number.isInteger(value.page) || value.page < 1 || value.page > 100 || !Number.isInteger(value.index) || !Number.isInteger(value.total) || value.total < 1 || value.total > 5 || value.index < 1 || value.index > value.total) return false;
      if (job.progress && (value.total !== job.progress.total || value.index <= job.progress.index || value.page !== job.progress.page + 1)) return false;
      job.progress = {page: value.page, index: value.index, total: value.total};
      notify();return true;
    },
    cancel(id) {
      if (!current || current.id !== id || current.controller.signal.aborted) return false;
      current.controller.abort(new Error('已停止 PDF 识别'));
      notify();
      return true;
    },
    finish(job) { if (current === job) { current = null; notify(); } },
    close() { if (current && !current.controller.signal.aborted) current.controller.abort(new Error('应用退出')); },
  };
}
