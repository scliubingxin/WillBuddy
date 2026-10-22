# 0.10.1 授权体验更新 · 2026-10-22

按用户截图修复document_create长JSON原生sheet超出屏幕、取消信号未传入dialog导致队列等待的问题。文档确认用摘要；浏览器可显式选择本任务/本站点授权，不逐步弹窗，新站点/新任务重新确认；撤销、任务结束和退出清理许可。增加60秒超时、菜单⌘⇧Esc紧急取消、拒绝无父窗口/过长消息及迟到允许，导航前后校验防止站点授权泄漏。完整边界见docs/APPROVAL_FIX.md（从docs阅读为APPROVAL_FIX.md）。

105项核心、6项真实Chromium回归；原生弹窗为适配器夹具，Mac真机/严格签名/启动仍未验收。继续保留0.10.0文档、双任务能力及原Web/Python/白蓝logo/加密身份。下一步优先用户Mac弹窗/浏览器/文档链路验证，继而Office保真预览和结构编辑；不回退纯壳、不创建PR/合并main。

# 0.10.0 更新 · 2026-10-22

本轮按用户最新要求将桌面 Office 文档与多任务体验列为主线，交付真正的 DOCX/XLSX/PPTX 编解码、md/html 原文编辑、原件导入、模型 create/read/edit 工具、逐次原生审批、版本冲突保护、5个历史版本与导出回读核验。文档内容在本地保存，模型读取需批准。Office 仅提取文本预览；不是保真页面编辑器。

修复了前端全局 pending 禁止新建/切换任务的实际阻塞。可以同时发起两项模型对话，第三项排队，切换任务保留草稿和工作区，单独停止不影响另一项。现有容量2与CLI共享，CLI依然独立FIFO。没有实现模型自动拆解并行子任务组、后台进程跨重启续跑或关闭应用继续运行。

2026-10-22 复查官方公开文档：Quick 支持会话生成/编辑 Word、Excel、PowerPoint、PDF 与预览下载，也描述有进度的并行后台子任务。来源：
- https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html
- https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html

差距：复杂版式/品牌模板、图片图表、Excel公式计算/透视/条件格式、修订批注、PDF导出、Office原生/兼容引擎保真渲染和真实模型/Apple芯片验收。宏、嵌入对象、外部关系链接拒绝导入；含公式工作簿不允许更新，以免留下过期缓存。Web/Python原有更深入的文档能力仍保留，桌面尚未共用该完整业务核心。

下一轮优先扩展保真预览与有边界的文档结构修改/公式计算，而不是持续只加队列界面；有Mac环境先补签名/启动/原生审批和Office工具链。REA复用已有静态证据，没有新增Quick原生运行结论。

# 0.9.0 更新 · 2026-10-22

对话与每日任务共享持久队列、取消、状态事件、定时发生去重；CLI仍独立FIFO并共用2个执行名额，不是三者统一或原Web Runtime统一。真实Chromium→服务→HTTP模型夹具验收了排队/刷新/停止；真实模型与Mac原生仍缺。下一步重点桌面MCP、授权文件写入/索引、Office真实成果，以及跨队列公平与统一事件，避免只扩展界面。

复查官方系统工具文档的Task management/进度与工具权限描述，继续保留逐次审批；不推断Quick内部调度实现。来源：https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 。REA复用已有证据，未运行官方应用。

# 0.8.0 更新 · 2026-10-21

手动CLI已接通持久队列、共享并发名额、受理ID去重、刷新后停止、输出检查点、重启暂停/中断和明确重新审批重试。状态事件具备v1契约与每任务单调序号，但还不是跨端事件总线；模型轮次/每日任务未接入该队列，不声称完成全部持久Agent Runtime。新增真实Chromium→服务→Node验收，原生审批仍夹具。

当日复查官方system-tools-desktop及desktop-interface文档：Quick描述后台子任务/进度和Mission Control，WillBuddy当前只实现上述受限CLI队列；仍缺跨端业务核心、本地MCP、文件写入/索引、Office真实成果、OAuth与原生Mac验收。逐次审批保持，不跟随Quick默认Always Allow权限。来源：https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 、https://docs.aws.amazon.com/quick/latest/userguide/desktop-interface.html 。REA已有静态证据复用，没有新增Amazon运行结论。

0.7.0 输出体验：SSE 首段提前可见、增量事件和取消保留、完整 GFM 与静态 CSS HTML 预览通过真实浏览器验收；真实模型/Mac、交互 HTML、Office/队列/MCP 仍存在差距。

0.6.1 架构进展：无 Electron 的 conversation/tasks/workspace/recovery 服务已拆出，IPC/审批为独立适配器，Markdown/任务视图为纯函数。Web/桌面尚未统一业务核心；持久队列/MCP/Office/原生签名仍待完成。详见 ARCHITECTURE.md。

# Quick 对齐状态 · 桌面 0.6.0

本表用于下一轮接续，不能把测试夹具通过当作 Mac 真机验收。

| 能力 | 当前实现 | 主要差距 / 下一步 |
| --- | --- | --- |
| 任务与成果交互 | 任务筛选、逐轮真实执行过程、右侧文本成果多页签、Markdown、导出/继续修改、@ 资料、/ 智能体 | Mac 原生/真实模型端到端；Office/图片成果；持久页签/草稿与多任务交互 |
| 模型工具执行 | 标准 tools/tool_calls、多轮循环、逐次审批、真实工具结果回传 | 工具 schema 更细粒度校验、流式事件、统一 Web Runtime |
| 浏览器 | 内置隔离窗口、正文、快照引用定位/点击/填写；Headless Shell/CDP 隔离世界和可信输入测试通过 | 原生 Electron/Mac 尚未验收；iframe、Shadow DOM、截图、业务验收、持久登录 |
| CLI | 程序查找、argv、授权 cwd、真实 stdout/stderr/exitCode、取消/超时/输出上限 | Mac 实机及 Codex 等第三方 CLI；Windows cmd 适配；PTY/交互终端 |
| 权限与审计 | 可信本地页面 IPC、原生逐次确认、解析路径预览、二次核验、执行日志 | 浏览器单次目标凭证已实现；持久化审批、OS 隔离与更细工具策略 |
| 调度 | 应用运行时的每日模型文本任务，重启中断不自动重放 | 持久化任务队列、幂等、恢复与带审批的工具任务 |
| 文件/知识 | 授权目录、文本预览和附件、受限文件名搜索 | 写入工具、有证据索引、全文/语义检索、OCR、文件夹监控 |
| 记忆/智能体 | 手动偏好、自定义角色 | 结构化上下文、技能发现与版本化 |
| Office | 原 Web 和 Python 执行器保留 | 与桌面工具闭环及成果验收统一 |
| MCP/连接器 | 原 Web MCP/REST 保留 | 桌面本地 MCP、工具注册与 OAuth |
| 产品分层 | 已分离 Agent、ToolRuntime、Command、Browser 模块 | Web/桌面业务服务与数据模型仍未统一 |
| 交付 | 完整源码 ZIP、逐文件 SHA-256、arm64 离线应用、原 logo | Developer ID、公证及安装包真机验证 |

第一优先级：把本轮浏览器/CLI 功能在 Mac 真机打开、执行与失败恢复路径验收；推进持久化执行/中断恢复与更完整的浏览器交互，不以增加卡片数量替代功能。

实现参考 API：
- https://www.electronjs.org/docs/latest/api/browser-window
- https://www.electronjs.org/docs/latest/api/shell
- https://nodejs.org/api/child_process.html

REA 静态分析事实及限制仍见 REA_FINDINGS.md（0.3.0 基线记录），本轮没有重新声称解析官方完整应用或复制其实现。

2026-10-20 对照官方系统工具文档：Quick 的 Browser Automation 包括导航、交互、表单、截图和提取。当前仅覆盖顶层 DOM 子集，不能据此推断同等兼容性。官方来源：https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 。本轮复用 REA 基线证据，未取得新的原生执行结论。
