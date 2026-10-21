"""幕云AI local DAG runner. Standard library only; never executes code on the host."""
import concurrent.futures
import copy
import csv
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import sqlite3
import stat
import subprocess
import threading
import time
import uuid
import zipfile
from io import StringIO
from xml.sax.saxutils import escape
import genoffice_adapter

TERMINAL = {'succeeded', 'failed', 'cancelled', 'blocked', 'interrupted'}
KINDS = {'document', 'render', 'preview', 'spreadsheet', 'sheet_render', 'sheet_preview', 'bundle', 'python', 'javascript', 'genoffice'}
ACCEPTANCE_TYPES = {'artifact_exists', 'text_contains', 'json_equals'}
TEXT_EXTENSIONS = {'.txt', '.md', '.csv', '.json', '.xml', '.html', '.fodt'}
DEFAULT_POLICY = {'maxConcurrency': 4, 'maxRunSeconds': 1800, 'maxArtifactBytes': 300_000_000}
PLANNING_MODES = {'deterministic_document_brief_v1'}


def _validate_planning(value):
    if value is None:
        return None
    if not isinstance(value, dict) or set(value) - {'mode', 'sourceSha256', 'itemCount', 'warnings'}:
        raise ValueError('计划来源格式无效或包含未知字段')
    if value.get('mode') not in PLANNING_MODES:
        raise ValueError('不支持的计划来源')
    digest = value.get('sourceSha256')
    if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise ValueError('计划来源摘要无效')
    count = value.get('itemCount')
    if not isinstance(count, int) or isinstance(count, bool) or not 1 <= count <= 10:
        raise ValueError('计划来源条目数无效')
    warnings = value.get('warnings', [])
    if not isinstance(warnings, list) or len(warnings) > 10 or any(
            not isinstance(item, str) or not 1 <= len(item) <= 200 for item in warnings):
        raise ValueError('计划来源提示无效')
    return {'mode': value['mode'], 'sourceSha256': digest, 'itemCount': count,
            'warnings': copy.deepcopy(warnings)}


def _validate_policy(value):
    if value is None:
        return copy.deepcopy(DEFAULT_POLICY)
    if not isinstance(value, dict) or set(value) - set(DEFAULT_POLICY):
        raise ValueError('运行策略格式无效或包含未知字段')
    policy = {**DEFAULT_POLICY, **copy.deepcopy(value)}
    limits = {
        'maxConcurrency': (1, 4, '单批并发数必须为 1–4'),
        'maxRunSeconds': (1, 3600, '单批运行时限必须为 1–3600 秒'),
        'maxArtifactBytes': (1, 500_000_000, '成果总量限制必须为 1–500000000 字节'),
    }
    for field, (lower, upper, message) in limits.items():
        if not isinstance(policy[field], int) or isinstance(policy[field], bool) or not lower <= policy[field] <= upper:
            raise ValueError(message)
    return policy


def _validate_acceptance(items, task_ids):
    if items is None:
        return []
    if not isinstance(items, list) or len(items) > 20:
        raise ValueError('验收标准必须为不超过 20 项的数组')
    accepted, ids = [], set()
    for item in copy.deepcopy(items):
        if not isinstance(item, dict) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,50}', str(item.get('id', ''))):
            raise ValueError('验收标准标识无效')
        if item['id'] in ids:
            raise ValueError('验收标准标识重复')
        ids.add(item['id'])
        if item.get('task') not in task_ids:
            raise ValueError('验收标准引用的任务不存在')
        if item.get('type') not in ACCEPTANCE_TYPES:
            raise ValueError('不支持的验收标准类型')
        extension = item.get('extension')
        if not isinstance(extension, str) or not re.fullmatch(r'\.[a-zA-Z0-9]{1,10}', extension):
            raise ValueError('验收文件扩展名无效')
        item['extension'] = extension.lower()
        for field, default, upper in [('minBytes', 1, 50_000_000), ('maxBytes', 50_000_000, 50_000_000)]:
            value = item.get(field, default)
            if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= upper:
                raise ValueError('验收文件大小限制无效')
            item[field] = value
        if item['minBytes'] > item['maxBytes']:
            raise ValueError('验收文件大小范围无效')
        if item['type'] == 'text_contains':
            if extension.lower() not in TEXT_EXTENSIONS:
                raise ValueError('内容验收只支持安全文本文件')
            value = item.get('value')
            if not isinstance(value, str) or not 1 <= len(value) <= 200 or any(ord(c) < 32 and c not in '\n\r\t' for c in value):
                raise ValueError('文本验收值无效')
        if item['type'] == 'json_equals':
            if extension.lower() != '.json' or 'expected' not in item:
                raise ValueError('JSON 验收需要 .json 文件和 expected')
            path = item.get('path')
            if not isinstance(path, list) or len(path) > 10 or any(not isinstance(p, (str, int)) or isinstance(p, bool) or isinstance(p, int) and p < 0 or isinstance(p, str) and not 1 <= len(p) <= 100 for p in path):
                raise ValueError('JSON 验收路径无效')
            if isinstance(item['expected'], (dict, list)):
                raise ValueError('JSON 验收值只支持标量')
        accepted.append(item)
    return accepted


def validate_plan(plan):
    if not isinstance(plan, dict) or not isinstance(plan.get('tasks'), list) or not 1 <= len(plan['tasks']) <= 30:
        raise ValueError('任务计划需要 1–30 个任务')
    tasks = copy.deepcopy(plan['tasks'])
    ids = set()
    for task in tasks:
        if not isinstance(task, dict) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,50}', str(task.get('id', ''))):
            raise ValueError('任务标识无效')
        if task['id'] in ids:
            raise ValueError('任务标识重复')
        ids.add(task['id'])
        if task.get('kind') not in KINDS:
            raise ValueError('不支持的任务类型')
        if not isinstance(task.get('dependsOn', []), list):
            raise ValueError('依赖必须为数组')
        task['dependsOn'] = task.get('dependsOn', [])
        if task['kind'] == 'genoffice':
            genoffice_adapter.validate(task)
        if any(not isinstance(x, str) for x in task['dependsOn']):
            raise ValueError('依赖标识必须为字符串')
        if len(set(task['dependsOn'])) != len(task['dependsOn']):
            raise ValueError('重复依赖')
        for field, limit in [('title', 200), ('text', 40000), ('csv', 40000), ('code', 20000)]:
            if not isinstance(task.get(field, ''), str) or len(task.get(field, '')) > limit:
                raise ValueError('任务文字或代码超限')
        if task['kind'] in {'python', 'javascript'} and not task.get('code', '').strip():
            raise ValueError('代码不能为空')
        if task['kind'] == 'document' and not task.get('text', '').strip():
            raise ValueError('文档正文不能为空')
        if task['kind'] == 'spreadsheet' and not task.get('csv', '').strip():
            raise ValueError('表格数据不能为空')
        if task['kind'] in {'render', 'preview', 'sheet_render', 'sheet_preview'} and len(task['dependsOn']) != 1:
            raise ValueError('渲染和预览任务需要一个直接依赖')
        if task['kind'] == 'bundle' and not 1 <= len(task['dependsOn']) <= 20:
            raise ValueError('成果包需要 1–20 个直接依赖')
    by_id = {t['id']: t for t in tasks}
    for task in tasks:
        for dep in task['dependsOn']:
            if dep not in ids or dep == task['id']:
                raise ValueError('任务依赖不存在或引用自身')
        expected = {'render': 'document', 'preview': 'render',
                    'sheet_render': 'spreadsheet', 'sheet_preview': 'sheet_render'}.get(task['kind'])
        if expected and by_id[task['dependsOn'][0]]['kind'] != expected:
            raise ValueError('文档任务依赖类型不匹配')
        if task['kind'] == 'bundle' and any(by_id[d]['kind'] not in {'render', 'preview', 'sheet_render', 'sheet_preview', 'genoffice'} for d in task['dependsOn']):
            raise ValueError('成果包只能汇总渲染和预览任务')
    done = set()
    while len(done) < len(tasks):
        ready = {t['id'] for t in tasks if t['id'] not in done and set(t['dependsOn']) <= done}
        if not ready:
            raise ValueError('任务计划存在循环依赖')
        done |= ready
    result = {'name': str(plan.get('name', '本地任务'))[:200], 'tasks': tasks,
              'policy': _validate_policy(plan.get('policy')),
              'acceptance': _validate_acceptance(plan.get('acceptance'), ids)}
    planning = _validate_planning(plan.get('planning'))
    if planning is not None:
        result['planning'] = planning
    return result


def document_plan(documents):
    if not isinstance(documents, list) or not 1 <= len(documents) <= 10:
        raise ValueError('每批支持 1–10 份文档')
    tasks = []
    for index, doc in enumerate(documents):
        if not isinstance(doc, dict):
            raise ValueError('文档输入格式错误')
        ident = f'doc_{index + 1}'
        tasks.extend([
            {'id': ident, 'kind': 'document', 'title': doc.get('title', '幕云AI文档'), 'text': doc.get('text', ''), 'dependsOn': []},
            {'id': ident + '_render', 'kind': 'render', 'title': '生成 Word 与 PDF', 'dependsOn': [ident]},
            {'id': ident + '_preview', 'kind': 'preview', 'title': '渲染逐页预览', 'dependsOn': [ident + '_render']},
        ])
    tasks.append({'id': 'deliverables', 'kind': 'bundle', 'title': '汇总可下载成果',
                  'dependsOn': [t['id'] for t in tasks if t['kind'] in {'render', 'preview'}]})
    acceptance = []
    for index in range(len(documents)):
        task_id = f'doc_{index + 1}_render'
        acceptance.extend([
            {'id': f'doc_{index + 1}_word', 'task': task_id, 'type': 'artifact_exists', 'extension': '.docx', 'minBytes': 1000},
            {'id': f'doc_{index + 1}_pdf', 'task': task_id, 'type': 'artifact_exists', 'extension': '.pdf', 'minBytes': 1000},
        ])
    acceptance.append({'id': 'deliverables_zip', 'task': 'deliverables', 'type': 'artifact_exists', 'extension': '.zip', 'minBytes': 1000})
    return validate_plan({'name': '文档生成与渲染', 'tasks': tasks, 'acceptance': acceptance,
                          'policy': {'maxConcurrency': 2, 'maxRunSeconds': 600, 'maxArtifactBytes': 200_000_000}})


def text_document_plan(brief):
    """Compile a deliberately small Chinese numbered brief into the fixed document DAG."""
    if not isinstance(brief, str) or not 1 <= len(brief) <= 8000:
        raise ValueError('中文任务简报长度必须为 1–8000 字')
    if any(ord(char) < 32 and char not in '\n\r\t' for char in brief):
        raise ValueError('中文任务简报包含不可见控制字符')
    normalized = brief.replace('\r\n', '\n').replace('\r', '\n').strip()
    items, introduction_seen = [], False
    for line in normalized.split('\n'):
        if not line.strip():
            continue
        match = re.fullmatch(r'\s*(?:\d{1,2}[.、）)]|[-*])\s*(.+?)\s*', line)
        if match:
            items.append(match.group(1))
        elif not items and not introduction_seen and line.strip().endswith(('：', ':')):
            introduction_seen = True
        else:
            raise ValueError('简报只允许一行说明和逐行编号条目')
    if not 1 <= len(items) <= 10:
        raise ValueError('请使用编号逐行填写 1–10 份文档')
    documents, titles = [], set()
    for item in items:
        parts = re.split(r'[：:]', item, maxsplit=1)
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            raise ValueError('每项必须采用“标题：正文”格式')
        title, text = parts[0].strip(), parts[1].strip()
        if len(title) > 100 or len(text) > 2000:
            raise ValueError('单项标题或正文过长')
        if title in titles:
            raise ValueError('文档标题不能重复')
        titles.add(title)
        documents.append({'title': title, 'text': text})
    plan = document_plan(documents)
    plan['name'] = '中文简报生成与渲染'
    plan['planning'] = {
        'mode': 'deterministic_document_brief_v1',
        'sourceSha256': hashlib.sha256(normalized.encode('utf-8')).hexdigest(),
        'itemCount': len(documents),
        'warnings': ['仅按编号和“标题：正文”规则编译；未使用模型推断', '执行前必须人工审阅并再次校验计划'],
    }
    return validate_plan(plan)


def spreadsheet_plan(spreadsheets):
    if not isinstance(spreadsheets, list) or not 1 <= len(spreadsheets) <= 5:
        raise ValueError('每批支持 1–5 份表格')
    tasks = []
    for index, sheet in enumerate(spreadsheets):
        if not isinstance(sheet, dict):
            raise ValueError('表格输入格式错误')
        ident = f'sheet_{index + 1}'
        tasks.extend([
            {'id': ident, 'kind': 'spreadsheet', 'title': sheet.get('title', '幕云AI表格'), 'csv': sheet.get('csv', ''), 'dependsOn': []},
            {'id': ident + '_render', 'kind': 'sheet_render', 'title': '生成 Excel 与 PDF', 'dependsOn': [ident]},
            {'id': ident + '_preview', 'kind': 'sheet_preview', 'title': '渲染表格逐页预览', 'dependsOn': [ident + '_render']},
        ])
    tasks.append({'id': 'deliverables', 'kind': 'bundle', 'title': '汇总可下载成果',
                  'dependsOn': [t['id'] for t in tasks if t['kind'] in {'sheet_render', 'sheet_preview'}]})
    acceptance = []
    for index in range(len(spreadsheets)):
        task_id = f'sheet_{index + 1}_render'
        acceptance.extend([
            {'id': f'sheet_{index + 1}_excel', 'task': task_id, 'type': 'artifact_exists', 'extension': '.xlsx', 'minBytes': 1000},
            {'id': f'sheet_{index + 1}_pdf', 'task': task_id, 'type': 'artifact_exists', 'extension': '.pdf', 'minBytes': 1000},
        ])
    acceptance.append({'id': 'deliverables_zip', 'task': 'deliverables', 'type': 'artifact_exists', 'extension': '.zip', 'minBytes': 1000})
    return validate_plan({'name': '表格生成与渲染', 'tasks': tasks, 'acceptance': acceptance,
                          'policy': {'maxConcurrency': 2, 'maxRunSeconds': 600, 'maxArtifactBytes': 200_000_000}})


def docker_command(image, directory, name, kind):
    # Images are operator-configured, never accepted from browser plans. No host secrets/socket mounts.
    command = ['python3', '-I', '-u', '/input/main.py'] if kind == 'python' else ['node', '/input/main.js']
    return ['docker', 'run', '--rm', '--pull', 'never', '--name', name,
            '--network', 'none', '--read-only', '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges', '--pids-limit', '64',
            '--memory', '256m', '--memory-swap', '256m', '--cpus', '1',
            '--user', '65534:65534', '--ulimit', 'nofile=64:64', '--ulimit', 'fsize=1048576:1048576',
            '--log-driver', 'none', '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m',
            '--tmpfs', '/work:rw,noexec,nosuid,size=64m,mode=1777', '--workdir', '/work',
            '--mount', f'type=bind,src={directory},dst=/input,readonly', image,
            'timeout', '--signal=KILL', '30s', *command]


class Runner:
    def __init__(self, root, concurrency=2):
        if not 1 <= concurrency <= 4:
            raise ValueError('并发数必须为 1–4')
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.instance_lock = (self.root / 'runner.lock').open('a')
        try:
            fcntl.flock(self.instance_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.instance_lock.close()
            raise ValueError('该数据目录已有执行器运行，不能重复启动')
        self.lock = threading.RLock()
        self.db = sqlite3.connect(self.root / 'runner.sqlite3', check_same_thread=False)
        self.db.execute('CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, state TEXT NOT NULL)')
        self.pool = concurrent.futures.ThreadPoolExecutor(max_workers=concurrency)
        self.concurrency = concurrency
        self.futures = {}
        self.cancels = {}
        self.runs = {}
        self.scheduler_cursor = 0
        self.closed = False
        for ident, state in self.db.execute('SELECT id,state FROM runs'):
            run = json.loads(state)
            run.setdefault('scheduler', {'strategy': 'fair_round_robin', 'dispatches': 0, 'maxObservedRunning': 0})
            if run['status'] not in TERMINAL:
                run['status'] = 'interrupted'
                run['acceptance'] = {'status': 'not_run', 'results': [], 'reason': '执行器重启'}
                for task in run['tasks']:
                    if task['status'] not in TERMINAL:
                        task.update(status='interrupted', error='执行器重启；未自动重放，请核对后创建新任务')
            self.runs[ident] = run
            self.cancels[ident] = threading.Event()
            self._save(run)

    def _save(self, run):
        self.db.execute('INSERT OR REPLACE INTO runs VALUES(?,?)', (run['id'], json.dumps(run, ensure_ascii=False)))
        self.db.commit()

    def capabilities(self):
        docker = False
        cjk_font = None
        if shutil.which('fc-match'):
            try:
                match = subprocess.run(['fc-match', '-f', '%{lang}', ':lang=zh-cn'], capture_output=True, text=True, timeout=5)
                cjk_font = match.returncode == 0 and 'zh' in match.stdout
            except (OSError, subprocess.TimeoutExpired):
                pass
        if shutil.which('docker'):
            try:
                docker = subprocess.run(['docker', 'info', '--format', '{{.ServerVersion}}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5).returncode == 0
            except (OSError, subprocess.TimeoutExpired):
                pass
        images = {}
        for kind, default in [('python', 'python:3.12-slim'), ('javascript', 'node:22-slim')]:
            image = os.environ.get('MUYUN_' + kind.upper() + '_IMAGE', default)
            present = False
            if docker:
                try:
                    present = subprocess.run(['docker', 'image', 'inspect', image], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5).returncode == 0
                except (OSError, subprocess.TimeoutExpired):
                    pass
            images[kind] = {'image': image, 'ready': present}
        return {'docker': docker, 'code': images, 'genoffice': genoffice_adapter.capability(), 'libreoffice': bool(shutil.which('soffice')), 'cjk_font': cjk_font, 'preview': bool(shutil.which('pdftoppm') and shutil.which('pdfinfo')), 'concurrency': self.concurrency, 'network': 'disabled_in_code_containers'}

    def _check_capabilities(self, tasks):
        # Check all dependencies before accepting work, never silently downgrade isolation.
        caps = self.capabilities()
        if any(t['kind'] in {'render', 'sheet_render'} for t in tasks) and caps['cjk_font'] is False and any(re.search(r'[\u3400-\u9fff]', t.get('title', '') + t.get('text', '') + t.get('csv', '')) for t in tasks):
            raise ValueError('没有可用中文字体；请安装 Noto Sans CJK SC 后再渲染，避免生成空白中文')
        for task in tasks:
            if task['kind'] == 'genoffice':
                genoffice = caps.get('genoffice', {})
                if task.get('action') == 'render':
                    if not genoffice.get('office_preview', {}).get('ready'):
                        raise ValueError('Office 逐页预览需要 LibreOffice 与 Poppler')
                elif not genoffice.get('ready'):
                    raise ValueError('GenOffice CLI 不可用，请先安装并重新检测')
            if task['kind'] in {'python', 'javascript'} and not caps['code'][task['kind']]['ready']:
                raise ValueError('代码沙盒不可用：需要可用 Docker 和已安装的运行镜像；不会在主机裸跑代码')
            if task['kind'] in {'render', 'sheet_render'} and not caps['libreoffice']:
                raise ValueError('未找到 LibreOffice soffice')
            if task['kind'] in {'preview', 'sheet_preview'} and not caps['preview']:
                raise ValueError('未找到 Poppler pdfinfo/pdftoppm')

    def create(self, plan):
        plan = validate_plan(plan)
        self._check_capabilities(plan['tasks'])
        with self.lock:
            if self.closed or sum(r['status'] not in TERMINAL for r in self.runs.values()) >= 8:
                raise ValueError('执行器关闭或待处理批次已达上限 8')
            ident = uuid.uuid4().hex
            run = {'id': ident, 'name': plan['name'], 'created': time.time(), 'status': 'queued',
                   'tasks': [{**{k: v for k, v in t.items() if k not in {'result', 'error', 'started', 'ended'}}, 'status': 'pending'} for t in plan['tasks']],
                   'policy': plan['policy'], 'budget': {'status': 'within', 'elapsedSeconds': 0, 'artifactBytes': 0},
                   'scheduler': {'strategy': 'fair_round_robin', 'dispatches': 0, 'maxObservedRunning': 0},
                   'acceptancePlan': plan['acceptance'], 'acceptance': {'status': 'pending', 'results': []}, 'events': []}
            if 'planning' in plan:
                run['planning'] = copy.deepcopy(plan['planning'])
            self.runs[ident] = run
            self.cancels[ident] = threading.Event()
            self._save(run)
            return copy.deepcopy(run)

    def retry(self, ident):
        with self.lock:
            source = self.runs.get(ident)
            if not source:
                raise ValueError('任务不存在')
            if source['status'] not in TERMINAL:
                raise ValueError('任务仍在执行，不能创建重试')
            if source['status'] == 'succeeded' or all(t['status'] == 'succeeded' for t in source['tasks']):
                raise ValueError('没有失败、取消或中断的步骤可重试；成果验收未通过时请先修改计划')
            if self.closed or sum(r['status'] not in TERMINAL for r in self.runs.values()) >= 8:
                raise ValueError('执行器关闭或待处理批次已达上限 8')
            clean_tasks = [{k: copy.deepcopy(v) for k, v in task.items()
                            if k not in {'status', 'result', 'error', 'started', 'ended', 'reusedFrom'}}
                           for task in source['tasks']]
            plan = validate_plan({'name': source['name'], 'tasks': clean_tasks,
                                  'acceptance': source.get('acceptancePlan', []), 'policy': source.get('policy'),
                                  'planning': source.get('planning')})
            pending = [task for task, old in zip(plan['tasks'], source['tasks']) if old['status'] != 'succeeded']
            self._check_capabilities(pending)
            for task in source['tasks']:
                if task['status'] != 'succeeded':
                    continue
                verification = task.get('result', {}).get('verification')
                if not isinstance(verification, dict) or verification.get('status') != 'passed':
                    raise ValueError('已完成步骤缺少完整性证据，不能安全复用；请重新创建完整任务')
                for entry in verification.get('artifacts', []):
                    self._check_entry(entry)
            new_id = uuid.uuid4().hex
            attempt = int(source.get('attempt', 1)) + 1
            tasks, events = [], []
            for clean, old in zip(plan['tasks'], source['tasks']):
                if old['status'] == 'succeeded':
                    reused = copy.deepcopy(old)
                    reused['reusedFrom'] = {'run': ident, 'attempt': int(source.get('attempt', 1))}
                    tasks.append(reused)
                    events.append({'task': old['id'], 'type': 'reused', 'time': time.time()})
                else:
                    tasks.append({**clean, 'status': 'pending'})
            run = {'id': new_id, 'name': source['name'] + ' · 重试', 'created': time.time(),
                   'status': 'queued', 'tasks': tasks, 'acceptancePlan': plan['acceptance'],
                   'policy': plan['policy'], 'budget': {'status': 'within', 'elapsedSeconds': 0, 'artifactBytes': 0},
                   'scheduler': {'strategy': 'fair_round_robin', 'dispatches': 0, 'maxObservedRunning': 0},
                   'acceptance': {'status': 'pending', 'results': []}, 'events': events,
                   'retryOf': ident, 'attempt': attempt}
            if 'planning' in plan:
                run['planning'] = copy.deepcopy(plan['planning'])
            run['events'].append({'type': 'retry_created', 'source': ident, 'time': time.time()})
            self.runs[new_id] = run
            self.cancels[new_id] = threading.Event()
            self._save(run)
            return copy.deepcopy(run)

    def list(self):
        with self.lock:
            return copy.deepcopy(sorted(self.runs.values(), key=lambda r: r['created'], reverse=True)[:100])

    def get(self, ident):
        with self.lock:
            if ident not in self.runs:
                raise ValueError('任务不存在')
            return copy.deepcopy(self.runs[ident])

    def cancel(self, ident):
        with self.lock:
            run = self.runs.get(ident)
            if not run:
                raise ValueError('任务不存在')
            if run['status'] in TERMINAL:
                return
            self.cancels[ident].set()
            run['status'] = 'cancelling'
            for task in run['tasks']:
                if task['status'] == 'pending':
                    task['status'] = 'cancelled'
            run['events'].append({'type': 'cancel_requested', 'time': time.time()})
            self._save(run)

    def _update_budget(self, run, now=None):
        now = time.time() if now is None else now
        policy = run.get('policy') or copy.deepcopy(DEFAULT_POLICY)
        artifact_bytes = 0
        seen = set()
        for task in run['tasks']:
            if task['status'] != 'succeeded':
                continue
            for entry in task.get('result', {}).get('verification', {}).get('artifacts', []):
                path = entry.get('path')
                if path not in seen:
                    seen.add(path)
                    artifact_bytes += int(entry.get('bytes', 0))
        elapsed = max(0, now - run['created'])
        run['budget'] = {'status': 'within', 'elapsedSeconds': round(elapsed, 3), 'artifactBytes': artifact_bytes}
        if run.get('budgetFailure'):
            run['budget']['status'] = 'exceeded'
            return
        failure = None
        if elapsed > policy['maxRunSeconds']:
            failure = {'kind': 'duration', 'limit': policy['maxRunSeconds'], 'actual': round(elapsed, 3),
                       'message': f"运行时间超过 {policy['maxRunSeconds']} 秒"}
        elif artifact_bytes > policy['maxArtifactBytes']:
            failure = {'kind': 'artifacts', 'limit': policy['maxArtifactBytes'], 'actual': artifact_bytes,
                       'message': f"成果总量超过 {policy['maxArtifactBytes']} 字节"}
        if failure:
            failure['time'] = now
            run['budgetFailure'] = failure
            run['budget']['status'] = 'exceeded'
            self.cancels[run['id']].set()
            run['status'] = 'cancelling'
            for task in run['tasks']:
                if task['status'] == 'pending':
                    task.update(status='cancelled', error='运行预算已超限，未启动')
            run['events'].append({'type': 'budget_exceeded', 'kind': failure['kind'], 'time': now})

    def _block_unreachable(self, run):
        changed = True
        while changed:
            changed = False
            statuses = {task['id']: task['status'] for task in run['tasks']}
            for task in run['tasks']:
                if task['status'] != 'pending':
                    continue
                if any(statuses[dep] in TERMINAL - {'succeeded'} for dep in task['dependsOn']):
                    task.update(status='blocked', error='依赖任务未成功，后续步骤未执行')
                    changed = True

    def _ready_task(self, run):
        statuses = {task['id']: task['status'] for task in run['tasks']}
        return next((task for task in run['tasks'] if task['status'] == 'pending'
                     and all(statuses[dep] == 'succeeded' for dep in task['dependsOn'])), None)

    def _dispatch(self, run, task):
        now = time.time()
        task.update(status='running', started=now)
        run['status'] = 'running'
        running = sum(1 for run_id, _ in self.futures if run_id == run['id']) + 1
        scheduler = run.setdefault('scheduler', {'strategy': 'fair_round_robin', 'dispatches': 0, 'maxObservedRunning': 0})
        scheduler['dispatches'] += 1
        scheduler['maxObservedRunning'] = max(scheduler.get('maxObservedRunning', 0), running)
        run['events'].append({'task': task['id'], 'type': 'started', 'time': now,
                              'scheduler': 'fair_round_robin',
                              'queueWaitSeconds': round(max(0, now - run['created']), 3)})
        deps = {dep: next(item for item in run['tasks'] if item['id'] == dep).get('result', {})
                for dep in task['dependsOn']}
        self.futures[(run['id'], task['id'])] = self.pool.submit(
            self.execute_checked, run['id'], copy.deepcopy(task), deps, self.cancels[run['id']])

    def _schedule_fair(self):
        active = sorted((run for run in self.runs.values()
                         if run['status'] not in TERMINAL and not self.cancels[run['id']].is_set()
                         and any(task['status'] == 'pending' for task in run['tasks'])),
                        key=lambda run: (run['created'], run['id']))
        while active and len(self.futures) < self.concurrency and not self.closed:
            start = self.scheduler_cursor % len(active)
            order = active[start:] + active[:start]
            dispatched = False
            for offset, run in enumerate(order):
                if len(self.futures) >= self.concurrency:
                    break
                running = sum(1 for run_id, _ in self.futures if run_id == run['id'])
                if running >= run.get('policy', DEFAULT_POLICY)['maxConcurrency']:
                    continue
                task = self._ready_task(run)
                if task is None:
                    continue
                self._dispatch(run, task)
                index = (start + offset) % len(active)
                self.scheduler_cursor = (index + 1) % len(active)
                dispatched = True
            if not dispatched:
                break

    def _finalize(self, run):
        if not all(task['status'] in TERMINAL for task in run['tasks']):
            return
        self._update_budget(run)
        if run.get('budgetFailure'):
            run['status'] = 'failed'
            run['acceptance'] = {'status': 'not_run', 'results': [],
                                 'reason': '运行预算已超限：' + run['budgetFailure']['message']}
        elif self.cancels[run['id']].is_set():
            run['status'] = 'cancelled'
            run['acceptance'] = {'status': 'not_run', 'results': [], 'reason': '任务已取消'}
        elif not all(task['status'] == 'succeeded' for task in run['tasks']):
            run['status'] = 'failed'
            run['acceptance'] = {'status': 'not_run', 'results': [], 'reason': '任务步骤未全部成功'}
        else:
            run['acceptance'] = self.evaluate_acceptance(run)
            run['status'] = 'succeeded' if run['acceptance']['status'] == 'passed' else 'failed'
            if run.get('acceptancePlan'):
                run['events'].append({'type': 'acceptance_' + run['acceptance']['status'], 'time': time.time()})
        run['ended'] = time.time()

    def tick(self):
        with self.lock:
            for key, future in list(self.futures.items()):
                if not future.done():
                    continue
                ident, task_id = key
                run = self.runs[ident]
                task = next(t for t in run['tasks'] if t['id'] == task_id)
                try:
                    result = future.result()
                    task.update(status='cancelled' if self.cancels[ident].is_set() else 'succeeded', result=result)
                except Exception as error:
                    task.update(status='cancelled' if self.cancels[ident].is_set() else 'failed', error=str(error)[:2000])
                task['ended'] = time.time()
                run['events'].append({'task': task_id, 'type': task['status'], 'time': task['ended']})
                del self.futures[key]
                self._save(run)
            for run in self.runs.values():
                if run['status'] in TERMINAL:
                    continue
                self._update_budget(run)
                self._block_unreachable(run)
            self._schedule_fair()
            for run in self.runs.values():
                if run['status'] not in TERMINAL:
                    self._finalize(run)
                self._save(run)

    def evaluate_acceptance(self, run):
        results = []
        tasks = {task['id']: task for task in run['tasks']}
        for rule in run.get('acceptancePlan', []):
            result = {'id': rule['id'], 'type': rule['type'], 'task': rule['task'], 'status': 'failed'}
            try:
                task = tasks[rule['task']]
                entries = [entry for entry in task['result']['verification']['artifacts']
                           if Path(entry['path']).suffix.lower() == rule['extension']]
                if len(entries) != 1:
                    raise ValueError(f"需要且只能有 1 个 {rule['extension']} 成果，实际 {len(entries)} 个")
                entry = entries[0]
                data = self._check_entry(entry)
                if not rule['minBytes'] <= len(data) <= rule['maxBytes']:
                    raise ValueError(f"文件大小 {len(data)} 不在 {rule['minBytes']}–{rule['maxBytes']} 字节范围")
                result['evidence'] = {'path': entry['path'], 'bytes': len(data), 'sha256': entry['sha256']}
                if rule['type'] == 'text_contains':
                    if len(data) > 1_000_000:
                        raise ValueError('文本成果超过 1MB 内容验收上限')
                    if rule['value'] not in data.decode('utf-8'):
                        raise ValueError('成果未包含要求文本')
                elif rule['type'] == 'json_equals':
                    value = json.loads(data)
                    for part in rule['path']:
                        value = value[part] if isinstance(part, int) else value[part]
                    expected = rule['expected']
                    if type(value) is not type(expected) or value != expected:
                        raise ValueError(f'JSON 实际值 {value!r} 与要求不符')
                    result['evidence']['jsonPath'] = rule['path']
                    result['evidence']['actual'] = value
                result['status'] = 'passed'
            except (ValueError, KeyError, IndexError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as error:
                result['error'] = str(error)[:500]
            results.append(result)
        return {'status': 'passed' if all(item['status'] == 'passed' for item in results) else 'failed',
                'checked_at': time.time(), 'results': results}

    def process(self, args, cancel, timeout=60, cwd=None, container=None, env=None):
        # Drain output continuously, with a hard byte cap; no unbounded PIPE buffering.
        process = subprocess.Popen(args, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=os.name != 'nt')
        output = bytearray()
        overflow = threading.Event()
        def drain():
            while True:
                chunk = process.stdout.read(4096)
                if not chunk:
                    break
                if len(output) + len(chunk) > 65536:
                    overflow.set()
                else:
                    output.extend(chunk)
        reader = threading.Thread(target=drain, daemon=True)
        reader.start()
        deadline = time.monotonic() + timeout
        reason = None
        try:
            while process.poll() is None:
                if cancel.is_set() or overflow.is_set() or time.monotonic() >= deadline:
                    reason = '已取消' if cancel.is_set() else ('日志超过 64KB' if overflow.is_set() else '执行超时')
                    break
                time.sleep(0.025)
        finally:
            if reason:
                if os.name == 'nt':
                    process.kill()
                else:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
            process.wait()
            reader.join(timeout=2)
            if not reader.is_alive():
                process.stdout.close()
            if container:
                # Kill/remove named container even if the Docker client was interrupted.
                subprocess.run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        text = output.decode('utf-8', errors='replace')
        if reason or overflow.is_set():
            raise RuntimeError(reason or '日志超过 64KB')
        if process.returncode != 0:
            raise RuntimeError('程序失败：' + text[-2000:])
        return text

    def execute(self, ident, task, deps, cancel):
        directory = self.root / ident / task['id']
        directory.mkdir(parents=True, mode=0o700)
        if cancel.is_set():
            raise RuntimeError('已取消')
        kind = task['kind']
        if kind == 'genoffice':
            return genoffice_adapter.execute(self, directory, task, deps, cancel)
        if kind == 'document':
            def clean(text):
                return escape(re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text))
            paragraphs = ''.join('<text:p text:style-name="Body">' + clean(line or ' ') + '</text:p>' for line in task['text'].splitlines())
            content = ('<?xml version="1.0" encoding="UTF-8"?>'
                '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
                'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
                'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" '
                'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" '
                'office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.text">'
                '<office:font-face-decls><style:font-face style:name="CJK" svg:font-family="Noto Sans CJK SC"/></office:font-face-decls>'
                '<office:styles><style:style style:name="Title" style:family="paragraph">'
                '<style:paragraph-properties fo:margin-bottom="0.2in"/>'
                '<style:text-properties fo:font-size="22pt" style:font-size-asian="22pt" '
                'fo:font-weight="bold" style:font-weight-asian="bold" style:font-name="CJK" style:font-name-asian="CJK" fo:color="#2462d8"/>'
                '</style:style><style:style style:name="Body" style:family="paragraph">'
                '<style:paragraph-properties fo:margin-bottom="0.12in"/>'
                '<style:text-properties fo:font-size="11pt" style:font-size-asian="11pt" style:font-name="CJK" style:font-name-asian="CJK"/>'
                '</style:style></office:styles><office:body><office:text><text:p text:style-name="Title">'
                + clean(task.get('title', '幕云AI文档')) + '</text:p>' + paragraphs + '</office:text></office:body></office:document>')
            path = directory / 'document.fodt'
            path.write_text(content, encoding='utf-8')
            return {'files': [str(path.relative_to(self.root))], 'stdout': '文档结构已生成'}
        if kind == 'spreadsheet':
            try:
                rows = list(csv.reader(StringIO(task['csv'], newline='')))
            except csv.Error as error:
                raise RuntimeError('CSV 解析失败：' + str(error))
            if not rows or not any(any(cell.strip() for cell in row) for row in rows):
                raise RuntimeError('表格没有有效数据')
            if len(rows) > 200 or max(map(len, rows), default=0) > 30:
                raise RuntimeError('本地表格最多 200 行、30 列')
            width = max(map(len, rows))
            rows = [row + [''] * (width - len(row)) for row in rows]
            def clean(value):
                return escape(re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', value))
            def cell(value, header=False):
                stripped = value.strip()
                numeric = bool(re.fullmatch(r'-?(?:0|[1-9]\d*)(?:\.\d+)?', stripped))
                if numeric:
                    try:
                        numeric = math.isfinite(float(stripped))
                    except ValueError:
                        numeric = False
                if numeric:
                    return ('<table:table-cell table:style-name="Number" office:value-type="float" '
                            f'office:value="{stripped}"><text:p>{clean(stripped)}</text:p></table:table-cell>')
                style = 'Header' if header else 'Body'
                return (f'<table:table-cell table:style-name="{style}" office:value-type="string">'
                        f'<text:p>{clean(value)}</text:p></table:table-cell>')
            table_rows = ''.join('<table:table-row>' + ''.join(cell(value, index == 0) for value in row) +
                                 '</table:table-row>' for index, row in enumerate(rows))
            sheet_name = re.sub(r'[:\\/?*\[\]]', '_', task.get('title', '幕云AI表格')).strip()[:31] or '幕云AI表格'
            content = ('<?xml version="1.0" encoding="UTF-8"?>'
                '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
                'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
                'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
                'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
                'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" '
                'office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">'
                '<office:styles>'
                '<style:style style:name="Header" style:family="table-cell"><style:table-cell-properties fo:background-color="#2863DE" fo:padding="0.06in"/>'
                '<style:text-properties fo:color="#FFFFFF" fo:font-weight="bold" style:font-weight-asian="bold"/></style:style>'
                '<style:style style:name="Body" style:family="table-cell"><style:table-cell-properties fo:padding="0.06in" fo:border="0.5pt solid #DCE3EE"/></style:style>'
                '<style:style style:name="Number" style:family="table-cell"><style:table-cell-properties fo:padding="0.06in" fo:border="0.5pt solid #DCE3EE"/></style:style>'
                '</office:styles><office:automatic-styles>'
                '<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="11.69in" fo:page-height="8.27in" '
                'style:print-orientation="landscape" style:scale-to-X="1" style:scale-to-Y="0"/></style:page-layout>'
                '<style:style style:name="ta1" style:family="table" style:master-page-name="mp1"/>'
                '</office:automatic-styles><office:master-styles><style:master-page style:name="mp1" style:page-layout-name="pm1"/></office:master-styles>'
                '<office:body><office:spreadsheet><table:table table:name="' + clean(sheet_name) + '" table:style-name="ta1">'
                f'<table:table-column table:number-columns-repeated="{width}"/>' + table_rows +
                '</table:table></office:spreadsheet></office:body></office:document>')
            path = directory / 'spreadsheet.fods'
            path.write_text(content, encoding='utf-8')
            return {'files': [str(path.relative_to(self.root))], 'rows': len(rows), 'columns': width,
                    'stdout': f'表格结构已生成：{len(rows)} 行 × {width} 列'}
        if kind == 'render':
            source = self.root / next(iter(deps.values()))['files'][0]
            profile = directory / 'office-profile'
            base = ['soffice', '-env:UserInstallation=' + profile.as_uri(), '--headless', '--nologo', '--nodefault', '--norestore']
            logs = []
            for fmt in ['docx:Office Open XML Text', 'pdf:writer_pdf_Export']:
                logs.append(self.process([*base, '--convert-to', fmt, '--outdir', str(directory), str(source)], cancel))
            files = [directory / 'document.docx', directory / 'document.pdf']
            if not all(p.exists() and 0 < p.stat().st_size <= 20_000_000 for p in files):
                raise RuntimeError('LibreOffice 未生成完整且大小合规的 Word/PDF')
            return {'files': [str(p.relative_to(self.root)) for p in files], 'stdout': '\n'.join(logs)}
        if kind == 'sheet_render':
            source = self.root / next(iter(deps.values()))['files'][0]
            profile = directory / 'office-profile'
            base = ['soffice', '-env:UserInstallation=' + profile.as_uri(), '--headless', '--nologo', '--nodefault', '--norestore']
            logs = []
            for fmt in ['xlsx:Calc MS Excel 2007 XML', 'pdf:calc_pdf_Export']:
                logs.append(self.process([*base, '--convert-to', fmt, '--outdir', str(directory), str(source)], cancel))
            files = [directory / 'spreadsheet.xlsx', directory / 'spreadsheet.pdf']
            if not all(p.exists() and 0 < p.stat().st_size <= 20_000_000 for p in files):
                raise RuntimeError('LibreOffice 未生成完整且大小合规的 Excel/PDF')
            return {'files': [str(p.relative_to(self.root)) for p in files], 'stdout': '\n'.join(logs)}
        if kind in {'preview', 'sheet_preview'}:
            source = self.root / next(f for f in next(iter(deps.values()))['files'] if f.endswith('.pdf'))
            info = self.process(['pdfinfo', str(source)], cancel)
            pages = re.search(r'Pages:\s+(\d+)', info)
            if not pages or not 1 <= int(pages[1]) <= 20:
                raise RuntimeError('预览最多支持 20 页；PDF 可从渲染步骤下载')
            self.process(['pdftoppm', '-r', '80', '-png', str(source), str(directory / 'page')], cancel)
            files = sorted(directory.glob('page-*.png'))
            if len(files) != int(pages[1]):
                raise RuntimeError('页面图片数量不完整')
            return {'files': [str(p.relative_to(self.root)) for p in files], 'pages': len(files), 'stdout': f'已渲染 {len(files)} 页'}
        if kind == 'bundle':
            entries = []
            total = 0
            for dependency_id, result in deps.items():
                for relative in result.get('files', []):
                    source = (self.root / relative).resolve()
                    if not source.is_relative_to(self.root) or not source.is_file() or source.is_symlink():
                        raise RuntimeError('成果包包含无效文件')
                    size = source.stat().st_size
                    total += size
                    if total > 50_000_000 or len(entries) >= 50:
                        raise RuntimeError('成果包最多 50 个文件、总计 50MB')
                    entries.append((dependency_id, source, relative, size,
                                    hashlib.sha256(source.read_bytes()).hexdigest()))
            if not entries:
                raise RuntimeError('没有可汇总的成功成果')
            output = directory / 'muyun-deliverables.zip'
            manifest = {'schema_version': 1, 'brand': '幕云AI', 'files': []}
            with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
                names = set()
                for dependency_id, source, relative, size, digest in entries:
                    name = dependency_id + '/' + source.name
                    if name in names:
                        raise RuntimeError('成果包文件名冲突')
                    names.add(name)
                    archive.write(source, name)
                    manifest['files'].append({'path': name, 'source': relative, 'bytes': size, 'sha256': digest})
                archive.writestr('MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
            if output.stat().st_size > 50_000_000:
                output.unlink(missing_ok=True)
                raise RuntimeError('压缩后的成果包超过 50MB')
            return {'files': [str(output.relative_to(self.root))], 'fileCount': len(entries),
                    'stdout': f'已汇总 {len(entries)} 个文件，清单含 SHA-256'}
        if kind in {'python', 'javascript'}:
            extension = 'py' if kind == 'python' else 'js'
            directory.chmod(0o755)
            script = directory / ('main.' + extension)
            script.write_text(task['code'], encoding='utf-8')
            script.chmod(0o644)
            inputs = directory / 'input.json'
            inputs.write_text(json.dumps(deps, ensure_ascii=False), encoding='utf-8')
            inputs.chmod(0o644)
            image = os.environ.get('MUYUN_' + kind.upper() + '_IMAGE', 'python:3.12-slim' if kind == 'python' else 'node:22-slim')
            name = 'muyun-' + uuid.uuid4().hex
            output = self.process(docker_command(image, directory, name, kind), cancel, timeout=30, container=name)
            return {'stdout': output, 'files': [], 'isolation': 'docker_no_network_readonly'}
        raise ValueError('未知任务类型')

    def _artifact_bytes(self, relative):
        # Open every path component without following symlinks; bound memory before hashing.
        if not isinstance(relative, str) or "\\" in relative or "\x00" in relative:
            raise ValueError('成果路径无效')
        parts = relative.split('/')
        if len(parts) < 3 or any(p in {'', '.', '..'} for p in parts):
            raise ValueError('成果路径无效')
        fd = os.open(self.root, os.O_RDONLY | os.O_DIRECTORY)
        try:
            for part in parts[:-1]:
                child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                os.close(fd)
                fd = child
            file_fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
            with os.fdopen(file_fd, 'rb') as stream:
                info = os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode) or not 0 < info.st_size <= 50_000_000:
                    raise ValueError('成果必须为非空普通文件且不超过 50MB')
                data = stream.read(50_000_001)
                if len(data) != info.st_size:
                    raise ValueError('成果读取期间发生变化')
                return data
        finally:
            os.close(fd)

    def _check_entry(self, entry):
        data = self._artifact_bytes(entry['path'])
        if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError('成果完整性校验失败：文件已改变，请重新执行任务')
        return data

    def execute_checked(self, ident, task, deps, cancel):
        # All consumers recheck predecessor evidence before performing work.
        for result in deps.values():
            for entry in result.get('verification', {}).get('artifacts', []):
                self._check_entry(entry)
        result = self.execute(ident, task, deps, cancel)
        if cancel.is_set():
            raise RuntimeError('已取消')
        files = result.get('files') if isinstance(result, dict) else None
        if not isinstance(files, list) or len(files) > 50 or any(not isinstance(f, str) for f in files):
            raise ValueError('任务成果清单无效')
        if len(set(files)) != len(files) or (not files and task['kind'] not in {'python', 'javascript'}):
            raise ValueError('任务未产出文件或成果清单重复')
        entries, total = [], 0
        prefix = ident + '/' + task['id'] + '/'
        for relative in files:
            if not relative.startswith(prefix):
                raise ValueError('成果必须属于当前任务目录')
            data = self._artifact_bytes(relative)
            total += len(data)
            if total > 100_000_000:
                raise ValueError('任务成果总量超过 100MB')
            entries.append({'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        result['verification'] = {'schema_version': 1, 'status': 'passed',
            'scope': 'file_integrity' if files else 'process_exit_only',
            'checked_at': time.time(), 'artifacts': entries}
        return result

    def read_artifact(self, relative):
        with self.lock:
            for run in self.runs.values():
                for task in run['tasks']:
                    result = task.get('result', {})
                    if task['status'] != 'succeeded' or relative not in result.get('files', []):
                        continue
                    for entry in result.get('verification', {}).get('artifacts', []):
                        if entry['path'] == relative:
                            # HTTP serves these exact verified bytes, never a second path read.
                            return self._check_entry(entry)
                    raise ValueError('旧任务未记录成果校验，请重新执行后下载；原文件仍保留在本机')
            raise ValueError('成果不存在或尚未完成')

    def artifact(self, relative):
        # Compatibility for local inspection scripts; HTTP uses read_artifact directly.
        self.read_artifact(relative)
        return self.root / relative

    def close(self):
        with self.lock:
            self.closed = True
            for ident, run in self.runs.items():
                if run['status'] not in TERMINAL:
                    self.cancel(ident)
        self.pool.shutdown(wait=True)
        self.tick()
        self.db.close()
        self.instance_lock.close()
