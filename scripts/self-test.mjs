import {spawnSync} from 'node:child_process';
// Reproducible local regression gate; external APIs are simulated, never paid.
// Run the current Sites build helper separately after this gate succeeds.
for(const [name,args] of [
 ['TypeScript',['node_modules/typescript/bin/tsc','--noEmit']],
 ['Composer send lifecycle',['tests/composer-send.mjs']],
 ['Composer delete lifecycle',['tests/composer-delete.mjs']],
 ['Composer branch lifecycle',['tests/composer-branch.mjs']],
 ['Composer conversation rename',['tests/composer-rename.mjs']],
 ['Composer conversation export',['tests/composer-export.mjs']],
 ['Composer safe conversation import',['tests/composer-import.mjs']],
 ['Composer session drafts',['tests/composer-drafts.mjs']],
 ['All integration tests',['tests/integration.mjs']],
 ['Chat request idempotency',['tests/chat-idempotency.mjs']],
 ['Document agent loop',['tests/document-agent.mjs']],
 ['Document approval audit export',['tests/document-audit.mjs']],
 ['Cloudflare Worker runtime',['tests/worker-runtime-regression.mjs']],
]){
 console.log(`RUN: ${name}`);
 const result=spawnSync(process.execPath,args,{stdio:'inherit'});
 if(result.error||result.status!==0){console.error(`FAIL: ${name}`);process.exit(result.status||1);}
}
console.log('RUN: Local runner scheduler, HTTP boundaries and sandbox fail-closed regression');
const local=spawnSync('python3',['tests/local-runner-test.py'],{stdio:'inherit'});
if(local.error||local.status!==0)process.exit(local.status||1);
console.log('PASS: local regression gate. Production login, real models, actual Docker isolation and browser/Office rendering are separate checks.');
