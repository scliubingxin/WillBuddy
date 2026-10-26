import {presetCatalog} from './preset-catalog.js';
import { escape } from "./markdown.js";
export function capabilityTabs(tab) {
  return `<div class="capability-tabs" role="tablist">${[
    ["agents", "智能体"],
    ["skills", "Skills 技能库"],
    ["mcp", "MCP 连接器"],
  ]
    .map(
      ([id, name]) =>
        `<button role="tab" aria-selected="${id === tab}" class="${id === tab ? "active" : ""}" data-action="capabilityTab" data-id="${id}">${name}</button>`,
    )
    .join("")}</div>`;
}
export function registryChoices(kind, state, a = {}) {
  const skill = kind === "skills",
    items = skill ? state.skillPackages || [] : state.mcpConnections || [],
    ids = skill ? a.skillIds || [] : a.mcpIds || [],
    field = skill ? "skillId" : "mcpId";
  return (
    items
      .map(
        (row) =>
          `<label class="capability-choice"><input type="checkbox" name="${field}" value="${escape(row.id)}" ${ids.includes(row.id) ? "checked" : ""} ${!row.enabled && !ids.includes(row.id) ? "disabled" : ""}><span><strong>${escape(row.name)}</strong><small>${escape(skill ? row.description : row.url)}</small><small>${row.enabled ? "已启用" : "已停用"}${skill ? " · " + row.files.length + " 个文件" : ""}</small></span></label>`,
      )
      .join("") ||
    `<p>暂无${skill ? "已上传技能" : "MCP连接"}，可以在这里添加，也可从独立管理页维护。</p>`
  );
}
export function skillsPage(state) {
  return `<div class="capability-intro"><h2>Skills 技能库</h2><p>上传 SKILL.md 或包含它的 ZIP，在构建智能体时按需绑定。ZIP输入32MiB／展开16MiB／单资源4MiB；资源保存在本机，上传不执行脚本。</p><button class="primary" data-action="uploadSkill">上传 Skill</button></div><div class="cards">${(state.skillPackages || []).map((s) => `<div class="card"><span class="tile-icon">SK</span><h3>${escape(s.name)}</h3><p>${escape(s.description)}</p><small>${s.enabled ? "已启用" : "已停用"} · ${s.files.length} 个文件 · ${s.bytes} 字节</small><div class="actions"><button class="secondary" data-action="inspectSkill" data-id="${escape(s.id)}">查看内容</button><button class="secondary" data-action="toggleSkill" data-id="${escape(s.id)}">${s.enabled ? "停用" : "启用"}</button><button class="secondary" data-action="removeSkill" data-id="${escape(s.id)}">删除</button></div></div>`).join("") || '<div class="empty-state">还没有技能。上传后即可在智能体配置中选择。</div>'}</div>${presetCatalog("skills",state)}`;
}
export function mcpPage(state, busy = new Set()) {
  return `<div class="capability-intro"><h2>MCP 连接器</h2><p>配置一次，在多个智能体中复用。连接测试只发现真实工具，业务调用仍逐次审批。</p><button class="primary" data-action="newMcp">添加 MCP 连接</button></div><div class="cards">${(state.mcpConnections || []).map((c) => `<div class="card"><span class="tile-icon">MCP</span><h3>${escape(c.name)}</h3><p>${escape(c.description || "自定义MCP服务")}</p><small class="connection-url">${escape(c.url)}</small><small>${c.enabled ? "已启用" : "已停用"} · ${c.auth === "bearer" ? "Bearer · " + (c.hasToken ? "凭据已配置" : "缺少凭据") : "无认证"} · ${busy.has(c.id) ? "正在测试" : c.lastTest?.status === "succeeded" ? "上次发现 " + c.lastTest.tools.length + " 项工具" : c.lastTest ? "上次测试未通过" : "尚未测试"}</small><div class="actions"><button class="secondary" data-action="editMcp" data-id="${escape(c.id)}">配置</button><button class="secondary" data-action="testMcp" data-id="${escape(c.id)}" ${busy.has(c.id) || !c.enabled ? "disabled" : ""}>测试连接</button>${busy.has(c.id) ? `<button class="secondary" data-action="cancelMcpTest" data-id="${escape(c.id)}">取消测试</button>` : ""}<button class="secondary" data-action="removeMcp" data-id="${escape(c.id)}">删除</button></div>${c.lastTest?.status === "succeeded" ? `<details><summary>上次发现的工具（非实时在线状态）</summary>${c.lastTest.tools.map((t) => `<p><strong>${escape(t.name)}</strong><small>${escape(t.description)}</small></p>`).join("")}</details>` : ""}</div>`).join("") || '<div class="empty-state">还没有连接器。添加服务后，可先测试再绑定智能体。</div>'}</div>${presetCatalog("mcp",state)}`;
}

/** The token field is always blank. Existing secrets are never returned to HTML. */
export function mcpAuthFields(c = {}, prefix = "") {
  return `<label>认证方式<select name="${prefix}auth"><option value="none" ${c.auth !== "bearer" ? "selected" : ""}>无认证</option><option value="bearer" ${c.auth === "bearer" ? "selected" : ""}>Bearer Token</option></select></label><label>Bearer Token<input name="${prefix}token" type="password" data-mcp-secret autocomplete="off" spellcheck="false" maxlength="4096" placeholder="${c.hasToken ? "已保存；留空保留同一地址的令牌" : "选择Bearer后填写，8–4096字符"}"></label><small>${c.hasToken ? "此连接已配置凭据。" : "此连接尚未配置凭据。"}令牌仅通过系统安全存储加密保存；不支持时拒绝保存。更换地址需重新填写；选择无认证并保存将清除令牌。保存不联网。</small>`;
}
