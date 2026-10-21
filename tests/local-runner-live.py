"""Real LibreOffice/Poppler local flow; no model request and no cloud login."""
import json
import hashlib
import http.client
from pathlib import Path
import sys
import time
import re
import threading
import zipfile
import xml.etree.ElementTree as ET
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner, document_plan, TERMINAL
from server import make_server

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'outputs/local-runner-live').resolve()
runner = Runner(root, concurrency=2)
server = make_server(runner, 0)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=10)
conn.request('GET', '/')
page = conn.getresponse().read()
token = re.search(rb"const token='([^']+)'", page)[1].decode()
def request(path, data=None):
    conn.request('POST' if data else 'GET', '/api/' + path, json.dumps(data) if data else None,
                 {'Content-Type': 'application/json', 'X-Muyun-Session': token})
    response = conn.getresponse()
    body = response.read()
    assert response.status < 300, body.decode()
    return json.loads(body)
try:
    brief = ('请生成以下两份文档：\n'
             '1. 幕云AI 采购交付验收：采购负责人张三；数量 12 台和 23 台，合计 35 台；交付要求核对设备型号、序列号和数量；资料不足的字段保留待确认。\n'
             '2. 幕云AI 设备维护记录：设备名称为合成验收设备；检查结果为温度正常、轴承无异常；下一步记录巡检时间与维护人；本文件为合成测试资料。')
    plan = request('text-plan', {'brief': brief})
    assert len(plan['tasks']) == 7
    assert plan['planning']['mode'] == 'deterministic_document_brief_v1'
    assert plan['planning']['itemCount'] == 2 and len(plan['planning']['sourceSha256']) == 64
    request('validate', {'plan': plan})
    ident = request('run', {'plan': plan})['id']
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        runner.tick()
        run = next(r for r in request('state')['runs'] if r['id'] == ident)
        if run['status'] in TERMINAL:
            break
        time.sleep(0.05)
    else:
        raise AssertionError('真实文档流程超时')
    assert run['status'] == 'succeeded', json.dumps(run, ensure_ascii=False)
    assert run['acceptance']['status'] == 'passed' and len(run['acceptance']['results']) == 5
    renders = [t for t in run['tasks'] if t['kind'] == 'render']
    assert max(t['started'] for t in renders) < min(t['ended'] for t in renders), '渲染任务没有真实重叠'
    for task in renders:
        files = task['result']['files']
        docx = runner.artifact(next(f for f in files if f.endswith('.docx')))
        with zipfile.ZipFile(docx) as z:
            assert z.testzip() is None
            xml = ET.fromstring(z.read('word/document.xml'))
            text = ''.join(xml.itertext())
            assert '幕云AI' in text
            if task['id'] == 'doc_1_render':
                assert '合计 35 台' in text and '张三' in text
            else:
                assert '温度正常' in text and '合成测试资料' in text
        pdf = runner.artifact(next(f for f in files if f.endswith('.pdf')))
        assert pdf.read_bytes().startswith(b'%PDF-')
        conn.request('GET', '/api/files/' + next(f for f in files if f.endswith('.pdf')), headers={'X-Muyun-Session': token})
        response = conn.getresponse()
        downloaded = response.read()
        assert response.status == 200 and downloaded == pdf.read_bytes(), 'HTTP 下载字节不一致'
    previews = [t for t in run['tasks'] if t['kind'] == 'preview']
    assert all(t['result']['pages'] >= 1 for t in previews)
    for task in previews:
        for f in task['result']['files']:
            assert runner.artifact(f).read_bytes().startswith(b'\x89PNG')
    bundle_task = next(t for t in run['tasks'] if t['kind'] == 'bundle')
    bundle = runner.artifact(bundle_task['result']['files'][0])
    with zipfile.ZipFile(bundle) as archive:
        assert archive.testzip() is None
        manifest = json.loads(archive.read('MANIFEST.json'))
        assert len(manifest['files']) == 6
        assert set(archive.namelist()) == {f['path'] for f in manifest['files']} | {'MANIFEST.json'}
        for item in manifest['files']:
            assert hashlib.sha256(archive.read(item['path'])).hexdigest() == item['sha256']
    conn.request('GET', '/api/files/' + bundle_task['result']['files'][0], headers={'X-Muyun-Session': token})
    response = conn.getresponse()
    assert response.status == 200 and response.read() == bundle.read_bytes(), 'HTTP ZIP 下载字节不一致'
    retry_plan = request('text-plan', {'brief': brief})
    interrupted_id = request('run', {'plan': retry_plan})['id']
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        runner.tick()
        interrupted = next(r for r in request('state')['runs'] if r['id'] == interrupted_id)
        if any(t['kind'] == 'render' and t['status'] == 'running' for t in interrupted['tasks']):
            request('cancel', {'id': interrupted_id})
            break
        time.sleep(0.02)
    else:
        raise AssertionError('未进入可取消的真实渲染阶段')
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        runner.tick()
        interrupted = next(r for r in request('state')['runs'] if r['id'] == interrupted_id)
        if interrupted['status'] in TERMINAL:
            break
        time.sleep(0.05)
    assert interrupted['status'] == 'cancelled'
    reusable = [t for t in interrupted['tasks'] if t['status'] == 'succeeded']
    assert len(reusable) >= 2 and all(t['result']['verification']['status'] == 'passed' for t in reusable)
    resumed = request('retry', {'id': interrupted_id})
    assert resumed['retryOf'] == interrupted_id and resumed['attempt'] == 2
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        runner.tick()
        resumed = next(r for r in request('state')['runs'] if r['id'] == resumed['id'])
        if resumed['status'] in TERMINAL:
            break
        time.sleep(0.05)
    assert resumed['status'] == 'succeeded' and resumed['acceptance']['status'] == 'passed'
    reused = [t for t in resumed['tasks'] if t.get('reusedFrom')]
    assert len(reused) == len(reusable)
    assert {t['id']: t['result']['verification'] for t in reused} == {
        t['id']: t['result']['verification'] for t in reusable}
    rejected_plan = request('validate', {'plan': {'name':'不达标成果拒绝实测',
        'tasks':[{'id':'draft','kind':'document','title':'验收失败样例','text':'这是待复核草稿','dependsOn':[]}],
        'acceptance':[{'id':'approval','task':'draft','type':'text_contains','extension':'.fodt','value':'已批准发布'}]}})
    rejected_id = request('run', {'plan': rejected_plan})['id']
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        runner.tick()
        rejected = next(r for r in request('state')['runs'] if r['id'] == rejected_id)
        if rejected['status'] in TERMINAL:
            break
        time.sleep(0.05)
    assert rejected['status'] == 'failed' and rejected['tasks'][0]['status'] == 'succeeded'
    assert rejected['acceptance']['status'] == 'failed' and '未包含' in rejected['acceptance']['results'][0]['error']
    serial_plan = request('validate', {'plan': {'name': '单批并发预算实测', 'tasks': [
        {'id': 'serial_a', 'kind': 'document', 'title': '串行甲', 'text': '并发预算实测甲', 'dependsOn': []},
        {'id': 'serial_b', 'kind': 'document', 'title': '串行乙', 'text': '并发预算实测乙', 'dependsOn': []}],
        'policy': {'maxConcurrency': 1, 'maxRunSeconds': 60, 'maxArtifactBytes': 1_000_000}}})
    serial_id = request('run', {'plan': serial_plan})['id']
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        runner.tick()
        serial = next(r for r in request('state')['runs'] if r['id'] == serial_id)
        if serial['status'] in TERMINAL:
            break
        time.sleep(0.02)
    assert serial['status'] == 'succeeded'
    serial_a, serial_b = serial['tasks']
    assert serial_b['started'] >= serial_a['ended'], '单批并发 1 未生效'
    assert serial['budget']['artifactBytes'] > 0 and serial['budget']['status'] == 'within'

    budget_plan = request('validate', {'plan': {'name': '成果总量预算拒绝实测', 'tasks': [
        {'id': 'oversized', 'kind': 'document', 'title': '预算负例', 'text': '此成果必然大于一个字节', 'dependsOn': []}],
        'acceptance': [{'id': 'would_pass', 'task': 'oversized', 'type': 'artifact_exists',
                        'extension': '.fodt', 'minBytes': 1}],
        'policy': {'maxConcurrency': 1, 'maxRunSeconds': 60, 'maxArtifactBytes': 1}}})
    budget_id = request('run', {'plan': budget_plan})['id']
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        runner.tick()
        budget = next(r for r in request('state')['runs'] if r['id'] == budget_id)
        if budget['status'] in TERMINAL:
            break
        time.sleep(0.02)
    assert budget['status'] == 'failed' and budget['tasks'][0]['status'] == 'succeeded'
    assert budget['budgetFailure']['kind'] == 'artifacts' and budget['budget']['status'] == 'exceeded'
    assert budget['acceptance']['status'] == 'not_run' and '预算已超限' in budget['acceptance']['reason']
    fair_a_plan = document_plan([{'title': '公平调度甲批', 'text': '甲批真实 LibreOffice 调度验收。'}])
    fair_b_plan = document_plan([{'title': '公平调度乙批', 'text': '乙批真实 LibreOffice 调度验收。'}])
    fair_a_id = request('run', {'plan': fair_a_plan})['id']
    fair_b_id = request('run', {'plan': fair_b_plan})['id']
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        runner.tick()
        state = request('state')['runs']
        fair_a = next(r for r in state if r['id'] == fair_a_id)
        fair_b = next(r for r in state if r['id'] == fair_b_id)
        if fair_a['status'] in TERMINAL and fair_b['status'] in TERMINAL:
            break
        time.sleep(0.03)
    assert fair_a['status'] == fair_b['status'] == 'succeeded'
    fair_a_first = next(e for e in fair_a['events'] if e['type'] == 'started')
    fair_b_first = next(e for e in fair_b['events'] if e['type'] == 'started')
    assert fair_a_first['scheduler'] == fair_b_first['scheduler'] == 'fair_round_robin'
    fair_a_render = next(t for t in fair_a['tasks'] if t['kind'] == 'render')
    fair_b_render = next(t for t in fair_b['tasks'] if t['kind'] == 'render')
    assert max(fair_a_render['started'], fair_b_render['started']) < min(fair_a_render['ended'], fair_b_render['ended'])
    report = {'status': 'passed', 'kind': 'real_http_libreoffice_poppler_local_dag', 'run_id': ident,
              'concurrency': 2, 'parallel_render_overlap': True, 'tasks': len(run['tasks']),
              'bundle_files': 6, 'bundle_manifest_sha256_verified': True,
              'text_plan': {'mode': run['planning']['mode'], 'item_count': run['planning']['itemCount'],
                            'source_sha256': run['planning']['sourceSha256'],
                            'human_review_required': True},
              'acceptance': {'positive': run['acceptance'], 'negative': rejected['acceptance'],
                             'negative_task_status': rejected['tasks'][0]['status']},
              'retry': {'source_status': interrupted['status'], 'reused_tasks': [t['id'] for t in reused],
                        'resumed_status': resumed['status'], 'acceptance': resumed['acceptance']['status']},
              'policy': {'serial_run': {'max_concurrency': serial['policy']['maxConcurrency'],
                                        'overlap': False, 'artifact_bytes': serial['budget']['artifactBytes']},
                         'artifact_limit_run': {'limit': budget['policy']['maxArtifactBytes'],
                                                'actual': budget['budget']['artifactBytes'],
                                                'status': budget['status'],
                                                'acceptance': budget['acceptance']['status']}},
              'fair_scheduler': {'strategy': fair_a['scheduler']['strategy'],
                                 'batch_a_status': fair_a['status'], 'batch_b_status': fair_b['status'],
                                 'first_dispatch_one_per_batch': True,
                                 'libreoffice_render_overlap': True,
                                 'batch_a_dispatches': fair_a['scheduler']['dispatches'],
                                 'batch_b_dispatches': fair_b['scheduler']['dispatches']},
              'model_requests': 0, 'tokens': 0,
              'tasks_detail': run['tasks'], 'visual_review': 'pending'}
    (root / 'acceptance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    conn.close()
    server.shutdown()
    server.server_close()
    thread.join()
    runner.close()
