#!/usr/bin/env python3
"""Build a small, exact-build offline patch; never infer compatibility from version."""
import argparse, hashlib, json, os, tempfile, zipfile
from pathlib import Path
from offline_bundle import validate_archive
ROOT = Path(__file__).resolve().parent.parent
BASE = 'f097b354bc697c8a142591b0681966bcd41224dd0c18d2bd60e43623030efd29'
TARGET = '627ba62674361f1c40ca4ad527a47dd6031446250fcb35a1ca6566d404182379'
PATHS = {'Contents/MacOS/Electron', 'Contents/Resources/app.asar', 'Contents/_CodeSignature/CodeResources'}
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('base',type=Path);p.add_argument('target',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
 if digest(a.base)!=BASE or digest(a.target)!=TARGET:raise ValueError('input archive SHA-256 does not match the exact candidate builds')
 validate_archive(a.base);validate_archive(a.target)
 with zipfile.ZipFile(a.base) as old,zipfile.ZipFile(a.target) as new:
  b=json.loads(old.read('OFFLINE-MANIFEST.json'));n=json.loads(new.read('OFFLINE-MANIFEST.json'))
  if b['version']!='0.37.26' or n['version']!='0.37.26':raise ValueError('unexpected version')
  bf={e['path']:e for e in b['files']};nf={e['path']:e for e in n['files']}
  if bf.keys()!=nf.keys():raise ValueError('application path set changed')
  changed=[e for e in n['files'] if e!=bf[e['path']]]
  if {e['path'].removeprefix('WillBuddy.app/') for e in changed}!=PATHS:raise ValueError('unexpected changed files')
  entries=[{**e,'path':e['path'].removeprefix('WillBuddy.app/')} for e in changed]
  manifest={'schema':1,'base_version':'0.37.26','version':'0.37.26','base_asar_sha256':b['app_asar_sha256'],'base_info_sha256':bf['WillBuddy.app/Contents/Info.plist']['sha256'],'files':entries}
  out=a.output.resolve();out.parent.mkdir(parents=True,exist_ok=True);fd,tmp=tempfile.mkstemp(prefix='.'+out.name,suffix='.tmp',dir=out.parent);os.close(fd)
  try:
   with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr('UPDATE-MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    for e in changed:
     data=new.read(e['path'])
     if len(data)!=e['bytes'] or hashlib.sha256(data).hexdigest()!=e['sha256']:raise ValueError('target payload checksum mismatch')
     info=zipfile.ZipInfo('patch/'+e['path'].removeprefix('WillBuddy.app/'));info.external_attr=(0o100000|e['mode'])<<16;z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED)
    for name in ['update-draft-generation.py','Apply-Draft-Generation-Update.command']:
     info=zipfile.ZipInfo(name);info.external_attr=0o100755<<16;z.writestr(info,(ROOT/'desktop/installer'/name).read_bytes(),compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('READ-ME.txt','仅适用于已安装的 0.37.26 draft 候选精确构建（旧应用 app.asar SHA-256：9749e55dcb67023e1305cafbb062bb48e463a7f2c47f8c8d0de585ab2990794d）。先退出 WillBuddy，完整解压后双击 Apply-Draft-Generation-Update.command。保留签名验证、APFS 克隆、旧版备份与失败回滚；不安装依赖、不关闭系统保护。此候选未经 Mac 真机验收，之前的 codesign 失败根因仍未知；失败请查看日志，不要反复重试。与其他 0.37.26 安装不兼容。\n')
   with zipfile.ZipFile(tmp) as z:
    if z.testzip() is not None or len(z.namelist())!=7:raise ValueError('update archive corrupt')
   os.replace(tmp,out)
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
 print(json.dumps({'file':str(out),'bytes':out.stat().st_size,'sha256':digest(out),'patch_files':3,'unchanged_entries':len(bf)-3,'native_mac_tested':False}))
if __name__=='__main__':main()
