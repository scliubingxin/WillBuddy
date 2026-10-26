import {bindPresetFilters} from '../../src/ui/preset-catalog.js';
import {codeProjectsView} from '../../src/ui/code-projects.js';
import {createComposerImages} from '../../src/ui/composer-images.js';
import {compactComposer,createComposerMenus} from '../../src/ui/composer.js';
import {modelPicker,modelLibrary,modelForm,modelChoiceLabel} from '../../src/ui/models.js';
import {capabilityTabs,skillsPage,mcpPage} from '../../src/ui/capability-library.js';
import {agentEditor,bindAgentEditor,readAgentEditor} from '../../src/ui/agent-editor.js';
import {mountHtmlPreview} from '../../src/ui/html-preview.js';
import {installChatMedia} from '../../src/ui/chat-media.js';
import {createOfficeWorkspace} from '../../src/ui/office-workspace.js';
import {mountOfficePreview} from '../../src/ui/office-preview.js';
import {mountSpreadsheet} from '../../src/ui/spreadsheet.js';
import {mountWordRuns} from '../../src/ui/word-runs.js';
import {mountWordCanvas} from '../../src/ui/word-canvas.js';
import {documentLibrary,documentExamples,messageDocuments} from '../../src/ui/documents.js';
import {readFile} from 'node:fs/promises';
import {escape,createRich,htmlPreview} from '../../src/ui/markdown.js';
import * as views from '../../src/ui/workspace.js';
export async function loadUI(window) {
  if(window.actwill&&!window.actwill.previewFile)window.actwill.previewFile=window.actwill.readFile;
  const rich=createRich(window).rich;
  const preview=content=>'<!doctype html><html><body>'+createRich(window).sanitizeHtml(content)+'</body></html>';
  window.__uiModules={bindPresetFilters,codeProjectsView,createComposerImages,compactComposer,createComposerMenus,modelChoiceLabel,modelPicker,modelLibrary,modelForm,capabilityTabs,skillsPage,mcpPage,agentEditor,bindAgentEditor,readAgentEditor,mountHtmlPreview,installChatMedia,createOfficeWorkspace,mountOfficePreview,mountSpreadsheet,mountWordRuns,mountWordCanvas,escape,rich,views,htmlPreview:preview,documentLibrary,documentExamples,messageDocuments};
  const source=await readFile(new URL('../../src/app.js',import.meta.url),'utf8');
  window.eval(source.replace(/^import .*;\n/gm,'')
    .replace(/^/,'const {bindPresetFilters,codeProjectsView,createComposerImages,compactComposer,createComposerMenus,modelChoiceLabel,modelPicker,modelLibrary,modelForm,capabilityTabs,skillsPage,mcpPage,agentEditor,bindAgentEditor,readAgentEditor,mountHtmlPreview,installChatMedia,createOfficeWorkspace,mountOfficePreview,mountSpreadsheet,mountWordRuns,mountWordCanvas,escape,rich,views,htmlPreview,documentLibrary,documentExamples,messageDocuments}=window.__uiModules;\n'));
}
