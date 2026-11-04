# 0.37.2 Office交互修复

从权威0.37.1/v42重取649源码SHA核验后恢复实现。保存按钮显示进度与版本/时间、失败明确报错可重试；Enter发送/ShiftEnter换行/IME组合不误发；移除常规技术内核文字。用户点击发送明确同意当前文档正文/选区给当前模型，文档ID/revision/SHA/sequence精确绑定，排队内容变化拒绝；AI选区修改保留逐动作审批/审计/CAS。不是全任务/全盘默认授权。合入已保存r2更新器诊断，仍未解决Mac签名故障/解压慢。

重新验证：379项核心测试、3条真实Chromium、20项打包/更新器测试通过；之前环境丢失候选的测试不复用。真实LinuxLibreOfficeKit画布手改v2、真实HTTP模型夹具选区修改v3与落盘历史、保存中/失败重试/已是当前版本确认、Enter/ShiftEnter/组合输入、普通资料原生审批0次均通过。IPC/审批/模型语义仍夹具，Mac原生运行未验收；本机LODev26.8alpha与Mac内置26.8.1.1不同。打包进行中。字体/字号/表格边框AI修改、撤销重做状态、Finder打开方式和原生LO欢迎页品牌、原生Kit中文方框仍待做，不能用PDF.js修复替代。最新私有截图仅作为需求，不入源码。下一步测试生产Office窗口保存/回车/权限/故障及真实Kit写入，再打包保存和GitHub分支PR/main/Release；Mac实际签名/安装/字体/IME仍需原生环境。

## 2026-10-27 · 0.37.0 WillBuddy Office 嵌入式编辑

从权威0.36/v39重新获取612内容文件逐SHA校验后实现。内置 LibreOfficeKit 独立进程绘制/选区/格式与文字编辑，WillBuddy自有窗口和默认折叠文档AI；手动和批准AI写入直接新版本，无退出再收回。真实原生内核而非仅外部打开按钮。上游二进制不改，自有适配器不是重编上游或完整Office编辑器。

376核心、6相关真实Chromium、10打包测试；详见validation/v0.37.0.json。Linux真实内核+本机HTTP模型夹具，IPC/审批/模型语义仍夹具，无Mac/付费模型/中文IME及完整Office兼容结论。原122Web/Python保护文件不变；旧35Python执行器未改未重跑。Python/LO及离线依赖沿0.36内置，ad-hoc未公证。

0.36已PR9合并main f4445a5bdc19466464a590432437c1e5ddca74d0并发布。本轮构建时分支/PR/main/Release待执行，最终以对应Release记录为准，继续长期授权。下一轮先Mac原生Kit启动/选区/保存与严格签名验收，再完整键盘IME、图片图表对象/样式、Excel公式与PPT编辑。后台浏览器焦点、定时历史仍待做。见docs/WILLBUDDY_OFFICE.md。

## 0.33.0接续

2026-10-26复查官方 https://docs.aws.amazon.com/quick/latest/userguide/working-with-chat-desktop.html 的Session tabs选择附加能力；不将其解释为任意Office全保真。继续复用已有REA部分静态证据，无新Amazon运行结论。

## 2026-10-26 接续边界

本轮复用已有公开包的部分静态REA证据，没有新增Amazon运行结论。对齐参考复查 https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 与 https://docs.aws.amazon.com/quick/latest/userguide/desktop-security.html ；进程行为参考 https://nodejs.org/api/child_process.html 。WillBuddy新增受控项目服务，不等同Quick全部系统能力或OS隔离。

## 0.29.0 · 输入区层级

根据用户提供的Quick/WorkBuddy截图，实际收敛常驻控件并保留菜单内的真实功能与授权。仅UX参考，不复制代码/资产；复用旧REA静态证据，无新第三方原生运行结论。Mac/真实模型、跨Web核心、自主子任务、OAuth/stdio与全Office保真继续待完成。

0.28.0接续（2026-10-25）：ZIP与多模型策略为WillBuddy独立实现；模型参数按OpenAI/DeepSeek/Qwen公开文档检查，无Amazon内部路由推断。继续复用既有REA部分静态证据，未重新下载/运行Amazon包。

0.27.0接续（2026-10-25）：复查官方what-is-desktop公开本机文件授权/对话能力，WillBuddy独立补直接文件选择问答，不推断Amazon内部附件实现；继续复用已有REA部分静态证据，无新Amazon安装/运行结论。

0.26.0接续（2026-10-25）：复查Quick官方what-is-desktop公开文件索引/知识/MCP能力；WillBuddy独立新增私有持久词法倒排索引，未推断Amazon内部算法/存储方式。REA继续复用6.7.0公开包部分静态证据，本轮无新Quick下载/运行/完整静态分析结论。

0.25.0接续（2026-10-25）：复查Quick桌面公开MCP/本机连接配置说明，并核对MCP2025-06-18 Authorization及Electron safeStorage官方文档。WillBuddy独立实现手动Bearer传递与秘密适配，不称OAuth全规范客户端，不推断Amazon认证内部实现。REA复用6.7.0公开包部分静态证据，本轮未重新下载或运行Quick。

0.24.0接续（2026-10-24）：复查Quick官方what-is-desktop公开知识/文件/权限能力说明，WillBuddy独立新增检索快照交互，不推断Amazon内部引用实现。REA继续复用6.7.0公开包部分静态证据；本轮未重新下载或运行Quick。

0.23.0接续（2026-10-24）：复查官方 https://docs.aws.amazon.com/quick/latest/userguide/what-is-desktop.html 对选定目录搜索/索引与智能体知识、技能/MCP的能力说明。WillBuddy独立实现受原审批控制的跨绑定文档词法分块检索，不推断Amazon内部算法；REA继续复用下方6.7.0公开包根哈希及部分静态证据，本轮未重新运行Quick/未新增原生结论，未复制Amazon代码资产。另复查用户指定AgentScope公开主页 https://github.com/agentscope-ai/agentscope ，本轮没有引入其SDK或Python安装端依赖。

0.9.0 接续（2026-10-22）：复查官方system-tools-desktop公开任务管理/进度及权限描述；复用原REA证据，不重跑不完整静态分析、不新增Amazon队列内部结论。WillBuddy共享模型调度是独立实现，见 SHARED_RUNS.md。

0.8.0 接续（2026-10-21）：复查官方桌面界面/系统工具文档，用于功能差距映射；继续复用已有REA根哈希与部分静态证据，本轮未重新下载/运行Amazon包，不推断其队列或内部架构。WillBuddy独立实现CLI持久队列，见 DURABLE_COMMANDS.md。

0.7.0 接续（2026-10-21）：本轮修复 WillBuddy 自身流式与内容渲染，复用已有 Quick/REA 静态证据；没有对 Amazon 二进制做新增运行推断。

# Amazon Quick 参考分析与本次实现

0.6.0 接续（2026-10-21）：本轮依据用户静态截图观察任务/执行过程/Session tabs 的内容组织，映射见 SCREENSHOT_ALIGNMENT.md；复用下述 REA 证据，没有新增对官方二进制运行的结论。WillBuddy 自身已通过 Chromium Headless Shell/CDP 的 DOM 和可信输入测试，但它不证明 Amazon Quick 的实现，也不等于 WillBuddy 的 Mac 原生验收。

检查日期：2026-10-20。REA：`rea-agents@6.7.0`，来源为用户指定的 https://github.com/morluto/rea 。采用其 CLI 和附带 reverse-engineer-anything 工作流，不更改用户的全局 MCP 配置。

## 分析对象与证据

官方包地址：https://desktop.downloads.quick.aws.com/mac/arm64/Amazon-Quick.dmg

- DMG 大小：655477089 字节。
- DMG SHA-256：`b6afd69dc3cea3ad0cf367c7f7ff0ba53cceda21bf1ea3c8fd9bf02f48044d9c`。
- REA `inspect-artifact` Evidence：`ev_de663a0e6a5d1385654b23b855e39a32926166facbc63b3fefadc7e7327792f3`。
- 原始检查记录：`rea/quick-dmg-evidence.json`。
- DMG 是 LZFSE 压缩的 APFS 容器；REA 在 Linux 下只能核对 DMG 根哈希，不能通过 macOS 原生适配器展开。另用 7-Zip 25.01 读取目录并选择性提取 Info.plist、主程序和 app.asar，未运行官方程序。
- Info.plist：`com.amazon.QuickWork.mac`，版本 `1.1.3905`，最低 macOS `12.0`。这些是格式解析所得，不是运行观察。
- ASAR 大小：94472893 字节，SHA-256：`43b3ad45cea7e0a587a2699ae4de1fe91e2d3e0cb6ab1b4dee295d2f9ad96dc4`。
- ASAR package.json 的 main 是 `dist/main/index.js`，且存在 `dist/main/preload.js`，支持其 Electron 分层结构判断。

执行命令（安装路径可用固定版本 npx 代替）：

```bash
npx -y rea-agents@6.7.0 inspect-artifact /absolute/path/Amazon-Quick.dmg --json
npx -y rea-agents@6.7.0 analyze-javascript-application /absolute/path/app.asar \
  --source-path dist/main/preload.js \
  --analysis-timeout-ms 60000 \
  --max-semantic-nodes 1500 \
  --max-semantic-nodes-per-file 1500 --json
```

第二条返回部分证据后失败：REA 需要 procps 进程归属检查，而本机 `ps -axo ...` 返回 `fatal library error, lookup self`。没有替换或伪造该检查，也未将部分结果冒充成功解析。部分 Evidence ID 为 `ev_16138c78942f22ed60c3c690661eaf79d964586fba31fce0117c4b31afba8d05`，摘要见 `rea/quick-preload-summary.json`。未解析其余 3839 个文件，不推断其业务实现、权限模型或云端算法。

提取的 preload 文本另用普通静态搜索确认出现 contextBridge、exposeInMainWorld 与 ipcRenderer，支持“显式桥接主进程与页面”的设计参考。这不证明 Quick 每个 IPC 的运行行为或安全性。本次不分发 Amazon 的 ASAR、二进制、源码片段、图标或其他产品资产。

## 官方功能文档

- https://docs.aws.amazon.com/quick/latest/userguide/what-is-desktop.html
- https://docs.aws.amazon.com/quick/latest/userguide/desktop-interface.html
- https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html

官方描述了：左侧导航、时间问候与聊天输入框、连接卡片、简报、最近对话、任务中心、本地文件授权，以及本地工具与云账户协作。官网是功能依据，不等于本次实际登录观察。`quick.aws.com/sn` 未提供可直接分析的公开页面正文，未绕过登录或访问用户的 Amazon 账户。

## 映射与实现状态

| 参考能力 | 本次实现 | 边界 |
| --- | --- | --- |
| 首页与聊天入口 | 原创 Actwill 首页、时间问候、快捷任务、模型与文件连接卡片 | 参考结构，不是像素复刻 |
| 原生桌面接入 | Electron 窗口、全局唤起、文件选择与保存、通知 | 目标机系统集成待验收 |
| 本地知识 | 授权文件夹、文件名检索、预览、附加、撤销 | 文本与代码，不是全量语义索引 |
| 对话与智能体 | 自带兼容模型 API、角色指令、历史、取消、导出 | 无 Amazon 账户或模型依赖 |
| 个人上下文 | 手动记忆增删、上下文注入 | 无自动个人知识图谱 |
| 任务与简报 | 本机模型任务、每日调度、结果归档、活动记录 | 应用需运行，无邮件/日历数据源 |
| 成果中心 | Markdown 成果、保存对话框、搜索名称 | 原 Web Office 功能继续保留 |
| 本地执行 | 源码版启动原 Python 执行器 | 需外部 Python/Office/Docker 依赖 |
| 浏览器执行、MCP、OAuth | 原 Web 连接器保留，桌面端未新增这些能力 | 未宣称完成 Quick 全功能 |

## 代码修改

新增 `desktop/`（主进程、preload、核心逻辑、界面、测试、独立锁文件），以及 macOS/Windows 启动入口。根 package.json 加入桌面启动、安装及测试命令；README 增加桌面入口；原 Web 核心代码不变。桌面端与原 Web 存储互相独立。

## 验证

- `cd desktop && npm ci`：依赖安装通过，Electron 包版本 42.0.0。
- `cd desktop && npm test`：7 项测试通过（6 核心 + 1 界面，界面覆盖 11 条交互路径）。
- 核心测试：存储重新载入、路径越界与链接拒绝、撤销授权、文件类型与体积上限、模型 URL 约束、真实本地 HTTP 夹具请求及错误、每日日期计算。
- 界面测试：JSDOM + 模拟桥接，验证配置、授权目录、附件引用、对话、模型文本转义、成果保存、角色、记忆、任务、导航和搜索。
- `python tests/local-runner-test.py`：35 项原有回归测试通过。
- JavaScript 语法检查通过。
- Electron 标准启动受本机套接字权限限制阻断；未通过 macOS ARM 原生启动、钥匙串、系统弹窗、快捷键、真实通知或 DMG 安装验收。
- 未使用用户 API Key，未调用付费模型，未测试原 Web 全套构建或线上部署；交付不是已发布版本。

完整启动、数据位置、调度与打包说明见 `desktop/README.md`。

## 0.5.0 接续边界（2026-10-20）

沿用已有 REA 6.7.0、官方 DMG 摘要和部分静态分析记录，没有重新声称完整 ASAR 或原生运行分析。新增实现独立依据官方公开能力文档 https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 与 Electron webContents 的隔离世界、输入 API https://www.electronjs.org/docs/latest/api/web-contents 。本轮未复制 Amazon 代码或资产。Chrome 启动被本构建主机 socket 权限阻断，JSDOM 成功不能转述为真实浏览器或 Mac 成功。


0.28.1：修复附件按钮/模型行布局与ZIP读取上限；复用已有REA部分静态证据，无新增Amazon运行结论。Mac原生安装/审批/Keychain、真实模型、OAuth/stdio、跨Web核心、自主子任务与Office全保真仍有差距。
