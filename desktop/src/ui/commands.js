import { escape } from './markdown.js';

export function commandQueue({state, action, date, statusNames}) {
    const jobs = state.commandJobs || [];
    return `<section class="command-queue" aria-label="持久命令队列"><div class="section-head"><h2>命令队列</h2><small>${jobs.filter(j => ['queued','pending_approval','running','cancelling'].includes(j.status)).length} 条待完成</small></div><p class="description">刷新后仍可查看和停止。退出应用后暂停；重试会新建执行并再次请求系统确认。操作可能已产生副作用，请先核查。</p>${jobs.map(job => {
        const live = ['queued','pending_approval','running','cancelling'].includes(job.status);
        const audit = (state.executions || []).find(r => r.id === job.executionId || r.jobId === job.id);
        const result = audit?.result || job.result;
        return `<article class="command-job" data-job-id="${escape(job.id)}"><header><b>${escape(job.request.executable)}</b><span role="status">${escape(statusNames[job.status] || job.status)}</span><small>${date(job.createdAt)}</small></header><pre>${escape(JSON.stringify(job.request.args))}</pre><p class="description">${escape(state.folders.find(f => f.id === job.request.folderId)?.name || '授权已撤销')} / ${escape(job.request.relative || '.')} · ${escape(job.id)}${job.retryOf ? ' · 重试自 ' + escape(job.retryOf) : ''}</p>${audit?.partial ? `<pre class="terminal">${escape(audit.partial)}</pre>` : ''}${result ? `<pre class="terminal">${escape([result.stdout || '', result.stderr ? 'stderr:\n' + result.stderr : '', result.error || '', result.exitCode !== undefined ? '退出码：' + result.exitCode : ''].filter(Boolean).join('\n'))}</pre>` : ''}${job.error || job.persistenceError ? `<p class="error">${escape(job.error || job.persistenceError)}</p>` : ''}<div class="toolbar">${live ? action(job.status === 'queued' ? '取消排队' : '停止命令','commandCancelJob',job.id,'danger') : `${job.status !== 'succeeded' && !job.retryId ? action('重新审阅并重试','commandRetryJob',job.id) : ''}${action('清理队列记录','commandForgetJob',job.id)}`}</div></article>`;
    }).join('') || '<p class="quiet-empty">提交命令后，运行状态与输出保存在这里。</p>'}</section>`;
}
