#!/usr/bin/env python3
"""Apply a bounded, exact-base offline application patch. No downloads or pip."""
import hashlib,json,os,plistlib,shutil,stat,subprocess,sys,tempfile,re
from pathlib import Path
PATCH_PATHS=frozenset({'Contents/Info.plist','Contents/MacOS/Electron','Contents/Resources/app.asar','Contents/_CodeSignature/CodeResources'})
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def regular(p):
 if not stat.S_ISREG(p.lstat().st_mode):raise ValueError('补丁/应用文件不是普通文件')
def info(app):
 regular(app/'Contents/Info.plist');return plistlib.loads((app/'Contents/Info.plist').read_bytes())
def verify_native(app):subprocess.run(['/usr/bin/codesign','--verify','--deep','--strict',str(app)],check=True)
def clone_native(app,target):
 # APFS clone: no runtime content copy. Refuse rather than silently perform a slow copy.
 subprocess.run(['/bin/cp','-cR',str(app),str(target)],check=True)
def apply_update(app,payload,verify=verify_native,clone=clone_native,commit=os.replace):
 app=Path(app);payload=Path(payload)
 if app.is_symlink() or not app.is_dir():raise ValueError('应用路径无效或是符号链接')
 m=json.loads((payload/'UPDATE-MANIFEST.json').read_text())
 if m.get('schema')!=1 or m.get('base_version')!='0.37.0' or m.get('version')!='0.37.1':raise ValueError('补丁版本不支持')
 entries=m.get('files',[])
 if len(entries)!=4 or {e.get('path') for e in entries}!=PATCH_PATHS:raise ValueError('补丁路径集合无效')
 def base_guard():
  i=info(app)
  if i.get('CFBundleIdentifier')!='com.actwill.desktop' or i.get('CFBundleShortVersionString')!=m['base_version']:raise ValueError('此小更新仅支持 WillBuddy 0.37.0，请使用完整安装包')
  a=app/'Contents/Resources/app.asar';regular(a)
  if digest(a)!=m['base_asar_sha256'] or digest(app/'Contents/Info.plist')!=m['base_info_sha256']:raise ValueError('原应用与指定基线不一致')
 for e in entries:
  p=payload/'patch'/e['path'];regular(p)
  if p.stat().st_size!=e['bytes'] or not 0<e['bytes']<=20*1024**2 or e['mode'] not in [0o644,0o755] or digest(p)!=e['sha256']:raise ValueError('补丁文件摘要/大小/权限校验失败')
 base_guard();verify(app)
 stage=Path(tempfile.mkdtemp(prefix='.WillBuddy-update-',dir=app.parent));candidate=stage/'WillBuddy.app';backup=stage/'previous.app';committed=False
 try:
  clone(app,candidate)
  for e in entries:
   p=candidate/e['path'];regular(p);data=(payload/'patch'/e['path']).read_bytes()
   if hashlib.sha256(data).hexdigest()!=e['sha256']:raise ValueError('补丁读取期间变化')
   # Replace clone file instead of modifying an inode shared with the old app.
   temp=p.with_name(p.name+'.wb-update');fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with os.fdopen(fd,'wb') as out:out.write(data);out.flush();os.fsync(out.fileno())
   os.chmod(temp,e['mode']);os.replace(temp,p)
  i=info(candidate)
  if i.get('CFBundleIdentifier')!='com.actwill.desktop' or i.get('CFBundleShortVersionString')!=m['version']:raise ValueError('目标应用身份/版本不符')
  verify(candidate);base_guard()
  commit(app,backup)
  try:commit(candidate,app)
  except BaseException:
   os.replace(backup,app);raise
  committed=True
  # Keep previous version inside this unique directory; no existing backups deleted.
  print('更新完成。旧版备份保留在：'+str(backup))
  return str(backup)
 finally:
  if not committed:
   if backup.exists():print('回退未完成，保留恢复目录：'+str(stage),file=sys.stderr)
   else:shutil.rmtree(stage,ignore_errors=True)
def main():
 if sys.platform!='darwin' or os.uname().machine!='arm64':raise ValueError('仅支持 Apple 芯片 Mac')
 app=Path(sys.argv[1]);allowed={Path.home()/'Applications/WillBuddy.app',Path('/Applications/WillBuddy.app')}
 if app not in allowed:raise ValueError('仅更新个人或系统 Applications 中的 WillBuddy.app')
 if subprocess.run(['/usr/bin/pgrep','-f',re.escape(str(app)+'/Contents/MacOS/Electron')],stdout=subprocess.DEVNULL).returncode==0:raise ValueError('请先从菜单彻底退出 WillBuddy')
 apply_update(app,Path(__file__).resolve().parent)
if __name__=='__main__':
 try:main()
 except Exception as e:print('更新停止，旧版保持或已回退：'+str(e),file=sys.stderr);sys.exit(1)
