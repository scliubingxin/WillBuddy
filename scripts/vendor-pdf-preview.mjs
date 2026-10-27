import {build} from '../desktop/node_modules/esbuild/lib/main.js';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'desktop/src/pdf');const resources={};
for(const [kind,folder,extension] of [['cMapUrl','cmaps','.bcmap'],['standardFontDataUrl','standard_fonts',null]]){
 const base=path.join(root,'desktop/node_modules/pdfjs-dist',folder);
 for(const name of (await fs.readdir(base)).sort()){
  if(extension?!name.endsWith(extension):!(/\.(pfb|ttf)$/.test(name)))continue;
  resources[kind+'/'+name]=(await fs.readFile(path.join(base,name))).toString('base64');
 }
 for(const name of await fs.readdir(base))if(name.startsWith('LICENSE'))await fs.copyFile(path.join(base,name),path.join(dir,folder+'-'+name+'.txt'));
}
await fs.writeFile(path.join(dir,'binary-resources.js'),'// Vendored pdfjs-dist 5.6.205 character maps and standard fonts; licenses alongside.\nexport default '+JSON.stringify(resources)+';\n');
await build({entryPoints:[path.join(dir,'frame-source.js')],outfile:path.join(dir,'engine.js'),bundle:true,format:'iife',platform:'browser',target:'chrome120',minify:true,nodePaths:[path.join(root,'desktop/node_modules')]});const b=await fs.readFile(path.join(dir,'engine.js'));await fs.copyFile(path.join(root,'desktop/node_modules/pdfjs-dist/LICENSE'),path.join(dir,'PDFJS-LICENSE.txt'));await fs.writeFile(path.join(dir,'PDF-MANIFEST.json'),JSON.stringify({package:'pdfjs-dist',version:'5.6.205',bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')},null,2)+'\n');
