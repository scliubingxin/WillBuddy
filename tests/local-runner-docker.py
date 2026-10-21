"""Real container acceptance. Fails explicitly when Docker/images are unavailable."""
from pathlib import Path
import sys
import tempfile
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'local-runner'))
from engine import Runner, TERMINAL

with tempfile.TemporaryDirectory() as directory:
    runner = Runner(directory, 2)
    try:
        caps = runner.capabilities()
        if not all(caps['code'][k]['ready'] for k in ['python', 'javascript']):
            raise SystemExit('BLOCKED: Docker daemon and installed Python/Node images are required; not passed.')
        plan = {'name': '代码隔离验收', 'tasks': [
            {'id': 'python', 'kind': 'python', 'code': 'print(sum([12,23]))'},
            {'id': 'javascript', 'kind': 'javascript', 'code': 'console.log(12+23)'},
            {'id': 'isolation', 'kind': 'python', 'code': 'import os,socket\nassert os.getuid()!=0\ntry:\n open("/forbidden","w")\n raise AssertionError("root writable")\nexcept OSError: pass\ns=socket.socket();s.settimeout(1)\ntry:\n s.connect(("1.1.1.1",443))\n raise AssertionError("network available")\nexcept OSError: pass\nprint("isolation passed")'},
            {'id': 'timeout', 'kind': 'python', 'code': 'while True: pass'},
            {'id': 'overflow', 'kind': 'python', 'code': 'print("x"*100000)'},
        ]}
        ident = runner.create(plan)['id']
        until = time.monotonic()+100
        while time.monotonic() < until:
            runner.tick()
            run = runner.get(ident)
            if run['status'] in TERMINAL:
                break
            time.sleep(.1)
        tasks = {t['id']: t for t in runner.get(ident)['tasks']}
        assert tasks['python']['result']['stdout'].strip() == '35'
        assert tasks['javascript']['result']['stdout'].strip() == '35'
        assert tasks['isolation']['status'] == 'succeeded'
        assert tasks['timeout']['status'] == tasks['overflow']['status'] == 'failed'
        print('PASS: real Docker Python/JS, non-root, read-only root, network blocked, timeout and output cap')
    finally:
        runner.close()
