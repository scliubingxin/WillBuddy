import {readFile} from 'node:fs/promises';
import {escape,rich} from '../../src/ui/markdown.js';
import * as views from '../../src/ui/workspace.js';
export async function loadUI(window) {
  window.__uiModules={escape,rich,views};
  const source=await readFile(new URL('../../src/app.js',import.meta.url),'utf8');
  window.eval(source.replace(/^import .*;\n/gm,'')
    .replace(/^/,'const {escape,rich,views}=window.__uiModules;\n'));
}
