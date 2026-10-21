#!/usr/bin/env python3
"""Safely restore an Office edit checkpoint to a new file."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def restore(checkpoint, current, output):
    checkpoint, current, output = map(lambda value: Path(value).resolve(), (checkpoint, current, output))
    if output.exists():
        raise ValueError('恢复目标已存在；为避免覆盖，请选择新的输出文件名')
    if not checkpoint.is_file() or checkpoint.is_symlink() or not current.is_file() or current.is_symlink():
        raise ValueError('检查点或当前文件无效')
    if checkpoint.stat().st_size > 25_000_000 or current.stat().st_size > 20_000_000:
        raise ValueError('检查点或当前文件超过安全大小')
    try:
        with zipfile.ZipFile(checkpoint) as archive:
            names = archive.namelist()
            originals = [name for name in names if name.startswith('original.')]
            entries = archive.infolist()
            if (len(names) != 2 or len(set(names)) != 2 or len(originals) != 1 or
                    set(names) != {'MANIFEST.json', originals[0]} or
                    any(item.is_dir() or item.file_size > 20_000_000 for item in entries) or
                    sum(item.file_size for item in entries) > 20_100_000):
                raise ValueError('检查点内容不符合预期')
            manifest = json.loads(archive.read('MANIFEST.json'))
            original_name = manifest['before']['path']
            original = archive.read(original_name)
    except (zipfile.BadZipFile, KeyError, TypeError, json.JSONDecodeError) as error:
        raise ValueError('检查点格式无效') from error
    if manifest.get('schema_version') != 1 or manifest.get('kind') != 'office_edit_checkpoint':
        raise ValueError('不支持的检查点版本')
    extension = manifest.get('extension')
    if extension not in {'.docx', '.xlsx', '.pptx'} or original_name != 'original' + extension or '/' in original_name or '\\' in original_name:
        raise ValueError('检查点原文件路径无效')
    before_bytes = manifest['before'].get('bytes')
    after_bytes = manifest.get('after', {}).get('bytes')
    if (not isinstance(before_bytes, int) or not 0 < before_bytes <= 20_000_000 or
            not isinstance(after_bytes, int) or not 0 < after_bytes <= 20_000_000):
        raise ValueError('检查点大小记录无效')
    if len(original) != before_bytes or digest(original) != manifest['before'].get('sha256'):
        raise ValueError('检查点原文件完整性校验失败')
    current_bytes = current.read_bytes()
    if len(current_bytes) != after_bytes or digest(current_bytes) != manifest['after'].get('sha256'):
        raise ValueError('当前文件不是该检查点对应的编辑结果，可能已有新修改；拒绝恢复')
    if output.suffix.lower() != manifest.get('extension'):
        raise ValueError('恢复文件扩展名必须与原文件一致')
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix='.muyun-restore-', dir=output.parent)
    try:
        with os.fdopen(fd, 'wb') as target:
            target.write(original)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp_name, output)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
    return {'status': 'restored', 'output': str(output), 'bytes': len(original),
            'sha256': digest(original), 'current_verified': True}


def main():
    parser = argparse.ArgumentParser(description='幕云AI Office 编辑检查点安全恢复（始终写入新文件）')
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--current', required=True, help='该次编辑输出；必须与检查点 after 哈希一致')
    parser.add_argument('--output', required=True, help='新恢复文件；不能已存在')
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args.checkpoint, args.current, args.output), ensure_ascii=False))
    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
