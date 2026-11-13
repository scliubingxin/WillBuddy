import hashlib,importlib.util,json,pathlib,plistlib,shutil,tempfile,unittest
SCRIPT=pathlib.Path(__file__).resolve().parents[2]/'desktop/installer/update-draft-generation.py'
s=importlib.util.spec_from_file_location('draft_update',SCRIPT);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class DraftUpdate(unittest.TestCase):
 def setUp(self): self.old_base,self.old_target=m.BASE_HASHES,m.TARGET_HASHES
 def tearDown(self): m.BASE_HASHES,m.TARGET_HASHES=self.old_base,self.old_target
 def fixture(self,root):
  app=root/'Applications/WillBuddy.app';payload=root/'payload';app.mkdir(parents=True);base={};target={};entries=[]
  for name in sorted(m.PATCH_PATHS|{'Contents/Info.plist'}):
   p=app/name;p.parent.mkdir(parents=True,exist_ok=True);old=('old:'+name).encode()
   if name.endswith('Info.plist'):old=plistlib.dumps({'CFBundleIdentifier':'com.actwill.desktop','CFBundleShortVersionString':'0.37.26'})
   p.write_bytes(old);base[name]=hashlib.sha256(old).hexdigest()
   if name in m.PATCH_PATHS:
    new=('new:'+name).encode();q=payload/'patch'/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(new);h=hashlib.sha256(new).hexdigest();target[name]=h;entries.append({'path':name,'bytes':len(new),'sha256':h,'mode':m.TARGET_MODES[name]})
  (app/'runtime').write_text('retained');m.BASE_HASHES=base;m.TARGET_HASHES=target
  manifest={'schema':1,'base_version':'0.37.26','version':'0.37.26','base_asar_sha256':base['Contents/Resources/app.asar'],'base_info_sha256':base['Contents/Info.plist'],'files':entries};(payload/'UPDATE-MANIFEST.json').write_text(json.dumps(manifest));return app,payload
 def test_success_same_version_and_previous_backup(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.fixture(pathlib.Path(td));checks=[];backup=pathlib.Path(m.apply_update(app,p,verify=lambda a:checks.append(str(a)),clone=shutil.copytree))
   self.assertEqual(m.digest(app/'Contents/Resources/app.asar'),m.TARGET_HASHES['Contents/Resources/app.asar']);self.assertEqual(m.digest(backup/'Contents/Resources/app.asar'),m.BASE_HASHES['Contents/Resources/app.asar']);self.assertEqual((app/'runtime').read_text(),'retained');self.assertEqual(len(checks),2)
 def test_wrong_same_version_and_tampered_payload_refuse_before_verify(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.fixture(pathlib.Path(td));(app/'Contents/MacOS/Electron').write_text('other same-version build')
   with self.assertRaisesRegex(ValueError,'不是指定候选'):m.apply_update(app,p,verify=lambda a:self.fail('verify'),clone=shutil.copytree)
  with tempfile.TemporaryDirectory() as td:
   app,p=self.fixture(pathlib.Path(td));(p/'patch/Contents/Resources/app.asar').write_text('tamper')
   with self.assertRaises(ValueError):m.apply_update(app,p,verify=lambda a:self.fail('verify'),clone=shutil.copytree)
 def test_signature_failure_and_commit_failure_leave_original(self):
  with tempfile.TemporaryDirectory() as td:
   app,p=self.fixture(pathlib.Path(td))
   with self.assertRaisesRegex(RuntimeError,'signature'):
    m.apply_update(app,p,verify=lambda a:(_ for _ in ()).throw(RuntimeError('signature')),clone=lambda a,b:self.fail('clone'))
   self.assertEqual(m.digest(app/'Contents/Resources/app.asar'),m.BASE_HASHES['Contents/Resources/app.asar'])
   def fail(a,b):
    if b==app:raise OSError('commit failure')
    m.os.replace(a,b)
   with self.assertRaisesRegex(OSError,'commit failure'):m.apply_update(app,p,verify=lambda a:None,clone=shutil.copytree,commit=fail)
   self.assertEqual(m.digest(app/'Contents/Resources/app.asar'),m.BASE_HASHES['Contents/Resources/app.asar'])
if __name__=='__main__':unittest.main()
