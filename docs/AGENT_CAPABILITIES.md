当前知识检索支持[持久词法索引](PERSISTENT_KNOWLEDGE_INDEX.md)，获批后构建/复用，仍逐份读取、校验来源；不提供免审批缓存读取或向量语义检索。

# 智能体能力与 ReAct 执行 · 0.21.0

2026-10-24。依据用户对 AgentScope 的参考要求，独立实现桌面 Agent 能力注册表；未复制或捆绑 AgentScope SDK，不增加用户端 Python/npm 依赖。

## 使用

1. 先在成果中心导入要用于知识检索的 Word、Excel、PPT、Markdown 或 HTML 文档。
2. 智能体 → 新建/编辑：填写角色指令，勾选知识文档，添加命名技能及完整 Markdown 操作步骤，勾选允许的一般工具，按需添加 MCP 地址，并设置 1–12 轮 ReAct 上限。
3. 点击「开始对话」。保持对话「智能体工具」开关打开。工具关闭时不发现 MCP、不读取技能/知识。
4. 模型按需调用 `skill_read`、`knowledge_search`、获准的内置工具及本轮实际发现的 MCP 工具，观察结果后继续或返回最终答复。不会输出或保存私有思维过程；工具执行状态在原执行记录中可查。

知识绑定最多8份成果中心文档，技能最多8项（每项12000、总30000字符），MCP最多3个，每个最多16项工具。最多30个自定义/默认智能体合计。一般工具白名单同时控制模型目录和调度执行入口；技能不会扩大它。知识查询是单独授予的绑定文档读取能力，即使未勾选通用 `document_read`，也仅能经原生批准检索已经绑定的文档。

## 知识与技能

`skill_read(name)` 按需返回本智能体保存的完整操作步骤。模型初始上下文只列名称/简介，不整篇注入技能。当前是编辑器内保存的 Markdown 技能，不是自动扫描本机技能目录、执行技能脚本或完整技能包管理器。

`knowledge_search(documentId,query)` 只接受本智能体绑定的真实ID；调用既有 `document_read` 原生审批与版本门禁，然后在文档的提取文本中按查询词做有界行检索，返回最多6段、每段1500字符，含文档ID、版本、哈希和行号。它不是向量索引、OCR、语义召回或全局知识库；复杂 Office 内容的提取范围沿用原编解码器。中文可输入短关键词，空格分隔多个词；没有命中时返回空结果，不伪造依据。

## MCP 客户端

`runtime/mcp.mjs` 是真实、每任务独立的 Streamable HTTP 客户端：initialize → initialized notification → tools/list（最多4页）→ tools/call。支持2025-06-18/2025-03-26协议协商、JSON和有界SSE结果、会话头、任务结束DELETE清理。命名空间 `mcp_序号_原工具名` 防止覆盖内置工具。

只接受用户显式配置的 HTTPS 或 localhost/127.0.0.1/::1 HTTP 地址，不接受URL凭据、查询或fragment；不发送cookie，不跟随跳转。不是域名解析防火墙。全局连接器现可配置手动Bearer Token，详见[MCP认证](MCP_AUTHENTICATION.md)。原内嵌MCP仍无认证；无OAuth登录、自定义API Key头、stdio、本地服务安装、旧HTTP+SSE双端点、server-initiated sampling/elicitation、断线续传或自动重试。需要这些能力的服务会明确失败。无需登录的服务可用；不会安装或假造MCP服务。

每轮连接先经原生审批；每次工具调用独立审批，展示精确服务地址和完整最多600字符参数，不复用浏览器站点授权。响应≤1MiB，输出≤30000字符，单请求15秒超时，重定向/远端schema引用/重复工具/分页异常/ID不匹配均拒绝；取消贯穿HTTP请求。工具返回是不可信数据，不自动运行其中的命令。

`services/agent-session.mjs` 组合注册表并复用原 `runAgent` 的模型→工具→观察循环。每任务最多12次工具调用；模型轮数可配。配置或智能体在任务中被修改/删除时，下一次请求/操作会失败，不继续沿旧许可执行。取消、拒绝、保存失败均不冒称成功；重启不重放已批动作。MCP审计只保存服务/工具/状态，不保存参数、响应或技能正文；知识沿用既有文档审计脱敏。

## 数据与验收

原schema1增量保存agent的 `knowledge/skills/tools/mcp/maxSteps`，旧记录默认保留原12项内置工具行为。配置保存失败回滚；任务使用快照，并逐次检查原配置未变化。原Web业务核心尚未共享此注册表。

11项新增核心测试覆盖配置/持久化/回滚/范围/取消/拒绝/限制/协议。真实本机HTTP模型夹具通过4次模型请求完成：技能→批准的真实Markdown知识读取→真实MCP服务器SSE报价→最终答复；验证会话头/清理、来源版本、工具白名单和正文脱敏。另有生产Chromium编辑器→真实工作区服务→磁盘→刷新重载。原生IPC/审批/模型内容为夹具；没有真实企业MCP、付费模型或Mac原生验收。

## 官方参考（2026-10-24读取）

- https://github.com/agentscope-ai
- https://doc.agentscope.io/tutorial/quickstart_agent.html
- https://doc.agentscope.io/tutorial/task_agent_skill.html
- https://doc.agentscope.io/tutorial/task_mcp.html
- https://modelcontextprotocol.io/specification/2025-06-18/basic/transports

参考其 ReAct、Toolkit、按需技能与MCP客户端组合方式；不宣称实现完整AgentScope或多智能体自治并行。下一步优先用户Mac/实际模型验证，再按真实需求补OAuth授权、完整技能资源使用、知识索引和可验收的受控子任务。
