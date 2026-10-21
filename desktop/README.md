# WillBuddy 桌面版 0.6.0

在原 Web 系统与 0.3.0 桌面基础上新增浏览器、CLI 及模型工具调用闭环。原 Web 代码、数据库迁移和 Python Office 执行器保留；桌面无需先运行 Web 服务或 Cloudflare。

## 免依赖安装（Apple 芯片）

日常使用请下载独立的 `WillBuddy-v0.6.0-mac-arm64-offline.zip`，完整解压后把 `WillBuddy.app` 拖入应用程序，或双击 `Install-WillBuddy.command` 安装到个人 Applications 文件夹。应用已内置 Electron/Chromium/Node 运行时，安装不执行 npm，也不要求开发工具。下方 npm 命令仅供源码开发。

只制作 Apple 芯片版，最低 macOS 12。包采用 ad-hoc 签名，尚无 Developer ID 或公证，未完成真机启动；系统首次运行可能需要在隐私与安全性中确认。安装脚本不会关闭 Gatekeeper 或移除隔离标记。Git/Codex/Python/Ollama 等外部工具及原 Python Office 工具链不包含在桌面主程序依赖中，使用这些外部能力仍需对应本机程序。

针对用户实测的 0.5.0 残留/签名故障，0.6.0 使用冻结清单生成 ZIP，拒绝额外文件、`.BC.*`/AppleDouble、重复/大小写冲突、破损链接和执行位变化。先在下载目录的新文件夹中完整解压，再拖动 app；不要直接向 /Applications 解压。安装脚本发现残留会停止，原生严格签名通过才替换旧版。见 [故障记录](../docs/PACKAGING_INCIDENT.md)。本机静态校验通过仍不等于 Mac 真机启动通过。

可复现打包脚本：`scripts/package-offline-mac.py`，核对固定 Electron 版本的官方 SHA-256，组装应用、嵌入 ASAR、保留 framework 链接与执行权限、签名、检查 Mach-O 哈希并生成离线清单。需要构建工具及官方缓存，仅构建端联网。`.github/workflows/willbuddy-mac-arm64.yml` 可手动在 macOS runner 构建 DMG/ZIP；本次仅提供工作流文件，未推送或运行 GitHub Actions。

## 0.6.0 任务交互

左侧用「新建任务」开始，历史任务支持筛选与当前选中；次要工具归入「更多工具」。对话输入区固定在底部，任务执行时可以先写下一条草稿，刷新执行状态不会抢走输入焦点或清空草稿。

输入 `@` 或点击「@ 资料」可选择授权目录内的文本资料；输入 `/` 可选择已有智能体，支持上下键、Enter 与 Esc。选择文件只准备附件，实际发送时主进程仍重新检查授权并读取文件。

每轮请求显示独立执行过程，可展开真实参数、stdout/stderr、退出码或浏览器回执。审批仍在原生系统确认窗口，页面不会替代原生授权。已拒绝、失败和中断会如实显示；旧数据没有 runId 的历史记录可在右侧执行记录查看，不伪造归属。

回复下的「在工作区查看」、成果中心的「查看」、本地文件的「预览」会打开右侧页签，支持 Markdown 标题、表格、列表、代码和安全转义。原始 HTML/脚本只作为文字显示。可导出原文或「继续修改」到草稿，保留已有输入；用户发送后才调用模型。只读文件预览不意味着已实现本地写入。页签按任务隔离，只在当前窗口保留。

`npm test` 为 28 项回归；`npm run test:workspace` 使用真实 Chromium 和模拟原生桥检查布局/键盘/预览/导出。构建端先安装 Playwright Chromium；产品安装端无需 Playwright。`test:browser` 可将 CHROME_PATH 指向 Chromium Headless Shell；容器测试使用 CHROME_TEST_NO_SANDBOX=1 仅影响测试浏览器，桌面产品的 sandbox:true 不变。Mac 原生、真实模型、Office/图片编辑仍未验收或实现。

## 白底蓝色主题

大背景、侧栏、内容区和弹窗统一为 logo 白底 #FFFFFF；主按钮、选中项、焦点和链接采用 logo 主蓝 #0078CB；红色仅用于少量品牌及错误/删除提示。移除原米灰底和紫色渐变。

## 启动与升级

需要 Node.js 24 LTS，首次安装联网。退出旧版应用，解压本次完整源码，在源码目录执行：

```bash
cd desktop
npm ci
npm start
```

也可在根目录执行 `bash START-DESKTOP.command`（macOS），或运行 `START-DESKTOP.cmd`（Windows）。桌面用户数据目录和加密密钥格式与 0.3.0 保持一致，新增 executions 执行记录；更新源码不要删除用户数据目录。

Mac 快捷唤起 `Command+Shift+Space`，Windows/Linux `Ctrl+Shift+Space`；应用内 `Command/Ctrl+N` 新建对话。

## 浏览器：检查、点击和填写（无需先配置模型）

左侧打开「浏览器与 CLI」：

1. 填写完整的 `https://` 或 `http://` 网址。
2. 「打开内置浏览器」创建真实 Electron 浏览器窗口，可手动浏览页面。它与工作台隔离，无工作台 preload、Node 或本地工具权限。
3. 返回工具台刷新，点击该窗口的「读取正文」，确认后读取最多 30000 字符。
4. 点击「检查元素」，确认后获得最多 120 个可操作元素。选择「填写」输入文本，或选择「点击」，核对原生确认框的真实网址和目标后执行。
5. 每次动作后重新检查页面，再读取正文确认结果；动作回执只表示输入已发送，不代表网页业务成功。
6. 「在系统浏览器打开」通过系统默认浏览器打开网址，使用原浏览器环境；助手无法读取或控制这个外部窗口。

内置浏览器使用独立的内存会话，不读取系统 Chrome/Safari 已有登录状态；退出后不保留此会话。最多 5 个窗口，网页加载最多等待 30 秒。仅支持 HTTP/HTTPS，拒绝任意自定义协议和内嵌账号密码。页面下载、设备和系统权限请求暂不支持。某些依赖弹窗、设备权限或特殊认证的站点可能需要外部浏览器。

当前可打开网页并读取正文；尚未实现 DOM 元素定位、自动点击、表单填写或复用 Chrome 登录会话。网页内容是外部资料，不是新的用户指令。

## CLI：执行真实命令

1. 在「本地文件」或工具台授权一个项目文件夹。
2. 在「浏览器与 CLI」选择工作目录。
3. 程序填 `node`，参数填 `["--version"]`，点击「审阅并执行」。
4. 在原生弹窗中核对**解析后的程序绝对路径、参数、工作目录和超时**，点击「允许这一次」。
5. 执行记录显示 stdout、stderr、退出码、耗时和真实状态；运行时可取消。

常见示例：

| 程序 | 参数（JSON 数组） | 前置条件 |
| --- | --- | --- |
| `node` | `["--version"]` | 桌面版可使用自身 Node 运行时 |
| `python3` | `["--version"]` | 本机安装 Python |
| `git` | `["status","--short"]` | 本机安装 Git，工作目录为仓库 |
| `codex` | `["exec","检查本项目的测试失败原因并给出建议"]` | 本机安装且已登录 Codex CLI |

这些第三方 CLI **没有随源码包安装**，也未在本次环境中逐个验收。程序找不到时会报错，可填绝对路径；macOS 查找额外考虑 Homebrew、`.local/bin`、npm-global、NVM、Volta。Windows 直接支持 exe/com，npm 的 cmd 包装脚本需要改为 `node` + 具体 CLI JavaScript 入口绝对路径，暂不自动转换 cmd。

参数直接以数组传给进程，不隐式拼成 shell 字符串。`|`、`>`、`&&` 不会自动作为 shell 语法执行。需要脚本时可明确选择对应解释器和脚本参数，并在确认窗审阅。当前是**非交互进程**，stdin 关闭，不提供 PTY/交互终端；首次登录、密码输入等应先在系统终端完成。

CLI 以当前系统账号权限运行，选择工作目录**不构成文件系统沙箱**。每次运行需要确认；不继承应用中的模型密钥，也不继承任意环境密钥，只传最小系统环境和 PATH。模型参数和命令输出会保存在本地执行日志中，避免在参数中写入密钥。模型发起的命令输出会返回给所选模型。

单次默认超时 120 秒，可通过模型工具参数设置 100–300000 毫秒；stdout/stderr 合计上限 1 MiB。超过上限停止进程并标记 output_limit。取消和超时尝试终止进程树，绝不伪装为成功；CLI 可以自行派生逃离进程组的后台守护程序，这不等于操作系统级容器隔离。

## 对话工具调用

配置自己的 Chat Completions 兼容 API；模型需要支持标准 `tools/tool_calls`。输入框默认开启「允许浏览器与 CLI 工具（逐次确认）」，可手动关闭。

例如：

- “打开 https://example.com 并读取正文，概括它的内容。”
- “在已授权项目目录执行 git status --short，根据真实输出说明有哪些变化。”

Agent Runtime 的流程是：模型请求工具 → 主进程校验参数 → 原生窗口确认 → 实际执行 → 将工具结果作为 tool 消息返回模型 → 继续生成答案。每轮最多 8 次模型请求、12 次工具调用。拒绝、缺少 CLI、非零退出码、取消、超时均保留实际状态；不能用模型回复代替执行结果。

命令批准期间会再次核对文件夹和程序路径。每次操作独立审批，应用重启将中断中的记录标为 interrupted，不自动重放。当前没有全自动绕过确认的后台工具权限。定时任务继续只做模型文本生成，不执行 CLI 或浏览器。

模型不支持 tools 参数时，可能返回 HTTP 400/422，可关闭工具模式做普通聊天。对话总超时仍为 120 秒，包括等待用户确认和工具执行，因此单个 CLI 的更长超时主要适用于手动工具台。

## 已保留的能力

自带 API 聊天、角色指令、会话历史、用量、取消生成、文件夹授权与预览、文本附件、手动记忆、每日模型任务、成果中心、Markdown 导出、活动记录、全局唤起。原 Web 的知识空间、连接器、应用工作室及 Office 功能仍在源码中，未合并进桌面数据层。

升级时自动寻找已有的 WillBuddy、Actwill AI、actwill-desktop 数据目录并沿用最近修改的 workspace.json，内部应用和加密身份保持兼容，不重写历史消息或自定义智能体。首次安装仍使用兼容数据目录。桌面数据保存在 Electron userData：macOS 通常为 `~/Library/Application Support/actwill-desktop/`，Windows `%APPDATA%/actwill-desktop/`，Linux `~/.config/actwill-desktop/`。正文、路径和执行记录在本地 workspace.json 中未加密；密钥默认仅主进程内存，可用系统钥匙串加密保存，不接受 basic_text 后端持久化。文件读取和手动记忆会发送到用户选择的模型服务商。

文件附件上限维持每次 5 个、每个 1 MB、每个最多 50000 字符；支持文本、Markdown、CSV、JSON 和代码。文件名扫描最多 300 结果、5000 目录项和 6 层目录；不扫描隐藏文件、依赖目录和链接。撤销授权不删除已有对话或服务商持有的内容。

每日任务需要应用运行；休眠/退出时不执行，恢复后补执行一次。macOS 关闭主窗口会隐藏，菜单“退出”才结束进程。源代码版可以启动 `local-runner/server.py` 打开 Office 任务台，需要 Python 3.10+，渲染另需 LibreOffice、Poppler、中文字体，代码隔离仍依赖 Docker；安装版不内置这些外部依赖。

## 打包与验证

```bash
cd desktop
npm test
npm run dist:mac     # 在 macOS 生成 Apple Silicon DMG
npm run dist:win     # 建议 Windows 上生成 NSIS
npm run dist:linux   # 建议 Linux 上生成 AppImage
```

输出在 `desktop/release/`。本次交付源码与 Apple 芯片离线应用 ZIP，未生成 Developer ID 签名/公证 DMG，已接入用户提供的蓝色标志与红色圆点 logo，包含侧栏、Dock、ICNS/ICO/PNG 打包图标。**未完成 Mac 真机窗口、系统浏览器、钥匙串、原生审批、快捷键及第三方 CLI 验收**。

本轮 16 项测试通过：6 核心 + 9 工具运行时 + 1 界面测试（14 条路径）。CLI 测试启动真实 Node 子进程，验证输出、退出码、取消、超时和体积上限；两轮 HTTP 模型夹具实测了工具协议到真实 CLI 再回模型的闭环。浏览器使用注入的 Electron 适配器夹具，界面为 JSDOM + 模拟桥接；它们不是 Mac 原生浏览器或真实模型测试。

源码重新打包：在根目录运行 `python3 scripts/package-desktop-source.py /absolute/path/actwill-ai-desktop-source.zip`，会更新逐文件哈希清单，排除依赖、缓存、密钥和用户运行数据。没有新的 Git 提交或线上部署。

## 运行时分层

- `main.mjs`：Electron 窗口、可信 IPC、系统确认及会话入口。
- `runtime/agent.mjs`：标准工具协议与多轮 Agent 循环。
- `runtime/tools.mjs`：审批、执行、审计和失败状态编排。
- `runtime/command.mjs`：可执行文件查找、参数数组、真实进程与取消。
- `runtime/browser.mjs`：独立浏览器窗口和网页正文读取。
- `core.mjs`：存储、文件授权、模型 HTTP 调用。
- `preload.cjs`：显式 API 白名单及不含网页权限的状态通知。

Web 与桌面核心统一、持久化队列、MCP、可操作浏览器、跨设备同步等仍需后续迭代，详见 `docs/QUICK_GAPS.md`。

## 0.5.0 DOM 工具与当时验收范围（历史）

模型可调用 browser_snapshot、browser_click、browser_fill，手动工具台与模型共用 BrowserService / ToolRuntime。模型只可使用服务返回的 snapshotId/ref，不接受任意 JavaScript 或猜测选择器。快照 5 分钟过期，导航、元素/表单变化、遮挡、失去焦点或重复凭证使操作失败；每次动作使快照失效。逐次原生审批绑定目标与参数，输入文本仅在审批框展示，审计保存长度/摘要而不保存该参数明文。

目前只支持顶层文档的普通文本、搜索、URL、电话、多行文本框及可见链接/按钮；密码、文件、邮箱类型、验证码与信用卡 autocomplete 不提供填写。iframe、Shadow DOM、截图定位、下载、持久登录、后台无人值守和自动业务验收尚未实现。点击仅在 100% 页面缩放下启用；对网页跳转或复杂动态组件应重新检查。

`npm test`：24 项 Node 测试通过，包含真实 CLI 子进程与 HTTP 模型夹具；浏览器 DOM 为 JSDOM + 注入 Electron 适配器，界面为模拟原生桥（17 条路径）。没有用夹具结果冒充 Mac 集成测试。

可复现真实 Chromium 输入测试：安装开发依赖后设置 `CHROME_PATH` 为受支持 Chrome 可执行文件，执行 `npm run test:browser`；也可使用已启动且可信本机的 `CHROME_CDP_URL`。测试使用本机 HTTP 表单与确定性模型/审批夹具，不访问真实账户。当前构建主机启动 Chrome 因 socket() Operation not permitted 失败，未通过该真实浏览器检查。Mac 原生 Electron、系统确认框、真实第三方模型/Codex CLI 仍待独立验收。
