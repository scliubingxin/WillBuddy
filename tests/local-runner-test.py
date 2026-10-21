"""Local execution regression: real threads/SQLite/HTTP; fake task work where noted."""
import http.client
import json
import hashlib
from pathlib import Path
import re
import sys
import tempfile
import threading
import time
import unittest
import zipfile
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner, document_plan, spreadsheet_plan, text_document_plan, docker_command, validate_plan, TERMINAL
from server import make_server
import genoffice_adapter
from restore_checkpoint import restore


def wait_run(runner, ident):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        runner.tick()
        run = runner.get(ident)
        if run['status'] in TERMINAL:
            return run
        time.sleep(0.01)
    raise AssertionError('scheduler timeout')


class Tests(unittest.TestCase):
    def test_genoffice_validation_and_fail_closed(self):
        task = genoffice_adapter.plan({'action': 'create_docx', 'payload': '# 中文报告'})
        self.assertEqual(validate_plan(task)['tasks'][0]['kind'], 'genoffice')
        for data in [
            {'action': 'shell', 'payload': 'whoami'},
            {'action': 'create_docx', 'payload': ''},
            {'action': 'create_docx', 'payload': '![image](file:///etc/passwd)'},
            {'action': 'create_pptx', 'payload': [{'op': 'addPicture', 'bytes': '/etc/passwd'}]},
            {'action': 'create_pptx', 'payload': [{'op': 'insert_content', 'html': '<img src="file:///etc/passwd">'}]},
            {'action': 'docs_read', 'input': {'extension': '../txt', 'base64': 'YQ=='}},
            {'action': 'info', 'input': {'extension': '.docx', 'base64': '!invalid'}},
            {'action': 'info', 'input': {'extension': '.docx', 'base64': 'YQ==' * 200000}},
            {'action': 'convert', 'input': {'extension': '.md', 'base64': 'YQ=='}, 'to': 'exe'},
        ]:
            with self.assertRaises(ValueError):
                genoffice_adapter.plan(data)
        with patch('genoffice_adapter.capability', return_value={'ready': False}):
            with self.assertRaisesRegex(ValueError, 'GenOffice'):
                self.runner.create(task)

    def test_genoffice_process_environment_and_output(self):
        task = genoffice_adapter.plan({'action': 'create_docx', 'payload': '# 合成验收'})['tasks'][0]
        def process(args, cancel, **kwargs):
            self.assertEqual(args[1:4], ['create', '--type', 'docx'])
            self.assertNotIn('DEEPSEEK_API_KEY', kwargs['env'])
            self.assertNotIn('VAULT_MASTER_KEY', kwargs['env'])
            self.assertEqual(kwargs['env']['GENOFFICE_ALLOWED_ROOTS'], kwargs['cwd'])
            Path(args[args.index('--out') + 1]).write_bytes(b'fake output for boundary test')
            return json.dumps({'status': 'ok', 'summary': 'created'})
        with patch('genoffice_adapter.executable', return_value='/synthetic/genoffice'), patch.object(self.runner, 'process', side_effect=process):
            result = self.runner.execute('test', task, {}, threading.Event())
            self.assertEqual(result['engine'], 'genoffice')
            self.assertEqual(len(result['files']), 2)

    def test_genoffice_office_preview_uses_libreoffice_and_poppler(self):
        import base64
        from io import BytesIO
        content = BytesIO()
        with zipfile.ZipFile(content, 'w') as archive:
            archive.writestr('[Content_Types].xml', '<Types/>')
        task = genoffice_adapter.plan({'action':'render', 'input':{'extension':'.docx',
            'base64':base64.b64encode(content.getvalue()).decode()}})['tasks'][0]
        calls = []
        def process(args, cancel, **kwargs):
            calls.append(args)
            self.assertNotIn('DEEPSEEK_API_KEY', kwargs['env'])
            self.assertNotIn('VAULT_MASTER_KEY', kwargs['env'])
            if args[0] == '/synthetic/soffice':
                out = Path(args[args.index('--outdir') + 1]) / 'input.pdf'
                out.write_bytes(b'%PDF-1.4\nfixture')
                return 'converted'
            if args[0] == '/synthetic/pdfinfo':
                return 'Pages:          2\n'
            if args[0] == '/synthetic/pdftoppm':
                prefix = Path(args[-1])
                for page in (1, 2):
                    prefix.with_name(prefix.name + f'-{page}.png').write_bytes(b'\x89PNG fixture')
                return ''
            raise AssertionError(args)
        tools = {'libreoffice':'/synthetic/soffice','pdfinfo':'/synthetic/pdfinfo','pdftoppm':'/synthetic/pdftoppm'}
        with patch('genoffice_adapter.render_executables', return_value=tools), patch.object(self.runner, 'process', side_effect=process):
            result = self.runner.execute('preview', task, {}, threading.Event())
            self.assertEqual(result['engine'], 'libreoffice-poppler')
            self.assertEqual(len(result['files']), 3)
            report = json.loads((self.runner.root / result['files'][-1]).read_text())
            self.assertEqual(report['detail']['engine'], 'LibreOffice + Poppler')
            self.assertEqual(report['detail']['pages'], 2)
            self.assertEqual([Path(call[0]).name for call in calls], ['soffice', 'pdfinfo', 'pdftoppm'])

    def test_genoffice_formula_edit_recalculates_with_native_engine(self):
        import base64
        from io import BytesIO
        content = BytesIO()
        with zipfile.ZipFile(content, 'w') as z:
            z.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="采购" sheetId="1" r:id="rId1"/></sheets></workbook>')
            z.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
            z.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="4"><c r="B4"><f>SUM(B2:B3)</f><v>35</v></c></row></sheetData></worksheet>')
        workbook = content.getvalue()
        task = genoffice_adapter.plan({'action':'sheet_apply','payload':[{'op':'set_cell','address':'B2','value':20}],
            'input':{'extension':'.xlsx','base64':base64.b64encode(workbook).decode()}})['tasks'][0]
        calls = []
        def process(args, cancel, **kwargs):
            calls.append(args)
            if '--cells' in args:
                cells = json.loads(Path(args[args.index('--cells') + 1]).read_text())
                self.assertEqual(cells, [{'cell':'B4','sheet':'采购','formula':'=SUM(B2:B3)'}])
                refreshed = BytesIO()
                with zipfile.ZipFile(BytesIO(workbook)) as source, zipfile.ZipFile(refreshed, 'w') as target:
                    for name in source.namelist():
                        data = source.read(name)
                        target.writestr(name, data.replace(b'<v>35</v>', b'<v>43</v>'))
                Path(args[args.index('--out') + 1]).write_bytes(refreshed.getvalue())
                return json.dumps({'status':'ok','detail':{'formulas':1,'cached_values':True}})
            Path(args[args.index('--out') + 1]).write_bytes(workbook)
            return json.dumps({'status':'ok','summary':'edited'})
        with patch('genoffice_adapter.executable', return_value='/synthetic/genoffice'), patch.object(self.runner, 'process', side_effect=process):
            result = self.runner.execute('formula', task, {}, threading.Event())
            self.assertEqual(len(calls), 2)
            report_file = next(path for path in result['files'] if path.endswith('genoffice-report.json'))
            report = json.loads((self.runner.root / report_file).read_text())
            self.assertEqual(report['detail']['formula_refresh']['count'], 1)
            self.assertEqual(report['detail']['formula_refresh']['changed_cache_count'], 1)
            self.assertEqual(report['detail']['formula_refresh']['cache_changes'][0]['after'], '43')
            checkpoint = next(path for path in result['files'] if path.endswith('edit-checkpoint.zip'))
            with zipfile.ZipFile(self.runner.root / checkpoint) as archive:
                manifest = json.loads(archive.read('MANIFEST.json'))
                self.assertEqual(manifest['after']['sha256'], report['detail']['checkpoint']['after_sha256'])
                self.assertEqual(hashlib.sha256(archive.read('original.xlsx')).hexdigest(), manifest['before']['sha256'])
            current = self.runner.root / next(path for path in result['files'] if path.endswith('.xlsx'))
            restored = self.runner.root / 'restored.xlsx'
            restored_result = restore(self.runner.root / checkpoint, current, restored)
            self.assertTrue(restored_result['current_verified'])
            self.assertEqual(restored.read_bytes(), workbook)
            with self.assertRaisesRegex(ValueError, '已存在'):
                restore(self.runner.root / checkpoint, current, restored)
            conflict = self.runner.root / 'conflict.xlsx'
            conflict.write_bytes(current.read_bytes() + b'changed')
            with self.assertRaisesRegex(ValueError, '新修改'):
                restore(self.runner.root / checkpoint, conflict, self.runner.root / 'refused.xlsx')
            malformed = self.runner.root / 'malformed.zip'
            with zipfile.ZipFile(malformed, 'w') as archive:
                archive.writestr('original.xlsx', b'old')
                archive.writestr('MANIFEST.json', '{}')
            with self.assertRaisesRegex(ValueError, '格式无效|不支持'):
                restore(malformed, current, self.runner.root / 'malformed-restored.xlsx')

    def test_genoffice_input_mutation_stops_edit_delivery(self):
        import base64
        document = b'PK synthetic trusted office fixture'
        task = {'id':'edit', 'kind':'genoffice', 'title':'edit', 'action':'docs_apply',
                'payload':[], 'dependsOn':[],
                'input':{'extension':'.docx','base64':base64.b64encode(document).decode()}}
        # Validation of real OOXML is exercised elsewhere; this test isolates an
        # engine that unexpectedly changes its task-local input during apply.
        def process(args, cancel, **kwargs):
            source = Path(args[3])
            source.write_bytes(document + b' mutated')
            Path(args[args.index('--out') + 1]).write_bytes(document + b' result')
            return json.dumps({'status':'ok','summary':'edited'})
        with patch('genoffice_adapter.validate'), patch('genoffice_adapter.executable', return_value='/synthetic/genoffice'), patch.object(self.runner, 'process', side_effect=process):
            with self.assertRaisesRegex(RuntimeError, '修改了输入'):
                self.runner.execute('mutated', task, {}, threading.Event())

    def test_genoffice_shared_formula_edit_fails_closed(self):
        import base64
        from io import BytesIO
        content = BytesIO()
        with zipfile.ZipFile(content, 'w') as z:
            z.writestr('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>')
            z.writestr('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
            z.writestr('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="4"><c r="B4"><f t="shared" si="0">SUM(B2:B3)</f><v>35</v></c></row></sheetData></worksheet>')
        workbook = content.getvalue()
        task = genoffice_adapter.plan({'action':'sheet_apply','payload':[{'op':'set_cell','address':'B2','value':20}],
            'input':{'extension':'.xlsx','base64':base64.b64encode(workbook).decode()}})['tasks'][0]
        def process(args, cancel, **kwargs):
            Path(args[args.index('--out') + 1]).write_bytes(workbook)
            return json.dumps({'status':'ok','summary':'edited'})
        with patch('genoffice_adapter.executable', return_value='/synthetic/genoffice'), patch.object(self.runner, 'process', side_effect=process) as mocked:
            with self.assertRaisesRegex(RuntimeError, '共享、数组或结构化公式'):
                self.runner.execute('shared-formula', task, {}, threading.Event())
            self.assertEqual(mocked.call_count, 1)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.runner = Runner(self.tmp.name, 2)

    def tearDown(self):
        self.runner.close()
        self.tmp.cleanup()

    def test_artifact_evidence_and_same_size_tamper(self):
        run = wait_run(self.runner, self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': '验收正文'}]})['id'])
        result = run['tasks'][0]['result']
        entry = result['verification']['artifacts'][0]
        data = self.runner.read_artifact(entry['path'])
        self.assertEqual(entry['bytes'], len(data))
        self.assertEqual(entry['sha256'], hashlib.sha256(data).hexdigest())
        path = self.runner.root / entry['path']
        path.write_bytes(b'X' * len(data))
        with self.assertRaisesRegex(ValueError, '完整性'):
            self.runner.read_artifact(entry['path'])
        self.runner.close()
        self.runner = Runner(self.tmp.name)
        with self.assertRaisesRegex(ValueError, '完整性'):
            self.runner.read_artifact(entry['path'])

    def test_missing_empty_duplicate_foreign_and_symlink_outputs_fail(self):
        for mode in ['missing', 'empty', 'duplicate', 'foreign', 'symlink', 'directory_link', 'fifo', 'no_files']:
            def work(ident, task, deps, cancel):
                folder = self.runner.root / ident / task['id']
                folder.mkdir(parents=True)
                path = folder / 'result.txt'
                if mode == 'missing':
                    pass
                elif mode == 'symlink':
                    path.symlink_to(self.runner.root / 'runner.sqlite3')
                elif mode == 'directory_link':
                    (folder / 'link').symlink_to(folder, target_is_directory=True)
                    path.write_text('fixture')
                    path = folder / 'link' / 'result.txt'
                elif mode == 'fifo':
                    import os
                    os.mkfifo(path)
                else:
                    path.write_text('' if mode == 'empty' else 'fixture')
                relative = str(path.relative_to(self.runner.root))
                return {'files': [] if mode == 'no_files' else ([relative, relative] if mode == 'duplicate' else (['other/task/file'] if mode == 'foreign' else [relative]))}
            self.runner.execute = work
            with self.subTest(mode=mode):
                run = wait_run(self.runner, self.runner.create({'tasks': [
                    {'id': 'a', 'kind': 'document', 'text': 'a'},
                    {'id': 'b', 'kind': 'document', 'text': 'b', 'dependsOn': ['a']}]})['id'])
                self.assertEqual([t['status'] for t in run['tasks']], ['failed', 'blocked'])
                self.assertNotIn('result', run['tasks'][0])

    def test_dependency_tamper_prevents_next_execute(self):
        run = wait_run(self.runner, self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a'}]})['id'])
        result = run['tasks'][0]['result']
        (self.runner.root / result['files'][0]).write_text('changed')
        with patch.object(self.runner, 'execute') as execute:
            with self.assertRaisesRegex(ValueError, '完整性'):
                self.runner.execute_checked(run['id'], {'id': 'b'}, {'a': result}, threading.Event())
            execute.assert_not_called()

    def test_legacy_evidence_and_injected_result_are_not_trusted(self):
        run = self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a',
                                            'result': {'files': ['runner.sqlite3']}, 'error': 'fake'}]})
        self.assertNotIn('result', run['tasks'][0])
        self.assertNotIn('error', run['tasks'][0])
        run = wait_run(self.runner, run['id'])
        task = self.runner.runs[run['id']]['tasks'][0]
        task['result'].pop('verification')
        with self.assertRaisesRegex(ValueError, '旧任务'):
            self.runner.read_artifact(task['result']['files'][0])

    def test_executable_acceptance_passes_and_failed_content_fails_batch(self):
        plan = {'tasks': [{'id': 'report', 'kind': 'document', 'text': '项目已完成复核'}],
                'acceptance': [
                    {'id': 'file', 'task': 'report', 'type': 'artifact_exists', 'extension': '.fodt', 'minBytes': 50},
                    {'id': 'content', 'task': 'report', 'type': 'text_contains', 'extension': '.fodt', 'value': '已完成复核'}]}
        run = wait_run(self.runner, self.runner.create(plan)['id'])
        self.assertEqual(run['status'], 'succeeded')
        self.assertEqual(run['acceptance']['status'], 'passed')
        self.assertTrue(all(item['evidence']['sha256'] for item in run['acceptance']['results']))

        plan['acceptance'][1]['value'] = '不存在的批准结论'
        run = wait_run(self.runner, self.runner.create(plan)['id'])
        self.assertEqual(run['tasks'][0]['status'], 'succeeded')
        self.assertEqual(run['status'], 'failed')
        self.assertEqual(run['acceptance']['status'], 'failed')
        self.assertIn('未包含', run['acceptance']['results'][1]['error'])
        self.assertEqual(run['events'][-1]['type'], 'acceptance_failed')
        with self.assertRaisesRegex(ValueError, '修改计划'):
            self.runner.retry(run['id'])

    def test_manual_retry_reuses_verified_success_and_reruns_only_incomplete(self):
        calls = []
        failed_once = set()
        def work(ident, task, deps, cancel):
            calls.append(task['id'])
            if task['id'] == 'b' and 'b' not in failed_once:
                failed_once.add('b')
                raise RuntimeError('一次性失败样例')
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / 'result.txt'
            path.write_text(task['id'])
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        plan = {'name':'断点重试', 'tasks': [
            {'id':'a','kind':'document','text':'a'},
            {'id':'b','kind':'document','text':'b'},
            {'id':'c','kind':'document','text':'c','dependsOn':['a','b']},
        ], 'planning': {'mode': 'deterministic_document_brief_v1', 'sourceSha256': 'a' * 64,
                        'itemCount': 2, 'warnings': ['人工审阅后提交']}}
        first = wait_run(self.runner, self.runner.create(plan)['id'])
        self.assertEqual([t['status'] for t in first['tasks']], ['succeeded','failed','blocked'])
        original = first['tasks'][0]['result']['verification']['artifacts'][0]
        retried = self.runner.retry(first['id'])
        self.assertEqual(retried['retryOf'], first['id'])
        self.assertEqual(retried['attempt'], 2)
        self.assertEqual(retried['tasks'][0]['reusedFrom']['run'], first['id'])
        self.assertEqual(retried['tasks'][0]['result']['verification']['artifacts'][0], original)
        self.assertEqual(retried['planning'], plan['planning'])
        retried = wait_run(self.runner, retried['id'])
        self.assertEqual(retried['status'], 'succeeded')
        self.assertEqual(calls, ['a','b','b','c'])
        self.assertEqual([e['type'] for e in retried['events'][:2]], ['reused','retry_created'])

    def test_retry_refuses_tampered_reused_artifact(self):
        def work(ident, task, deps, cancel):
            if task['id'] == 'b':
                raise RuntimeError('失败样例')
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / 'result.txt'
            path.write_text('trusted')
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        first = wait_run(self.runner, self.runner.create({'tasks': [
            {'id':'a','kind':'document','text':'a'}, {'id':'b','kind':'document','text':'b'}]})['id'])
        entry = first['tasks'][0]['result']['verification']['artifacts'][0]
        (self.runner.root / entry['path']).write_text('changed')
        with self.assertRaisesRegex(ValueError, '完整性'):
            self.runner.retry(first['id'])

    def test_json_acceptance_uses_typed_path_and_rechecks_integrity(self):
        def work(ident, task, deps, cancel):
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True)
            path = folder / 'report.json'
            path.write_text(json.dumps({'detail': {'rows': [['金额'], [43]]}}, ensure_ascii=False))
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        plan = {'tasks': [{'id': 'read', 'kind': 'document', 'text': 'fixture'}],
                'acceptance': [{'id': 'known_answer', 'task': 'read', 'type': 'json_equals',
                                'extension': '.json', 'path': ['detail', 'rows', 1, 0], 'expected': 43}]}
        run = wait_run(self.runner, self.runner.create(plan)['id'])
        self.assertEqual(run['acceptance']['results'][0]['evidence']['actual'], 43)
        self.assertEqual(run['status'], 'succeeded')
        with self.assertRaises(ValueError):
            validate_plan({**plan, 'acceptance': [{**plan['acceptance'][0], 'path': ['detail', -1]}]})

    def test_acceptance_schema_rejects_unsafe_or_ambiguous_rules(self):
        task = {'id': 'a', 'kind': 'document', 'text': 'x'}
        invalid = [
            [{'id': 'x', 'task': 'missing', 'type': 'artifact_exists', 'extension': '.txt'}],
            [{'id': 'x', 'task': 'a', 'type': 'text_contains', 'extension': '.docx', 'value': 'x'}],
            [{'id': 'x', 'task': 'a', 'type': 'json_equals', 'extension': '.json', 'path': [], 'expected': {}}],
            [{'id': 'x', 'task': 'a', 'type': 'artifact_exists', 'extension': '../txt'}],
        ]
        for acceptance in invalid:
            with self.subTest(acceptance=acceptance), self.assertRaises(ValueError):
                validate_plan({'tasks': [task], 'acceptance': acceptance})

    def test_plan_decomposition_and_validation(self):
        plan = document_plan([{'title': '甲', 'text': '文档甲'}, {'title': '乙', 'text': '文档乙'}])
        self.assertEqual(len(plan['tasks']), 7)
        self.assertEqual(plan['tasks'][5]['dependsOn'], ['doc_2_render'])
        self.assertEqual(plan['tasks'][6]['kind'], 'bundle')
        self.assertEqual(len(plan['tasks'][6]['dependsOn']), 4)
        self.assertEqual(len(plan['acceptance']), 5)
        self.assertEqual(plan['policy'], {'maxConcurrency': 2, 'maxRunSeconds': 600, 'maxArtifactBytes': 200_000_000})
        for tasks in [[], [{'id': '../bad', 'kind': 'document'}], [{'id': 'a', 'kind': 'shell'}],
                      [{'id': 'a', 'kind': 'python', 'code': '1', 'dependsOn': ['b']}, {'id': 'b', 'kind': 'python', 'code': '1', 'dependsOn': ['a']}],
                      [{'id': 'a', 'kind': 'document', 'text': 'x'}, {'id': 'a', 'kind': 'document', 'text': 'y'}],
                      [{'id': 'a', 'kind': 'preview', 'dependsOn': ['missing']}],
                      [{'id': 'a', 'kind': 'document', 'text': 'x'}, {'id': 'b', 'kind': 'bundle', 'dependsOn': ['a']}]]:
            with self.assertRaises(ValueError):
                validate_plan({'tasks': tasks})

    def test_chinese_brief_compiles_to_reviewable_fixed_dag(self):
        brief = ('请生成以下文档：\n'
                 '1. 采购复盘：本月采购设备 35 台，负责人张三，风险项保持待确认。\n'
                 '2、维护计划：检查轴承温度，记录巡检时间和维护人。')
        plan = text_document_plan(brief)
        self.assertEqual(plan['name'], '中文简报生成与渲染')
        self.assertEqual(len(plan['tasks']), 7)
        self.assertEqual(len(plan['acceptance']), 5)
        self.assertEqual(plan['tasks'][0]['title'], '采购复盘')
        self.assertIn('35 台', plan['tasks'][0]['text'])
        self.assertEqual(plan['planning']['mode'], 'deterministic_document_brief_v1')
        self.assertEqual(plan['planning']['itemCount'], 2)
        self.assertRegex(plan['planning']['sourceSha256'], r'^[0-9a-f]{64}$')
        self.assertIn('未使用模型推断', plan['planning']['warnings'][0])

    def test_chinese_brief_rejects_ambiguous_or_forged_input(self):
        invalid = [
            '采购复盘：正文',
            '1. 采购复盘没有分隔符',
            '1. 采购复盘：正文\n补充一行未编号内容',
            '1. 重复：甲\n2. 重复：乙',
            '1. 标题：',
            '\n'.join(f'{index}. 文档{index}：正文' for index in range(1, 12)),
        ]
        for brief in invalid:
            with self.subTest(brief=brief), self.assertRaises(ValueError):
                text_document_plan(brief)
        valid = text_document_plan('1. 标题：正文')
        for planning in [
            {**valid['planning'], 'sourceSha256': 'bad'},
            {**valid['planning'], 'unknown': True},
            {**valid['planning'], 'itemCount': True},
        ]:
            with self.subTest(planning=planning), self.assertRaises(ValueError):
                validate_plan({**valid, 'planning': planning})

    def test_policy_validation_and_serial_per_run_concurrency(self):
        task = {'id': 'a', 'kind': 'document', 'text': 'a'}
        for policy in [False, {'unknown': 1}, {'maxConcurrency': 0}, {'maxConcurrency': True},
                       {'maxRunSeconds': 0}, {'maxArtifactBytes': 500_000_001}]:
            with self.subTest(policy=policy), self.assertRaises(ValueError):
                validate_plan({'tasks': [task], 'policy': policy})
        intervals = {}
        def work(ident, current, deps, cancel):
            intervals[current['id']] = [time.time(), None]
            time.sleep(0.04)
            folder = self.runner.root / ident / current['id']
            folder.mkdir(parents=True)
            path = folder / 'result.txt'
            path.write_text(current['id'])
            intervals[current['id']][1] = time.time()
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        run = wait_run(self.runner, self.runner.create({'tasks': [
            {'id': 'a', 'kind': 'document', 'text': 'a'},
            {'id': 'b', 'kind': 'document', 'text': 'b'}],
            'policy': {'maxConcurrency': 1, 'maxRunSeconds': 60, 'maxArtifactBytes': 10000}})['id'])
        self.assertEqual(run['status'], 'succeeded')
        self.assertGreaterEqual(intervals['b'][0], intervals['a'][1])
        self.assertEqual(run['policy']['maxConcurrency'], 1)

    def test_artifact_and_duration_budgets_fail_closed(self):
        oversized = wait_run(self.runner, self.runner.create({'tasks': [
            {'id': 'a', 'kind': 'document', 'text': '产生超过一字节的可信成果'}],
            'policy': {'maxConcurrency': 1, 'maxRunSeconds': 60, 'maxArtifactBytes': 1}})['id'])
        self.assertEqual(oversized['status'], 'failed')
        self.assertEqual(oversized['tasks'][0]['status'], 'succeeded')
        self.assertEqual(oversized['budgetFailure']['kind'], 'artifacts')
        self.assertEqual(oversized['budget']['status'], 'exceeded')
        self.assertEqual(oversized['acceptance']['status'], 'not_run')
        self.assertEqual([e['type'] for e in oversized['events']].count('budget_exceeded'), 1)

        slow_id = self.runner.create({'tasks': [
            {'id': 'a', 'kind': 'document', 'text': 'a'},
            {'id': 'b', 'kind': 'document', 'text': 'b', 'dependsOn': ['a']}],
            'policy': {'maxConcurrency': 1, 'maxRunSeconds': 1, 'maxArtifactBytes': 10000}})['id']
        self.runner.runs[slow_id]['created'] -= 2
        self.runner.tick()
        slow = self.runner.get(slow_id)
        self.assertEqual(slow['status'], 'failed')
        self.assertEqual(slow['budgetFailure']['kind'], 'duration')
        self.assertTrue(all(t['status'] == 'cancelled' for t in slow['tasks']))

    def test_retry_preserves_policy_and_counts_reused_artifacts(self):
        failed = set()
        def work(ident, task, deps, cancel):
            if task['id'] == 'b' and not failed:
                failed.add('b')
                raise RuntimeError('fixture')
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True)
            path = folder / 'result.txt'
            path.write_text(task['id'] * 20)
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        policy = {'maxConcurrency': 1, 'maxRunSeconds': 60, 'maxArtifactBytes': 1000}
        first = wait_run(self.runner, self.runner.create({'tasks': [
            {'id': 'a', 'kind': 'document', 'text': 'a'}, {'id': 'b', 'kind': 'document', 'text': 'b'}],
            'policy': policy})['id'])
        retried = self.runner.retry(first['id'])
        self.assertEqual(retried['policy'], policy)
        self.assertEqual(retried['tasks'][0]['status'], 'succeeded')
        retried = wait_run(self.runner, retried['id'])
        self.assertEqual(retried['status'], 'succeeded')
        self.assertEqual(retried['budget']['artifactBytes'], 40)

    def test_spreadsheet_plan_and_formula_style_text(self):
        plan = spreadsheet_plan([
            {'title': '采购/汇总', 'csv': '项目,数量,备注\n设备,35,=1+1'},
            {'title': '维护', 'csv': '设备,状态\n轴承,正常'},
        ])
        self.assertEqual(len(plan['tasks']), 7)
        self.assertEqual([t['kind'] for t in plan['tasks'][:3]], ['spreadsheet', 'sheet_render', 'sheet_preview'])
        self.assertEqual(len(plan['tasks'][-1]['dependsOn']), 4)
        self.assertEqual(len(plan['acceptance']), 5)
        one = wait_run(self.runner, self.runner.create({'tasks': [plan['tasks'][0]]})['id'])
        result = one['tasks'][0]['result']
        self.assertEqual((result['rows'], result['columns']), (2, 3))
        content = self.runner.artifact(result['files'][0]).read_text()
        self.assertIn('=1+1', content)
        self.assertNotIn('table:formula=', content)

    def test_real_threads_parallel_with_dependency_barrier(self):
        barrier = threading.Barrier(2, timeout=2)
        def work(ident, task, deps, cancel):
            if task['id'] in ['a', 'b']:
                barrier.wait()
                time.sleep(0.06)
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True)
            file = folder / 'fixture.txt'
            file.write_text(task['id'])
            return {'stdout': task['id'], 'files': [str(file.relative_to(self.runner.root))]}
        self.runner.execute = work  # Fake task content, real scheduler/thread overlap.
        plan = {'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a'}, {'id': 'b', 'kind': 'document', 'text': 'b'}, {'id': 'c', 'kind': 'document', 'text': 'c', 'dependsOn': ['a', 'b']}]}
        run = wait_run(self.runner, self.runner.create(plan)['id'])
        self.assertEqual(run['status'], 'succeeded')
        a, b, c = run['tasks']
        self.assertLess(max(a['started'], b['started']), min(a['ended'], b['ended']))
        self.assertGreaterEqual(c['started'], max(a['ended'], b['ended']))
        self.assertEqual(len(run['events']), 6)

    def test_fair_scheduler_gives_two_batches_a_slot_before_refill(self):
        barrier = threading.Barrier(2, timeout=2)
        starts = []
        def work(ident, task, deps, cancel):
            starts.append((ident, task['id'], time.time()))
            if len(starts) <= 2:
                barrier.wait()
            time.sleep(0.03)
            folder = self.runner.root / ident / task['id']
            folder.mkdir(parents=True)
            path = folder / 'result.txt'
            path.write_text(task['id'])
            return {'files': [str(path.relative_to(self.runner.root))]}
        self.runner.execute = work
        first = self.runner.create({'name': '大批次', 'tasks': [
            {'id': 'a1', 'kind': 'document', 'text': 'a1'},
            {'id': 'a2', 'kind': 'document', 'text': 'a2'},
            {'id': 'a3', 'kind': 'document', 'text': 'a3'}]})
        second = self.runner.create({'name': '小批次', 'tasks': [
            {'id': 'b1', 'kind': 'document', 'text': 'b1'}]})
        self.runner.tick()
        first_done = wait_run(self.runner, first['id'])
        second_done = wait_run(self.runner, second['id'])
        self.assertEqual({starts[0][0], starts[1][0]}, {first['id'], second['id']})
        self.assertLess(second_done['tasks'][0]['started'], first_done['tasks'][1]['started'])
        self.assertEqual(first_done['scheduler']['strategy'], 'fair_round_robin')
        self.assertEqual(first_done['scheduler']['dispatches'], 3)
        self.assertEqual(second_done['scheduler']['dispatches'], 1)
        self.assertTrue(all(event.get('scheduler') == 'fair_round_robin'
                            for event in first_done['events'] if event['type'] == 'started'))

    def test_fair_scheduler_rotates_single_global_slot(self):
        other_root = Path(self.tmp.name) / 'single-slot'
        other = Runner(other_root, 1)
        order = []
        def work(ident, task, deps, cancel):
            order.append(ident)
            folder = other.root / ident / task['id']
            folder.mkdir(parents=True)
            path = folder / 'result.txt'
            path.write_text(task['id'])
            time.sleep(0.02)
            return {'files': [str(path.relative_to(other.root))]}
        other.execute = work
        try:
            first = other.create({'tasks': [
                {'id': 'a1', 'kind': 'document', 'text': 'a1'},
                {'id': 'a2', 'kind': 'document', 'text': 'a2'}]})
            second = other.create({'tasks': [{'id': 'b1', 'kind': 'document', 'text': 'b1'}]})
            while any(run['status'] not in TERMINAL for run in other.list()):
                other.tick()
                time.sleep(0.01)
            self.assertEqual(order[:2], [first['id'], second['id']])
        finally:
            other.close()

    def test_failure_blocks_descendants_without_replay(self):
        calls = []
        def work(ident, task, deps, cancel):
            calls.append(task['id'])
            raise RuntimeError('failure fixture')
        self.runner.execute = work
        run = wait_run(self.runner, self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a'}, {'id': 'b', 'kind': 'document', 'text': 'b', 'dependsOn': ['a']}]})['id'])
        self.assertEqual([t['status'] for t in run['tasks']], ['failed', 'blocked'])
        self.runner.tick()
        self.assertEqual(calls, ['a'])

    def test_cancel_running_and_pending(self):
        def work(ident, task, deps, cancel):
            cancel.wait(1)
            if cancel.is_set():
                raise RuntimeError('cancelled')
        self.runner.execute = work
        ident = self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a'}, {'id': 'b', 'kind': 'document', 'text': 'b', 'dependsOn': ['a']}]})['id']
        self.runner.tick()
        self.runner.cancel(ident)
        run = wait_run(self.runner, ident)
        self.assertEqual(run['status'], 'cancelled')
        self.assertTrue(all(t['status'] == 'cancelled' for t in run['tasks']))

    def test_restart_does_not_replay(self):
        ident = self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'text': 'a'}]})['id']
        with self.assertRaisesRegex(ValueError, '已有执行器'):
            Runner(self.tmp.name)
        # Simulate stopped process without graceful cancellation; preserve queued durable state.
        self.runner.pool.shutdown()
        self.runner.db.close()
        self.runner.instance_lock.close()
        self.runner = Runner(self.tmp.name)
        self.assertEqual(self.runner.get(ident)['status'], 'interrupted')
        self.runner.tick()
        self.assertEqual(self.runner.get(ident)['tasks'][0]['status'], 'interrupted')
        retried = wait_run(self.runner, self.runner.retry(ident)['id'])
        self.assertEqual(retried['status'], 'succeeded')
        self.assertEqual(retried['retryOf'], ident)

    def test_unavailable_sandbox_fails_closed(self):
        with patch('engine.shutil.which', return_value=None):
            with self.assertRaisesRegex(ValueError, '沙盒不可用'):
                self.runner.create({'tasks': [{'id': 'code', 'kind': 'python', 'code': 'print(35)'}]})
        self.assertEqual(len(self.runner.list()), 0)

    def test_docker_command_boundary(self):
        command = docker_command('python:3.12-slim', '/tmp/muyun-test', 'muyun-test', 'python')
        for flag, value in [('--network', 'none'), ('--user', '65534:65534'), ('--memory', '256m'), ('--pids-limit', '64'), ('--pull', 'never')]:
            self.assertEqual(command[command.index(flag) + 1], value)
        self.assertIn('--read-only', command)
        self.assertEqual(command.count('--mount'), 1)
        self.assertTrue(command[command.index('--mount') + 1].endswith('readonly'))
        self.assertNotIn('/var/run/docker.sock', ' '.join(command))
        self.assertNotIn('--env', command)

    def test_missing_chinese_font_blocks_before_enqueue(self):
        caps = {'cjk_font': False, 'libreoffice': True, 'preview': True, 'code': {}}
        with patch.object(self.runner, 'capabilities', return_value=caps):
            with self.assertRaisesRegex(ValueError, '中文字体'):
                self.runner.create(document_plan([{'title': '中文标题', 'text': '正文'}]))
        self.assertEqual(self.runner.list(), [])

    def test_timeout_and_output_limit_real_processes(self):
        with self.assertRaisesRegex(RuntimeError, '超时'):
            self.runner.process([sys.executable, '-c', 'import time;time.sleep(10)'], threading.Event(), timeout=0.1)
        with self.assertRaisesRegex(RuntimeError, '日志超过'):
            self.runner.process([sys.executable, '-c', 'print("x"*100000)'], threading.Event())

    def test_document_escapes_markup_and_artifact_allowlist(self):
        run = wait_run(self.runner, self.runner.create({'tasks': [{'id': 'a', 'kind': 'document', 'title': '<title>', 'text': '<script> & 文本'}]})['id'])
        path = run['tasks'][0]['result']['files'][0]
        content = self.runner.artifact(path).read_text()
        self.assertIn('&lt;script&gt;', content)
        self.assertNotIn('<script>', content)
        with self.assertRaises(ValueError):
            self.runner.artifact('../runner.sqlite3')
        with self.assertRaises(ValueError):
            self.runner.artifact('runner.sqlite3')

    def test_bundle_has_hashed_manifest_and_only_dependency_artifacts(self):
        original = self.runner.capabilities
        self.runner.capabilities = lambda: {**original(), 'libreoffice': True, 'preview': True, 'cjk_font': True}
        def work(ident, task, deps, cancel):
            if task['kind'] != 'bundle':
                folder = self.runner.root / ident / task['id']
                folder.mkdir(parents=True, exist_ok=True)
                file = folder / ('result.pdf' if task['kind'] == 'render' else 'page-1.png')
                file.write_bytes(b'%PDF fixture' if task['kind'] == 'render' else b'PNG fixture')
                return {'files': [str(file.relative_to(self.runner.root))]}
            return Runner.execute(self.runner, ident, task, deps, cancel)
        self.runner.execute = work
        plan = {'tasks': [
            {'id': 'render', 'kind': 'render', 'dependsOn': ['document']},
            {'id': 'document', 'kind': 'document', 'text': 'fixture'},
            {'id': 'preview', 'kind': 'preview', 'dependsOn': ['render']},
            {'id': 'deliverables', 'kind': 'bundle', 'dependsOn': ['render', 'preview']},
        ]}
        run = wait_run(self.runner, self.runner.create(plan)['id'])
        bundle = self.runner.artifact(run['tasks'][3]['result']['files'][0])
        with zipfile.ZipFile(bundle) as archive:
            self.assertEqual(set(archive.namelist()), {'render/result.pdf', 'preview/page-1.png', 'MANIFEST.json'})
            manifest = json.loads(archive.read('MANIFEST.json'))
            for item in manifest['files']:
                self.assertEqual(item['sha256'], hashlib.sha256(archive.read(item['path'])).hexdigest())

    def test_http_origin_host_token_and_persistence(self):
        server = make_server(self.runner, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=3)
        def request(method, path, value=None, headers=None):
            conn.request(method, path, json.dumps(value) if value else None, headers or {})
            response = conn.getresponse()
            return response.status, response.read()
        try:
            status, page = request('GET', '/')
            self.assertEqual(status, 200)
            token = re.search(rb"const token='([^']+)'", page)[1].decode()
            auth = {'X-Muyun-Session': token, 'Content-Type': 'application/json'}
            self.assertEqual(request('GET', '/api/state')[0], 401)
            self.assertEqual(request('GET', '/api/state', headers={**auth, 'Origin': 'https://evil.invalid'})[0], 403)
            self.assertEqual(request('GET', '/', headers={'Host': 'evil.invalid'})[0], 403)
            status, created = request('POST', '/api/run', {'plan': {'tasks': [{'id': 'x', 'kind': 'document', 'text': '中文'}]}}, auth)
            self.assertEqual(status, 201)
            created_id = json.loads(created)['id']
            self.assertEqual(request('POST', '/api/cancel', {'id': created_id}, auth)[0], 200)
            wait_run(self.runner, created_id)
            status, retried = request('POST', '/api/retry', {'id': created_id}, auth)
            self.assertEqual(status, 201)
            self.assertEqual(json.loads(retried)['retryOf'], created_id)
            status, sheet = request('POST', '/api/sheet-plan', {'spreadsheets': [{'title': '数据', 'csv': '项目,数量\n设备,35'}]}, auth)
            self.assertEqual(status, 200)
            self.assertEqual(len(json.loads(sheet)['tasks']), 4)
            status, compiled = request('POST', '/api/text-plan', {'brief': '1. 中文计划：生成并渲染可审阅文档'}, auth)
            self.assertEqual(status, 200)
            compiled = json.loads(compiled)
            self.assertEqual(compiled['planning']['itemCount'], 1)
            self.assertEqual(len(compiled['tasks']), 4)
            self.assertEqual(len(json.loads(request('GET', '/api/state', headers=auth)[1])['runs']), 2)
            self.assertEqual(request('GET', '/api/files/..%2Frunner.sqlite3', headers=auth)[0], 400)
        finally:
            conn.close()
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == '__main__':
    unittest.main(verbosity=2)
