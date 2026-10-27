#!/usr/bin/env python3
"""Assemble a fully local arm64 Mac bundle from an authenticated Electron runtime.
Requires local build-time Node + @electron/asar; end users need neither.
No downloaded code or package-manager commands run during installation.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import stat
import struct
import subprocess
import zipfile
import importlib.util
from offline_bundle import clean_residue, inventory, write_archive, capture_staging_paths, verify_staging_paths

ROOT=Path(__file__).resolve().parent.parent

def digest(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def extract_runtime(archive,target):
    with zipfile.ZipFile(archive) as z:
        for info in z.infolist():
            parts=Path(info.filename).parts
            if Path(info.filename).is_absolute() or '..' in parts:raise ValueError('unsafe runtime archive path')
            dst=target.joinpath(*parts);mode=info.external_attr>>16
            if info.is_dir():dst.mkdir(parents=True,exist_ok=True);continue
            dst.parent.mkdir(parents=True,exist_ok=True)
            if stat.S_ISLNK(mode):
                link=z.read(info).decode();resolved=(dst.parent/link).resolve()
                if not resolved.is_relative_to(target.resolve()):raise ValueError('runtime link escaped extraction root')
                dst.symlink_to(link)
            else:
                with z.open(info) as source,open(dst,'wb') as out:shutil.copyfileobj(source,out)
                dst.chmod(mode&0o777 or 0o644)

def main():
    p=argparse.ArgumentParser();p.add_argument('--native-runtimes',type=Path,required=True);p.add_argument('--runtime',type=Path,required=True);p.add_argument('--checksums',type=Path,required=True);p.add_argument('--work-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--signing-tool',type=Path,required=True);args=p.parse_args()
    metadata=json.loads((ROOT/'desktop/package.json').read_text());version=metadata['version'];electron=metadata['devDependencies']['electron']
    expected_name=f'electron-v{electron}-darwin-arm64.zip'
    if args.runtime.name!=expected_name:raise ValueError('runtime must match locked Electron version and arm64 architecture')
    checks={line.split()[1].lstrip('*'):line.split()[0] for line in args.checksums.read_text().splitlines() if len(line.split())==2}
    runtime_sha=digest(args.runtime)
    if checks.get(expected_name)!=runtime_sha:raise ValueError('Electron release checksum mismatch')
    stage=args.work_dir.resolve()
    if stage.exists():raise ValueError('choose a new, empty work directory')
    stage.mkdir(parents=True,mode=0o700);extracted=stage/'runtime';extracted.mkdir();extract_runtime(args.runtime,extracted)
    app=stage/'WillBuddy.app';shutil.move(str(extracted/'Electron.app'),app)
    removed_before_sign=clean_residue(app)
    info_path=app/'Contents/Info.plist';info=plistlib.loads(info_path.read_bytes())
    info.update(CFBundleName='WillBuddy',CFBundleDisplayName='WillBuddy',CFBundleIdentifier='com.actwill.desktop',CFBundleShortVersionString=version,CFBundleVersion=version,CFBundleIconFile='WillBuddy.icns')
    info_path.write_bytes(plistlib.dumps(info,fmt=plistlib.FMT_XML))
    resources=app/'Contents/Resources';shutil.copy2(ROOT/'desktop/assets/app.icns',resources/'WillBuddy.icns')
    (resources/'default_app.asar').unlink(missing_ok=True)
    native=args.native_runtimes.resolve()
    native_manifest=json.loads((native/'RUNTIMES.json').read_text())
    from importlib.machinery import SourceFileLoader
    pins=SourceFileLoader('native_pins',str(ROOT/'scripts/prepare-native-runtimes.py')).load_module().PINS
    if native_manifest.get('architecture')!='arm64' or any(native_manifest.get('pins',{}).get(n,{}).get('sha256')!=h for n,(h,u) in pins.items()):raise ValueError('native runtime lock mismatch')
    if native_manifest.get('python_packages')!=json.loads((ROOT/'desktop/python-wheels.lock.json').read_text())['wheels']:raise ValueError('Python wheel lock mismatch')
    native_paths={str(f.relative_to(native)) for f in native.rglob('*') if (f.is_file() or f.is_symlink()) and f.name!='RUNTIMES.json'}
    if native_paths!=set(native_manifest['files']):raise ValueError('native payload path inventory changed')
    for rel,entry in native_manifest['files'].items():
        f=native/rel
        if 'link' in entry:
            if not f.is_symlink() or os.readlink(f)!=entry['link']:raise ValueError('native payload link changed')
        elif f.is_symlink() or digest(f)!=entry['sha256'] or f.stat().st_mode&0o777!=entry['mode']:raise ValueError('native payload bytes/mode changed')
    shutil.copytree(native,resources/'runtimes',symlinks=True)
    for f in (resources/'runtimes').rglob('*'):
        if f.is_symlink() and (not f.resolve().is_relative_to(resources/'runtimes') or not f.exists()):raise ValueError('native runtime link escape')
    for rel in ['python/bin/python3.12','LibreOffice.app/Contents/MacOS/soffice']:
        header=(resources/'runtimes'/rel).read_bytes()[:8]
        if struct.unpack('<II',header)!=(0xfeedfacf,0x0100000c):raise ValueError('native executable is not arm64')

    source=stage/'app-source';source.mkdir()
    for name in ['main.mjs','preload.cjs','core.mjs','src','runtime','assets','main','services']:
        src=ROOT/'desktop'/name;dst=source/name
        if src.is_dir():shutil.copytree(src,dst)
        else:shutil.copy2(src,dst)
    # Production uses built-in Node/Electron and prebundled licensed JS codecs; never ship the build toolchain.
    package={k:metadata[k] for k in ['name','productName','version','description','author','license','type','main']}
    (source/'package.json').write_text(json.dumps(package,indent=2)+'\n')
    cli=ROOT/'desktop/node_modules/@electron/asar/bin/asar.js'
    subprocess.run(['node',str(cli),'pack',str(source),str(resources/'app.asar')],check=True)
    for helper in (app/'Contents/Frameworks').glob('*.app/Contents/Info.plist'):
        helper_info=plistlib.loads(helper.read_bytes());old_id=helper_info.get('CFBundleIdentifier','')
        role=helper.parent.parent.stem.replace('Electron Helper','').strip(' ()').lower() or 'main'
        helper_info['CFBundleIdentifier']='com.actwill.desktop.helper.'+role
        helper_info['CFBundleExecutable']=next((helper.parent/'MacOS').iterdir()).name
        helper_info['CFBundleDisplayName']=helper_info.get('CFBundleName','Electron Helper').replace('Electron','WillBuddy')
        helper.write_bytes(plistlib.dumps(helper_info))
    binary=app/'Contents/MacOS'/info['CFBundleExecutable'];magic,cpu=struct.unpack('<II',binary.read_bytes()[:8])
    if magic!=0xfeedfacf or cpu!=0x0100000c:raise ValueError('main executable is not arm64 Mach-O')
    # The official unsigned archive has no resource seals. Permit only the nine
    # precise seal paths belonging to its known bundles, never arbitrary extras.
    seal_roots=['Contents','Contents/Frameworks/Electron Framework.framework/Versions/A',
        *['Contents/Frameworks/'+name+'.app/Contents' for name in ['Electron Helper','Electron Helper (GPU)','Electron Helper (Plugin)','Electron Helper (Renderer)']],
        *['Contents/Frameworks/'+name+'.framework/Versions/A' for name in ['Mantle','ReactiveObjC','Squirrel']]]
    if any(not (app/root).is_dir() for root in seal_roots):raise ValueError('unexpected runtime bundle structure')
    expected_paths=capture_staging_paths(app)|frozenset(root+'/_CodeSignature/CodeResources' for root in seal_roots)
    # Sign standalone CPython extension images before enclosing app resource seals.
    for f in list((resources/'runtimes/python').rglob('*')):
        if f.is_file() and not f.is_symlink() and f.open('rb').read(4) in [bytes.fromhex('cffaedfe'),bytes.fromhex('cafebabe')]:
            subprocess.run([str(args.signing_tool.resolve()),'sign',str(f)],check=True,stdout=subprocess.DEVNULL)
    verify_staging_paths(app,expected_paths-frozenset(root+'/_CodeSignature/CodeResources' for root in seal_roots if not (app/root/'_CodeSignature/CodeResources').exists()))
    subprocess.run([str(args.signing_tool.resolve()),'sign','--exclude','Contents/Resources/runtimes/LibreOffice.app','--exclude','Contents/Resources/runtimes/LibreOffice.app/**','--entitlements-xml-file',str(ROOT/'desktop/installer/entitlements.mac.plist'),str(app)],check=True)
    removed_after_sign=clean_residue(app)
    verify_staging_paths(app,expected_paths)
    spec=importlib.util.spec_from_file_location('macho_pages',ROOT/'scripts/verify-macho-pages.py')
    verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)
    verified_binaries=0;verified_pages=0
    for file in app.rglob('*'):
        if not file.is_file() or file.is_symlink():continue
        with file.open('rb') as stream:header=stream.read(4)
        if header in [bytes.fromhex('cffaedfe'),bytes.fromhex('cefaedfe'),bytes.fromhex('cafebabe')]:
            data=file.read_bytes()
            if header==bytes.fromhex('cafebabe') and struct.unpack_from('>I',data,4)[0]>16:continue # Java class, not FAT Mach-O
            # MH_OBJECT files are linker inputs, not runnable code and have no code signature.
            if header==bytes.fromhex('cffaedfe') and struct.unpack_from('<I',data,12)[0]==1:continue
            verified_pages+=verifier.verify(data,require_adhoc=not file.is_relative_to(resources/'runtimes/LibreOffice.app'))
            verified_binaries+=1
    for f in (native/'LibreOffice.app').rglob('*'):
        if f.is_file() and not f.is_symlink() and digest(f)!=digest(resources/'runtimes/LibreOffice.app'/f.relative_to(native/'LibreOffice.app')):raise ValueError('vendor LibreOffice bytes changed during signing')
    app_sha=digest(resources/'app.asar')
    manifest={'product':'WillBuddy','version':version,'architecture':'arm64','minimum_macos':info.get('LSMinimumSystemVersion'),'runtime':'Electron '+electron,'runtime_sha256':runtime_sha,'app_asar_sha256':app_sha,'signature':'ad-hoc; no Developer ID or notarization','native_mac_tested':False,'signature_validation':'Mach-O hash verification; macOS resource-seal and Gatekeeper verification pending','verified_macho_binaries':verified_binaries,'verified_code_pages':verified_pages,'files':[]}
    manifest['native_runtimes']=native_manifest
    manifest['files']=inventory(stage,app)
    verify_staging_paths(app,expected_paths)
    manifest['archive_policy']='closed inventory; reject .BC.*, AppleDouble, case collisions, missing and extra files'
    manifest['removed_staging_residues']={'before_sign':removed_before_sign,'after_sign':removed_after_sign}
    (stage/'OFFLINE-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    shutil.copy2(ROOT/'desktop/installer/Install-WillBuddy.command',stage/'Install-WillBuddy.command')
    (stage/'Install-WillBuddy.command').chmod(0o755)
    shutil.copy2(ROOT/'desktop/installer/README-Mac.txt',stage/'READ-ME.txt')
    shutil.copy2(extracted/'LICENSE',stage/'ELECTRON-LICENSE.txt')
    for name in ['LICENSES.chromium.html']:
        if (extracted/name).exists():shutil.copy2(extracted/name,stage/name)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    archive_check=write_archive(stage,manifest['files'],args.output.resolve())
    print(json.dumps({'file':str(args.output.resolve()),'version':version,'bytes':args.output.stat().st_size,'sha256':digest(args.output),'app_asar_sha256':app_sha,'architecture':'arm64','signature':'ad-hoc','verified':True,'archive_check':archive_check}))

if __name__=='__main__':main()
