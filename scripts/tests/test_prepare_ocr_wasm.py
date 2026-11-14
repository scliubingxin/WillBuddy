import contextlib,hashlib,importlib.util,io,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('prepare_ocr',Path(__file__).resolve().parents[1]/'prepare-ocr-wasm.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class OfflineOcrAssets(unittest.TestCase):
 def fixture(self,d):
  root=Path(d)/'project';source=Path(d)/'assets';root.mkdir();source.mkdir();rows=[]
  for index,rel in enumerate(sorted(module.EXPECTED)):
   value=('asset-'+str(index)).encode();f=source/rel;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(value);rows.append({'path':rel,'size':len(value),'sha256':hashlib.sha256(value).hexdigest()})
  manifest=json.dumps({'schema':1,'files':rows}).encode();(root/'MANIFEST.json').write_bytes(manifest);return root,source,hashlib.sha256(manifest).hexdigest()
 def run_helper(self,root,source,sha):
  with patch.object(module,'ROOT',root),patch.object(module,'MANIFEST_SHA',sha),patch.object(sys,'argv',['prepare','--assets',str(source)]),contextlib.redirect_stdout(io.StringIO()):module.main()
 def test_verified_assets_install_offline_and_repeat_idempotently(self):
  with tempfile.TemporaryDirectory() as d:
   root,source,sha=self.fixture(d);self.run_helper(root,source,sha);self.run_helper(root,source,sha)
   for rel in module.EXPECTED:self.assertEqual((root/rel).read_bytes(),(source/rel).read_bytes())
 def test_tamper_fails_before_any_asset_is_copied(self):
  with tempfile.TemporaryDirectory() as d:
   root,source,sha=self.fixture(d);(source/sorted(module.EXPECTED)[-1]).write_bytes(b'tampered')
   with self.assertRaisesRegex(ValueError,'mismatch'):self.run_helper(root,source,sha)
   self.assertFalse(any((root/rel).exists() for rel in module.EXPECTED))
 def test_symlink_and_existing_different_target_are_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   root,source,sha=self.fixture(d);rel=sorted(module.EXPECTED)[0];src=source/rel;src.unlink();src.symlink_to('/dev/null')
   with self.assertRaisesRegex(ValueError,'linked'):self.run_helper(root,source,sha)
  with tempfile.TemporaryDirectory() as d:
   root,source,sha=self.fixture(d);rel=sorted(module.EXPECTED)[0];dest=root/rel;dest.parent.mkdir(parents=True);dest.write_bytes(b'keep')
   with self.assertRaisesRegex(ValueError,'overwrite'):self.run_helper(root,source,sha)
   self.assertEqual(dest.read_bytes(),b'keep')
 def test_racing_target_is_not_overwritten(self):
  with tempfile.TemporaryDirectory() as d:
   root,source,sha=self.fixture(d);original=module.os.link
   def race(temp,target):Path(target).write_bytes(b'concurrent');return original(temp,target)
   with patch.object(module.os,'link',side_effect=race):
    with self.assertRaisesRegex(ValueError,'appeared'):self.run_helper(root,source,sha)
   self.assertEqual((root/sorted(module.EXPECTED)[0]).read_bytes(),b'concurrent')
