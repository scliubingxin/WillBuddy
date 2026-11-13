// Run with ELECTRON_RUN_AS_NODE=1 <electron> office-worker-asar.mjs <fixture.asar>
// The fixture must include the current desktop runtime and core.mjs.
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const fixture=process.argv[2];if(!fixture?.endsWith('.asar'))throw Error('Supply a fixture ASAR path');
const dir=await mkdtemp(path.join(tmpdir(),'wb-asar-office-'));
try {
 const gen=spawnSync('python3',['-c','from docx import Document; import sys; d=Document(); d.add_paragraph("Packaged Office test"); d.save(sys.argv[1])',path.join(dir,'document.docx')]);
 if(gen.status!==0)throw Error('DOCX test fixture failed: '+String(gen.stderr));
 const {startOfficeKit}=await import(pathToFileURL(path.resolve(fixture)+'/runtime/office-kit.mjs').href);
 const officeDirectory=process.env.WB_TEST_OFFICE_DIRECTORY||'/opt/codex/runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/program';
 const kit=await startOfficeKit({python:process.env.WB_TEST_PYTHON||'python3',officeDirectory,directory:dir,format:'docx'});
 try {const shot=await kit.request('snapshot',{width:300,height:200,x:0,y:0,scale:15});if(!shot.png)throw Error('Office did not render');
  const worker=await readFile(path.join(dir,'worker.py'));console.log(JSON.stringify({electron:process.versions.electron,workerSha256:createHash('sha256').update(worker).digest('hex'),renderedBase64Length:shot.png.length}));
 } finally {kit.close();await kit.closed;}
} finally {await rm(dir,{recursive:true,force:true});}
