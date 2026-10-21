"""GenOffice CLI integration (independent adapter, no upstream code copied).

Reference: genspark-ai/genoffice @ 316ded6f0a39235fec8d21c068d8a0766ee6172b.
Only explicit document operations; never shell, open, search or model commands.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import re
import time
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO

ACTIONS = {'create_docx', 'create_xlsx', 'create_pptx', 'info', 'docs_read', 'docs_check',
           'docs_apply', 'sheet_read', 'sheet_check', 'sheet_apply', 'slides_read',
           'slides_audit', 'slides_apply', 'convert', 'render'}
EXTENSIONS = {'.docx', '.xlsx', '.pptx', '.pdf', '.md', '.html', '.csv'}
TARGETS = {'docx', 'xlsx', 'pptx', 'pdf', 'md', 'html', 'csv'}
SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'


def formula_snapshot(path):
    """Return ordinary formulas and raw cached results; reject formula kinds we cannot safely rewrite."""
    try:
        with zipfile.ZipFile(path) as archive:
            workbook = ET.fromstring(archive.read('xl/workbook.xml'))
            rels = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
            targets = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels.findall(f'{{{PACKAGE_REL_NS}}}Relationship')}
            cells = []
            for sheet in workbook.findall(f'.//{{{SHEET_NS}}}sheet'):
                rel_id = sheet.attrib.get(f'{{{REL_NS}}}id')
                target = targets.get(rel_id, '')
                if target.startswith('/'):
                    entry = target.lstrip('/')
                else:
                    entry = 'xl/' + target.lstrip('/')
                entry = str(Path(entry))
                if not entry.startswith('xl/worksheets/'):
                    raise RuntimeError('公式工作表映射异常，已停止编辑')
                root = ET.fromstring(archive.read(entry))
                for cell in root.findall(f'.//{{{SHEET_NS}}}c'):
                    formula = cell.find(f'{{{SHEET_NS}}}f')
                    if formula is None:
                        continue
                    ref = cell.attrib.get('r', '')
                    text = formula.text or ''
                    if formula.attrib or not re.fullmatch(r'[A-Z]{1,3}[1-9][0-9]*', ref) or not text.strip():
                        raise RuntimeError('检测到共享、数组或结构化公式；当前安全重算仅支持普通单元格公式，已停止编辑')
                    cached = cell.find(f'{{{SHEET_NS}}}v')
                    cells.append({'cell': ref, 'sheet': sheet.attrib.get('name', ''),
                                  'formula': text if text.startswith('=') else '=' + text,
                                  'cached_value': None if cached is None else cached.text,
                                  'cached_type': cell.attrib.get('t', 'n')})
                    if len(cells) > 1000:
                        raise RuntimeError('公式超过 1000 个；为限制重算范围，已停止编辑')
            return cells
    except (KeyError, ET.ParseError, zipfile.BadZipFile) as error:
        raise RuntimeError('无法安全解析工作簿公式，已停止编辑') from error


def formula_cells(path):
    return [{key: item[key] for key in ('cell', 'sheet', 'formula')} for item in formula_snapshot(path)]


def executable():
    return shutil.which(os.environ.get('MUYUN_GENOFFICE_BIN', 'genoffice'))


def render_executables():
    """Resolve the fixed local compatibility renderer; paths never come from a task."""
    return {
        'libreoffice': shutil.which(os.environ.get('MUYUN_LIBREOFFICE_BIN', 'soffice')),
        'pdfinfo': shutil.which(os.environ.get('MUYUN_PDFINFO_BIN', 'pdfinfo')),
        'pdftoppm': shutil.which(os.environ.get('MUYUN_PDFTOPPM_BIN', 'pdftoppm')),
    }


def capability():
    binary = executable()
    render = render_executables()
    preview_ready = all(render.values())
    if not binary:
        return {'ready': False, 'reason': '未找到 GenOffice CLI；安装应用后设置 MUYUN_GENOFFICE_BIN',
                'office_preview': {'ready': preview_ready, 'engine': 'LibreOffice + Poppler'}}
    try:
        result = subprocess.run([binary, '--version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return {'ready': True, 'version': result.stdout.strip()[:120],
                    'reason': 'CLI 可用；表格需要 GenOffice 原生组件',
                    'office_preview': {'ready': preview_ready, 'engine': 'LibreOffice + Poppler'}}
    except (OSError, subprocess.TimeoutExpired):
        pass
    return {'ready': False, 'reason': 'GenOffice CLI 启动失败，请检查安装',
            'office_preview': {'ready': preview_ready, 'engine': 'LibreOffice + Poppler'}}


def validate(task):
    if task.get('action') not in ACTIONS:
        raise ValueError('不支持的 GenOffice 操作')
    if len(task.get('dependsOn', [])) > 1:
        raise ValueError('GenOffice 操作最多接收一个前置文件')
    action = task['action']
    payload = task.get('payload', '')
    if len(json.dumps(payload, ensure_ascii=False)) > 100000:
        raise ValueError('GenOffice 内容或操作超过 10 万字符')
    if action.startswith('create_'):
        if task.get('dependsOn') or task.get('input'):
            raise ValueError('创建文件不接受前置文件')
        if action == 'create_docx' and (not isinstance(payload, str) or not payload.strip()):
            raise ValueError('Word 正文不能为空')
        if action != 'create_docx' and not isinstance(payload, (list, dict)):
            raise ValueError('表格或演示文稿需要结构化 JSON')
    elif not task.get('dependsOn') and not task.get('input'):
        raise ValueError('请上传文件或选择前置成果')
    if task.get('input'):
        if task.get('dependsOn'):
            raise ValueError('上传文件与前置成果不能同时使用')
        source = task['input']
        if not isinstance(source, dict) or source.get('extension') not in EXTENSIONS:
            raise ValueError('不支持的 GenOffice 输入类型')
        try:
            encoded = source.get('base64', '')
            if not isinstance(encoded, str) or len(encoded) > 540000:
                raise ValueError()
            decoded = base64.b64decode(encoded, validate=True)
            if not 0 < len(decoded) <= 400000:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError('文件编码无效或超过 400KB')
        if source['extension'] in {'.docx', '.xlsx', '.pptx'}:
            try:
                with zipfile.ZipFile(BytesIO(decoded)) as archive:
                    entries = archive.infolist()
                    if len(entries)>2000 or sum(f.file_size for f in entries)>50000000:
                        raise ValueError('Office 解压大小超限')
                    if any('..' in Path(f.filename).parts or f.filename.startswith('/') or
                           'vbaproject' in f.filename.lower() for f in entries):
                        raise ValueError('拒绝路径异常或包含宏的 Office 文件')
            except zipfile.BadZipFile:
                raise ValueError('不是有效 Office ZIP 文件')
    if action == 'convert' and task.get('to') not in TARGETS:
        raise ValueError('不支持的目标格式')
    if action == 'render' and task.get('input', {}).get('extension') not in {None, '.docx', '.xlsx', '.pptx', '.pdf'}:
        raise ValueError('逐页预览仅支持 DOCX、XLSX、PPTX 或 PDF')
    if action.endswith('_apply') and not isinstance(payload, (list, dict)):
        raise ValueError('编辑操作需要 JSON 数组或对象')
    # Inline ops must not instruct the engine to fetch resources or read arbitrary paths.
    def inspect(value, depth=0):
        if depth > 25:
            raise ValueError('操作结构过深')
        if isinstance(value, dict):
            for key, item in value.items():
                if key.lower() in {'path', 'file', 'src', 'url', 'href', 'bytes', 'imageurl'}:
                    raise ValueError('当前适配不接受操作中的文件路径或外部资源')
                inspect(item, depth+1)
        elif isinstance(value, list):
            for item in value:
                inspect(item, depth+1)
        elif isinstance(value, str) and re.search(r'<\s*(img|script|iframe|object|embed|link|meta)\b|\b(?:src|href)\s*=|url\s*\(', value, re.I):
            raise ValueError('操作内容不接受活动 HTML 或外部资源')
    inspect(payload)
    if isinstance(payload, str) and ('![' in payload or '<img' in payload.lower()):
        raise ValueError('正文中的图片请先移除；本次适配不获取外部图片')


def plan(data):
    task = {'id': 'office', 'kind': 'genoffice', 'title': 'GenOffice 文档操作',
            'action': data.get('action'), 'payload': data.get('payload', ''), 'dependsOn': []}
    for key in ('input', 'to'):
        if key in data:
            task[key] = data[key]
    validate(task)
    return {'name': 'GenOffice · ' + task['action'], 'tasks': [task]}


def execute(runner, directory, task, deps, cancel):
    validate(task)
    action = task['action']
    binary = executable()
    if action != 'render' and not binary:
        raise RuntimeError('GenOffice CLI 不可用；未执行，也不会伪造文件')
    source = None
    if deps:
        candidates = [runner.root / f for result in deps.values() for f in result.get('files', [])
                      if Path(f).suffix in EXTENSIONS]
        if len(candidates) != 1:
            raise RuntimeError('前置任务必须输出唯一文档；报告或预览不能作为文档编辑输入')
        source = directory / ('input' + candidates[0].suffix)
        shutil.copyfile(runner.artifact(str(candidates[0].relative_to(runner.root))), source)
    elif task.get('input'):
        source = directory / ('input' + task['input']['extension'])
        source.write_bytes(base64.b64decode(task['input']['base64'], validate=True))
    source_before = None
    source_before_sha256 = None
    if action.endswith('_apply'):
        source_before = source.read_bytes()
        source_before_sha256 = hashlib.sha256(source_before).hexdigest()
    output = None
    if action.startswith('create_'):
        fmt = action.removeprefix('create_')
        payload = directory / ('content.md' if fmt == 'docx' else 'content.json')
        payload.write_text(task['payload'] if fmt == 'docx' else json.dumps(task['payload'], ensure_ascii=False), encoding='utf-8')
        output = directory / ('result.' + fmt)
        args = ['create', '--type', fmt, '--ops' if fmt == 'pptx' else '--from', str(payload), '--out', str(output)]
    elif action == 'convert':
        output = directory / ('result.' + task['to'])
        args = ['convert', str(source), '--to', task['to'], '--out', str(output)]
    elif action == 'render':
        if source.suffix not in {'.docx', '.xlsx', '.pptx', '.pdf'}:
            raise RuntimeError('逐页预览仅支持 DOCX、XLSX、PPTX 或 PDF')
        tools = render_executables()
        if not all(tools.values()):
            raise RuntimeError('Office 逐页预览需要 LibreOffice soffice 与 Poppler pdfinfo/pdftoppm')
        home = directory / 'home'
        home.mkdir()
        render_env = {key: os.environ[key] for key in ('PATH', 'LANG', 'LC_ALL', 'FONTCONFIG_FILE', 'FONTCONFIG_PATH') if key in os.environ}
        render_env.update(HOME=str(home), TMPDIR=str(directory))
        pdf = source
        if source.suffix != '.pdf':
            converted = directory / 'converted'
            converted.mkdir()
            profile = directory / 'libreoffice-profile'
            runner.process([tools['libreoffice'], '-env:UserInstallation=' + profile.as_uri(),
                            '--headless', '--nologo', '--nodefault', '--norestore',
                            '--convert-to', 'pdf', '--outdir', str(converted), str(source)],
                           cancel, timeout=120, cwd=str(directory), env=render_env)
            pdf = converted / (source.stem + '.pdf')
            if not pdf.is_file() or not 0 < pdf.stat().st_size <= 20_000_000:
                raise RuntimeError('LibreOffice 未生成完整且大小合规的 PDF')
        info = runner.process([tools['pdfinfo'], str(pdf)], cancel, timeout=30,
                              cwd=str(directory), env=render_env)
        pages_match = re.search(r'^Pages:\s+(\d+)\s*$', info, re.M)
        pages = int(pages_match.group(1)) if pages_match else 0
        if not 1 <= pages <= 20:
            raise RuntimeError('逐页预览最多支持 20 页，且必须能读取 PDF 页数')
        output = directory / 'pages'
        output.mkdir()
        runner.process([tools['pdftoppm'], '-scale-to', '1400', '-png', str(pdf), str(output / 'page')],
                       cancel, timeout=60, cwd=str(directory), env=render_env)
        files = sorted(output.glob('page-*.png'))
        if len(files) != pages or any(p.is_symlink() or not p.is_file() or not 0 < p.stat().st_size <= 20_000_000 for p in files):
            raise RuntimeError('Poppler 页面预览不完整或超限')
        report = {'status': 'ok', 'summary': f'已生成 {pages} 页 Office 预览',
                  'detail': {'engine': 'LibreOffice + Poppler', 'pages': pages,
                             'source_type': source.suffix.removeprefix('.'),
                             'render_contract': 'compatibility preview; not GenOffice native rendering'}}
        report_path = directory / 'genoffice-report.json'
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        files.append(report_path)
        return {'files': [str(p.relative_to(runner.root)) for p in files],
                'engine': 'libreoffice-poppler', 'stdout': report['summary'], 'warnings': []}
    elif action == 'info':
        args = ['info', str(source)]
    else:
        domain, verb = action.split('_')
        expected = {'docs': '.docx', 'sheet': '.xlsx', 'slides': '.pptx'}[domain]
        if source.suffix != expected:
            raise RuntimeError('操作与文件类型不匹配')
        args = [domain, verb, str(source)]
        if verb == 'apply':
            ops = directory / 'ops.json'
            ops.write_text(json.dumps(task['payload'], ensure_ascii=False), encoding='utf-8')
            output = directory / ('result' + expected)
            args.extend(['--ops', str(ops), '--out', str(output)])
    # Document engines are trusted local applications, not code sandboxes. Do not
    # forward the runner's cloud keys, identity, provider settings or general env.
    home = directory / 'home'
    home.mkdir()
    env = {key: os.environ[key] for key in ('PATH', 'LANG', 'LC_ALL', 'DISPLAY', 'XAUTHORITY',
           'FONTCONFIG_FILE', 'FONTCONFIG_PATH', 'XDG_RUNTIME_DIR') if key in os.environ}
    for key in ('GENOFFICE_APP_BIN', 'GENOFFICE_NODE', 'XLSX_SIDECAR_PATH', 'GENOFFICE_PDFIUM_WASM'):
        if key in os.environ:
            env[key] = os.environ[key]
    env.update(HOME=str(home), GENOFFICE_AUTH_DIR=str(home), GENOFFICE_USER_DATA=str(home),
               GENOFFICE_AI_SETTINGS=str(home / 'none.json'), GENOFFICE_AUDIT_LOG='off',
               GENOFFICE_ALLOWED_ROOTS=str(directory), TMPDIR=str(directory))
    raw = runner.process([binary, *args, '--json'], cancel, timeout=120, cwd=str(directory), env=env)
    try:
        report = json.loads(raw)
    except ValueError:
        raise RuntimeError('GenOffice 未返回有效 JSON，任务未标记成功')
    if report.get('status') != 'ok':
        raise RuntimeError('GenOffice 未确认成功：' + str(report.get('message', report.get('summary', '未知错误')))[:500])
    if action == 'sheet_apply':
        # GenOffice 0.10.639 applies cell edits but does not automatically refresh
        # dependent cached values. Re-submit every ordinary formula through the
        # same native sheet engine, which recalculates the workbook before delivery.
        before = formula_snapshot(output)
        formulas = [{key: item[key] for key in ('cell', 'sheet', 'formula')} for item in before]
        if formulas:
            refresh_ops = directory / 'formula-refresh.json'
            refresh_ops.write_text(json.dumps(formulas, ensure_ascii=False), encoding='utf-8')
            refreshed = directory / 'formula-refreshed.xlsx'
            refresh_raw = runner.process([binary, 'sheet', 'apply', str(output), '--cells', str(refresh_ops),
                                          '--out', str(refreshed), '--json'], cancel, timeout=120,
                                         cwd=str(directory), env=env)
            try:
                refresh = json.loads(refresh_raw)
            except ValueError:
                raise RuntimeError('GenOffice 公式重算未返回有效 JSON，未交付编辑结果')
            if refresh.get('status') != 'ok' or refresh.get('detail', {}).get('formulas') != len(formulas) or not refresh.get('detail', {}).get('cached_values'):
                raise RuntimeError('GenOffice 未确认全部公式已重算，未交付编辑结果')
            after = formula_snapshot(refreshed)
            after_formulas = [{key: item[key] for key in ('cell', 'sheet', 'formula')} for item in after]
            if after_formulas != formulas:
                raise RuntimeError('GenOffice 重算后的公式集合发生变化，未交付编辑结果')
            if any(item['cached_value'] is None for item in after):
                raise RuntimeError('GenOffice 重算后仍有公式缺少缓存结果，未交付编辑结果')
            changes = [{'sheet': old['sheet'], 'cell': old['cell'],
                        'before': old['cached_value'], 'after': new['cached_value']}
                       for old, new in zip(before, after)
                       if old['cached_value'] != new['cached_value'] or old['cached_type'] != new['cached_type']]
            refreshed.replace(output)
            report.setdefault('detail', {})['formula_refresh'] = {
                'method': 'GenOffice native formula re-apply', 'count': len(formulas),
                'sheets': sorted({item['sheet'] for item in formulas}),
                'cached_values': True, 'changed_cache_count': len(changes),
                'cache_changes': changes[:100], 'cache_changes_truncated': len(changes) > 100
            }
    files = []
    if output:
        files = sorted(output.glob('*.png')) if action == 'render' else [output]
        if not 1 <= len(files) <= 20 or any(p.is_symlink() or not p.is_file() or not 0 < p.stat().st_size <= 20000000 for p in files):
            raise RuntimeError('GenOffice 成果缺失或超限（最多 20 页，每文件 20MB）')
    if action.endswith('_apply'):
        # The uploaded/predecessor document is immutable. Capture a portable
        # checkpoint only after the engine has produced a valid separate result.
        if source.read_bytes() != source_before:
            raise RuntimeError('文档引擎修改了输入文件；已停止交付，请保留原文件并检查引擎')
        after = output.read_bytes()
        after_sha256 = hashlib.sha256(after).hexdigest()
        checkpoint_manifest = {
            'schema_version': 1, 'brand': '幕云AI', 'kind': 'office_edit_checkpoint',
            'action': action, 'extension': source.suffix,
            'created_at': time.time(),
            'before': {'path': 'original' + source.suffix, 'bytes': len(source_before),
                       'sha256': source_before_sha256},
            'after': {'bytes': len(after), 'sha256': after_sha256},
            'restore_policy': 'current file must match after.sha256; restore writes a new file'
        }
        checkpoint = directory / 'edit-checkpoint.zip'
        with zipfile.ZipFile(checkpoint, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            archive.writestr('original' + source.suffix, source_before)
            archive.writestr('MANIFEST.json', json.dumps(checkpoint_manifest, ensure_ascii=False, indent=2) + '\n')
        if checkpoint.stat().st_size > 25_000_000:
            checkpoint.unlink(missing_ok=True)
            raise RuntimeError('编辑检查点超过 25MB，已停止交付')
        report.setdefault('detail', {})['checkpoint'] = {
            'before_sha256': source_before_sha256, 'after_sha256': after_sha256,
            'input_unchanged': True, 'restore_conflict_protection': True
        }
        files.append(checkpoint)
    report_path = directory / 'genoffice-report.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    files.append(report_path)
    return {'files': [str(p.relative_to(runner.root)) for p in files], 'engine': 'genoffice',
            'stdout': str(report.get('summary', '文档操作完成')), 'warnings': report.get('warnings', [])}
