import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('production Office preload exposes only the scoped manual cell IPC',async()=>{
 const source=await readFile(new URL('../office-preload.cjs',import.meta.url),'utf8'),calls=[];let exposed;
 const electron={contextBridge:{exposeInMainWorld:(name,value)=>{assert.equal(name,'willbuddyOffice');exposed=value;}},ipcRenderer:{invoke:(...args)=>{calls.push(args);return Promise.resolve('ok');},on:()=>{},removeListener:()=>{}}};
 vm.runInNewContext(source,{require:name=>{assert.equal(name,'electron');return electron;}});
 assert.equal(await exposed.invoke('manualUpdateCells',{values:[['x']]}),'ok');assert.equal(calls.length,1);assert.equal(calls[0][0],'willbuddy-office:invoke');assert.equal(calls[0][1],'manualUpdateCells');assert.equal(await exposed.invoke('discardDraft'),'ok');assert.equal(calls[1][1],'discardDraft');await assert.rejects(exposed.invoke('executeShell',{command:'x'}),/不允许/);assert.equal(calls.length,2);
});
