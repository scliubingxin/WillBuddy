#!/usr/bin/env python3
"""Upgrade application sources in the previously verified complete native bundle.
Build-time only. Reject unknown base bytes; never download on the installation host.
"""
import argparse,hashlib,json,plistlib,shutil,subprocess,struct,importlib.util
from pathlib import Path
from offline_bundle import validate_archive,inventory,write_archive,capture_staging_paths,verify_staging_paths
ROOT=Path(__file__).resolve().parent.parent
BASE_SHA='cb8d1a7a6f83d6c1e39a6514f03ab6c3d0e87148ab2bc2ab188de8dd05e4ace1'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def module(name,file):
 s=importlib.util.spec_from_file_location(name,file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m

def main():
 p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--work-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--signing-tool',type=Path,required=True);a=p.parse_args()
 if digest(a.base)!=BASE_SHA:raise ValueError('unknown native base bundle SHA')
 validate_archive(a.base);stage=a.work_dir.resolve()
 if stage.exists():raise ValueError('choose a new private work directory')
 stage.mkdir(mode=0o700,parents=True)
 pkg=module('native_pack',ROOT/'scripts/package-offline-mac.py');pkg.extract_runtime(a.base,stage)
 app=stage/'WillBuddy.app';resources=app/'Contents/Resources';prior=json.loads((stage/'OFFLINE-MANIFEST.json').read_text());metadata=json.loads((ROOT/'desktop/package.json').read_text());version=metadata['version']
 if prior['version']!='0.37.0' or prior['architecture']!='arm64':raise ValueError('base version/architecture mismatch')
 info=app/'Contents/Info.plist';d=plistlib.loads(info.read_bytes());d.update(CFBundleVersion=version,CFBundleShortVersionString=version);info.write_bytes(plistlib.dumps(d))
 source=stage/'app-source';source.mkdir()
 for name in ['main.mjs','preload.cjs','office-preload.cjs','core.mjs','src','runtime','assets','main','services']:
  f=ROOT/'desktop'/name
  if f.is_dir():shutil.copytree(f,source/name)
  else:shutil.copy2(f,source/name)
 (source/'package.json').write_text(json.dumps({k:metadata[k] for k in ['name','productName','version','description','author','license','type','main']},indent=2)+'\n')
 subprocess.run(['node',str(ROOT/'desktop/node_modules/@electron/asar/bin/asar.js'),'pack',str(source),str(resources/'app.asar')],check=True)
 expected=capture_staging_paths(app)
 subprocess.run([str(a.signing_tool.resolve()),'sign','--exclude','Contents/Resources/runtimes/LibreOffice.app','--exclude','Contents/Resources/runtimes/LibreOffice.app/**','--entitlements-xml-file',str(ROOT/'desktop/installer/entitlements.mac.plist'),str(app)],check=True)
 verify_staging_paths(app,expected)
 for e in prior['files']:
  if '/runtimes/LibreOffice.app/' in e['path'] and 'sha256' in e:
   if digest(stage/e['path'])!=e['sha256']:raise ValueError('upstream LibreOffice bytes changed')
 verifier=module('pages',ROOT/'scripts/verify-macho-pages.py');binaries=pages=0
 for f in app.rglob('*'):
  if not f.is_file() or f.is_symlink():continue
  with f.open('rb') as stream:head=stream.read(16)
  if head[:4] not in [bytes.fromhex('cffaedfe'),bytes.fromhex('cafebabe')]:continue
  if head[:4]==bytes.fromhex('cffaedfe') and struct.unpack_from('<I',head,12)[0]==1:continue
  if head[:4]==bytes.fromhex('cafebabe') and struct.unpack_from('>I',head,4)[0]>16:continue
  pages+=verifier.verify(f.read_bytes(),require_adhoc=not f.is_relative_to(resources/'runtimes/LibreOffice.app'));binaries+=1
 manifest={**prior,'version':version,'base_bundle_sha256':BASE_SHA,'app_asar_sha256':digest(resources/'app.asar'),'verified_macho_binaries':binaries,'verified_code_pages':pages,'files':inventory(stage,app),'native_mac_tested':False}
 (stage/'OFFLINE-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');shutil.copy2(ROOT/'desktop/installer/README-Mac.txt',stage/'READ-ME.txt');shutil.copy2(ROOT/'desktop/installer/Install-WillBuddy.command',stage/'Install-WillBuddy.command');(stage/'Install-WillBuddy.command').chmod(0o755);verify_staging_paths(app,expected)
 result=write_archive(stage,manifest['files'],a.output.resolve());print(json.dumps({'version':version,'file':str(a.output.resolve()),'bytes':a.output.stat().st_size,'sha256':digest(a.output),'app_asar_sha256':manifest['app_asar_sha256'],'verified_macho_binaries':binaries,'verified_code_pages':pages,'archive_check':result}))
if __name__=='__main__':main()
