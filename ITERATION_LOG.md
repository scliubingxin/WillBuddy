# WillBuddy 0.11.0 · Office真实交付、内容编辑与GenOffice接续 · 2026-10-22

修复用户截图的关键缺陷：生成的Office文档没有关联回复/工作区，导致“导出”保存文本收据.md。现在从真实成功工具结果持久化run文档引用，卡片和工作区导出原文件；旧审计可找回同run文件，绝不从模型文本猜ID。新增直接段落/常量单元格/Markdown和HTML原文编辑、乐观版本检查和审批。GenOffice已增加可选Mac应用副本接续/核验收回；不是内嵌完整编辑器，没有捆绑GenOffice，也没有执行其真实Mac GUI。

README已重写产品介绍、功能/边界/安装/模型/常见问题/开发/English关键词；3张明确标记的生产界面演示截图及自制工作流SVG，原Web介绍保留。未改变UNLICENSED或第三方许可。

验证：113项核心、6项真实Chromium、7项打包Python。新增8项编辑/GenOffice夹具/权限/故障边界，真实HTTP模型夹具到生产Chromium与真实DOCX下载/修改/刷新链路通过。初次JSDOM回归失败因测试加载器未注入新增UI模块，更新加载器后通过。Mac原生GenOffice/付费模型/签名公证仍未验收。详情与下一步见docs/GENOFFICE_DESKTOP.md及validation/v0.11.0.json。

实际变更文件：

- ITERATION_LOG.md
- ITERATION_PLAN.md
- README.md
- RELEASE_STATUS.json
- desktop/README.md
- desktop/main.mjs
- desktop/main/document-files.mjs
- desktop/main/genoffice.mjs
- desktop/package-lock.json
- desktop/package.json
- desktop/preload.cjs
- desktop/runtime/documents.mjs
- desktop/services/conversation.mjs
- desktop/services/documents.mjs
- desktop/src/app.js
- desktop/src/styles.css
- desktop/src/ui/documents.js
- desktop/src/ui/workspace.js
- desktop/tests/acceptance/documents-live.mjs
- desktop/tests/document-editor.test.mjs
- desktop/tests/helpers/load-ui.mjs
- docs/GENOFFICE_DESKTOP.md
- docs/QUICK_GAPS.md
- docs/WEB_README_ORIGINAL.md
- docs/images/documents.png
- docs/images/editor.png
- docs/images/workflow.svg
- docs/images/workspace.png
- docs/validation/v0.11.0.json
- scripts/capture-readme.mjs

arm64离线候选：119051628字节；47生产文件ASAR逐字节一致，282应用条目+5配套、14符号链接、零残留，15Mach-O/51216代码页及篡改负例通过。仍未公证，未做Mac原生严格资源密封/Gatekeeper/启动验收。

本次实际修改文件：

- ITERATION_LOG.md
- ITERATION_PLAN.md
- README.md
- RELEASE_STATUS.json
- desktop/README.md
- desktop/main/approval.mjs
- desktop/main.mjs
- desktop/package-lock.json
- desktop/package.json
- desktop/preload.cjs
- desktop/runtime/browser-permissions.mjs
- desktop/runtime/browser.mjs
- desktop/runtime/tools.mjs
- desktop/services/conversation.mjs
- desktop/services/documents.mjs
- desktop/src/app.js
- desktop/tests/approval-lifecycle.test.mjs
- docs/APPROVAL_FIX.md
- docs/QUICK_GAPS.md
- docs/validation/v0.10.1.json

# 0.10.1 修复记录 · 2026-10-22

按用户截图修复document_create长JSON原生sheet超出屏幕、取消信号未传入dialog导致队列等待的问题。文档确认用摘要；浏览器可显式选择本任务/本站点授权，不逐步弹窗，新站点/新任务重新确认；撤销、任务结束和退出清理许可。增加60秒超时、菜单⌘⇧Esc紧急取消、拒绝无父窗口/过长消息及迟到允许，导航前后校验防止站点授权泄漏。完整边界见docs/APPROVAL_FIX.md（从docs阅读为APPROVAL_FIX.md）。

105项核心、6项真实Chromium回归；原生弹窗为适配器夹具，Mac真机/严格签名/启动仍未验收。继续保留0.10.0文档、双任务能力及原Web/Python/白蓝logo/加密身份。下一步优先用户Mac弹窗/浏览器/文档链路验证，继而Office保真预览和结构编辑；不回退纯壳、不创建PR/合并main。

# WillBuddy 0.10.0 · 2026-10-22

用户最新主线：AI编辑/生成Office、Markdown、HTML及多任务并发。已实际实现真实文档编解码、导入不写回原件、create/read/edit模型工具、原生逐次审批、乐观版本检查、五份历史字节、历史导出、原生保存暂存/回读校验。Office基础排版和定向修改，不宣称全面替代Office。修复前端全局pending禁止并发任务的真实问题，改为逐会话状态/草稿/工作区；最多两项模型请求并发，更多排队、独立停止。

96项Node/JSDOM（新增15文档/权限/故障/文件/HTTP）、6项真实Chromium、7项打包Python、35项原Python执行器通过。生成编辑的真实DOCX/XLSX/PPTX经独立Python Office解析器校验。浏览器实际生成/编辑/导出Word并并行两项HTTP请求，取消一项不影响另一项；原生桥/审批/模型内容仍夹具。修正旧混合CLI测试的状态观察竞态：等待worker idle后断言名额释放，未改生产调度。

arm64离线包包含全部运行时和已预打包Office纯JS编解码器/16个模块许可。45个生产文件与ASAR逐字节一致；282应用条目+5配套、14链接、零残留；15 Mach-O/51216代码页及篡改负例通过。仍ad-hoc、未公证，无Mac原生严格资源封印/Gatekeeper/启动、真实模型、Microsoft Office/WPS保真排版或CodexCLI结论。源码包使用闭合清单和逐文件SHA256，排除依赖、真实密钥、用户数据与缓存。

Office未完成：保真渲染、复杂结构/样式/模板/图表图片、公式引擎、修订批注/PDF；并行未完成：模型自主拆解子任务组、跨队列公平和跨重启进程续跑。下一轮从 docs/OFFICE_WORKSPACE.md、docs/validation/v0.10.0.json 接续，有Mac先原生验收；原Web/Python保留，未部署、未创建PR/合并main。

实际修改文件：

- .github/workflows/willbuddy-mac-arm64.yml
- ITERATION_PLAN.md
- README.md
- RELEASE_STATUS.json
- desktop/README.md
- desktop/main/document-files.mjs
- desktop/main.mjs
- desktop/package-lock.json
- desktop/package.json
- desktop/preload.cjs
- desktop/runtime/agent.mjs
- desktop/runtime/documents.mjs
- desktop/runtime/tools.mjs
- desktop/runtime/vendor/OFFICE-LICENSES.txt
- desktop/runtime/vendor/OFFICE-MANIFEST.json
- desktop/runtime/vendor/office.cjs
- desktop/services/conversation.mjs
- desktop/services/documents.mjs
- desktop/src/app.js
- desktop/src/ui/documents.js
- desktop/tests/acceptance/documents-live.mjs
- desktop/tests/documents.test.mjs
- desktop/tests/run-queue.test.mjs
- docs/ARCHITECTURE.md
- docs/OFFICE_WORKSPACE.md
- docs/QUICK_GAPS.md
- docs/validation/v0.10.0.json
- scripts/native-isarray.cjs
- scripts/package-offline-mac.py
- scripts/requirements-office-tests.txt
- scripts/vendor-desktop-office.mjs
- ITERATION_LOG.md

# 桌面迭代 0.9.0 · 2026-10-22 · 共用模型调度与取消边界

重新读取权威0.8.0/版本6并核对312文件哈希，从公开GitHub已核对的b8ecf63接续，不从旧main回退。新增runtime/run-queue.mjs，对话与每日模型任务共用持久受理/FIFO/取消/状态事件；同一逻辑ID与定时发生去重、过期请求冲突拒绝。CLI仍保留原队列，共享两个执行名额，不声称三者统一FIFO或跨Web核心完成。自动化页显示真实队列，刷新后可停止排队对话及运行中的每日任务，迟到回复不生成成果/通知。重启只暂停/标记中断，不重放模型worker、工具或审批。schema1新增runJobs，原Web/Python、加密身份和白蓝logo保留。

81项Node/JSDOM（新增16项调度/故障/混合CLI/权限及1项UI版本回归）、5项真实Chromium、7项打包Python、35项原Python执行器通过。新增真实浏览器→服务→HTTP模型夹具，核实排队对话刷新停止、每日任务实际HTTP中止；原生桥/审批/供应商回复仍夹具。附加两项竞态：预读附件期间取消、实际读取等待期间撤销授权，均不会发给模型。旧CLI浏览器测试曾在新记录出现前读到旧输出，改为等待新执行ID后通过；新增队列测试选择器与初始视图刷新已纠正，最终检查全部通过。

离线arm64包118699794字节，sha256 4f216635421e671704526851fee317acc23b9a7c00ab54f55e06739a20812b96，38个生产文件与ASAR逐字节一致；282应用条目+5配套、14链接、零残留、15Mach-O/51216页及篡改负例通过。仅ad-hoc，未公证、无Mac严格资源密封/启动/Gatekeeper或真实付费模型/CodexCLI验收。构建主机为Linux；没有移除隔离标记或关闭安全功能。

实际改动文件见docs/validation/v0.9.0.json与SOURCE_MANIFEST。复查Quick官方系统工具公开文档，复用既有REA证据，不推断Amazon调度内部实现。源码打包时GitHub独立0.9分支上传待最终核对，实际结果在交付简报记录；未创建PR/合并。

下一轮：具备Apple芯片环境时先做严格签名/安装/原生审批、模型与CLI验收；其余可独立工作优先桌面MCP或授权文件写入/Office成果，继续推进跨队列公平/统一事件，而不是仅增加调度页面。旧工具审批绝不自动重放。

# 桌面迭代 0.8.0 · 2026-10-21 · CLI持久队列与中断恢复入口

从权威0.7.0/版本5重新取包并核对306文件哈希。拆出services/commands.mjs，实现手动CLI持久受理/FIFO/共享容量、稳定ID去重、版本化状态事件、刷新后取消、重启暂停/中断与新审批重试。重试关联保留，双击/过期版本/同ID改参数拒绝；不重放旧审批。审计关联jobId/executionId，运行partial检查点保存，保存失败阻止或停止子进程。清理结束队列项保留独立审计；旧数据/钥匙串身份、Web/Python、0.7流式及Markdown/HTML均保留。src/ui/commands.js独立纯视图，main只组装注册。

64项Node/JSDOM（新增14项队列权限/故障/并发）、7项Python打包边界、35项原Python执行器、4项真实Chromium验收通过。新UI链路实际启动Node子进程，刷新后按原持久ID停止并重新审批重试；原生桥/审批是夹具。初次真实UI测试暴露选择器歧义，改为唯一可见工具台入口后通过；不是产品运行失败。开发时的命令工作目录/根路径错误已纠正，最终完整回归通过。宿主缺中文字体，未把截图当作中文像素验收。无真实用户模型/Codex CLI/Mac验收。

arm64离线包118696596字节，SHA256 bd04a10bc037cca838c330033137ba7c687abbe7a9e17a823ce63cf42ed410e9；36个生产文件与ASAR逐字节一致。282应用条目+5配套、14链接、零残留、15Mach-O/51216页及代码篡改负例通过。仍ad-hoc未公证，未执行Mac codesign严格资源密封或Gatekeeper/原生启动检查。未关闭安全机制。

实际修改文件清单见docs/validation/v0.8.0.json与完整SOURCE_MANIFEST。复查Quick官方桌面界面/系统工具文档，复用既有REA证据，不推断Amazon队列内部实现。GitHub从e0b3ef0的0.7分支续接独立0.8分支，源码打包时上传待完成核验；最终同步结果在交付简报说明。未创建PR或合并main，沿用上轮授权边界。

下一轮：有Apple芯片环境先做严格签名、安装启动、真实模型/CLI/审批与取消恢复；其余独立工作优先统一Agent/每日任务/命令队列和事件，再推进MCP与真实文件/Office成果。当前不是全部Agent持久化、进程续跑或跨端统一完成。

# 桌面迭代 0.7.0 · 2026-10-21 · 流式输出、Markdown 与 HTML

用户实测反馈输出不流式、格式混乱。本轮从权威 0.6.1 源码版本4接续，核对294个文件哈希，公开 GitHub main 8e8743a 与基线逐文件一致。修复了 stream:false 写死和简化渲染器：新增 SSE 解码与完整工具分片，服务持久化增量和单调事件，界面局部更新、输入框复用及防过期覆盖。取消/截断保留已收到的内容，无自动重试或工具重放。Markdown 改为固定版本解析/净化依赖，离线包含源码许可证；HTML 语义排版与带 CSS 的 sandbox 静态预览已实现，仍禁止脚本/表单/远程资源和跳转，原文导出不改变。

50项 Node/JSDOM、7项 Python、3项真实 Chromium 验收通过。新增 HTTP SSE→服务→模拟原生桥→真实浏览器验收，服务端未放行结束前确认首段可见；并发验收曾暴露光标选区回退，已通过复用真实输入框修复，最终同元素/草稿/焦点/选区均通过。新增 SSE 工具闭环实际执行 Node 子进程；模型、原生桥和审批仍夹具，不冒充付费模型或 Mac 原生验收。官方 Playwright 镜像下载503后改用 Google 官方同版本 Chrome for Testing Headless Shell 141.0.7390.37 完成测试，未修改产品 sandbox。

实际修改：desktop/core.mjs、main.mjs、preload.cjs、package.json/lock；runtime/agent.mjs、新 model-stream.mjs；services/conversation.mjs/recovery.mjs；src/app.js/index.html/workbench.css、ui/markdown.js/workspace.js、新 vendor 模块/许可证/清单；tests/workspace.test.mjs、新 streaming.test.mjs/rendering.test.mjs、tests/helpers/load-ui.mjs、acceptance/workspace-live.mjs 与新 streaming-live.mjs；新 scripts/vendor-desktop-renderer.mjs；README、desktop/README、架构/Quick差距/REA接续、计划/日志/发布状态/验证清单。完整文件与哈希以 SOURCE_MANIFEST 为准。

arm64 离线包已生成，内置渲染依赖和 Electron/Chromium/Node；34个实际应用源码文件与 ASAR 逐字节一致。闭合 ZIP 为282应用条目+5配套、14符号链接、零残留，15个 Mach-O/51216代码页校验通过。ad-hoc、未公证，Mac严格资源密封与启动仍未验收。公开仓库通过独立修复分支上传并核对完整源码后再整合，结果在交付时报告；不部署原 Web 站点。

下一轮首先用 Apple 芯片与用户实际模型验证增量、停止和 HTML 预览，再继续统一事件协议、持久任务队列与跨端核心。仅 JSON 接口仍一次性显示；数学公式、语法高亮、脚本式 HTML 应用和远程图片不在本轮范围。

# 文档命名修正 · 2026-10-21

按用户要求，将根 README 历史 Web 说明标题“幕云AI 工作台”改为“WillBuddy 工作台”。仅修改说明标题，保留历史版本号及运行代码；重新生成完整源码清单和 ZIP。文档改动不重复运行功能测试，源码包逐文件 SHA-256 校验由打包脚本完成。

# 桌面迭代 0.6.1 · 2026-10-21 · 项目分层整理

针对用户反馈代码结构杂乱，实际拆分 Electron 原生适配、业务服务与纯视图。新增 desktop/main/{ipc,approval}.mjs；desktop/services/{conversation,tasks,workspace,recovery,validation}.mjs；desktop/src/ui/{markdown,workspace}.js。main 保留宿主组装和秘密存储等原生职责，app 保留界面状态/事件，重新展开密集逻辑，新增 docs/ARCHITECTURE.md 提供目录职责、修改入口和开发命令。未盲目搬动原 Web/Python、存储格式、IPC 与旧加密身份。

原先定时任务在异步保存后才占用共享执行名额，存在并发超额窗口；本轮在保存前保留名额，失败/取消均释放。新增服务测试覆盖 IPC 拒绝跨窗口/子框架/伪造 URL、审批排队取消、模型工具 runId、授权撤销、共享并发、取消/失败持久化、存储故障、工作空间增删与重启不重放。JSDOM 通过共享助手加载生产视图模块；Chromium 仍直接加载真实 ESM。

验证：37 项 Node/JSDOM 全通过；7 项 Python 打包边界全通过；真实 Chromium 工作区与浏览器 CDP 验收各 1 项通过。模型与原生桥为夹具，未做 Mac 原生启动、付费模型或 Codex CLI 验收。两种打包配置同步纳入 main/services，离线 app 使用原 residue 清理、闭合清单和代码页校验。ARM64 ad-hoc 候选不代表 Developer ID 或公证。

完整改动还包括 desktop/package.json/lock、tests/services.test.mjs、tests/helpers/load-ui.mjs、tests/ui.test.mjs、tests/workspace.test.mjs、scripts/package-offline-mac.py、README/desktop README、计划/日志/状态/Quick差距与验证记录。逐文件列表由 SOURCE_MANIFEST.json 权威记录。GitHub 私有仓库已创建并开始上传；完整树验证结果在交付时报告，不在此提前宣称上传完成。

# 桌面迭代 0.6.0 · 2026-10-21 · 任务、过程与成果衔接

追加优先修复：用户报告 0.5.0 的 `.BC.T_*`/`.BC.D_*` 残留造成 Mac 严格签名失败。打包改为冻结清单写 ZIP，签名前后残留清理、资源引用残留时失败、实际条目集合完全匹配、链接/执行位/大小写/重复路径保护；安装脚本拒绝残留，README 指导先解压至个人目录，macOS CI 加入 ditto+codesign 严格门禁。新增 scripts/offline_bundle.py、scripts/tests/test_offline_bundle.py 和 docs/PACKAGING_INCIDENT.md，修改 package-offline-mac.py、源码打包过滤、installer 文档/脚本与 mac-arm64 工作流。7 项 Python 边界测试通过；新 ZIP 282 个应用条目 + 5 配套文件、14 链接、零残留。原生 Mac 门禁尚未执行，不能宣称闪退在真机已验收修复。

按用户两张截图的反馈，从 0.5.0 权威源码接续。观察和实现映射见 docs/SCREENSHOT_ALIGNMENT.md。重组任务导航与历史筛选；输入区固定底部，@ 从授权目录选文本资料、/ 选择已有智能体，支持键盘选择；运行刷新保留焦点、选区、草稿、滚动和展开状态。新增右侧任务工作区，支持回复、成果、本地文本文件的多页签预览、原文、Markdown 表格/列表/代码、导出和继续修改。页签按任务隔离，原文导出不丢失格式。主题继续白底和原 logo 蓝，未复制参考产品资产。

本轮不是纯静态界面：main 为每轮请求保存 runId/status/start/end，ToolRuntime 持久审计带同一 runId，对话只关联本轮真实操作。等待审批、执行、拒绝、失败、取消和中断有明确区分；原生授权保留，退出后不重放。未实现持久队列、Office/图片编辑、语音、积分、OAuth 或云同步。

实际改动文件：desktop/src/app.js、src/index.html、新 src/workbench.css、main.mjs、runtime/tools.mjs、package.json/lock、tests/ui.test.mjs、新 tests/workspace.test.mjs 与 tests/acceptance/workspace-live.mjs；更新源码日期脚本、README/桌面说明、计划/日志、Quick 差距、REA 接续及发布/验证清单。逐文件 SHA-256 仍由打包脚本生成。

验证：28 项 Node/JSDOM 回归全部通过；真实 Chromium Headless Shell 的界面布局、键盘、表格、预览与导出测试通过；真实 Headless Shell + CDP 的隔离世界/可信输入、表单跳转、遮挡、拒绝、过期目标、重复凭证、脱敏及确定性模型工具循环通过。完整 Chrome 仍因 socket 权限无法启动，Headless Shell 可运行。原生桥、审批和模型仍是夹具；Mac 原生 Electron/系统确认框、真实模型和第三方 Codex CLI 均未验收。中文字体仅用于构建端渲染 QA，没有加入产品依赖。

交付继续仅 Apple 芯片 arm64 离线应用（嵌入 Electron/Chromium/Node，安装无需 npm）和完整源码。签名为 ad-hoc，不宣称 Developer ID、公证、Gatekeeper 或 Mac 启动通过。下一轮先验收实际使用，再扩展真实 Office/图片成果和持久化执行。

# 桌面迭代 0.5.0 · 2026-10-20 · 受审批的 DOM 操作

接续 0.4.3 权威源码并核对 268 个文件 SHA-256。实际增加浏览器 snapshot/ref、点击、填写；工具台与模型使用同一 BrowserService / ToolRuntime。隔离世界保留 DOM 节点及私有签名，动作绑定单次凭证并在审批后再次核验。过期、导航、元素或表单变化、遮挡、焦点变化和重复调用失败关闭；输入参数审计脱敏；read/snapshot 审批期间换网址也拒绝。每次动作后重新检查，不把输入发送当成业务成功。修复工具台 action 参数遮蔽按钮渲染函数的问题。

实际功能文件：desktop/runtime/browser-dom.mjs（新增）、browser.mjs、tools.mjs、agent.mjs、desktop/main.mjs、preload.cjs、src/app.js。新增 tests/browser-dom.test.mjs、browser-runtime.test.mjs、acceptance/browser-live.mjs，更新 tests/ui.test.mjs、package.json/lock、打包脚本及本轮文档/状态。离线 ZIP 补入 Chromium 许可证，移除 rcodesign 遗留且资源封印未引用的临时 framework 副本；打包脚本增加清理和逐文件 ZIP 校验。原 Web、Python、数据格式、内部加密身份和主题未变。

验证：npm test 共 24 项全部通过；真实 Node CLI 和 HTTP 模型协议夹具通过；JSDOM 浏览器服务/DOM、模拟原生桥 17 条 UI 路径通过。真实 Chrome 已取得但因主机 socket() Operation not permitted 无法启动，真实 CDP 测试未通过；未降低产品 sandbox。没有 Mac 真机、真实付费模型或第三方 Codex CLI 验收。离线包的运行时摘要、ASAR、arm64 Mach-O、代码页、ZIP、链接与执行位独立检查；ad-hoc 不是公证签名。

下一轮：先读上述运行时与测试，优先持久化执行和中断恢复，不自动重放已审批网页/CLI 动作；有 Mac 环境时先跑原生验收。当前浏览器仍不支持 iframe/Shadow DOM、截图定位和完整业务结果验证，不能称为完整 Quick 自动化。

# 桌面迭代 0.4.3 · Apple 芯片免依赖包

用户要求不再逐次安装 npm 依赖，并确认仅需 Apple 芯片安装包。本轮新增固定官方 SHA-256 校验的 arm64 Electron 离线组装脚本、本地安装脚本、签名 entitlements 与手动 macOS 构建工作流。包内含完整桌面运行时与应用代码；外部第三方 CLI 和 Python Office 工具链不宣称已内置。

验证：官方运行时摘要、arm64 Mach-O 架构、Info.plist、ASAR 内容、符号链接/执行权限、ad-hoc 签名与 Mach-O 哈希、ZIP 完整性；16 项既有桌面测试通过。Linux 静态验收不等于 macOS codesign 资源封印、Gatekeeper 或真机启动通过；无 Developer ID、公证，也没有部署或运行外部 GitHub 工作流。

# 桌面迭代 0.4.2 · Logo 白色主题

按用户截图反馈，将大背景、侧栏、内容区、卡片及弹窗统一为 #FFFFFF。主色取自原始 logo 的主蓝 RGB(0,120,203)，替换按钮、选中项、链接、焦点与提示的紫色；红色仅作少量点缀与错误语义。统一中性色、边框、文字与输出区，并将 Electron 启动背景设为白色，避免启动时出现旧色。未改变工具或数据行为。

验证范围：CSS 语法及主题色核对、脚本语法、源码包清单。不将历史功能测试重复描述成本轮新验收；Mac 原生视觉仍需用户实机确认。

# 桌面迭代 0.4.1 · 命名 WillBuddy

用户最终确认大小写为 WillBuddy。更新侧栏、页面标题、主窗口、应用菜单、通知、默认助手、浏览器窗口、导出标签及 installer productName；沿用用户蓝红 logo。保留内部 IPC、appId 与系统加密身份，关于面板显示 WillBuddy；运行前自动探测旧数据目录以保持会话和密钥位置，不批量替换历史消息或用户自定义角色。默认助手仅在内容仍为出厂默认时更名。

# 桌面迭代 0.4.0 · 2026-10-20

用户反馈：无法打开浏览器、无法执行 CLI。检查发现 0.3.0 没有工具协议，系统提示词明确声明无工具，属于未实现能力。

本轮增加可复用 runtime/agent、runtime/tools、runtime/command、runtime/browser；标准工具调用闭环、原生确认、实际进程执行、内置/系统浏览器、正文读取、stdout/stderr/退出码、取消超时及执行审计；加入工具台与状态通知。采用用户提供的原始蓝红 logo（image(6).png），新增侧栏图片、Dock PNG、ICNS/ICO 打包图标，不重绘品牌。0.3.0 数据保持 schema 1，启动补齐 executions，未完成操作记为 interrupted，不重放。

16 项测试通过：6 原核心、9 新运行时、1 界面（14 路径）。CLI 使用实际 Node 子进程，两轮 HTTP 模型夹具实测工具结果回传；浏览器适配器与 UI 是模拟验收，未在 Mac 真机或真实模型上验收。未生成 DMG，无线上发布。原 Web 不变，本轮未重复运行原 Web 全套构建或历史测试。

后续入口：docs/QUICK_GAPS.md、desktop/README.md。优先推进 Mac 真机浏览器/CLI 验收、DOM 交互、持久化执行与结构化审批。不要将 0.3.0 的壳层能力当作完整 Quick 对齐。

以下保留原 Web 历史迭代记录。

---

# 迭代记录

## 2026-10-07 · 安全对话 JSON 导入

工作台侧栏新增“导入安全对话”。它只接收幕云AI服务端权威导出的 `muyun-chat-export/v1` JSON，并由服务端重新执行格式、长度、角色、URL 与字段白名单校验；成功时使用随机新 ID 创建“（导入）”对话，目标冲突、跨用户同 ID、错误 schema、系统角色、空消息或超限内容均失败关闭，既有记录不会被覆盖。

导入保留可读消息、模型、Token 用量、安全 HTTP(S) 来源和成果名称/大小/SHA-256 摘要。成果摘要在新对话中明确标为不可下载证据；`requestId`、待执行 `proposals`、事件、工具参数、内部成果 ID、对象键、私有下载地址、`tool_request` 与 `chat_requests` 都不会重建，因此数据可携带不等于执行授权或模型重放。实际前端处理器覆盖成功、运行中、超大文件、无效 JSON、服务端拒绝和结果未同步 6 个场景。

完整入口通过：411 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、11 项发送/恢复生命周期、8 项删除/恢复生命周期、3 项分支生命周期、5 项重命名生命周期、4 项导出生命周期、6 项导入生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器导出→导入、真实 DeepSeek、Office/WPS 和 Docker 隔离未执行。

应用提交 `3d56637ce2f7bad7ceb347e0d54bd7c6b3e3fdf4`，验证并部署的源码提交 `2e8b23b1197c4c691efefec00910e58fd7391c5a`。2026-10-07 00:50 UTC 已部署原站点私人版本 46（deployment `appgdep_6ac5975c7fe881919ec61872cccfe241`）；部署成功后复核为 `custom`，仅 1 名 owner、0 个组、0 名外部访客，环境版本仍为 3。

## 2026-10-06 · 对话安全重命名

聊天标题新增重命名入口，并统一以服务端保存名称显示标题、最近对话和搜索结果。网页提交当前对话 ID、名称与 `baseUpdated`；服务端重新读取认证 owner 的真实 chat，只在版本一致时条件更新顶层 `name` 并返回更高版本。旧标签页、缺版本、空名称、超长名称、跨用户和并发竞争均在写入前失败。成功后页面重新读取权威记录，不直接信任本地表单。

重命名不会重写消息、空间、智能体、模式、成果证据、待审批工具记录或模型幂等记录。发送后续消息、审批/状态同步、评价和完整导出都会继续使用自定义名称，避免下一次保存把标题退回首条消息。真实 SQLite 验收覆盖 8 项正负路径与逐字段保留；实际前端处理器覆盖成功、版本冲突、结果未同步、运行中和缺版本 5 个场景，发送处理器另验证自定义名称在后续消息保存中保留。

完整入口通过：401 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、11 项发送/恢复生命周期、8 项删除/恢复生命周期、3 项分支生命周期、5 项重命名生命周期、4 项完整对话导出生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器双标签页、真实 DeepSeek 用量、Office/WPS 和 Docker 隔离未执行。发布终态在部署完成后补记。

应用提交 `381d57afd4a728a018c65eb7e858337281ba3b4f`，验证并部署的源码提交 `c5fe0ffcb2d52b2803ee33b2d43ff113b30b1c25`。2026-10-06 18:54 UTC 已部署原站点私人版本 45（deployment `appgdep_6ac543b898848191bc37eb69b16f665b`）；部署成功后复核为 `custom`，仅 1 名 owner、0 个组、0 名外部访客，环境版本仍为 3。

## 2026-10-06 · 服务端权威对话导出

聊天标题新增“导出完整对话”。浏览器只提交对话 ID 和当前服务端版本，`GET /api/chat-export` 重新按认证 owner 读取真实 chat；记录不存在、版本落后、跨用户或请求 HTML 等不支持格式时不导出。响应使用 `no-store`、`nosniff` 和安全中文文件名，默认交付 Markdown，同时保留同一白名单契约的 JSON 输出。

导出保留全部消息正文、模型名、Token 用量、来源定位与安全 HTTP(S) 地址、已完成成果名称/大小/SHA-256，以及截断提示；服务端不序列化 `requestId`、`proposals`、执行事件、工具参数、内部成果 ID、对象键或私有下载 URL。消息和来源摘录放入纯文本代码块，名称做 Markdown 转义，避免导出内容被当成远程图片或可执行链接。真实 SQLite 验收覆盖正向 Markdown/JSON、当前版本、跨用户、旧版本、格式白名单、响应头和敏感字段负例；实际前端处理器覆盖成功、版本冲突刷新、运行中和无版本 4 个场景。

完整入口通过：393 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、8 项删除/恢复生命周期、3 项分支生命周期、4 项完整对话导出生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器下载、真实 DeepSeek 用量、Office/WPS 和 Docker 隔离未执行。发布终态在部署完成后补记。

应用提交 `6df89c52983ca0da441a080888dac8a0e3169776`，验证并部署的源码提交 `22844400b5378295544451353438108128f4c611`。2026-10-06 12:44 UTC 已部署原站点私人版本 44（deployment `appgdep_6ac4ed010efc8191906aa62c344e9565`）；部署成功后复核为 `custom`，仅 1 名 owner、0 个组、0 名外部访客，环境版本仍为 3。

## 2026-10-05 · 安全对话分支

聊天标题新增“创建独立分支”。网页提交源对话 ID、当前服务端版本和全新目标 ID；服务端重新读取认证用户的真实聊天，并以 owner、kind、updated 和目标不存在做条件插入。源记录在读取后发生变化、跨用户请求、目标冲突或缺少版本时均不创建分支，也不覆盖任何记录。成功后页面从服务端重新读取并切换到新分支，空间、智能体和模式设置保持一致。

分支保留消息正文、来源、已完成成果引用和终态审计事件，便于从既有结论继续探索；每条消息的 `proposals` 都在服务端剥离，且不会复制隐藏 `tool_request`、模型 `chat_requests`、审批领取或其他执行状态。源对话保持逐字不变。真实 SQLite 验收覆盖当前版本成功、旧版本/跨用户/目标冲突拒绝、源记录不变、成果保留、提议和权限不复制；实际前端处理器覆盖成功、版本冲突刷新和结果暂未同步 3 个场景。

完整入口通过：384 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、8 项删除/恢复生命周期、3 项分支生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器分支、真实 DeepSeek 用量、Office/WPS 和 Docker 隔离未执行。发布终态在部署完成后补记。

应用提交 `e6067c1dfd5a90856b0f4881ee9bfee231f4d38a`，验证并部署的源码提交 `4325abb4d3a040c7d0b1920434ad59456f28dfad`。2026-10-06 06:44 UTC 已部署原站点私人版本 43（deployment `appgdep_6ac498aeb5148191920b1dbb2c0eafec`）；部署成功后复核为 `custom`，仅 1 名 owner、0 个组、0 名外部访客，环境版本仍为 3。

## 2026-10-05 · 对话七天限时恢复

新增独立 `deleted_chats` D1 表。聊天只有在 owner、类型和当前 `updated` 全部匹配时，才会在同一事务把精确 JSON 快照、删除版本和 7 天到期时间写入回收区并移出活动记录；失败的旧版本删除不会产生快照。成功删除后仍清理 pending/executing 工具提议和短期模型请求，恢复不会复活已撤销的执行授权。

工作台单独返回最多 20 个未过期快照的最小元数据，侧栏显示“最近删除”。恢复请求必须同时匹配当前用户、对话 ID 和服务端删除版本；过期、伪造、跨用户、重复恢复或与活动记录冲突均失败关闭。成功恢复使用原字节内容并生成新的单调版本，不覆盖现有对话。真实 SQLite 验收覆盖失败删除无快照、精确快照、列表隔离、跨用户/伪造/重复/过期拒绝和一次性恢复；实际前端处理器覆盖 8 个删除/恢复场景。

完整入口通过：377 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、8 项删除/恢复生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器删除/恢复、真实 DeepSeek 用量、Office/WPS 和 Docker 隔离未执行。发布终态在部署完成后补记。

发布：应用提交 `36ac0a017d06ecac78e336c795b582fad7140077` 经验证清单提交 `9650a0f6f76e0c0c3a56e99b9bffbea2fa68adbf` 部署原私人站点版本 42；部署 `appgdep_6ac444fb86d48191b6ac6ce92ebfe2b5` 于 2026-10-06T00:47:02.589864Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-05 · 对话删除版本保护

`DELETE /api/workspace` 对聊天新增 `baseUpdated` 前置条件。服务端只在认证 owner、chat 类型与当前 `updated` 全部匹配时删除聊天；旧版本、缺版本和删除前再次变化均失败关闭。只有条件删除成功后才清理该对话 pending/executing 工具提议、短期模型请求及关联状态，因此旧标签页不会误删新内容，也不会提前清理仍有效的审批或恢复记录。其他资源和文档删除契约保持不变。

网页从当前对话版本或资源列表版本构造删除请求；冲突时当前对话重新载入、后台对话刷新列表，确认框保留供用户重新核对。新增 4 项真实 SQLite 后端断言和 6 项实际前端删除处理器场景。完整入口通过：369 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、6 项删除生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器双标签页、真实 DeepSeek 用量和账单未执行。

发布：应用提交 `d53fa45ce729eb8ec08bf6a66a3355dcb18d5fb5` 经源码状态提交 `58e1adce68be885c064922631df917110a0f05b9` 部署原私人站点版本 41；部署 `appgdep_6ac3ef0dfb388191a899b8b79cec341e` 于 2026-10-05T18:40:29.171157Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-05 · 浏览器对话保存版本保护

`POST /api/workspace` 为聊天创建返回服务端版本，后续更新必须携带当前 `baseUpdated`。服务端以 owner、chat、kind 与旧版本做条件更新，并让版本严格单调递增；旧标签页、旧缓存或缺少版本的已有对话更新会在改写数据前失败。网页切换对话时保留版本，发送前先条件保存用户消息；冲突时不调用模型，恢复输入并重新加载最新聊天。模型完成与恢复由服务端权威落盘，网页不再用完整旧快照二次覆盖。

新增 5 项真实 SQLite 工作区断言：创建返回版本、当前版本成功并递增、过期版本拒绝、缺版本更新失败关闭、最新聊天未改变。完整入口通过：365 项应用断言、40 项真实 workerd/D1 消息并发断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器双标签页和真实 DeepSeek 用量未执行。

发布：应用提交 `d1cacd293f736b79a4f52c5e2cf07804aad6805d` 经源码状态提交 `aff8f30791766891f2e667101d71a3db82387e20` 部署原私人站点版本 40；部署 `appgdep_6ac3a04302fc8191b986f695fbba8bbf` 于 2026-10-05T13:04:14.916394Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。


## 2026-10-04 · 多标签页迟到回复冲突安全合并

服务端完成模型请求后不再要求原用户消息仍位于对话末尾，而是按唯一 `requestId` 在完整聊天快照中定位，将助手回复准确插在该用户消息之后。完整 JSON 条件更新失败时重读最新快照再尝试，因此另一标签页追加的问题和消息顺序都会保留；同请求助手已存在时幂等成功。若原用户消息已被删除、标识重复或聊天不存在，则不猜测归属、不把回复挂到其他问题，完成响应仍保存在 `chat_requests` 供显式恢复。

专项验收使用真实本地 workerd/D1 与计数模拟供应商，覆盖模型等待期间另一标签页追加消息、按原问题位置合并、GET 恢复不重复、原消息被删除时拒绝误插入且仍可恢复，共 40 项。完整入口通过：360 项应用断言、40 项消息幂等/冲突合并断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器双标签页和真实 DeepSeek 用量未执行。发布终态在部署完成后补记。

发布：应用提交 `e46c30b4e6020a22c1301cbda1984efb2efd113b` 经源码状态提交 `36f1d84c3c33011d2ecfa1193a7c5f6c2d17d331` 部署原私人站点版本 39；部署 `appgdep_6ac349d6cf4c819187701be15d2c26a3` 于 2026-10-05T06:55:30.569758Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。


## 2026-10-04 · 模型完成后服务端自动保存回复

浏览器在模型完成后、收到响应前断开时，不再只依赖短期恢复缓存。`completeChatRequest` 完成 D1 幂等记录后，会检查真实聊天末尾仍是同一 `requestId` 的用户消息，再用完整数据快照条件追加带相同标识的助手消息。正常浏览器保存与服务端结果一致，不会产生第二条回复；已完成请求重放及 GET 恢复也会修复尚未落盘的旧聊天。若另一标签页已新增消息、聊天删除或数据过大，服务端不覆盖新状态，原完成响应仍可通过上一轮入口恢复。

专项验收使用真实本地 workerd/D1 与计数模拟供应商，覆盖完成前持久化、重放不重复、跨用户隔离、失败后重试只追加一次，以及模型运行中另一标签页修改聊天时不覆盖且仍可恢复，共 33 项。完整入口通过：360 项应用断言、33 项消息幂等/持久化断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送/恢复生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器断网和真实 DeepSeek 账单未执行。发布终态在部署完成后补记。

发布：应用提交 `02716f8ea8c6b450f29b14b510145c3940c0d93b` 经源码状态提交 `c7c84ef871c173c31b5690f9c935f3166168bb20` 部署原私人站点版本 38；部署 `appgdep_6ac2f3fe3de88191a30ac717f22f4482` 于 2026-10-05T00:49:13.597500Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。


## 2026-10-04 · 刷新后恢复已完成回复

聊天在最后一条已保存用户消息带有 `requestId`、但尚无助手消息时显示“恢复已完成回复”。新 `GET /api/chat` 只接收 `chatId` 与 `requestId`，在认证用户范围内验证真实对话并读取 D1 已完成响应；它不会接收或重放提示词，也不会调用模型。请求仍在处理中、属于其他用户、记录不存在或对话已删除时均失败关闭，用户可等待或使用原有显式重试。

专项验收使用真实本地 workerd/D1 与计数模拟供应商：完成态恢复后供应商调用数保持 1；处理中、跨用户及删除后恢复均拒绝。实际组件处理函数另覆盖成功恢复、服务端失败和缺少请求标识三类场景。完整入口通过：360 项应用断言、22 项消息幂等/恢复断言、83 项文档代理断言、4 项审批审计断言、26 项实际 Worker 断言、35 项本机执行器测试、10 项发送与恢复生命周期、6 项分会话草稿、TypeScript 和生产构建。真实模型 0 次、0 Token；生产浏览器和真实 DeepSeek 用量未执行，不把本地计数测试说成线上账单保证。发布终态在部署完成后补记。

发布：应用提交 `70c3caa5bcc2cacd2cfadd0ce555d96b68b6c515` 经源码状态提交 `86a8665a46eb6e0cdf4d47ea55a6091719947c7f` 部署原私人站点版本 37；部署 `appgdep_6ac2a095c42c81919de5db3bba295736` 于 2026-10-04T18:53:20.490147Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。


## 2026-10-04 · 对话请求幂等与重复计费保护

用户消息发送新增稳定 `requestId`。浏览器首次发送时生成并随用户消息保存，错误条重新发送会复用；服务端先验证当前认证用户确实拥有目标对话，再以 D1 主键原子领取。同一请求并发到达时只有领取者进入模型，其他请求明确报告处理中；完成结果在 24 小时窗口内重放且标记 `reused`，不会再次写用量。相同请求 ID 绑定不同消息被拒绝，身份相同但对话删除会清理重放记录并在模型前失败，跨用户使用相同 ID 仍各自隔离。供应商失败会释放领取，允许用户明确重试。

专项验收使用真实本地 workerd/D1 和延迟模拟供应商：两次并发请求的供应商计数保持 1，完成重放后仍为 1；另覆盖内容冲突、跨用户、删除清理、失败后显式重试和旧调用兼容，共 18 项。完整入口通过：359 项应用断言、18 项消息幂等断言、83 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript 和生产构建。本轮外部模型为模拟，真实模型请求 0 次、0 Token；生产浏览器和真实 DeepSeek 未执行，不把本地重复调用证据说成线上计费保证。发布终态在部署完成后补记。

发布：应用提交 `15c9275b55300de99b04798c6a1fb2f534d2eae2` 经源码状态提交 `360b2ba9ed83ed00b03deec1f4d2d0082ead7fff` 部署原私人站点版本 36；部署 `appgdep_6ac24afa2f80819191a7557418571f78` 于 2026-10-04T12:48:03.051079Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。


## 2026-10-03 · 对话删除与文档执行竞态保护

文档提议不再只在模型请求前检查一次对话。模型返回后保存提议、批准后的成果落库都附带真实对话存在条件；删除聊天会在同一 D1 事务清理该聊天尚未终结的 pending/executing 提议。成果记录和 completed 终态一起提交，条件失效会删除刚上传的对象和临时记录；已经完成、拒绝或过期的审计事实不因删除聊天而清除。

完整入口通过：359 项应用断言、83 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。新增验收覆盖等待模型时删除不产生迟到提议、pending/executing 级联清理、completed 审计保留与可导出，以及全部既有审批、完整性和下载负例。模型响应为模拟，真实模型请求 0 次、0 Token，生产 `DOCUMENT_TOOL_ENABLED` 保持关闭。私人发布终态在部署完成后补记。

发布：应用提交 `4adfab41bb50d48b492c28201854a08a4e47cbc1` 已部署原私人站点版本 35；部署 `appgdep_6ac1f74bd1148191a8b264872c2e7fe5` 于 2026-10-04T06:51:14.797481Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客、0 群组；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-03 · 文档提议跟随真实对话生命周期

文档工具不再把格式正确的客户端 `chatId` 直接视为真实对话。服务端在任何工具模型请求之前，验证当前用户确实拥有该聊天记录；状态同步、批准和拒绝还会确认原始对话未被删除。不存在的对话不会产生模型请求，删除对话后原待处理提议不能再查询或执行。终态审计记录继续由服务端持久事实重建，不因客户端删除或修改聊天内容而改写。

针对性验收新增 5 项：不存在对话在零模型调用时拒绝、三个真实对话保存、删除含待处理提议的对话成功、删除后状态与批准均拒绝。完整入口通过：359 项应用断言、72 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。正向流程使用真实本地 workerd/D1/R2/XLSX，模型响应为模拟。真实模型请求 0 次、0 Token，生产 `DOCUMENT_TOOL_ENABLED` 保持关闭。私人站点发布终态在部署完成后补记。

发布：应用提交 `9fe0acd302b2b32c672b86b125693977fc08f5ab` 已部署原私人站点版本 34；部署 `appgdep_6ac1a08baf248191baeaf255275b7b8f` 于 2026-10-04T00:40:53.745673Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-03 · 文档审批动作绑定原始对话

文档工具的状态同步、批准和拒绝不再只凭当前用户与提议 ID。网页同时提交当前对话 ID，服务端在恢复终态、判定过期或生成文件之前，核对隐藏提议记录的原始 `chatId`；同一所有者跨对话查询或批准、旧记录缺少绑定，以及缺少对话 ID 的直接请求均失败关闭。审计导出的上一轮保护保持不变。

完整入口通过：359 项应用断言、67 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。新增 2 项跨对话状态/批准负例；正向流程使用真实本地 workerd/D1/R2/XLSX，模型响应为模拟。真实模型请求 0 次、0 Token，生产 `DOCUMENT_TOOL_ENABLED` 保持关闭。原私人站点发布终态在部署完成后补记。

发布：应用提交 `a50287a90e675956f27554cb9941c22654f0865a` 已部署原私人站点版本 33；部署 `appgdep_6ac14dd5d50481918ce9fdef2b5496db` 于 2026-10-03T18:47:58.656389Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-03 · 审批审计绑定真实对话

文档工具模型请求现在携带网页已经保存的对话 ID，服务端把它写入当前用户隐藏的提议记录。审批审计导出除了从 D1 重建终态凭证，还逐条验证提议的权威 `chatId` 与请求对话一致；同一用户跨对话重标、旧记录缺少绑定和混合对话导出均失败关闭。对话 ID 不进入脱敏 receipt，原始工具参数继续不暴露。

完整入口通过：359 项应用断言、65 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。正向流程使用真实本地 workerd/D1/R2/XLSX；模型响应为模拟。本轮不改变依赖、迁移、secret 或访问范围；生产 `DOCUMENT_TOOL_ENABLED` 保持关闭，真实模型请求 0 次、0 Token。原私人站点发布终态在部署完成后补记。

发布：应用提交 `80ffba618f9b6a775514794731be17d6b5e2f893` 已部署原私人站点版本 32；部署 `appgdep_6ac0f998d3448191b5f79293dad02acf` 于 2026-10-03T12:48:34.195999Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-02 · 服务端权威审批审计导出

“审批凭证”下载不再直接信任聊天事件里的 receipt。网页仅从当前消息收集提议 ID，服务端按当前用户逐项读取隐藏 `tool_request` 终态，重新生成白名单凭证并组成审计包；调用方额外提交的伪造凭证字段会被忽略。最多导出 20 项，重复 ID、未完成提议、缺失记录和其他用户记录均失败关闭。原始参数、密钥、对象键和私有 URL 继续不进入导出。

完整入口通过：359 项应用断言、63 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。正向流程由真实本地 workerd/D1/R2/XLSX 完成；模型响应为模拟。本轮模型 0 次、0 Token；生产 `DOCUMENT_TOOL_ENABLED` 保持关闭，生产浏览器、Office/WPS、真实 Docker 和 Quick 同任务对照未执行。

发布：应用提交 `d9d69d47647511c365ad557cbe25e19424ec2860` 已部署原私人站点版本 31；部署 `appgdep_6ac0a43b28ec8191828fcfa4fdf66d28` 于 2026-10-03T06:44:19.314592Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-10-02 · 脱敏文档审批凭证

文档提议在完成、拒绝或过期时由服务端生成白名单凭证，包含提议 ID、工具、终态、提议 SHA-256、时间和已完成成果的 ID/名称/大小/文件 SHA-256/行列数；原始工具参数、API 密钥、对象键与私有下载地址均不进入凭证。终态事件保存在对话记录中，同一提议导出时去重；有凭证的助手消息新增“审批凭证”按钮，下载结构化 JSON 审计包。

完整入口通过：359 项应用断言、58 项文档代理与安全阀断言、4 项审批凭证导出断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。完成、拒绝、过期和幂等恢复均验证返回脱敏凭证；敏感字段负例通过。本轮模型 0 次、0 Token；模型选择仍为模拟，生产 `DOCUMENT_TOOL_ENABLED` 保持关闭，生产浏览器、Office/WPS、真实 Docker 和 Quick 同任务对照未执行。

发布：应用提交 `b6311f640adae35190c8d59d32ba0105ca9e35b7` 已部署原私人站点版本 30；部署 `appgdep_6ac04f4e6a088191a16df777ad14b0ab` 于 2026-10-03T00:42:12.633437Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有两个 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-09-28 · 文档提议内容指纹

XLSX 工具提议在保存前，对通过校验的规范化文件名、完整列名和全部单元格计算 SHA-256；审批卡显示前 12 位，完整指纹随脱敏状态响应保留。批准时服务器重新解析隐藏工具参数并复算指纹，只有与待审内容完全一致才生成文件。提议内容被修改、指纹缺失或参数失效时失败关闭，不创建 R2 对象或成果记录；旧聊天卡片缺指纹时仍可显示，但旧提议不能绕过新的服务端批准校验。

真实本地 Worker/D1/R2 负例把首行金额从 30 改为 999，批准得到完整性失败且成果总数不增加。完整入口通过：359 项应用断言、55 项文档代理与安全阀断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。本轮模型 0 次、0 Token；模型选择仍为模拟，生产工具开关关闭，生产浏览器、Office/WPS、真实 Docker 和 Quick 同任务对照未执行。

发布：应用提交 `87730f323602b7f02cb550a5a4ec765e3c85b55c` 已部署原私人站点版本 29；部署 `appgdep_6abb09b88bf081919bcca9d88e2fcc2d` 于 2026-09-29T00:43:55.161367Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-09-28 · 文档提议内容预览

XLSX 工具提议不再只显示文件名和行列数。批准前会展示最多 6 列 × 5 行的只读样例，空值明确显示为“空”，换行折叠、单元格限制 80 字，并标注尚未展示的行列数量；公式样式字符串仍按普通文本呈现。预览由通过参数校验的同一份结构化规格确定性生成，原始工具参数继续留在当前用户隐藏记录中，不进入工作区列表或前端响应。完整表格仍只在用户批准后由服务器生成并验收。

真实本地 Worker/D1/R2/XLSX 流程验证普通预览、公式样式文本、原始参数不外泄，以及 8 列 × 6 行样本被限制为 6 列 × 5 行并准确报告剩余 2 列、1 行。完整入口通过：359 项应用断言、51 项文档代理与安全阀断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。本轮模型 0 次、0 Token；模型选择仍为模拟，生产工具开关关闭，生产浏览器、Office/WPS、真实 Docker 和 Quick 同任务对照未执行。

发布：应用提交 `317c2e7f1509b2d859b82356998514a002cb238b` 已部署原私人站点版本 28；部署 `appgdep_6abab63025848191bc8fdac2632c38ca` 于 2026-09-28T18:47:24.443999Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-09-28 · 文档提议跨页面状态恢复

聊天中的 XLSX 提议卡片现在会在首次显示、标签页重新可见和到达 10 分钟失效点时向服务器核对状态。若同一提议已在另一个页面批准、拒绝或过期，当前会话会移除过时按钮、去重恢复已生成成果，并写入对应执行事件；本地时间到期时先隐藏操作，最终状态仍由服务器时间和 D1 原子更新决定。状态接口只返回当前用户的脱敏状态与已完成成果，不返回原始工具参数，跨用户仍拒绝。

真实本地 Worker/D1/R2/XLSX 验收覆盖 pending、completed、rejected、expired 四类状态恢复；过期状态同步不会生成 R2 对象或成果。完整入口通过：359 项应用断言、46 项文档代理与安全阀断言、26 项实际 Worker 断言、35 项本机执行器测试、7 项发送生命周期、6 项分会话草稿、TypeScript、生产构建及独立 OpenPyXL 读取。本轮模型 0 次、0 Token；外部模型为模拟，生产工具开关仍关闭，生产浏览器、真实 Docker、Office/WPS 与 Quick 同任务对照未执行。

发布：应用提交 `bdb47386937e4b94fcbb38a7a761d7407d13c36d` 已部署原私人站点版本 27；部署 `appgdep_6aba62da57488191bf75400d00fb29c8` 于 2026-09-28T12:51:48.737557Z 成功。环境修订仍为 3，custom 访问仅 1 位所有者、0 外部访客；既有 secret 未修改，`DOCUMENT_TOOL_ENABLED` 仍未设置。

## 2026-09-27 · 文档工具提议自动过期

发布：应用提交 `7f52aa8dedb49c0eb566fcf58a21495a52753240` 已部署原私人站点版本 26；部署 `appgdep_6aba0dbe3b588191990924dd24c7ce7c` 于 2026-09-28T06:48:41Z 成功。环境修订仍为 3，访问仍为 custom、仅 1 位所有者且无外部访客，生产文档工具开关继续关闭。

每个 XLSX 生成提议新增服务器生成的 `expiresAt`，有效期固定 10 分钟。审批接口先处理已完成/已拒绝/已过期的幂等结果，再对待处理提议进行原子过期判定；过期提议持久化为 `expired`，不会生成 R2 文件或成果记录。界面展示具体失效时间，用户在旧页面点击后会移除按钮并记录“未执行”的过期事件。前端时间只用于提示，最终以服务器判定为准。

新增真实本地 Worker/D1 过期样本，覆盖未来有效期、过期零成果、状态持久化与重复请求幂等。生产 `DOCUMENT_TOOL_ENABLED` 继续保持关闭，因此这项能力仍不冒充线上真实模型验收；本轮真实模型请求 0 次、0 Token。

## 2026-09-27 · 对话失败一键重试

发布：应用提交 `167ed125c39677a37b1f4b260bdb76b80d037e80` 已部署原私人站点版本 25；部署 `appgdep_6ab9b8c0b1f481919e438c26703b2ca0` 于 2026-09-28T00:46:04Z 成功。环境修订仍为 3，访问仍为 custom、仅 1 位所有者且无外部访客，文档工具开关未启用。

模型失败、用户停止或响应前网络错误后，错误提示现在包含“重新发送”和“关闭”。原问题仍由既有生命周期恢复到输入框；点击重试会复用会话末尾相同的用户消息，不重复新增气泡。等待失败期间如果用户已经输入新草稿，重试按钮不会覆盖或擅自发送旧内容。只修改浏览器端交互和真实处理函数回归，不改变模型提示、协议、凭据、用量记录或文档工具发布开关。

新增第 7 个发送生命周期场景，验证失败后的同问题重试只有一条用户消息；完整回归、构建和发布结果在本节后续记录。本轮不需要真实模型请求，模型用量 0 次、0 Token。

## 2026-09-27 · 未验收文档工具发布安全阀

发布：应用提交 `5f947b22e943ba523b4dbaf7c5dd847914b6a035` 已部署原私人站点版本 24；部署 `appgdep_6ab9642363d0819191357bf8cb8b728e` 于 2026-09-27T18:45:06Z 成功。环境修订仍为 3，`DOCUMENT_TOOL_ENABLED` 未设置，custom 访问仍仅 1 位所有者且无外部访客。

为避免远端候选代码阻塞其他已验证改进，新增服务器侧能力开关 `DOCUMENT_TOOL_ENABLED`。只有值严格为 `true` 时，聊天才会向模型发送 XLSX 工具定义，审批接口才接受批准或拒绝；变量缺失、空值或其他值时，含“生成 Excel”的请求仍按普通聊天完成，伪造审批请求失败关闭。生产环境不设置该变量，因此尚未完成真实 DeepSeek 验收的功能不会被意外启用，既有发送即清空与分会话草稿行为可以随同源码安全发布。

完整入口通过：359 项应用断言、38 项文档代理与发布安全阀断言、26 项实际 Worker 断言、35 项执行器测试、6 项发送生命周期、6 项分会话草稿、TypeScript 检查、独立 OpenPyXL 读取及生产构建。本轮真实模型请求 0 次、0 Token；工具开启链路仍是模拟模型，不冒充真实 DeepSeek 通过。生产浏览器、真实 Docker、Office/WPS 与 Quick 同任务对照未执行。

## 2026-09-26 · 分会话草稿恢复

发布：应用提交 `27d8ca2baf9b5606d30967792dd52ada77445ae5` 已成功部署原私人站点版本 23，部署 `appgdep_6ab868e3d6ec8191812f6eb94945e51e` 于 2026-09-27T00:53:01Z 进入 succeeded；环境修订仍为 3，custom 访问仍仅 1 位所有者且无外部访客。源码包后续只追加此发布记录。

在发送后立即清空的修复基础上，新增仅当前标签页有效的分会话草稿。新对话和每个已有对话使用独立键；切换对话、全局搜索打开对话或刷新页面时恢复对应未发送文本。发送前先删除当前草稿，失败/停止仍由既有发送生命周期只在空输入时恢复原问题。草稿最长 20000 字，只写浏览器 sessionStorage，不上传服务端，不保存附件、模型密钥或其他工作区数据；关闭标签页后由浏览器清除。存储不可用或被策略拒绝时静默退回普通输入，不阻断对话。

完整入口通过：357 项应用断言、26 项实际 Worker 断言、35 项执行器测试、6 项发送生命周期场景、6 项分会话草稿场景、类型检查和生产构建。本轮真实模型请求 0 次、0 Token。自动化浏览器成功到达正式站点登录页，但没有可用登录会话且未输入凭据，因此生产发送、停止、切换与刷新仍未做浏览器端到端；不降低鉴权或把本地测试冒充线上通过。部署结果随后记录于 RELEASE_STATUS.json。

## 2026-09-26 · 修复发送后输入框残留

发布：应用提交 `652d8950593821ea1b0c8916ba58d5f70eaa1051` 已成功部署私人版本 22，时间 2026-09-26T18:41:20Z；生产构建通过，访问范围和 secret 保持原配置。源码包后续仅补发布记录。

用户截图显示已发送消息仍留在输入框。根因是清空发生在模型成功返回后。现在通过发送前校验后立即清空；成功响应不再清空等待期间的新草稿。模型响应之前失败/取消且输入框仍为空时恢复原问题；有新草稿时不覆盖，响应成功后的保存错误也不恢复旧问题。仅改前端草稿生命周期，模型协议、提示词、凭据、附件行为不变，无新依赖或迁移。

完整入口通过：357 项应用断言、26 项 Worker 断言、35 项执行器测试、6 项真实发送处理函数的延迟 IO 场景和类型检查。新增场景覆盖立即清空、等待期间新草稿、取消恢复、取消保留新草稿、回复后保存失败以及模型未配置时保留输入。IO 为模拟，不是生产浏览器或真实模型验收。模型调用 0 次、0 Token。生产浏览器、Docker/Office 真实流程本轮未执行；不沿用历史成果作为本轮实测。发布结果见 RELEASE_STATUS.json。

## 2026-09-22 · 受限中文任务简报编译器

**目标与实现**：新增 `/api/text-plan` 和本机任务台简报入口，只接受一行可选说明及 1–10 条逐行编号的“标题：正文”。编译结果固定为文档生成 → LibreOffice DOCX/PDF → Poppler 预览 → ZIP 与成果验收，不允许自然语言注入代码、连接器或任意命令。计划保存 `deterministic_document_brief_v1`、源文本 SHA-256、条目数与人工审阅提示；修改后必须再次通过既有计划校验才能提交，断点重试继续保留来源证据。畸形行、重复标题、超限内容及伪造来源元数据均失败关闭。本轮未引入模型规划或新依赖、迁移、secret。

**真实流程**：受保护 localhost 接收两条中文简报，生成 7 项固定 DAG 和 5 条验收标准；两个真实 LibreOffice 渲染重叠执行，产出 2 个 DOCX、2 个 PDF、2 页 Poppler 预览及含 6 个成果的 ZIP，HTTP 下载字节和清单 SHA-256 全部复验通过。两页均逐页目视检查，中文可见且未见裁切/重叠；取消后断点重试、内容验收负例、预算与公平调度同步通过。初次运行因宿主未注册中文字体被预检正确拒绝，恢复项目既有 Noto Sans CJK SC Fontconfig 后重新完整执行通过。证据见 `tests/acceptance/local-text-plan-2026-09-22.json`。

**回归、发布与边界**：357 项应用断言、26 项实际 workerd 断言、35 项执行器测试、TypeScript 检查及生产构建通过。应用提交 `4d56e22fa0ab42a02be56de4def1bb4c215184ae` 已部署原私人站点版本 21；部署 `appgdep_6ab2cf0020e481918428604edd319027` 于 2026-09-22T18:55:20.330064+00:00 成功，环境修订仍为 3，访问范围和 secret 未改变。本轮真实模型请求 0 次、0 Token。编译器是确定性规则工具，不理解模糊目标、不拆解表格/代码/外部动作，也不能替代人工计划审阅。Docker 等真实代码隔离、生产浏览器、Microsoft Office/WPS 与 Quick 同任务对照未执行，不宣称超越 Quick。

## 2026-09-22 · 多批次公平并发调度

**目标与实现**：把原先按批次顺序填满全局线程池的调度改为 `fair_round_robin`。每轮对各就绪批次最多分派一个任务，再循环补齐空闲槽；全局并发为 1 时从上次分派后的批次继续，避免大批次持续抢占。单批 `maxConcurrency`、全局并发、依赖、预算、取消和失败阻断继续同时生效。运行状态新增分派次数、观察到的单批并发峰值；每个 started 事件记录策略与排队秒数。旧持久化批次自动补兼容调度元数据，无迁移、依赖、secret 或模型逻辑变化。

**真实流程**：在受保护 localhost 同时提交两个独立文档批次，每批各 4 个任务；首轮各获得一个生成槽，随后两个真实 LibreOffice DOCX/PDF 渲染在时间线上重叠，两个批次最终均通过 Office/PDF/ZIP 成果验收，各记录 4 次公平分派。原两份中文文档 7 项 DAG、取消后重试、单批串行预算和成果超限负例也同步重跑通过。证据见 `tests/acceptance/local-fair-scheduler-2026-09-22.json`。

**回归、发布与边界**：357 项应用断言、26 项实际 workerd 断言、33 项执行器测试、TypeScript 检查及生产构建全部通过。应用提交 `ad72be82b6d2e157e65594b47fbe7683a2acacbd` 已部署原私人站点版本 20；部署 `appgdep_6ab2792228c48191b1025d3fd3bb4ce8` 于 2026-09-22T12:48:44.466576+00:00 成功，环境修订仍为 3，访问范围与 secret 未改变。公平性只覆盖当前单机进程的就绪批次，不是分布式队列、组织优先级、预约资源或 SLA。Docker/Podman 仍不可用，bwrap/user namespace/Landlock 仍受宿主限制，真实代码沙盒未执行；代码任务继续失败关闭。生产浏览器、Office/WPS、GenOffice 原生渲染和 Quick 同任务对照未执行。本轮模型请求 0 次、0 Token。

## 2026-09-22 · 单批运行预算与并发策略

**目标与实现**：计划新增严格校验的 `policy`：`maxConcurrency` 1–4、`maxRunSeconds` 1–3600、`maxArtifactBytes` 1–500000000。执行器同时遵守全局和单批并发上限，持续汇总已经完整性验证的唯一成果字节与墙钟时间；超限只记录一次 `budget_exceeded`，停止未启动/运行中步骤，把批次判为 failed，并将成果验收标为 not_run。任务台显示限制和实际用量。断点重试保留原策略，复用成果也计入新尝试预算。旧计划/旧批次缺策略时使用保守兼容默认值；无新依赖、迁移、secret 或模型逻辑。

**真实流程**：受保护 localhost HTTP 实际运行两份互不依赖的中文文档，单批并发限制 1；第二项开始时间晚于第一项结束，实际成果 2722 字节，证明没有重叠。独立负例将成果上限设为 1 字节，任务生成并校验 1376 字节 FODT 后，批次按预期 failed、验收 not_run。原两份中文文档的 7 项 DAG、LibreOffice 并发 DOCX/PDF、Poppler 预览、6 文件 ZIP、5 条成果验收，以及取消后断点重试同时重跑通过。证据见 `tests/acceptance/local-budget-2026-09-22.json`。

**回归、发布与边界**：Docker/Podman 不存在；bwrap 创建网络路由套接字失败，用户/网络命名空间 uid_map 被拒绝，Landlock 不可用。因此代码任务仍不会在主机裸跑，真实代码隔离不算通过。357 项应用断言、26 项实际 workerd 断言、31 项执行器测试、TypeScript 检查及生产构建全部通过。应用提交 `8b4813a869ed81d2fc7bd381c3792379d9b5481e` 已部署原私人站点版本 19；部署 `appgdep_6ab2246da29481919a2821c692842469` 于 2026-09-22T06:47:30.308620+00:00 成功，环境修订仍为 3，访问范围与 secret 未改变。运行预算减少资源失控风险，但不是 OS 隔离、计费配额或多租户调度。生产浏览器、Office/WPS、GenOffice 原生渲染和 Quick 同任务对照未执行。本轮模型请求 0 次、0 Token。

## 2026-09-22 · 可控断点重试

**目标与实现**：为失败、取消或执行器重启中断的本机批次提供显式“重试未完成步骤”。新尝试保留 `retryOf` 和递增 `attempt`；已成功步骤只有在 verification 存在且所有成果重新通过路径、大小和 SHA-256 检查时复用，并记录 `reusedFrom`/时间线事件。失败、取消、阻塞和中断步骤恢复为 pending，继续使用原依赖图与成果验收。成果验收失败但所有步骤成功时拒绝原样重跑，提示先修改计划；成功批次、仍在运行批次和被篡改成果同样拒绝。重试始终创建新批次，不改写历史状态，不自动重放。

**真实流程**：经受保护 localhost HTTP/DAG 运行两份中文文档，在两个 LibreOffice 渲染步骤开始后明确取消；源批次最终 cancelled，两份已生成 FODT 保持 succeeded。调用重试接口后，两份源文档按原 verification 复用，未再次生成；DOCX/PDF、Poppler 预览和 ZIP 汇总重新执行，最终 7 个任务及 5 条验收标准全部通过。普通正向/内容拒绝流程也重跑通过。证据见 `tests/acceptance/local-retry-2026-09-22.json`。

**回归、发布与边界**：357 项应用集成断言、26 项实际 workerd 断言、28 项执行器测试、TypeScript 检查及生产构建全部通过。应用提交 `5b65119d10c9606df35c05d89aab983d04ab6b36` 已部署原私人站点版本 18；部署 `appgdep_6ab1d15274f481919d6a44543a8613e1` 于 2026-09-22T00:52:44.853038+00:00 成功，环境修订仍为 3，访问范围和 secret 未改变。这是用户触发的本机文件任务续跑，不是自动重试策略、事务补偿或云端后台队列。外部副作用仍不自动重放；本机代码沙盒仍必须先通过 Docker 能力检查。本轮模型逻辑不变，真实模型请求 0 次、0 Token。源码包只追加本条和终态清单。

## 2026-09-21 · 可执行成果验收标准

**目标与实现**：在既有文件完整性证据之上增加内容/规格验收，而不是把“进程退出且文件存在”当成业务成功。任务计划最多声明 20 条 `artifact_exists`、`text_contains` 或 `json_equals` 标准，绑定具体任务和唯一扩展名成果；支持文件大小范围、UTF-8 精确文本及最多 10 段的 JSON 标量路径。执行器完成全部步骤后重新核对成果路径、字节数和 SHA-256，再执行标准；不达标时任务步骤保留 succeeded，批次明确 failed，并记录 `acceptance_failed`。任务台显示验收计划、逐项证据和失败原因。文档/表格规则计划默认要求每份 Office/PDF 及最终 ZIP；旧计划没有验收项时保持兼容。本轮无依赖、数据库迁移、云端 secret 或模型逻辑变化。

**真实流程**：受保护 localhost HTTP/DAG 实际并发生成两份中文文档，经 LibreOffice 产出 2 个 DOCX、2 个 PDF，Poppler 生成 2 页预览并汇总 6 个文件；5 条默认成果标准全部通过，下载与 ZIP 哈希复验通过。另一个真实 HTTP 计划的文档步骤成功，但缺少要求文本“已批准发布”，批次按预期失败，证明标准会影响交付状态。证据见 `tests/acceptance/task-acceptance-2026-09-21.json`。GenOffice 本轮未改动；环境重置后官方安装包恢复下载持续过慢，未把未完成恢复冒充真实 GenOffice 重跑。

**回归、发布与边界**：357 项应用集成断言、26 项实际 workerd 断言、26 项执行器测试、TypeScript 检查及生产构建通过；外部服务在集成回归中为模拟。应用提交 `d70b26fec178076995198d89cf0976a3c5d725e1` 已部署原私人站点版本 17，部署 `appgdep_6ab17f5646f48191b01915ebfb495b71` 于 2026-09-21T19:02:58.085477+00:00 成功，环境修订仍为 3；未改变访问范围或 secret。本轮模型请求 0 次、0 Token。文本检查是精确包含，不是语义评审；JSON 只比较标量；不支持任意脚本断言。生产浏览器、Office/WPS、GenOffice 原生渲染和真实 Docker 隔离仍未验收；没有 Quick 同任务对照，不宣称超越。源码包只追加本条和终态清单。

## 2026-09-21 · Office 编辑检查点与冲突保护

发布收尾：完整回归和生产构建通过后，应用提交 `551d60e13a027ec6eb024ff0b171dff41e38e736` 已部署原私人站点版本 16；部署 `appgdep_6ab1281977348191a70c71e8fa930cb6` 于 2026-09-21T12:50:46.286388+00:00 成功，环境修订仍为 3。首次推送使用的短期凭据过期，按既定流程刷新后一次成功；未改变访问范围或 secret。源码包只追加本条和终态清单。

**目标与实现**：接续成果完整性验收，为 `docs_apply`、`sheet_apply`、`slides_apply` 增加可下载的 `edit-checkpoint.zip`。检查点保存编辑前原件及前后 SHA-256；引擎若原位修改输入会停止交付。新增独立恢复工具，只在当前文件哈希与该次编辑结果一致时生成新的恢复副本；目标已存在、检查点异常或当前文件已有后续修改均拒绝，不覆盖任何现有文件。线上页面补充明确说明。本轮无新依赖、迁移、secret 或模型逻辑。

**环境恢复与真实验收**：临时 GenOffice 安装因环境重置丢失，首次真实测试在能力预检处失败且未计为通过。随后从官方 v0.10.639 发布恢复 Debian 包，SHA-256 为 `33ac55225349a08c220474692cc05c3e45a81a8f6bc8f72312696736547da249`。恢复后经受保护 localhost HTTP/DAG 完成 23 项任务和 42 个下载成果；5 次 Word/Excel/PowerPoint 编辑均生成检查点，5 次恢复均与编辑前哈希相同，5 个有后续改动的当前文件全部拒绝恢复。另执行真实命令行恢复成功。证据见 `tests/acceptance/office-checkpoint-2026-09-21.json`。

**全量回归与边界**：357 项应用集成断言、26 项 workerd 断言、23 项执行器测试及 TypeScript 检查通过；生产构建和发布终态在本节收尾更新。模型 0 次、0 Token。检查点证明字节级可恢复，不证明编辑语义正确；生产浏览器、Office/WPS、GenOffice 原生渲染和 Docker 隔离仍未验收。本轮三类兼容性预览实际执行，但未重复进行页面目视检查，因此不新增视觉质量结论；无 Quick 同任务对照。

## 2026-09-21 · 参考 OpenWorkBuddy：成果完整性验收

发布收尾：全量回归、类型检查、生产构建及 37 个既有真实 GenOffice 成果的重启/下载/篡改拒绝验收再次通过；本次收尾未重新生成这些文档，不冒称新的引擎生成样本。应用提交 `66f2086a50c0c5076361d6c2e7d6a045c227962d` 已发布原私人版本 15，部署 `appgdep_6ab0d0e1c1d08191b55b1aec1a5f723f` 于 2026-09-21T06:38:38.644410+00:00 成功，环境修订仍为 3。未改变权限或 secret。源码包只增加本条及终态清单；模型调用仍为 0。

接续远端 `8626fb058dd27e0d0f00580a3068dae74c58f0ba`，尊重用户新指定参考项目。检查固定上游 `1a88f5839f8086fda76d220bff3ae22405ec3df9` 的许可证和目标/检查点/工作类型设计；核心为非商业许可，本轮未复制核心代码，独立实现现有执行器功能。

**实现**：成功前验证文件真实存在、非空、归属、大小、SHA-256；符号链接/特殊文件/重复清单/伪造结果拒绝。证据持久化，依赖执行前复验，HTTP 返回同一份已核验字节。任务卡提供证据明细；旧任务保留原文件但需重跑才能获得下载证据。Web 入口说明同步，需更新本机执行器。无新依赖、迁移、secret 或模型逻辑。

**自测**：全量 357 应用断言、26 workerd 断言、22 执行器测试、类型检查、构建通过。真实 GenOffice 23 任务成功，37 成果重启后通过保护 HTTP 复验；同大小改动及删除返回 400，恢复后下载成功。另两份 Word/两份表格各 7 任务与 ZIP 下载通过。GenOffice DOCX/XLSX/PPTX 各 1 页视觉检查通过（中文可读、无裁切）；额外 Word/表格只检查机器结果。模型 0 次 / 0 Token。源证据见 tests/acceptance/openworkbuddy-integrity-2026-09-21.json。

**边界**：文件完整性不保证语义正确；未新增模型自主循环、文件回退、生产浏览器或 Docker 实际隔离。下一轮优先编辑检查点和冲突保护。发布终态随后记录在本节及 RELEASE_STATUS.json。

## 2026-09-21 · GenOffice 成果的 LibreOffice 逐页预览

**目标与实现**：把此前独立的兼容性渲染验证接入真实本机任务链。`render` 现在只接受 DOCX/XLSX/PPTX/PDF，Office 文件以独立 LibreOffice profile 转为 PDF，再由 Poppler 校验页数并生成最多 20 页 PNG；缺任一工具、PDF 异常、页数越界或图片不完整均失败关闭。任务返回和 JSON 报告明确 `LibreOffice + Poppler`，不再把兼容性预览混称 GenOffice 原生渲染。环境继续采用白名单，不向文档子进程传递模型或主加密密钥。无新依赖、迁移或 secret，模型逻辑未改。

**真实验收**：官方 GenOffice Linux v0.10.639 / CLI 0.10.0 经受保护 localhost HTTP 与 DAG 完成 23 项任务；GenOffice 新建/编辑的 DOCX、公式已刷新 XLSX、PPTX 分别由 LibreOfficeDev 26.8.0.0.alpha0 与 Poppler 26.05.0 渲染 1 页。三页 PNG 文件头、任务下载字节、报告页数和引擎字段通过，并逐页查看：中文可读、无裁切或重叠。公式已知答案继续为同表 SUM 35→43、跨表 SUM 35→43、引用乘法 24→40。证据见 `tests/acceptance/genoffice-office-preview-2026-09-21.json`。本轮模型请求 0 次、Token 0。

**边界**：这是 LibreOffice 兼容性预览，不是 GenOffice 原生 `render`、PDF 转换或 OCR 验收。Microsoft Office、WPS、生产浏览器下载、任意复杂模板和不可信文档沙盒仍未验证；没有 Quick 同任务对照，不宣称超越。完整回归、发布和源码包终态在本节收尾更新。

**回归与发布**：357 项应用集成断言、26 项实际 workerd 断言、18 项本地执行器测试、TypeScript 检查及生产构建通过。外部模型、搜索和连接器仍为模拟；本轮不改模型，真实模型 0 次、0 Token。应用提交 `f46504c899e7fa430de02a0493b8940f02b917b3` 已部署原私人站点版本 14，部署 `appgdep_6ab07fb6e488819199660a9f4e806999` 于 2026-09-21T00:52:16Z 最终 succeeded，环境修订仍为 3；未改变访问范围或既有 secret。本源码包只追加发布终态记录，应用代码与线上一致。

## 2026-09-20 · GenOffice 跨工作表重算审计

发布收尾：应用提交 `ac9bac4ad0015dfcb0e3aedf276a242bb299e1b6` 已部署到原私人站点版本 13，部署 `appgdep_6ab02a06b5f0819196fa607408049d4a` 于 2026-09-20T18:46:40Z 最终 succeeded，环境修订仍为 3。未改变访问范围、既有服务端 secret 或站点标识；本源码包只追加发布终态记录。

**目标与实现**：接续版本 12 的普通公式重算，不重复同表样例。公式扫描现在同时提取缓存值和类型；原生重提交后复验公式集合完全不变、每个公式都有缓存，再把涉及工作表、变化总数及最多 100 条 `{sheet, cell, before, after}` 写入任务报告。超过 100 条只截断明细、不截断总数。共享、数组、结构化及超过 1000 个公式仍失败关闭。无新依赖、迁移或 secret，模型逻辑未改。

**真实验收**：官方 Linux v0.10.639 / CLI 0.10.0 经受保护 localhost HTTP、DAG 和文件下载完成 20 项任务。两表样例在“明细”页把 B2 从 12 改为 20 后，“汇总”页 SUM 缓存 35→43、直接引用乘法 24→40；报告准确记录两项变化，输出重新打开且公式集合不变。输出 SHA-256 `587a73933a16c72dd47a3cfce3f25af78e6ca7438503ca0a9cc6c64a3d5a75e0`，证据见 `tests/acceptance/genoffice-cross-sheet-2026-09-20.json`。本轮未发模型请求，0 Token。

**边界**：真实样本只覆盖 SUM 和乘法。错误值、常用函数、大型工作簿、共享/数组/结构化公式、Excel/WPS、GenOffice 自带渲染和生产浏览器仍未验收或明确拒绝；没有 Quick 同任务对照，不宣称超越。完整回归、发布和源码包终态在本节收尾更新。

**回归门槛**：357 项应用集成断言、26 项实际 workerd 断言、17 项本地执行器测试、TypeScript 检查及生产构建通过。外部模型、搜索和连接器仍为模拟；本轮不改模型，真实模型 0 次、0 Token。发布与源码包终态见 `RELEASE_STATUS.json`。

## 2026-09-20 · GenOffice 公式缓存安全刷新

发布收尾：应用提交 `8c9a8e6b542875e8031da15b77335e2e6dc7ac7c` 已部署到原私人站点版本 12，部署 `appgdep_6aafd5ea162c81919f362443db2c3f6d` 于 2026-09-20T12:47:47Z 最终 succeeded，环境修订仍为 3。未改变访问范围、既有服务端 secret 或站点标识；本源码包只追加发布终态记录。

**目标与实现**：接续已上线的 GenOffice 首版，不重复入口或只改文案。实测确认上游 0.10.639 在普通 `set_cell` 后会保留依赖公式旧缓存，因此编辑副本后解析 OOXML 普通公式，再通过同一个 GenOffice 原生 `sheet apply --cells` 全量重提交。只有返回状态成功、公式数量一致、`cached_values` 明确为真且输出公式结构可重新解析时才交付。共享、数组、结构化、空公式体或超过 1000 个公式失败关闭；原上传文件始终不覆盖。无新依赖、迁移或 secret，模型逻辑未改。

**真实验收**：官方 Linux v0.10.639 / CLI 0.10.0 经受保护 localhost HTTP、DAG 和文件下载完成 18 项任务。公式样例初值 B2=12、B3=23、B4=`SUM(B2:B3)` 缓存 35；把 B2 改为 20 后，原生公式重提交 1 个，重新打开读取 B4=43。输出 SHA-256 `80372861d991de10b020e07df098edcab94611c40e2e38b694971ef5feafa43e`，摘要证据见 `tests/acceptance/genoffice-formula-refresh-2026-09-20.json`。本轮未发模型请求，0 Token。

**边界**：这不是任意 Excel 公式引擎认证。跨工作表、共享/数组/结构化公式、大型工作簿、Excel/WPS、GenOffice 自带渲染和生产浏览器仍未通过；这些路径不宣称可用。完整回归、发布和源码包终态在本节后续收尾记录中更新。

**回归门槛**：357 项应用集成断言、26 项实际 workerd 断言、17 项本地执行器测试、TypeScript 检查及生产构建通过。外部模型、搜索和连接器仍为模拟；本轮不改模型，真实模型 0 次、0 Token。发布与源码包终态见 `RELEASE_STATUS.json`。

## 2026-09-20 · GenOffice 首版集成与聊天文件下载

发布收尾：完整应用提交 `66583b7e51e20f355eef551cd273eb3ce4281717` 已部署原私人站点版本 11，部署 `appgdep_6aaf8278636c8191a1c0d91fd85074f0` 最终 succeeded（2026-09-20T06:52:00Z），环境修订仍为 3。凭据过期后按正常流程刷新并重试推送成功；未改变访问范围或密钥。源码包只额外追加发布记录，应用代码与线上一致。

接续远端 main `8e248999dbe5ef054c46a384e67ea8b30e0a2757`，保留并完成上一执行环境中未提交的 GenOffice 改动。原 Git 工作区可恢复，缺失临时运行依赖重新从官方 Linux v0.10.639 包提取，未重建站点，未覆盖用户文件。

实现：本地执行器新增固定命令的 GenOffice 操作类型和受保护计划端点；创建/读取/编辑/检查 DOCX/XLSX/PPTX、转换、渲染命令入口；网页及本机控制台可准备并审阅计划，操作结果含报告与下载。聊天回复直接提供 Word/PowerPoint/PDF，以及标准 Markdown 表格的 XLSX 下载、多表选择和 GenOffice 计划交接。网页即时导出使用既有导出器，不冒称 GenOffice。无模型自主编辑或云端自动配对。

真实验收：官方 CLI 经受保护 localhost HTTP 和 DAG 完成 16 项任务；Word/PPT 创建、编辑、读回、检查、结构与 Markdown 转换，XLSX 创建/检查/读取和无公式表格修改通过；SUM(12,23)=35，下载字节与服务端文件一致。DOCX/PPTX 解包验证中文修改。独立 LibreOffice/Poppler 渲染 Word、Excel、PowerPoint 共 3 页，逐页检查中文可读、无裁切重叠；这不是 GenOffice 自带渲染验证。证据 `tests/acceptance/genoffice-2026-09-20.json`。

实测缺陷：上游在修改公式前置单元格后仍缓存旧结果 35（应为 43）。不能算通过；现已阻止对含公式工作簿执行 sheet_apply，保持原件不变，新增明确错误与零引擎调用回归。修改纯数值表格另测通过。不把此限制包装成重算问题已修复。

完整回归：357 项集成断言、26 项 workerd 断言、16 项本机执行器测试、类型检查和生产构建通过；外部服务模拟部分保持明确标识。生产受保护 workspace 预检返回 401，未伪造身份或绕过登录。未发模型请求，0 Token；未通过真实验收的模型提示改动从候选中移除，模型逻辑保持线上原样。GenOffice 自带渲染/PDF/OCR、浏览器端到端、Docker 隔离和 Office/WPS 仍未验收。发布终态见 RELEASE_STATUS.json，按门槛同步原私人站点。

下一步优先解决公式重算、完整桌面渲染和合法身份下自然语言到文档的模型验收，再推进自动工具循环；仍没有 Quick 同任务对照。

## 2026-09-20 · 同步私人线上版本 10

用户明确要求线上版本同步更新。已核对远端 main 与本地一致，发布完整应用提交 `3e712120c335c8ef6695a3205328ccdd939afd53`。本次只同步既有候选，没有新增功能或更改模型逻辑。

完整回归重跑通过：348 项应用集成断言、26 项 workerd 断言、13 项本地执行器测试、类型检查和当前 Sites 生产构建。真实模型调用 0 次、0 Token。LibreOffice 真实表格及逐页检查沿用同一应用提交的本轮证据，本次发布收尾没有重跑；生产浏览器和真实 Docker 验收仍未执行或受阻。

版本 10 部署终态 succeeded，部署 ID `appgdep_6aaf4b117844819195427568a4565f5e`，环境修订仍为 3；原私人访问和密钥保持。线上新增本地任务页面、文档/表格规则计划导出及启动说明；本机服务仍须单独启动，没有自动云端配对。缺 Docker 时拒绝代码执行，不能把网站已上线当成代码沙盒已验收。后续已验证的 Web 功能按要求同步，沙盒缺口单独记录。

源码包追加本发布记录与状态清单，应用代码与线上一致；代码说明、部署说明和自测矩阵同步更新。下一轮优先补真实 Docker 验收或继续可独立验证的本地任务能力，不宣称超越 Quick。

## 2026-09-20 · 本地表格并发生成与渲染候选（未部署）

**接续与目标**：从远端最新 main `47f322f4c1b67ebb4888053146d9c7e333062d5a` 接续，不重复文档成果包。本轮将 LibreOffice 本机链路扩展到企业表格：批量粘贴中文 CSV，独立任务并行生成可编辑 Excel、PDF、逐页预览和统一成果包。

**实现**：新增 `spreadsheet → sheet_render → sheet_preview → bundle` 任务链及受保护的 `/api/sheet-plan` 本地端点；本地控制台支持每批 1–5 份表格，站点“本地执行”页可导出单表计划。标准库 CSV 解析限制为 4 万字符、200 行、30 列；不规则行补空。生成转义后的 FODS，首行蓝色表头、单元格边框、横向一页宽；有限十进制保留数值类型，公式样式输入始终作为文本。LibreOffice 独立 profile 生成 XLSX/PDF，Poppler 渲染预览，最后沿用带 SHA-256 清单的成果 ZIP。没有接收现有 Office 文件、宏或任意 XML。

**真实验收**：通过 localhost HTTP 创建并执行两份合成中文表格，共 7 个任务全部成功；两个 LibreOffice 表格转换任务真实重叠约 26.702 秒。解析生成的两个 XLSX：35、36.5 保持数值，中文姓名/设备/状态完整，`=1+1` 保持字面文本，活动公式节点为 0。PDF/PNG 文件头、ZIP CRC、6 个载荷哈希、HTTP 下载字节均通过；两页 PNG 全部查看，中文可读，无裁切或重叠。初次测试误要求两份独立表格都出现 35 而失败，修正测试按各自已知答案断言，生产代码未因测试失败放宽，再以空目录重跑通过。证据见 `tests/acceptance/local-runner-spreadsheet-2026-09-20.json`。

**完整回归与费用**：类型检查、348 项应用集成断言、26 项实际 workerd 断言、13 项本地执行器测试和生产构建通过。外部模型、搜索、连接器仍为模拟；本轮真实模型请求 0 次、0 Token。此前文档链路的真实文件验收没有重跑，仍保留历史证据。

**发布决定与边界**：真实 Python/JavaScript 隔离仍受当前宿主能力阻断，本轮没有新的沙盒通过证据，因此候选继续未部署，原私人站点保留版本 9。新表格功能从 CSV 生成新文件，不保留现有工作簿公式、图表、图片、合并单元格、条件格式或宏；Microsoft Excel/WPS、跨平台和生产浏览器均未验证。规则拆解不是自主代理，也没有 Quick 同任务对照。

## 2026-09-19 · 并发成果汇总与隔离环境恢复复核（未部署）

**接续与目标**：从远端最新 main `fc9de3c312ea47c1e4d00bd7f59fa93840d20003` 接续，不重复上一轮基础 DAG。目标是在多份文档并行完成后提供单一、可校验的交付包，并按用户要求主动解决沙盒环境问题。

**实现**：新增 `bundle` DAG 节点；它等待所有 Word/PDF 转换和逐页预览成功，重新校验每个成果位于执行器数据根目录且不是符号链接，再生成 `muyun-deliverables.zip`。ZIP 内按任务 ID 隔离文件名，包含 2 份 DOCX、2 份 PDF、2 页 PNG 与 `MANIFEST.json`；清单记录来源、字节数和 SHA-256。限制为 1–20 个依赖、50 个文件、原始及压缩后均不超过 50MB；任一依赖失败则沿用 DAG 语义阻断汇总。站点导出的计划和本地规则计划都增加最终汇总任务。

**真实验收**：真实 localhost HTTP 流程完成 2 份中文文档、7 个任务；两个 LibreOffice 转换确有时间重叠，7 项全成功。下载 ZIP 与服务端字节一致，ZIP CRC 通过，6 个载荷与清单路径集合完全一致，逐文件 SHA-256 全部复算通过。两页 PNG 再次逐页查看，无缺字、裁切或重叠。完整回归通过类型检查、348 项应用集成断言、26 项实际 workerd 断言、12 项本地执行器测试和生产构建。证据见 `tests/acceptance/local-runner-bundle-2026-09-19.json`。本轮模型请求 0 次、0 Token。

**环境恢复结论与发布决定**：实际探测 Docker、Podman、bwrap、user/network namespace 和 Landlock。前两者未安装；bwrap 与 namespace 被宿主拒绝；Landlock 调用被宿主过滤为 ENOSYS。曾构建最小原型探测，但因无法运行真实攻击用例，未把未验证的隔离代码提交。现有 Docker 后端继续失败关闭，不在主机裸跑代码。代码沙盒核心门槛仍未满足，因此不部署，线上继续为私人版本 9；本轮候选源码照常提交和打包。

**边界与下一轮**：成果 ZIP 是本地规则文档交付，不是模型自主规划、多个代理汇总或任意 Office 文件处理。生产浏览器、本机浏览器、Microsoft Office/WPS 和 Quick 同任务对照未执行。下一轮需要不同的、具备 Docker 或等效隔离能力的授权环境，才能完成真实 Python/JavaScript 沙盒验收；在同一宿主重复探测不会产生新证据。

## 2026-09-19 · 本地并发执行与 LibreOffice 首版候选（未部署）

**基线与发布决定**：从原仓库最新 main `6eddfda7022cadb54216b0f6684403049b488645` 接续；本轮未创建站点、未修改私人访问或现有 secret。线上保留版本 9（功能 SHA `7a39fbd4cb785f136a8531c34c84fa7101ed085c`）。Docker 真实隔离验收未完成，因此候选不部署，提交源码供下载和后续接续。

**验收目标与实现**：响应用户新增优先项，建立独立本机执行器：文档规则拆解为生成 → LibreOffice 转换 → 逐页预览的 DAG；独立任务默认并发 2（上限 4），依赖等待、失败阻断、取消、日志、SQLite 状态、重启中止且不自动重放。单用户回环 HTTP 控制台校验 Host、Origin 和会话头，成果按成功任务白名单下载。站点新增本地执行说明及计划 JSON 导出；本机导入后明确提交执行，没有悄悄向本机发请求或共享云端密钥。Python/JavaScript Docker 适配器限制网络、用户、资源、只读输入和运行时间；环境缺失明确拒绝，绝不裸跑用户代码。

**本轮实际结果**：完整入口通过 TypeScript、348 项应用集成断言、26 项实际 workerd 断言及 11 项本地执行器测试；生产构建通过。应用外部模型/搜索/连接器及对象存储仍为模拟，执行器调度回归中部分工作内容为替身，不能称真实服务全绿。独立真实本机 HTTP 用户流程通过计划生成、校验、提交、状态轮询、成果下载；两份合成中文文档共 6 个任务成功，两个 LibreOffice 渲染任务重叠约 1.451 秒，生成 2 份 DOCX、2 份 PDF、2 页 PNG。DOCX 文本、PDF/PNG 文件头和 HTTP 下载字节验证通过；全部 2 页实际查看，无缺字、裁切、重叠。证据见 `tests/acceptance/local-runner-2026-09-19.json`。

**失败保留与修复**：首次环境缺中文字体导致中文空白，判失败；配置现有 Noto CJK 后重跑，修正字体探测语言区域和标题亚洲字体字号。测试曾错误假设 DOCX 文本在 XML 中连续，改为按文本节点解析，不降低正文校验。新增缺中文字体时拒绝入队回归。本地浏览器导航被客户端 `ERR_BLOCKED_BY_CLIENT` 阻断，未绕过；生产浏览器登录及 UI 本轮未执行。真实代码沙盒测试退出 1：无可用 Docker/运行镜像；替代隔离环境探测也无权限，不降级绕过。只验证了 Docker 命令构造与拒绝路径，未证明容器实际隔离。

**费用与边界**：本轮真实模型请求 0 次、0 Token。当前是规则拆解，不是 LLM 自主拆解/多代理协作；云端与本机仅手工 JSON 交接。LibreOffice 在受控主机子进程运行，只接受转义生成的文档，不是通用沙盒；未提供任意 Office 上传转换、复杂表格/图表模板或 Microsoft Office/WPS 验证。历史 XLSX/PPTX/CSV 视觉验收未重新运行。没有 Quick 同任务对照，不能宣称超越。

**下一轮**：优先在具备 Docker 的授权环境运行真实 Python/JS、断网、只读根、超时、日志限制和取消清理验收；补本机浏览器完整交互，再推进模型自主规划与云端配对。仍执行完整旧功能回归和源码交付；缺容器环境不反复声称沙盒已完成。

## 2026-09-17 · 流程运行前检查与生产登录预检

**发布终态**：原私人站点版本 9 已于 `2026-09-17T00:54:04.962938+00:00` 部署成功，线上功能源码为 `7a39fbd4cb785f136a8531c34c84fa7101ed085c`，环境修订 3。站点仍为 custom 私人访问，允许用户数 1、群组数 0；没有修改现有 secret。本段终态和交付清单属于部署后的文档提交，不重复部署。

**验收目标**：在启动自动化前，用确定性检查明确阻断结构错误并展示执行边界，让用户在产生模型、搜索或连接器调用前看到流程规模、可达步骤、外部动作和人工确认点。本轮不重复模型连接、XLSX 或 PPTX 改进。

**实现**：新增 `inspectNodes` 预检引擎、受保护的 `POST /api/jobs` 检查操作及自动化编辑器的“运行前检查”报告。它检查 1–30 步限制、ID 合法性/重复、节点类型、连接器与操作配置、知识空间、空指令、分支目标、向后跳转、未知/缺失/未来变量引用及不可达步骤，并汇总模型、知识、联网、外部操作、人工确认和可达步骤数。预检本身不执行流程、不调用模型、不触发连接器；真正的外部动作仍必须运行到对应步骤后明确确认。保存和启动流程继续复用同一验证器，错误配置不能绕过 UI 直接运行。

**验证**：完整 `node scripts/self-test.mjs` 通过类型检查、全部 **348 项**集成断言及 **26 项**实际 workerd 运行时断言；当前 Sites 生产构建通过并保留 10 个 API 路由。新增验收覆盖副作用/审批/可达性摘要、缺失操作、未来步骤引用、未知变量、匿名 401 及零执行边界，结果见 `tests/acceptance/workflow-preflight-2026-09-17.json`。全功能矩阵同步重跑；外部模型、搜索、网页和连接器在自动回归中是模拟服务，对象存储为内存替身。

**真实服务与浏览器边界**：本轮没有修改模型适配器、提示或检索上下文，真实模型调用 **0 次、0 Token**。尝试从原私人站点进入唯一的 ChatGPT 登录方式后，被认证页的人机校验阻塞；未自动处理验证码、未伪造身份、未降低鉴权。因此生产登录、线上对话、生产出口和浏览器端流程检查仍未端到端验证。部署终态见上文及 `RELEASE_STATUS.json`；没有 Quick 同任务对照，不宣称超越。

**参考**：2026-09-17 再次核对 Amazon Quick 官方概览中的 Flows/Automate 能力，并阅读 DeepSeek Harness README、架构和 MIT 许可证。本轮只参考可控执行、事件边界和可替换组件思想，未复制或引入 Harness 源码。下一轮优先在合法生产用户会话可用时完成线上流程预检/对话核验，或继续实现受限工具代理循环。

## 2026-09-16 · 可编辑 PowerPoint 分页与实际 Impress 验收

**发布终态**：原私人站点版本 8 已于 `2026-09-16T18:52:52.120368+00:00` 部署成功，线上功能源码为 `263608a21bae3c36cd9933a561a6a2779febeb19`，环境修订 3，私人访问范围和已有 secret 未改变。本段终态及交付清单属于部署后的文档提交，不改变应用功能，也不重复部署。

**目标与实现**：接续版本 7 的 XLSX 改进，本轮修复 PPTX 仅按换行粗略分页、缺少层级和一致页脚的问题。生产导出现在解析一至三级 Markdown 标题与正文/列表，清理链接和强调标记，按中文视觉长度换行，并按每页项目数和内容权重自动续页；新增幕云AI封面、较大中文标题、可见且可编辑的项目符号、统一页脚和页码、作者元数据与受限文件名。没有引入新依赖、数据库迁移或 secret。

**完整回归**：`node scripts/self-test.mjs` 的类型检查、全部 **344 项**集成断言及 **26 项**实际 workerd 运行时断言通过；当前 Sites 生产构建通过，10 个 API 路由完整。全功能矩阵中的模型设置、聊天/智能体/记忆、知识文件、数据/看板、研究、集成审批、流程/任务、应用版本、成果导出和权限均重跑。自动回归中的模型、搜索、网页、连接器是模拟服务，对象存储是内存替身；SQLite、事务、项目 API、PPTX 序列化和 Worker 运行时执行真实项目代码。

**实际文件验收**：生产 `buildPptx` 生成 4 页中文设备维护复盘；机器检查原文件和 LibreOffice 另存文件的页数、中文内容、可编辑项目符号、作者信息与文本框边界。LibreOfficeDev 26.8 实际打开、另存并渲染为 4 页 PDF，全部页面逐页查看，中文、页码、页脚清晰，无缺字、裁切或重叠。首次实现使用 OOXML 原生项目符号，机器结构检查通过但 LibreOffice 渲染不显示符号，明确判失败；改为可编辑的可见符号文本后从生成到渲染完整重跑。结果和三个文件 SHA-256 见 `tests/acceptance/pptx-layout-2026-09-16.json`。未验证 Microsoft PowerPoint、WPS、生产浏览器下载、图表/表格/图片或任意长文档。

**用量与参考**：模型代码、提示和检索上下文未改变，真实模型调用 **0 次、0 Token**。2026-09-16 再次核对 Amazon Quick 官方概览所列文档/视觉成果整体能力和 DeepSeek Harness 的插件架构、开发预览状态及 MIT 许可证；本轮为幕云AI独立导出实现，未复制或引入 Harness 源码。固定 PPTX 文件验收不是 Quick 同任务对照，不能据此宣称超越。

**发布状态**：候选以远端 main `8dede4231e7e52aecff4d1c798ccc07a9ea97d64` 为基础，通过门槛后已推送并更新同一私人站点；部署终态见上文及 `RELEASE_STATUS.json`。下一轮优先补受限工具代理循环，或在合法生产用户会话可用时验证线上对话、用量与浏览器下载。

## 2026-09-16 · 格式化 Excel 导出与实际 Calc 验收

**发布终态**：原私人站点版本 7 已于 `2026-09-16T12:49:41.886521+00:00` 部署成功，线上功能源码为 `2b80aa33442de9511eb60b00081150b2ab6686b3`，环境修订 3，私人访问范围和已有 secret 未改变。本段发布记录的后续文档提交不改变应用功能，不重复部署；源码包清单同时记录线上功能 SHA 与完整交付 SHA。生产浏览器下载仍未执行，不能把部署成功等同为浏览器端到端验收。

**目标与实现**：接续已上线的 Worker 连接修复，本轮不重复改模型或只改文案。数据分析页原 XLSX 只有裸单元格，虽能打开但缺少企业交付所需的表头、筛选、冻结和打印设置。新增独立生产序列化器：幕云AI蓝色表头、交替底色、冻结首行、完整筛选范围、10–40 的受限列宽、多行换行、横向单页宽打印和千分位数值格式；负数为红色。有限数字保持数值单元格，公式样式输入写成普通文本，不会执行；文件使用正式 XLSX MIME。没有新增依赖、数据库迁移或服务端 secret。

**完整回归**：`node scripts/self-test.mjs` 的类型检查、全部 **342 项**集成断言及 **26 项**实际 workerd 运行时断言通过；当前 Sites 生产构建通过，10 个 API 路由完整。新增 4 项自动回归核对 MIME、数值/文本类型、样式、冻结、筛选、列宽和打印设置。已有聊天、智能体、记忆、知识、数据、研究、集成审批、任务、应用版本、导出及权限回归均重跑；外部模型、搜索、网页和连接器在这组自动回归中仍为模拟，对象存储为内存替身。

**实际文件验收**：生产序列化器生成 42 行 × 4 列中文合成工作簿。openpyxl 首次解析通过；LibreOfficeDev 26.8 实际打开并另存后再次通过相同检查，`=1+1` 保持文本、数值保持数值、冻结为 A2、筛选为 A1:D43，换行和列宽保留。将原文件实际转为 2 页 PDF，首次因环境没有中文字体出现空白字形，判失败；配置 Noto Sans CJK SC 字体并将工作簿字体调整为 Windows 常见的 Microsoft YaHei 后重新生成。第二次发现打印标题在 Calc 第二页顶部发生裁切，移除不可靠的打印标题后再次生成；最终逐页检查中文、边框、底色、负数颜色、换行和分页，未见缺字、裁切或重叠。完整结果和 SHA-256 见 `tests/acceptance/xlsx-formatting-2026-09-16.json`。未验证 Microsoft Excel、WPS、真实浏览器下载或任意宽表。

**用量与参考**：本轮模型代码、提示和检索上下文未改变，真实模型调用 **0 次、0 Token**，没有读取托管密钥。2026-09-16 复核 Amazon Quick 概览中 Quick Sight 的数据可视化定位，以及 DeepSeek Harness 的插件架构、开发预览提示和 MIT 许可证；未复制或引入 Harness 源码。该固定文件验收改善成果质量，不是与 Quick 的同任务对照，不能据此宣称超越。

**发布与后续**：本轮候选以远端最新 main `85efc91be5e0dd7cb35e8db05e160c693e72445b` 为基础。通过门槛后更新同一私人站点，部署终态在 `RELEASE_STATUS.json` 的后续记录确认；私人范围和已有 secret 保持不变。下一轮优先补 PowerPoint 的实际渲染与布局质量，或在合法生产用户身份可用时核验真实线上模型调用。

## 2026-09-16 · 修复真实站点模型连接失败

**发布收尾（2026-09-16）**：本次接续上一段尚未确认终态的连接故障修复，不把修复重复记作新功能。已查询到原私人站点版本 6 部署成功，完成时间为 `2026-09-16T05:14:48.462995+00:00`；线上源码 `025f6df22b0e549df937148a1cba204d00101869`，部署 `appgdep_6aaa2591c4048191b7a627530024a7e2`，环境修订 3。私人访问范围不变。认证 fetch 确认原远端 main 与本地修复提交一致，无未提交源码改动。按当前 Sites 配置重新执行完整入口，类型检查、338 项集成、26 项 workerd 断言及生产构建全部通过。收尾新增真实模型调用 0 次、0 Token；下文五次真实调用是本次修复前段已保存的证据，没有再次调用或重新计费。没有新增应用代码，不为文档收尾重复部署。本包源码 SHA 与线上 SHA 的差异仅为发布记录和说明；两者均写入交付清单。仍未完成生产用户登录、模型出口和浏览器交互端到端验证。

**用户反馈与根因**：用户截图显示正常对话返回「模型连接中断或超时」，模型列表却提示已连接。原版本将密钥存在误称为已连接；此前 Node 直连测试不能证明线上调用成功。使用与部署配置一致的 workerd 实测发现 `redirect: 'error'` 会抛出 `TypeError: Invalid redirect value`，且没有外发请求。模型和连接器公共请求函数均存在此问题；不是需要再次更换密钥。线上日志另有 workspace 401，保持身份校验，不据此伪造用户或断言用户全部认证流程已修复。

**修改**：模型和 HTTP/MCP/研究共用传输改用 `redirect: 'manual'`，对全部 3xx 显式拒绝并取消响应体，密钥不跟随重定向。托管连接改为「已配置」，说明是否调用成功应以实际响应为准。增加实际 Worker 测试入口并纳入每轮完整回归。保护用户上传截图，保留原文件，忽略且禁止其进入源码包。

**验证**：类型检查、338 项全部既有集成回归、26 项新 Worker 运行时回归、当前 Sites 生产构建通过。Worker 回归真正执行 fetch 参数检查，外部响应为替身；覆盖旧缺陷复现、正常模型与连接器、五类重定向零跟随、用量、401 分类和匿名应用 API 拒绝。首次测试夹具因临时文件的模块根路径错误未启动，改成内存脚本后重跑完整入口通过；没有改依赖或跳过失败阶段。

**真实调用**：使用用户本次明确提供的密钥，在隔离本地 Worker 中调用现有受保护 API 处理函数，真实 DeepSeek 模型为 deepseek-flash，每次最多 2048 输出 Token。本轮共 5 次、590 输入 / 184 输出 Token。聊天与中文采购引用首先通过；初版无资料用例含「负责人」，会合法检索到采购文档，错误的零来源断言导致一次失败。保留失败记录，更换为无重合词的火星氧气问题后只补测资料不足与合计 35 两项，均通过。四类目标验收最终通过，不把这一次失败隐藏为成功。真实模型用量均已在本地应用用量表记录。详细结果见 `tests/acceptance/worker-transport-2026-09-16.json`。

**边界**：本地 workerd 外部 DNS 不可用，真实模型组用受限 Node 出口桥；这验证实际 Worker 参数与应用逻辑，但不证明生产出口网络。身份为隔离本地合成用户，未带到生产，没有读取托管密钥、改主密钥或放开私人访问。之前未发布的检索候选现有真实模型引用/无资料验收证据；Word 和 CSV 结构回归本轮全部执行，历史 Office 渲染与 Calc 导入未重跑。没有 Quick 同任务对照，不宣称超越。

**交付**：以原远端 main `7cfb58ac65329e0ed87e12009ae6f5d2efe3983e` 为基础，原地修复，测试通过后按原私人站点发布；最终部署结果另在后续记录及 RELEASE_STATUS.json 中确认。完整源码、测试、迁移、锁文件、代码说明和部署说明随新 ZIP 交付。下一步优先确认用户刷新后的对话响应与用量，再扩展功能。

## 2026-09-11 · 第 1 轮：真实模型接入与验收基线

**目标**：让私人工作台直接使用已配置的 DeepSeek，并为持续迭代建立可复现的自测和交接规则。

**实现**：新增服务端管理的 `managed-deepseek` 连接，固定官方服务地址，不返回密钥，客户端不能修改、重定向或覆盖该连接。使用明确的非思考模式和 2048 输出 Token 上限。保留其他自定义模型。新增三个固定中文验收用例、直接供应商测试脚本与需真实站点用户身份的测试脚本。已创建并启用每 6 小时的开发迭代任务。

**参考**：阅读 DeepSeek Harness README、架构和安全说明。下一轮优先研究受限工具循环与持久化执行事件；本轮未把参考项目当作已安装或已集成的组件。

**验证结果**：

- TypeScript 检查通过。
- 生产构建通过，原有 10 个 API 路由保留。
- 82 项集成断言通过；其中新增 5 项验证管理连接、凭据隔离、固定目标地址与输出限制。
- 1 次直接连通性测试：HTTP 200，返回“连接成功”，10 输入 + 2 输出 Token。
- 3 次真实 DeepSeek 验收均通过，使用实际 `lib/model.ts` 适配器，无重试。

| 用例 | 结果 | 输入 Token | 输出 Token | 观察耗时 |
| --- | --- | ---: | ---: | ---: |
| 中文行动清单字段提取 | 通过 | 55 | 26 | 20.089 秒 |
| 给定数据的结构化复核 | 通过 | 49 | 10 | 0.997 秒 |
| 缺少资料时不编造收入 | 通过 | 45 | 253 | 2.829 秒 |

本轮共 4 次真实模型调用，总计 159 输入 + 291 输出 = 450 Token。未将 Token 换算成未经账单核对的费用，也没有充值或新购服务。结构化复核用例只验证对给定结果的遵循，不代替数据库实际计算测试。

**验证边界**：私人站点测试令牌能到达应用，但没有应用用户身份，API 正确返回“请登录后使用工作台”。因此没有宣称通过线上登录端到端验收；没有伪造身份头或降低鉴权。真实供应商测试独立于该身份限制完成。未进行浏览器视觉测试。

**发布门槛**：本轮本地门槛已通过；对应源码的正式部署结果以 Sites 平台返回状态及本轮用户回执为准。下轮应先核对最新线上版本，不根据旧 scratch 推测状态。

**下一轮**：实现受限工具注册与可追踪的代理执行闭环，先覆盖知识检索和确定性数据计算；外部写入继续走明确审批。补充工具错误、超时和注入干扰的失败用例。只有取得相同任务的对照数据后才能讨论“超越 Quick”。

## 2026-09-11 · 品牌命名

根据用户指示，品牌统一为「幕云AI」。更新页签标题、侧栏品牌、页脚、默认助手名称、自称、导出文件名及 PPT 作者，并同步持续迭代任务的名称与品牌要求。保持原项目和数据身份。此轮只调整品牌文字，不发起付费模型调用。

## 2026-09-12 · 第 2 轮：安全取消、审批竞争与完整回归

**接续状态**：远端 main 和线上版本仍为品牌更新后的版本；接续 9 月 11 日已编写、尚未提交和发布的执行可靠性改进，没有丢弃或覆盖已有修改。此轮先完成这项交付，不重复另做一份。

**验收目标**：用户取消准备态/待审批任务后，不再执行后续步骤；已完成、失败或外部结果不明的任务不能被改写成“已取消”；审批与取消/拒绝同时发生只允许一个有效决策；过期请求不能覆盖新状态。

**实际改进**：

- 运行详情新增带明确边界说明的取消确认、刷新状态、持久化执行时间线。取消不承诺撤回已经发生的外部操作。
- 取消采用修订号原子比较；重复取消幂等，未确认审批清空，取消事件保留。成功/失败/外部执行中任务拒绝取消，活跃步骤要求等待完成。
- 连接器拒绝审批使用原子状态更新并校验连接器身份，修复与执行请求竞争时覆盖真实执行结果的问题。
- 每个任务写入检查领取时的修订号，避免旧请求在租约到期后覆盖取消/新进度。完成状态和成果在同一事务提交，测试注入失败后两者均回滚。
- 全量权限测试发现数据读取接口在缺少参数时先返回参数错误；已统一为优先校验登录身份。
- 新增统一自测入口和全功能矩阵；后续每轮均运行全部测试并保留未验证项，持续迭代要求已同步更新。

**验证**：类型检查通过；245 项集成断言通过（原有 82，新增 163）；生产构建通过，保留全部 10 个 API 路由。复现原件上传下载、五种聚合与看板、审批暂停继续、取消后禁止执行、并发决策、旧响应晚到和事务失败恢复等业务链路。所有外部模型/连接器/网页响应和对象存储使用模拟，SQLite 与项目接口/事务/Office ZIP 生成代码实际执行。Office 包结构通过不等于视觉版式验收。

**真实用量**：0 次真实模型调用，0 个实际供应商 Token；本轮未改变模型适配器、提示或凭据，不读取托管密钥。旧步骤返回后的状态保护用模拟慢响应验证，不冒充真实模型评测。

**剩余边界**：未完成线上用户登录 E2E、真实服务写入、浏览器交互和 Office 渲染；此前页面令牌缺少应用用户身份的限制仍未解除，没有绕过认证。没有后台任务队列、工具代理闭环、外部补偿或 Quick 同任务对照，因此不声称已超越 Quick。具体覆盖与缺口见 SELF_TEST_MATRIX.md。

**参考**：复核 [Quick 概览](https://docs.aws.amazon.com/zh_cn/quick/latest/userguide/what-is.html) 和 [Harness 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)，将人机审批与可恢复事件作为独立实现的参考。本轮未复制 Harness 源码、引入其依赖或启用本机执行组件。

**发布门槛**：本地验证通过后推送并更新同一私人站点。最终部署状态以 Sites 原生状态返回和本轮回执为准；如果部署未成功，旧线上版本不变。下一轮先核对远端提交与实际线上版本。

**下一轮目标**：优先补中文知识引用定位与固定语料检索基准，增加可验证的无匹配、跨文档和干扰内容用例；涉及模型生成逻辑时，必须先具备合法受保护接口的真实验收条件，不用模拟分数代替质量证据。

## 2026-09-12 起 · 第 3 轮候选：中文知识检索与引用可核查（未部署）

**验收目标**：在固定中文企业语料中，7 个可回答问题的正确文档必须排在第一位，2 个语料外问题不得返回伪来源；聊天返回资料时必须给出从 1 开始的片段位置、匹配词和证据摘录；模型使用不存在的 `[n]` 编号时必须显式预警。

**实际改进**：关键词检索从“任意二字命中计分”升级为中文 2–4 字词组、查询覆盖率、词长、出现次数与当前语料稀有度的可解释加权；精确短语另加权，同分保持原文稳定顺序。来源随回答返回匹配词、分数、片段位置和聚焦摘录，执行记录保留本次匹配依据。新增引用编号审计，越界编号在回答下方和执行记录中预警；编号有效时仍明确提示“只校验编号存在，不代表语义已核实”。

**验证结果**：完整类型检查通过；280 项集成断言通过；生产构建待本轮发布门槛完成后记录。固定基准 7 问 Top-1 100%、Recall@3 100%、MRR 1.00，2 个无答案问题均返回空结果，干扰文档未进入相关查询前三。集成链路另验证 API 实际返回定位、匹配词、摘录、有效编号和越界预警。该基准为 8 份合成中文企业文档，分数只用于代码回归，不外推到真实企业任务质量，也不是 Quick 对照。

**真实用量与边界**：检索排序和编号审计为确定性代码，无需模型；本轮未读取托管密钥。真实 DeepSeek 验收是否可通过受保护站点用户身份执行，将单独记录；不能执行时保持 0 次/0 Token 并列为身份阻塞。外部模型、搜索与连接器在完整回归中均为模拟，线上登录、真实 R2、浏览器交互和 Office 渲染仍未由本轮验证。

**参考**：2026-09-12 复核 Amazon Quick 官方概览，Quick Index 的目标是以组织文档和数据源为回答提供依据；本轮只交付幕云AI的独立关键词检索改进，不等同于 Quick Index。复核 DeepSeek Harness 架构与 MIT 许可证；本轮未复制或引入 Harness 源码，仍仅参考其“可替换服务与可追踪事件”的边界思想。

**下一轮目标**：把固定基准扩展为带文档版本、跨片段答案与真实脱敏企业材料的评测集；随后评估 SQLite FTS 或可替换向量检索接口，并保持同一基准做回归对照。

### 2026-09-14 恢复与保存

工作区已恢复，确认保留上次未提交改动，远端 main 在恢复时仍为 `a6b927a7c0e78e3a8b5fad510dbd52ebca7c7947`。重新执行完整回归：类型检查及 280 项断言全部通过；生产构建通过，全部 10 个 API 路由保留。

用户明确授权本项目所有文件写入直接执行、不逐项请求确认；已同步到 ITERATION_PLAN.md 和原迭代任务说明，未更改任务启停状态。

使用 Sites 提供的页面访问凭据，对已有受保护 `/api/workspace` 进行一次身份预检，实际返回 HTTP 401。没有发起模型请求，实际模型调用 0 次、供应商 Token 0。当前凭据不能作为应用用户身份；未读取服务端 secret、伪造身份或降低鉴权。

本次将候选代码和真实测试结果提交到原源码仓库以保存进度。**不部署此候选版本**：它改变了模型收到的检索上下文，按既有要求尚缺少受保护接口上的真实 DeepSeek 验收。线上维持已验证的版本 5。后续应先检查本日志和远端源码，不能仅因 main 中存在该改动就认为已发布，也不能把旧线上模型测试算作此候选代码的验收。

### 2026-09-14 · 每轮源码包交付

用户要求每次迭代后提供可下载的最新完整源码压缩包，包含代码说明和部署文档。核对原任务发现每 6 小时间隔未改变，但任务处于暂停状态；已恢复启用并加入固定交付要求，沿用原任务，没有另建重复任务。

新增 `CODE_GUIDE.md`、`DEPLOYMENT.md`、`RELEASE_STATUS.json` 和 `scripts/package-source.mjs`。说明覆盖目录与数据流、依赖、D1/R2、主密钥保留、认证、本地运行、原 Sites 发布、回滚及独立托管适配边界。源码包从干净 Git 提交生成，携带完整 SHA、逐文件哈希、权限和发布状态；排除凭据、用户数据、依赖及构建缓存，保留构建插件源码、迁移、测试、锁文件及许可证。

本次重新执行全量回归：类型检查、280 项集成断言及生产构建均通过。打包脚本语法检查通过，未提交改动时实际拒绝打包，避免把未保存工作误称为某个提交。最终 ZIP 校验输出与下载交付由本次回执记录。

打包自测完成：150 个已提交文件及生成的版本清单全部通过逐文件 SHA-256 校验，Python ZIP 完整性检查通过；故意改动包内 README 后校验返回失败。凭据扫描初次将既有 `example.com` 虚构用户名密码的 URL 拒绝测试识别为风险，已只为该文件的这一精确测试字串保留例外，未放开测试目录的凭据检查。最终交付包从最新提交重新生成和校验，不包含测试损坏包。

真实模型调用 0 次、实际供应商 Token 0；没有改变模型代码或发起外部业务动作。线上保持版本 5，中文检索候选仍缺合法应用身份下的真实模型验收。下一轮继续处理此门槛与知识评测缺口，并按新流程交付源码包；不能把交付包成功当作发布或超越 Quick 的证据。

## 2026-09-15 · 环境恢复与 Word 表格导出验收

**接续与环境**：9 月 14 日编写的 Word 导出改进因开发环境不可用而中断，尚未提交；当时的 303 项断言结果不算本轮验收。9 月 15 日环境重新可用，核对原远端 main 仍为 `5ea3ea587e55912e2fc71213f08abf50548ccf09`，保留并接续全部未提交修改，刷新当前 Sites 执行配置。没有证据表明平台恢复由助手操作引起；本次完成的是恢复项目执行、修复文档验收环境和续做交付。按用户新要求恢复原每 6 小时任务，并加入主动环境诊断、有限重试、保护改动及恢复后继续执行的规则。

**验收目标和改进**：将报告中的 Markdown 表格导出成可编辑 Word 表格，保留中文、表头、记录、列对齐、单元格换行及周围段落。新增独立序列化模块，使用既有 Word 导出按钮接入；列宽在原 A4 正文范围内分配，表头跨页重复、普通行不拆开、无固定行高。支持转义竖线和代码围栏保护；缺列补空，超列原文保留，非法 XML 控制字符移除。没有加入模型请求、额外插件依赖或更换锁文件。

**完整回归**：恢复后重新运行 `node scripts/self-test.mjs`，类型检查与 303 项断言全部通过；当前 Sites 构建入口成功，10 个 API 路由完整。已有全部功能回归均执行；新增 23 项 Word 表格检查。外部模型/搜索/连接器及对象存储仍为模拟，不能称为线上端到端通过。

**实际文件验收**：生产导出器生成包含 36 条记录、2 张表的合成 DOCX。独立 XML 和 python-docx 打开成功，原始单元格与换行完整。初次渲染缺少中文字体，图片有缺字，判失败；在本地配置开源 Noto Sans CJK SC 字体后重新渲染。逐页检查发现末段被多余空白推到第 5 页，修复表后间距后重新生成并渲染为 4 页。全部 4 页图片已检查，未见缺字、裁切、重叠；PDF 文字检查确认 36 条记录、转义字符与各跨页表头。固定样例及机器检查脚本随源码交付，结果见 `tests/acceptance/docx-tables-2026-09-15.json`。未进行 Microsoft Word/WPS、XLSX/PPTX 渲染或真实浏览器下载验收。

**真实服务与发布**：本轮受保护 `/api/workspace` 身份预检实际返回 HTTP 401；真实模型调用 0 次、供应商 Token 0。没有读取托管 secret、伪造身份或改动访问范围。Word 改进本身不影响模型，但最新源码仍包括前轮改变检索上下文的候选，整包仍缺真实 DeepSeek 验收；因此只提交源码并提供可下载包，**不更新线上版本 5**。这项发布门槛与已恢复的开发环境是两件事。

**参考与边界**：9 月 14 日核对 [Quick 文档与视觉成果](https://docs.aws.amazon.com/zh_cn/quick/latest/userguide/document-and-visual-creation.html) 中 Word 样式与表格能力，并复核 [Harness 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) 和 MIT 许可证；本次保持可独立验证的导出模块，没有复制或引入 Harness 代码。Word 表格是独立增量，不代表完整 Quick 文档能力，更不是超越证据。

**下一轮**：先处理合法用户身份下的模型候选验收条件；同时继续补浏览器成果下载和 XLSX/PPTX 的实际渲染缺口，避免只积累未验证候选。环境异常先诊断和尝试恢复，文件写入沿用用户授权。每轮继续全量回归及带代码说明、部署文档、完整 SHA/状态的源码包交付。

## 2026-09-15 · CSV 导出防护与真实 Calc 导入

**接续与目标**：当前环境、Node、锁定依赖和构建配置可用；原仓库干净，认证 fetch 后本地 HEAD 与远端 main 同为 `f2952e6573f0e1810e28dc35023f90d6a76405fa`。本轮不重复 Word 改进，处理数据分析页面 CSV 下载中公式样式文本可能被表格软件执行的问题。验收要求：防护覆盖表头与数据，不修改已保存源记录，显示保护数量，保留可复现测试和兼容性边界。

**实现**：拆分无损数据交换 `toCSV` 和面向表格下载的 `toSpreadsheetCSV`。后者对公式起始符、全角变体、前导空白/隐藏字符与起始控制字符加单引号标记；有限数值走数值路径。现有数据工作区 CSV 按钮接入统一下载器，文件名与 UTF-8 MIME 正确，并提示实际保护数量及再次导入可能改变文本。没有删改原始内容、改写数据库记录、更换依赖或添加模型调用。文本形式的负数会被保护；需要保留原始文本和单元格类型时使用 XLSX，不能宣称 CSV 防护适合所有机器交换场景。

**全量回归**：`node scripts/self-test.mjs` 类型检查和全部 **338 项断言**通过，较上轮新增 35 项，包含 19 种前缀、表头、计数、引号/换行、原件不变、真实下载 Blob 及生产 API 导入→重开→防护导出→再导入→求和 7.5。当前 Sites 构建入口通过，10 个 API 路由保留。SQLite 和处理函数真实运行；模型/搜索/连接器和对象存储为模拟，不是线上端到端。Word 全部结构回归重跑通过，前轮 4 页视觉结果未重跑，不冒充本轮新结果。

**真实文件验证**：生产序列化器生成 16 条合成记录、15 个需保护的单元格（含表头）。使用 LibreOfficeDev 26.8.0.0.alpha0 显式启用公式导入，防护版导入 XLSX 后活动公式为 0、16 个金额保持 -12.5；同配置下无害阳性对照 `=1+1` 实际算出 2，排除关闭公式解析导致假通过。逐个核对全部文本/列数/数值。首次严格字符检查发现 Calc 将两处 CR/CRLF 规范化为 LF；定位后仅允许这项明确兼容差异，其他校验不放宽。项目内 CSV 往返仍逐字保持。脚本、完整命令、文件 SHA-256 及结果见 `tests/export-csv-fixture.mjs`、`tests/verify-csv-fixture.py`、`tests/acceptance/csv-safety-2026-09-15.json` 和部署文档。未验证 Excel/WPS、另存重开、视觉渲染或真实浏览器下载。

**认证与发布**：使用受支持浏览器能力检查私人站点，首次导航长时间没有返回可用页面，终止等待，未进入凭据收集，也没有登录成功证据。随后通过已有 Sites 访问令牌执行受保护 `/api/workspace` 只读预检，实际 HTTP 401。真实 DeepSeek 请求 **0 次、0 Token**。没有读取 secret、伪造身份或扩大访问范围。CSV 改进不依赖模型，但整体源码仍包含未完成真实验收的检索候选，因此**未部署，线上保留版本 5**。本地工作和源码交付仍可继续，不属于开发环境完全不可用，不暂停原迭代任务。

**参考**：2026-09-15 核对 [Quick 概览](https://docs.aws.amazon.com/zh_cn/quick/latest/userguide/what-is.html)、[Harness 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) 与其许可证页面；没有复制或引入 Harness 代码。本轮导出边界保持为独立可测试函数。风险依据 [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)，导入配置依据 [LibreOffice CSV 参数](https://help.libreoffice.org/latest/en-US/text/shared/guide/csv_params.html)。本测试不是 Quick 的安全问题证据，也不是超越 Quick 的对照结果。

**交付与下一轮**：本轮候选提交并推送原仓库，使用 `scripts/package-source.mjs` 从干净提交生成新源码包，交付阶段进行逐文件哈希、必要文件和 ZIP 完整性校验。包内含代码/部署说明、矩阵、日志、锁文件、迁移、测试和完整 SHA/线上候选差异；不包含服务密钥、用户数据或依赖缓存。后续优先解决合法应用身份下的真实候选验收；在此条件未具备时继续补 XLSX/PPTX 排版和实际下载缺口，每轮完整回归及新源码包。

## 2026-09-27 · Octop 参考：受限聊天表格工具闭环（候选，未部署）

从原远端 main fd457c251b120104156c9a7ffb75cde78af7b3a0 接续，工作区干净；原私人站点版本 23。按用户“按照建议来干”优先连接聊天与文件工具，独立实现标准 tool_calls 循环，不复制 Octop 或 Harness 代码。Octop README/ACP/SECURITY/MIT 已阅读；自主 AgentTeams 仍为其路线图能力，不冒称本轮实现。2026-09-27 复核 Quick 官方概览与 Harness 架构，仅作边界参考。

实现：显式 XLSX/Excel 请求触发唯一受限工具，校验结构后生成真实文件、SHA-256 与持久成果，聊天及成果中心提供受保护下载。最多两次工具、三次模型响应，每次输出 2048 Token；逐次用量保存并返回合计。公式样式字符串按文本写入；未知工具、并行工具、截断参数、错列、重复列和超限拒绝。总结失败仍保留成功成果，下载拒绝跨用户、伪造对象路径、缺失和篡改文件。没有执行 shell 或启动本机程序。

完整回归：类型检查、357 项原集成断言、26 项 Worker 断言、35 项本机执行器测试、6 项发送生命周期、6 项草稿以及 40 项新工具链路断言通过。新链路采用真实本地 workerd/D1/R2 和 XLSX，模型为模拟。独立 openpyxl 打开核对中文、数值、公式样式文本、空值、冻结表头与筛选通过。生产构建通过，含新增受保护成果文件路由。没有执行 LibreOffice、GenOffice、Docker、Excel/WPS 或生产浏览器完整验收；不复用历史结果冒称重测。

真实模型请求 0 次、0 Token。通过 Sites 返回访问凭据对既有受保护 workspace 只读预检得到 HTTP 401；该凭据不构成应用身份，未读取 secret、伪造用户头、公开接口或降级权限。模型协议和提示改变尚缺真实验收，因此不部署，线上保留私人版本 23。保存候选提交与新完整源码 ZIP，任务仍可继续，不属于开发环境完全不可用。

下一步：恢复合法应用身份后，以最多两次小任务（至多六次模型请求）验证 DeepSeek 实际工具选择、参数、成果下载与用量；通过后同步原站点，再接入受控 GenOffice/LibreOffice 工具适配与本机配对。当前仅云端确定性 XLSX 工具，不宣称整套 Octop 或通用多智能体并发完成，不宣称超越 Quick。
## 2026-09-27 · 聊天 XLSX 显式审批与幂等执行（候选，未部署）

从远端 main 完整接续上轮未部署候选 4ccbb0e7b81c63e1df31801d2f146cc3185a5157。本轮不扩展文件格式，先修复控制边界：模型工具调用只创建待审提议，展示文件名、行数与列数；用户明确批准后才生成、校验并保存 XLSX，也可拒绝。批准、拒绝均幂等，重复批准复用同一成果，拒绝后不可再执行，跨用户审批失败。原始工具参数保存在用户隔离记录中，不随 workspace 列表返回；生成物仍以固定对象路径、大小与 SHA-256 保护下载。

完整回归通过：359 项应用断言、26 项 Worker 断言、35 项本机执行器测试、6 项发送生命周期、6 项会话草稿及 34 项文档审批断言；所有 12 个 API 路由均验证匿名拒绝。独立 openpyxl 再次打开实际成果，核对中文、数值、公式样式文本、空值、冻结表头与筛选。生产构建通过并包含新增审批路由。外部模型仍为模拟，真实 DeepSeek 0 次、0 Token；GenOffice、LibreOffice、Docker、Office/WPS 和生产浏览器本轮未执行。

发布门槛未改变：候选修改了模型 tools 协议和提示，但当前没有合法应用用户身份完成真实调用。未读取托管 secret、伪造身份或降低访问控制，因此不部署，线上保留私人版本 23。下一轮完成真实提议、批准、下载和用量核验后再更新原站点；没有相同任务 Quick 对照，不宣称超越。
