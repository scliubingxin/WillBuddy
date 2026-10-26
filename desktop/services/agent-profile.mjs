import { toolDefinitions } from "../runtime/agent.mjs";
const names = new Set(toolDefinitions.map((t) => t.function.name));
const text = (v, max, label) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw Error(label + "无效或过长");
  return v.trim();
};
export function mcpUrl(value) {
  const u = new URL(text(value, 250, "MCP地址"));
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !["https:", "http:"].includes(u.protocol) ||
    (u.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))
  )
    throw Error("MCP只支持HTTPS或本机HTTP，无凭据/查询参数");
  return u.href;
}
export function agentCapabilities(p = {}) {
  const ids = (value, max, label) => {
    if (
      !Array.isArray(value) ||
      value.length > max ||
      new Set(value).size !== value.length ||
      value.some((v) => typeof v !== "string" || !v || v.length > 100)
    )
      throw Error(label + "绑定无效");
    return [...value];
  };
  const skillIds = ids(p.skillIds || [], 8, "Skill"),
    mcpIds = ids(p.mcpIds || [], 3, "MCP");
  const tools = p.tools === undefined ? [...names] : p.tools;
  if (
    !Array.isArray(tools) ||
    tools.length > names.size ||
    new Set(tools).size !== tools.length ||
    tools.some((n) => !names.has(n))
  )
    throw Error("智能体工具白名单无效");
  const knowledge = p.knowledge || [];
  if (
    !Array.isArray(knowledge) ||
    knowledge.length > 8 ||
    new Set(knowledge).size !== knowledge.length ||
    knowledge.some((id) => typeof id !== "string" || id.length > 100)
  )
    throw Error("最多绑定8份不同知识文档");
  const skills = p.skills || [];
  if (!Array.isArray(skills) || skills.length > 8) throw Error("最多8项技能");
  const skillNames = new Set();
  const cleanSkills = skills.map((s) => {
    const name = text(s.name, 64, "技能名称");
    if (skillNames.has(name)) throw Error("技能名称重复");
    skillNames.add(name);
    return {
      name,
      description: text(s.description || name, 1024, "技能简介"),
      instructions: text(s.instructions, 12000, "技能正文"),
    };
  });
  if (cleanSkills.reduce((n, s) => n + s.instructions.length, 0) > 30000)
    throw Error("技能正文总计最多30000字符");
  const mcp = p.mcp || [];
  if (!Array.isArray(mcp) || mcp.length > 3) throw Error("最多3个MCP连接");
  const cleanMcp = mcp.map((s) => ({
    name: text(s.name, 40, "MCP名称"),
    url: mcpUrl(s.url),
  }));
  if (new Set(cleanMcp.map((s) => s.url)).size !== cleanMcp.length)
    throw Error("MCP地址重复");
  const maxSteps = p.maxSteps === undefined ? 32 : p.maxSteps;
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 96)
    throw Error("ReAct轮数须为1至96");
  return {
    tools: [...tools],
    knowledge: [...knowledge],
    skills: cleanSkills,
    mcp: cleanMcp,
    maxSteps,
    skillIds,
    mcpIds,
  };
}
