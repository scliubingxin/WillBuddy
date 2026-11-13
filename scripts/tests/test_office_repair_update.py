import hashlib,importlib.util,json,pathlib,plistlib,shutil,tempfile,unittest
SCRIPT=pathlib.Path(__file__).resolve().parents[2]/'desktop/installer/update-office-repair.py'
s=importlib.util.spec_from_file_location('office_repair',SCRIPT);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class RepairUpdate(unittest.TestCase):
 def setUp(self):self.original=(m.BASE_VARIANTS,m.TARGET_HASHES)
 def tearDown(self):m.BASE_VARIANTS,m.TARGET_HASHES=self.original
 def fixture(self,root):
  app=root/'Applications/WillBuddy.app';payload=root/'payload';app.mkdir(parents=True);base={};target={};entries=[]
  for name in sorted(m.PATCH_PATHS):
   p=app/name;p.parent.mkdir(parents=True,exist_ok=True);old=('old:'+name).encode();new=('new:'+name).encode()
   if name.endswith('Info.plist'):
    old=plistlib.dumps({'CFBundleIdentifier':'com.actwill.desktop','CFBundleShortVersionString':'0.37.26'});new=plistlib.dumps({'CFBundleIdentifier':'com.actwill.desktop','CFBundleShortVersionString':'0.37.27'})
   p.write_bytes(old);base[name]=hashlib.sha256(old).hexdigest();q=payload/'patch'/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(new);h=hashlib.sha256(new).hexdigest();target[name]=h;entries.append({'path':name,'bytes':len(new),'sha256':h,'mode':m.TARGET_MODES[name]})
  m.BASE_VARIANTS=[base,dict(base)];m.TARGET_HASHES=target;(app/'runtime-marker').write_text('retained');(payload/'UPDATE-MANIFEST.json').write_text(json.dumps({'schema':1,'base_version':'0.37.26','version':'0.37.27','files':entries}));return app,payload
 def test_success_retains_backup(self):
  with tempfile.TemporaryDirectory() as t:
   app,p=self.fixture(pathlib.Path(t));checks=[];backup=pathlib.Path(m.apply_update(app,p,verify=lambda x:checks.append(x),clone=shutil.copytree))
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.27');self.assertEqual(m.info(backup)['CFBundleShortVersionString'],'0.37.26');self.assertEqual((app/'runtime-marker').read_text(),'retained');self.assertEqual(len(checks),2)
 def test_same_version_wrong_bytes_refused_and_no_signature_attempt(self):
  with tempfile.TemporaryDirectory() as t:
   app,p=self.fixture(pathlib.Path(t));(app/'Contents/MacOS/Electron').write_text('different build')
   with self.assertRaisesRegex(ValueError,'不是受支持'):m.apply_update(app,p,verify=lambda x:self.fail('verify'),clone=shutil.copytree)
 def test_tamper_and_signature_failure_preserve_old(self):
  with tempfile.TemporaryDirectory() as t:
   app,p=self.fixture(pathlib.Path(t));(p/'patch/Contents/Resources/app.asar').write_text('tampered')
   with self.assertRaises(ValueError):m.apply_update(app,p,verify=lambda x:self.fail('verify'),clone=shutil.copytree)
  with tempfile.TemporaryDirectory() as t:
   app,p=self.fixture(pathlib.Path(t))
   with self.assertRaisesRegex(RuntimeError,'signature'):m.apply_update(app,p,verify=lambda x:(_ for _ in ()).throw(RuntimeError('signature')),clone=lambda a,b:self.fail('clone'))
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.26')
 def test_commit_failure_rolls_back(self):
  with tempfile.TemporaryDirectory() as t:
   app,p=self.fixture(pathlib.Path(t))
   def fail(a,b):
    if b==app:raise OSError('commit failure')
    m.os.replace(a,b)
   with self.assertRaisesRegex(OSError,'commit failure'):m.apply_update(app,p,verify=lambda x:None,clone=shutil.copytree,commit=fail)
   self.assertEqual(m.info(app)['CFBundleShortVersionString'],'0.37.26')
if __name__=='__main__':unittest.main()
