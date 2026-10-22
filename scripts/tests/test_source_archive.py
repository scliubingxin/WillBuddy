import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('source_package', Path(__file__).resolve().parents[1] / 'package-desktop-source.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AtomicSourceTests(unittest.TestCase):
    def setup_source(self, root):
        (root / 'desktop').mkdir()
        (root / 'desktop/package.json').write_text(json.dumps({'productName': 'WillBuddy', 'version': '0.14.0'}))
        (root / 'RELEASE_STATUS.json').write_text('{}')
        (root / 'README.md').write_text('Complete source')

    def test_final_name_remains_old_until_zip_is_complete_and_verified(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / 'source'; root.mkdir(); self.setup_source(root)
            output = Path(d) / 'release.zip'; output.write_bytes(b'previous complete release')
            original = zipfile.ZipFile.writestr
            def inspect_writer(z, *args, **kwargs):
                self.assertEqual(output.read_bytes(), b'previous complete release')
                return original(z, *args, **kwargs)
            with patch.object(module, 'root', root), patch.object(zipfile.ZipFile, 'writestr', inspect_writer), contextlib.redirect_stdout(io.StringIO()):
                module.package(output)
            with zipfile.ZipFile(output) as z:
                self.assertIsNone(z.testzip())
                self.assertEqual(len(z.namelist()), 4)
            self.assertEqual(list(Path(d).glob('.*.tmp')), [])

    def test_failed_zip_write_preserves_old_release_and_removes_temp(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / 'source'; root.mkdir(); self.setup_source(root)
            output = Path(d) / 'release.zip'; output.write_bytes(b'previous complete release')
            with patch.object(module, 'root', root), patch.object(zipfile.ZipFile, 'writestr', side_effect=OSError('disk full')):
                with self.assertRaisesRegex(OSError, 'disk full'):
                    module.package(output)
            self.assertEqual(output.read_bytes(), b'previous complete release')
            self.assertEqual(list(Path(d).glob('.*.tmp')), [])
