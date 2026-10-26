import {escape} from './markdown.js';
export function presetCatalog(kind,state){
 const catalog=state.capabilityPresets,items=catalog?.[kind]||[];if(!items.length)return '';
 const skill=kind==='skills',categories=[...new Set(items.map(p=>p.category))];
 return `<section class="preset-catalog" data-preset-catalog="${kind}"><h3>${skill?'预置技能':'预置 MCP 工具'}</h3><p>${skill?'公开MIT技能与WillBuddy内置工作流，添加后即可绑定；不自动运行脚本。':'官方公开服务模板；按需填写自己的密钥，保存不联网。测试成功后才显示发现的真实工具。'}</p><div class="preset-filters"><input type="search" data-preset-search aria-label="搜索${skill?'预置技能':'预置MCP'}" placeholder="搜索名称、用途"><select data-preset-category aria-label="${skill?'技能':'MCP'}分类"><option value="">全部分类</option>${categories.map(c=>`<option>${escape(c)}</option>`).join('')}</select></div><div class="cards">${items.map(p=>{
 const installed=skill?(state.skillPackages||[]).find(s=>s.sha256===p.sha256):(state.mcpConnections||[]).find(c=>c.url.replace(/\/$/,'')===p.url.replace(/\/$/,''));
 return `<div class="card preset-card" data-preset-searchable="${escape([p.title,p.description,p.category].join(' ').toLowerCase())}" data-preset-kind="${escape(p.category)}"><small>${escape(p.category)} · ${skill?p.id.startsWith('public-')?'公开技能 · MIT':'WillBuddy 内置':'Streamable HTTP'}</small><h3>${escape(p.title)}</h3><p>${escape(p.description)}</p>${skill?`<small>${escape(p.license)} · ${p.fileCount} 个文件</small>`:`<p>${escape(p.setup)}</p><small>${escape(p.url)}</small><small>${p.auth==='bearer'?'需要你填写密钥':'公共入口 · 可能限流'} · ${installed?'已配置，状态见上方':'未配置、未测试'}</small>`}<details><summary>来源与使用条件</summary><p>${escape(p.source)}</p><p>目录核对日期：${escape(catalog.checkedDate)}。${skill?'技能不新增工具权限；依赖CLI或其他技能时须单独具备。':'账户权限、服务可用性和费用以提供方为准。'}</p></details><div class="actions"><button class="secondary" data-action="${skill?'addPresetSkill':'newPresetMcp'}" data-id="${escape(p.id)}" ${skill&&installed?'disabled':''}>${skill?installed?'已添加':'添加技能':installed?'查看配置':'配置连接'}</button></div></div>`;
 }).join('')}</div><p data-preset-empty hidden>没有匹配的预置项。</p></section>`;
}
export function bindPresetFilters(root){for(const section of root.querySelectorAll('[data-preset-catalog]')){
 const search=section.querySelector('[data-preset-search]'),category=section.querySelector('[data-preset-category]');
 const update=()=>{let shown=0;for(const card of section.querySelectorAll('[data-preset-searchable]')){const visible=card.dataset.presetSearchable.includes(search.value.toLowerCase().trim())&&(!category.value||card.dataset.presetKind===category.value);card.hidden=!visible;if(visible)shown++;}section.querySelector('[data-preset-empty]').hidden=shown>0;};
 search.addEventListener('input',update);category.addEventListener('change',update);
}}
