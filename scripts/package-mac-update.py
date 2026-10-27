#!/usr/bin/env python3
import argparse,zipfile,json,hashlib,sys
from pathlib import Path
from offline_bundle import validate_archive
ROOT=Path(__file__).resolve().parent.parent
BASE='cb8d1a7a6f83d6c1e39a6514f03ab6c3d0e87148ab2bc2ab188de8dd05e4ace1'
def main():
 p=argparse.ArgumentParser();p.add_argument('base',type=Path);p.add_argument('new',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
 if hashlib.sha256(a.base.read_bytes()).hexdigest()!=BASE:raise ValueError('base SHA mismatch')
 validate_archive(a.base);validate_archive(a.new)
 with zipfile.ZipFile(a.base) as old,zipfile.ZipFile(a.new) as new:
  b=json.loads(old.read('OFFLINE-MANIFEST.json'));n=json.loads(new.read('OFFLINE-MANIFEST.json'));assert b['version']=='0.37.0' and n['version']=='0.37.1'
  bf={e['path']:e for e in b['files']};nf={e['path']:e for e in n['files']};assert bf.keys()==nf.keys();changed=[e for e in n['files'] if e!=bf[e['path']]]
  expected={'Contents/Info.plist','Contents/MacOS/Electron','Contents/Resources/app.asar','Contents/_CodeSignature/CodeResources'};assert {e['path'][len('WillBuddy.app/'): ] for e in changed}==expected
  entries=[{**e,'path':e['path'][len('WillBuddy.app/'):]} for e in changed];m={'schema':1,'base_version':'0.37.0','version':'0.37.1','base_asar_sha256':b['app_asar_sha256'],'base_info_sha256':bf['WillBuddy.app/Contents/Info.plist']['sha256'],'files':entries}
  with zipfile.ZipFile(a.output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as out:
   out.writestr('UPDATE-MANIFEST.json',json.dumps(m,indent=2)+'\n')
   for e in changed:
    data=new.read(e['path']);assert hashlib.sha256(data).hexdigest()==e['sha256'];z=zipfile.ZipInfo('patch/'+e['path'][len('WillBuddy.app/'):]);z.external_attr=(0o100000|e['mode'])<<16;out.writestr(z,data,compress_type=zipfile.ZIP_DEFLATED)
   for name in ['update-app.py','Apply-WillBuddy-Update.command']:
    z=zipfile.ZipInfo(name);z.external_attr=0o100755<<16;out.writestr(z,(ROOT/'desktop/installer'/name).read_bytes(),compress_type=zipfile.ZIP_DEFLATED)
   out.writestr('READ-ME.txt','仅支持已安装的0.37.0，完整解压这8个文件后双击Apply-WillBuddy-Update.command。使用原包内Python，不安装依赖。需要APFS克隆支持；失败停止不改旧版。不移除隔离/不跳过codesign。未Mac真机验收，需稳妥路径请用完整离线包。更新器无网络功能。\n')
 with zipfile.ZipFile(a.output) as z:assert z.testzip() is None
 print(json.dumps({'file':str(a.output),'bytes':a.output.stat().st_size,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'patch_files':4,'unchanged_runtime_entries':len(bf)-4,'mac_native_tested':False}))
if __name__=='__main__':main()
