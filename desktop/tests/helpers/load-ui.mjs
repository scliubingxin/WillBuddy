import {readFile} from 'node:fs/promises';
import {escape,createRich,htmlPreview} from '../../src/ui/markdown.js';
import * as views from '../../src/ui/workspace.js';
export async function loadUI(window) {
  const rich=createRich(window).rich;
  const preview=content=>'<!doctype html><html><body>'+createRich(window).sanitizeHtml(content)+'</body></html>';
  window.__uiModules={escape,rich,views,htmlPreview:preview};
  const source=await readFile(new URL('../../src/app.js',import.meta.url),'utf8');
  window.eval(source.replace(/^import .*;\n/gm,'')
    .replace(/^/,'const {escape,rich,views,htmlPreview}=window.__uiModules;\n'));
}
