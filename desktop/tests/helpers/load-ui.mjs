import {mountSpreadsheet} from '../../src/ui/spreadsheet.js';
import {mountWordRuns} from '../../src/ui/word-runs.js';
import {mountWordCanvas} from '../../src/ui/word-canvas.js';
import {documentLibrary,documentExamples,messageDocuments} from '../../src/ui/documents.js';
import {readFile} from 'node:fs/promises';
import {escape,createRich,htmlPreview} from '../../src/ui/markdown.js';
import * as views from '../../src/ui/workspace.js';
export async function loadUI(window) {
  const rich=createRich(window).rich;
  const preview=content=>'<!doctype html><html><body>'+createRich(window).sanitizeHtml(content)+'</body></html>';
  window.__uiModules={mountSpreadsheet,mountWordRuns,mountWordCanvas,escape,rich,views,htmlPreview:preview,documentLibrary,documentExamples,messageDocuments};
  const source=await readFile(new URL('../../src/app.js',import.meta.url),'utf8');
  window.eval(source.replace(/^import .*;\n/gm,'')
    .replace(/^/,'const {mountSpreadsheet,mountWordRuns,mountWordCanvas,escape,rich,views,htmlPreview,documentLibrary,documentExamples,messageDocuments}=window.__uiModules;\n'));
}
