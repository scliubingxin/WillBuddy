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
from offline_bundle import clean_residue, inventory, write_archive

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
    p=argparse.ArgumentParser();p.add_argument('--runtime',type=Path,required=True);p.add_argument('--checksums',type=Path,required=True);p.add_argument('--work-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--signing-tool',type=Path,required=True);args=p.parse_args()
    metadata=json.loads((ROOT/'desktop/package.json').read_text());version=metadata['version'];electron=metadata['devDependencies']['electron']
    expected_name=f'electron-v{electron}-darwin-arm64.zip'
    if args.runtime.name!=expected_name:raise ValueError('runtime must match locked Electron version and arm64 architecture')
    checks={line.split()[1].lstrip('*'):line.split()[0] for line in args.checksums.read_text().splitlines() if len(line.split())==2}
    runtime_sha=digest(args.runtime)
    if checks.get(expected_name)!=runtime_sha:raise ValueError('Electron release checksum mismatch')
    stage=args.work_dir.resolve()
    if stage.exists():raise ValueError('choose a new, empty work directory')
    stage.mkdir(parents=True);extracted=stage/'runtime';extracted.mkdir();extract_runtime(args.runtime,extracted)
    app=stage/'WillBuddy.app';shutil.move(str(extracted/'Electron.app'),app)
    removed_before_sign=clean_residue(app)
    info_path=app/'Contents/Info.plist';info=plistlib.loads(info_path.read_bytes())
    info.update(CFBundleName='WillBuddy',CFBundleDisplayName='WillBuddy',CFBundleIdentifier='com.actwill.desktop',CFBundleShortVersionString=version,CFBundleVersion=version,CFBundleIconFile='WillBuddy.icns')
    info_path.write_bytes(plistlib.dumps(info,fmt=plistlib.FMT_XML))
    resources=app/'Contents/Resources';shutil.copy2(ROOT/'desktop/assets/app.icns',resources/'WillBuddy.icns')
    (resources/'default_app.asar').unlink(missing_ok=True)
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
    subprocess.run([str(args.signing_tool.resolve()),'sign','--entitlements-xml-file',str(ROOT/'desktop/installer/entitlements.mac.plist'),str(app)],check=True)
    removed_after_sign=clean_residue(app)
    spec=importlib.util.spec_from_file_location('macho_pages',ROOT/'scripts/verify-macho-pages.py')
    verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)
    verified_binaries=0;verified_pages=0
    for file in app.rglob('*'):
        if not file.is_file() or file.is_symlink():continue
        with file.open('rb') as stream:header=stream.read(4)
        if header in [bytes.fromhex('cffaedfe'),bytes.fromhex('cefaedfe'),bytes.fromhex('cafebabe')]:
            verified_pages+=verifier.verify(file.read_bytes())
            verified_binaries+=1
    app_sha=digest(resources/'app.asar')
    manifest={'product':'WillBuddy','version':version,'architecture':'arm64','minimum_macos':info.get('LSMinimumSystemVersion'),'runtime':'Electron '+electron,'runtime_sha256':runtime_sha,'app_asar_sha256':app_sha,'signature':'ad-hoc; no Developer ID or notarization','native_mac_tested':False,'signature_validation':'Mach-O hash verification; macOS resource-seal and Gatekeeper verification pending','verified_macho_binaries':verified_binaries,'verified_code_pages':verified_pages,'files':[]}
    manifest['files']=inventory(stage,app)
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
