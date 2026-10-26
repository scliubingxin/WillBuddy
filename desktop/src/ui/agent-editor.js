import { registryChoices, mcpAuthFields } from "./capability-library.js";
import { escape } from "./markdown.js";
const tools = [
  "document_write",
  "document_create",
  "document_read",
  "document_edit",
  "document_patch",
  "document_convert",
  "browser_open",
  "browser_read",
  "browser_snapshot",
  "browser_click",
  "browser_fill",
  "cli_execute",
];
const skillRow = (s = {}) =>
  `<div class="agent-skill-row"><label>技能名称<input name="skillName" maxlength="60" value="${escape(s.name || "")}"></label><label>简介<input name="skillDescription" maxlength="200" value="${escape(s.description || "")}"></label><label>技能操作步骤 / SKILL.md<textarea name="skillInstructions" maxlength="12000">${escape(s.instructions || "")}</textarea></label><button type="button" data-agent-remove>移除技能</button></div>`;
const mcpRow = (s = {}) =>
  `<div class="agent-mcp-row"><label>连接名称<input name="mcpName" maxlength="40" value="${escape(s.name || "")}"></label><label>MCP Streamable HTTP 地址<input name="mcpUrl" type="url" placeholder="http://localhost:3000/mcp" value="${escape(s.url || "")}"></label><button type="button" data-agent-remove>移除连接</button></div>`;
export function agentEditor(a = {}, documents = [], state = {}) {
  return `<section class="agent-capabilities"><h3>知识库文档</h3><p>先在成果中心导入文档。智能体可跨已绑定文档检索中文/英文片段，逐份读取仍需批准；结果带文档版本、哈希与行号。最多8份，不是向量语义检索。</p><div class="agent-knowledge">${documents.map((d) => `<label class="check"><input type="checkbox" name="knowledge" value="${escape(d.id)}" ${(a.knowledge || []).includes(d.id) ? "checked" : ""}>${escape(d.name)} · ${escape(d.format)} v${d.revision}</label>`).join("") || "<p>暂无文档，请先到成果中心导入。</p>"}</div><h3>绑定 Skills</h3><div id="boundSkills">${registryChoices("skills", state, a)}</div><p class="binding-hint">勾选技能库中已上传并启用的技能即可绑定。上传与维护请前往 Skills 技能库。</p><div id="agentSkills" hidden>${(a.skills || []).map(skillRow).join("")}</div><h3>Tools 工具范围</h3><div class="agent-tools">${tools.map((n) => `<label class="check"><input type="checkbox" name="agentTool" value="${n}" ${!a.tools || a.tools.includes(n) ? "checked" : ""}>${n}</label>`).join("")}</div><h3>绑定 MCP 客户端</h3><div id="boundMcp">${registryChoices("mcp", state, a)}</div><button type="button" data-agent-new-mcp>配置新的 MCP</button><div id="inlineMcpConfig" hidden><label>连接名称<input name="registryMcpName" maxlength="40"></label><label>服务地址<input name="registryMcpUrl" type="url" placeholder="https://example.com/mcp"></label>${mcpAuthFields({}, "registryMcp")}<button type="button" data-agent-save-mcp>保存连接并选中</button><small>只保存配置，测试与实际连接需另行批准。不在URL中填写密钥；暂不支持OAuth/stdio。</small></div><details ${a.mcp?.length ? "open" : ""}><summary>原有内嵌 MCP 配置</summary><h3>MCP 连接</h3><p>支持无需登录的 HTTPS 或本机 HTTP Streamable HTTP 服务；每轮先批准发现，每次调用再批准。暂不支持 stdio / OAuth，不在地址中填写密钥。</p><div id="agentMcp">${(a.mcp || []).map(mcpRow).join("")}</div><button type="button" data-agent-add="mcp">添加 MCP 服务</button></details><label>ReAct 最大模型轮数<input type="number" name="maxSteps" min="1" max="96" value="${a.maxSteps || 32}" required></label><p>模型选择工具 → 执行 → 观察结果 → 验收或继续；默认32轮，可配置1–96轮；每次模型回复最多8个工具调用，仍可随时停止。关闭对话工具模式时不连接MCP或读取技能/知识。</p></section>`;
}
export function bindAgentEditor(
  modal,
  { uploadSkill, saveMcp, onError = () => {} } = {},
) {
  const editorForm = modal.querySelector("form");
  const isCurrent = () =>
    modal.open && modal.querySelector("form") === editorForm;
  modal.onclick = async (e) => {
    const selected = (field) =>
      [...modal.querySelectorAll("[name=" + field + "]:checked")].map(
        (el) => el.value,
      );
    const refresh = (kind, state, id) => {
      if (!isCurrent()) return;
      const field = kind === "skills" ? "skillId" : "mcpId";
      const ids = [...selected(field), ...(id ? [id] : [])];
      modal.querySelector(
        kind === "skills" ? "#boundSkills" : "#boundMcp",
      ).innerHTML = registryChoices(kind, state, {
        [kind === "skills" ? "skillIds" : "mcpIds"]: ids,
      });
    };
    const upload = e.target.closest("[data-agent-upload]"),
      save = e.target.closest("[data-agent-save-mcp]");
    if (upload || save) {
      const button = upload || save;
      button.disabled = true;
      try {
        if (upload) {
          const out = await uploadSkill();
          refresh("skills", out.state, out.imported?.id);
        } else {
          const secretInput = modal.querySelector("[name=registryMcptoken]");
          const token = secretInput.value;
          secretInput.value = "";
          const out = await saveMcp({
            name: modal.querySelector("[name=registryMcpName]").value,
            url: modal.querySelector("[name=registryMcpUrl]").value,
            auth: modal.querySelector("[name=registryMcpauth]").value,
            token,
            enabled: true,
          });
          if (isCurrent())
            modal.querySelector("[name=registryMcptoken]").value = "";
          refresh("mcp", out.state, out.saved.id);
          if (isCurrent())
            modal.querySelector("#inlineMcpConfig").hidden = true;
        }
      } catch (error) {
        onError(error.message);
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (e.target.closest("[data-agent-new-mcp]")) {
      modal.querySelector("#inlineMcpConfig").hidden = false;
      return;
    }
    const remove = e.target.closest("[data-agent-remove]");
    if (remove) {
      remove.parentElement.remove();
      return;
    }
    const add = e.target.closest("[data-agent-add]");
    if (!add) return;
    const skills = add.dataset.agentAdd === "skill",
      host = modal.querySelector(skills ? "#agentSkills" : "#agentMcp");
    if (host.children.length >= (skills ? 8 : 3)) return;
    host.insertAdjacentHTML("beforeend", skills ? skillRow() : mcpRow());
  };
}
export function readAgentEditor(form, modal) {
  return {
    knowledge: form.getAll("knowledge"),
    skillIds: form.getAll("skillId"),
    mcpIds: form.getAll("mcpId"),
    tools: form.getAll("agentTool"),
    maxSteps: Number(form.get("maxSteps")),
    skills: [...modal.querySelectorAll(".agent-skill-row")].map((r) => ({
      name: r.querySelector("[name=skillName]").value,
      description: r.querySelector("[name=skillDescription]").value,
      instructions: r.querySelector("[name=skillInstructions]").value,
    })),
    mcp: [...modal.querySelectorAll(".agent-mcp-row")].map((r) => ({
      name: r.querySelector("[name=mcpName]").value,
      url: r.querySelector("[name=mcpUrl]").value,
    })),
  };
}
