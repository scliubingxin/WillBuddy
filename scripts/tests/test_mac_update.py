import importlib.util,json,hashlib,pathlib,plistlib,shutil,tempfile,unittest,sys,io,contextlib,time
SCRIPT=pathlib.Path(__file__).resolve().parents[2]/'desktop/installer/update-app.py'
s=importlib.util.spec_from_file_location('updater',SCRIPT);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Update(unittest.TestCase):
 def test_native_stderr_is_preserved(self):
  with self.assertRaisesRegex(RuntimeError,'resource envelope is obsolete'):
   m.run_native([sys.executable,'-c',"import sys;sys.stderr.write('resource envelope is obsolete');sys.exit(3)"],'test',timeout=2)
 def test_native_timeout_stops_real_child_and_reports_progress(self):
  out=io.StringIO();started=time.monotonic()
  with contextlib.redirect_stdout(out),self.assertRaisesRegex(TimeoutError,'超时'):
   m.run_native([sys.executable,'-c','import time;time.sleep(30)'],'test',timeout=.15,heartbeat=.05)
  self.assertLess(time.monotonic()-started,3);self.assertIn('仍在执行',out.getvalue())
 def test_original_failure_does_not_clone_or_modify(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.setup_fixture(pathlib.Path(td));before={str(f.relative_to(app)):m.digest(f) for f in app.rglob('*') if f.is_file()}
   def fail(a):raise RuntimeError('actual diagnostic')
   with self.assertRaisesRegex(RuntimeError,'actual diagnostic'):m.apply_update(app,p,verify=fail,clone=lambda a,b:self.fail('must not clone'))
   self.assertEqual(before,{str(f.relative_to(app)):m.digest(f) for f in app.rglob('*') if f.is_file()});self.assertEqual(list(app.parent.glob('.WillBuddy-update-*')),[])
 def setup_fixture(self,root):
  app=root/'Applications/WillBuddy.app';payload=root/'payload';app.mkdir(parents=True)
  entries=[]
  for name in sorted(m.PATCH_PATHS):
   p=app/name;p.parent.mkdir(parents=True,exist_ok=True);data=b'old-'+name.encode()
   if name.endswith('Info.plist'):data=plistlib.dumps({'CFBundleIdentifier':'com.actwill.desktop','CFBundleShortVersionString':'0.37.0'})
   p.write_bytes(data);new=data.replace(b'old-',b'new-')
   if name.endswith('Info.plist'):new=plistlib.dumps({'CFBundleIdentifier':'com.actwill.desktop','CFBundleShortVersionString':'0.37.1'})
   f=payload/'patch'/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(new);entries.append({'path':name,'bytes':len(new),'mode':0o644,'sha256':hashlib.sha256(new).hexdigest()})
  (app/'runtime-untouched').write_text('runtime')
  manifest={'schema':1,'base_version':'0.37.0','version':'0.37.1','base_asar_sha256':m.digest(app/'Contents/Resources/app.asar'),'base_info_sha256':m.digest(app/'Contents/Info.plist'),'files':entries};(payload/'UPDATE-MANIFEST.json').write_text(json.dumps(manifest));return app,payload
 def test_real_filesystem_commit_changes_only_patch_retains_old(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.setup_fixture(pathlib.Path(td));seen=[];backup=pathlib.Path(m.apply_update(app,p,verify=lambda a:seen.append(str(a)),clone=shutil.copytree));self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.1');self.assertEqual(m.info(backup)['CFBundleShortVersionString'],'0.37.0');self.assertEqual((app/'runtime-untouched').read_text(),'runtime');self.assertEqual(len(seen),2)
 def test_failed_native_gate_preserves_old(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.setup_fixture(pathlib.Path(td))
   def fail(a):
    if '.WillBuddy-update-' in str(a):raise ValueError('native failure')
   with self.assertRaisesRegex(ValueError,'native failure'):m.apply_update(app,p,verify=fail,clone=shutil.copytree)
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.0')
 def test_commit_failure_rolls_back(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.setup_fixture(pathlib.Path(td))
   def fail(a,b):
    if b==app:raise OSError('commit failure')
    m.os.replace(a,b)
   with self.assertRaises(OSError):m.apply_update(app,p,verify=lambda a:None,clone=shutil.copytree,commit=fail)
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.0')
 def test_tamper_or_wrong_base_no_clone(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.setup_fixture(pathlib.Path(td));(p/'patch/Contents/Resources/app.asar').write_bytes(b'bad')
   with self.assertRaises(ValueError):m.apply_update(app,p,verify=lambda a:self.fail('unexpected verify'),clone=lambda a,b:self.fail('unexpected clone'))
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.0')
if __name__=='__main__':unittest.main()
