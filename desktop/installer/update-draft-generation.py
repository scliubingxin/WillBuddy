#!/usr/bin/env python3
"""Apply a bounded, exact-base offline application patch. No downloads or pip."""
import hashlib,json,os,plistlib,shutil,stat,subprocess,sys,tempfile,re,time
from pathlib import Path
sys.dont_write_bytecode=True
def progress(message):print(time.strftime('%H:%M:%S')+' '+message,flush=True)
def run_native(args,label,timeout=90,heartbeat=5):
 # codesign's actual stderr is essential evidence; an exit code does not prove writes.
 # Keep logs outside the signed application, never add diagnostic files to it.
 with tempfile.TemporaryFile() as output:
  started=time.monotonic()
  progress(label+' 开始（最长 '+str(timeout)+' 秒）')
  with subprocess.Popen(args,stdout=output,stderr=output) as proc:
   while True:
    remaining=timeout-(time.monotonic()-started)
    if remaining<=0:
     proc.kill();proc.wait()
     output.seek(0);detail=output.read(65536).decode('utf-8','replace')
     raise TimeoutError(label+' 超时，已停止；未跳过安全检查。\n'+detail)
    try:code=proc.wait(timeout=min(heartbeat,remaining));break
    except subprocess.TimeoutExpired:progress(label+' 仍在执行，已用 '+str(round(time.monotonic()-started))+' 秒')
   output.seek(0);detail=output.read(65536).decode('utf-8','replace')
   if code:raise RuntimeError(label+' 失败，退出码 '+str(code)+'。以下为系统原始诊断（不能据此推断应用被写入）：\n'+detail)
  progress(label+' 通过，用时 '+str(round(time.monotonic()-started,1))+' 秒')
PATCH_PATHS=frozenset({'Contents/MacOS/Electron','Contents/Resources/app.asar','Contents/_CodeSignature/CodeResources'})
BASE_HASHES={'Contents/Info.plist':'94a003c48219b6e7ac485bad17b8a18fd62e39f7e6811f882d35782624013b24','Contents/MacOS/Electron':'46a16bda1bd2cad63f0581c959bc75ac503d4a330d2c44a8db86e952f7a1df18','Contents/Resources/app.asar':'9749e55dcb67023e1305cafbb062bb48e463a7f2c47f8c8d0de585ab2990794d','Contents/_CodeSignature/CodeResources':'3646d5c82db5dd334914ef38e02d539e48a9dbdef421c7d628a8f5282815e76c'}
TARGET_HASHES={'Contents/MacOS/Electron':'efabe0df97a46ed146fc930a30eb8331eae1d37b2750447016fd8ec2a10fa620','Contents/Resources/app.asar':'23897d9bfd989920a310cd3403da1addf53d555d2c8022a6fc7d60e6c3dcbe6e','Contents/_CodeSignature/CodeResources':'b12a9b9cffd25160dc25ea1edc77487168e15664ddc5d37f47f786bc709f03a7'}
TARGET_MODES={'Contents/MacOS/Electron':0o755,'Contents/Resources/app.asar':0o644,'Contents/_CodeSignature/CodeResources':0o644}
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def regular(p):
 if not stat.S_ISREG(p.lstat().st_mode):raise ValueError('补丁/应用文件不是普通文件')
def info(app):
 regular(app/'Contents/Info.plist');return plistlib.loads((app/'Contents/Info.plist').read_bytes())
def verify_native(app):run_native(['/usr/bin/codesign','--verify','--deep','--strict','--verbose=2',str(app)],'签名检查 '+str(app))
def clone_native(app,target):
 # APFS clone: no runtime content copy. Refuse rather than silently perform a slow copy.
 run_native(['/bin/cp','-cR',str(app),str(target)],'APFS 克隆',timeout=30)
def apply_update(app,payload,verify=verify_native,clone=clone_native,commit=os.replace):
 app=Path(app);payload=Path(payload)
 if app.is_symlink() or not app.is_dir():raise ValueError('应用路径无效或是符号链接')
 m=json.loads((payload/'UPDATE-MANIFEST.json').read_text())
 if m.get('schema')!=1 or m.get('base_version')!='0.37.26' or m.get('version')!='0.37.26':raise ValueError('补丁版本不支持')
 entries=m.get('files',[])
 if len(entries)!=3 or {e.get('path') for e in entries}!=PATCH_PATHS or any(e.get('sha256')!=TARGET_HASHES.get(e.get('path')) or e.get('mode')!=TARGET_MODES.get(e.get('path')) for e in entries):raise ValueError('补丁路径或目标摘要无效')
 def base_guard():
  i=info(app)
  if i.get('CFBundleIdentifier')!='com.actwill.desktop' or i.get('CFBundleShortVersionString')!=m['base_version']:raise ValueError('此小更新仅支持指定的 WillBuddy 0.37.26 候选构建')
  a=app/'Contents/Resources/app.asar';regular(a)
  if m.get('base_asar_sha256')!=BASE_HASHES['Contents/Resources/app.asar'] or m.get('base_info_sha256')!=BASE_HASHES['Contents/Info.plist']:raise ValueError('基线清单不符')
  for rel,expected in BASE_HASHES.items():
   candidate=app/rel;regular(candidate)
   if digest(candidate)!=expected:raise ValueError('原应用不是指定候选构建：'+rel)
 for e in entries:
  p=payload/'patch'/e['path'];regular(p)
  if p.stat().st_size!=e['bytes'] or not 0<e['bytes']<=20*1024**2 or e['mode'] not in [0o644,0o755] or digest(p)!=e['sha256']:raise ValueError('补丁文件摘要/大小/权限校验失败')
 progress('1/4 校验补丁和原应用版本');base_guard()
 progress('2/4 检查原应用签名；失败时不会创建候选或替换应用');verify(app)
 stage=Path(tempfile.mkdtemp(prefix='.WillBuddy-update-',dir=app.parent));candidate=stage/'WillBuddy.app';backup=stage/'previous.app';committed=False
 try:
  progress('3/4 克隆并应用三个文件');clone(app,candidate)
  for e in entries:
   p=candidate/e['path'];regular(p);data=(payload/'patch'/e['path']).read_bytes()
   if hashlib.sha256(data).hexdigest()!=e['sha256']:raise ValueError('补丁读取期间变化')
   # Replace clone file instead of modifying an inode shared with the old app.
   temp=p.with_name(p.name+'.wb-update');fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with os.fdopen(fd,'wb') as out:out.write(data);out.flush();os.fsync(out.fileno())
   os.chmod(temp,e['mode']);os.replace(temp,p)
  i=info(candidate)
  if i.get('CFBundleIdentifier')!='com.actwill.desktop' or i.get('CFBundleShortVersionString')!=m['version']:raise ValueError('目标应用身份/版本不符')
  progress('4/4 检查候选签名；此阶段失败不表示原应用签名已坏');verify(candidate);base_guard()
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
