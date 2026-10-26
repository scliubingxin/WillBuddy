"""Add the independently authored executable example; preserve prior preset bytes."""
from pathlib import Path
import json,base64,hashlib,io,zipfile
r=Path(__file__).resolve().parent.parent
p=r/'desktop/runtime/presets/catalog.json';c=json.loads(p.read_text())
source=r/'examples/skills/office-runtime';out=io.BytesIO();files=[]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(source.rglob('*')):
  if not f.is_file():continue
  b=f.read_bytes();name=f.relative_to(source).as_posix();info=zipfile.ZipInfo(name,(2026,10,27,0,0,0));info.external_attr=0o100600<<16;z.writestr(info,b,compress_type=zipfile.ZIP_DEFLATED);files.append(dict(path=name,sha256=hashlib.sha256(b).hexdigest()))
b=out.getvalue();c['skills']=[s for s in c['skills'] if s['id']!='wb-runtime-budget'];c['skills'].append(dict(id='wb-runtime-budget',title='预算脚本运行（Node）',category='办公协同',description='真实执行Node脚本生成预算XLSX，检查退出状态并回收成果。',source='WillBuddy independent workflow',license='UNLICENSED · WillBuddy source',archiveBase64=base64.b64encode(b).decode(),sha256=hashlib.sha256(b).hexdigest(),files=files));c['version']=2;c['checkedDate']='2026-10-27';p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
