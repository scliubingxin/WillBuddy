import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('production preload exposes officeOpen exactly through trusted actwill IPC',async()=>{
 let bridge;const calls=[];
 const electron={
  contextBridge:{exposeInMainWorld:(name,value)=>{assert.equal(name,'actwill');bridge=value;}},
  ipcRenderer:{invoke:async(...args)=>{calls.push(args);return {status:'opened'};},on(){},removeListener(){}}
 };
 vm.runInNewContext(await readFile(new URL('../preload.cjs',import.meta.url),'utf8'),{require:name=>{assert.equal(name,'electron');return electron;}});
 assert.equal(typeof bridge.officeOpen,'function');assert.equal(Object.isFrozen(bridge),true);assert.equal(bridge.invoke,undefined);
 assert.deepEqual(await bridge.officeOpen({id:'doc',revision:1}),{status:'opened'});assert.equal(calls[0][0],'actwill:officeOpen');assert.equal(calls[0][1].id,'doc');
});
