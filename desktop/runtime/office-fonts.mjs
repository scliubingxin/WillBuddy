import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const xml = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');

// The private config affects only this worker. It never copies or modifies fonts.
export async function officeFontEnvironment({directory,officeDirectory,platform=process.platform,home=os.homedir()}) {
 if(platform!=='darwin')return {};
 if(!path.isAbsolute(directory)||!path.isAbsolute(officeDirectory)||!path.isAbsolute(home)||[directory,officeDirectory,home].some(v=>/[\x00-\x1f]/.test(v)))throw Error('Office字体路径无效');
 const cache=path.join(directory,'font-cache');await mkdir(cache,{mode:0o700});
 const dirs=[path.resolve(officeDirectory,'../Resources/fonts/truetype'),'/System/Library/Fonts','/System/Library/Assets','/System/Library/AssetsV2','/Library/Fonts',path.join(home,'Library/Fonts')];
 const config=path.join(directory,'fontconfig-willbuddy.conf');
 const content='<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n'+dirs.map(p=>' <dir>'+xml(p)+'</dir>').join('\n')+'\n <cachedir>'+xml(cache)+'</cachedir>\n</fontconfig>\n';
 await writeFile(config,content,{mode:0o600,flag:'wx'});
 return {FONTCONFIG_FILE:config,FONTCONFIG_PATH:directory};
}
