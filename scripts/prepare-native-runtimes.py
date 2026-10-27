#!/usr/bin/env python3
"""Build-time only: assemble pinned, offline Apple Silicon runtimes and wheels."""
import argparse, hashlib, json, os, shutil, subprocess, tarfile, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
PINS={
 'python-arm64.tar.gz':('fbf4afef53c2a6b72bb741bc06d5671a9dfaf87bd84e5aa73ac9b3d0d589f14e','https://github.com/astral-sh/python-build-standalone/releases/download/20261026/cpython-3.12.16+20261026-aarch64-apple-darwin-install_only.tar.gz'),
 'LibreOffice_26.8.1_MacOS_aarch64.dmg':('ca074e0b13571efb30a31fc531c5f95e997030637325e5d5de92d67aefdf0dfc','https://download.documentfoundation.org/libreoffice/stable/26.8.1/mac/aarch64/LibreOffice_26.8.1_MacOS_aarch64.dmg'),
 'PYTHON-THIRD-PARTY-LICENSES.rst':('e43fb936c6655d7996dba480d7ebdea492d6040ec388eb8ed9d1000f72de8cab','https://raw.githubusercontent.com/astral-sh/python-build-standalone/20261026/python-licenses.rst')}
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--extractor',type=Path);a=p.parse_args();c=a.cache.resolve();o=a.output.resolve()
 if o.exists():raise ValueError('Use a new output directory')
 for n,(h,u) in PINS.items():
  if digest(c/n)!=h:raise ValueError('Runtime SHA mismatch: '+n)
 lock=json.loads((ROOT/'desktop/python-wheels.lock.json').read_text())
 for w in lock['wheels']:
  if digest(c/'python-wheels'/w['file'])!=w['sha256']:raise ValueError('Wheel SHA mismatch')
 o.mkdir(mode=0o700,parents=True)
 with tarfile.open(c/'python-arm64.tar.gz') as t:
  for m in t.getmembers():
   if not m.name.startswith('python/') or Path(m.name).is_absolute() or '..' in Path(m.name).parts:raise ValueError('Unsafe Python archive')
  t.extractall(o,filter='data')
 extract=c/'lo-extracted'
 if extract.exists():raise ValueError('Use a fresh cache extraction directory')
 if sys.platform=='darwin':
  mount=c/'lo-mounted';mount.mkdir()
  subprocess.run(['hdiutil','attach','-readonly','-nobrowse','-mountpoint',str(mount),str(c/'LibreOffice_26.8.1_MacOS_aarch64.dmg')],check=True)
  try:
   extract.mkdir();(extract/'LibreOffice').mkdir();shutil.copytree(mount/'LibreOffice.app',extract/'LibreOffice/LibreOffice.app',symlinks=True);shutil.copytree(mount/'LICENSEs',extract/'LibreOffice/LICENSEs',symlinks=True)
  finally:subprocess.run(['hdiutil','detach',str(mount)],check=True)
 else:
  if not a.extractor:raise ValueError('Build host needs 7zz --extractor')
  subprocess.run([str(a.extractor.resolve()),'x',str(c/'LibreOffice_26.8.1_MacOS_aarch64.dmg'),'-o'+str(extract),'LibreOffice/LibreOffice.app/*','LibreOffice/LICENSEs/*','-snld','-y'],check=True,stdout=subprocess.DEVNULL)
 shutil.copytree(extract/'LibreOffice/LibreOffice.app',o/'LibreOffice.app',symlinks=True)
 (o/'licenses').mkdir();shutil.copytree(extract/'LibreOffice/LICENSEs',o/'licenses/LibreOffice',symlinks=True);shutil.copy2(c/'PYTHON-THIRD-PARTY-LICENSES.rst',o/'licenses')
 subprocess.run(['python3','-m','pip','install','--no-index','--find-links',str(c/'python-wheels'),'--only-binary=:all:','--platform','macosx_11_0_arm64','--python-version','312','--implementation','cp','--abi','cp312','--no-compile','--target',str(o/'python/lib/python3.12/site-packages'),'--require-hashes','-r',str(ROOT/'desktop/requirements-native-python.txt')],check=True)
 for f in o.rglob('*'):
  if f.is_symlink() and (not f.resolve().is_relative_to(o) or not f.exists()):raise ValueError('Runtime symlink escape/missing target: '+str(f))
 manifest={'schema':1,'architecture':'arm64','python':'3.12.16+20261026','libreoffice':'26.8.1.1','pins':{n:{'sha256':h,'url':u} for n,(h,u) in PINS.items()},'python_packages':lock['wheels']}
 
 (o/'licenses/SOURCES.txt').write_text('LibreOffice unmodified upstream binaries, MPL-2.0 and bundled third-party terms. Corresponding source:\nhttps://download.documentfoundation.org/libreoffice/src/26.8.1/\nhttps://git.libreoffice.org/core/+/bf6ef2662401c7d6dce671ab4deb26ee0af3a7c1\nPython and dependency licenses are retained alongside their packages.\n'+json.dumps(manifest['pins'],indent=2)+'\n')
 manifest['files']={str(f.relative_to(o)):({'link':os.readlink(f)} if f.is_symlink() else {'sha256':digest(f),'mode':f.stat().st_mode&0o777}) for f in o.rglob('*') if f.is_file() or f.is_symlink()}
 (o/'RUNTIMES.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'output':str(o),'runtime':manifest['python'],'office':manifest['libreoffice'],'wheels':len(lock['wheels'])}))
if __name__=='__main__':main()
