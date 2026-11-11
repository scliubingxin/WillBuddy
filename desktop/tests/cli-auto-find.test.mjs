import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import {tmpdir} from 'node:os';import {isReadOnlyFind} from '../runtime/command.mjs';import {ToolRuntime} from '../runtime/tools.mjs';import {Store} from '../core.mjs';
const safe=args=>isReadOnlyFind({executable:'/usr/bin/find',args});
test('automatic find is restricted to fixed system executable and read-only expressions at authorized cwd',async()=>{
 if(!['darwin','linux'].includes(process.platform))return;
 for(const args of [[],['.'],['.','-type','f','(','-iname','*k8s*','-o','-iname','*kube*',')','-not','-path','*node_modules*','-print'],['-maxdepth','3','-type','d']])assert.equal(await safe(args),true,JSON.stringify(args));
 for(const args of [['/'],['..'],['./..'],['.','-delete'],['.','-exec','rm','{}',';'],['.','-execdir','sh','-c','rm -rf .',';'],['.','-fprint','out'],['.','-L'],['.','-name'],['.','-type','x'],['.','-maxdepth','99'],['.','-iname','x\ny'],['.','-name','x','-delete']])assert.equal(await safe(args),false,JSON.stringify(args));
 assert.equal(await isReadOnlyFind({executable:'/bin/bash',args:['-c','find . -delete']}),false);assert.equal(await isReadOnlyFind({executable:'/tmp/find',args:['.']}),false);
});
test('actual scoped find runs without a prompt and records authorization; shell and destructive find still require approval',{timeout:30000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'willbuddy-find-'));try{await writeFile(path.join(dir,'k8s-notes.txt'),'fixture');await writeFile(path.join(dir,'keep.txt'),'fixture');const store=new Store(dir);await store.load();store.data.folders=[{id:'f',path:dir,name:'fixture'}];let approvals=0;const runtime=new ToolRuntime({store,browser:{},approve:async()=>{approvals++;return false;}});
 const found=await runtime.execute('cli_execute',{executable:'/usr/bin/find',args:['.','-type','f','-iname','*k8s*','-print'],folderId:'f'},undefined,{chatId:'chat',runId:'run'});assert.equal(found.status,'succeeded');assert.match(found.stdout,/k8s-notes\.txt/);assert.equal(approvals,0);assert.equal(store.data.executions[0].authorization,'read_only_find');
 for(const args of [{executable:'/usr/bin/find',args:['.','-delete'],folderId:'f'},{executable:'/bin/bash',args:['-c','find . -delete'],folderId:'f'}]){const result=await runtime.execute('cli_execute',args);assert.equal(result.status,'denied');}
 assert.equal(approvals,2);assert.equal(await (await import('node:fs/promises')).readFile(path.join(dir,'keep.txt'),'utf8'),'fixture');const reloaded=new Store(dir);await reloaded.load();assert.equal(reloaded.data.executions.find(e=>e.authorization==='read_only_find').status,'succeeded');
 }finally{await rm(dir,{recursive:true,force:true});}
});
