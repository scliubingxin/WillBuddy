import { escape } from './markdown.js';
export function runQueue({state, action, date, statusNames}) {
    const live = new Set(['queued','running','cancelling']);
    const jobs = (state.runJobs || []).slice(0, 40);
    return `<section class="run-queue" aria-label="模型执行队列"><div class="section-head"><h2>模型执行队列</h2><small>对话与每日任务</small></div><p class="description">共享执行名额；退出后暂停旧请求，不自动重放工具。继续对话请打开原任务重新发送，每日任务可手动重新运行。</p>${jobs.map(job => `<article class="command-job" data-run-job="${escape(job.id)}"><header><b>${escape(job.label)}</b><span role="status">${escape(statusNames[job.status] || job.status)}</span><small>${date(job.createdAt)}</small></header><p>${job.kind === 'conversation' ? '模型对话' : '每日任务'} · ${escape(job.id)}</p>${job.error || job.persistenceError ? `<p class="error">${escape(job.error || job.persistenceError)}</p>` : ''}${live.has(job.status) ? action('停止请求','cancelRun',job.id,'danger') : ''}</article>`).join('') || '<p class="quiet-empty">对话与每日任务的真实运行会显示在这里。</p>'}</section>`;
}
