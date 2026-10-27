## WillBuddy Office 0.37.0

完整Apple芯片离线包包含Python和LibreOffice。新“WillBuddy Office 编辑”窗口提供真实内核页面、选区、基础文字/格式和折叠AI侧栏，修改直接保存新版本，无需单独安装或退出后收回。基础编辑阶段，键盘IME/复杂对象和Mac原生运行仍待验收；不是完整Office替代。ad-hoc未公证。完整边界见[WILLBUDDY_OFFICE.md](WILLBUDDY_OFFICE.md)。0.36已PR9合并发布；本版最终发布状态见对应Release，旧附件不修改。

## 内置 Office 和 Python：0.36.0

Apple芯片完整离线包约480MB，包含Python3.12.16、LibreOffice26.8.1.1和20个Python依赖；安装端无需npm/pip或单独LibreOffice。默认分页PDF，编辑使用内置独立原生窗口，保存退出后收回新版本。不是同面板编辑器，PDF选区未映射结构修改。应用ad-hoc未公证，未Mac/Gatekeeper验收。详见[NATIVE_OFFICE_AND_PYTHON.md](NATIVE_OFFICE_AND_PYTHON.md)。0.35已PR8发布，本版最终状态见对应Release。

# 2026-10-27 · 0.35.0 Skill实际代码运行

从权威0.34/v37重新获取并核验584内容文件。执行环境重置丢失早期未保存候选后，全部从正式基线恢复重做，不沿用旧测试结论。

新增 runtime/skill-runtime.mjs、services/skill-execution.mjs；绑定资源私有物化、SHA复验、真实Node/Python进程、逐次审批/取消/限额、持久运行记录与受控成果导入。新增第13项独立预算脚本预置，原12项与8MCP保留。CLI --json有界解析独立于退出状态；共享文档服务锁和提交后守卫回滚避免跨实例覆盖。

恢复后的356核心、5真实Chromium、10打包测试通过；实际Node/Python与本机HTTP模型夹具→预算XLSX→openpyxl及生产预览验证。IPC/审批/模型语义仍夹具，无Mac/付费模型/Keychain原生结论。125生产文件与最终ASAR逐字节一致、122原Web/Python保护文件不变；旧35Python执行器测试未改未重跑。ad-hoc未公证，不宣称Gatekeeper通过。

0.34已PR#7合并main292207f4f6e051fdf21c908a0ce2c983f3b4aef3并发布，旧进行中状态已过时。本版构建时GitHub发布待执行，最终状态以Release为准，不修改既有附件。

下一轮：Mac原生脚本/审批/安装验收；Python离线依赖与SDK适配、CLI后端依赖预检；Office选区原格式修改仍是主线。不是全Python SDK/OS沙箱/全部CLI-Anything后端集成。详见docs/SKILL_RUNTIME.md。

# 2026-10-26 · 0.34.0 标注问题修复


- 智能体仅勾选已上传技能；对话执行前通过真实 skill_read 载入已绑定技能并记录审计，重复读取复用同次会话结果。原有手工技能兼容保存。
- MCP 空白必填项不再阻止关闭，保存仍校验；统一认证选择框、预置目录筛选、文档卡片与主按钮可读性。
- 同次任务真实成功的文档修改收据可推进附件版本，外部修改或移除仍中止；修正重复扩展名展示。
- Excel 无图片的形状绘图不再强求图片关系部件；缺失图片关系时明确警告并显示单元格，不伪造图片、不改原件。其他安全和限额仍拒绝。
- JSON/SSE 长度中断保留收到的文字，默认旧配置输出预算8192；显式模型预算保持。仅无未完成工具调用的部分文字提供手动继续，作为新请求关闭工具，绝不自动重放操作。旧版部分文字错误也可恢复。


详情与验收边界：[标注问题修复](docs/FEEDBACK_FIXES.md)。下一步继续Office选区与AI修改、Mac原生验收。发布字段为构建时快照，最终结果见Release。

# 0.33.0 · Word选区与原件修改

单段文字/整表附加聊天、源坐标与范围校验、AI补丁和直接文字替换；Excel原件文字补丁；默认32/最高96轮；消息留白。验证343核心、7相关Chromium、10打包；Mac/付费模型/Office像素保真未验收，ad-hoc未公证。详见[选区使用与范围](OFFICE_SELECTION.md)。源码和arm64将在本轮保存与公开发布，完成状态以对应Release为准。

## 0.32.0 · 预置Skills/MCP

技能库预置12项可添加技能，MCP页预置8个官方模板；需要凭据的连接提供空白安全填写入口，保存不联网，测试真实发现后再绑定。详见[预置库](PRESET_CAPABILITIES.md)。338核心/8相关Chromium/10打包通过；公网Learn/DeepWiki发现通过，付费服务与Mac待验收。arm64离线应用ad-hoc未公证，主程序无需npm安装。0.31已合并main发布，0.32构建时待常规发布，最终以GitHub Release为准。

## 0.31.0 · 项目开发服务

新增明确批准的30分钟开发服务、尾部日志/停止/预计到期和失败诊断；普通安装构建命令保留原边界。完整范围见[开发服务](PROJECT_SERVICES.md)。330核心/9相关Chromium/10打包通过；arm64离线包内置主程序运行时，可选项目开发工具仍需本机准备。ad-hoc未公证，Mac原生安装/审批/运行未验收。当前包为发布前快照，最终发布结果见对应GitHub Release。0.30已合并main并公开发布，旧的“待发布”记录仅表示其构建时点。

## 2026-10-26 · 0.30.0 图片可用性与代码项目运行

从权威0.29.0/v32重新取回并核验540内容文件。前次未保存的0.30工作区在环境清理后丢失，本轮重新实现并重测，不复用丢失候选测试结果。0.29已通过PR #2合并main aea62a8c03939500dfa03173f87cfc3f32a702c7并公开v0.29.0-preview，旧未合并说明仅是历史记录。用户持续授权每轮验证后版本分支→PR→main→源码/arm64 Release，保留并发保护，不用GitHub插件/聊天密码。

图片：PNG/JPEG输入32MiB、64百万像素、32768边；在主进程nativeImage解码后按比例完整缩放，4096边/16百万像素、PNG4MiB以内，按字节预算最多12次缩放，不裁剪。原件不改，元数据经PNG重编码。持久100张/128MiB，单轮8张；普通state无像素。输入框真实本机Blob缩略图，移除/切任务释放；仅勾选本轮视觉发送才发image_url，无文字时自动提问；失败恢复文字/图片供手动重试，不自动重发或换模型。不是HEIC/WebP/GIF、EXIF方向全兼容或真实视觉语义验收。修复主按钮蓝底文字对比。

代码：复用ZIP路径/CRC/规范化/类型/体积预检，独立完整项目文件与二进制资源复制到私有host目录，不依赖32份问答摘要。识别唯一package.json或Python根；拒绝多个根/node_modules/.git/.venv。npm优先ci（有lock）或install，均ignore-scripts；实际dev/start/build/test脚本按用户选择运行。Python显式venv→requirements→main.py/app.py/server.py。导入不执行不联网；＋代码项目入口显示文件清单/实际命令/包内脚本。授权目录与每命令原生批准，复用持久CLI队列/审计/停止/重启不重放；受理前及批准后再核验源码SHA/路径链接。源码改变须重新导入。新增schema1 codeProjects元数据/私有目录；不改旧身份/数据/原Web/Python。无新生产依赖。

运行不是OS沙箱，也不是任意项目自动云部署。npm/完整Node工具链和Python为可选本机外部工具，未捆绑安装器；缺失明确报错。每命令最长5分钟/输出1MiB，未提供长驻进程守护、端口代理、容器、Docker、系统包、密钥环境编辑、monorepo选择或pnpm/yarn/Poetry。10项目，ZIP32MiB/2000条目/单文件4MiB/展开16MiB；无项目删除UI，私有副本由本机保留。已有问答仍32正文/10万字符，不声称模型已理解全部项目。安装ignore-scripts不是安全隔离，显式启动脚本和Python构建仍可执行代码。

319核心（新增9）、7真实Chromium、10打包测试通过。新增实际npm无依赖安装/Node执行、Python真实venv/pip空依赖/入口、源码变更/链接/磁盘失败/拒绝/取消。生产UI→真实ZIP/service→npm→Node HTTP服务→实际health响应→日志/停止/刷新；原生选择器/IPC/审批为夹具。实际600万像素PNG浏览器解码/缩略图/文本+图片HTTP载荷/无文字图片提问/HTTP失败草稿恢复通过；nativeImage缩放是注入适配器测试，不是Mac原生运行。完整旧ZIP/多模型/SSE/工作区回归通过。新UI项目首测发现受理后未刷新state，已真实修复；图片仅调整完整提示词前缀断言。

111生产文件与最终ASAR逐字节相同；官方Electron42arm64 SHASUM、282应用+5配套/14链接/15MachO/51216页/零残留/篡改负例/CRC与installer语法通过。122原Web/Python保护文件SHA不变；旧35Python执行器未改未重跑。ad-hoc未公证，无Mac严格资源密封/Gatekeeper/安装启动/Keychain或真实付费模型验收，不去隔离或关保护。REA复用已有部分静态证据，复查官方Quick桌面文档与Electron nativeImage，未新增Amazon运行结论。

下一轮：Mac先图片原生解码/ZIP项目实际依赖与启动/严格签名安装；缺机器继续项目长驻服务管理/受控环境与失败诊断、代码来源问答，再PDF/Office兼容。跨Web完整核心/OAuth/stdio/自主子任务组仍差距。详见docs/IMAGES_AND_CODE_PROJECTS.md、validation/v0.30.0.json/-tests.txt。本包构建时0.30 GitHub发布待执行，以最终Release为准，不修改已发旧版附件。

# WillBuddy 下载与版本说明

[返回产品介绍](../README.md) · [打开 GitHub 安装包下载页面](https://github.com/scliubingxin/WillBuddy/releases)

这里集中提供安装入口、系统条件、版本变化和验收边界。产品介绍与使用步骤见首页，逐轮开发记录另见 [ITERATION_LOG](../ITERATION_LOG.md)。

当前请以[GitHub Releases](https://github.com/scliubingxin/WillBuddy/releases)置顶版本附件为准；下表0.22固定链接作为历史下载保留。

## 下载安装

| 文件 | 用途 |
| --- | --- |
| [Apple 芯片 Mac 离线应用 ZIP](https://github.com/scliubingxin/WillBuddy/releases/download/v0.22.0-preview/WillBuddy-v0.22.0-mac-arm64-offline.zip) | 直接使用；包含 Electron、Chromium、Node 与内置文档组件，安装端不执行 npm install |
| [完整源码 ZIP](https://github.com/scliubingxin/WillBuddy/releases/download/v0.22.0-preview/WillBuddy-v0.22.0-source-20261024-103620.zip) | 开发与研究；包含锁文件、测试、构建说明和逐文件 SHA-256 清单 |
| [全部公开版本](https://github.com/scliubingxin/WillBuddy/releases) | 查看各版本附件、更新说明与已知限制 |

适用 Apple Silicon / arm64 Mac，最低 macOS 12。不提供 Intel Mac 安装包。将 ZIP 完整解压到用户目录，再将 `WillBuddy.app` 放入“应用程序”；保留包内符号链接，按包内说明操作。

**当前公开包为 Preview：ad-hoc 签名，未完成 Developer ID 签名和 Apple 公证，也未完成 Mac Gatekeeper、严格资源封印与安装启动验收。** 若系统签名检查失败，请停止安装并反馈，不关闭 Gatekeeper、不移除隔离标记。

云端模型和网页访问需要联网；本地模型与 Git、Python、Codex CLI 等可选程序没有随应用捆绑。安装问题详见[桌面说明](../desktop/README.md)和[打包问题记录](PACKAGING_INCIDENT.md)。

## 当前单独交付候选：0.26.0

新增真实持久词法倒排索引，首次获批查询构建，后续及重载后复用，文档或提取文本变化重建；候选仍在本次获批原文上匹配。缓存损坏重建、超限完整扫描回退、取消/磁盘故障处理和清除索引入口均已接通。不是向量语义检索或免审批读取。

280核心（新增16）/4相关真实Chromium/9打包测试通过，含真实Store磁盘重载、6轮HTTP模型+认证MCP与生产UI；原生IPC/审批/Keychain/模型语义仍夹具。详见[持久知识索引](PERSISTENT_KNOWLEDGE_INDEX.md)和[验证记录](validation/v0.26.0.json)。候选由本轮交付链接下载，尚未上传GitHub或发布Release；上方公开附件仍0.22，不能据此安装0.26。离线包仍ad-hoc未公证，无Mac严格签名/Gatekeeper/安装启动结论。

离线包 SHA-256：`957ed22d6a18f9599eb7df426994eb5e008da1c86d4581a4becf2100aec9f56c`，119727599 字节。

## 早期单独交付候选：0.25.0

新增MCP手动Bearer Token配置，连接器库和构建智能体时均可设置。凭据通过系统安全存储加密保存，界面不回填明文或密文；逐次批准后实际初始化/目录/业务调用/清理携带Header，地址或凭据变化失效，401/403不自动重试，重定向不转发凭据。不是OAuth登录或所有企业服务兼容。

264核心（新增15）/4相关真实Chromium/9打包测试通过。真实HTTP认证、AES-GCM加密夹具和生产页面通过；Mac Keychain/原生审批/真实付费模型和企业服务未验收。详见[MCP认证与使用](MCP_AUTHENTICATION.md)及[验证记录](validation/v0.25.0.json)。候选由本轮交付链接下载，尚未发布到GitHub；上方公开附件仍为0.22，不能据此安装0.25。离线包仍ad-hoc未公证，无Mac严格签名/Gatekeeper/安装启动结论。

离线包 SHA-256：`1447968a1e62bd9cdc489ff22a02fe67284e72383f237d2e80f76e9eac1a9c71`，119724724 字节。

## 早期单独交付候选：0.24.0

本轮增加对话「本轮检索依据」卡片：真实检索原文/版本/SHA/坐标快照、刷新恢复、来源更新或移除提示、无额外文件读取与模型调用。249核心/4相关真实Chromium/9打包测试通过；原生IPC/审批/模型语义仍夹具。详见[使用与边界](KNOWLEDGE_EVIDENCE.md)和[验证记录](validation/v0.24.0.json)。

离线包 SHA-256：`151364d7f3f9e0068c96d4cad808c6dada46eac2f28cc48ae3f164288c728fc2`，119722105 字节。

候选完整源码与arm64离线包由本轮交付链接下载，尚未上传GitHub或发布新Release；上方公开下载仍为0.22，不能据此安装0.24。仍ad-hoc未公证，无Mac严格资源封印/Gatekeeper/启动结论。

## 早期单独交付候选：0.23.0

此候选尚未公开发布到 GitHub，下方 0.22 附件不包含其新功能。

新增跨最多八份绑定文档的中文/英文分块知识检索，逐份读取审批，片段带文档版本、哈希、行号和精确偏移；来源变化、取消、拒绝时不返回本次部分片段。仍是词法检索，不是向量索引。

验证：244 项核心、4 项相关真实 Chromium 与 9 项打包测试通过；原生审批/IPC/模型语义仍有夹具，无 Mac 或真实付费模型新结论。详见[检索说明](KNOWLEDGE_RETRIEVAL.md)和[验证记录](validation/v0.23.0.json)。

本次仅整理产品文档，不改应用功能、版本号或离线安装包；功能测试数字为原候选已有证据，不是本次文档修改新增测试。

## 公开版本：0.22.0 Preview

[Release 与附件](https://github.com/scliubingxin/WillBuddy/releases/tag/v0.22.0-preview) · [对应代码](https://github.com/scliubingxin/WillBuddy/tree/v0.22.0-preview) · [已合并 PR #1](https://github.com/scliubingxin/WillBuddy/pull/1)

此版本已合入 main。后续单独的文档提交可能更新产品介绍，安装包功能以该标签及其附件为准。

- **Skills 技能库**：上传 SKILL.md / ZIP、查看资源、启停与引用保护删除。
- **MCP 连接器**：独立配置、审批后实际工具发现、取消和状态记录；构建智能体时绑定已有能力，或当场上传 Skill、创建连接。
- **智能体执行**：知识文档、按需技能、工具白名单与 MCP 接入 ReAct 循环。
- **内容与成果**：包含 HTML 附件交互预览、本机图片附件、对话图片/视频/链接/图表和已有 Office 生成编辑预览。

验证记录：232 项核心测试、17 项真实 Chromium 完整回归、4 项最终相关回归及 9 项打包测试。真实本机 HTTP 协议与生产页面经过测试；原生 IPC、选择器、审批和模型语义仍有夹具，不能视为 Mac 或真实付费模型/企业服务验收。详见 [0.22 验证记录](validation/v0.22.0.json)。

SHA-256：

```text
6547338704a2c6cdd07b1721fbff805e7c751640a2db22fd1c91c72d9b1ea232  WillBuddy-v0.22.0-mac-arm64-offline.zip
f5fedb20d7d5d7e40b6604e54cf77b46f94b137b2a07876e99bae39b7751e12f  WillBuddy-v0.22.0-source-20261024-103620.zip
```

## 已包含的迭代变化

下表为开发历史，不代表每一行都有独立公开安装包；公开附件只以 Releases 中实际存在的文件为准。

| 版本 | 主要变化 | 详细范围 |
| --- | --- | --- |
| 0.22.0 | Skills 上传库、MCP 配置管理和智能体绑定 | [Skills / MCP](SKILLS_AND_CONNECTORS.md) |
| 0.21.0 | 知识、技能、MCP 与 ReAct 能力组合；HTML 交互预览和本机图片附件 | [智能体](AGENT_CAPABILITIES.md) · [HTML](HTML_INTERACTIVE_PREVIEW.md) · [图片附件](LOCAL_IMAGE_ATTACHMENTS.md) |
| 0.20.0 | 对话内图片、视频、网页链接与柱/线/饼图 | [富媒体](CHAT_RICH_MEDIA.md) |
| 0.19.0 | Excel 图片按工作表及真实锚点定位 | [图片锚点](SPREADSHEET_IMAGES.md) |
| 0.18.0 | 保留当前 Office 预览帧、工作表选择和滚动 | [预览生命周期](PREVIEW_LIFECYCLE.md) |
| 0.17.0 | 修复本地 Office 预览组件加载与超时 | [加载修复](PREVIEW_TIMEOUT_FIX.md) |
| 0.16.0 | 内置离线 Word / Excel / PPT 预览 | [Office 预览](OFFICE_PREVIEW.md) |
| 0.15.0 | 导入 Word 简单正文段落增删与撤销 | [段落编辑](WORD_PARAGRAPHS.md) |
| 0.14.0 | 有界 Excel 公式、跨表引用与保存重算 | [公式范围](SPREADSHEET_FORMULAS.md) |
| 0.13.0 | 导入 Word 片段文字与直接格式修改 | [片段编辑](IMPORTED_WORD_EDITING.md) |
| 0.12.0 | 内部 Word 写作画布、HTML / Markdown 转 DOCX | [GenOffice 子引擎](GENOFFICE_ENGINE.md) |
| 0.11.0 | 可信 Office 文件卡片、内容编辑与原格式导出 | [文档编辑](GENOFFICE_DESKTOP.md) |
| 0.10.1 | 有界确认框、取消超时和任务内本站点授权 | [审批修复](APPROVAL_FIX.md) |
| 0.10.0 | Office 创建导入修改、版本管理与双任务并发 | [文档工作台](OFFICE_WORKSPACE.md) |
| 0.9.0 / 0.8.0 | 模型任务与 CLI 持久受理、取消及重启暂停 | [共享执行](SHARED_RUNS.md) · [CLI 队列](DURABLE_COMMANDS.md) |
| 0.7.0 | 真实流式输出、Markdown 与隔离 HTML 展示 | [流式与渲染](STREAMING_AND_RENDERING.md) |

更早开发、失败边界与下一步计划保留在 [迭代日志](../ITERATION_LOG.md)、[迭代计划](../ITERATION_PLAN.md)及[能力差距](QUICK_GAPS.md)。

## 已知范围

- MCP 支持无需认证或手动Bearer Token的 Streamable HTTP；OAuth、自定义认证头与 stdio 尚未支持。Skill 包内脚本不自动执行。
- Office 为有界生成、修改与预览能力，复杂排版、图表、完整公式兼容和任意文件保真往返仍有限。
- 已有本机持久词法索引，当前没有完整向量语义索引、自主并行子 Agent、跨端云同步或 Web/桌面完整共享核心。
- Mac 真机、真实付费模型和企业 MCP 联调仍待验收。不要将夹具测试、部分静态分析或能打开网页等同于全部系统集成完成。

## 0.27.0 附件问答候选

输入框可直接上传Office与文本附件后提问；支持格式、发送范围和限制见[对话附件问答](CHAT_ATTACHMENTS.md)。286核心/4相关Chromium/9打包通过，原生选择器/IPC和模型语义夹具，未Mac/付费模型验收。离线arm64包仍ad-hoc未公证，本候选未上传GitHub，公开入口仍0.22，不能以旧公开包验收新能力。完整源码和候选应用独立交付保留。

## 0.28.0 ZIP与多模型候选

[使用方法与实际边界](ZIP_AND_MODELS.md)：ZIP解压理解支持正文；多个独立模型和真实快速/均衡/极致路由/强度参数。306核心/5相关Chromium/9打包通过，原生与模型语义夹具；arm64离线候选仍ad-hoc未公证、无Mac真机验收。本候选单独交付，未上传GitHub/Release/合并，公开链接仍旧0.22。


## 0.28.1

修复输入框上传按钮竖排、模型/工具行拥挤和ZIP误用4MiB限制。ZIP输入32MiB，正文最多32份/10万字符；未选入正文列明原因，不声称整包已读。保留多模型与快速/均衡/极致路由。308核心/6真实Chromium/10打包通过；安装包arm64自带运行时，ad-hoc未公证，无Mac真机结论。详见[修复说明](COMPOSER_AND_UPLOAD_FIX.md)。


## 0.29.0

按Quick/WorkBuddy截图的交互层级精简输入框：输入区与一行操作栏，＋集中附件/资料/工具，模型菜单集中档位/强度/配置；去除常驻多段说明，保持真实上传/问答/审批。310核心/6真实Chromium/10打包通过，Mac真机与付费模型待验收。0.28.1已公开Release，0.29包已独立交付但本轮未上传GitHub。详见[输入区用法](COMPACT_COMPOSER.md)。
