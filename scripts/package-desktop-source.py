#!/usr/bin/env python3
"""Package source bytes without dependencies, runtime state or private secrets."""
import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
import zipfile
from datetime import datetime, timezone, timedelta

root = Path(__file__).resolve().parent.parent
skip_dirs = {'node_modules', '.git', '.wrangler', '.sites-runtime', '.next', '.vinext', '.agents', '.codex', '__pycache__', 'release', 'outputs', 'coverage'}
skip_suffixes = {'.pyc', '.log', '.tsbuildinfo', '.sqlite', '.sqlite3', '.db', '.pem', '.key', '.p12', '.pfx'}

def package(output):
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    files = []
    for p in sorted(root.rglob('*')):
        rel = p.relative_to(root)
        if not p.is_file() or p.is_symlink() or p.resolve() == output:
            continue
        if set(rel.parts[:-1]) & skip_dirs or any(part.startswith(('.BC.','._')) or part in {'__MACOSX','.DS_Store'} for part in rel.parts) or p.name.startswith(('.env', '.dev.vars')) or p.suffix in skip_suffixes or p.name in {'SOURCE_MANIFEST.json', 'core'}:
            continue
        data = p.read_bytes()
        files.append((rel.as_posix(), data, p.stat().st_mode))
    manifest = {
        'schema_version': 2,
        'brand': json.loads((root / 'desktop/package.json').read_text())['productName'],
        'version': json.loads((root / 'desktop/package.json').read_text())['version'],
        'packaged_date': datetime.now(timezone(timedelta(hours=8))).date().isoformat(),
        'provenance': 'Complete validated source snapshot; Git commits and deployment are tracked separately',
        'base_source_commit_sha': 'aea62a8c03939500dfa03173f87cfc3f32a702c7',
        'release_status': json.loads((root / 'RELEASE_STATUS.json').read_text()),
        'files': [{'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for rel, data, _ in files],
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    # Never expose a partially written release filename to file watchers/uploaders.
    fd, temporary_name = tempfile.mkstemp(prefix='.' + output.name + '-', suffix='.tmp', dir=output.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    try:
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for rel, data, mode in files:
                info = zipfile.ZipInfo('muyun-ai/' + rel)
                info.external_attr = mode << 16
                z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED)
            z.writestr('muyun-ai/SOURCE_MANIFEST.json', manifest_bytes, compress_type=zipfile.ZIP_DEFLATED)
        with zipfile.ZipFile(temporary) as z:
            assert z.testzip() is None
            for entry in manifest['files']:
                data = z.read('muyun-ai/' + entry['path'])
                assert len(data) == entry['bytes']
                assert hashlib.sha256(data).hexdigest() == entry['sha256']
            assert len(z.namelist()) == len(files) + 1
        with temporary.open('rb') as stream:
            os.fsync(stream.fileno())
        (root / 'SOURCE_MANIFEST.json').write_bytes(manifest_bytes)
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    print(json.dumps({'file': str(output), 'source_files': len(files), 'zip_bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'manifest_verified': True}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', help='absolute or relative output ZIP path outside the source tree')
    package(parser.parse_args().output)
