# 幕云AI 部署与运维

2026-10-07 安全对话导入无新依赖、数据库迁移、绑定、secret 或环境变量。它只接受本产品权威 JSON 导出的 `muyun-chat-export/v1`，并始终新建聊天；部署后应在合法生产会话执行 JSON 导出→导入→刷新→再次导出，确认正文、模型/用量、公开来源和成果哈希摘要保留，同时待审批动作、请求标识、事件、工具参数、对象键、私有 URL 与下载能力均未恢复。回滚到版本 45 不改已有导入聊天，只移除导入入口。

2026-10-06 对话重命名无新依赖、迁移、绑定、secret 或环境变量，复用 `records.updated`。发布后应在合法登录会话打开同一聊天的两个标签页：第一页重命名成功，第二页旧版本重命名必须提示刷新且不能覆盖；刷新后标题、最近对话、搜索和导出文件名应一致。再发送后续消息并确认名称不回退。回滚到版本 44 不改数据，但会移除重命名入口；已保存名称仍作为普通 chat 字段保留。

2026-10-06 对话导出无新依赖、迁移、绑定、secret 或环境变量，复用 `records.updated`。发布后应在合法登录会话打开已有聊天并下载 Markdown，核对正文、来源、用量与成果哈希，同时确认待审批提议、请求 ID、工具参数、对象键和私有下载 URL不存在；旧标签页必须提示刷新而非导出旧快照。JSON 入口沿用同一白名单。回滚到版本 43 不改数据，但会移除服务端权威完整对话导出入口。

2026-10-05 安全对话分支无新依赖、迁移、绑定、secret 或环境变量，复用 `records.updated` 乐观版本。发布后应在合法登录会话打开已有对话，创建分支并分别继续两条路径；源对话不得改变，分支不得显示源聊天未终结审批按钮，已完成成果仍可访问。再用旧标签页和目标冲突验证零写入。回滚到版本 42 不改数据，但会移除创建新分支入口；已创建分支仍是普通独立聊天。

2026-10-05 对话限时恢复新增 `drizzle/0003_deleted_chats.sql`，无新依赖、绑定、secret 或环境变量。必须先应用迁移再启用新 Worker；缺表会让工作区读取失败。升级后删除聊天会保存 7 天快照，恢复不复活 pending/executing 提议或短期模型请求。回滚到版本 41 可保留兼容表与快照，但旧网页不会显示或恢复它们；不要删除表来回滚。生产验收应覆盖删除→刷新→恢复、过期拒绝、同名活动记录冲突和双标签页旧版本删除。

2026-10-05 对话删除版本保护无新依赖、数据库迁移、D1/R2 绑定、secret 或环境变量。部署后，聊天删除请求必须携带最近一次工作区读取返回的 `updated`；部署前已打开的旧页面缺少版本时会收到刷新提示，不会删除对话。刷新页面即可使用新契约；不要为兼容旧客户端关闭校验或重置 `VAULT_MASTER_KEY`。验收入口 `node scripts/self-test.mjs` 已包含 6 项实际前端删除处理器场景和 369 项应用断言。回滚到版本 40 不需要数据迁移，但会重新暴露旧标签页删除新对话的风险。

2026-10-05 对话保存版本保护无新迁移、依赖、secret 或环境变量，复用 `records.updated`。发布后，部署前已打开的旧网页更新已有聊天会收到刷新提示，必须刷新页面后继续；新网页自动携带版本。验收应让两个合法登录标签页打开同一聊天：第一页保存新问题后，第二页基于旧快照发送必须在模型调用前被拒绝，刷新后应完整看到第一页内容。回滚到版本 39 不改数据，但会恢复无条件浏览器整份保存，无法继续阻止旧快照覆盖。

2026-10-04 多标签页冲突安全合并复用现有 `records` 与 `chat_requests`，无新迁移、依赖、secret 或环境变量。发布后应在合法登录会话用两个标签页打开同一聊天：第一页发送后，在模型返回前由第二页追加消息；最终原回复应位于对应用户消息之后，第二页新消息仍保留且恢复不会重复。再验证删除原用户消息的负例不会把回复挂到替代问题。回滚到版本 38 不改表结构或删除完成记录，但会恢复“并发变化时不自动合并、仅保留可恢复响应”的行为。

2026-10-04 服务端自动保存回复复用现有 `records` 与 `chat_requests`，无新迁移、依赖、secret 或环境变量。发布后应在合法登录会话发送消息，并在模型完成前关闭或刷新页面；重新打开最近对话时应直接看到助手回复，且用量只增加一次。另用第二标签页在模型运行中修改同一聊天，迟到回复不得覆盖新快照，但仍可通过“恢复已完成回复”取回。回滚到版本 37 不删除已保存消息或重放记录。

2026-10-04 刷新后恢复回复复用现有 `chat_requests` 表，无新迁移、依赖、secret 或环境变量。发布后应在合法登录会话中发送一条消息，在服务端完成但前端未保存的窗口刷新，再点击“恢复已完成回复”；确认返回与原响应一致、用量没有第二次增加。处理中应提示等待，删除对话和另一用户均不得恢复。回滚到版本 36 不删除现有重放记录；记录继续按 24 小时窗口由后续请求清理。

2026-10-03 对话删除竞态保护无迁移、依赖、secret 或新环境变量，使用现有 `records_owner_kind` 索引和 SQLite JSON 函数。删除聊天会原子清理其 pending/executing 文档提议，已完成、拒绝和过期凭证继续保留；升级和回滚都不改表结构。启用文档工具前应验证模型等待期间删除、执行状态删除、完成后删除以及 R2/D1 清理。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-10-03 提议生命周期校验无迁移、依赖、secret 或新环境变量。网页本来就在模型请求前保存对话，因此正常流程不变；伪造或不存在的 `chatId` 会在模型调用前失败。删除对话后，其待处理文档提议不能再查询、批准或拒绝；重新创建同名对话不应作为恢复手段。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-10-03 文档审批操作对话绑定无迁移、依赖、secret 或新环境变量。升级后，历史提议缺少 `chatId` 时不能查询、批准或拒绝，需要用户在原对话重新提出任务。启用文档工具前应在合法登录会话验证：原对话状态/批准/拒绝可用，另一对话使用同一提议 ID 均被拒绝。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-10-03 对话归属绑定无数据库迁移、依赖、secret 或新环境变量。新提议会在隐藏记录中保存服务端收到的 `chatId`；历史提议缺少该字段时不能导出审批审计包。启用文档工具前，应在合法登录会话验证同一对话导出成功、同一用户跨对话导出失败、旧记录失败关闭。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-10-02 服务端权威审计导出无迁移、依赖、secret 或新环境变量。启用文档工具前，应在合法登录会话确认：完成/拒绝/过期记录可导出，跨用户、重复 ID、未结束记录和不存在记录被拒绝，修改本地聊天事件不能改变服务端凭证。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-10-02 审批凭证无迁移、依赖、secret 或新环境变量。部署后应在合法登录会话分别完成、拒绝和等待过期一项提议，下载 JSON 并确认提议指纹与完成成果 SHA-256 对应，同时不得出现 `arguments`、`apiKey`、对象键或私有 URL。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置，直至真实 DeepSeek 工具协议、生产下载和用量验收完成。

2026-09-28 提议内容指纹无迁移、依赖或新环境变量。启用文档工具前应在合法登录会话验证：卡片指纹与状态接口一致，批准后生成文件；对隐藏提议参数的任何变化都会拒绝生成且不产生成果。指纹只用于绑定审批内容，不应替代用户查看预览和业务复核。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-09-28 提议预览无迁移、依赖或新环境变量。启用文档工具前需在合法登录会话核对：普通文本、公式样式文本、空值、超出 6 列或 5 行的提示均与最终下载文件一致；预览不得出现原始 JSON 工具载荷。生产 `DOCUMENT_TOOL_ENABLED` 继续保持未设置。

2026-09-28 状态同步无迁移、依赖或新环境变量。启用文档工具后，应在合法登录会话用两个标签页验证：一页批准或拒绝，另一页重新获得焦点后移除旧按钮并只恢复一个成果；等待过期时不得生成文件。服务器仍是状态权威，客户端时钟只用于提前隐藏操作。

2026-09-27 文档提议过期无迁移、依赖或新环境变量。时间由 Worker 服务器生成和判定；不要依赖客户端时钟。生产 `DOCUMENT_TOOL_ENABLED` 仍应保持未设置，直至完成真实模型与下载验收。

2026-09-27 对话失败重试仅修改客户端组件，无新依赖、迁移、环境变量或 secret。回滚可部署版本 24；发布后应在合法登录会话检查停止或网络失败后的原问题恢复、重新发送与关闭错误提示。

## 文档工具灰度开关

`DOCUMENT_TOOL_ENABLED` 是可选非密钥环境变量，缺省必须保持未设置。只有在目标环境完成真实模型工具协议、用户审批、文件下载和用量核验后，才可在 Sites 环境中设置为字符串 `true` 并重新部署；其他值均视为关闭。`DEEPSEEK_API_KEY` 与 `VAULT_MASTER_KEY` 的现有 secret 不得为此重置。

2026-09-26 草稿恢复：只增加浏览器端 sessionStorage 草稿帮助函数和前端接线，无新依赖、数据库迁移、服务端环境变量或 secret。发布后普通刷新即可加载新前端；草稿不会跨标签页、设备或浏览器关闭保留，也不应作为服务器备份。发布验收应在合法登录会话检查两个已有对话与新对话分别恢复、发送清理，以及停止时不覆盖等待期间的新草稿。

2026-09-26 输入框修复：仅 Web 客户端变更，无依赖、迁移或 secret 变更。发布后刷新网页加载；回滚使用此前已验证版本。全量入口增加六项发送草稿生命周期场景，外部请求为模拟。

## 本轮升级：受限中文简报编译

无新 npm/pip 依赖、D1 迁移或 secret。更新源码并重启本机执行器后，任务台出现“中文任务简报”；旧 SQLite 批次无需迁移，只有新简报计划带 `planning` 来源字段。执行器仍只绑定回环，必须人工审阅生成的 JSON 并再次校验后提交。回滚到上一提交不会删除任务或成果；旧执行器会忽略历史状态中的附加来源字段，但不提供简报入口。

真实中文渲染前必须让 Fontconfig 可发现 Noto Sans CJK SC；缺字时执行器会在入队前失败，不能绕过。验证命令为 `python3 tests/local-runner-test.py`，以及在空输出目录运行 `python3 tests/local-runner-live.py <目录>`。后者必须记录 2 条简报、7 项任务、5 条验收和 2 页视觉检查通过。

## 本轮升级：多批次公平调度

无新依赖、D1 迁移或 secret。本机 SQLite 的批次 JSON 新增 `scheduler` 统计，旧记录启动时自动补默认值；轮转游标不持久化，重启后从当前就绪批次重新开始公平轮转，不重放已完成任务。升级只需停止本机执行器、备份数据目录、更新源码并重启。回滚会忽略新增统计，不删除任务或成果。

验收运行 `python3 -m unittest tests/local-runner-test.py`，再在空目录运行 `python3 tests/local-runner-live.py <目录>`；确认两个真实文档批次均为 succeeded、首轮每批各分派一项，且两个 LibreOffice render 时间区间重叠。

## 本轮升级：单批运行预算

无新依赖、D1 迁移或 secret。本机 SQLite 的 JSON 状态新增 `policy`、`budget`、可选 `budgetFailure`；旧记录不需迁移，读取时使用兼容默认策略。更新源码并重启执行器后，新计划可限制单批并发、最长墙钟时间和所有成功成果总字节；文档/表格规则计划默认并发 2、600 秒、200MB。回滚前停止服务并备份数据目录；旧版本会忽略新增 JSON 字段，但不会执行这些预算保护栏。

验收：`python3 -m unittest tests/local-runner-test.py`；再在空目录运行 `python3 tests/local-runner-live.py <目录>`，确认串行样本无重叠、1 字节成果负例为 failed 且 acceptance 为 not_run。全局 `--concurrency` 仍为硬上限，计划不能把单批并发提升到执行器全局上限以上。

## 本轮升级：断点重试

无新依赖、D1 迁移或 secret。本机 SQLite 的 runs 表仍保存 JSON；新版本只增加 `retryOf`、`attempt`、`reusedFrom` 和时间线字段，不需要迁移。更新源码并重启执行器后，旧终态批次只有在成功步骤已有当前版本可识别的 verification 时才能重试；更早的无证据任务会明确拒绝，原文件不删除。

重试会创建新批次，不覆盖历史记录。升级/回滚前停止服务并备份数据目录；回滚后新字段作为未知 JSON 保留，但旧界面不会显示重试关系。验收命令：`python3 -m unittest tests/local-runner-test.py`，以及在空目录运行 `python3 tests/local-runner-live.py <目录>`，确认取消源为 cancelled、新尝试复用步骤列表非空且最终 succeeded。

## 本轮升级：成果验收标准

无新 npm/pip 依赖、D1 迁移或 secret。更新源码并重启本机执行器后，新计划可使用顶层 `acceptance`；既有 SQLite 任务无需迁移，旧计划缺少该字段时按空标准兼容。文档/表格规则拆解会自动添加 Office/PDF/ZIP 规格标准。验收发生在全部步骤完成后，读取并重新校验已有成果，不运行用户命令或联网。

回滚到上一提交不会删除已有任务文件；新版本保存的 `acceptancePlan`/`acceptance` 是额外 JSON 字段，旧执行器会忽略未知字段，但建议先停止服务并备份数据目录。升级后运行 `python3 -m unittest tests/local-runner-test.py` 及 `python3 tests/local-runner-live.py <空输出目录>`；正向计划必须 passed，负例必须保持步骤 succeeded、批次 failed。

## 本轮升级：Office 检查点

无新依赖、数据库迁移或 secret。更新源码并重启本机执行器后，新的 Word/Excel/PowerPoint 编辑任务会附带检查点；旧任务不会伪造补写检查点。恢复命令见 `local-runner/README.md`，必须同时提供检查点、对应编辑结果和新的输出路径。恢复不会修改执行器数据库，也不会覆盖用户文件。

回滚应用代码不删除已经生成的检查点；旧版本不会在界面中解释其语义，但 ZIP 可继续用本版本恢复工具单独验证。线上发布只同步入口说明和计划生成器，本机执行代码仍需从本轮源码包更新并重启。

## 本轮升级与回滚（2026-09-21）

更新源码后停止并重新启动本机 `python3 local-runner/server.py --concurrency 2`，继续使用原数据目录；不要删除 runner.sqlite3 或运行中用户任务。没有新依赖、数据库迁移或 secret。验证记录保存在既有 JSON 状态中。未结束任务重启仍按原逻辑记为 interrupted，不自动重放。

旧成功任务没有历史哈希证据，界面会提示重新执行后下载；原文件保留在本地数据目录，升级不删除它们。新任务展示“已校验成果”，下载时对已记录哈希重新计算。若验证失败，检查任务文件是否被修改，再创建新任务；不会自动改写旧证据或绕过检查。

线上只同步入口与使用说明，本机执行器须使用本源码包更新，不能仅刷新网页得到新执行器。回滚可切回上一已验证提交并重启执行器，保留原数据目录；服务端按本文原有 Sites 回滚流程，访问范围和主加密密钥不变。

## GenOffice 文档引擎

本机安装 GenOffice 官方应用，将 `genoffice` 加入 PATH，或用 `MUYUN_GENOFFICE_BIN` 指向启动器，再运行现有本机服务。安装 LibreOffice、Poppler 与中文字体，使 `soffice`、`pdfinfo`、`pdftoppm` 可用；也可用 `MUYUN_LIBREOFFICE_BIN`、`MUYUN_PDFINFO_BIN`、`MUYUN_PDFTOPPM_BIN` 指向可信绝对路径。无需新云端 secret、D1 迁移或 npm 依赖；云端不会启动 Electron。测试过官方 Linux v0.10.639 的 CLI 0.10.0；完整配置、重现步骤及公式编辑限制见 `GENOFFICE_INTEGRATION.md`。普通公式编辑会多执行一次原生公式重提交并验证 `cached_values`、公式集合及非空缓存；报告列出工作表和缓存变化。共享、数组、结构化或超过 1000 个公式的文件拒绝自动编辑。Office 逐页预览使用 LibreOffice + Poppler，GenOffice 原生渲染/PDF/OCR 尚未真实验收。不要将任何模型密钥或主加密密钥注入文档引擎。

## 版本和适用范围

先查看 `RELEASE_STATUS.json` 和交付包的 `SOURCE_MANIFEST.json`，确认当前线上版本与源码差异。2026-09-16 已定位并修复 Worker 不支持 `redirect: 'error'` 的模型连接问题，补充 Worker 回归及使用用户新提供凭据的真实应用调用验收；生产登录和出口网络验证仍需分开记录，不能把本地成功等同线上端到端成功。

当前支持本地开发与原 Sites 私人站点托管。独立云部署还需要补接真实认证网关、资源绑定与运维配置；本包没有验证过的一键 Docker/Vercel/静态服务器部署方案。

## 环境与依赖

### 可选本机执行器（Web 入口已上线版本 10；本机服务单独部署）

这部分与 Sites 服务分开部署；Cloudflare Worker 不能替代本机 Python、Docker、LibreOffice。Linux/macOS 使用 Python 3.10+ 标准库（无 pip 依赖/额外锁文件）；Windows 需 WSL2，本轮只在 Linux 验证。安装 LibreOffice、Poppler 和 Noto Sans CJK SC，并使 `soffice`、`pdfinfo`、`pdftoppm` 在 PATH。中文系统可用 `fc-match -f '%{lang}' ':lang=zh-cn'` 检查字体；自定义字体目录需配置本机 FONTCONFIG_FILE，不能复制本开发环境的绝对路径。字体和 Office 二进制不包含在源码包。

```sh
python3 local-runner/server.py --concurrency 2
# 浏览器打开 http://127.0.0.1:8765
python3 tests/local-runner-test.py
python3 tests/local-runner-live.py outputs/local-runner-acceptance
python3 tests/local-runner-spreadsheet-live.py outputs/local-runner-sheet-acceptance
python3 tests/local-runner-docker.py
```

本机代码还需要可用 Docker 和已安装的 `python:3.12-slim`、`node:22-slim` 镜像；执行器不会自动拉取。操作者可设置 `MUYUN_PYTHON_IMAGE` / `MUYUN_JAVASCRIPT_IMAGE` 到锁定 digest 的镜像（需包含 `timeout`）。这些不是 secret。**不要把 DEEPSEEK_API_KEY、VAULT_MASTER_KEY 或 Docker socket 注入任务容器。** 本轮已经实际探测 Docker/Podman、bwrap、user/network namespace 和 Landlock，均被当前宿主缺失或策略阻断；没有降级为主机裸跑。因此真实代码容器验收仍未通过；此限制不阻止发布已验证的 Web 入口，不能视为沙盒已就绪。

启动自动建立独立本地 SQLite 的 runs 表，不修改云端 D1，无新云迁移；已有本地数据保留，禁止两个实例同时用同一目录。可用 `--data-dir` 和 `--port` 指定路径/端口；服务只绑定回环，不做公网反向代理。控制台会话认证不能代替企业多用户认证。Ctrl+C 停止会取消任务；更新或回滚前先停止服务并备份整个本地数据目录，再切换已提交源码。中断任务不自动重放；确认实际影响后才能新建任务。Web 部分依然按下文构建/发布/回滚，**Web 入口已同步原私人站点版本 10，本机服务仍需独立安装启动**。完整配置和限制见 `local-runner/README.md`。

- 使用 Node.js 24（本次验证为 24.19.0），pnpm 11.19.0。package.json 的 Node 最低声明为 22.13，但全量测试还依赖 `node:sqlite`，优先使用已验证版本。
- 需要网络访问依赖仓库；真实模型与搜索还需要对应服务商的网络和账号额度。
- 原 Sites 构建脚本的 managed-linux 分支依赖 Bash、GNU timeout、flock 等 Linux 工具。普通解压副本默认 portable，不需要原工作区的隐藏运行状态。

进入解压后的 `muyun-ai` 目录，确认 pnpm 版本后安装：

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm build
```

若未安装 pnpm，先按本机 Node 工具链安装或用可用的 Corepack 启用 package.json 指定版本。不要为适配旧 pnpm 改写锁文件。输出位于 `dist/`；构建会生成 `dist/server/wrangler.json`，下面的本地数据库命令依赖它。

## 首次初始化本地数据库

仅对全新的本地数据库，按顺序执行：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_yellow_silver_samurai.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_windy_hitman.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_classy_proemial_gods.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_deleted_chats.sql
```

已有数据库只执行尚未应用的迁移；不要重新执行第一份，也不要删除库来消除报错。手工 `d1 execute --file` 与迁移跟踪不是一回事，运维需记录执行清单。本项目提供 Drizzle SQL 和元数据；引入另一套迁移管理前需对齐历史。Cloudflare 的迁移机制见 [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)（2026-09-14 核对）。

第三份迁移新增 `chat_requests`，用于当前用户和对话范围内的模型请求原子领取、24 小时短期结果重放及删除级联清理。它不保存 API Key、搜索 Key 或用户密钥，只保存请求摘要和模型响应；回滚旧代码时可以保留此兼容表，不要为回滚删除生产数据。

第四份迁移新增 `deleted_chats`，只保存当前用户已删除聊天的原始 JSON 快照、删除版本和 7 天到期时间，不保存模型密钥。它与活动 `records` 分表，恢复使用条件事务且不复活工具授权。运维可在明确保留策略后清理过期行；回滚旧代码时保留该表最安全。

## 服务端配置

| 名称 | 类型 | 用途与要求 |
| --- | --- | --- |
| `DB` | D1 绑定 | 记录、文档片段、用量、凭据、任务及版本；必须先迁移 |
| `BUCKET` | R2 绑定 | 上传原件；仅配置同名环境字符串不能代替资源绑定 |
| `DEEPSEEK_API_KEY` | 服务端 secret | 启用服务端管理的 DeepSeek 连接；不传回浏览器 |
| `VAULT_MASTER_KEY` | 服务端 secret | Base64 编码的 32 字节主密钥，用于加密保存用户模型/连接器凭据 |

原私人站点已配置两项 secret，更新源码时保留它们，绝不重新生成或请求导出明文。新建的隔离本地测试环境需要保险箱时，可运行 `node scripts/generate-vault-key.mjs`：它独占创建被 Git 忽略的 `.dev.vars`，不会打印主密钥，已有文件时拒绝覆盖。不要在已有凭据库上使用新的主密钥。

本地模型凭据由开发者通过本机安全编辑器配置到被忽略的 `.dev.vars`，不要通过命令行参数、终端回显、代码提交或截图传递。不要使用 `NEXT_PUBLIC_` 前缀。正式环境通过托管平台的服务端 secret 管理配置。Cloudflare 的 [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) 与 [R2 Worker 绑定](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)文档说明了相应配置方式（2026-09-14 核对）。

## 启动与登录

```sh
pnpm dev
```

打开控制台打印的本机地址。portable 开发模式可访问 `/signin-with-chatgpt?return_to=/` 建立本地模拟身份。该身份只用于开发，不能放到公网生产。需要检查构建后的 Worker 时运行 `pnpm start`；它不提供开发登录模拟，受保护接口没有真实认证网关时返回 401 是预期行为。

正式应用依赖可信网关注入 `oai-authenticated-user-id`。独立托管必须先验证真实用户会话或签名令牌，再映射稳定用户 ID；清除客户端伪造身份头，阻断绕过网关访问 Worker 的路径，并保持请求 Origin 与应用同源。仅让浏览器自己填写该请求头、只改代理头、或简单公开 Worker 都不能替代认证。当前应用没有独立用户名密码系统。迁移时改变 owner ID 会导致历史资源不可见。

## 验收和原私人站点发布

流程预检不需要服务密钥：使用已登录工作台在“自动化”编辑器点击“运行前检查”，或从同源受信任会话向 `POST /api/jobs` 发送 `{"op":"inspect","nodes":[...]}`。报告必须明确 `doesNotExecute: true`、`modelCalls: 0`；这只验证静态结构，不能替代一次实际运行。匿名请求返回 401 属于正确鉴权行为。固定回归见 `tests/acceptance/workflow-preflight-2026-09-17.json`。

用户明确提供用于测试的密钥时，可在隔离本地 Worker 内执行已有受保护 API 处理函数，以合成测试身份验收真实模型；身份只用于本地，不能带到生产。`tests/worker-live-model.mjs` 明确记录此边界。本轮 5 次真实请求，共 590 输入 / 184 输出 Token，包括一次失败的初版测试夹具，不隐藏失败或当作免费请求。

CSV 防护的额外真实文件检查（需要 Node 24、Python 3 和 LibreOffice；不需要服务密钥，不修改数据库）：

```sh
node tests/export-csv-fixture.mjs
soffice --headless --infilter='Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,true,false,false,0,true' --convert-to xlsx --outdir outputs/csv-safety-acceptance outputs/csv-safety-acceptance/protected.csv outputs/csv-safety-acceptance/control.csv
python3 tests/verify-csv-fixture.py outputs/csv-safety-acceptance
```

第 13 个 CSV 导入参数显式开启公式解析，且不将所有带引号的字段强制当文本，确保阳性对照有意义。参数依据 [LibreOffice CSV Filter Options](https://help.libreoffice.org/latest/en-US/text/shared/guide/csv_params.html)（2026-09-15 核对）。本轮使用 LibreOfficeDev 26.8.0.0.alpha0；其他版本需要重跑，不等于 Excel/WPS 验收。若已有同名验收输出，改用隔离空目录，并将目录传给生成/检查脚本，不覆盖用户文件。本轮 CSV 改动不涉及数据库迁移、新增依赖或 secret。

格式化 XLSX 的实际文件检查（不需要服务密钥）：

```sh
node tests/export-xlsx-fixture.mjs
python3 tests/verify-xlsx-fixture.py outputs/xlsx-acceptance/muyun-ai-formatted-data.xlsx
soffice --headless --convert-to xlsx --outdir /隔离的另存目录 outputs/xlsx-acceptance/muyun-ai-formatted-data.xlsx
python3 tests/verify-xlsx-fixture.py /隔离的另存目录/muyun-ai-formatted-data.xlsx
soffice --headless --convert-to pdf --outdir /隔离的渲染目录 outputs/xlsx-acceptance/muyun-ai-formatted-data.xlsx
pdftoppm -png /隔离的渲染目录/muyun-ai-formatted-data.pdf /隔离的渲染目录/page
```

PPTX 固定样例使用生产导出器，先验证原文件，再由 LibreOffice 另存并重复机器检查，最后渲染全部页面。中文字体要求同 Word 验收；仅生成 PDF 不算视觉通过。

```bash
node tests/export-pptx-fixture.mjs
python3 tests/verify-pptx-fixture.py outputs/pptx-acceptance/muyun-ai-maintenance-review.pptx
soffice --headless --convert-to pptx --outdir /隔离的另存目录 outputs/pptx-acceptance/muyun-ai-maintenance-review.pptx
python3 tests/verify-pptx-fixture.py /隔离的另存目录/muyun-ai-maintenance-review.pptx
soffice --headless --convert-to pdf --outdir /隔离的渲染目录 /隔离的另存目录/muyun-ai-maintenance-review.pptx
pdftoppm -png /隔离的渲染目录/muyun-ai-maintenance-review.pdf /隔离的渲染目录/slide
```

必须检查全部 PNG；没有中文字体而出现空白字形时判失败。2026-09-16 固定样例经 LibreOfficeDev 26.8 打开、另存并重新解析通过，2 页 PDF 逐页检查无裁切、重叠或缺字。结果见 `tests/acceptance/xlsx-formatting-2026-09-16.json`。Excel、WPS、任意宽表和生产浏览器下载仍需另测。

1. 从原项目返回的远端仓库恢复最新 main，检查未提交修改和当前线上版本。`.openai/hosting.json` 的项目 ID 必须保持不变。
2. 安装锁定依赖，执行 `node scripts/self-test.mjs` 和当前 Sites 构建入口；逐项记录 `SELF_TEST_MATRIX.md`。本地回归和真实服务验收分别记账。
3. 模型相关变更通过已授权、受保护的应用接口做真实验收，默认最多 6 次请求，每次最多 2048 输出 Token。401 表示缺少应用身份，不能伪造头或读取托管 secret 绕过。
4. 更新日志及 `RELEASE_STATUS.json`，提交、推送准确源码 SHA。按当前 Sites skill 生成其要求的生产制品、保存对应版本并更新**同一私人站点**。本源码 ZIP 不替代 Sites 制品格式。
5. 等待部署最终成功，核对版本与提交，并以有效用户登录检查读写流程。失败则保留原线上版本，记录阻塞；不能把源码推送成功说成发布成功。
6. 从已提交源码生成本轮 ZIP，校验后提供下载链接。即使候选不能上线，也交付标记清楚的源码包。

原项目：`appgprj_6aa25a60e3c08191b9b5ea71879a62d7`。原站点：[幕云AI 工作台](https://zhixing-ai-workbench.keith-cooper602824.chatgpt.site)。不得创建替代站点或扩大私人访问范围。源码仓库写入凭据为短期凭据，只用于单次 Git 命令认证，不写入远端 URL、配置文件或交付包。

## 独立托管需要完成的适配

独立环境需要真实 Cloudflare D1 和 R2 资源、Worker 的 `nodejs_compat`、构建客户端静态资源路由、服务端 secrets，以及上一节的身份验证适配。`vite.config.ts` 中的本地数据库 UUID 是占位值，不能当作生产资源 ID。`.openai/hosting.json` 表示原 Sites 项目，也不是独立云账号的部署配置。

必须在隔离环境验证认证、跨用户拒绝、真实原件上传下载、模型请求和审批动作后，才可认为独立部署可用。本交付不自动开通新资源、不购买服务，也不包含生产账号或数据备份。

## 回滚与备份

- 发布前记录线上版本 ID、源码 SHA、数据库迁移状态和环境配置修订。通过受控运维备份数据库、原件及密钥恢复材料；不能装进普通源码包。
- 应用回滚使用 Sites 已保存且验证过的旧版本，沿用原项目和私人范围，并等待成功状态。不要为回滚代码删除数据库或重置主密钥。
- 代码回滚不会自动撤回数据库迁移或外部动作。若旧代码不兼容新表结构，需先设计并验证数据恢复或向前修复方案。
- 已执行的外部写入不支持自动补偿；保留审批和运行记录，外部状态不明时人工核对，避免重复执行。

## 常见问题

| 现象 | 排查方向 |
| --- | --- |
| API 返回 401 | 确认真实应用用户身份；页面访问令牌不一定包含它，不是模型故障 |
| 数据服务不可用或缺表 | 检查 DB 绑定、本地状态目录和迁移历史 |
| 文件上传失败 | 检查 BUCKET 绑定、文件 10MB 上限与文本提取是否成功 |
| 已保存密钥无法解密 | 确认沿用原主密钥与 owner 范围；不要生成新主密钥覆盖 |
| 关闭页面后任务停止 | 当前任务由页面推进，没有后台队列；重新打开查看持久化状态 |
| 模型测试失败 | 区分认证、网络、供应商额度和兼容协议错误；不要无限重试 |
| 全部回归通过但不能发布 | 检查矩阵中真实模型、线上身份、浏览器或其他发布门槛，不把模拟测试当真实服务通过 |

## 源码包完整性

### Word 导出验收环境

Word 文件由浏览器中的项目代码生成，线上不需要安装 Office。维护人员在本地验收时使用 Node 24 生成样例、Python 解析 OOXML，并可用 LibreOffice + Poppler 渲染逐页图片。样例和命令见 `CODE_GUIDE.md`。可选 PDF 文字检查需要 PyMuPDF。

中文渲染需要运行机器具有中文字体。2026-09-15 验收使用 [Noto Sans CJK SC](https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF/SimplifiedChinese)，按其 [SIL Open Font License](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE)用于本地渲染；字体未嵌入 DOCX，也不打进源码包。通过本地 Fontconfig 将 Microsoft YaHei 映射到该字体；无中文字体时的空白字形属于失败，不能仅以 PDF 生成成功判断通过。Microsoft Word、WPS 和其他字体环境仍需独立验收。

包内 `SOURCE_MANIFEST.json` 包含完整提交 SHA、每个文件的 SHA-256 和发布状态。安装依赖后可对原 ZIP 运行 `node scripts/package-source.mjs --verify /完整路径/源码包.zip`。校验只验证完整性和交付内容，不验证功能质量或赋予发布许可。

## 聊天 XLSX 工具候选（2026-09-27，未部署）

沿用现有 D1/R2、DEEPSEEK_API_KEY、VAULT_MASTER_KEY 和应用认证；不新增依赖、迁移、secret，不重置已有值。新增受保护 GET `/api/artifact-file?id=...`，对象固定为用户路径 `chat-artifacts/<id>.xlsx`。访问令牌不能代替应用用户身份；本轮只读预检 HTTP 401，未提交模型调用。完成合法应用身份下的真实模型工具调用、文件下载与用量核验后，才能通过 Sites 发布原私人站点；当前保留版本 23。

回归入口 `node scripts/self-test.mjs` 已包含 `tests/document-agent.mjs`（真实 workerd/D1/R2、模拟模型）。另运行 `python3 tests/verify-chat-tool.py`，以独立 openpyxl 打开生成文件；这不是 Excel/WPS 或浏览器验收。首次独立检查将空单元格预期为 None，但既有序列化器保存为空字符串；核实后将预期明确为 ''，不改变业务数值或公式保护。

真实验收预算仍不超过 6 次模型请求；工具一次任务最多 3 次请求，建议只测试两个小任务。每次输出最多 2048 Token；失败不无限重试。回滚继续选择已验证版本 23；新增 artifact 记录格式不改变既有记录。候选的源码包与线上差异见 RELEASE_STATUS.json 和生成的 SOURCE_MANIFEST.json。
## 2026-09-27 · 工具审批候选

新增受保护 POST /api/document-tool，无新增 secret、迁移或依赖。它仅处理当前用户的隐藏 tool_request，批准后使用既有 D1/R2 保存成果，拒绝后永久关闭该提议。部署门槛仍为合法应用身份下的真实 DeepSeek 工具调用与下载验收；当前候选未部署，回滚目标仍是私人版本 23。
