"""Closed-inventory ZIPs for a signed Mac application; no recursive zip walk."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import plistlib
import posixpath
import stat
import unicodedata
import zipfile

EXTRAS={'OFFLINE-MANIFEST.json','Install-WillBuddy.command','READ-ME.txt','ELECTRON-LICENSE.txt','LICENSES.chromium.html'}

def residue(name):
    return any(part.startswith(('.BC.','._','.Electron Framework.')) or part in {'__MACOSX','.DS_Store'} for part in PurePosixPath(str(name)).parts)

def clean_residue(app):
    """Only remove known build residues from this task's staging bundle."""
    candidates=[p for p in app.rglob('*') if residue(p.relative_to(app))]
    seals=[]
    for seal in app.rglob('CodeResources'):
        if seal.is_symlink():continue
        value=plistlib.loads(seal.read_bytes())
        seals.extend(key for section in ['files','files2'] for key in value.get(section,{}))
    if any(residue(key) for key in seals):raise ValueError('resource seal references build residue; rebuild before signing')
    for p in sorted(candidates,key=lambda p:len(p.parts),reverse=True):
        if p.is_symlink() or p.is_file():p.unlink()
        elif p.is_dir():
            if any(p.iterdir()):raise ValueError('refuse to remove nonempty residue directory')
            p.rmdir()
    return len(candidates)

def safe_name(name):
    p=PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or '\\' in name or str(p)!=name or residue(name):raise ValueError('unsafe or residual archive entry: '+name)
    return unicodedata.normalize('NFC',name).casefold()

def validate_link(name,target):
    if PurePosixPath(target).is_absolute() or '\\' in target:raise ValueError('unsafe symlink')
    resolved=posixpath.normpath(posixpath.join(posixpath.dirname(name),target))
    if not resolved.startswith('WillBuddy.app/'):raise ValueError('symlink escapes application')

def inventory(stage,app):
    entries=[];seen=set()
    for p in sorted(app.rglob('*')):
        name=p.relative_to(stage).as_posix();canonical=safe_name(name)
        if canonical in seen:raise ValueError('case-colliding bundle paths')
        seen.add(canonical)
        mode=p.lstat().st_mode
        if stat.S_ISLNK(mode):
            target=os.readlink(p);validate_link(name,target)
            if not p.resolve().is_relative_to(app.resolve()) or not p.exists():raise ValueError('broken or escaping bundle symlink')
            entries.append({'path':name,'symlink':target,'mode':mode&0o777})
        elif stat.S_ISREG(mode):
            data=p.read_bytes();entries.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mode':mode&0o777})
        elif not stat.S_ISDIR(mode):raise ValueError('unsupported bundle entry')
    return entries

def write_archive(stage,entries,output):
    # Regular targets first; framework links last. No symlink-directory traversal,
    # duplicate directory entries, AppleDouble or post-snapshot files can be added.
    names=[e['path'] for e in entries]+sorted(EXTRAS)
    ordered=sorted(names,key=lambda name:(int((stage/name).is_symlink()),-len(PurePosixPath(name).parts) if (stage/name).is_symlink() else 0,name))
    seen=set()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name in ordered:
            canonical=safe_name(name)
            if canonical in seen:raise ValueError('duplicate archive path')
            seen.add(canonical);p=stage/name;mode=p.lstat().st_mode
            info=zipfile.ZipInfo(name);info.create_system=3;info.external_attr=mode<<16
            if stat.S_ISLNK(mode):
                target=os.readlink(p);validate_link(name,target);z.writestr(info,target.encode())
            elif stat.S_ISREG(mode):
                info.compress_type=zipfile.ZIP_DEFLATED
                with p.open('rb') as source,z.open(info,'w') as dest:
                    import shutil
                    shutil.copyfileobj(source,dest)
            else:raise ValueError('archive inventory is not a regular file or symlink')
    return validate_archive(output)

def validate_archive(archive):
    with zipfile.ZipFile(archive) as z:
        seen=set()
        for info in z.infolist():
            name=info.filename.rstrip('/') if info.is_dir() else info.filename
            canonical=safe_name(name)
            if canonical in seen:raise ValueError('duplicate or case-colliding archive path')
            seen.add(canonical)
        manifest=json.loads(z.read('OFFLINE-MANIFEST.json'));entries=manifest['files']
        expected={e['path'] for e in entries}|EXTRAS
        actual={i.filename for i in z.infolist() if not i.is_dir()}
        if actual!=expected or len(entries)!=len({e['path'] for e in entries}):raise ValueError('ZIP has missing, unexpected or duplicate manifest entries')
        for e in entries:
            name=e['path'];safe_name(name)
            if not name.startswith('WillBuddy.app/'):raise ValueError('manifest entry outside app')
            info=z.getinfo(name);data=z.read(info);mode=info.external_attr>>16
            if mode&0o777!=e['mode']:raise ValueError('mode mismatch: '+name)
            if 'symlink' in e:
                validate_link(name,e['symlink'])
                if not stat.S_ISLNK(mode) or data.decode()!=e['symlink']:raise ValueError('symlink mismatch: '+name)
            elif not stat.S_ISREG(mode) or len(data)!=e['bytes'] or hashlib.sha256(data).hexdigest()!=e['sha256']:raise ValueError('file hash mismatch: '+name)
        if not z.getinfo('Install-WillBuddy.command').external_attr>>16&0o111:raise ValueError('installer lost executable mode')
        if z.testzip():raise ValueError('ZIP CRC failure')
        return {'app_entries':len(entries),'extra_files':len(EXTRAS),'closed_inventory':True,'residual_entries':0}

if __name__=='__main__':
    import sys
    print(json.dumps(validate_archive(Path(sys.argv[1]))))
