import importlib.util
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import Mock

SCRIPTS=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(SCRIPTS))
spec=importlib.util.spec_from_file_location('native_repackage',SCRIPTS/'repackage-native-mac.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class NativeRepackageTests(unittest.TestCase):
 def fixture(self,root):
  app=root/'input'/'WillBuddy.app';(app/'Contents').mkdir(parents=True)
  (app/'Contents/runtime').write_bytes(b'original runtime')
  (app/'Contents/runtime').chmod(0o755)
  (app/'Contents/link').symlink_to('runtime')
  return app,root/'output'/'WillBuddy.app'
 def test_extracted_bytes_links_modes_and_unexpected_file_fail_closed(self):
  with tempfile.TemporaryDirectory() as d:
   app,out=self.fixture(Path(d));entries=m.inventory(app.parent,app)
   self.assertTrue(m.verify_expected_tree(app.parent,app,entries))
   f=app/'Contents/runtime';f.write_bytes(b'truncated')
   with self.assertRaisesRegex(ValueError,'bytes'):m.verify_expected_tree(app.parent,app,entries)
   f.write_bytes(b'original runtime');f.chmod(0o644)
   with self.assertRaisesRegex(ValueError,'mode'):m.verify_expected_tree(app.parent,app,entries)
   f.chmod(0o755);link=app/'Contents/link';link.unlink();link.symlink_to('other')
   with self.assertRaises(ValueError):m.verify_expected_tree(app.parent,app,entries)
   link.unlink();link.symlink_to('runtime');extra=app/'Contents/extra';extra.write_bytes(b'new')
   with self.assertRaisesRegex(ValueError,'paths'):m.verify_expected_tree(app.parent,app,entries)
 def test_separate_output_copies_expected_tree_and_does_not_modify_input(self):
  with tempfile.TemporaryDirectory() as d:
   app,out=self.fixture(Path(d));out.parent.mkdir()
   def runner(args,check):
    self.assertNotEqual(args[-1],args[-2]);self.assertTrue(check)
    shutil.copytree(args[-2],args[-1],symlinks=True)
   m.sign_new_bundle(Path('/fake-signer'),app,out,Path('/fake-entitlements'),run=runner)
   self.assertEqual((app/'Contents/runtime').read_bytes(),b'original runtime')
 def test_existing_overlapping_output_refused_before_signer(self):
  with tempfile.TemporaryDirectory() as d:
   app,out=self.fixture(Path(d));runner=Mock()
   for target in [app,app/'inside',app.parent]:
    with self.assertRaises(ValueError):m.sign_new_bundle(Path('/fake'),app,target,Path('/fake'),run=runner)
   out.mkdir(parents=True)
   with self.assertRaises(ValueError):m.sign_new_bundle(Path('/fake'),app,out,Path('/fake'),run=runner)
   runner.assert_not_called()
 def test_mutating_signer_and_extra_output_refused(self):
  for mutate in [True,False]:
   with tempfile.TemporaryDirectory() as d:
    app,out=self.fixture(Path(d));out.parent.mkdir()
    def runner(args,check):
     shutil.copytree(args[-2],args[-1],symlinks=True)
     target=app if mutate else out
     (target/'Contents/extra').write_bytes(b'not allowed')
    with self.assertRaises(ValueError):m.sign_new_bundle(Path('/fake'),app,out,Path('/fake'),run=runner)
 def test_known_residual_is_rejected_before_signer(self):
  with tempfile.TemporaryDirectory() as d:
   app,out=self.fixture(Path(d));(app/'Contents/.Electron Framework.partial').write_bytes(b'prefix');runner=Mock()
   with self.assertRaisesRegex(ValueError,'residual'):m.sign_new_bundle(Path('/fake'),app,out,Path('/fake'),run=runner)
   runner.assert_not_called()

class ProductionSourceCopyTests(unittest.TestCase):
 def test_host_bytecode_is_not_shipped_but_owned_python_source_is(self):
  from offline_bundle import copy_source_tree
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);source=root/'source';source.mkdir();(source/'__pycache__').mkdir()
   (source/'worker.py').write_text('print("owned source")')
   (source/'__pycache__'/'worker.cpython-312.pyc').write_bytes(b'host bytecode')
   (source/'stale.pyc').write_bytes(b'old')
   copy_source_tree(source,root/'production')
   self.assertEqual((root/'production'/'worker.py').read_text(),'print("owned source")')
   self.assertFalse((root/'production'/'__pycache__').exists())
   self.assertFalse((root/'production'/'stale.pyc').exists())

if __name__=='__main__':unittest.main()
