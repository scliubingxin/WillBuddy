# WillBuddy 桌面开发与安装指南

产品介绍与日常用法见[首页](../README.md)。安装包、版本变化、签名状态和测试范围统一见[下载与版本说明](../docs/DOWNLOADS.md)及 [GitHub Releases](https://github.com/scliubingxin/WillBuddy/releases)。

## 直接使用应用

日常使用选择 Apple 芯片离线应用 ZIP，完整解压后按包内说明安装。应用内置 Electron、Chromium、Node 与文档组件，安装端不执行 npm 安装。云模型、本地推理服务和可选外部 CLI 的准备要求见首页。

本指南以下命令面向源码开发者。

## 源码启动

使用锁文件对应的 Node / npm 环境，进入完整源码目录：

```bash
cd muyun-ai
npm --prefix desktop ci
npm --prefix desktop start
```

桌面入口为 `desktop/main.mjs`，不要求先启动原 Web 服务。模型 Base URL、模型 ID 和密钥在应用中配置；不要把真实凭据写进源码、截图或提交记录。

## 目录与职责

| 目录 | 职责 |
| --- | --- |
| `main.mjs` / `main/` | Electron 组装、原生 IPC、对话框、审批与系统适配 |
| `preload.cjs` | 显式的主进程与渲染进程桥接 |
| `services/` | 对话、文档、任务、能力库与智能体会话服务 |
| `runtime/` | 模型流、Agent 循环、浏览器/CLI/MCP、文档与技能编解码 |
| `src/` | 页面控制器、视图、主题和隔离预览 |
| `assets/` | 原蓝红 logo、应用图标与相关品牌资产 |
| `tests/` | 核心、权限故障边界、浏览器验收及原生检查 |
| `../local-runner/` | 保留的原 Python 本地执行器 |
| `../app/` / `../lib/` | 保留的原 Web 系统；尚未与桌面共用完整业务核心 |

架构分层详见 [ARCHITECTURE](../docs/ARCHITECTURE.md)。

## 开发验证

```bash
npm --prefix desktop test
python3 -m unittest discover -s scripts/tests -v
```

Office 独立解析验证使用开发依赖，最终用户不需要安装：

```bash
python3 -m pip install -r scripts/requirements-office-tests.txt
```

真实 Chromium 验收需要开发机提供 Chrome / Chromium，并用 `CHROME_PATH` 指向可执行文件，例如：

```bash
CHROME_PATH=/absolute/path/to/chrome npm --prefix desktop run test:workspace
CHROME_PATH=/absolute/path/to/chrome npm --prefix desktop run test:agents-ui
CHROME_PATH=/absolute/path/to/chrome npm --prefix desktop run test:capabilities-ui
```

部分独立表格验证还需要开发机上的 LibreOffice `soffice`。容器专用测试选项不应写入产品启动参数。夹具、真实 HTTP、Chromium、Linux Electron 和 Mac 原生结果应分别记录，不能互相替代；实际计数和未验收项见各版本下载说明与 `docs/validation/`。

## Apple 芯片打包

在具备对应构建条件的 Mac 环境中：

```bash
npm --prefix desktop run dist:mac
```

只生成 arm64 Mac 交付物。离线组装脚本为 `../scripts/package-offline-mac.py`，以 `--runtime`、`--checksums`、`--work-dir`、`--output` 和 `--signing-tool` 指定经官方 SHA-256 核对的固定 Electron 运行时、新的暂存目录、输出文件和签名工具。

打包须保留 framework 符号链接与执行位，并检查 ASAR 内容、封闭 ZIP 清单、残留文件和 Mach-O 代码页。`../scripts/verify-macho-pages.py` 的静态哈希校验不等于 macOS `codesign`、资源封印、Gatekeeper 或公证验收。Mac CI 定义见 `../.github/workflows/willbuddy-mac-arm64.yml`，仅有工作流文件不代表已运行成功。

完整源码 ZIP 使用：

```bash
python3 scripts/package-desktop-source.py /absolute/output/WillBuddy-source.zip
```

命令在仓库根目录执行，自动排除依赖、缓存、私钥和运行数据，生成逐文件 SHA-256 清单。验证完成后再分发；不要在签名后修改应用内容或重算清单掩盖变更。

## 兼容身份与安全边界

- 产品名称为 WillBuddy；内部 `com.actwill.desktop`、IPC 和旧加密身份为历史数据兼容保留，不作盲目全量替换。
- 保持白底 `#FFFFFF`、主蓝 `#0078CB` 和原蓝红 logo。
- 文件授权、原生审批、取消、版本冲突保护和审计不可因界面调整而绕过。
- 主页面和隔离预览保持原 CSP、sandbox 与无 Node/原生桥边界。HTML 交互、Office 和媒体预览有不同受限策略，详见各自文档。
- 浏览器授权限定当前任务与准确站点；CLI 以系统账号权限运行，工作目录不是操作系统沙箱。
- 用户数据在本机保存，发送到模型的资料仍会离开设备；当前不提供跨端云同步。
- 不关闭 Gatekeeper、不移除隔离标记，不将未公证候选包称作正式签名版本。

## 进一步阅读

[下载与版本说明](../docs/DOWNLOADS.md) · [Skills / MCP](../docs/SKILLS_AND_CONNECTORS.md) · [智能体](../docs/AGENT_CAPABILITIES.md) · [Office](../docs/OFFICE_PREVIEW.md) · [HTML 交互预览](../docs/HTML_INTERACTIVE_PREVIEW.md) · [对话富媒体](../docs/CHAT_RICH_MEDIA.md) · [原 Web 文档](../docs/WEB_README_ORIGINAL.md)
