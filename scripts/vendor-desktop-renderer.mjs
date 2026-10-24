/** Copy pinned, lockfile-verified build dependencies into the offline renderer. */
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('../desktop/',import.meta.url),out=new URL('src/vendor/',base);
await mkdir(out,{recursive:true});const records=[];
for(const [packageName,input,output,license] of [['marked','lib/marked.esm.js','marked.js','LICENSE'],['dompurify','dist/purify.es.mjs','purify.js','LICENSE']]){
 const root=new URL('node_modules/'+packageName+'/',base);const metadata=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
 for(const [src,dst] of [[input,output],[license,packageName+'-LICENSE.txt']]){const bytes=await readFile(new URL(src,root));await writeFile(new URL(dst,out),bytes);records.push({path:dst,package:packageName,version:metadata.version,sha256:createHash('sha256').update(bytes).digest('hex')});}
}
await writeFile(new URL('MANIFEST.json',out),JSON.stringify({files:records},null,2)+'\n');console.log('Vendored pinned Markdown/sanitizer modules and licenses');
