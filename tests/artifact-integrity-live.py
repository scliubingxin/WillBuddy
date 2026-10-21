"""Reopen an actual GenOffice acceptance run and test its authenticated downloads.
Usage: python3 tests/artifact-integrity-live.py outputs/<genoffice-live-run>
Only use synthetic acceptance data, never user documents.
"""
import hashlib
import http.client
import json
from pathlib import Path
import re
import sys
import threading
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner
from server import make_server

out = Path(sys.argv[1]).resolve()
assert json.loads((out / 'report.json').read_text())['passed']
runner = Runner(out / 'state')
server = make_server(runner, 0)
threading.Thread(target=server.serve_forever, daemon=True).start()
conn = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=10)
try:
    conn.request('GET', '/')
    page = conn.getresponse().read().decode()
    token = re.search(r"const token='([^']+)'", page)[1]
    headers = {'X-Muyun-Session': token}
    verified = []
    for run in runner.list():
        assert run['status'] == 'succeeded'
        for task in run['tasks']:
            evidence = task['result']['verification']
            assert evidence['status'] == 'passed' and evidence['scope'] == 'file_integrity'
            assert {e['path'] for e in evidence['artifacts']} == set(task['result']['files'])
            for entry in evidence['artifacts']:
                conn.request('GET', '/api/files/' + entry['path'], headers=headers)
                response = conn.getresponse()
                data = response.read()
                assert response.status == 200
                assert len(data) == entry['bytes'] and hashlib.sha256(data).hexdigest() == entry['sha256']
                verified.append(entry)
    entry = verified[0]
    path = runner.root / entry['path']
    original = path.read_bytes()
    failures = []
    try:
        for kind in ['same_size_change', 'deleted']:
            if kind == 'same_size_change':
                path.write_bytes(bytes([original[0] ^ 1]) + original[1:])
            else:
                path.unlink()
            conn.request('GET', '/api/files/' + entry['path'], headers=headers)
            response = conn.getresponse()
            body = response.read()
            assert response.status == 400 and 'error' in json.loads(body)
            failures.append({'case': kind, 'http_status': response.status})
    finally:
        path.write_bytes(original)
    conn.request('GET', '/api/files/' + entry['path'], headers=headers)
    response = conn.getresponse()
    assert response.status == 200 and response.read() == original
    report = {'passed': True, 'scope': 'real persisted GenOffice outputs + authenticated localhost HTTP',
              'files_verified': len(verified), 'negative_downloads': failures,
              'restored_download': 'passed', 'restart_evidence': 'passed',
              'browser_e2e': False, 'model_requests': 0, 'files': verified}
    (out / 'integrity-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, ensure_ascii=False))
finally:
    conn.close()
    server.shutdown()
    server.server_close()
    runner.close()
