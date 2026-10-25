import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {compactComposer,createComposerMenus} from '../src/ui/composer.js';
import {modelChoiceLabel,modelPicker} from '../src/ui/models.js';
import {escape} from '../src/ui/markdown.js';
import {initialState} from '../core.mjs';
test('open composer menu and form focus survive same-task redraw but close across tasks and outside focus',()=>{
 const dom=new JSDOM('<div id="app"></div><button id="outside">outside</button>'),d=dom.window.document,app=d.querySelector('#app'),state=initialState();
 const markup=()=>compactComposer({state,agentId:'assistant',files:[],images:[],sendImages:false,live:false,toolsEnabled:true,icon:()=>'',escape,modelName:'均衡',modelMarkup:modelPicker(state,'legacy','',escape)});
 const controller=createComposerMenus(app);app.innerHTML=markup();controller.afterRender('task-a');
 app.querySelector('[data-composer-trigger=model]').click();app.querySelector('#modelChoice').focus();controller.beforeRender();app.innerHTML=markup();controller.afterRender('task-a');
 assert.equal(app.querySelector('[data-composer-menu=model]').open,true);assert.equal(d.activeElement.id,'modelChoice');
 d.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(app.querySelector('[data-composer-menu=model]').open,false);assert.equal(d.activeElement.dataset.composerTrigger,'model');
 app.querySelector('[data-composer-trigger=add]').click();d.querySelector('#outside').focus();assert.equal(app.querySelector('[data-composer-menu=add]').open,false);
 app.querySelector('[data-composer-trigger=add]').click();controller.beforeRender();app.innerHTML=markup();controller.afterRender('task-b');assert.equal(app.querySelector('[data-composer-menu=add]').open,false);
 controller.dispose();dom.window.close();
});
test('compact model label reflects selected thinking effort and unavailable profiles without changing routing',()=>{
 const s=initialState();s.modelProfiles=[{id:'m',enabled:true,name:'工作模型',effort:'low'}];assert.equal(modelChoiceLabel(s,'auto:fast',''),'快速');assert.equal(modelChoiceLabel(s,'auto:extreme',''),'极致');assert.equal(modelChoiceLabel(s,'profile:m','high'),'工作模型 · 高');assert.equal(modelChoiceLabel(s,'profile:m',''),'工作模型 · 低');s.modelProfiles[0].enabled=false;assert.equal(modelChoiceLabel(s,'profile:m',''),'重新选择模型');
});
