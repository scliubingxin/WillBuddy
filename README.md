0.9.0：对话与每日任务共用持久调度，排队/刷新后停止、定时发生去重、迟到结果拦截与重启暂停。详见 [共享执行说明](docs/SHARED_RUNS.md)。

0.8.0：手动 CLI 持久队列、刷新后停止、去重、重启暂停和重新审批重试；输出检查点与磁盘故障门禁。详见 [命令队列说明](docs/DURABLE_COMMANDS.md)。

0.7.0 修复：真实 SSE 流式输出，完整 Markdown 排版、带样式的隔离 HTML 预览、停止后保留内容，以及草稿/选区稳定。详见 [说明](docs/STREAMING_AND_RENDERING.md)。

项目结构与修改入口见 docs/ARCHITECTURE.md（0.6.1 分层整理）。

# WillBuddy · 桌面版 0.9.0

本轮根据用户截图重新组织任务交互：任务导航、对话内真实执行记录、右侧成果工作区、Markdown 表格/列表、@ 附加授权资料、/ 选择已有智能体，以及预览/导出/继续修改。浏览器、真实 CLI、原 Web、Python Office 执行器与旧数据/密钥身份保留。观察依据、已实现能力及边界见 [截图交互接续](docs/SCREENSHOT_ALIGNMENT.md)。

日常安装使用 Apple 芯片离线应用 ZIP，内置 Electron/Chromium/Node，安装端无需 npm。包为 ad-hoc 签名，未经过 Developer ID、公证或 Mac 真机验收；不宣称已通过 Gatekeeper。源码开发与安装说明见 [桌面说明](desktop/README.md)，验证边界见 [发布状态](RELEASE_STATUS.json)。REA 证据见 [分析报告](docs/REA_FINDINGS.md)。

以下保留原 Web 版使用说明与历史验证信息，历史部署状态不代表此次桌面版发布。

---

# WillBuddy 工作台 · 0.2

源码交付入口：[代码说明](CODE_GUIDE.md) · [部署与回滚](DEPLOYMENT.md) · [当前验证与发布状态](RELEASE_STATUS.json) · [GenOffice 集成](GENOFFICE_INTEGRATION.md)。下载包内另有 `SOURCE_MANIFEST.json`，记录完整提交 SHA 和逐文件校验值；线上与源码差异以发布清单为准。

以 Amazon Quick 官方用户指南为功能参考的独立个人工作台。支持自己的第三方模型 API；软件不设置积分，不访问 Amazon 账户。它不是 Amazon 官方产品，也没有实现 Quick 的全部企业与桌面功能。

## 开始使用

1. 在「模型与用量」添加名称、Base URL、模型 ID、API Key。接口需兼容 Chat Completions。点击测试会产生一次真实模型请求。
2. 默认仅在页面内存保留密钥。需要跨会话使用时，勾选「加密保存密钥」；可随时移除。所有模型内容会发送给选定服务商。
3. 在「知识空间」上传资料，或在聊天直接附加文件。空间设置可以关联数据集；智能体可以关联空间。
4. 在「研究」审阅计划、提供网址/空间或开启搜索，再收集来源并生成报告。
5. 在「数据与看板」导入 CSV/XLSX，选择分组、数值与聚合规则，保存看板。数据问答先生成受限查询，再由服务端执行计算。
6. 在「连接与操作」导入 OpenAPI 3 JSON，或连接 MCP Streamable HTTP。外部操作需要逐次确认。
7. 在「自动化」编辑节点、引用、分支和审批。保存草稿后发布版本；可运行草稿或已发布快照。打开「运行记录」继续未完成任务。
8. 在「应用工作室」生成并修改小应用，发布或恢复版本。应用通过隔离存储桥保存当前用户数据。
9. 在「成果中心」导出文档；全局「搜索资源」可定位和删除资源。

软件不设积分，模型、搜索与托管服务仍可能收费并有自身配额。

## 已接通的模块

| 模块 | 实际行为 |
| --- | --- |
| 聊天 | 持久化会话、模型切换、附件、资源范围、联网搜索、来源位置/匹配词/摘录、引用编号校验、执行记录、反馈 |
| 智能体 | 角色指令、语气、输出格式、关联空间、AI 生成指令、复制 |
| 知识空间 | 保留原文件、解析文本、中文词组与稀有度加权检索、证据定位、下载与删除；关联数据集 |
| 记忆 | 手动新增、查看、编辑、删除；用于模型上下文 |
| 数据分析 | CSV/XLSX 导入、分组/筛选、计数/和/平均/极值、条形图/汇总表/指标卡、看板保存 |
| 研究 | 编辑计划、网址读取、Tavily 搜索、空间检索、证据列表、带编号报告、成果保存 |
| 连接器 | OpenAPI 3 操作导入、REST 路径/查询/JSON 请求；MCP 初始化、会话、工具发现和调用 |
| 审批 | 真实目标和参数预览；保存操作快照；原子领取，避免重复执行 |
| 自动化 | 输入、AI、知识、搜索、条件、审批、连接器操作、输出；逐步存储与恢复 |
| 应用 | 自然语言生成/修改、源码编辑、沙箱预览、版本发布/恢复、每用户独立持久化 KV |
| 导出 | DOCX、PPTX、XLSX OOXML 文件；Markdown/CSV/HTML；浏览器打印为 PDF |
| 密钥与用量 | 可选 AES-GCM 加密保管；实际服务商响应 Token 记录 |

## 明确的边界

- 云端个人 Web 应用；没有原生桌面、本机文件夹监控、屏幕控制、浏览器执行或终端代码执行。
- 没有完整 Quick Sight/SPICE、SQL 数据源、复杂计算字段、交叉透视、企业仪表板权限和订阅分发。
- 自动化由打开的页面推进；服务端持久化已完成步骤，但没有后台定时器或无人值守队列。关闭页面可能中断当前请求，重新打开后可继续；外部操作状态不明时不自动重试。
- 连接器支持 Bearer 鉴权及公网 HTTPS。未预置全套 SaaS OAuth、组织权限同步或企业 ACL。OpenAPI 仅解析内联 JSON 定义，未解析 `$ref`、OAuth 流程及服务端变量。
- 模型通过 Chat Completions 兼容接口接入。原生 Anthropic/Gemini 需兼容网关；托管版不能直接连本机 localhost。
- 文档使用可解释的中文词组与稀有度加权检索，显示匹配词、片段编号和证据摘录；未实现向量索引、OCR、图片理解或个人知识图谱。PDF 无文字时明确报错。引用编号校验只确认编号指向本次资料，不判断模型语句是否忠实于原文。
- 文件上限 10MB、解析文本 20 万字符、每空间 30 文件；聊天附件合计 10 万字符。数据集 5000 行 × 60 列；XLSX 读取第一个工作表的值，不计算公式。
- 文档和演示导出为基础排版；不支持原始 PPT 模板的精确还原。PDF 通过浏览器打印保存。
- 应用发布只在私人工作空间切换版本，没有独立公开链接、团队协作或完整业务集成 SDK。应用 KV 每项 64KB。

详细产品分析与文档映射见 [PRODUCT_ANALYSIS.md](PRODUCT_ANALYSIS.md)。

## 本地开发

Node.js >= 22.13（验证环境 Node 24），pnpm 11.19.0。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

首次初始化本地数据库需按顺序应用两次迁移。已有 0.1 数据库仅应用第二次，不重放第一份迁移：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_yellow_silver_samurai.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_windy_hitman.sql
```

本地可选密钥保险箱：运行 `node scripts/generate-vault-key.mjs`，它独占创建被 Git 忽略的 `.dev.vars` 文件，生成随机 32 字节 Base64 `VAULT_MASTER_KEY`，不会打印实际值。已有文件时拒绝覆盖。部署时在平台密钥管理中设置同名服务端 secret；不要使用 `NEXT_PUBLIC_` 前缀。保留主密钥，否则已存凭据无法解密。源码不包含线上主密钥。

```sh
node scripts/generate-vault-key.mjs
pnpm dev
```

便携开发模式使用控制台打印的本机地址，通过 `/signin-with-chatgpt?return_to=/` 建立模拟身份。正式部署由可信网关注入身份；自行部署时必须配置真实认证并剥离伪造的 `oai-authenticated-user-id` 请求头。应用不提供独立账号密码系统。

应用依赖 Cloudflare Worker、D1 `DB`、R2 `BUCKET`。当前 `.openai/hosting.json` 绑定已有私人站点；建立新的托管项目应让平台分配身份。运行环境细节见 [STARTER_RUNTIME.md](STARTER_RUNTIME.md)。

## 验证

```sh
node scripts/self-test.mjs
pnpm build
```

303 项集成断言使用真实 SQLite、模拟对象存储和外部服务：涵盖数据计算、跨用户隔离、加密密钥、MCP SSE、REST 审批、防重复执行、研究引用、应用 KV、版本恢复、自动化并发/断点、Office ZIP 生成和固定中文检索基准。固定基准的 7 个可回答问题 Top-1/Recall@3/MRR 均为 100%/100%/1.00，另 2 个无答案问题均未返回结果；该小型合成语料只用于防回归，不代表真实企业任务正确率。未使用用户真实模型、搜索或 SaaS 凭据，未做付费服务端到端验收。未执行浏览器 UI 测试，不能据此声称像素级复刻或所有浏览器兼容。

Word 导出新增可编辑表格、对齐、中文换行与重复表头。2026-09-15 使用 36 条合成记录实际生成 DOCX，经独立解析、LibreOffice 渲染、PDF 文字校验和 4 页图片逐页检查通过。生成及核对命令见 CODE_GUIDE.md；这不等于浏览器下载、Microsoft Word/WPS 或全部 Office 格式验收。

## 工程结构

- `app/workbench.tsx`：聊天、空间、智能体、轻量任务流、成果和模型设置。
- `app/suite.tsx`：研究、分析、连接器、自动化、应用、审批和记忆。
- `app/api/`：10 个服务端资源/执行 API。
- `lib/ai-service.ts`、`model.ts`：模型调用、数据查询解释与知识上下文。
- `lib/integrations.ts`：受限公共 HTTP、MCP、OpenAPI、搜索。
- `lib/job-engine.ts`：持久化任务状态机、引用与执行领取。
- `lib/vault.ts`：以用户和资源作为附加认证数据的 AES-GCM 密钥库。
- `lib/data-engine.ts`、`file-tools.ts`、`slides.ts`：确定性数据计算、文件解析和导出。
- `db/schema.ts`、`drizzle/`：8 张表及增量迁移。
- `tests/integration.mjs`：集成验收。

所有应用源码随项目交付。依赖项按各自许可使用。

## 持续迭代与真实验收

当前私人站点已提供服务端管理的 DeepSeek 连接，无需再次在页面粘贴密钥；它的目标地址和凭据由服务端固定管理。个人自定义模型仍可另行添加。

每轮改进遵循 [ITERATION_PLAN.md](ITERATION_PLAN.md)，实际结果记录在 [ITERATION_LOG.md](ITERATION_LOG.md)。新增 `tests/provider-live.mjs`（仅安全进程环境提供密钥时使用）与 `tests/live-model.mjs`（需要有效站点用户身份）。自测会产生少量实际模型用量。不要因为后台测试缺少用户登录身份而移除应用鉴权。

截至 2026-09-11，本轮 82 项集成断言和 3 个真实 DeepSeek 用例已通过；这更新了前文初版“尚未真实验收”的历史状态，但不代表浏览器端到端或 Quick 对照验收已完成。
