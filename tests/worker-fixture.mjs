import {createRequire} from 'node:module';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const {Miniflare,Response:WorkerResponse}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
export {WorkerResponse};
export async function createWorkerFixture(options={}){
 const temp=mkdtempSync(join(tmpdir(),'muyun-worker-test-'));
 try{
  const scriptPath=join(temp,'worker.mjs');
  await build({entryPoints:['tests/worker-fixture.ts'],outfile:scriptPath,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],logLevel:'silent'});
  const mf=new Miniflare({modules:true,script:readFileSync(scriptPath,'utf8'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],...options});
  return {mf,async dispose(){try{await mf.dispose();}finally{rmSync(temp,{recursive:true,force:true});}}};
 }catch(e){rmSync(temp,{recursive:true,force:true});throw e;}
}
