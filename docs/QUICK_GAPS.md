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
