## 0.28.0 ZIP与模型策略

已实现ZIP有界逐文件正文与按配置的多模型选择/真实思考参数；未验证真实供应商/Mac。RAR/7z/PDF/OCR、语义索引、OAuth/stdio、跨Web完整核心/自主子任务组与全Office保真仍差距。

## 0.27.0 对话文档附件增量

已支持本机选择的Office/文本副本经真实字节提取后直接对话问答，工具关闭可用；不等于PDF/OCR/视频理解，附件正文长文检索/逐句来源、OAuth/stdio/跨Web核心与Mac真机仍待完善。复用REA部分静态证据，无新增Amazon运行推断。

## 0.26.0 · 2026-10-25

已增加本机持久词法倒排索引、逐次批准后跨重载复用、来源更新和损坏重建、候选原文精确验证与清除控制；不是Quick跨端索引/云知识图谱、向量检索或全目录监听。继续缺OAuth/stdio、完整跨Web业务核心、自主子任务组、Mac原生/稳定签名公证/真实付费模型与Office全保真。REA复用既有部分公开包静态证据。见PERSISTENT_KNOWLEDGE_INDEX.md。

## 0.25.0 · 2026-10-25

实际增加全局MCP连接器的手动Bearer认证、系统加密适配、元数据投影及精确目标/令牌变更/错误边界；不是OAuth登录/自动刷新或所有商业MCP可用。仍缺OAuth/PKCE、安全回调、stdio、持久语义索引、跨Web完整核心、自主子任务组、Mac原生/稳定签名公证/实际账户及Office完整保真。REA复用旧公开包静态证据，无新增Amazon运行结论。见MCP_AUTHENTICATION.md。

## 0.24.0 · 2026-10-24

新增真实检索原文快照卡片与版本漂移提示，已完成来源证据的本地交互，不是全局引用图谱或逐句事实核验。仍缺认证MCP/OAuth/stdio、持久语义索引、跨Web共享核心、自主子任务组及Mac原生/公证/实际付费模型/全Office保真。REA继续复用既有公开包静态证据，无新Amazon运行结论。见KNOWLEDGE_EVIDENCE.md。

## 0.23.0 · 2026-10-24

跨智能体绑定文档的词法分块检索与有版本/哈希/行号来源已实际接入ReAct；每份需读取审批，来源变化整次失效，JSON预算完整。仍不是Quick云端知识图谱/跨端索引，也不是AgentScope向量RAG。MCP认证/OAuth/stdio、受控技能脚本、自主子任务组、跨Web共享核心、Mac原生/公证/实际付费模型/全Office保真继续未完成。见KNOWLEDGE_RETRIEVAL.md。0.22已公开合并main；0.23本轮尚未公开。

## 0.22.0 · 2026-10-24

真实技能上传/资源库、MCP全局连接管理与工具发现测试、智能体ID绑定和ReAct已接通；没有复制第三方市场目录或虚构在线状态。仍缺认证/OAuth/stdio、技能脚本受控执行/完整资源编辑与导出、语义知识索引、跨Web共享业务核心和自主子任务组；Mac/真实账户模型/公证/全Office保真待验收。参见SKILLS_AND_CONNECTORS.md。REA复用合法公开包既有静态证据，无新增Amazon原生运行或内部实现结论。

## 0.21.0 · 2026-10-24

智能体能力组合现有真实执行：提示词 + 绑定知识 + 按需Markdown技能 + 内置工具白名单 + Streamable HTTP MCP + 标准tool_calls ReAct循环；真实HTTP夹具验证四轮执行和验收。仍缺向量索引/OCR/认证MCP/stdio/完整技能包、跨Web业务核心与自主并行任务组。HTML交互预览与本机图片附件补真实用户链路，不代表所有HTML后台或所有视觉模型已工作。Mac/原生审批/公证与全Office保真待验收。AgentScope参考与边界见AGENT_CAPABILITIES.md；REA复用已有合法公开包静态证据，本轮无新Amazon原生运行结论。

## 0.20.0 接续 · 对话富媒体

已实现图片/视频直链点击加载、网页链接卡片、有限数据图表，内置离线渲染器；不是视觉模型、本地附件上传或全Office图表。真实Chromium/夹具媒体通过，Mac/真实模型/远端服务待验收。跨Web核心、MCP、自主并行组仍未完成。详见CHAT_RICH_MEDIA.md。

## 2026-10-24 · 0.19.0 Excel图片按锚点预览

0.19.0：Excel预览图片按单格/双格/绝对锚点定位，跟随对应工作表与可见网格；不再把整个工作簿图片堆在表尾。保持离线内置，无需另装软件。184核心/12真实Chromium/9打包；真实XLSX图片坐标+decode+独立openpyxl，Linux原生Electron源码/ASAR验证与旧生命周期回归。Mac/付费模型/完整Office保真未验收。见SPREADSHEET_IMAGES.md及validation/v0.19.0.json。下一轮Mac反馈与图表/主题/模板质量；MCP/跨Web核心/自主子任务组仍有差距；不建PR/合并main。

## 2026-10-23 · 0.18.0 预览不随状态刷新重建

0.18.0：同一Office文档版本的预览在后台刷新/侧栏调整时保持连接，不重新读文件/解析，保留Excel工作表选择和滚动；关闭、换文档或版本后释放重载。无需新增软件。177核心/12真实Chromium/9打包测试；Linux真实Electron源码与ASAR各三种文件20次绘制额外读取=0。Mac/付费模型/Office全保真未验收。详见PREVIEW_LIFECYCLE.md及validation/v0.18.0.json。下一轮Mac链路与图片锚点/表格分页质量；保留旧系统/身份/logo/双任务/授权，不增加依赖，不建PR/合并main。

## 2026-10-23 · 0.17.0 修复本地Office预览超时

真实Electron42/Linux复现旧file路径未握手，修复为固定两资源应用内协议，保持CSP/Node/IPC边界；新增阶段超时/手动重载，About版本跟随应用。生产HTML+preload+真实IPC+真实Office文件在源码与ASAR通过，子帧正文/ready/无原生桥验证。173核心/12 Chromium/9打包通过；Mac/付费模型/Office显示/公证未验收。详见docs/PREVIEW_TIMEOUT_FIX.md及validation/v0.17.0.json。缓存/图片定位因最新超时反馈优先处理未交付，不列完成项。下一步用户Mac验收、独立预览生命周期与图表图片质量，保留原Web/Python、身份、白蓝logo/并发/审批。

## 2026-10-23 · 0.16.0 内置 Office 预览

完成：真实二进制预览服务、隔离帧、Word页面/多表Excel/PPT静态渲染、离线依赖与许可证、移除外部GenOffice UI。详见docs/OFFICE_PREVIEW.md与validation/v0.16.0.json。保留原Web/Python/身份/logo/并发/审批。下一步：Mac原生安装/预览/审批验收，复杂图表/图片定位/字体/分页质量，预览独立生命周期。未实现全Office保真或完整GenOffice嵌入。

# 0.15.0 · 2026-10-23

新增有界Word简单正文段落增删，主进程保留其他部件，审批/指纹/版本与回滚完整。Quick官方段落/节/表格管理方向仍有差距：本次不能重排章节或增删表格行列，复杂结构与继承样式段落保护，无分页保真/修订协作。现有双任务与Excel基础七函数保留。无新增Amazon二进制运行证据，见WORD_PARAGRAPHS.md与REA_FINDINGS.md。

# 0.14.0 表格公式增量 · 2026-10-23

参考 [Quick 官方创作说明](https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html)，本轮增加七函数/跨表A1计算、编辑预览和真实XLSX缓存重算；与完整Office工作流仍有明显差距：无完整函数兼容、图表/透视表编辑、分页/任意文档保真、修订协作或自主并行子任务组。2项独立模型任务并发保持。没有新Amazon安装包/原生运行结论，复用REA既有证据。没有Mac设备时不将适配器测试当原生验证。下一轮优先Mac安装/审批/真实模型Office验收，其次结构编辑与公式/模板质量。

2026-10-22 复查官方文档 https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html ：Quick描述上传文档后编辑内容/格式/结构并预览下载。WillBuddy本轮只落实有界Word片段编辑，结构增删、完整保真/图片编辑、Excel公式与图表、PPT画布仍有差距。REA复用既有哈希/部分静态证据，没有新增Amazon二进制运行结论。

# 0.13.0 导入Word增量 · 2026-10-22

实际新增导入DOCX片段文字/粗体/斜体编辑，正文、表格文字、页眉页脚的简单段落支持；其他格式和未改ZIP部件保留并核对SHA。复杂段落只读、版本/片段指纹门禁、模型read→document_patch、原件保留与新版本真实导出。见IMPORTED_WORD_EDITING.md和validation/v0.13.0.json。新模块为WillBuddy自己的受限OOXML补丁，既有GenOffice子引擎继续保留；不是完整上游编辑器或任意Word保真往返。136核心/9真实Chromium/7打包测试通过；原生IPC/审批/模型内容夹具，无Mac或付费模型/Office显示验收。

下一轮有Mac先安装严格签名/启动/审批/实际模型Word链路；缺目标机则推进受限段落/表格结构增删及电子表格公式引擎。不要持续只加队列或说明。原Web/Python、白蓝logo、加密身份、双任务/浏览器授权保持，不PR/不合并main。

# 0.12.0 文档引擎增量 · 2026-10-22

已内嵌GenOffice HTML→DOCX子引擎，Markdown/HTML真实转Word，内部写作画布并可保存/修改新版本。仍缺任意导入DOCX的保真往返、分页/图片/修订、Excel计算与图表、PPT画布、自动并行子任务组及Mac真机验收。独立模块来源/许可/测试见GENOFFICE_ENGINE.md；不是已实现Quick全套Office能力。复用已有Quick公开文档与REA证据，本轮官方system-tools-desktop页面读取失败，未补造最新AWS文档或原生二进制结论。

# 0.11.0 文档主线更新 · 2026-10-22

已实现：真实生成文件→可信卡片→下载原格式；段落/常量单元格/Markdown和HTML原文直接编辑；可选GenOffice外部副本接续与校验收回。仍缺：内嵌Word/PPT保真布局、Excel公式计算/图表、完整结构编辑、图片/复杂模板、用户真实模型及Mac原生验收。不是只靠自然语言收据就算完成Office交付。GenOffice具体依赖/许可证/集成边界见GENOFFICE_DESKTOP.md。本轮复用既有Quick公开文档与REA证据，未新增Amazon应用原生运行结论。

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


0.28.1：修复附件按钮/模型行布局与ZIP读取上限；复用已有REA部分静态证据，无新增Amazon运行结论。Mac原生安装/审批/Keychain、真实模型、OAuth/stdio、跨Web核心、自主子任务与Office全保真仍有差距。
