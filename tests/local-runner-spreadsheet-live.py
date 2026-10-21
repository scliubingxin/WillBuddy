"""Real localhost + LibreOffice spreadsheet flow; synthetic data, no model request."""
import hashlib
import http.client
import json
from pathlib import Path
import re
import sys
import threading
import time
import zipfile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner, TERMINAL
from server import make_server

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'outputs/local-runner-sheet-live').resolve()
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

def xlsx_values(path):
    ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root_xml = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared = [''.join(node.itertext()) for node in root_xml.findall('x:si', ns)]
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert not sheet.findall('.//x:f', ns), '公式样式输入不能成为活动公式'
        values = []
        for row in sheet.findall('.//x:sheetData/x:row', ns):
            current = []
            for cell in row.findall('x:c', ns):
                kind = cell.get('t')
                if kind == 'inlineStr':
                    value = ''.join(cell.find('x:is', ns).itertext())
                else:
                    node = cell.find('x:v', ns)
                    value = '' if node is None else node.text
                    if kind == 's':
                        value = shared[int(value)]
                current.append(value)
            values.append(current)
        return values

try:
    spreadsheets = [
        {'title': '采购数据汇总', 'csv': '项目,负责人,数量,备注\n设备A,张三,12,进行中\n设备B,李四,23,已完成\n合计,,35,=1+1'},
        {'title': '设备维护记录', 'csv': '设备,状态,温度\n轴承,正常,36.5\n电机,待复核,41.2'},
    ]
    plan = request('sheet-plan', {'spreadsheets': spreadsheets})
    assert len(plan['tasks']) == 7
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
        raise AssertionError('真实表格流程超时')
    assert run['status'] == 'succeeded', json.dumps(run, ensure_ascii=False)
    renders = [t for t in run['tasks'] if t['kind'] == 'sheet_render']
    assert max(t['started'] for t in renders) < min(t['ended'] for t in renders), '表格渲染任务没有真实重叠'
    for task in renders:
        files = task['result']['files']
        xlsx = runner.artifact(next(f for f in files if f.endswith('.xlsx')))
        values = xlsx_values(xlsx)
        flattened = [value for row in values for value in row]
        if task['id'] == 'sheet_1_render':
            assert ('35' in flattened or '35.0' in flattened) and '张三' in flattened and '=1+1' in flattened
        else:
            assert '36.5' in flattened and '轴承' in flattened
        pdf = runner.artifact(next(f for f in files if f.endswith('.pdf')))
        assert pdf.read_bytes().startswith(b'%PDF-')
    previews = [t for t in run['tasks'] if t['kind'] == 'sheet_preview']
    assert all(1 <= t['result']['pages'] <= 20 for t in previews)
    for task in previews:
        for path in task['result']['files']:
            assert runner.artifact(path).read_bytes().startswith(b'\x89PNG')
    bundle_task = next(t for t in run['tasks'] if t['kind'] == 'bundle')
    bundle = runner.artifact(bundle_task['result']['files'][0])
    with zipfile.ZipFile(bundle) as archive:
        assert archive.testzip() is None
        manifest = json.loads(archive.read('MANIFEST.json'))
        assert len(manifest['files']) == 6
        for item in manifest['files']:
            assert hashlib.sha256(archive.read(item['path'])).hexdigest() == item['sha256']
    conn.request('GET', '/api/files/' + bundle_task['result']['files'][0], headers={'X-Muyun-Session': token})
    response = conn.getresponse()
    assert response.status == 200 and response.read() == bundle.read_bytes()
    report = {'status': 'passed', 'kind': 'real_http_libreoffice_spreadsheet_dag', 'run_id': ident,
              'concurrency': 2, 'parallel_render_overlap': True, 'tasks': len(run['tasks']),
              'spreadsheets': 2, 'bundle_files': 6, 'active_formulas': 0,
              'bundle_manifest_sha256_verified': True, 'model_requests': 0, 'tokens': 0,
              'tasks_detail': run['tasks'], 'visual_review': 'pending'}
    (root / 'acceptance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    conn.close()
    server.shutdown()
    server.server_close()
    thread.join()
    runner.close()
