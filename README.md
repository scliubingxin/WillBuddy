<div align="center">
  <img src="desktop/assets/icon-512.png" alt="WillBuddy 蓝红品牌标志" width="88">
  <h1>WillBuddy</h1>
  <p><strong>让 AI 从回答问题，走向完成工作。</strong></p>
  <p>文档创作 · 专属智能体 · 浏览器与本地工具 · 多任务协作</p>
  <p><a href="https://github.com/scliubingxin/WillBuddy/releases">下载安装</a> · <a href="#为什么使用-willbuddy">产品优势</a> · <a href="#快速开始">快速开始</a> · <a href="#构建你的专属智能体">构建智能体</a> · <a href="#使用文档">使用文档</a></p>
</div>

**WillBuddy 是面向 Apple 芯片 Mac 的桌面 AI 工作台。** 把你的模型、知识文档、Skills、MCP 和本地工具放在同一工作空间，让 AI 围绕目标调用工具、观察结果并继续处理，最终交付可以查看、下载和继续修改的成果。

从一份资料整理，到一份 Word 方案、一张预算表，再到网页操作和本机命令执行，工作过程与成果都在同一个任务里。

![WillBuddy 桌面工作台：对话、执行记录与成果预览](docs/images/workspace.png)

*产品界面示例，使用演示数据。*

## 为什么使用 WillBuddy

### 从对话到可交付成果

AI 回复之外，还能创建真实的 Word、Excel、PowerPoint、Markdown 和 HTML 文件。生成后在成果中心预览、定向修改、保存新版本并导出，减少反复复制粘贴与整理格式的工作。

### 把你的工作方法变成专属智能体

为不同岗位组合提示词、知识文档、Skills、工具范围和 MCP 连接器。Skills 描述工作步骤，知识文档提供依据，获批查询可复用本机索引，检索片段可在回复下展开核对，工具负责执行；智能体按需调用这些能力，结合真实返回继续处理。

### 模型由你选，工作空间留在本机

连接你自己的兼容云模型，或已准备好的本地模型服务。对话、文档和任务记录在本机管理；资料发送到哪个模型，由当前模型配置和使用操作决定。

### 安装后即可开始，多项工作并行推进

Apple 芯片离线应用包内置 Electron、Chromium、Node 和文档处理组件，无需安装 npm 或下载开发依赖。支持两项任务并发、独立草稿和停止操作，其他任务排队处理。

> 离线安装与离线推理不同：云模型和网页访问需要联网；使用本地模型需要自行准备对应服务和模型。

## 一个工作台，覆盖这些日常工作

| 你想完成的工作 | 在 WillBuddy 中如何处理 |
| --- | --- |
| 写方案、报告和说明书 | 生成 Word，在内部画布或内容编辑器中继续修改，保留版本并导出 DOCX |
| 做预算、清单和数据表 | 创建多工作表，编辑数据与支持范围内的公式，预览计算结果并导出 XLSX |
| 准备演示内容 | 生成基础 PowerPoint 内容、幻灯片文字及演讲备注，预览并导出 PPTX |
| 阅读和展示内容 | 查看 Markdown、HTML 与内置 Office 预览；在对话中展示图片、视频链接和柱状图、折线图、饼图 |
| 按固定方法处理资料 | 构建有知识文档、Skills、MCP 和工具范围的智能体，复用工作步骤 |
| 处理网页和本机工作 | 经授权打开网页、读取内容、定位点击与填写，或运行本机非交互 CLI 程序 |

![WillBuddy 成果中心：文档、预览、修改与导出](docs/images/documents.png)

*界面与文档使用演示数据；具体支持范围见对应使用文档。*

## 快速开始

### 1. 下载并安装

前往 **[安装包下载与版本说明](https://github.com/scliubingxin/WillBuddy/releases)**，选择 Apple 芯片 Mac 的离线应用 ZIP。完整解压后，将 `WillBuddy.app` 移入“应用程序”，按包内说明打开。

仅提供 arm64 Mac 应用包。系统要求、签名状态、安装注意事项和各版本变化集中在[下载指南](docs/DOWNLOADS.md)，安装前请先阅读。

### 2. 配置你自己的模型

在应用左下角打开模型设置，填写：

| 配置项 | 填写内容 |
| --- | --- |
| Base URL | 服务商提供的 Chat Completions 兼容接口地址 |
| 模型 ID | 你的服务商支持的模型名称 |
| API Key | 你自己的服务凭据；本地服务是否需要密钥以其配置为准 |

需要文档、浏览器或 CLI 执行时，开启工具模式，并选择支持标准工具调用的模型。本地兼容服务也可使用，例如已运行的 Ollama；WillBuddy 不捆绑模型权重或付费账户。

### 3. 给它一个明确目标

在新任务中描述目标、资料和交付格式，例如：

> 根据我提供的资料，制作一份 Word 项目方案，包含目标、执行步骤、风险和验收表。生成后保留可编辑文件。

需要处理本机资料时，先授权文件夹，或在成果中心导入文档。图片附件默认仅在本机查看；需要模型分析时，显式选择发送。

### 4. 查看执行过程与成果

在任务中查看工具执行记录，在右侧工作区或成果中心预览文件。通过真实文件卡片下载 DOCX、XLSX 或 PPTX；导出对话 Markdown 则用于保存聊天记录。

文件生成后，可继续提出修改要求，也可使用应用提供的内容编辑器。导入原件不直接覆盖，修改保存为新版本。

### 5. 同时处理另一项工作

第一项任务执行时，可以新建第二项任务。每项任务保留自己的草稿、状态和停止入口；需要暂停时，停止对应任务即可。

## 构建你的专属智能体

进入“智能体”，为一个具体工作场景配置能力：

1. **定义目标与提示词**：明确岗位、工作标准、输出格式和验收条件。
2. **绑定知识文档**：先在成果中心导入资料，再选择供该智能体使用的文档。
3. **上传或绑定 Skills**：在 Skills 技能库导入 `SKILL.md` 或支持的 ZIP 技能包，再在构建智能体时勾选已上传技能。
4. **配置 MCP 与工具范围**：在 MCP 连接器中保存服务地址，按需选择无认证或 Bearer Token，经批准测试工具发现，再绑定到智能体；勾选允许使用的内置工具。
5. **开始任务并检查结果**：开启工具模式，智能体按“模型选择工具 → 执行 → 观察结果 → 验收或继续”的循环处理任务。

例如，采购助手可以结合采购规则文档、报价核对 Skill 和 MCP 报价工具，先查规则，再取报价，最后说明是否符合要求。能力是否可用取决于所选模型、已绑定资料和实际服务，不能以计划文字代替执行结果。

详见[智能体能力](docs/AGENT_CAPABILITIES.md)与[Skills / MCP 使用指南](docs/SKILLS_AND_CONNECTORS.md)。

## 权限与数据，由你掌握

- 文件夹由你选择授权；需要发送资料或执行操作时，沿用相应的审批流程。
- 浏览器可显式允许当前任务、当前站点的后续操作，跨站或新任务重新确认。
- 对话、文档、历史版本和任务记录在本机保存；发送给模型的内容会到达你配置的服务，当前没有云同步。
- 任务可取消，重启后不会自动重放旧审批和外部动作。CLI 使用当前系统账号权限运行，需要对应外部程序已安装。

## 常见问题

**需要另外安装 Office、GenOffice 或 npm 吗？**  
应用内置文档处理与预览组件，使用这些内置能力无需另装上述软件。Python 和 LibreOffice 随 Apple 芯片离线包内置；Git、Codex CLI、Ollama 等可选外部工具按使用场景自行准备。

**可以全面替代 Office 吗？**  
目前适合基础文档生成、定向修改和重复操作；复杂排版、完整公式兼容、图表编辑和任意文件的保真往返仍有限。详见各项文档支持范围。

**网页和工具能完全自动执行吗？**  
需要支持工具调用的模型、可用的工具服务及对应授权。浏览器支持 DOM 读取、点击与填写；CLI 为非交互执行。Skills 不会自动获得额外权限，上传脚本不会自动执行。

## 使用文档

| 入口 | 内容 |
| --- | --- |
| [下载安装与版本说明](docs/DOWNLOADS.md) | 应用下载、安装条件、版本变化和验收范围 |
| [文档工作台](docs/OFFICE_WORKSPACE.md) | 导入、生成、内容编辑、历史版本与导出 |
| [内置 Office 预览](docs/OFFICE_PREVIEW.md) | 页面、表格、幻灯片与兼容范围 |
| [Skills 与 MCP](docs/SKILLS_AND_CONNECTORS.md) | 技能上传、资源查看、连接器配置和智能体绑定 |
| [对话富媒体](docs/CHAT_RICH_MEDIA.md) | 图片、视频、网页链接与数据图表 |
| [桌面开发指南](desktop/README.md) | 源码启动、测试与 Apple 芯片打包 |

## 开发与许可

源码开发入口为 `desktop/`，原 Web 系统与 `local-runner/` Python 执行器一并保留。开发命令见[桌面开发指南](desktop/README.md)，原 Web 说明见[原系统文档](docs/WEB_README_ORIGINAL.md)。

本项目源码公开，尚未选定独立开源许可证，包元数据为 `UNLICENSED`；公开仓库不自动授予任意再分发许可。第三方组件遵循各自许可证。

WillBuddy 为独立产品，不是 Amazon 官方产品。

## English overview

WillBuddy is a desktop AI workspace for Apple Silicon Macs. Bring your own compatible model, combine knowledge documents, Skills, MCP connectors and approved tools, and turn conversations into editable deliverables. The offline application bundles its desktop runtime and document components; model services and optional external tools are configured separately.

[Download and release notes](https://github.com/scliubingxin/WillBuddy/releases) · [Developer guide](desktop/README.md)

在对话输入框点击 **＋ → 上传文件或 ZIP**，添加Word、Excel、PPT或文本资料后输入问题；附件正文在点击发送后交给当前模型。支持范围见[附件问答用法](docs/CHAT_ATTACHMENTS.md)。

附件也可选择ZIP，自动解压支持的文档、文本和代码后问答；在“模型配置”添加多个模型，对话中可指定模型及思考强度，或按快速／均衡／极致自动选择。详见[ZIP与多模型用法](docs/ZIP_AND_MODELS.md)。

输入框的「＋」集中添加附件、图片和资料；右侧模型菜单选择档位、特定模型和思考强度，其他设置按需展开。

图片自动缩放后可在输入框核对缩略图并发给视觉模型；代码ZIP可在「＋→代码项目与运行环境」查看依赖计划，经确认准备环境和本机试运行。[使用说明](docs/IMAGES_AND_CODE_PROJECTS.md)。

代码项目的启动入口可选择30分钟开发服务，在工具台查看日志与停止；依赖准备和构建沿用普通命令。[项目服务说明](docs/PROJECT_SERVICES.md)。

Skills 技能库可从预置目录添加常用工作流；MCP页选择官方服务模板，按需填写自己的密钥，再批准测试与绑定。[预置能力用法](docs/PRESET_CAPABILITIES.md)。

源码开发预览保留Word文字/整表选区与AI定向修改；安装版LibreOffice分页预览的选区映射尚待适配，编辑可用 WillBuddy Office 窗口并直接保存新版本。详见[Office选区与原件修改](docs/OFFICE_SELECTION.md)。

含代码的Skill可经批准运行Node/Python脚本并回收真实文档成果；可从预置目录添加预算脚本。Node、Python和常用文档依赖随Apple芯片离线包内置；未列入依赖锁的模块按需准备。[Skill代码运行用法](docs/SKILL_RUNTIME.md)。

Apple 芯片离线包内置 Python 和 LibreOffice，可在本机分页查看 Office 文档，并打开 WillBuddy Office 文档窗口；修改直接保存为文档新版本，无需另装 LibreOffice。

Office 文档可双击在 WillBuddy Office 窗口打开；选区后展开 AI 侧栏进行定向修改。当前为基础嵌入式编辑，详细支持范围见[Office 使用说明](docs/WILLBUDDY_OFFICE.md)。
