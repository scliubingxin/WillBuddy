# 幕云AI 代码说明

## 2026-10-07 安全对话导入补充

`lib/chat-export.ts` 同时定义权威导出白名单和 `muyun-chat-export/v1` 导入解析器；`app/api/workspace/route.ts` 的 `import_chat` 只做 owner 隔离的条件插入，不覆盖目标 ID。`app/workbench.tsx` 负责本地文件大小/JSON 预检与入口展示，但服务端校验才是安全边界。导入后的成果只有 `artifactSummaries`（名称、字节数、SHA-256），没有对象键、URL 或下载能力；工具提议、事件与模型请求记录不属于可移植数据。

## 2026-10-06 对话安全重命名

`POST /api/workspace` 的 `rename_chat` 接收 `id`、`name` 和当前 `baseUpdated`。路由按认证 owner 读取真实 chat，验证版本后构造仅替换顶层 `name` 的数据，再用 owner、id、kind、updated 条件更新；并发变化会得到零写入。名称去除首尾空白，不能为空且最长 200 字。消息、工作上下文、成果和审批内容不会由重命名逻辑重建。

`app/workbench.tsx:renameChat` 成功后重新读取服务器记录并更新本地版本；冲突时保留对话内容并重新载入。`currentChatName` 统一供标题、后续发送、审批状态保存、评价和导出使用，避免显式名称被首条消息覆盖。`tests/regression-extra.mjs` 使用真实 SQLite 检查权限、版本和数据不变量，`tests/composer-rename.mjs` 转译并执行实际前端处理器。

## 2026-10-06 服务端权威对话导出

`GET /api/chat-export?id=...&baseUpdated=...&format=md|json` 按当前认证 owner 读取真实 `chat`，并要求客户端版本与 `records.updated` 完全一致。`lib/chat-export.ts` 是唯一导出白名单：保留角色、完整正文、模型、用量、来源和已完成成果摘要；不读取或透传请求标识、待执行提议、事件工具参数、内部成果 ID、对象键及私有下载 URL。URL 只接受 HTTP(S)，Markdown 正文与摘录使用纯文本代码块，名称转义。

路由返回 `Cache-Control: no-store`、`X-Content-Type-Options: nosniff` 和 UTF-8 安全文件名，不接受 HTML。`app/workbench.tsx:exportChat` 只在已有服务端版本且非运行/保存状态时启用，冲突会重载权威聊天。`tests/regression-extra.mjs` 用真实 SQLite 覆盖服务端正负路径，`tests/composer-export.mjs` 转译并执行实际前端处理器；两者都不调用模型。

## 2026-10-05 安全对话分支

`POST /api/workspace` 的 `branch_chat` 接收源 `id`、新 `newId` 和当前 `baseUpdated`。路由先读取当前 owner 的真实 chat，再构造白名单语义副本：顶层工作上下文和消息可读证据保留，每条消息的 `proposals` 删除。最终 `INSERT ... SELECT` 再次要求源 owner/kind/updated 未变化且目标不存在，从而把读取后的并发变化和 ID 冲突都变成零写入。分支不读取或写入 `tool_request`、`chat_requests`、vault、版本或审批状态。

`app/workbench.tsx:branchChat` 只在已有服务端版本的非运行中对话启用，目标使用浏览器随机 UUID；服务端成功后重新读取工作区并打开实际新记录，而不直接信任本地副本。冲突时重新加载源对话。`tests/regression-extra.mjs` 用真实 SQLite 验证数据与权限边界，`tests/composer-branch.mjs` 转译并执行实际前端处理器。

## 2026-10-05 对话限时恢复

`drizzle/0003_deleted_chats.sql` 按 `(owner,id)` 保存聊天删除快照、删除版本和到期时间。`DELETE /api/workspace` 在一个 D1 批次中从当前 owner、chat、updated 匹配的活动记录复制精确 `data`，再条件删除；任一步没有唯一命中即失败。成功之后才沿用原有清理，移除未终结工具提议与 `chat_requests`，所以内容恢复不会恢复已撤销的执行能力。

`GET /api/workspace` 只向当前用户返回最多 20 个未过期项的 `id/name/deleted/expires`，不把已删聊天混入普通 records。`POST /api/workspace` 的 `restore_chat` 要求删除版本精确匹配且未过期，并以条件插入 + 条件移除快照的单批事务恢复；已有活动 ID 时不覆盖。`app/workbench.tsx:restoreChat` 只使用服务器返回的回收元数据，恢复成功后重新读取并打开新版本。真实 SQLite 和转译后的实际前端处理器覆盖正负路径。

## 2026-10-05 对话删除并发控制

`DELETE /api/workspace?id=...&baseUpdated=...` 对聊天执行与保存相同的乐观并发约束。路由读取当前 owner 的记录并验证类型和版本，再以 owner、id、kind、updated 做条件删除；旧版本、缺版本或条件删除丢失竞争都会返回“刷新后再删除”。条件删除成功后才清理 pending/executing 工具提议、`chat_requests`、vault、应用值和版本记录；已完成、拒绝或过期的权威工具审计仍按既有策略保留。

`app/workbench.tsx:remove` 对当前聊天使用 `chatUpdated`，对搜索结果和后台聊天使用列表中的 `updated`。冲突时不关闭确认框：当前聊天调用 `reloadChat`，其他聊天刷新资源列表，让用户看到最新状态后重新决定。`tests/composer-delete.mjs` 转译并执行实际处理器，后端真实 SQLite 回归验证旧/缺版本拒绝、新版本成功且数据不被误删。其他资源和文档删除不携带聊天版本参数。

## 2026-10-05 对话乐观并发控制

`lib/workspace.ts:saveChatRecord` 将聊天写入与普通记录写入分开：首次创建只允许记录不存在，更新要求客户端提交服务器最近返回的 `updated`；D1 更新同时匹配 owner、id、kind 与旧版本，版本使用 `max(当前时间, 旧版本+1)` 保证单调。已有聊天缺少版本也失败关闭，使部署前打开的旧网页不能静默覆盖新内容。

`app/workbench.tsx` 在打开、创建和刷新聊天时跟踪该版本。发送前先条件保存用户消息，若另一标签页已更新则恢复输入、重新加载权威聊天且不调用模型；成功回复和恢复由 `chat-idempotency` 服务端落盘，网页只刷新版本，不再提交完整旧快照。审批事件与评价仍条件保存，冲突时刷新而非覆盖。该机制保护单记录快照，不自动合并两个标签页同时编辑的任意字段。


## 2026-10-04 多标签页迟到回复合并

`lib/chat-idempotency.ts:persistCompletedReply` 先以 `(owner, chat, requestId)` 检查助手回复是否已存在，再要求聊天中恰好有一条同标识用户消息。它把白名单化助手消息插入该用户消息之后，而不是盲目追加到末尾；更新仍以完整旧 JSON 为条件，CAS 冲突时重读一次最新快照。这样在模型运行期间另一标签页追加的新问题不会被覆盖，迟到回复也不会错排到新问题之后。

原用户消息已被删除或出现重复标识时函数返回失败，不尝试按正文、位置或相似度猜测；完成态仍保留在 `chat_requests`。紧邻的旧版无标识助手消息若正文完全一致会被视为已经保存，以兼容升级窗口并避免重复。此机制只处理单条聊天记录内的并发合并，不是多区域协同编辑协议或无限期消息队列。


## 2026-10-04 服务端自动保存完成回复

`lib/chat-idempotency.ts:persistCompletedReply` 将模型结果白名单化为助手消息，并保留与用户消息相同的 `requestId`。它只在目标记录仍是当前 owner 的 `chat`、末尾仍为该请求的用户消息且完整 JSON 数据快照未变化时更新；条件更新失败最多重读一次，发现已有同请求助手消息即视为完成，发现另一标签页的新状态则停止。这样正常客户端保存、POST 重放和 GET 恢复都是幂等的，不会覆盖并发编辑。

`completeChatRequest` 仍先把完整模型响应写入 `chat_requests`，再尝试聊天落盘。聊天已变化、删除或超过记录上限时，落盘不会改写新状态，短期完成响应仍保留供 `GET /api/chat` 恢复。`app/workbench.tsx` 也把 `requestId` 写入助手消息，使客户端保存与服务端记录使用同一去重键。

## 2026-10-04 刷新后恢复回复

`GET /api/chat?chatId=...&requestId=...` 调用 `replayChatRequest`，先以当前认证 owner 读取真实 `chat`，再查同一 owner、chat、requestId 的 `chat_requests`。仅 `completed` 且含有效持久化响应的记录可返回，并统一标记 `reused`；pending、缺失、跨用户及已删除聊天都失败关闭。该入口不接收消息正文、模型配置或密钥，因此不会发起模型调用，也不能把请求标识重新绑定到其他内容。

`app/workbench.tsx:resumeLast` 只在会话末尾是带请求标识的用户消息时提供恢复按钮。成功后把服务器完成态转换为普通助手消息并保存原聊天；失败保留用户消息和错误提示，不自动发送。它补的是浏览器响应丢失后的结果恢复，不是后台生成状态推送或无限期历史备份。

## 2026-10-04 对话发送幂等

`app/workbench.tsx` 为每次逻辑发送生成 `requestId`，并把它保存在用户消息上；模型调用失败后的“重新发送”沿用同一标识，模型历史仍只提交角色与正文。`lib/chat-idempotency.ts` 只在同时收到 `requestId` 与真实 `chatId` 时启用保护：先验证当前 owner 的聊天，再计算不含 API Key/搜索 Key 的请求 SHA-256，以 `(owner, requestId)` 原子插入 `chat_requests`。领取成功者才能调用模型；运行中重复失败关闭，已完成重复返回持久化响应并标记 `reused`，同一标识换内容拒绝。完成写入同时要求原对话仍存在；删除聊天会在同一 D1 批次清理其重放记录。

重放记录保留 24 小时并在后续请求时按 owner 清理；它防止典型双击、网络响应丢失和错误重试造成的重复模型调用，不是跨区域分布式队列或供应商账单仲裁。供应商明确失败后会释放领取供用户重试，这次重试仍可能产生新的服务商费用。无 `requestId` 的模型连接测试、流程和旧内部调用维持既有行为。

## 2026-10-03 对话删除与文档执行原子交接

`POST /api/chat` 在模型返回工具提议后，使用带 `chat` 存在条件的 D1 插入；对话若已在模型等待期间删除，只返回失败关闭事件，不留下隐藏提议。`DELETE /api/workspace` 删除聊天时，在同一 D1 批次清理该聊天仍为 pending/executing 的 `tool_request`，但保留 completed/rejected/expired 终态记录。审批生成成果时，artifact 插入与提议 completed 更新放在同一 D1 批次，并同时要求原聊天和本次 executing 领取仍存在；条件失效会清理 R2 对象及临时 artifact。这样删除与交付无论谁先提交，都不会产生脱离对话的迟到成果。

## 2026-10-03 文档提议跟随对话生命周期

`lib/ai-service.ts` 在启用文档工具时先用当前用户和 `chatId` 读取真实 `chat` 记录，验证通过后才进入模型工具循环，避免任意客户端字符串成为提议归属。`POST /api/document-tool` 在状态、批准或拒绝前再次确认原始对话仍存在；对话被删除后，隐藏的待处理提议即使尚未过期也不能再执行。已完成/拒绝/过期的服务端审计记录不随聊天删除而伪造或改写，仍受用户、原始 `chatId` 和终态限制。

## 2026-10-03 文档审批操作绑定对话

`POST /api/document-tool` 的 `approve`、`reject` 与 `status` 都要求浏览器提交当前 `chatId`，并在任何终态恢复、过期判断或文件生成之前，与隐藏 `tool_request.chatId` 做常量语义的完全匹配。身份正确但对话不一致、旧记录缺少绑定或请求缺少标识时均失败关闭。`app/workbench.tsx` 的批准、拒绝和跨标签页状态同步复用当前已打开对话 ID；服务端记录仍是权威来源。

## 2026-10-03 审批记录绑定真实对话

`app/workbench.tsx:send` 把已经持久化的当前 `chatId` 随模型请求提交；`lib/ai-service.ts` 仅在文档工具真实启用时要求 1–100 字符的有效标识，并把它保存在当前用户隐藏的 `tool_request`。`POST /api/document-tool` 的 `audit` 动作除校验当前用户、提议终态和唯一 ID 外，还要求每条提议的服务端 `chatId` 与请求对话完全一致。旧记录缺少绑定、同一所有者跨对话搬用或混合对话导出都会失败关闭。`chatId` 不进入脱敏 receipt，只用于服务端授权与审计包归属。

## 2026-10-02 服务端权威审批审计

`POST /api/document-tool` 的 `audit` 动作接收 `chatId`、可选模型名和 1–20 个唯一提议 ID。路由使用当前认证用户逐项查询 `tool_request`，只允许 completed/rejected/expired，再调用 `documentAuditReceipt` 与 `approvalAuditExport` 重建输出；请求体中的其他字段不会进入凭证。`app/workbench.tsx:downloadApprovalAudit` 不再序列化本地 receipt，仅提交 ID 并下载服务器响应。该边界防止被修改的聊天事件伪造审计包，但不是数字签名或外部不可否认日志。

## 2026-10-02 脱敏审批凭证

`lib/document-audit.ts` 是文档审批审计的唯一白名单边界：服务端 `documentAuditReceipt` 仅从当前用户提议记录提取终态、提议指纹、时间和成果哈希；不透传原始 `arguments`、对象键、API 密钥或下载 URL。`app/api/document-tool/route.ts` 在完成、拒绝、过期及幂等恢复响应中附带凭证。`app/workbench.tsx` 将终态凭证写入对应聊天事件，`approvalAuditExport` 只导出 completed/rejected/expired，按提议 ID 去重，并生成可下载 JSON。凭证证明审批对象与成果字节的绑定，不证明业务内容正确或文件在 Office 中的视觉质量。

## 2026-09-28 表格提议预览

`spreadsheetPreview` 只接受已经通过 `spreadsheetSpec` 的结构，确定性返回最多 6 列 × 5 行；空值转为“空”，连续空白折叠，单元格截到 80 字，并给出 `hiddenColumns`/`hiddenRows`。`lib/ai-service.ts` 将该预览与隐藏提议一同保存，只把预览、文件名和行列数交给聊天；原始 `arguments` 不进入前端响应。`app/document-proposal.tsx` 用只读表格渲染，React 文本节点负责转义，不使用 HTML 注入。

## 2026-09-28 文档提议状态同步

`POST /api/document-tool` 的 `status` 动作按当前用户读取隐藏的 `tool_request`，只返回 pending/completed/rejected/expired、有效期和已完成成果；不会返回原始工具参数。pending 在读取时也会执行服务器过期判定。`app/document-proposal.tsx` 在挂载、页面重新可见和有效期到达时同步；本地到期先隐藏按钮，`app/workbench.tsx` 再将服务器终态去重写回聊天。批准/拒绝与 status 共用同一幂等状态机。

## 2026-09-27 文档提议有效期

`DOCUMENT_PROPOSAL_TTL_MS` 定义 10 分钟有效期。提议记录同时保存 `created` 与 `expiresAt`；审批路由使用 D1 原记录 JSON 作为比较条件，只有状态仍未变化时才能写入 `expired`。`app/document-proposal.tsx` 显示失效时间，`app/workbench.tsx` 将服务器过期结果写入聊天事件。

## 2026-09-27 对话重试

`app/workbench.tsx` 的错误条直接调用既有 `send`，由输入框中恢复的问题决定重试内容；`send` 已具备“末尾相同用户消息则复用”的去重规则。`tests/composer-send.mjs` 转译并执行实际处理函数，覆盖重试不重复消息。

## 2026-09-27 文档工具发布边界

`lib/runtime-capabilities.ts` 从 Worker 运行环境读取 `DOCUMENT_TOOL_ENABLED`。`lib/ai-service.ts` 仅在客户端请求且服务端开关严格为 `true` 时进入文档代理；`app/api/document-tool/route.ts` 使用同一开关保护审批执行。缺省状态是失败关闭，前端参数不能自行开启能力。

2026-09-26 分会话草稿：lib/chat-drafts.ts 为新对话和每个对话 ID 生成隔离的 sessionStorage 键，限制 20000 字并在存储不可用时退回普通输入。app/workbench.tsx 在首次挂载、最近对话、全局搜索和新对话切换时恢复对应草稿；发送前显式清理当前草稿，失败/停止继续复用发送生命周期的空输入恢复规则。草稿不进入 D1/R2，不跨标签页或设备同步，不包含附件、密钥或服务端记录。tests/composer-drafts.mjs 运行真实帮助函数并检查组件接线。

2026-09-26：`app/workbench.tsx` 的 `send` 在本地校验通过后立即清空输入；响应成功不再重置新草稿。`replyReceived` 区分响应前失败和响应后持久化失败，前者仅在输入仍为空时恢复原文。`tests/composer-send.mjs` 提取并转译实际处理函数，使用延迟模拟 IO 验证六类草稿生命周期，已加入全量入口。

## 受限中文任务简报编译器（2026-09-22）

`local-runner/engine.py:text_document_plan` 只解析一行可选说明及逐行编号的“标题：正文”，限制 1–10 项、标题 100 字、正文 2000 字，并拒绝未编号补充、重复标题、控制字符和未知来源元数据。它调用既有 `document_plan` 生成固定 DAG，再由 `validate_plan` 重新校验；顶层 `planning` 保存模式、源 SHA-256、条目数和人工审阅提示。`Runner.create`/`retry` 持久化该来源，`server.py` 的 `/api/text-plan` 暴露给回环任务台，`console.html` 仍要求用户审阅 JSON 并再次校验后才开放执行按钮。

这里没有模型调用、任意工具选择或自然语言代码执行。编译器不会把简报扩展为表格、代码或外部动作，不能称为自主代理。测试入口是 `tests/local-runner-test.py` 和真实 `tests/local-runner-live.py`。

## 多批次公平调度（2026-09-22）

`Runner._schedule_fair` 对按创建时间排列的活动批次做轮转，每轮每批最多调用一次 `_dispatch`，直到全局线程池填满或没有就绪任务。`scheduler_cursor` 让单槽执行器在后续 tick 从下一个批次继续；`_ready_task` 只返回依赖全部成功的 pending 任务，`_block_unreachable` 传播失败阻断。每批仍受 `policy.maxConcurrency` 和预算约束。运行 JSON 的 `scheduler` 保存策略、分派次数和观察到的并发峰值； started 事件保存排队时间。

游标只属于当前进程，重启后从零开始，但持久化任务状态、依赖和完成证据不丢失；这不是跨主机分布式调度器。

## 单批运行预算（2026-09-22）

`local-runner/engine.py` 的计划顶层 `policy` 限制单批最大并发、墙钟时间和已验证成果总字节。`validate_plan` 拒绝未知字段、布尔伪整数及越界值；`Runner.tick` 同时服从执行器线程池和单批上限，汇总去重后的 verification 字节。超限设置不可变的 `budgetFailure`、发出一次 `budget_exceeded`、取消未完成工作并使批次失败；成果验收不会在预算失败后运行。`Runner.retry` 继承策略，复用的成功成果也计量。任务台展示策略和当前用量。

预算是确定性保护栏，不是容器隔离、租户配额或费用账单。代码任务仍只有 Docker 隔离能力检查通过才入队；缺环境绝不降级为主机执行。

## 可控断点重试（2026-09-22）

`Runner.retry` 仅接受 failed/cancelled/interrupted 且至少有一个未成功步骤的终态批次。它从保存的任务定义重新运行 `validate_plan`，只对待重跑任务执行环境能力检查；成功步骤必须保有 passed verification，并逐文件调用 `_check_entry`。新批次用 `retryOf`/`attempt` 关联来源，复用步骤保留 result 和 `reusedFrom`，未完成步骤去除运行态字段后恢复 pending。`server.py` 提供受会话保护的 `/api/retry`，本机任务台只在可重试终态显示按钮和复用证据。

此机制不修改来源批次、不自动触发、不绕过 Docker/GenOffice/LibreOffice 能力检查。内容验收失败但步骤均成功时必须编辑计划后新建任务，避免无变化无限重跑。完整性证据缺失或成果被改动时失败关闭。

## 可执行成果验收（2026-09-21）

`local-runner/engine.py` 的 `validate_plan` 接受可选 `acceptance` 数组，并将安全、定长的标准保存为 `acceptancePlan`。全部任务成功后，`evaluate_acceptance` 从对应任务的 `verification.artifacts` 选择唯一扩展名成果，调用同一 `_check_entry` 重新读取并核对 SHA-256，再执行文件存在/大小、UTF-8 精确包含或 JSON 标量路径比较。标准失败不会篡改已完成步骤，而是把批次标为 failed 并保存逐项证据。`console.html` 显示验收计划和结果；`document_plan`/`spreadsheet_plan` 默认要求每份 Office、PDF 及最终 ZIP。没有 `acceptance` 的旧计划继续按原行为完成。

这是受限声明式 DSL：最多 20 条、每条绑定一个任务及唯一扩展名成果，文本最多读取 1MB，JSON 路径最多 10 段且预期值仅支持标量。它不执行用户脚本、不做模糊或模型语义判断，也不替代文件完整性、沙盒和人工业务复核。

## Office 编辑检查点（2026-09-21）

`local-runner/genoffice_adapter.py` 在三类 `*_apply` 编辑前读取任务内输入，编辑后确认输入字节未变，再生成 `edit-checkpoint.zip`。包中仅含 `original.<ext>` 与 `MANIFEST.json`，记录编辑前后字节数、SHA-256 和恢复策略；检查点本身继续接受执行器的成果完整性保护。

`local-runner/restore_checkpoint.py` 是离线安全恢复入口：限制包结构、解压大小和 Office 扩展名，校验原件及当前编辑结果哈希，始终原子写入一个尚不存在的新路径。当前文件发生后续修改时拒绝，不提供覆盖或强制开关。功能适用于 DOCX/XLSX/PPTX 编辑；创建、读取、检查、转换和预览不生成编辑检查点。证据脚本仍为 `tests/genoffice-live.py`，单元与失败关闭覆盖在 `tests/local-runner-test.py`。

## 成果完整性验收（2026-09-21）

`local-runner/engine.py` 的 `execute_checked` 包装固定任务执行，结果持久化 `verification`（时间、范围、每文件字节数/SHA-256）。`read_artifact` 返回同一份复验字节，`server.py` 直接发送；`console.html` 展示证据。拒绝缺失/空文件、跨任务路径、符号链接、非普通文件、重复清单；每文件最多 50MB、每任务最多 50 个文件且总计 100MB。代码任务只记程序退出验收，不冒称产出文件。旧任务缺证据时拒绝网页下载，保留本机原文件。新建任务丢弃用户计划中的伪造结果字段。

这不是文件内容质量证明，也不是宿主机隔离。上游参考与未来路线见 OPENWORKBUDDY_REFERENCE.md。新增真实下载复验脚本 tests/artifact-integrity-live.py。

## GenOffice 集成（2026-09-20）

`app/office-actions.tsx` 为聊天和成果提供真实 Office 下载；`lib/office-content.ts` 确定性识别 Markdown 表格并导出本机计划。`app/genoffice-panel.tsx` 与本机控制台提供 GenOffice 创建/读取/编辑/检查/转换入口；`local-runner/genoffice_adapter.py` 调用独立安装的官方 CLI，复用 DAG 与成功成果白名单。未将 Electron/原生组件打进 Worker；未更改模型调用逻辑或密钥。编辑含普通单元格公式的工作簿时，适配器解析编辑副本中的公式并通过 GenOffice 原生 `sheet apply --cells` 重新提交，只有全部公式及缓存刷新获确认才交付；报告保留工作表、单元格及最多 100 条缓存变化，更多变化只记录总数和截断标志。共享、数组、结构化或超过 1000 个公式时失败关闭。完整安装、许可来源、验收及未实现边界见 `GENOFFICE_INTEGRATION.md`。

同一适配器的 `render` 动作用固定 LibreOffice + Poppler 链路处理 DOCX/XLSX/PPTX/PDF：Office 文件先在隔离 profile 中转 PDF，`pdfinfo` 校验 1–20 页，`pdftoppm` 生成 PNG。任务返回 `engine: libreoffice-poppler`，报告写明兼容性预览契约，避免误标成 GenOffice 原生渲染。路径来自可信本机配置而非任务输入，子进程只继承字体、区域和 PATH 白名单，不继承模型或加密密钥。

本包提供工作台的完整已提交源码，版本以包内 `SOURCE_MANIFEST.json` 的 `commit_sha` 为准。是否上线、测试类型和阻塞原因见 `RELEASE_STATUS.json`；开发分支比线上新，不等于新功能已发布。

## 2026-09-28 文档提议内容指纹

`spreadsheetProposalDigest` 对 `spreadsheetSpec` 校验和规范化后的文件名、列名与全部行按固定 JSON 顺序计算 SHA-256。`lib/ai-service.ts` 将指纹与隐藏参数一起保存，只向卡片和事件返回指纹、尺寸、有效期及受限预览。`POST /api/document-tool` 在原子认领后重新解析参数并复算指纹；不匹配时恢复为不可成功执行的待处理状态并记录错误，绝不生成 R2 对象或 artifact。指纹是审批内容绑定和审计线索，不替代用户核对完整业务内容、文件哈希或身份授权。

## 阅读顺序

1. `README.md`：使用方法、已实现模块和产品边界。
2. 本文：代码结构、数据流和修改入口。
3. `DEPLOYMENT.md`：依赖安装、本地启动、数据库、认证、发布与回滚。
4. `SELF_TEST_MATRIX.md`、`ITERATION_LOG.md`：全功能覆盖、真实结果和缺口。
5. `PRODUCT_ANALYSIS.md`、`ITERATION_PLAN.md`：Quick 能力映射与后续迭代。

## 技术与目录

### 本地执行器（2026-09-20，Web 入口已部署版本 10，本机服务另行启动）

`app/local-execution.tsx` 提供文档计划 JSON 导出和启动说明，不从网页自动执行本机命令。`local-runner/server.py` 是独立 Python 标准库 HTTP 服务，只绑定 127.0.0.1；`console.html` 提供计划编辑/导入、确认执行、任务、日志、取消与下载。`engine.py` 负责计划结构校验、DAG 调度、全局并发上限、SQLite 状态、事件和文件白名单。它不是 Cloudflare Worker 中启动的子进程，也不读取云端托管密钥。

文档规则规划为 FODT → LibreOffice DOCX/PDF → Poppler PNG → 成果 ZIP；表格规则规划为 CSV → 转义后的 FODS → LibreOffice XLSX/PDF → Poppler PNG → 成果 ZIP。有限十进制在表格中保持数值，公式样式内容作为普通字符串，不生成公式节点。实际并行的是依赖满足的任务，不是多个模型代理。每个转换任务独立 LibreOffice profile。`bundle` 只接受已成功的文档/表格 render/preview 依赖，重新解析白名单路径、拒绝链接与越界，限制 50 文件/50MB，输出逐文件 SHA-256 清单。代码任务仅通过 Docker 适配器：禁网、非 root、只读根/输入、资源限制、超时和强制清理；缺 Docker 拒绝执行。真实 Docker 验收在本环境未完成，不作安全保证。LibreOffice 固定输入链路是受控渲染，不冒充沙盒。

运行数据在用户指定的本地目录（默认用户主目录下 `.muyun-ai-runner`），含 `runner.sqlite3`、独占锁和各任务文件；没有自动云同步。会话令牌仅服务存活期间有效，HTTP Host/Origin/会话头保护不替代多用户认证。重启将未完成任务标为中断，不重放；复制数据目录前先停止服务。测试入口：`tests/local-runner-test.py`（确定性）、`tests/local-runner-live.py`（真实 Office）、`tests/local-runner-docker.py`（真实容器，缺环境非零退出）。

前端为 React 19 + TypeScript；Vinext/Vite 将应用构建为 Cloudflare Worker。服务端依赖 D1 数据库和 R2 原件存储。它不是只需上传静态 HTML 的站点。

| 路径 | 职责及常见修改入口 |
| --- | --- |
| `app/workbench.tsx` | 聊天、知识空间、智能体、模型设置、轻量任务流和成果 |
| `app/suite.tsx` | 研究、数据看板、集成审批、自动化、应用、版本和记忆 |
| `app/api/` | workspace、documents、chat、data、integrations、jobs、research、versions、vault、app-data 共 10 个 API |
| `lib/workspace.ts` | 用户身份、来源检查、统一响应和按用户隔离的记录操作 |
| `lib/managed-model.ts`、`lib/vault.ts` | 托管模型固定配置、AES-GCM 密钥加密与解密 |
| `lib/model.ts`、`lib/ai-service.ts`、`lib/chat-idempotency.ts` | Chat Completions 适配、请求幂等、知识检索、提示组装、引用编号检查、用量记录 |
| `lib/data-engine.ts` | CSV 数据结构、受限筛选与确定性聚合 |
| `lib/integrations.ts` | 公网 HTTP、OpenAPI 操作、MCP 会话与搜索接入 |
| `lib/job-engine.ts` | 流程静态预检、持久化节点推进、领取租约、修订号、审批及取消 |
| `lib/file-tools.ts`、`lib/xlsx-export.ts`、`lib/slides.ts` | 文件提取、格式化 XLSX；PPTX 标题解析、可编辑项目符号、自动续页、品牌页脚与页码；其他格式导出 |
| `lib/docx-export.ts` | 可独立测试的 Word 序列化；Markdown 表格转原生表格、列宽、对齐、重复表头和换行 |
| `db/schema.ts`、`drizzle/` | 数据模型、三次 SQL 迁移及迁移元数据 |
| `components/`、`public/`、`vendor/` | 界面组件、静态资源、随源码交付的样式及许可证 |
| `build/` | Sites 的 Vite 插件源码及许可证；这是源文件，不能当缓存删除 |
| `scripts/` | 启动、构建、安装、回归及源码打包脚本 |
| `.openai/hosting.json` | 原私人站点身份和 DB/BUCKET 绑定名称 |

依赖精确版本由 `pnpm-lock.yaml` 固定；不要仅依据 package.json 中的版本范围重建依赖。第三方文件保留自身许可证；本包不授予第三方服务账号或模型使用额度。

## 主要业务路径

**聊天与知识**：界面提交消息和资源范围 → API 验证用户 → 加载该用户的配置、记忆、资料和数据 → 检索片段 → 调用选定兼容模型 → 返回回答及来源 → 记录服务商返回用量。托管 DeepSeek 的服务端密钥不随配置返回浏览器。当前候选采用中文 2–4 字词组加权检索；来源包含位置、匹配词和证据摘录。引用检查仅识别不存在的 `[n]` 编号，不能证明模型陈述符合原文。

**数据分析**：自然语言可用于解释查询意图，数值结果由受限查询代码计算。分组、计数、和、平均、极值均有已知答案回归；没有任意 SQL 执行器。

**CSV 导出防护**：`lib/data-engine.ts` 的 `toSpreadsheetCSV` 专供面向表格软件的下载，`lib/file-tools.ts` 的 `exportCsv` 负责 UTF-8 Blob、文件名与下载。公式起始符（含全角）、隐藏前缀和起始控制字符会加单引号，包括列标题；有限数值保持原类型路径，其他内容保留，引号/分隔符/内嵌换行经 CSV 转义。返回 `protectedCells` 驱动界面提示，源记录不会改写。原 `toCSV` 仍用于无损数据交换，不能接到用户的表格下载入口。

CSV 没有单元格类型，文本前缀可能出现在再次导入的数据中；文本形式的负数也会被保护，不应将防护版当作机器交换的无损原件。需要保留原始文本与数值类型时使用 XLSX。防护不保证 Excel/WPS 或另存后重开的行为；依据 [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)（2026-09-15 核对），不承诺对所有表格软件存在通用安全策略。

**XLSX 导出**：`lib/xlsx-export.ts` 直接构建最小 OOXML 工作簿。表头使用幕云AI蓝色和白色粗体，数据行交替底色；首行冻结、全数据范围可筛选，列宽根据前 200 行估算并限制在 10–40，长文本自动换行，负数以红色显示，横向打印适配一页宽。有限数字写成真正的数值单元格；包括 `=1+1` 在内的公式样式输入始终写成内联文本，不执行。未知类型转为文本，非法 XML 控制字符会移除。当前只导出单工作表，不含公式、图表、合并单元格、条件格式或模板还原。

**文件**：文档记录与检索片段进入 D1，原文件进入 R2；下载、删除和检索均受用户范围约束。浏览器提取的文本用于检索，不具备扫描件 OCR 或向量检索。

**自动化与审批**：编辑器可先调用 `POST /api/jobs` 的 `inspect` 操作；`inspectNodes` 检查节点数量/类型/标识、配置、分支目标、模板引用和入口可达性，返回模型/知识/网络/外部动作/人工确认摘要。这个操作只读且不调用模型或连接器；保存与运行复用同一验证器阻断错误流程。草稿或发布快照创建任务 → API 领取当前步骤 → 保存结果、事件及下个状态。修订号用于拒绝过期响应；审批冻结动作参数。输出成果与完成状态在同一事务写入。取消不撤回外部已发生的操作；外部执行结果不明时不自动重发。任务推进仍依赖页面请求，没有后台定时队列。

**应用与版本**：生成的应用在沙箱中预览，经受限存储桥保存当前用户的 KV；发布和恢复切换工作空间内的版本，没有独立公开站点或团队发布权限体系。

## 数据与身份

8 张表分别保存通用记录、文档、片段、用量、加密凭据、版本、应用值和任务。原件存储另需 R2。记录及查询必须保持 owner 范围；身份来自受信任的认证网关，应用并不验证任意客户端自报的用户头。自建认证的要求见部署文档。

`VAULT_MASTER_KEY` 是加密已有凭据所需的主密钥，不能通过重置解决解密失败。源码、交付包和普通用量日志都不应包含真实凭据或用户资料。

## 验证与开发约定

```sh
node scripts/self-test.mjs
pnpm build
```

完整入口执行 TypeScript 检查及 `tests/integration.mjs`，后者包含额外回归、导出检查和中文检索基准。流程预检的固定验收说明在 `tests/acceptance/workflow-preflight-2026-09-17.json`。SQLite、生产 API 处理函数、事务及 Office ZIP 生成代码真实执行；外部模型、搜索、连接器及对象存储使用替身。这些测试不能标成线上端到端通过。`tests/live-model.mjs` 需要合法的站点用户身份，`tests/provider-live.mjs` 需要安全的供应商运行环境；打包不会执行它们或消耗模型 Token。

修改功能时同步维护自测矩阵，运行全部已有回归；涉及提示、检索上下文或模型适配时补真实模型验收。默认每轮最多 6 次真实请求、每次最多 2048 输出 Token。没有 Quick 同任务对照时，不根据回归分数宣称已超越 Quick。

Word 表格验收：运行 `node tests/export-docx-fixture.mjs`（Node 24）生成包含 36 条合成记录的 DOCX，再运行 `python3 tests/verify-docx-fixture.py outputs/docx-table-acceptance/muyun-ai-word-tables.docx` 独立解析结构。用 LibreOffice 将同一 DOCX 渲染成 PDF/逐页 PNG 后，将 PDF 作为 `--pdf` 参数传入检查器；该可选检查需 PyMuPDF。它会核对中文文字、全部记录、跨页表头和页面边界，但仍需逐页检查 PNG 才能给出视觉结论。

CSV 实际导入验收：`tests/export-csv-fixture.mjs` 调用生产序列化函数，生成 16 条合成记录及无害的 `=1+1` 阳性对照。LibreOffice 启用公式解析后导入，`tests/verify-csv-fixture.py` 独立检查生成文件中的公式、文本、数值和列数：对照必须算出 2，保护版必须无公式，16 个金额必须为 -12.5。Calc 会将两处 CR/CRLF 转为 LF，检查器只接受这一明确差异及可选的单引号文本标记消耗；不据此声称字节级保真。复现命令见部署文档，完整回归另覆盖 19 种前缀及 API 导入/重开/导出/再导入/计算链路。

XLSX 实际验收：`node tests/export-xlsx-fixture.mjs` 使用生产序列化器生成 42 行中文企业交接样例，`python3 tests/verify-xlsx-fixture.py <文件>` 检查冻结首行、筛选范围、列宽、数值/文本类型和换行。再由 LibreOffice 打开并另存，同一检查器必须再次通过；转 PDF 后逐页检查中文、边框、交替底色、负数颜色、换行及分页。本流程不替代 Microsoft Excel、WPS 或真实浏览器下载验收。

PPTX 实际验收：`node tests/export-pptx-fixture.mjs` 使用生产 `buildPptx` 生成 4 页中文企业样例；`python3 tests/verify-pptx-fixture.py <文件>` 检查页数、中文文字、可编辑的可见项目符号、作者元数据和文本框边界。使用 LibreOffice 打开并另存后必须再次通过，再转 PDF/逐页 PNG 并查看全部页面。当前导出保留标题、列表和正文结构，按视觉长度换行并自动续页；不生成图片、图表或表格，不继承原模板，也不替代 PowerPoint、WPS 和生产浏览器下载验收。

当前支持带三条或更多短横线的分隔行、可选外侧竖线、转义竖线、对齐标记和单元格 `<br>`，最多 12 列。列不足补空值；多余单元格转回原文保留，避免丢数据。代码围栏内不转换表格。未提供完整 Markdown 解析、合并单元格、嵌套表格、图片、Word 公式或原模板还原。

## 每轮源码交付

2026-09-16 增加 `tests/worker-runtime-regression.mjs` 并纳入完整自测入口：在实际 workerd 中执行模型及连接器请求，复现旧 `redirect: 'error'` 参数在发出请求前抛出 TypeError 的问题。生产代码使用 `manual` 并拒绝全部 3xx，禁止自动转发密钥；26 项运行时断言覆盖正常调用、用量、5 类跳转、鉴权失败和匿名应用请求拒绝。该回归的外部服务是替身。

`tests/worker-live-model.mjs` 通过现有应用 API 处理函数、隔离本地 D1/R2 和实际 workerd 做真实 DeepSeek 验收。进程中配置 `DEEPSEEK_API_KEY` 后运行，默认 4 次请求、每次最多 2048 输出 Token；可用参数 `no-evidence,data-calculation` 接续指定用例。重复执行必须累计本轮预算。密钥不落盘。当前本地 workerd 无外部 DNS，显式通过 Node 出口转发到唯一允许的 DeepSeek 完成接口，不能冒充生产出口验证；合成本地用户身份也不是生产登录。测试夹具不属于线上路由。

更新 `RELEASE_STATUS.json`、迭代日志和矩阵，提交并推送原仓库后，在干净工作区运行：

```sh
node scripts/package-source.mjs
node scripts/package-source.mjs --verify outputs/实际生成的文件名.zip
```

脚本只读取当前 Git 提交中的文件，拒绝未提交改动；保留完整 SHA、逐文件 SHA-256、文件权限及验证状态。包内包含源码、依赖锁、迁移、测试和说明，不包含 Git 认证信息、依赖目录、缓存、密钥或用户数据。它会解压校验每个文件，失败则不交付。源码 ZIP 不是数据库备份，也不是 Sites 的生产部署制品。

下载解压后可直接安装依赖、构建和测试，不需要 Git 历史；重新打包已修改的源码则需在自己的 Git 仓库中审查、提交，并更新发布状态。每轮交付时提供新 ZIP 的实际下载链接，候选版本必须明确标注未部署原因。

## 2026-09-27 聊天 XLSX 工具候选

`lib/document-agent.ts` 独立实现受限工具循环，参考 Octop 的模型/工具/结果分层，不引入其代码或依赖。`lib/model.ts` 为显式 tools 请求保留 tool_calls；普通请求不携带 tools。工作台当前在本次输入包含 XLSX、Excel、表格文件或电子表格时开启此路径，因此含糊的“再做一份”不会自动开启。

唯一工具 `create_spreadsheet` 接受文件名、唯一列名、矩形标量行；最多 50 列、500 行、80000 字符参数、200KB 文件。固定 XLSX 序列化器生成后解包校验、计算 SHA-256，文件保存 R2，成果元数据保存既有 D1 artifact 记录。工具最多执行两轮，模型最多三轮，每轮输出最多 2048 Token。每次模型用量分别记账，返回合计；总结失败仍返回已经保存的文件。普通文本聊天、任务流仍走原路径。

`app/api/artifact-file/route.ts` 要求既有应用用户身份，校验成果归属、固定对象路径、字节数及 SHA-256。`app/document-file.tsx` 在对话及成果中心共用实际下载入口；表格成果不再把描述文本伪装成 XLSX。删除成果记录时清理对应 R2 文件；删除聊天不删除独立成果。模型错误/工具执行证据在请求结束后展示，尚非实时事件流。

本轮不是 Octop 全量集成、ACP、本机配对或通用自主规划；GenOffice/LibreOffice 仍为既有独立本机链路。该候选未部署，真实 DeepSeek 工具调用与浏览器验收未完成。
## 2026-09-27 · 文档工具审批边界

聊天工具不再直接生成文件。模型返回的单个 create_spreadsheet 调用经参数校验后保存为隐藏的 tool_request；客户端展示文件名、行列数、受限预览和规范化内容指纹。受保护 POST /api/document-tool 接受批准或拒绝，批准时原子认领提议、复算指纹、生成和验收 XLSX、写入 R2 与 artifact 记录，随后保存完成状态；失败恢复为待批准。完成或拒绝响应可安全重复，跨用户不可读取或处理。原始参数不进入 workspace 列表，也不发送给另一个模型回合。
