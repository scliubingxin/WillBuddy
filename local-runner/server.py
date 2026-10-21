"""Loopback-only 幕云AI console. No CORS; no cloud credential or auto-pairing."""
import argparse
import json
import mimetypes
import os
from pathlib import Path
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
from engine import Runner, document_plan, spreadsheet_plan, text_document_plan, validate_plan
import genoffice_adapter


def make_server(runner, port=8765):
    token = secrets.token_urlsafe(32)
    page = Path(__file__).with_name('console.html').read_text(encoding='utf-8').replace('__SESSION_TOKEN__', token)

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *args):
            pass  # Local plans, output URLs and session token must not enter access logs.

        def send(self, code, data, content_type='application/json; charset=utf-8', attachment=None):
            payload = json.dumps(data, ensure_ascii=False).encode() if not isinstance(data, bytes) else data
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'nonce-" + token + "'; style-src 'unsafe-inline'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
            if attachment:
                self.send_header('Content-Disposition', 'attachment; filename="' + attachment + '"')
            self.end_headers()
            self.wfile.write(payload)

        def authorize(self, api=True):
            expected = '127.0.0.1:' + str(self.server.server_port)
            if self.headers.get('Host') != expected:
                self.send(403, {'error': '只接受 127.0.0.1 本机访问'})
                return False
            origin = self.headers.get('Origin')
            if origin and origin != 'http://' + expected:
                self.send(403, {'error': '拒绝跨站请求'})
                return False
            if self.headers.get('Sec-Fetch-Site') == 'cross-site' and api:
                self.send(403, {'error': '拒绝跨站请求'})
                return False
            if api and not secrets.compare_digest(self.headers.get('X-Muyun-Session', ''), token):
                self.send(401, {'error': '本机会话已失效，请刷新本地任务台'})
                return False
            return True

        def do_GET(self):
            path = urlsplit(self.path).path
            if not self.authorize(api=path != '/'):
                return
            try:
                if path == '/':
                    self.send(200, page.encode(), 'text/html; charset=utf-8')
                elif path == '/api/state':
                    self.send(200, {'runs': runner.list()})
                elif path == '/api/capabilities':
                    self.send(200, runner.capabilities())
                elif path.startswith('/api/files/'):
                    relative = unquote(path[len('/api/files/'):])
                    content = runner.read_artifact(relative)
                    name = relative.rsplit('/', 1)[-1]
                    self.send(200, content, mimetypes.guess_type(name)[0] or 'application/octet-stream', name)
                else:
                    self.send(404, {'error': '不存在'})
            except (ValueError, OSError) as error:
                self.send(400, {'error': str(error)})

        def do_POST(self):
            if not self.authorize():
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 800_000:
                    raise ValueError('请求大小超限')
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise ValueError('只接受 JSON')
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise ValueError('请求格式错误')
                if self.path == '/api/plan':
                    self.send(200, document_plan(data.get('documents')))
                elif self.path == '/api/text-plan':
                    self.send(200, text_document_plan(data.get('brief')))
                elif self.path == '/api/sheet-plan':
                    self.send(200, spreadsheet_plan(data.get('spreadsheets')))
                elif self.path == '/api/genoffice-plan':
                    self.send(200, validate_plan(genoffice_adapter.plan(data)))
                elif self.path == '/api/validate':
                    self.send(200, validate_plan(data.get('plan')))
                elif self.path == '/api/run':
                    self.send(201, runner.create(data.get('plan')))
                elif self.path == '/api/cancel':
                    runner.cancel(data.get('id'))
                    self.send(200, {'ok': True})
                elif self.path == '/api/retry':
                    self.send(201, runner.retry(data.get('id')))
                else:
                    self.send(404, {'error': '不存在'})
            except (ValueError, TypeError, OSError) as error:
                self.send(400, {'error': str(error)})

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    return server


def main():
    parser = argparse.ArgumentParser(description='幕云AI 本地执行器')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', default=str(Path.home() / '.muyun-ai-runner'))
    parser.add_argument('--concurrency', type=int, default=2, choices=range(1, 5))
    args = parser.parse_args()
    if os.name == 'nt':
        parser.error('当前验证范围为 Linux/macOS；Windows 请在 WSL2 中运行')
    runner = Runner(args.data_dir, args.concurrency)
    server = make_server(runner, args.port)
    stop = threading.Event()
    def schedule():
        while not stop.wait(0.1):
            runner.tick()
    worker = threading.Thread(target=schedule, daemon=True)
    worker.start()
    print(f'幕云AI 本地任务台：http://127.0.0.1:{server.server_port} （数据仅保存本机）', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        worker.join()
        server.server_close()
        runner.close()


if __name__ == '__main__':
    main()
