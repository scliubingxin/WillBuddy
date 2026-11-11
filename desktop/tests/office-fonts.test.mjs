import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,copyFile,readFile,rm,stat,access} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {officeFontEnvironment} from '../runtime/office-fonts.mjs';

test('private macOS fontconfig discovers system font directories and escapes unusual home paths',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wb-fonts-'));try{
  const home=path.join(root,'A&B');const fonts=path.join(home,'Library/Fonts');await mkdir(fonts,{recursive:true});
  const job=path.join(root,'job');await mkdir(job);const env=await officeFontEnvironment({platform:'darwin',directory:job,officeDirectory:'/Applications/LibreOffice.app/Contents/MacOS',home});
  const config=await readFile(env.FONTCONFIG_FILE,'utf8');assert.match(config,/A&amp;B/);assert.match(config,/\/System\/Library\/Fonts/);assert.match(config,/\/Resources\/fonts\/truetype/);assert.equal((await stat(env.FONTCONFIG_FILE)).mode&0o777,0o600);
  const sample='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';let available=true;try{await access(sample);}catch{available=false;}
  if(available){await copyFile(sample,path.join(fonts,'sample.ttf'));const font=spawnSync('fc-match',['--format=%{family}','DejaVu Sans'],{env:{PATH:process.env.PATH,...env},encoding:'utf8'});if(font.error?.code==='ENOENT')t.diagnostic('fc-match unavailable; native font discovery requires target-platform validation');else {assert.equal(font.status,0);assert.match(font.stdout,/DejaVu Sans/);}}
  else t.diagnostic('Linux fixture font unavailable; native font discovery requires target-platform validation');
  assert.deepEqual(await officeFontEnvironment({platform:'linux',directory:job,officeDirectory:'/office',home}),{});
 }finally{await rm(root,{recursive:true,force:true});}
});

test('font config fails closed on relative and control-character paths',async()=>{
 await assert.rejects(officeFontEnvironment({platform:'darwin',directory:'relative',officeDirectory:'/office',home:'/home'}),/字体路径无效/);
 await assert.rejects(officeFontEnvironment({platform:'darwin',directory:'/tmp/a\nb',officeDirectory:'/office',home:'/home'}),/字体路径无效/);
});
