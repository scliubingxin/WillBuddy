import { uid } from "../core.mjs";
import { agentCapabilities, mcpUrl } from "./agent-profile.mjs";
import { parseSkillPackage, skillResource } from "../runtime/skill-package.mjs";
import { bearerToken, createMcpClientFactory } from "./mcp-access.mjs";
export function skillViews(data) {
  return (data.skillPackages || []).map(
    ({
      id,
      name,
      description,
      bytes,
      sha256,
      format,
      time,
      enabled,
      revision,
      files,
    }) => ({
      id,
      name,
      description,
      bytes,
      sha256,
      format,
      time,
      enabled,
      revision,
      files: files.map(({ path, bytes, textReadable }) => ({
        path,
        bytes,
        textReadable,
      })),
    }),
  );
}
export function resolveCapabilities(data, agent) {
  const base = agentCapabilities(agent),
    packages = base.skillIds.map((id) => {
      const p = (data.skillPackages || []).find((p) => p.id === id);
      if (!p || !p.enabled) throw Error("绑定Skill已移除或停用");
      skillResource(p, "SKILL.md");
      return p;
    }),
    connections = base.mcpIds.map((id) => {
      const c = (data.mcpConnections || []).find((c) => c.id === id);
      if (!c || !c.enabled) throw Error("绑定MCP已移除或停用");
      return c;
    });
  const merged = agentCapabilities({
    ...base,
    skills: [
      ...base.skills,
      ...packages.map((p) => ({
        name: p.name,
        description: p.description,
        instructions: skillResource(p, "SKILL.md").text,
      })),
    ],
    mcp: [...base.mcp, ...connections.map(({ name, url }) => ({ name, url }))],
  });
  return {
    profile: merged,
    packages,
    mcpBindings: [
      ...base.mcp.map(() => null),
      ...connections.map(({ id, revision }) => ({ id, revision })),
    ],
    stamp: JSON.stringify({
      agent,
      packages: packages.map(({ id, sha256, revision, enabled }) => ({
        id,
        sha256,
        revision,
        enabled,
      })),
      connections: connections.map(({ id, name, url, revision, enabled }) => ({
        id,
        name,
        url,
        revision,
        enabled,
      })),
    }),
  };
}
/** Persistent reusable capability library; uploaded instructions never execute during import. */
export function createCapabilityLibrary({
  store,
  approve = async () => false,
  notify = () => {},
  clientFactory,
  secrets,
}) {
  const makeClient =
    clientFactory || createMcpClientFactory({ store, secrets });
  let queue = Promise.resolve();
  const probes = new Map();
  const mutate = (work) => {
    const next = queue
      .catch(() => {})
      .then(async () => {
        const prev = {
          skills: store.data.skillPackages,
          mcp: store.data.mcpConnections,
        };
        try {
          store.data.skillPackages = structuredClone(prev.skills || []);
          store.data.mcpConnections = structuredClone(prev.mcp || []);
          const result = work();
          await store.save();
          notify();
          return result;
        } catch (e) {
          store.data.skillPackages = prev.skills;
          store.data.mcpConnections = prev.mcp;
          throw e;
        }
      });
    queue = next;
    return next;
  };
  return {
    async importSkill(filename, bytes) {
      const p = parseSkillPackage(filename, bytes);
      return mutate(() => {
        const items = store.data.skillPackages;
        if (
          items.length >= 40 ||
          items.reduce((n, p) => n + p.bytes, 0) + p.bytes > 16777216
        )
          throw Error("技能库最多40项/总16MiB");
        if (items.some((s) => s.sha256 === p.sha256))
          throw Error("相同技能包已导入");
        const item = {
          ...p,
          id: uid(),
          enabled: true,
          revision: 1,
          time: Date.now(),
        };
        items.unshift(item);
        return { id: item.id, name: item.name };
      });
    },
    async skill(p) {
      return mutate(() => {
        const a = store.data.skillPackages.find((s) => s.id === p.id);
        if (!a) throw Error("技能不存在");
        if (p.remove) {
          if (store.data.agents.some((a) => (a.skillIds || []).includes(p.id)))
            throw Error("请先在智能体中解除绑定再删除");
          store.data.skillPackages = store.data.skillPackages.filter(
            (s) => s.id !== p.id,
          );
        } else {
          if (typeof p.enabled !== "boolean") throw Error("技能状态无效");
          a.enabled = p.enabled;
          a.revision++;
        }
      });
    },
    readSkill(id) {
      const p = (store.data.skillPackages || []).find((s) => s.id === id);
      if (!p) throw Error("技能不存在");
      return {
        name: p.name,
        description: p.description,
        ...skillResource(p, "SKILL.md"),
        files: skillViews({ skillPackages: [p] })[0].files,
      };
    },
    async connection(p) {
      return mutate(() => {
        const index = store.data.mcpConnections.findIndex((c) => c.id === p.id);
        if (p.id) probes.get(p.id)?.abort();
        if (p.remove) {
          if (index < 0) throw Error("MCP连接不存在");
          if (store.data.agents.some((a) => (a.mcpIds || []).includes(p.id)))
            throw Error("请先在智能体中解除绑定再删除");
          store.data.mcpConnections.splice(index, 1);
          return;
        }
        if (
          typeof p.name !== "string" ||
          !p.name.trim() ||
          p.name.length > 40 ||
          typeof p.enabled !== "boolean" ||
          typeof (p.description || "") !== "string" ||
          (p.description || "").length > 200
        )
          throw Error("MCP名称、简介或启用状态无效");
        if (p.id && index < 0) throw Error("MCP连接不存在");
        const old = store.data.mcpConnections[index];
        const auth = p.auth ?? old?.auth ?? "none";
        if (!["none", "bearer"].includes(auth)) throw Error("MCP认证方式无效");
        const url = mcpUrl(p.url);
        let encryptedToken;
        if (auth === "bearer") {
          if (p.token !== undefined && p.token !== "") {
            if (!secrets) throw Error("系统安全存储不可用，不能保存MCP凭据");
            encryptedToken = secrets.seal(bearerToken(p.token));
          } else {
            if (
              old?.url !== url ||
              old?.auth !== "bearer" ||
              !old.encryptedToken
            )
              throw Error("请为此MCP地址填写新的Bearer Token");
            encryptedToken = old.encryptedToken;
          }
        } else if (p.token) throw Error("请选择Bearer认证后再填写凭据");
        const row = {
          auth,
          ...(encryptedToken ? { encryptedToken } : {}),
          id: p.id || uid(),
          name: p.name.trim(),
          description: p.description || "",
          url: mcpUrl(p.url),
          enabled: p.enabled,
          revision: (store.data.mcpConnections[index]?.revision || 0) + 1,
          time: Date.now(),
        };
        if (p.id && index < 0) throw Error("MCP连接不存在");
        if (
          store.data.mcpConnections.some(
            (c) => c.id !== row.id && c.url === row.url,
          )
        )
          throw Error("此MCP地址已配置");
        if (index < 0) {
          if (store.data.mcpConnections.length >= 30)
            throw Error("最多30个MCP连接");
          store.data.mcpConnections.unshift(row);
        } else store.data.mcpConnections[index] = row;
        return { id: row.id };
      });
    },
    cancelProbe(id) {
      probes.get(id)?.abort();
    },
    async probe(id) {
      if (probes.has(id) || probes.size >= 2)
        throw Error("连接测试正在执行，最多同时两项");
      const row = (store.data.mcpConnections || []).find((c) => c.id === id);
      if (!row || !row.enabled) throw Error("请先启用此MCP连接");
      const revision = row.revision,
        controller = new AbortController();
      probes.set(id, controller);
      const audit = {
        id: uid(),
        tool: "mcp_test",
        args: { name: row.name, url: row.url },
        time: Date.now(),
        status: "pending_approval",
      };
      store.data.executions ??= [];
      store.data.executions.unshift(audit);
      const live = new Set(
        (store.data.commandJobs || [])
          .filter((j) =>
            ["queued", "pending_approval", "running", "cancelling"].includes(
              j.status,
            ),
          )
          .map((j) => j.id),
      );
      store.data.executions = store.data.executions.filter(
        (r, i) => i < 200 || live.has(r.jobId),
      );
      let client;
      try {
        await store.save();
        if (
          (await approve(
            "测试 MCP 连接",
            row.name +
              "\n" +
              row.url +
              "\n认证：" +
              (row.auth === "bearer"
                ? "使用此连接已保存的Bearer Token"
                : "无认证") +
              "\n只连接和发现工具，不调用任何业务工具。",
            controller.signal,
          )) !== true
        ) {
          audit.status = "denied";
          throw Error("用户拒绝连接测试");
        }
        controller.signal.throwIfAborted();
        if (
          !(store.data.mcpConnections || []).some(
            (c) => c.id === id && c.revision === revision && c.enabled,
          )
        )
          throw Error("测试期间MCP配置发生变化");
        client = makeClient(row.url, { id: row.id, revision });
        audit.status = "running";
        await store.save();
        controller.signal.throwIfAborted();
        const tools = await client.discover(controller.signal);
        controller.signal.throwIfAborted();
        await mutate(() => {
          const c = store.data.mcpConnections.find((c) => c.id === id);
          if (c?.revision !== revision || !c.enabled)
            throw Error("测试期间MCP配置发生变化");
          c.lastTest = {
            time: Date.now(),
            status: "succeeded",
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description || "",
            })),
          };
        });
        audit.status = "succeeded";
        return { count: tools.length };
      } catch (e) {
        audit.status = controller.signal.aborted
          ? "cancelled"
          : audit.status === "denied"
            ? "denied"
            : "failed";
        if (audit.status === "failed")
          await mutate(() => {
            const c = store.data.mcpConnections.find((c) => c.id === id);
            if (c?.revision === revision)
              c.lastTest = { time: Date.now(), status: "failed" };
          }).catch(() => {});
        throw e;
      } finally {
        await client?.close();
        audit.finishedAt = Date.now();
        audit.result = { status: audit.status };
        probes.delete(id);
        await store.save();
        notify();
      }
    },
    close() {
      for (const c of probes.values()) c.abort();
    },
  };
}
