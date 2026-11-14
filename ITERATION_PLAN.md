## 0.37.61 接续

完成 Apple ARM64 OCR/PDF 及中文数据许可和内置、真实离线向量模型，验证 Mac Office 进程池及签名安装；恢复 jsdom 后完整回归。模型工具输出异常和副作用未知时继续避免自动重放。M4 未完成，本版仅开发检查点。

## 0.37.60 接续

核对 OCR WASM 第三方归属，准备 Apple ARM64 中文 OCR 和 PDF 渲染，接入真实本地语义模型；在真实 Mac 验证办公池隔离及签名安装，补齐 jsdom 后重跑完整 UI 回归。重读最新检查点并核对并发；M4 完整验收前不将检查点当成正式安装版。

## 0.37.55 接续

优先实现用户显式授权的原PDF预览及区域高亮，核对旋转裁剪及渲染比例；继续Apple ARM64离线中文OCR/PDF、真实本地嵌入模型和Mac Office池隔离性能验收。M4未完成。

## 0.37.54 接续

优先实现来源文件显式授权的证据预览和坐标高亮，核对旋转裁剪与页渲染比例；补 Apple ARM64 离线中文 OCR/PDF 和真实本地嵌入模型，验收 Mac Office 进程池隔离性能。M4 未完成。

## 0.37.53 接续

继续实现安全的 OCR 坐标证据保存和界面高亮，区分源 PDF 坐标与渲染像素。优先补齐 Apple ARM64 离线中文 OCR/PDF、真实本地嵌入模型，Mac Office 池隔离与性能验收。M4 未完成。

## 0.37.52 接续

继续覆盖复杂 schema 与服务端语义的安全边界；优先 Apple ARM64 离线中文 OCR/PDF、真实本地嵌入模型、Mac Office 池隔离性能和真实模型验收。保持 M4 检查点，未完成前不当正式发布。

## 0.37.51 接续

继续实现 ARM64 离线 OCR/中文/PDF 与真实本地嵌入模型；完善工具参数完整 schema 批预校验、真实第三方协议兼容和 Mac Office 池验收。M4 未完成，不将内部检查点作为正式版。

## 0.37.50 接续

优先实现和验证 Apple ARM64 本地 OCR/PDF 与中文数据、可离线分发的真实语义嵌入模型；在 Mac 验收 Office 进程池和原生取消界面，完善 mock LLM 故障矩阵。M4 尚未完成，本版仅内部检查点。

## 0.37.49 接续

继续离线 Apple ARM64 中文 OCR、PDF 组件和真实嵌入模型；补实机权限对话框、取消 UI 及 Office 池跨文档隔离与性能验收，完成 mock LLM 故障矩阵。当前是内部检查点，M4 未完成。

## 0.37.48 M4 接续

优先完善OCR手动取消与进度、获取可合法离线分发的Apple ARM64 OCR/PDF和中文数据与本地嵌入模型；验收Mac Office池隔离和性能，完善mock-LLM和状态机故障矩阵。M4未完成，不覆盖正式基线，不反复安装检查点。

## 0.37.47 M4 接续

优先合法取得、锁定并验证可离线分发的 Apple ARM64 OCR/PDF 组件、中文训练数据和本地嵌入模型；增加PDF自主选择页及取消；验收Mac Office池隔离/性能、完善状态机和mock-LLM故障矩阵。M4未完成，本版为内部源码检查点。

## 0.37.46 M4 接续

继续PDF附件直接识别及PDF原生坐标/UI高亮；获取合法可离线分发的Apple ARM64中文OCR/PDF组件和嵌入模型；在Mac验证Office池隔离与性能并完善mock模型故障矩阵。本版为内部源码检查点，M4未完成，不覆盖正式基线。

## 0.37.45 M4 接续

优先取得可合法分发的Apple芯片OCR、中文训练集、PDF渲染和本地嵌入模型；打包验证签名和无网络依赖。进一步实现PDF附件直接识别、来源位置回链、真实多模态、Mac Office池隔离与性能、mock LLM故障矩阵。与并行定时任务结果核对版本并合并，不能覆盖他人改动；M4完成前持续，不发布半成品。

## 0.37.44 M4 接续

实现OCR坐标到PDF页面和UI证据高亮、PDF附件接入；取得并核验可合法离线分发的ARM64中文OCR/渲染和语义嵌入模型与运行时。真实Mac验收Office池隔离、崩溃、签名和性能，并完善mock LLM故障矩阵。持续任务不因检查点结束，M4未完成。

## 0.37.43 M4 接续

继续本机真实语义模型与Apple ARM64推理/OCR/中文语言数据和PDF组件；PDF附件引入与来源坐标；在Mac对真实Office进程池并发、隔离、崩溃和性能验收。持续任务每小时运行直到M4完成；每次保存可接续检查点并核对并发，不冒称后台不间断运行。

## 0.37.42 M4 接续

继续Apple ARM64离线语义嵌入模型和OCR/中文数据、PDF渲染依赖、文档上传及来源锚点；真实用户文档和Mac Office预览池隔离、崩溃、并发与性能；完善大模型、状态与工具故障矩阵。所有M4要求全部完成并验证前不关闭持续任务、不把检查点当可安装正式版。

## 0.37.41 M4 接续

持续处理可离线分发的ARM64嵌入模型和OCR/中文数据、受控PDF附件与多模态来源、Mac LibreOfficeKit池真实隔离/取消/性能与用户文档验收；完善故障恢复测试。当前仍为工作检查点，不得声称完成M4或要求用户频繁安装。

## 0.37.40 M4 后续

优先离线分发且校验许可/SHA的Apple芯片OCR、PDF渲染、中文语言数据与本地嵌入模型和推理运行时；真实Mac工具链/用户文档验收。完善PDF问答附件接入、页坐标/图文与表格识别、向量混合检索及实际多模态；对实验LibreOfficeKit池做Mac隔离、崩溃、并发与性能测试。mock LLM继续覆盖多模型不兼容、故障、权限、进程崩溃与重启；持续至M4完成。

## 0.37.39 M4 接续

先在真实Apple芯片Mac与用户文档上验证实验性LibreOfficeKit池的并发、崩溃、取消、跨文档泄漏及临时profile残留；审查空闲进程生命周期、可恢复退出和原生签名。继续固定来源/许可证/SHA并离线打包ARM64本地嵌入模型、OCR引擎与中文数据，实现受限PDF多页OCR及来源坐标，补全mock LLM流式/工具/故障恢复测试。不要将试验池和模拟向量结果当完整M4。

## 0.37.38 M4 接续

把通用进程池连接到可安全打开和销毁多份文档的LibreOfficeKit专用worker；在真实LibreOffice中验证进程复用、每次profile/文档状态隔离、错误/崩溃/取消与没有重放、冷/热延迟，再Apple芯片Mac验收。优先取得可合法离线分发的ARM64 OCR和中文数据、可验证的本地嵌入模型与推理运行时；实现PDF OCR。此前Node进程池原型并非Office池。

## 0.37.37 M4 下一步

准备许可清晰、固定SHA的Apple ARM64 OCR引擎和中文语言数据，完整离线封装并在Mac实测；真实本地嵌入模型与运行时封装；实现文档隔离的LibreOfficeKit热进程池，必须证实文档关闭/崩溃不会泄露数据和不重放，实测冷/热性能；完善 PDF 多页OCR/多模态和 mock-LLM 测试。持续迭代直至 M4 实际完成，不把检查点当最终发布。

## 0.37.36 M4 接续

验证真实离线嵌入模型及许可证、ARM64 推理打包；实施实际 OCR/图片与 PDF 识别和权限；实现 Office 隔离热池并验收崩溃、取消、跨文档隔离及性能；继续真实模型、Mac 原生和失败恢复。当前本机嵌入需要预先运行的 Ollama，不能声称安装端已无额外依赖。

## M4 未完成工作（0.37.35）

优先本地嵌入模型与持久向量索引：明确模型许可、离线 ARM64 推理运行时、审批和版本隔离；然后本地 OCR 与图片/PDF 安全有界提取、来源定位；扩展状态机模型/故障测试；设计隔离 Office 进程池，证实生命周期、崩溃、排队、取消、跨文档泄漏和本地压力测试。真实 Mac 必测。禁止把词法特征当语义嵌入、外部 tesseract 当内置 OCR、并发信号量当热池。

## 0.37.34 下一步

基于既有 LibreOfficeKit 独立工作进程，逐步扩展受控 Impress 结构与渲染验收和 Calc 区域工具；继续原生 Mac 网络及 PPT 文档现场问题调查，不声称附件方案已全部完成。

## 0.37.33 下一步

优先 Mac 实际 Office 与安装验收；继续图层选择和画布交互、数据驱动图表、复杂版式溢出检查与对象动效。保持审批、版本保护和用户数据；不将静态验证当作动画播放或 Mac 验收。


## 2026-11-13 · 0.37.32 PPT 图层、图像与配色候选

实际修改 desktop/runtime/ppt-layers.mjs（新增）、runtime/documents.mjs、runtime/agent.mjs、runtime/tools.mjs、services/documents.mjs、services/conversation.mjs，新增 desktop/tests/ppt-layers-03732.test.mjs。PPT生成允许模型输出有限位置和尺寸的文字、矩形、圆角矩形、椭圆、线条及本轮已选PNG图片图层；数组顺序决定前后顺序，形状/文字为独立可编辑对象，颜色/字体尺寸/对齐/背景可配置。图片只引用本轮ID、不取网络，按原比例完整包含，生成前与提交前核验字节及SHA，图片移除/更改拒绝保存；旧原生逐次审批和版本保护保持。每页最多60层，最多8张来源图片；不支持任意代码/URL/SVG。新增淡入幻灯片切换的OOXML，已静态验证，未测试播放；不是逐对象动画或自动设计效果。原PPT表格/卡片及Excel能力保留。

测试覆盖图层顺序、实际图片比例、色彩、非法几何/颜色/脚本/URL拒绝、超限、未授权图片及审批期间图片改变；python-pptx独立解析真实输出，Linux LibreOffice将英文合成PPT导出并人工查看PDF画面。PNG为合成测试图；模型/原生审批适配为夹具，无用户原件、Mac、PowerPoint或动效播放验收。下一轮优先原生编辑图层的选择/移动/缩放、复杂图表与可验证对象动画，继续Mac实际验收。

## 2026-11-13 · 0.37.31 Office 编辑与PPT版式候选

基于0.37.30源码，修改 desktop/runtime/office-cell-format.mjs、office-kit/worker.py、office-worker-bundle.mjs、services/office-workspace.mjs、services/office-chat.mjs、runtime/documents.mjs、runtime/agent.mjs；新增 desktop/tests/ppt-layouts-03731.test.mjs，扩充 office-cell-format.test.mjs。AI Excel当前真实矩形选区新增粗体和斜体的设置、取消；逐次审批、选区/版本校验和审计保持，实际保存后核对单元格格式、数据、公式及非目标内容，失败保留草稿。真实Linux LibreOfficeKit选区修改/取消，openpyxl验证成功，不保证Mac或所有复杂格式。PPT生成可选多卡片和原生表格，内容为可编辑形状或表格，每页只能使用一种图表/卡片/表格布局；不支持任意复杂布局或保证所有文字不会溢出。模型通过现有document_create执行并提交真实PPT；独立python-pptx验证，Linux LibreOffice PDF渲染两页合成英文样例，无Mac/真实模型/用户原件验收。

22项Office、worker和截图回归通过，Python原生工作进程、Office审批和模型内容部分使用夹具。Mac签名/启动/IME、复杂PPT、图表数据驱动、完整Excel公式及跨Web核心仍待做。下一轮优先继续PPT内容编辑与模板保真、Excel更多格式与公式能力，以及用户Mac现场实际验收。

## 2026-11-13 · 0.37.30 截图问题候选

本轮修改 desktop/runtime/browser.mjs、runtime/tools.mjs、runtime/documents.mjs、runtime/agent.mjs、main/approval.mjs、main.mjs、services/documents.mjs、services/libreoffice.mjs、src/ui/workspace.js、src/workbench.css，新增 desktop/tests/screenshot-feedback-03730.test.mjs。自动网页后台打开，最多5个页面时回收最早隐藏页并报告失效引用；手动浏览器仍可见。文档读取仅同一次任务、同文档版本和SHA可选择复用，其他类型的操作仍单次审批，未实现所有弹窗的整段对话始终允许。Office 预览两并发、最多20个等待、排队可取消，排队代替立即繁忙错误；未证明解决用户机器转换慢的根因。PPT新增非负条形图，由单独可编辑的形状和文本组成，不是原生数据驱动图表；图表最多12项，仍不支持复杂模板/任意图形和完整Office保真。隐藏已完成的中间工具前言并调整用户气泡，未做Mac实际视觉验收。

测试：相关 52 项Node测试（含真实Linux LibreOffice，模型和部分原生桥为夹具）通过；独立 python-pptx 验证生成PPT含9个形状和对应数值。Mac浏览器后台输入/用户原始文档/实际PPT像素/付费模型/Office签名启动未验收。下一步优先Mac检查后台点击/输入是否有效、长任务授权交互、Office预览的真实耗时及PPT复杂图形与版面。

## 2026-11-13 · 0.37.29 模型预算阶段性结果（候选）

对话工具运行将配置内最后一次模型调用用于已有工具结果的阶段性整理；不加模型调用、不开放最终工具调用、不重放审批。服务保存明确标注的阶段结果和未完成状态，后续对话可见，失败和取消不伪称完成。单轮及 Office 专用循环保持原行为。修改 desktop/runtime/agent.mjs、desktop/services/conversation.mjs，新增 desktop/tests/model-budget-summary.test.mjs；保留模型轮数设置与 Office worker 内嵌校验修复。实测 28 项模型/轮数/worker 相关测试、35 项打包更新器测试通过（模型服务与部分 IPC 为夹具）；真实 Mac、用户原文档与付费模型仍未验收。下一轮优先在用户 Mac 验收 Office 启动和模型长任务，以及实际浏览器链路。
真实 Chromium 验收尝试失败：当前容器启动 Chromium 时 socket() Operation not permitted，浏览器未能启动；不能将 18 项模拟/DOM 适配器测试称为真实浏览器验收。

## 2026-11-12 · 0.37.28 浏览器填写导航边界（工作候选）

浏览器填写通过已授权快照定位元素后，焦点设置和焦点复核均会异步等待；期间导航可能使旧页面授权对应的快照失效。现在每次异步焦点步骤之后、实际输入前再次检查快照、当前 URL 和导航 epoch；输入完成后再次检查，发生导航或取消时不返回成功。保留现有单次操作凭证、同 run/精确站点授权、敏感字段限制、结果验证和审计脱敏。

此检查阻止已被主进程观察到的导航后继续输入；导航与输入发送并发时不能证明远端没有收到已经发送的输入，也不能撤回网页副作用。当前仅在注入浏览器适配器/DOM 夹具中测试，不是 Mac Electron 或真实网站验收。新增 desktop/tests/browser-fill-navigation.test.mjs、修改 desktop/runtime/browser.mjs。18项浏览器/审批相关测试、7项 Office 测试（含 Linux LibreOfficeKit）、10项构建/更新器测试通过。0.37.27 Office 启动修复及工作副本校验保留，Mac 用户现场根因仍未知。

GitHub main 和版本分支未发现并发变化，但旧分支仍缺验证文件，既有浏览器安全审查拒绝不得绕过，本候选未 PR/合并/发布。Quick 完整跨端核心、真实多模型、Office 保真和 Mac 原生验收仍有差距。下一轮优先用户 Mac Office 修复结果和实际浏览器输入导航验证，再推进稳定的后台浏览器体验；不要声称已完成 Mac 验收。

修复包补记：从实际候选安装包提取 ASAR，Electron 42（Linux，ELECTRON_RUN_AS_NODE）加载真实包中的 Office 模块、启动真实 LibreOfficeKit 并渲染 Word；164 个可比较应用源码与 ASAR 字节一致。两个旧 0.37.26 候选到 0.37.27 只改 Info.plist、Electron、app.asar、CodeResources；新增约7.2MB双基线修复补丁。仅接受两个指定旧构建，每个基线固定四文件摘要，目标固定四文件摘要与权限；保留原始和目标 codesign、APFS 克隆、回滚。11 项更新器测试通过，真实两个旧 ZIP 的四个文件经更新后与目标 SHA 一致；Linux 的签名与 APFS 为模拟。用户当前安装构建未知，其他版本不匹配会停止；之前 codesign 失败根因未确认。尚无 Apple 芯片 Mac 原生启动/签名/安装结论。

## 2026-11-12 · 0.37.27 Office 启动故障修复候选

用户截图报告临时 worker.py 首行出现语法错误，Office 内核退出。检查当前候选源文件和上轮应用 app.asar 均为正确的 Python；Linux Electron 42 对同一 app.asar 的 fs.promises URL 读取与 ASAR 解包字节均一致，因此尚不能确定用户 Mac 现场的错误来源，未宣称完全修复。用户原始截图和路径不收入源码。

将权威 worker.py 与 ABI.json 在构建时生成 JS 数据模块，由已有模块加载链路提供完整内容；启动前验证内嵌内容 SHA-256、私有目录独占写入后再回读核对 SHA-256，校验失败拒绝启动。打包前执行生成物与源文件一致性检查，防止 Worker 后续修改与内嵌副本漂移。用户数据、审批和原有身份保持。修改 desktop/runtime/office-kit.mjs，新增 desktop/runtime/office-worker-bundle.mjs、scripts/bundle-office-worker.py、desktop/tests/office-worker-materialization.test.mjs、desktop/tests/native/office-worker-asar.mjs，scripts/repackage-native-mac.py 增加构建前一致性门禁。

7 项 Office 测试通过，包括真实 Linux LibreOfficeKit Word/Excel/PPT、写入损坏拒绝与不覆盖已有文件；13 项构建/更新器测试通过。另以真实 Linux Electron 42（ELECTRON_RUN_AS_NODE）从测试 ASAR 加载生产代码，启动 Python Office worker 并渲染 Word；不是 Electron GUI、Apple 芯片或 Mac 原生验收。Mac 运行、签名、公证、用户现场根因及真实文件尚未验收。原 GitHub 版本分支缺失文件，安全审查拒绝仍未解除，未 PR/合并/发布。下一步在用户 Mac 验证启动并定位原现场数据。

完整树验证补记：Linux 实际解压旧应用完整目录，使用 cp -a --reflink=auto 克隆并应用候选补丁；结果与目标包 20727 个应用文件逐项 SHA-256、模式、符号链接完全一致，原始树保留为备份。codesign 和 macOS APFS 原生门禁仍为模拟，不能由此推断 Mac 验收或安装耗时。

实包验证：从旧完整 ZIP 提取四个真实基线文件，用候选小包在 Linux 临时目录更新后，目标三个文件 SHA 与新完整 ZIP 一致，备份四文件 SHA 与旧版一致；签名门禁和 APFS 克隆以模拟替代，运行时用标记文件模拟，未解压并克隆整套应用。新增测试 3 项，连同旧更新器 7 项共 10 项通过。

## 2026-11-12 · 精确候选构建的小更新（未发布）

针对网络慢和重复下载完整运行时，新增仅适用于两个精确 0.37.26 候选构建的小更新生成器和安装脚本。输入完整 ZIP 的 SHA-256 固定，打包前校验闭合清单，只允许 Electron、app.asar、CodeResources 三个文件变化；20,724 个应用条目不变。更新器除了版本还固定原 Info.plist、Electron、app.asar 与 CodeResources 四项 SHA，并固定目标三项摘要和权限；保留原及候选 deep/strict codesign、APFS 克隆、备份回滚、超时和日志。运行端无需 npm/pip。

该补丁仅适用于此前 draft 候选（app.asar SHA 9749e55d...）到 draft-generation 候选（23897d9b...），不适用于其他同版本构建；用户现有安装版本未知。此前用户报告 codesign 失败，根因未确认，本轮不声称解决或加快 Mac 安装。Linux 文件系统测试使用模拟签名/克隆，Mac codesign、APFS 和真实安装未验收。旧离线应用未更改。

源码修改：scripts/package-draft-generation-update.py、desktop/installer/update-draft-generation.py、desktop/installer/Apply-Draft-Generation-Update.command、scripts/tests/test_draft_generation_update.py。下一步在 Apple 芯片真机收集原始签名日志、检验旧构建身份及更新/回滚；继续 Office 编辑与用户文档验收。

## 2026-11-11 办公草稿与选区并发保护（工作候选，未发布）

Office 窗口使用输入版本识别后续草稿：Excel、Word/PPT 写入和 AI 回复完成时，即使用户重新输入的内容与刚提交的内容相同，也保留新草稿；新载入选区不会被先前选区的迟到回执清除。文本输入事件、程序载入/取消选区及画布键入更新版本，原有选区序号、版本和权限检查保持。更换选区后的旧坐标仍受既有内核校验，不能推断一定可以保存。

修改 desktop/src/office/office.js 和 desktop/tests/office-draft-preservation.test.mjs。相关 4 项测试通过，含真实 Linux LibreOfficeKit 的 Word 写入；DOM/IPC 和模型响应为模拟。未完成 Mac、原生输入法、真实模型和用户文档验收。本次为 0.37.26 工作候选，不覆盖已验证权威版本；GitHub 分支仍不完整，未合并或发布。下一步继续完整 Office 编辑及 Mac 安装验证，先补齐并核对分支全部文件再合并。

## 2026-11-06 综合办公验证补记（未发布）

2026-11-06 验证补记：最终候选 Word/PPT/Excel 组合串行 56 项通过，命令队列 14 项通过、打包脚本 28 项通过；浏览器测试因缺 jsdom 未启动。另对本轮较早、独立冻结的源码树循环执行真实 Linux Kit Word/Excel/PPT 测试，111轮无失败后在1694.7秒主动结束，未达到30分钟压力测试，且该树早于最终图片锚点/尺寸/裁剪修改，不能作为最终代码30分钟稳定性结论。先前非隔离短测出现2项内核异常退出，根因未确定。Mac/真实模型/用户原件/完整UI和新离线应用未验收。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 后续 Excel 图片裁剪保护：校验每个工作表图片源裁剪 a:srcRect 四边（缺省为零），变化、重复或非法数值拒绝发布；真实 Linux Kit 未裁剪图片写入、输出注入裁剪负例及 Excel 全组18项通过。未验证所有复杂裁剪、旋转、效果、图表及实际文件保真；Linux 与 Mac 可能转换裁剪参数，当前严格策略可能保守拒绝。命令队列14项通过（包含真实Node子进程）；浏览器运行时测试因缺 jsdom 无法启动，不能视作通过。修改 desktop/runtime/office-cells.mjs、desktop/tests/office-cells.test.mjs；未构建安装包、未发布，Mac/真实模型/完整UI/用户原件仍未验收。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 后续 Excel 跨单元格终点：原文件与结果均为两格锚点时，额外核对终点行列与偏移（720 EMU 容差）；原终点无法与输出端点或可比较宽高对应时保守拒绝。合成跨格终点篡改负例及 Excel 全组18项通过。另一个真实 Linux Kit 跨格样例把原终点 (col4,row5,0,0) 输出为 (col3,row4,611280,190080)，当前拒绝；这些表示是否在该文件中视觉等价需结合列宽和行高进一步验证，不能称已修复或支持所有跨格图片。修改 desktop/runtime/office-cells.mjs、desktop/tests/office-cells.test.mjs；完整 UI、Mac、真实模型和原文档未验收，未发布候选。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 后续 Excel 图片尺寸保护：当原图片锚点含明确 ext 尺寸，或两格锚点起止处于同一单元格时，保存后比较可解析宽高，容差720 EMU；有原尺寸但输出无法比较时保守拒绝。原本跨单元格两格锚点的宽高尚不可直接计算，仍只校验起点和内容/引用，不宣称全尺寸保护。实际 Linux Kit 两张图片的写入和缩放/无法比较输出负例通过；Excel全组18项通过。此前“未检查任何尺寸”由本条有界范围更新。Mac、真实文档、UI、模型和安装未验收；未发布候选。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 后续 Excel 图片起始锚点保护：在已有逐工作表图片顺序和资源内容核验上，额外比较每张图片起始单元格、起始偏移（或绝对位置）；单元格必须相同，偏移允许最多 720 EMU 取整差。支持一格和两格锚点起点互认，起点移动、过期或非法锚点阻止发布；不检查终点、尺寸、裁剪、旋转、图表或全部视觉效果，可能因内核重新锚定而保守拒绝。实际 Linux LibreOfficeKit 合成两张图 XLSX 写入成功；跨行移动、偏移720/721边界、资源交换/外链/丢失和故障草稿拒绝均通过。Excel完整串行18项、打包脚本28项通过。此前“未检查锚点”由本条精确范围更新。Mac原生、真实模型、用户文档、完整UI/依赖和新离线包未验收；综合办公工作候选未发布。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 后续 Excel 图片引用保护：保存回执进一步按工作表记录有序图片内容摘要，验证图片仍引用相同资源，防止不同图片互换或跨表变换绕过单纯内容集合核验。未检查图片锚点、裁剪、效果及图表，不等同视觉保真；不同编辑器重新排序对象时可能保守拒绝。真实 Linux LibreOfficeKit 合成含两张不同 PNG 的 XLSX，编辑单元格并用 openpyxl 确认图片仍在；交换图片关系负例拒绝，相关 Excel 18 项全通过。旧文字“未校验两图片交换”已被本条更新覆盖。仍无 Mac 原生、完整UI/模型、用户原件和安装验收；综合开发候选未发布。

## 2026-11-06 综合办公工作检查点（未发布）

2026-11-06 综合办公检查点：Excel 单元格常量写入、公式及格式修改复用的 workbookContentsVerifier 新增图片资源 SHA-256 多重集合校验，并逐一检查 drawing 内图片引用的关系存在、内部类型、路径与目标资源存在；输出图片被篡改、删除、新增重复或关系改外链时拒绝发布，受校验草稿无法绕过手动保存。引擎可重命名图片资源；此机制不校验锚点、裁剪、两图片交换、图表、全部样式或视觉保真；不支持的关系可能保守拒绝。真实 Linux LibreOfficeKit 合成带图 XLSX 完成单元格编辑，openpyxl 独立检查；注入篡改输出后原版本保留且手动重试不能绕过。Excel 18 项串行通过，其后新增外链负例并独立通过。修改 desktop/runtime/office-cells.mjs 和 desktop/tests/office-cells.test.mjs。无 Mac、真实 UI/模型或用户文档验收；不发布微版本，未构建新应用，不覆盖权威来源。

## 2026-11-06 · 综合办公工作检查点（未发布）

2026-11-06 综合办公检查点：PPT 文字/格式保存回执新增普通图片源裁剪（a:srcRect 四边）核验：缺省按零处理，非法数值或重复项拒绝，保存后变化拒绝发布并保留原版和未发布草稿。实测 Linux LibreOfficeKit 将测试图片左裁剪 12500 改为 12736、上裁剪 10000 改为 9906；严格检查因此可能阻止带裁剪图片保存，不能称已修复内核差异或实现视觉无损。测试含输入篡改、删除裁剪、格式操作及模拟保存篡改；无 Mac、真实文档、完整 UI 或付费模型验收。修改 desktop/runtime/office-presentation.mjs、desktop/tests/office-presentation.test.mjs。

另一次短时交叉压力测试出现 Excel 两项“Office内核已退出 1 Unspecified Application Error”；原因未知，重新从原始检查点解压独立树运行重复测试，不把偶尔通过当根因修复。完整综合版本、离线包和 GitHub 发布仍未完成，权威来源未覆盖。

## 2026-11-02 · 0.37.19 PPT选中文字字号与字色

## 2026-11-04 · 0.37.22 PPT选区手动编辑

用户实测反馈字体恢复；沿用0.37.21字体配置。PPT新增选中文字后载入编辑框、修改、保存和取消路径，绑定原生选区及sequence，写前持久审计，保存时校验文本与既有直接格式；迟到选区、审计失败和错误输出不发布。仅唯一普通单段文字选区，不是完整PPT编辑器；真实Mac原文档尚未验收。见docs/PPT_MANUAL_EDIT_03722.md。


## 0.37.21 中文字体候选

Office Kit 进程在 macOS 使用独立 Fontconfig 文件，读取系统、公共、用户及 LibreOffice 自带字体目录，缓存放在私有任务目录，不修改应用签名包或文档。编辑与 PDF 预览共用该进程。Linux 字体配置及真实引擎测试支持该方案；尚未在 Apple 芯片 Mac 或用户原文档验收，不能承诺已解决 Mac 方框。详细证据与局限见 docs/MAC_FONT_CANDIDATE_03721.md。


## 2026-11-04 · 0.37.20 视口滚动与受限文件搜索

Office 画布增加纵向滚轮与可拖动滚动条，切页归顶并按内核视口坐标映射点击；帮助文字折叠，避免固定栏遮住文档。已授权目录内的系统 find 仅允许明确的只读表达式自动执行，保留审计；Shell、删除、未知命令仍逐次审批，不能以“非删除”假设安全。Mac 的中文方框和预览缺字尚未定位或验收。见 docs/OFFICE_VIEWPORT_AND_CLI_03720.md。


新增 office_format_presentation，标准模型工具循环实际设置当前唯一普通单段文本框同格式选区的字号/字色，不改文字。无Electron核心复用逐字输出验收，主机与worker双层固定参数/页面选区守卫，逐次批准/持久审计/取消/CAS和每请求一次修改额度保持；未实际修改或格式不符不提交，手动保存不能绕验收。详见[实现与验证](docs/PPT_DIRECT_FORMAT_03719.md)及validation/v0.37.19。Mac/付费模型/IME/原生签名未验收，安装慢未解决。GitHub历史审批额度提示Nov2 07:24恢复，本轮凌晨未到时点不重试或换路线；长期发布授权有效。下一轮Mac优先，否则受控PPT编辑或选区上下文，持续办公目标未完成。

## 2026-11-01 · 0.37.18 PPT选词替换直接格式验收

扩展无Electron PPT核心，核实际保存文件已知字号/粗斜体/下划线/字色/适用脚本字体与对齐，允许run拆合；混合选区/复杂效果目标调用native前拒绝。文字正确但格式丢失不能发布，显式save不能绕验收，私有草稿修正后可手动重试。沿原审批/审计/选区/版本/取消与一次修改额度，不是新增AI设置PPT格式或完整OOXML保真。详见[实现与验证](docs/PPT_FORMAT_RECEIPT_03718.md)及validation/v0.37.18。Mac/付费模型/IME/原生签名未验收，安装慢未解决；GitHub额度Nov2前不绕过，长期发布授权保留。下一轮先Mac原文档验收，否则受控PPT直接格式编辑/选区上下文，避免只写说明队列。

## 2026-11-01 · 0.37.17 Word整表指定外边

office_table_grid新增可选edges仅修改完整唯一未合并表的指定外围边，省略仍保持原全部网格。内部线与未选外边、padding/文字及非目标部件保留；单边不是每格同名边，start/end为逻辑方向。复用无Electron核心与审批/审计/版本/取消/CAS及同session预加载重载，审批明示清空原生Undo/Redo、前5持久版本保留。详见[实现与验收](docs/OFFICE_PERIMETER_03717.md)及validation/v0.37.17。Mac/真实付费模型/IME/原生签名未验收，安装慢未解决；GitHub额度Nov2前不绕过，长期授权继续。下一轮先Mac原文档验收，否则复杂PPT文字保护或受控Office编辑，不只做说明队列。

## 2026-11-01 · 0.37.16 Word完整表格全部网格

新增office_table_grid与无Electron的OOXML核心：仅整个Word包唯一正文顶层表格的完整选区，设置全部实线含内横/竖线；保留文字、直接格式、padding和非目标部件。候选经真实Kit预加载/画面与全部件SHA核验后CAS提交，在同一session自动换worker，审批明示清空原生Undo/Redo栈、前版保留。初始化/候选漂移/拒绝/取消/审计/磁盘失败保留旧版，文档服务新增提交guard支持关闭期间写前写后检查/回滚。不是失败UNO网格原型换名放行；多表、部分、合并、嵌套和复杂目标保守拒绝。详见[实现与验收](docs/OFFICE_TABLE_GRID_03716.md)和validation/v0.37.16。保留原Web/Python、白蓝logo、旧身份及所有旧能力。Mac/付费模型/IME/原生签名和复杂Office保真仍待验收，安装慢未解决，GitHub额度提示Nov2当前不绕过，长期发布授权保留。下一轮Mac优先，否则受控单边或PPT复杂文字保护，不只加说明队列。

## 2026-11-01 · 0.37.15 Word格式完成与成品验收

Word格式工具等待固定原生命令完成通知，新增无Electron的DOCX核验核心：选区唯一对应正文连续纯文字段落，检查全部正文/页眉页脚段落文字保持，并逐片段验证请求的西文/东亚字体、字号、字色与底纹，允许原生拆run。原生未执行/部分执行/缺属性均不能发布；调用前保留dirty和验收器，手动save不能绕过，最后异步查询后再检查取消/版本，worker独立核expectedSelection。跨段全选旧能力保留，复杂/歧义选区保守拒绝，非全OOXML/字形保真。首轮错误与复测见[实现与验收](docs/OFFICE_WORD_RECEIPT_03715.md)及validation/v0.37.15。保留原Web/Python122文件、白蓝logo和旧身份。Mac/付费模型/IME、签名安装、安装速度仍未验收或未解决；GitHub此前额度提示Nov2，不重试或换路线，长期发布授权保留。下一轮Mac优先，否则Word网格/单边或复杂PPT文字保护；不只写介绍队列。

## 2026-10-31 · 0.37.14 Excel原生单格受控公式

新增office_set_formula，单格同表算术/七函数数值结果，复用既有AST/依赖核心与原生受控定位写入；保存前核验全工作簿数据/公式及全部公式缓存，保留审批/审计/CAS/一次修改额度/错误阻断和草稿验收重试。独立布尔/文本、外链、跨表、循环、错误、共享数组/图表/合并等拒绝。没有放开常量或通用粘贴公式。449核心完整串行/9新增公式/11最终Chromium/26打包通过。首轮CJK UI失误复测通过但根因未知，保留失败记录，不称稳定性已修。详见[实现与验收](docs/OFFICE_NATIVE_FORMULA_03714.md)。Mac/付费模型/IME未验收、未公证，安装慢未解决；GitHub额度提示Nov2不绕过，长期授权保留。下一轮Mac优先，否则Word网格或PPT复杂文字；不只改说明队列。

## 2026-10-31 · 0.37.13 PPT精确文字选区与替换

PPT普通单段文本框双击/全选后可用固定方向键与Shift精确选词；现有office_replace_selection绑定真实文字类型/页面/sequence，审批与持久审计后再检查，保存前核验真实PPTX所有页形状顺序/类型和段落文字，只允许唯一目标子串变化。重复词、分组/表格/域/链接/多段拒绝；no-op与显式保存重试受同一验收器保护。440核心完整串行/10真实Chromium/26打包通过。见[实现与验收](docs/OFFICE_PPT_SELECTION_03713.md)。不是完整对象/格式无损/IME；Mac和付费模型未验收。保留旧能力与Web/Python、白蓝logo/旧身份，安装慢未解决。GitHub额度提示Nov2，未重试或绕过，长期授权保留。下一轮Mac优先，否则Word网格/受控公式或PPT复杂文字。


## 2026-10-31 · 0.37.12 Excel选区真实格式

新增office_format_cells，真实内核修改当前矩形的字号/字色/底色；保存前核验XLSX目标样式及全工作簿单元格数据/公式不变，精确十进制比较，主题tint/条件格式/目标富文本/共享数组公式保守拒绝。原生范围/审批/持久审计/CAS/输出失败草稿重试保护保持，checkCells供新旧工具共用。433核心/最终9格式/9Chromium/26打包通过。见[实现与验收](docs/OFFICE_CELL_FORMAT_03712.md)。Mac/付费模型/IME未验收，ad-hoc未公证、安装慢和复杂保真未解决。GitHub仍受Nov2恢复的审批额度阻塞，本轮不绕过、未上传PR合并发布；长期授权有效。下一轮Mac优先，否则PPT选区/Word网格/受控公式。

## 2026-10-31 · 0.37.11 Excel原样文本常量

现有office_update_cells新增显式{text:...}，真实原生写入和XLSX字符串类型/精确值核验，保留前导零/日期样式/公式样式文字；普通字符串规则保留，不能执行公式。完整矩阵预检/审批/审计/CAS和失败草稿重试保护沿用。首次空文本被原生写成单引号已被核验拦截并修正，不降低非空类型断言。见[实现与验收](docs/OFFICE_LITERAL_TEXT_03711.md)及validation/v0.37.11记录。原Web/Python、白蓝logo和旧身份不变。Mac/付费模型/IME未验收、ad-hoc未公证、安装慢未解决；GitHub额度提示Nov2，当前不绕过、未新发布。下一轮先Mac或Excel精确格式/PPT选区。
## 2026-10-30 · 0.37.10 真实Excel选区常量更新

新增office_update_cells，绑定原生part/地址/光标/HTML矩形指纹，强制同尺寸单行常量矩阵，逐次审批/审计/CAS与真实XLSX输出验收；通用AI粘贴不再可扩展Excel选区。真实HTTP模型夹具→LinuxKit→独立openpyxl核验区域/样式/范围外公式重算；原生no-op或错误输出无法经显式save绕过，模型“成功”不能覆盖工具失败。修复真实Redo用例暴露的保存先于动作完成时序，以原生通知+真实历史栈状态验证后保存。419核心/最终12相关/8Chromium/26打包通过。Mac/付费模型/IME未验收，原生字体行高规范化仍有边界，ad-hoc未公证，安装耗时未解决。详见[实现及验收](docs/OFFICE_CELLS_03710.md)。GitHub额度提示Nov2恢复，当前未重试，无上传/PR/main/Release。保存以最终交付回执为准。

## 2026-10-30 · 0.37.9 精确选区文字与背景颜色

新增office_format_selection的fontColor/backgroundColor，固定原生Word选区颜色/字符底纹，两层RGB参数校验，保留原生审批/审计/CAS/单次额度；精确TARGET生产UI→实际HTTP模型夹具→真实LinuxKit→独立DOCX只改选词验证，411核心/7Chromium/26打包通过。网格原型独立DOCX断言未达到指定颜色/线宽，已撤回，外框仍清内部线。Mac/真实付费模型/IME/安装速度未验收或未解决，ad-hoc未公证。详见[实现与验收](docs/OFFICE_SELECTION_COLORS_0379.md)。下一轮Mac真实链路或Word网格/单边与ExcelPPT受控编辑。GitHub审批额度提示Nov2恢复，当前不绕过，无新上传/PR/main/Release。


最终离线核验：483219295字节，SHA4728e067d4ddf214c5d49edbffdfc16e5ef3d52e1b7afa38ced380b47cc6048b；ASAR6b1044e93f341ec8e28e32f84cf504aeec91233549e43cfb9b8e12d4744cf131与153生产文件及最小package逐字节一致，无hostpyc；278可运行MachO/93545代码页，20727应用条目+5配套/47链接，零残留/闭合CRC/实际Electron页篡改负例通过。相比0.37.7载体仅Info.plist/Electron/app.asar/CodeResources四条目改变，Python/LO原字节/模式/链接不变。407核心/6Chromium/26打包通过后生成完整源码；权威替换将使用本轮观察的expected_current_version=46保护，是否保存和远端回读成功以包外最终回执为准，不预写成功。GitHub仍无本轮上传/PR/main/Release。

# WillBuddy 0.37.8 · 共用Office内核导出PDF

## 实际变化

从当前权威0.37.6/v46重取678内容SHA，并从已保存0.37.7候选重取684内容SHA后接续。保留0.37.7真实Word键盘选区，不从旧main或scratch退回旧代码。

Apple芯片安装版的Office预览改用同一LibreOfficeKit适配器，编辑和PDF转换共用main中的officeRuntime工厂及runtime/office-kit.mjs。新增无Electron的runtime/office-pdf.mjs，真实读取私有DOCX/XLSX/PPTX副本，经固定saveAs(pdf)写到私有output/document.pdf，再经服务读取上限、PDF头和文档版本核验，交给原有离线PDF.js分页。没有截图代替PDF或XML文本代替渲染，没有新增占位入口；生产成果“预览”直接使用新链路。原CLI转换保留为没有配置pdfRuntime的显式开发/兼容路径，安装版Kit失败不会自动重放/改走CLI。原独立窗口编辑、历史、文档AI、字体/外框和所有其他能力保留。

worker只允许无参数export_pdf，固定目录/文件/格式；拒绝额外路径参数，不暴露任意导出路径/UNO/脚本。主服务仍最多2个预览、整体60秒（覆盖准备/运行时解析/启动/导出/回读），16MiB输出；PDF页数/像素仍受原renderer限制。16MiB为导出后回读门禁，并非OS磁盘配额。输入沿原ZIP/XML/宏/外链/4MiB门禁，最高宏安全私有profile，无共享cookies/账号或TCP监听。程序仍以当前OS账号运行，非OS沙箱。

startOfficeKit新增AbortSignal与closed生命周期：启动前及复制worker后重查取消，等待ready或执行期间取消会杀掉自有进程、拒绝挂起请求并等待退出；预览适配器对迟到runtime/driver也立即拒绝并关闭迟到driver，停止/超时/退出不发布成功PDF，也不自动重试。成功后同样结束临时worker。新增PDF回读后的当前版本/SHA和取消再检查，避免读取期间并发改动返回旧结果。无持久数据迁移、新安装依赖或第三方许可变化。

## 证据与上轮阻塞边界

本轮全新取回源码后，**未修改前**的原生CLI三格式用例通过（19.2秒），之前的XLSX→PDF卡住在当前环境未复现。因此不能把它归因为确定的源码缺陷，也不能宣称旧CLI卡住根因已修。strace诊断因PTRACE_TRACEME Operation not permitted被宿主阻止，未提权绕过。新Kit导出路径真实成功；选择共用内核是本轮实际架构/功能增量，不是把旧失败测试删除或改成跳过。

407项核心完整串行通过，原CLI三格式测试保留并通过；新增7项PDF/生命周期测试单独通过。真实LinuxKit输出Word、两表Excel、两页PPT的PDF，pdftotext独立核对两表文字/600/900和两张幻灯片，原文档bytes/revision不变、私有任务目录清空。另验证双容量/取消释放、迟到driver只关闭不导出、版本漂移/非法PDF/链接输出拒绝、真实已ready Kit取消退出、无ready协议进程夹具的启动取消/超时无活进程遗留、预取消不启动、退出时runtime迟到不启动。启动未ready测试为真实进程协议夹具，不是Mac或LibreOffice初始化卡住的实测。

6条真实Chromium路径通过：新生产文档页→双表Excel→真实Kit PDF两页→opaque分页/提取文字→服务提交v2后重开真实750而非600、额外网络0、子帧无原生桥；保留精准选词→HTTP模型夹具→真实Kit→DOCX字体、CJK字体、Undo/Redo、Word外框及离线CID中文PDF回归。首次新PDF测试locator(details)匹配两页而报严格模式错误，改为读取全部页文字后重跑6条通过，没有放宽内容断言或声称修复生产问题。26项打包与真实文件系统事务测试通过。122个原Web/Python保护文件SHA不变，旧35Python执行器未改未重跑。

真实传输/进程/二进制文档/PDF与生产浏览器执行，模型语义/原生IPC/审批/Keychain仍夹具。LinuxLibreOfficeDev26.8.0.0.alpha0 build2c87e51eeaa2b413ff4ae097b2705eea1995d8e5不同Mac包26.8.1.1；无Mac原生Kit初始化/签名/Gatekeeper/字体/IME或真实付费模型验收。不把PDF.js中文资源回归等同原生Kit字形修复，不保证复杂Office任意保真或完整Office替代。

## 交付、参考与下一轮

离线构建使用已逐字节/页/清单核验的0.37.7候选ZIP作为静态运行时载体，固定SHA084c3d65b12304b4f0240f180f8733e26db205eda3f2cc11a43c5efe66b478ef；这不把历史失败候选追认为已发布版本。应用源码完全更新为0.37.8，原Python/LO运行时逐项保留，只有完整静态/ASAR/闭合ZIP检查通过才交付。仍ad-hoc未公证，没有新小更新/DMG/PKG，安装耗时和历史异常截断临时副本来源未解决，不要求为提速反复重装。最终构建摘要见validation/v0.37.8.json，保存回读以包外最终回执为准。

2026-10-30复查Quick官方系统工具页 https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 及 https://quick.aws.com/sn ，REA复用已有公开包部分静态证据，无新Amazon原生运行结论。LibreOfficeKit转换/固定C API参考 https://docs.libreoffice.org/libreofficekit.html 及 https://docs.libreoffice.org/desktop/html/init_8cxx.html ，不复制分发上游实现/资产。

GitHub只读main仍27bd38f6b43806fb702c62ec4586426730b8190a，0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前创建PR自动审批服务额度故障提示Nov2恢复；本轮未到时点，按用户要求不重试、不改插件/CLI绕过。长期每轮通过后分支/PR/main/Release授权有效，无新确认要求；本轮无GitHub上传/PR/main/tag/Release，不假造链接。

下一轮优先Mac原始codesign stderr/内置Python和Kit真实预览/编辑/IME/实际模型验收；无机器继续Word内部网格/单边和Excel/PPT受控选区编辑。跨Web完整业务核心、OAuth/stdio、自主并行任务组、完整Office对象/图表/修订和OS隔离仍差距。旧CLI未复现并不消除稳定性调查，保留原失败记录，不删除失败候选或旧下载。

实际代码变更：desktop/main.mjs共用officeRuntime；runtime/office-kit.mjs取消/退出、runtime/office-kit/worker.py固定export_pdf；services/libreoffice.mjs预览分支/全程时限/回读guard；新增runtime/office-pdf.mjs、tests/office-pdf.test.mjs、tests/acceptance/office-pdf-kit-live.mjs；package/lock版本、scripts/repackage-native-mac.py载体pin及日志/差距/下载/发布/验证记录。README保持产品重点，品牌/白蓝主题/旧加密身份不改。


---


## 最终候选状态（2026-10-30）

最终完整串行核心399/400，唯一未过为既有native-office的XLSX/PPTX转PDF用例：独立诊断确认XLSX先卡住，60秒生产转换超时；默认PDF/显式calc_pdf_Export各20秒诊断也超时，禁OpenCL+svp未解决。独立PPTX默认/显式转换实际3.0/1.9秒成功，不把组合测试失败说成PPTX也已证实卡住。原因未定位，不放宽时限或跳过用例，不把失败改成通过。首次并行验证397/400（另有新字号断言与既有CLI短时限断言），最终隔离复测这两项通过；不声称其并行稳定性根因已修。

新增5项选区核心、4条真实Chromium唯一路径（最终重复按键修正后又重跑导航1条）、26项打包通过。完成arm64候选483218919字节，SHA084c3d65b12304b4f0240f180f8733e26db205eda3f2cc11a43c5efe66b478ef；ASAR a7cf5d6d56da93e63b79027768327fd38f7933204a159ef9f2b5d8ab2daea1b8与152生产文件及最小package逐字节一致；278MachO/93545页、20727应用条目+5配套、47链接、零残留/闭合CRC/实际Electron页篡改负例通过。仅Info.plist/Electron/app.asar/CodeResources四条目不同，Python/LO原字节模式链接不变。122原Web/Python保护文件不变，旧35执行器未改未重跑。没有更换运行时、放宽签名或隔离。

因此仅保存0.37.7完整候选源码和arm64候选，**不替换正式权威0.37.6/v46，不声称本轮完整通过或发布**。下一轮必须重新读取当时权威，再取本候选保留键盘增量，先定位XLSX原生CLI PDF阻塞，缺少Mac目标机器的签名/字体/IME/真实模型边界继续明确。GitHub仍待此前自动审批额度提示Nov2恢复，不重试/换路线；长期每轮通过后发布授权保留。源码保存与回读以包外最终回执为准。

# WillBuddy 0.37.7 · Word键盘选区与局部AI格式修改

从权威0.37.6/v46重新获取，678内容文件逐SHA核验后开发。没有从旧scratch或GitHub旧main回退源码。

## 实际变化

Word画布支持方向键、Home/End及Shift/Ctrl修饰：光标定位、扩展文字选区、到行首尾/文首尾，再通过现有“AI编辑选区”进行替换或字体/字号修改。点击画布会获得键盘焦点，焦点边框为品牌蓝；输入框内的方向键仍编辑输入框。文字输入仍使用下方输入框，不是完整原生键盘输入或中文IME集成。尚无光标自动跨屏滚动/PageUp/PageDown；长文定位后需手动上一屏/下一屏。Mac Cmd/Option导航尚未映射；未声称Mac实际快捷键已验收。

新纯共享office-navigation.js定义六种导航键。主服务只接收key/shift/control（及桥接op），Python worker再次验证格式、精确字段与布尔值，固定映射VCL键码，charCode始终0、成对发KEYINPUT/KEYUP；不接收任意数字键码、文字、Delete、Enter、任意UNO或路径。只支持DOCX，Excel/PPT拒绝。UI忽略isComposing/keyCode229、Alt/Meta，最多16个尚未完成导航请求，超出的重复按键丢弃；服务仍串行执行并核对当前版本/30分钟许可。不是OS沙箱或全局键盘钩子。

每次导航推进sequence，使先前AI资料/选区凭证失效；没有正文修改时不标dirty、不创建revision或撤销记录。实际AI修改继续沿用逐动作原生审批、持久审计、真实选区与revision/SHA检查和CAS，保存新版本，前版保留。旧字体、表格外框（会清内部线）、Undo/Redo与其他能力保持。

## 验证与边界

新增核心检查：非法键/修饰键/组合输入拒绝；真实LinuxKit从文首移动7字、Shift选6字得到TARGET；导航不落新revision/undo，格式工具只将TARGET设22pt，独立python-docx核对完整原文和选区外非22pt，旧凭证失效；排队时真实外部提交新revision阻断下一导航；worker独立拒绝伪造字段；Excel不发Word键事件。

新增生产Chromium路径：等待真实画布就绪、点击获得焦点、同一事件轮40次重复键只受理16个、精准选词→Enter→真实本机HTTP模型夹具→真实LinuxKit→导出DOCX独立检查→刷新保留文档聊天；组合输入/未支持Delete不改变选区，AI输入框方向键不改变文档sequence。首次重复键测试没有等待初始画布绘制，错误假设已执行鼠标三事件，已改为等待真实parts/画面后测试，不称生产Bug修复。

首轮全量回归与构建/其他原生验收同时进行时为397/400：既有Office转PDF超时、新选区字号断言失败、既有CLI短时限日志截断断言失败；原因未确定，选区单项诊断重跑通过，不把它当并行压力已通过或已定位原因。最终测试与构建结果见validation/v0.37.7.json及-tests.txt；没有通过前不声称完整回归通过。

原生Electron IPC/审批/Keychain和模型语义仍为夹具；真实HTTP传输、LibreOfficeKit进程与DOCX字节是真实执行。LinuxLODev26.8alpha不同Mac包26.8.1.1。未Mac原生启动/键盘/CJK字形/IME、真实付费模型或Office/WPS保真验收。未引入安装依赖、数据模式或字体，没有修改许可、旧身份、白蓝logo、原Web/Python。

## 打包、发布与下一步

arm64离线构建固定已验0.37.6基包SHA e3b239241f2e8173c33df46c88dd7514a931d827d8134f041e2e74445a0ad352，使用/tmp私有0700独立输入输出、解压精确树与所有签名/代码页/闭合ZIP门禁。仍ad-hoc未公证，代码页不替代Mac codesign深严格/Gatekeeper；安装解压慢和历史异常临时副本根因未解决，无新小更新，不要求用户为提速重复全量重装。

GitHub只读并发核对main仍27bd38f6b43806fb702c62ec4586426730b8190a、0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前CreatePR自动审批额度故障提示Nov2恢复，当前未到时点，按用户要求不重试、不改插件或CLI绕过；无本轮上传/PR/main/tag/Release。用户长期每轮发布授权持续有效，不需重问。恢复后补齐已验证版本，不将失败0.37.3 app候选当正式发布。

Quick复查官方系统工具页 https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html ，REA复用已有公开安装包部分静态证据，无新Amazon原生运行结论。完整跨Web业务核心、OAuth/stdio、自主并行组、语义知识索引、完整Office键盘/IME、复杂对象与网格边框仍差距。下一轮先Mac原始codesign stderr/实际原文档字体与模型安装验收；缺机器继续Word内部网格线/独立单边及精确选择后的Excel/PPT受控编辑。

原生键定义只读依据（不复制分发上游实现）：
- https://raw.githubusercontent.com/LibreOffice/core/master/offapi/com/sun/star/awt/Key.idl
- https://raw.githubusercontent.com/LibreOffice/core/master/include/vcl/keycodes.hxx
- https://github.com/LibreOffice/core/blob/master/include/LibreOfficeKit/LibreOfficeKit.hxx

实际代码变更：desktop/src/shared/office-navigation.js（新）、src/office/office.js/index.html/office.css、services/office-workspace.mjs、runtime/office-kit/worker.py、tests/office-navigation.test.mjs（新）、tests/acceptance/office-navigation-live.mjs（新）、package/lock版本、scripts/repackage-native-mac.py基包pin；以及验证、计划/日志/差距/REA/下载和发布状态。README保持产品用途，不堆版本或测试计数。


---


最终arm64离线ZIP483218125字节，SHA e3b239241f2e8173c33df46c88dd7514a931d827d8134f041e2e74445a0ad352；ASAR a5fd8419a48c8a049afc1f40ed5c5ae3ecf1a5b89238949663155d88fc9e28ae与151生产文件+最小package逐字节一致。278MachO/93545页、20727应用+5配套/47链接、零残留/闭合CRC/真实Electron代码页篡改负例通过。与0.37.5仅Info.plist/Electron/app.asar/CodeResources四条目变更，全部Python/LO原字节模式链接保持。初次构建在新增最后异步查询后并发保护之前生成，不作为交付；最终新私有目录重建并重跑395核心/3Chromium。仍ad-hoc未公证，无Mac codesign深严格/Gatekeeper/原生启动与安装性能结论；无新小更新。源码/权威保存回读按最终包外回执记录，本文为构建时快照。

# WillBuddy 0.37.6 · Word表格外框样式

从当前权威0.37.5/v45重新获取，全部672内容文件SHA核验后开发。保留原西文/东亚字体与字号、真实撤销重做、双任务、旧加密身份与白蓝logo；没有更改原Web/Python或第三方许可。

新增runtime/office-table-outline.mjs无Electron参数核心和office_table_outline标准模型工具，接现有Office独立文档对话与共享执行名额。选中简单矩形Word表格区域后，发送诸如“蓝色1.5pt实线外框，四边内边距3pt，清内部线”。颜色#RRGGBB；线宽0.5–3pt/0.25步长；padding须显式0–12pt/0.5步长。它是外框预设，会清除该区域内部线并设置四边内边距，不是全部网格线或任意单边/虚线编辑；工具说明和原生审批完整展示这些变化。普通文字不适用。没有新占位按钮，通过现有文档AI对话实际执行。

worker从原生getTextSelection(text/html)读取当前真实选区，仅解析HTML结构，不执行脚本或加载资产；256000字节、单一表格、最多30行16列200格；拒绝合并、嵌套、不规则矩形、多表和正文混选。仅返回行列与私有SHA指纹，原HTML不发给模型/前端/审计。模型仅看到行列摘要，不能指定路径或UNO命令。Word表格内连续“全选”，直到选区栏显示“表格区域”，再交给AI；单次可能只选择单元格文字，不能假称已经整表选中。

主机与Python双层参数校验；当前revision/SHA/sequence、选区文字与HTML指纹分别在审批前、审批后、持久审计后重新核对；最后一次异步原生查询返回后，再检查取消、文档修订及30分钟许可。worker发固定.uno:BorderOuter前再核指纹，不暴露任意UNO/CLI/文件接口。与替换/字体工具共用每轮一次修改额度。保存新revision保留原件和前版，使用已有真实撤销/重做。外部并发改变、拒绝、取消或审计失败不发边框命令。LO原生保存会重新序列化OOXML，不称ZIP字节无损或任意复杂对象全保真。

实验证据：初次尝试Calc相关SetBorderStyle及InnerBorder参数，虽然未抛异常，但独立DOCX检查没有所需颜色/线宽，未交付。核对Writer执行分支后改固定BorderOuter，仅交付已验证的外框预设；不把失败实验称已实现全部网格线。实现依据只读核查上游sw/source/uibase/shells/basesh.cxx SID_ATTR_BORDER_OUTER与svx/sdi/svx.sdi：
https://raw.githubusercontent.com/LibreOffice/core/master/sw/source/uibase/shells/basesh.cxx
https://raw.githubusercontent.com/LibreOffice/core/master/svx/sdi/svx.sdi
没有复制分发上游代码或资产。

395核心最终串行完整通过（新增6项）；6项外框测试单独重跑通过；3条真实Chromium通过；26打包与文件系统事务测试通过。实际本机HTTP模型夹具→真实LinuxKit→真实DOCX，python-docx/lxml独立核对2×2中英文表格原文保持、0078CB外框/12八分之一pt=1.5pt、60twips=3pt内边距和内部线清除；原v1字节仍可取回，Store/文档独立聊天重载保持，后续真实undo产生v3。新拒绝测试包括普通非空文字选区、旧指纹、拒绝/取消/审计磁盘失败、worker伪造参数、真实合并/嵌套/32行超限选区；最后一次选区查询期间真实外部文档提交v2后，边框原生命令0次/dirty false。生产页面选区→Enter→HTTP工具循环→原生样式v2→二进制导出独立检查→刷新对话，另回归CJK字体和撤销重做真实页面。审批/IPC/模型语义/Keychain仍夹具；没有Mac原生编辑/字形/IME/付费模型验收，Linux开发内核不等于Mac包内26.8.1.1。

实际修改：desktop/runtime/office-kit/worker.py、services/office-workspace.mjs、services/office-chat.mjs、src/office/office.js/index.html；新增runtime/office-table-outline.mjs、tests/office-table-outline.test.mjs、tests/acceptance/office-outline-live.mjs；package/lock版本、脚本基包pin及验收/计划/日志/差距/下载状态。README仍只产品重点。无新最终用户依赖或数据模式，原Web/Python122保护文件SHA不变，旧35Python执行器测试未改未重跑。

Quick官方系统工具文档2026-10-29复查：https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 。REA复用既有公开安装包部分静态证据，没有新增Amazon原生运行结论。完整跨Web核心、OAuth/stdio、自主并行任务组、语义索引、Office完整键盘/IME与复杂网格/对象编辑仍有差距。

GitHub只读并发核对main仍27bd38f6b43806fb702c62ec4586426730b8190a，0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。用户长期发布授权有效，但此前CreatePR自动审批服务额度故障提示Nov2恢复，本轮未到恢复时点，没有重试/改插件或CLI路线绕过；无0.37.6上传/PR/main/tag/Release。此前0.37.1已发布，待恢复补齐验证版，不将候选保存当公开发布。

下一轮优先Mac原始codesign错误、当前原文档字体/模型与安装验收。缺机器推进真实内部网格线/独立单边样式与精确字符格式/ExcelPPT选择，避免继续只堆说明或队列。安装耗时和早期截断临时副本来源仍未解决，不宣称根治、不要求为提速反复重装；保留签名与隔离门禁。

---


最终离线构建：483216299字节，SHA256 1aba94bb84cdc4c2d3688eba1d7c5a69538c2475c9088c32a0c47ee87c1a9baf；ASAR70c1d2a67b83380b8a585c7c3a864a8a3759b9baddf6ee6a10096a47f36febe4与150生产文件及最小package逐字节一致。278可运行MachO/93545代码页、20727应用条目+5配套、47链接、闭合CRC/零残留和实际Electron页篡改负例通过。与0.37.4仅Info.plist/Electron/app.asar/CodeResources四条目不同，Python/LO全部原字节/模式/链接保留；内置依赖安装端不需npm/pip。本轮完整构建通过，仍ad-hoc未公证、无Mac深严格资源密封/Gatekeeper/安装运行结论；不是安装提速或历史异常临时副本根因已解决，没有新小更新。源码/权威保存与回读按包外最终结果记录；本文件是构建时快照。

# WillBuddy 0.37.5 · 内核真实撤销/重做状态

从权威0.37.4/v44重新获取，666内容文件逐SHA核验后接续，不依赖旧scratch。保留西文/东亚字体/字号、逐次原生AI审批、版本SHA/sequence/CAS、双任务、旧身份和白蓝logo，原Web/Python不改。

新增共享纯模块desktop/src/shared/office-history.js，主机服务和页面只接受0至100万整数的undo/redo计数。worker通过固定getCommandValues(.uno:UndoCount/.uno:RedoCount)向真正LibreOfficeKit撤销管理器查询；不从聊天记录/文档revision推测历史。空返回、不支持、无效和超限计数都作为未知禁用，不伪造可撤销能力，无任意UNO扩展。

按钮初始和执行中禁用，每次真实画面快照后更新可用状态与步数提示；服务在串行执行队列内重新查询，worker发出Undo/Redo前再次检查。空/未知历史拒绝，不增加sequence、不设dirty、不写新revision。手改/模型修改后沿原新版本保存，撤销/重做同样发布新revision，保留旧成果。新编辑清空原生redo分支；刷新窗口仍查询当前会话，关闭重开文档内核历史为空，不跨重启重放撤销。计数表示内核动作，不等于AI请求次数，一次多属性字体修改可能产生多个可撤销动作。

撤销已在内核执行但落盘失败时仍保留dirty草稿，不能称已成功保存；重新快照显示当前原生redo状态，显式保存重试成功后才提交新revision。任何界面操作错误后历史按钮先禁用，直到下一次成功快照。历史属于当前进程，不新增数据库模式或安装依赖。

本轮389核心完整串行通过（新增4项）、16项相关单独通过、2项真实Chromium、26项打包/事务测试通过。新增真实Kit测试覆盖初始空栈/拒绝空命令、写入→undo→redo真实正文与revision、undo后新编辑清redo、关闭重开清历史；注入驱动验证未知/伪造状态和排队操作不发命令；真实内核undo后注入磁盘失败保留草稿/旧持久版并可手动保存重试。生产Chromium页面真实写入v2→按钮可用→undo原文v3→刷新→redo改文v4，未调用模型；另回归真实本机HTTP模型夹具→CJK字体原生修改链路。审批/IPC/模型语义/Keychain仍夹具，LinuxLODev26.8alpha不同于包内Mac26.8.1.1，无Mac/真实付费模型/CJK像素/IME验收。

实现依据为上游desktop/source/lib/init.cxx getUndoOrRedoCount与doc_getCommandValues，固定查询直接返回SfxUndoManager计数：https://raw.githubusercontent.com/LibreOffice/core/master/desktop/source/lib/init.cxx 。本轮只读检查，不复制分发上游实现。Quick官方系统工具文档2026-10-29复查：https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html ，REA复用已有公开包部分静态证据，没有新增Amazon原生运行结论。自主并行子任务、语义资料索引、跨Web完整业务核心、OAuth/stdio、表格边框与复杂Office对象/输入法仍有差距。

本轮实际修改：desktop/runtime/office-kit/worker.py、services/office-workspace.mjs、src/office/office.js和index.html；新增src/shared/office-history.js、tests/office-history.test.mjs、tests/acceptance/office-history-live.mjs；scripts/repackage-native-mac.py固定当前已验0.37.4基包SHA；package/lock版本和迭代/验收记录。README保持产品内容，不堆版本计数。

GitHub用户长期发布授权仍有效。但此前CreatePR自动审批服务额度故障提示2026-11-02恢复，当前未到恢复时点，不换接口/插件/CLI绕过。本轮公开只读核对main仍27bd38f6b43806fb702c62ec4586426730b8190a、0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42；没有0.37.5上传/PR/main/标签/Release。待额度恢复补齐验证版发布，不把候选保存称发布。

下一轮优先真实Mac签名原始stderr、当前字体/模型与安装验证；缺目标机器继续Word表格边框、精确字符格式与Excel/PPT受控编辑。安装耗时、原先截断临时副本来源仍未定位，不宣称解决，不要求为提速重复全量重装；保持隔离和签名门禁。

---


本轮最终构建核对：干净0.37.4 arm64 ZIP483215507字节，SHA3470dcff2fddb3ad27c7fe0ea9e6f9d0237af7ac0f8b07443ab69c1190a43a8a；ASAR fd0922c1300ca4958f0e58746b478e25615c80e9b94961ae0d9a4b1c104a3470，与149生产文件及最小package逐字节一致，无宿主字节码。278可运行MachO/93545代码页、20727应用条目+5配套、47链接、零残留、闭合CRC、实际Electron页篡改负例拒绝。与0.37.2比较仅Info.plist/Electron/app.asar/CodeResources四条目改变，全部Python/LO运行时条目字节/模式/链接不变。首次带开发字节码包不交付，仅当前干净包有效。仍ad-hoc未公证；页哈希不替代Mac codesign深严格资源封印/Gatekeeper/安装/字体显示验收。不把本轮隔离目录构建通过称先前临时副本根因或安装速度已修；没有新小更新，用户无需为提速反复重装。
public只读并发核对main仍27bd38f6b43806fb702c62ec4586426730b8190a（0.37.1），0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。没有本轮0.37.4 GitHub上传/PR/Release；此前自动审批额度故障未到恢复时间，不绕过。保存与权威expected43更新按包外最终回执记录；本文件是构建时快照。

# 0.37.4 · Word选区东亚字体与审计后取消保护

从权威0.37.2/v43（653内容SHA）及最新0.37.3-r1候选（662内容SHA）重新获取核验后接续；保留西文字体/字号及构建输入校验，不回退候选代码。新增office_format_selection.fontNameAsian，映射固定.uno:CharFontNameCJK及CharFontNameCJK.FamilyName参数。fontName仍仅表示西文字体；统一中西文时须显式分别指定。仅DOCX当前真实非空选区，80字符字体名和控制/路径字符限制、主机与Python双校验、逐次原生确认、sequence/revision/SHA、写前持久审计与CAS及一次任务一次修改额度保持。新增审计返回后取消/版本/30分钟许可检查，取消时不再向内核发格式命令。

验证实际OOXML写入eastAsia，不等于安装/捆绑字体，不保证目标Mac已安装所选字体，不宣称所有中文方框已修复。没有分发微软雅黑或新字体，没有改LibreOffice上游/原许可。Office侧栏说明新增中西文字体区分，没加占位按钮；手工字体工具栏/表格边框/撤销可用状态/Finder关联仍待做。

本轮385核心测试串行完整通过，14相关测试单独通过；新增3项涵盖Asian参数边界、真实本机HTTP模型夹具→真实LinuxKit→DOCX独立python-docx/lxml校验eastAsia=Noto Sans CJK SC、西文Liberation Serif/15pt不变且中英文原文保持、审计期间取消原生命令0次且不产生revision。2条真实Chromium通过：新增生产Office窗口选区→Enter发送→实际HTTP工具调用→Kit写东亚字体→新revision/导出独立校验→刷新对话保持；既有手工/模型替换/保存/失败重试回归。原生IPC/审批/模型语义仍夹具，LinuxLODev26.8alpha不等于Mac26.8.1.1。首次全量并行测试有内核退出/等待超时，未确定根因；最终按test-concurrency=1完整385项通过，不把串行结果泛称无限并行负载已验收。首次新文本断言未考虑既有提取器按run加换行，改为容忍提取换行，独立DOCX原始text join检查没有放宽。

26项打包/文件系统故障测试通过。新生产源码复制过滤__pycache__/*.pyc/*.pyo；仅应用自有源码过滤，不删除既有原厂Python/LO载荷。首次隔离包完整签名/页哈希/CRC过后，ASAR检查发现本轮py_compile的宿主字节码缓存，不作为最终交付；增加缓存过滤和负例后重建。本轮使用/tmp新0700临时构建目录，沿0.37.3-r1独立输入输出与所有清单/代码页/LO字节门禁，未清残留后重算、未去隔离或跳签名。工作区此前截断临时副本来源仍未知，不把一次隔离成功称根因已修。

官方协议参照：https://raw.githubusercontent.com/LibreOffice/core/master/svx/sdi/svx.sdi（本轮只读核对CharFontNameCJK定义；未复制分发源码）。Quick继续复用REA既有部分静态证据，无新Amazon运行结论。原Web/Python122保护文件保持，旧35Python执行器未改未重跑，无新生产依赖，身份/白蓝logo/原业务不变。

实际代码变更：desktop/runtime/office-format.mjs、runtime/office-kit/worker.py；services/office-workspace.mjs、office-chat.mjs；src/office/index.html；tests/office-format.test.mjs、office-chat.test.mjs及新增acceptance/office-cjk-live.mjs；scripts/offline_bundle.py、package-offline-mac.py、tests/test_native_repackage.py；版本/验证/迭代记录。签名和Mac原生中文/IME/实际付费模型仍未验收。下一轮优先Mac原始codesign日志与原文档字体/真实模型验收，然后表格边框、撤销状态与精确选区编辑，不停在说明或队列。

GitHub0.37.2版本分支已上传但此前创建PR遇自动审批额度故障，提示恢复时点未到。本轮不重试或换接口绕过，没有0.37.4 PR/main/Release。用户持续发布授权有效，阻塞来自审批服务，不再套用历史未授权边界。

# 2026-10-29 · 0.37.3-r1 构建输入完整性检查

本轮重新读取权威0.37.2/v43（653内容SHA）及已保存0.37.3候选（658内容SHA），保留所有实际字体/字号功能；本轮不新增Office编辑能力，不把旧功能计作新增。

已修改scripts/repackage-native-mac.py：解压后立即核对整个应用的路径集合、逐文件SHA/大小/执行位/符号链接，任何额外、缺失或改变即拒绝，早于Info.plist/ASAR修改和签名。签名改为独立输入树与全新输出树，拒绝重叠或已有输出；签后重查输入完全不变、输出路径闭合。并非删残留、跳签名或排除运行时校验。只有完整通过原有代码页/上游LO字节/闭合ZIP门禁才允许发布。

事实证据：基线ZIP Framework为182559840字节，SHA307eb07de8401c8917239abd7bfd52284f7154ff30a3673f93af04179eb78f9e；本轮解出原文件仍相同。单独诊断副本rcodesign签名通过44224代码页验证，完整Framework单独签名也未报解析错误，不代表Mac codesign/Gatekeeper。整包新目录在本次整包签名命令执行前出现额外.Electron Framework.*文件，其内容为原文件截断前缀；基线ZIP无该条目。新增前置检查在第二个新目录成功拒绝，签名器未启动。来源/写入进程未知，不归因用户应用写入、pyc或上游运行时损坏。独立输出签名路径未进入完整真实整包验收，仅单元故障测试覆盖，不能称已解决竞态或安装慢。

25项打包/真实文件系统及故障测试通过（新增5项）；382核心全量重跑通过。新5测试：解压字节/模式/链接/额外路径异常、不同输入输出保留输入、重叠/已有输出拒绝、签名器篡改输入或输出额外文件拒绝、已知残留签名前拒绝。实际签名CLI在测试中注入，明确不是Mac原生验收。原生产模块与上一份0.37.3候选逐SHA相同，122原Web/Python保护文件未改，旧35Python执行器未改未重跑；不重复跑未改变的Chromium交互测试，上一轮1项结论只作历史记录。

没有0.37.3离线应用包、没有PR/main/Release；正式权威仍0.37.2/v43，不覆盖不完整候选。GitHub0.37.2此前审批额度故障仍未到提示恢复时点，本轮不重试或换路线绕过。签名/完整ZIP/Mac安装与原生CJK仍阻塞。新版源码候选r1保留，下一轮先查临时前缀文件来源、在Mac原生验证严格签名，再推进eastAsia字体/表格边框/撤销状态等Office主线。Quick继续复用既有REA部分静态证据，无新增Amazon运行结论。


最终检查：20项打包/更新器测试通过。两次独立私有目录完整离线重建均在rcodesign签Electron Framework临时文件时失败：binary parsing error: type is too big (171409408)，各次临时输入长度不同，根因未确定。未删除残留后重算清单，未绕过签名或修改Python/LO，不放行任何0.37.3应用包。最终ASAR/完整ZIP/MachO页/完整资源清单未通过本轮构建，不能借用0.37.2结果。保存0.37.3完整源码候选，不覆盖正式权威0.37.2/v43。下一轮应先复现临时文件解析并核对原始已签输入与临时输出，不能无证据重签或关安全机制。
实际修改：desktop/runtime/office-format.mjs（新）；desktop/runtime/office-kit/worker.py；desktop/services/office-workspace.mjs、office-chat.mjs；desktop/src/office/index.html；desktop/tests/office-format.test.mjs（新）、office-chat.test.mjs；desktop/package.json、package-lock.json；scripts/package-desktop-source.py、repackage-native-mac.py；迭代/差距/REA/下载/验证与发布状态文档。原Web/Python122保护文件SHA不变，无新生产依赖；旧35Python执行器未改未重跑。

# 0.37.3 Word选区字体与字号

从权威0.37.2/v43重取653内容文件逐SHA核验。实际新增office_format_selection模型工具：Word当前真实选区→单独原生确认→持久审计→固定UNO字体/字号命令→真实DOCX新版本/CAS。与文字替换共用每请求最多一次修改额度，不能混改两次；不开放任意UNO命令或参数。主服务与Python worker两层校验字体名80字符、无控制字符/路径字符，字号6–96pt、0.5pt步长；审批前后核选区/版本，过30分钟授权拒绝。审计不记录选区或参数正文。

本轮验证到的是西文字体属性ascii/hAnsi与字号。未设置eastAsia；不是中文字体或缺字修复，不捆绑微软雅黑等商业字体，不保证目标机器已安装指定字体。仅DOCX；Excel/PPT格式、表格边框、撤销状态、Finder关联和原生LO欢迎品牌仍待做。常规手工工具栏未新增字体输入框，仅现有Office AI对话可调用真实工具。

382项核心测试通过（较0.37.2新增3）；15项相关测试单独通过。实际本机HTTP模型夹具→真实LinuxLibreOfficeKit→保存DOCX→独立python-docx校验全部非空run字体Liberation Serif、18.5pt、文字保持，旧版保留。拒绝/旧选区/取消/审计磁盘失败不发布新revision。首次原型使用错误UNO参数名，独立DOCX断言失败拦下；按LibreOffice官方FontController参数CharFontName.FamilyName/FontHeight.Height修正后全部重测通过，不把命令回执当修改成功。1项生产Chromium真Kit手改/模型选区替换/保存/历史回归通过。IPC/审批/模型语义仍夹具；LinuxLODev26.8alpha不等于Mac包内26.8.1.1，未Mac/真实付费模型验收。

官方参数参考：https://docs.libreoffice.org/android/html/FontController_8java_source.html
Quick沿用docs/REA_FINDINGS.md既有公开包部分静态证据，无新Amazon运行结论。距完整Office替代仍有中文字体、复杂格式/对象、键盘IME与Mac安装签名差距。

GitHub0.37.2分支0ce6074已654文件逐SHA核验，但创建PR被自动审批额度故障阻塞，main仍0.37.1；本轮不重试或换路线绕过。用户持续发布授权有效，不缺权限确认。0.37.3新发布尚未执行，无新Release链接；安装故障、全量解压耗时未解决，不要求用户为提速重装。下一轮先Mac签名原始stderr/原文档CJK证据，再东亚字体与表格边框定向编辑。


# 0.37.2 Office交互修复

从权威0.37.1/v42重取649源码SHA核验后恢复实现。保存按钮显示进度与版本/时间、失败明确报错可重试；Enter发送/ShiftEnter换行/IME组合不误发；移除常规技术内核文字。用户点击发送明确同意当前文档正文/选区给当前模型，文档ID/revision/SHA/sequence精确绑定，排队内容变化拒绝；AI选区修改保留逐动作审批/审计/CAS。不是全任务/全盘默认授权。合入已保存r2更新器诊断，仍未解决Mac签名故障/解压慢。

重新验证：379项核心测试、3条真实Chromium、20项打包/更新器测试通过；之前环境丢失候选的测试不复用。真实LinuxLibreOfficeKit画布手改v2、真实HTTP模型夹具选区修改v3与落盘历史、保存中/失败重试/已是当前版本确认、Enter/ShiftEnter/组合输入、普通资料原生审批0次均通过。IPC/审批/模型语义仍夹具，Mac原生运行未验收；本机LODev26.8alpha与Mac内置26.8.1.1不同。完整arm64离线包构建通过：148生产文件与ASAR逐字节一致（另含最小package.json），278可运行MachO/93545代码页、20727应用条目+5配套、47链接、零残留和篡改负例通过。仍ad-hoc未公证，不代表Mac codesign深严格资源封印/Gatekeeper/启动验证。原122 Web/Python文件SHA不变，旧35 Python执行器测试未改未重跑。字体/字号/表格边框AI修改、撤销重做状态、Finder打开方式和原生LO欢迎页品牌、原生Kit中文方框仍待做，不能用PDF.js修复替代。最新私有截图仅作为需求，不入源码。下一步测试生产Office窗口保存/回车/权限/故障及真实Kit写入，再打包保存和GitHub分支PR/main/Release；Mac实际签名/安装/字体/IME仍需原生环境。

更新器r2仅作为旧0.37.0→0.37.1诊断代码保留，不生成0.37.2小更新；完整包不是安装提速修复。不要求用户因提速再下载重装。

# 0.37.2 Office交互修复

从权威0.37.1/v42重取649源码SHA核验后恢复实现。保存按钮显示进度与版本/时间、失败明确报错可重试；Enter发送/ShiftEnter换行/IME组合不误发；移除常规技术内核文字。用户点击发送明确同意当前文档正文/选区给当前模型，文档ID/revision/SHA/sequence精确绑定，排队内容变化拒绝；AI选区修改保留逐动作审批/审计/CAS。不是全任务/全盘默认授权。合入已保存r2更新器诊断，仍未解决Mac签名故障/解压慢。

重新验证：379项核心测试、3条真实Chromium、20项打包/更新器测试通过；之前环境丢失候选的测试不复用。真实LinuxLibreOfficeKit画布手改v2、真实HTTP模型夹具选区修改v3与落盘历史、保存中/失败重试/已是当前版本确认、Enter/ShiftEnter/组合输入、普通资料原生审批0次均通过。IPC/审批/模型语义仍夹具，Mac原生运行未验收；本机LODev26.8alpha与Mac内置26.8.1.1不同。打包进行中。字体/字号/表格边框AI修改、撤销重做状态、Finder打开方式和原生LO欢迎页品牌、原生Kit中文方框仍待做，不能用PDF.js修复替代。最新私有截图仅作为需求，不入源码。下一步测试生产Office窗口保存/回车/权限/故障及真实Kit写入，再打包保存和GitHub分支PR/main/Release；Mac实际签名/安装/字体/IME仍需原生环境。

# 0.37.2 Office交互修复（验证中）

从权威0.37.1/v42重取649源码SHA核验后恢复实现。保存按钮显示进度与版本/时间、失败明确报错可重试；Enter发送/ShiftEnter换行/IME组合不误发；移除常规技术内核文字。用户点击发送明确同意当前文档正文/选区给当前模型，文档ID/revision/SHA/sequence精确绑定，排队内容变化拒绝；AI选区修改保留逐动作审批/审计/CAS。不是全任务/全盘默认授权。合入已保存r2更新器诊断，仍未解决Mac签名故障/解压慢。

当前检查点：尚未重跑测试、尚未构建/发布；之前环境丢失候选的测试不复用。字体/字号/表格边框AI修改、撤销重做状态、Finder打开方式和原生LO欢迎页品牌、原生Kit中文方框仍待做，不能用PDF.js修复替代。最新私有截图仅作为需求，不入源码。下一步测试生产Office窗口保存/回车/权限/故障及真实Kit写入，再打包保存和GitHub分支PR/main/Release；Mac实际签名/安装/字体/IME仍需原生环境。


## 已增加0.37.0专用小更新候选

对比已验的两个签名应用，只有Info.plist、Electron主可执行文件、app.asar、CodeResources四文件变化，其余20723应用条目不变。新增package-mac-update.py生成独立离线更新ZIP（4载荷+清单+2启动/更新脚本+说明），无需再次展开整套运行时。不是任意版本通用差分更新，也不是应用内自动更新。

仅支持Applications或个人Applications的既有0.37.0：校验版本/身份/原ASAR及Info摘要，原生codesign深严格验证→本机APFS cp -cR克隆→只替换4个已核SHA文件→目标codesign验证→原子切换。旧版保留唯一备份目录；失败回退且回退失败保留恢复目录。无网络/pip/npm，使用已装包内Python；APFS克隆不支持时停止，不偷偷退回漫长全量复制。来源与目标字节都来自已验证离线包，不修改上游Python/LibreOffice。

新增4项真实文件系统提交/签名失败拒绝/回退/摘要篡改拒绝测试，Mac cp/codesign/应用运行检查由适配夹具替代；共17打包测试通过。此小更新仍未Mac真机验收，明确为候选附件，不能声称已测安装耗时或Gatekeeper通过。需保守安装路径可用完整包。

# 0.37.1 截图故障修复

用户九张截图已逐张查看，包含私有事故资料；原图和资料不收入源码。修复范围按证据分开：

1. 多个 WillBuddy Office 编辑按钮报 api[name] is not a function：0.37主进程已有officeOpen注册，生产preload白名单漏掉该方法。补齐精确方法，不新增任意IPC入口。新增VM实际加载生产preload验证冻结接口/准确channel，再将真实preload导出的接口名用于生产Chromium页面回归，覆盖成果中心、预览工作区、文档双击三入口。旧测试手工模拟桥接遗漏这层，已补覆盖。界面接口缺失时也显示中文升级/重启提示。
2. 中文预览缺字：旧PDF组件未分发CMap与标准字体数据。固定pdfjs-dist5.6.205自带资源全量内联到引擎，独立内存BinaryDataFactory精确键查找，useWorkerFetch=false，无网络或文件代理，不放宽CSP。保留Adobe/Foxit/Liberation许可证。使用无嵌入中文CID字体、UniGB-UCS2-H真实PDF：旧引擎提取文字为空，修复后完整中文文本/2387暗像素且无外部请求、无CMap加载错误。已查看真实画布截图，中文可读。测试宿主临时安装官方NotoSansCJK字体用于显示，不随应用分发；原图文档没有文件原件，不能称原文档全部字体/内容已验收。源DOCX/XLSX已丢失的正文/图片不会由本修复补造。
3. 正常分页预览标题和状态统一WillBuddy Office，保留第三方许可/开发说明。编辑窗口使用现有蓝红logo。桥接修通后正常入口为WillBuddy自有Kit窗口；主应用已有dock.setIcon，历史外部LO进程的独立Dock图标不是简单改按钮文字能解决。Mac Dock实际显示与Kit启动仍未真机验收，不称图标问题完全解决。
4. 纳入此前安装性能候选：同盘严格签名检查后移动已解压app，不再次ditto复制整个Python/LO；跨盘保留复制后codesign，事务失败恢复原件/旧版。13打包事务测试含新增3项真实文件系统inode保持、提交失败回滚、备份冲突拒绝。设备号通过开发测试适配；Mac跨盘与签名调用未跑。全量ZIP解压和增量更新/原生DMG仍未完成，不能把本补丁称完整安装性能修复。

377核心、5相关真实Chromium、13打包测试通过。新桥接测试本身初次语法笔误修正后通过；新PDF测试初次静态服务器根路径多斜线导致404，修正测试后通过；未把这些测试错误称生产Bug。真实LinuxKit/HTTP夹具沿既有链路回归，IPC/原生审批/Keychain/模型语义仍夹具。无Mac原生/付费模型/Gatekeeper/公证验收。应用不移除隔离或关闭保护。Python/LibreOffice原载荷保留，148生产文件ASAR逐字节相同，原Web/Python保护文件不改。

下一轮：实际用户Mac编辑启动/中文文件与Dock验收，优先原生安装和仅应用代码变更的更新包，避免反复解压全部运行时；再完整IME和Office对象编辑。用户WorkBuddy截图仅交互参考，无底层实现推断，不拷贝其资产。Quick/REA复用既有部分静态证据，没有新增Amazon运行结论。

# 安装性能修复候选（非新应用版本）

针对每次解压安装过慢：0.37完整离线包约480MB、20727应用条目，旧流程为全部解压→ditto完整复制→严格签名检查。补丁在同一磁盘改为签名/资源检查后直接重命名移动，避免第二次复制内置Python/LibreOffice。跨磁盘保留ditto与复制后严格校验，无移除隔离/关闭Gatekeeper/跳过codesign。

不需要重新下载480MB应用。把单独的Install-WillBuddy.command替换到已经完整解压的0.37目录，与WillBuddy.app同级，然后按原流程运行；正常同盘安装会把源app移入个人Applications，源目录不再保留app。旧版仍保留WillBuddy.previous.app；既有备份冲突继续拒绝，不静默删除。事务失败尝试恢复源app和旧版。

13项打包/事务测试通过，其中3项新测试实际文件系统验证inode不变（没有复制payload）、提交失败恢复两端、既有备份拒绝。Mac设备号由测试命令适配，跨盘ditto/codesign与Finder/隔离属性仍未Mac真机验收；不是已实测提速倍数。应用代码和版本0.37.0未改，未生成新离线app/DMG/PKG，未更新原发布附件或权威基线。

本补丁只消除解压后的第二次全量复制，不能消除ZIP本身的两万文件解压，也没有增量更新。下一步必须制作可直接安装的原生DMG/PKG及仅代码变化的更新包；这些需要macOS原生构建与签名门禁，不用Linux假包冒充。不要只改提示或把480MB全量包重新命名为快速更新。

# 2026-10-27 · 0.37.0 WillBuddy Office 嵌入式编辑

从权威0.36/v39重新获取612内容文件逐SHA校验后实现。内置 LibreOfficeKit 独立进程绘制/选区/格式与文字编辑，WillBuddy自有窗口和默认折叠文档AI；手动和批准AI写入直接新版本，无退出再收回。真实原生内核而非仅外部打开按钮。上游二进制不改，自有适配器不是重编上游或完整Office编辑器。

376核心、6相关真实Chromium、10打包测试；详见validation/v0.37.0.json。Linux真实内核+本机HTTP模型夹具，IPC/审批/模型语义仍夹具，无Mac/付费模型/中文IME及完整Office兼容结论。原122Web/Python保护文件不变；旧35Python执行器未改未重跑。Python/LO及离线依赖沿0.36内置，ad-hoc未公证。

0.36已PR9合并main f4445a5bdc19466464a590432437c1e5ddca74d0并发布。本轮构建时分支/PR/main/Release待执行，最终以对应Release记录为准，继续长期授权。下一轮先Mac原生Kit启动/选区/保存与严格签名验收，再完整键盘IME、图片图表对象/样式、Excel公式与PPT编辑。后台浏览器焦点、定时历史仍待做。见docs/WILLBUDDY_OFFICE.md。

# 2026-10-27 · 0.36.0 内置 Python / LibreOffice

从权威0.35/v38重新获取并核验595内容文件。内置arm64 Python3.12.16、LibreOffice26.8.1.1及20个锁定wheel；安装端不另装软件。默认Office改为真实LibreOffice→PDF分页预览；编辑使用包内独立原生窗口，保存退出后批准收回新版本。不是同面板完整LibreOfficeKit编辑器，PDF尚未复用旧OOXML选区映射。

新增普通DOCX末尾插入本轮本机PNG模型工具，逐次批准/图片SHA/版本守卫；不下载外部图片或生成假素材。原Web/Python/白蓝logo/旧身份/双任务/浏览器授权/Skills/MCP及旧源码开发编辑器保留。实际LinuxLibreOffice三格式转换、图片PDF与文本独立解析；真实Chromium生产页PDF→原生编辑启动夹具→真实字节→回收新版本。Mac/付费模型/Keychain未验收，SDK随包不等同于完整actions协议集成。旧35Python执行器未改未重跑。详见docs/NATIVE_OFFICE_AND_PYTHON.md和validation/v0.36.0.json。

早期候选两次重置丢失后从正式基线恢复重测，保存未验证检查点。构建曾拒绝未知临时残留及原厂LO链接输入重签失败；最终全新私有载荷路径/字节清单，LO原厂签名保留；残留根因未确定。外壳/Python ad-hoc，未公证/未Mac深严格资源封印或Gatekeeper验收。

0.35已PR8合并main19b54fe并发布。本版构建时GitHub分支/PR/main/Release待执行，以Release最终状态为准，不沿用旧未授权边界。下一轮Mac安装/内置Python依赖和LO真实编辑；LibreOfficeKit/UNO选区与AI定向修改。后台浏览器焦点和定时任务历史仍待完成。

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

# 当前入口：0.33.0 Office优先

已完成：导入Word单段/整表选区→聊天上下文→范围限制AI补丁与直接文字编辑；Excel原包文字替换；32默认/96上限与消息留白。
下一轮：用户Mac原生选区/审批/真实模型验收；更保真的Office页面、Excel选区/保持样式的定向编辑；解决后台浏览器抢焦点、每次定时任务历史。不能退回重建提取文字文件。0.32预置12Skill/8MCP保留。
发布：本轮保存后按长期授权版本分支/PR/main/Release，检查并发、源码与附件下载SHA。

## 2026-10-26 · 0.32.0 预置技能与MCP库

按用户“skill太少”与截图落实12项技能（4公开MIT/8独立内置工作流）和8官方远程MCP模板；真实添加/重复去重/停用不复活/绑定/密钥配置/发现/模型循环，不是假工具按钮或固定答复。目录离线，添加不联网不执行；主机id白名单、包及资源SHA检查，上传与旧数据不覆盖。模板显示待配置/未测试，不把密钥保存或目录当已联网。MCP原生批准、Bearer安全存储与逐业务审批不变。UI支持用途分类、搜索和来源。用户私人上传包不收入公开发布。

338核心（新增8）、8真实Chromium相关回归、10打包通过；真实公网Microsoft Learn/DeepWiki各3工具发现，其余仅公开官方文档验证。生产UI→真实技能ZIP→秘密适配夹具→实际本机HTTP发现→智能体绑定→三轮模型skill_read/MCP→磁盘重载通过。native IPC/选择器/审批/Keychain/模型语义仍夹具，无Mac/付费服务结论。119生产文件ASAR逐字节相同；官方Electron42arm64 SHASUM/15MachO51216页/282应用+5配套/14链接/零残留/篡改负例/CRC/installer通过。122旧Web/Python SHA不变，旧35Python未改未重跑；无新生产依赖。

修复Skill上传误用文档4MiB读限制，独立32MiB输入/单4MiB/展开16MiB/256文件，正文12000与库16MiB保留。实际两个用户包可解析，CAD本地清单冲突、Dashi展开过大、微信正文过长仍拒绝，详见docs/PRESET_CAPABILITIES.md；原件不改、不执行、不公开。前期测试夹具codec/文件数/静态路径错误已修正；一次空Python发现未算通过，正确目录10项通过。

基线权威0.31/v34，558内容SHA核验；0.31已PR4合并main a52a7dc3c1979c24ce20d8d5db479a0949b71b37并发布。0.32包内是发布前快照，持续授权版本分支/PR/main/Release，完成结果看Release，不修改旧附件。README只产品用法。保留logo白蓝/旧身份/两任务/项目服务/Office/知识/浏览器站点许可。ad-hoc未公证，无Mac严格资源密封/Gatekeeper/启动。REA沿旧公开包静态证据，无新Amazon运行结论。跨Web核心/OAuth/stdio/自主子任务组/全Office保真仍差距。

下一轮先Mac预置绑定/真实密钥/MCP与安装验收；缺机器优先大型技能资源与长正文有界读取、ZIP兼容/技能脚本受控执行链，仍不自动放宽审批或静默运行。见docs/PRESET_CAPABILITIES.md、validation/v0.32.0.json/tests/public-mcp。

## 2026-10-26 · 0.31.0 项目开发服务与失败恢复

从权威0.30/v33重新取得550内容文件并核验。0.30已通过PR #3合并main 24c712072499af12fd1621d6af675d7816bbc534并公开v0.30.0-preview；每轮分支/PR/main/Release持续授权有效，不套用旧未授权记录。并发检查后上传，不强推，不用GitHub插件或聊天密码。

实际新增主机绑定服务策略、64KiB尾部输出、30分钟服务租期、单服务/共享双名额公平调度、预计到期/日志/停止、固定环境故障诊断；纯代码项目视图从app提取。只允许项目启动入口，普通命令仍5分钟/1MiB，不接受渲染层伪造服务策略。源码/授权目录精确绑定、逐次确认、磁盘故障不放行、重启不自动重放；服务必须从项目页重新批准启动。不是OS隔离或业务就绪承诺。详见docs/PROJECT_SERVICES.md。

330核心（新增11）/9真实Chromium相关回归/10打包通过；真实npm/Node HTTP服务>1.1MiB日志仍响应、刷新/停止、真实缺包/端口冲突、拒绝/存储失败/篡改策略/源码变化/重启边界。未作30分钟墙钟或Mac/付费模型验收。首UI全回归8/9，旧CLI测试仍点击已移入＋菜单的旧入口，修正交互后完整9/9；开发中变量闭包错误由测试拦截后修复，最终330/330。114生产文件与ASAR逐字节相同；官方Electron42arm64 SHASUM/15MachO51216页/282应用+5配套/14链接/零残留/篡改负例/ZIP CRC/installer语法通过。122原Web/Python保护文件SHA不变，旧35Python执行器未改未重跑，无新生产依赖。

ad-hoc未公证，无Mac严格资源密封/Gatekeeper/启动/Keychain。保留旧身份、logo白蓝、图片/Office/HTML/知识/MCP/浏览器站点许可和双任务。REA复用既有部分静态证据，官方Quick system-tools/desktop-security与Node child_process公开文档于2026-10-26复查，无新Amazon原生运行结论。跨Web核心/OAuth/stdio/自主子任务组/全Office保真仍差距。本包字段为发布前时点，以最终Release说明为准，不改旧附件。

下一轮先Mac实际图片/项目/审批与严格签名安装；缺机器继续代码来源问答/有界PDF与Office成果。测试证据docs/validation/v0.31.0.json及-tests.txt。

## 2026-10-26 · 0.30.0 图片可用性与代码项目运行

从权威0.29.0/v32重新取回并核验540内容文件。前次未保存的0.30工作区在环境清理后丢失，本轮重新实现并重测，不复用丢失候选测试结果。0.29已通过PR #2合并main aea62a8c03939500dfa03173f87cfc3f32a702c7并公开v0.29.0-preview，旧未合并说明仅是历史记录。用户持续授权每轮验证后版本分支→PR→main→源码/arm64 Release，保留并发保护，不用GitHub插件/聊天密码。

图片：PNG/JPEG输入32MiB、64百万像素、32768边；在主进程nativeImage解码后按比例完整缩放，4096边/16百万像素、PNG4MiB以内，按字节预算最多12次缩放，不裁剪。原件不改，元数据经PNG重编码。持久100张/128MiB，单轮8张；普通state无像素。输入框真实本机Blob缩略图，移除/切任务释放；仅勾选本轮视觉发送才发image_url，无文字时自动提问；失败恢复文字/图片供手动重试，不自动重发或换模型。不是HEIC/WebP/GIF、EXIF方向全兼容或真实视觉语义验收。修复主按钮蓝底文字对比。

代码：复用ZIP路径/CRC/规范化/类型/体积预检，独立完整项目文件与二进制资源复制到私有host目录，不依赖32份问答摘要。识别唯一package.json或Python根；拒绝多个根/node_modules/.git/.venv。npm优先ci（有lock）或install，均ignore-scripts；实际dev/start/build/test脚本按用户选择运行。Python显式venv→requirements→main.py/app.py/server.py。导入不执行不联网；＋代码项目入口显示文件清单/实际命令/包内脚本。授权目录与每命令原生批准，复用持久CLI队列/审计/停止/重启不重放；受理前及批准后再核验源码SHA/路径链接。源码改变须重新导入。新增schema1 codeProjects元数据/私有目录；不改旧身份/数据/原Web/Python。无新生产依赖。

运行不是OS沙箱，也不是任意项目自动云部署。npm/完整Node工具链和Python为可选本机外部工具，未捆绑安装器；缺失明确报错。每命令最长5分钟/输出1MiB，未提供长驻进程守护、端口代理、容器、Docker、系统包、密钥环境编辑、monorepo选择或pnpm/yarn/Poetry。10项目，ZIP32MiB/2000条目/单文件4MiB/展开16MiB；无项目删除UI，私有副本由本机保留。已有问答仍32正文/10万字符，不声称模型已理解全部项目。安装ignore-scripts不是安全隔离，显式启动脚本和Python构建仍可执行代码。

319核心（新增9）、7真实Chromium、10打包测试通过。新增实际npm无依赖安装/Node执行、Python真实venv/pip空依赖/入口、源码变更/链接/磁盘失败/拒绝/取消。生产UI→真实ZIP/service→npm→Node HTTP服务→实际health响应→日志/停止/刷新；原生选择器/IPC/审批为夹具。实际600万像素PNG浏览器解码/缩略图/文本+图片HTTP载荷/无文字图片提问/HTTP失败草稿恢复通过；nativeImage缩放是注入适配器测试，不是Mac原生运行。完整旧ZIP/多模型/SSE/工作区回归通过。新UI项目首测发现受理后未刷新state，已真实修复；图片仅调整完整提示词前缀断言。

111生产文件与最终ASAR逐字节相同；官方Electron42arm64 SHASUM、282应用+5配套/14链接/15MachO/51216页/零残留/篡改负例/CRC与installer语法通过。122原Web/Python保护文件SHA不变；旧35Python执行器未改未重跑。ad-hoc未公证，无Mac严格资源密封/Gatekeeper/安装启动/Keychain或真实付费模型验收，不去隔离或关保护。REA复用已有部分静态证据，复查官方Quick桌面文档与Electron nativeImage，未新增Amazon运行结论。

下一轮：Mac先图片原生解码/ZIP项目实际依赖与启动/严格签名安装；缺机器继续项目长驻服务管理/受控环境与失败诊断、代码来源问答，再PDF/Office兼容。跨Web完整核心/OAuth/stdio/自主子任务组仍差距。详见docs/IMAGES_AND_CODE_PROJECTS.md、validation/v0.30.0.json/-tests.txt。本包构建时0.30 GitHub发布待执行，以最终Release为准，不修改已发旧版附件。

## 2026-10-25 · 0.29.0 精简对话输入区

用户四张截图要求学习Quick/WorkBuddy的轻量输入交互，反对多行控件和说明堆砌。本轮按用户要求实际重构，不新增占位功能：默认仅输入区+一行操作（左侧＋/智能体，右侧模型/发送），常驻说明、模型配置和工具开关收起。＋菜单保留真实文件/ZIP上传、图片上传、本机图片、已授权资料、工具开关和工具台；附件格式与发送说明进一步按需展开。模型菜单保留原配置/指定模型/自动快速均衡极致/思考强度/配置入口，摘要反映当前选择。图片发送确认仅有图片时出现，默认不发送；原生审批、站点许可、工具限制、32MiB ZIP/正文32份10万字符和模型固定路由均未放宽。

新增纯视图src/ui/composer.js和独立菜单控制器；无Electron/业务执行耦合。一次只展开一个菜单；支持键盘Tab/Enter/Esc、点击或焦点移出关闭、同任务后台重绘保留菜单及表单焦点和草稿、换任务关闭；按视口空间定位和限高滚动。默认输入框实测约159px。白底#FFFFFF/主蓝#0078CB/蓝红logo与旧加密身份保留，无第三方资产复制、无新生产依赖。

310核心（新增2菜单/模型摘要行为）、6真实Chromium、10打包通过。生产页八尺寸/工作区组合验证紧凑布局，七个可交互组合×两菜单验证边界；<960px工作区沿既有覆盖层行为，需关闭覆盖层再操作输入区，不假称被遮住时可点。真实ZIP→DOCX/文本→HTTP，快速/极致/指定模型low与刷新、图片显式发送、SSE和工作区回归全部通过。原生IPC/选择器/审批/Keychain/模型语义仍夹具，无Mac原生/真实付费模型新结论。首轮4/6通过：旧图片验收未打开新菜单、selectOption不自动聚焦导致测试断言失败，已按真实交互调整；另新用例最初试图点击既有窄屏工作区覆盖层下面的模型按钮，改为核对既有覆盖行为，非生产功能修复。最后六项完整重跑通过。

108生产文件与最终ASAR逐字节一致；官方Electron42arm64 SHASUM、282应用+5配套/14链接/15MachO/51216页/零最终残留/篡改负例/ZIP CRC与installer语法通过。122原Web/Python保护文件SHA不变，旧35Python未改未重跑。仍ad-hoc未DeveloperID/公证，无Mac严格资源封印/Gatekeeper/安装启动结论；不去隔离或关保护。REA复用已有部分静态证据，用户截图仅作为UX参考，不增加Amazon/WorkBuddy原生运行或内部实现结论。

基线从权威0.28.1/v31重新取回535内容SHA核验。0.28.1已公开分支5593b0f及Release，0.29本轮只保存源码/arm64包，未GitHub上传/Release/PR/合并；不把旧授权扩为以后所有公开发布。下一轮优先用户Mac菜单/上传/真实模型反馈，再PDF/长文/Office复杂兼容；跨Web核心/OAuth/stdio/自主并行组/全Office保真仍有差距。读docs/COMPACT_COMPOSER.md和validation/v0.29.0.json。

## 2026-10-25 · 0.28.1 输入区与ZIP体积修复

用户截图显示“上传附件”被30px图标按钮样式挤成竖排，模型说明与工具行拥挤，ZIP仍误用文档4MiB读取限制。实际改为独立横向附件按钮、可换行操作区、独立模型说明与工具行，错误提示移除Electron调用包装并保留具体中文失败原因。ZIP原生读取和解码共用32MiB输入上限、2000条目/单份4MiB/展开16MiB；32正文/10万字符预算超限项进入未读取报告，不把支持格式全部等同已读。普通Office4MiB、路径/CRC/加密/原子导入/无磁盘解压执行门禁保留。

环境清理后重新从权威0.28/v30恢复并重跑：308核心、6真实Chromium、10打包测试通过；四宽度860/1100/1440/2048与工作区开关八布局无交叠/横向溢出，上传按钮宽度≥96px/高度≥34px。中文字体仅开发宿主安装，不分发。新真实5MiB文件读取与>4MiB ZIP测试、32MiB超限/符号链接/Office旧上限和预算报告通过。模型/原生选择器/IPC/Keychain仍夹具，不是Mac实测。

打包曾发现未知.icudtl.dat临时文件；没有删除后重算清单掩盖。新增签名前后路径集合检查，只显式允许官方运行时九个固定资源封印路径，缺失/其他新增均拒绝；清单采集后再核对；工作目录0700。一次运行时下载SHA失败、一次签名残留门禁失败，均拒绝交付；私有干净目录重建后107生产文件与ASAR逐字节一致、282应用+5配套/14链接/15MachO/51216页/零残留/篡改负例/CRC通过。残留成因未确定，不声称Mac严格签名或Gatekeeper已验收。

0.28源码分支295049e已由全量531文件SHA核对；本次按用户“更新到github”从该分支新建0.28.1修复分支，准备上传完整源码及arm64预发布附件。构建内状态记录打包时点，以实际Release为发布结果；未合并main。仍ad-hoc未公证，无Mac真机/真实付费模型结论。原Web/Python122文件SHA保持，旧35Python未改未重跑。下一步优先用户Mac安装/上传/真实模型验证，再PDF/长文与Office复杂兼容。

## 2026-10-25 · 0.28.0 ZIP问答与多模型真实路由

按用户两项要求完成：ZIP内存解压/正文文件逐项解析/路径与类型及体积门禁/跳过报告/原子文档批次保存；模型配置库、独立系统加密或临时密钥、能力类型/优先级/思考协议，输入框指定模型及强度、自动快速/均衡/极致。纯model-policy与无Electron模型服务分层，受理固定路由并复核配置漂移/预算，保留原settings和旧加密身份，不跨服务重试。真实参数写入HTTP body，不是固定演示回复。详见docs/ZIP_AND_MODELS.md。

306核心（新增20）/5真实Chromium/9打包通过；ZIP/DOCX/代码真实字节、两个真实HTTP模型目标载荷、生产配置表单/ZIP问答/自动fast与extreme/手动low/重载保持选择强度。原生选择器/IPC/Keychain/模型语义仍夹具，无Mac或真实付费服务结论。首轮JSDOM因新增ESM未加入测试加载器而失败，已接入真实UI模块；原单模型设置测试改为先打开保留的“原配置”入口，之后完整回归通过。原Web/Python122文件保持，旧35Python未改未重跑；无新生产依赖。

107生产文件与最终ASAR逐字节一致；官方Electron42arm64 SHASUM、15MachO/51216代码页、282应用+5配套/14链接/零残留/篡改负例/ZIP CRC与installer语法通过，仍ad-hoc未公证，无Mac严格资源封印/Gatekeeper结论。

ZIP仅支持受限ZIP，不声称RAR/7z或PDF/OCR/视频理解；自动路由是按用户配置类型和能力筛选，不是隐性联网分类/性能基准。Mac优先实际安装/密钥和真实模型参数；缺目标机继续PDF/长文来源。保持白蓝logo/双任务/站点许可/旧身份/Office/知识/MCP。未GitHub上传/新Release/PR/合并，不扩大0.22授权。

## 2026-10-25 · 0.27.0 对话上传附件问答

按用户“对话框也应该支持传附件进行AI问答”实际增加原生选择DOCX/XLSX/PPTX/MD/TXT/CSV/JSON/HTML，复用真实文档副本与字节解析；关闭工具模式也能提取正文问答。新增无Electron chat-attachments校验服务，最多5份/合计10万字符、排队/每模型轮次版本SHA和目标模型校验，正文不信任渲染层。文件名版本随聊天保存，历史入口明确附加当前版本，预览/移除和任务作用域保持。图片原显式视觉勾选保留，无新增运行端依赖。详见docs/CHAT_ATTACHMENTS.md。

286核心（新增6）/4相关真实Chromium/9打包测试通过；新增实际DOCX生产UI→真实HTTP模型载荷/刷新/磁盘重载/再次附加移除，原生选择器/IPC/模型语义仍夹具。初始测试请求参数签名和生成器JSON输入误用已修正；首次Chrome解压副本不完整导致启动失败，重新完整解压并SHA对照后启动和最终回归通过，不称生产运行时修复。PDF/OCR/音视频附件未实现。原Web/Python保护文件保持，旧35Python未改未重跑；无Mac原生/真实付费模型新结论。

首次离线构建被页哈希门禁拦下：存在未完成隐藏签名临时副本，原因未确定；未放行该产物，另用全新私有目录重建，102生产文件ASAR匹配、15MachO/51216页、282应用+5配套/14链接/零残留、篡改负例/ZIP闭合清单/CRC通过。仍ad-hoc未公证，不代表Mac验收。

下一轮优先Mac实际附件选择/审批/真实模型；无目标机继续有界PDF正文与长文有来源问答，不反复只加介绍。保持白蓝logo、旧身份、两任务、浏览器站点许可和全部Office/知识/MCP能力。未GitHub上传/新Release/PR/合并，不扩展0.22公开授权。

## 2026-10-25 · 0.26.0 持久词法知识索引

完成：纯文本单/双字倒排核心与Store串行持久服务，源版本/SHA/提取文本摘要/语言环境/算法/结构/几何校验，冻结内存条目复用；首批构建/重载复用/改版重建、损坏重建、超限全文回退。每次仍先逐份原审批读取，匹配评分/坐标/片段来自当前原文，缓存只筛候选，暖索引拒绝也不返回结果。索引从普通state剥离，无缓存读取工具；智能体页真实清除入口保留文档/对话。16条/8MiB、单2MiB；写失败和写后取消回滚，完整单源JSON预算保持。不是向量库/OCR/后台全盘索引。详见docs/PERSISTENT_KNOWLEDGE_INDEX.md与validation/v0.26.0.json。

280核心（新增16）/4相关真实Chromium/9打包通过；实际Store重载、96源块→2评分候选实验、六轮本机HTTP模型Skill/资源/2知识查询/认证MCP/回复，生产页清除与改版仅重建一源。原生IPC/审批/Keychain/模型语义仍夹具；无Mac/付费模型/企业MCP/全Office保真新结论。原Web/Python122保护文件SHA保留，旧35Python未改未重跑。

下一轮Mac先原生安装/审批/Keychain/实际模型认证服务；缺机器继续授权目录增量知识导入、Office复杂成果或受控并行子任务，避免反复只做索引介绍/管理界面。OAuth/stdio/跨Web核心/向量语义检索仍差距。README只产品信息与用法；版本细节在下载页。0.26未上传/公开Release/合并GitHub，不扩大0.22授权。

## 2026-10-25 · 0.25.0 MCP Bearer认证与系统秘密适配

完成：连接器库/构建智能体内配置Bearer Token；safeStorage主进程适配与显式元数据投影；已批准后才解密；准确URL/配置版本/密文变化门禁；实际MCP所有POST/正常DELETE认证；401/403无自动重试、真实跳转不转发、JSON/SSE原样令牌回显脱敏、密码框提交/关闭清空。旧无认证配置兼容，无新生产依赖；旧身份/用户数据/Web/Python保持。见docs/MCP_AUTHENTICATION.md及validation/v0.25.0.json。

264核心（新增15）/4相关真实Chromium/9打包通过。真实HTTP模型与MCP链路、AES-GCM秘密适配夹具、真实Store和生产页面；Mac Keychain/原生IPC/审批/模型语义仍未真实验收。初次新UI断言误匹配两个关闭按钮，后一次假设服务有会话但夹具未返回session头，均修正测试后完整相关重跑通过，不宣称生产路径修复。

下一轮Mac优先实际安全存储/原生审批/模型与认证服务、严格签名安装；缺目标机推进持久知识索引/受控故障恢复或Office兼容，OAuth/PKCE、stdio、跨Web核心、自主子任务组仍差距。不要持续只改文档/队列。README保持产品信息，迭代放下载页。0.25未公开发布/未上传/合并GitHub；不推定0.22授权涵盖未来版本。

## 2026-10-24 · 0.24.0 对话知识依据快照

完成：真实knowledge_search事件→有界历史快照→回复下原文展开卡片；按run隔离，文档更新/移除状态，原文HTML转义，不新增读取或权限。249核心（新增5）/4相关真实Chromium/9打包通过；实际HTTP模型+真实Store/Markdown/MCP协议及页面展开/重绘/重载/真实改版失效，原生IPC/审批/模型语义夹具。旧Web/Python保护文件未变。

下一轮：Mac原生审批/模型/MCP和安装验收；缺目标机推进MCP认证与秘密适配或持久知识索引/证据导出，随后Office兼容。当前卡片为历史检索片段，不是逐句事实核验/全文预览；移除绑定不会删除聊天历史。12组/96000 JSON字符按整组保留。见docs/KNOWLEDGE_EVIDENCE.md及validation/v0.24.0.json。

README产品结构保持；迭代和测试只放下载页及研发日志。公开main文档bdd8db7，功能0.22；0.24未上传/未发布/未合并，不推定未来公开授权。

## README 编辑规则（用户2026-10-24要求，后续必须保持）

根README只放产品重点、优势、场景与如何使用。不要把版本横幅、逐轮测试数字、变更日志或研发计划追加到首页。版本变化、签名状态、测试证据和已知限制集中放GitHub安装包Release与docs/DOWNLOADS.md；ITERATION_LOG/PLAN继续承载研发接续，desktop/README聚焦开发。后续修改必须保持该规则。

## 2026-10-24 · 0.23.0 跨文档有来源知识检索

已完成：独立纯文本检索核心、可省略ID跨最多八份绑定文档查询、中文双字词/全角英文归一化/长行分块、原文来源坐标与覆盖报告、逐份原审批、全来源版本和取消/撤销检查、完整结果JSON预算。保留旧单文档结果结构。详见 docs/KNOWLEDGE_RETRIEVAL.md。

下一轮入口：有Mac先原生安装/审批/实际模型和MCP知识工作流验收；缺目标机优先MCP认证与安全秘密适配或持久知识索引/有来源证据交互，随后Office兼容。当前没有向量库/OCR/语义索引/自主子Agent或跨Web完整共享核心，不反复只做管理界面。每轮重新取权威最新版并核验。

GitHub实际状态已校正：0.22已公开并合入main（bd67c8f，PR #1）；0.23未公开/未合并，不覆盖已发布附件。此记录优先于下方历史“main旧版/等待0.22授权”说明。

## 2026-10-24 · 0.22.0 技能上传库与MCP连接器配置

按用户六张截图落实三个管理页签：智能体、Skills技能库、MCP连接器。原生选择器上传SKILL.md/ZIP→真实有界解析/持久文件资源；元数据列表、正文目录查看、启用停用/引用保护删除。构建智能体绑定skillIds/mcpIds，可当场上传/保存连接并自动选中，保留提示词/草稿，迟到上传不能写入另一个表单；旧内嵌配置保留。MCP保存不联网，原生批准后实际发现，支持取消/修订失效/退出清理；只标上次真实发现，不假在线。运行解析绑定能力，skill_read/resource按需返回完整入口和受限文本参考；真实模型HTTP夹具四轮Skill→资源→MCP→验收通过。allowed-tools不提权，包内脚本不自动执行。

从权威0.21/v22读取479内容并SHA核验后开发。新增schema1字段skillPackages/mcpConnections/agent skillIds+mcpIds，无新生产依赖。12新增核心（共232）/17真实Chromium全回归及4最终相关重跑/9打包Python通过。真实ZIP/服务/磁盘/HTTP协议与生产页面；原生选择器/IPC/审批/模型内容仍夹具。无Mac/付费模型/企业MCP/完整Office保真；认证头/OAuth/stdio未实现。原122Web/Python保护文件SHA不变，旧35Python未改未重跑。原logo白蓝/加密身份/双任务/浏览器站点许可/HTML与Office/图片保留。

见docs/SKILLS_AND_CONNECTORS.md与validation/v0.22.0.json。技能格式为有界子集：4MiB输入/2MiB展开/64文件/CRC与路径及符号链接门禁、name64/description1024/主源12000字符，库40项/16MiB；binary保留不执行，资源仅UTF8有界读取。不是完整技能运行环境、市场、API密钥连接器或自主子Agent。下一轮先实际Mac/模型/MCP联调，再认证连接器/技能完整资源使用/知识索引与Office兼容。未GitHub上传/未公开release/未PR/合并main，保留此前公开发布自动审批边界；交付独立完整源码与arm64离线候选并保护替换权威。

## 2026-10-24 · 0.21.0 智能体能力组合、HTML原型预览与图片附件

从权威0.20/v21获取456内容文件并核验后开发。用户新反馈优先：原260561字节HTML由尾部JS绘制，旧50k摘要/静态脚本过滤造成空白；新增独立完整有界预览与双opaque隔离，原样本实际欢迎界面/供应商表单/三次绘制只读一次/无外网通过，不把localhost业务接口当已接通。新增本机PNG/JPEG→nativeImage适配器→规范PNG持久附件，默认不送模型，显式勾选本轮image_url实际HTTP协议，模型变化拒绝。原文件/原模型附件限制保持。

智能体新增知识文档绑定、按需skill_read、一般工具白名单、MCP配置与1–12轮ReAct；knowledge_search调用原审批文档读取并返回有来源行片段。真实MCP初始化/目录/JSON或SSE调用/会话清理，不是占位字段；每次网络操作审批/取消/超限/配置撤销/磁盘故障门禁和审计正文隐藏。真实HTTP模型夹具四轮：技能→真实文档预算→MCP报价→验收；未运行真实付费模型/企业MCP或Mac。旧schema1增量，无新生产依赖。原Web/Python122哈希未变。

220核心（新增24：图片7/HTML6/智能体11）、16个真实Chromium用例在完整回归和修正后的相关重跑中通过，另用户原HTML实际用例通过；9打包Python通过。完整浏览器首轮15/16，图片用例重载后误点搜索按钮，修正测试定位后该用例及5项相关最终回归通过；没有更改生产路径规避失败。原生选择器/PNG规范化/IPC/审批/模型响应仍夹具。原Python35未改未重跑；未新Linux Electron/Mac/字体像素/真实视觉/WordWPS验收。90生产文件与ASAR完全一致，15MachO/51216页、篡改负例、282应用+5配套/14链接/零残留和ZIP门禁通过，仍ad-hoc未公证。

说明：docs/AGENT_CAPABILITIES.md、HTML_INTERACTIVE_PREVIEW.md、LOCAL_IMAGE_ATTACHMENTS.md及validation/v0.21.0.json。MCP目前无认证HTTP子集，无OAuth/stdio/自动重试；知识为有界词法行检索，不是向量库；技能为保存Markdown步骤，不是完整技能包/脚本执行；跨Web核心/自主并行组/完整Office保真未完成。保留旧身份/蓝红logo/白蓝主题、双任务/站点授权/GenOffice子引擎。下一轮先用户Mac/实际模型和MCP链路验收，再技能包导入/知识索引/认证连接器与Office兼容；不退回仅提示词壳。

未GitHub上传、未公开release、未PR/合并main；保留先前公开发布自动审批拒绝边界，不另换途径绕过。源码与arm64包独立保存并保护替换权威源码。

## 2026-10-24 · 0.20.0 对话富媒体展示

实际新增 HTTPS图片点击加载/展开、视频控制播放、网页链接卡片和本地数据驱动柱/线/饼图；模型指令接入语法，原始Markdown/导出不改。外部媒体单独opaque frame、无Node/桥、CORS anonymous/no-referrer、启动/加载超时与关闭重试；每消息12媒体/6图、同时3媒体。固定媒体双资源+SHA校验，经典IIFE避免模块脚本opaque跨域启动失败；后台消息未变的绘制保留媒体frame。不是本地附件上传、视觉理解、转码或完整Office图表套件。196核心（新增12）/4相关真实Chromium/9打包通过；真实PNG/WebM解码/播放、链接路由、三图原值、5次重绘无额外请求及Office/流式/工作区回归。HTTPS响应/模型/原生桥夹具，未新Linux原生/Mac/远端服务验收；原Web/Python122文件未变，旧35未重跑。77生产文件ASAR精确一致；15MachO/51216页/篡改负例，包ad-hoc未公证。见docs/CHAT_RICH_MEDIA.md和validation/v0.20.0.json。

下一轮：先Mac实际图片/视频/链接/流式图表验收，再本地媒体授权导入/持久附件与更完整图表/Office预览。保留旧身份/logo白蓝/双任务/站点许可。不建PR/不合并main；用户未批准0.19公开发布，禁止重试该发布或将0.20擅自公开。完整源码和arm64候选包照常保存交付。

## 2026-10-24 · 0.19.0 Excel图片按锚点预览

0.19.0：Excel预览图片按单格/双格/绝对锚点定位，跟随对应工作表与可见网格；不再把整个工作簿图片堆在表尾。保持离线内置，无需另装软件。184核心/12真实Chromium/9打包；真实XLSX图片坐标+decode+独立openpyxl，Linux原生Electron源码/ASAR验证与旧生命周期回归。Mac/付费模型/完整Office保真未验收。见docs/SPREADSHEET_IMAGES.md及validation/v0.19.0.json。下一轮Mac反馈与图表/主题/模板质量；MCP/跨Web核心/自主子任务组仍有差距；不建PR/合并main。

## 2026-10-23 · 0.18.0 预览不随状态刷新重建

0.18.0：同一Office文档版本的预览在后台刷新/侧栏调整时保持连接，不重新读文件/解析，保留Excel工作表选择和滚动；关闭、换文档或版本后释放重载。无需新增软件。177核心/12真实Chromium/9打包测试；Linux真实Electron源码与ASAR各三种文件20次绘制额外读取=0。Mac/付费模型/Office全保真未验收。详见docs/PREVIEW_LIFECYCLE.md及validation/v0.18.0.json。下一轮Mac链路与图片锚点/表格分页质量；保留旧系统/身份/logo/双任务/授权，不增加依赖，不建PR/合并main。

## 2026-10-23 · 0.17.0 修复本地Office预览超时

真实Electron42/Linux复现旧file路径未握手，修复为固定两资源应用内协议，保持CSP/Node/IPC边界；新增阶段超时/手动重载，About版本跟随应用。生产HTML+preload+真实IPC+真实Office文件在源码与ASAR通过，子帧正文/ready/无原生桥验证。173核心/12 Chromium/9打包通过；Mac/付费模型/Office显示/公证未验收。详见docs/PREVIEW_TIMEOUT_FIX.md及validation/v0.17.0.json。缓存/图片定位因最新超时反馈优先处理未交付，不列完成项。下一步用户Mac验收、独立预览生命周期与图表图片质量，保留原Web/Python、身份、白蓝logo/并发/审批。

## 2026-10-23 · 0.16.0 内置 Office 预览

完成：真实二进制预览服务、隔离帧、Word页面/多表Excel/PPT静态渲染、离线依赖与许可证、移除外部GenOffice UI。详见docs/OFFICE_PREVIEW.md与validation/v0.16.0.json。保留原Web/Python/身份/logo/并发/审批。下一步：Mac原生安装/预览/审批验收，复杂图表/图片定位/字体/分页质量，预览独立生命周期。未实现全Office保真或完整GenOffice嵌入。

# 0.15.0 Word正文段落增删 · 2026-10-23

从权威0.14.0/v15重新读取、412内容文件SHA核对后开发。实际新增简单正文后插入/删除、保存前撤销；模型与页面统一patchWord候选，原段落anchor和revision保护，原件与前5版保留。新段继承参考pPr/首rPr，不重建整份Word；未改部件SHA核对。仅正文顶层简单段，表格/页眉页脚结构、编号/分节/样式引用/复杂及跨段域书签批注保护；至少保留一原正文段，超限/冲突/拒绝/取消/磁盘失败不发布。详见docs/WORD_PARAGRAPHS.md和validation/v0.15.0.json。

166核心（新增10）/11真实Chromium（新增1）/9打包测试通过；真实HTTP模型夹具read→结构新增，生产UI新增/撤销→v2导出与独立python-docx→重载→删除/撤销→v3导出/磁盘重载。Mac原生/真实付费模型/WordWPS保真未验收。61生产文件ASAR精确匹配，15MachO/51216页、篡改负例、282应用+5配套/14链接/零残留通过；ad-hoc未公证。原Web/Python122保护文件未变，旧Python35未重跑；白蓝logo、兼容身份、Excel七函数、双任务、浏览器许可和GenOffice子引擎保留。

下一轮有Mac优先严格签名安装/启动/原生审批/真实模型Office；缺目标机继续受限表格结构或文档预览/模板质量，不停留介绍/队列。无完整GenOffice编辑器/任意Word保真/自主子任务组/MCP/跨Web核心结论。不创建PR/合并main，不用GitHub插件/聊天密码。

# 0.14.0 表格计算增量 · 2026-10-23

实际新增七函数公式引擎（SUM/AVERAGE/MIN/MAX/COUNT/IF/ROUND）、跨表A1与依赖计算、页面即时预览、单元格显式类型/公式编辑、新增坐标、切表草稿与只看公式。模型read/edit接既有审批与版本服务，主进程独立重算真实XLSX公式缓存、清除旧calcChain，保留样式和原件/前5版。未知/共享/数组公式、循环、外链、图表/透视表/结构化表格/签名工作簿编辑失败关闭。不是完整Excel/GenOffice电子表格套件。见docs/SPREADSHEET_FORMULAS.md和validation/v0.14.0.json。

156核心（新增20）/10真实Chromium（新增1）/9打包（新增2）通过；生产页面生成→修改→即时计算→切表保留→保存v2→导出→磁盘重载。openpyxl核对公式/缓存，容器LibreOffice独立重算8个公式一致；HTTP模型内容/原生IPC/审批仍夹具，无Mac/付费模型/Excel-WPS保真验收。61生产文件与ASAR精确匹配，282应用+5配套/14链接/零残留，15MachO/51216页和篡改负例通过；仍ad-hoc未公证。源码发布新增临时ZIP完整验证后原子替换和失败保留测试，不把它当上一轮截断已知根因修复。

下一轮有Mac先严格签名安装/启动、原生审批和实际模型Office链路；缺目标机优先Word段落/表格结构增删或受控扩展公式/模板质量、图表与预览。不要只加队列/说明；保留原Web/Python、兼容身份、白蓝logo、双任务/浏览器站点许可。不PR/不合并main、不用GitHub插件或聊天密码。

# 0.13.0 导入Word增量 · 2026-10-22

实际新增导入DOCX片段文字/粗体/斜体编辑，正文、表格文字、页眉页脚的简单段落支持；其他格式和未改ZIP部件保留并核对SHA。复杂段落只读、版本/片段指纹门禁、模型read→document_patch、原件保留与新版本真实导出。见docs/IMPORTED_WORD_EDITING.md和validation/v0.13.0.json。新模块为WillBuddy自己的受限OOXML补丁，既有GenOffice子引擎继续保留；不是完整上游编辑器或任意Word保真往返。136核心/9真实Chromium/7打包测试通过；原生IPC/审批/模型内容夹具，无Mac或付费模型/Office显示验收。

下一轮有Mac先安装严格签名/启动/审批/实际模型Word链路；缺目标机则推进受限段落/表格结构增删及电子表格公式引擎。不要持续只加队列或说明。原Web/Python、白蓝logo、加密身份、双任务/浏览器授权保持，不PR/不合并main。

# 0.12.0 当前入口 · 2026-10-22

先读docs/GENOFFICE_ENGINE.md、validation/v0.12.0.json、vendor/genoffice-html2docx及runtime/vendor/GENOFFICE-MANIFEST.json。已内置真实GenOffice HTML→DOCX子引擎和新建Word写作画布，非仅外部打开；完整套件/导入Word保真往返仍未完成。

下一轮有Mac先原生隔离转换窗口/签名/安装启动/审批及真实模型tool_calls验收；没有目标机则推进DOCX结构解析与画布往返，不丢失模板/图片/页眉/批注，随后引入真实电子表格公式引擎。禁止把内容重建称为无损保真，保持旧Web/Python、白蓝logo/加密身份/双任务。严格原生审批、队列与源版本门禁，别自动重放；不开PR、不合并功能main，用户拒绝GitHub插件。

# 0.11.0 当前入口 · 2026-10-22

先读docs/GENOFFICE_DESKTOP.md和docs/validation/v0.11.0.json。已修复Office误导出Markdown，补可信文件卡片/直接内容编辑/可选Mac GenOffice副本接续。完整GenOffice编辑器没有内嵌，不能声称已取代Office或已通过Mac原生启动。

下一轮：优先用户Mac真实模型生成→DOCX卡片→下载→编辑→再下载，以及GenOffice原生打开/保存/收回；缺目标机时提取可独立构建的GenOffice编辑器/引擎，许可/字体/arm64 sidecar先核验，推进内嵌保真编辑和公式计算，避免持续只改介绍和队列。保留双任务并发、原Web/Python、白蓝logo、兼容身份；不自动重放已审批工具，不建PR/合并main。

# 0.10.1 当前优先入口 · 2026-10-22

按用户截图修复document_create长JSON原生sheet超出屏幕、取消信号未传入dialog导致队列等待的问题。文档确认用摘要；浏览器可显式选择本任务/本站点授权，不逐步弹窗，新站点/新任务重新确认；撤销、任务结束和退出清理许可。增加60秒超时、菜单⌘⇧Esc紧急取消、拒绝无父窗口/过长消息及迟到允许，导航前后校验防止站点授权泄漏。完整边界见docs/APPROVAL_FIX.md（从docs阅读为APPROVAL_FIX.md）。

105项核心、6项真实Chromium回归；原生弹窗为适配器夹具，Mac真机/严格签名/启动仍未验收。继续保留0.10.0文档、双任务能力及原Web/Python/白蓝logo/加密身份。下一步优先用户Mac弹窗/浏览器/文档链路验证，继而Office保真预览和结构编辑；不回退纯壳、不创建PR/合并main。

# 当前入口 · WillBuddy 0.10.0 · 2026-10-22

用户当前主线：让AI真实生成、导入、修改Office/Markdown/HTML文档，逐步替代重复的Office操作，并支持多任务并发。本轮已接通文档工作台、模型文档工具、版本/校验与双会话独立执行，详见 docs/OFFICE_WORKSPACE.md、docs/validation/v0.10.0.json。

下一轮：1）Mac arm64 原生签名/安装启动、审批、真实模型与Office文件链路验收；2）文档结构增删/精确选区修改和真实页面渲染；3）Excel公式与缓存的明确计算引擎、图表和基础样式；4）模型自动拆解的受控并行子任务组/跨队列公平。Web/Python已有文档核心应逐步复用，但不以要求安装外部依赖回退离线主程序。没有Mac/账户时继续可独立验证的核心增量。

保留白蓝主题/logo/旧加密身份/原Web/Python。不要自动重放审批，不创建PR或合并main（尚无授权），不部署外部站点。读取当前权威文件版本并校验清单，不固定本次版本。

# 当前入口 · 0.9.0

先读 docs/SHARED_RUNS.md 与 docs/validation/v0.9.0.json。模型对话/每日任务已有共用持久调度与事件，CLI保留原队列并共享容量；不得误称三者已统一FIFO或跨Web核心已完成。旧worker/审批不自动重放。保持流式、安全Markdown/HTML、原Web/Python/身份/白蓝主题。

下一轮：有Apple芯片Mac先验收严格codesign/安装启动、原生审批/钥匙串/模型/CLI；无目标机时，优先桌面MCP工具发现与受控调用，或授权文件写入与成果验收，继续合并队列/事件协议并测公平调度。不要持续只增加队列UI。保留全源码与arm64离线候选，每轮检查包内残留/符号链接/执行位/ASAR和签名边界。GitHub使用最新版独立分支，仍无PR/合并授权，不从旧main倒退。

# 当前入口 · 0.8.0

先读 docs/DURABLE_COMMANDS.md 和 docs/validation/v0.8.0.json。手动CLI已有持久队列/去重/取消/重新审批重试，重启不自动重放。保留0.7的流式与安全Markdown/HTML。

下一轮：优先Apple芯片Mac严格codesign/安装启动、真实审批/模型/CLI验收；没有目标机时将conversation/tasks逐步接入共用执行队列与事件契约（当前仅手动CLI接入），覆盖取消竞争、过期事件、失败恢复，不把重试当成恢复同一个外部进程。再推进桌面MCP/授权文件写入/真实Office成果。不要从旧main回退基线，不创建PR或合并（尚待用户另行明确授权）。

# 当前入口 · 0.7.0

先读 docs/STREAMING_AND_RENDERING.md 和 validation/v0.7.0.json。流式/Markdown/HTML 已实际修复，保留安全边界与停止后的内容。下一轮先在 Apple 芯片用用户真实模型验收，之后推进持久队列、统一事件协议与跨端核心；不自动重放已审批动作。

# 当前整理入口 · 0.6.1

项目分层见 docs/ARCHITECTURE.md。main/services/runtime/ui 已拆分，原 Web/Python 保留。下一轮优先完善统一事件协议与持久队列，继续拆分 core 与界面其他页面，并在 Apple 芯片真机验证浏览器/CLI 与严格签名。不要重放已审批动作。

# 当前桌面优先项 · 0.6.0

1. 用户截图接续见 docs/SCREENSHOT_ALIGNMENT.md：任务导航、真实执行过程、对话/成果并排、上下文选择与继续修改已实现。先在 Apple 芯片 Mac 用真实模型验收这条完整链路。
2. 补齐截图所期待的真实成果能力：图片/Office 文件生成、预览、编辑与验收；现有右侧工作区只支持文本/Markdown，不用占位卡片声称实现。
3. 持久化执行队列、取消、幂等、中断恢复、失败重试及统一事件协议；不得自动重放已审批工具。
4. 真实第三方 Codex CLI、PTY/程序发现、桌面 MCP 与授权文件写入；继续拆分 main 并统一 Web/桌面业务服务。
5. 浏览器顶层 DOM 已通过真实 Headless Shell/CDP 验收，但原生 Electron/Mac、iframe、Shadow DOM、持久会话与业务结果验收仍待补充。
6. 保留每轮完整源码、arm64 离线包、白蓝主题与原 logo。Developer ID、公证与自动更新仍需要对应环境与凭据。

当前基线 0.6.0，验证见 docs/validation/v0.6.0.json；原 Web/Python、数据和加密身份保持兼容。下方保留原 Web 历史计划。

---

# 幕云AI持续迭代计划

2026-10-07 安全对话 JSON 导入：工作台可重新导入自身 `muyun-chat-export/v1` 权威 JSON，服务端只保留可读消息、模型与用量、HTTP(S) 来源和成果完整性摘要，并始终创建全新对话；请求标识、待执行提议、事件/工具参数、对象键、私有下载地址和模型重放记录都不会恢复。下一轮优先用合法生产会话验证真实浏览器导出→导入→刷新闭环与超大历史边界；生产文档工具开关继续关闭。

2026-10-06 对话安全重命名：已有聊天可在标题栏修改名称，服务端仅在当前 owner 与 `updated` 版本同时匹配时更新 `name`；旧标签页、缺版本、跨用户、空名称和超长名称失败关闭。后续发送、审批状态同步、评价和导出均保留自定义名称，不回退为首条消息。下一轮优先在合法生产会话验证双标签页重命名冲突和刷新后名称持久化；生产文档工具开关继续关闭。

2026-10-06 服务端权威对话导出：已有聊天可按当前 owner 与 `updated` 导出完整 Markdown，并提供同契约 JSON；正文、来源、模型用量与已完成成果摘要保留，待执行提议、请求标识、工具参数、对象键、私有下载地址和不安全 URL 均剥离。旧版本、跨用户和可执行格式失败关闭。下一轮优先在合法生产会话验证实际浏览器下载和 Office/WPS 打开；生产文档工具开关继续关闭。

2026-10-05 安全对话分支：当前对话可按服务端最新版本创建独立分支，保留消息、已完成成果和审计上下文，但剥离全部待执行提议，不复制 `tool_request`、`chat_requests` 或执行授权；旧标签页、跨用户和目标冲突均失败关闭。下一轮优先在合法生产会话验证分支后两条路径独立继续、刷新与删除恢复；生产文档工具开关继续关闭。

2026-10-05 对话限时恢复：聊天删除在同一 D1 事务保存当前精确快照并移出活动记录，侧栏“最近删除”可在 7 天内按不可猜测的删除版本恢复；恢复生成新版本且不覆盖同名活动记录。待处理/执行中提议和短期模型请求仍在删除后清理，不随聊天恢复复活。下一轮优先在合法生产会话完成删除→刷新→恢复与双标签页冲突验收；生产文档工具开关继续关闭。

2026-10-05 对话删除版本保护：删除已有聊天必须提交当前服务端版本；旧标签页、旧缓存或缺版本不能删除另一页面刚更新的对话。服务端先做 owner、id、kind、updated 条件删除，成功后才清理未终结工具提议和短期请求记录；前端冲突时保留确认框并刷新权威对话。下一轮优先在合法生产会话完成真实双标签页保存/删除冲突与 DeepSeek 用量验收；文档工具生产开关继续关闭。

2026-10-05 对话保存版本保护：浏览器创建聊天后持有服务端单调递增版本，任何已有对话更新都必须提交当前版本；旧标签页、旧缓存或缺少版本的写入在覆盖前失败并刷新最新内容。模型完成后的服务端落盘也推进版本。下一轮优先在合法生产会话完成真实双标签页保存冲突与 DeepSeek 用量验收；文档工具生产开关继续关闭。

2026-10-04 多标签页回复合并：模型运行期间另一标签页继续发送消息时，迟到助手回复按同一 `requestId` 精确插回原用户消息之后，并以完整快照 CAS 重试保留全部较新消息；原消息已删除或标识不唯一时不猜测挂接，完成响应仍可恢复。下一轮优先在合法生产登录会话验证真实双标签页、断网刷新和 DeepSeek 用量；文档工具生产开关继续关闭。

2026-10-04 服务端回复落盘：幂等模型请求完成后，服务端在返回 HTTP 响应前把带原 `requestId` 的助手消息写入真实对话；浏览器断开或刷新后，最近对话本身即可显示回复。写入以完整数据快照比较，另一标签页已修改时不覆盖，完成响应继续保留供手动恢复。下一轮优先在合法生产登录会话验证真实断网/刷新与 DeepSeek 用量；文档工具生产开关继续关闭。

2026-10-04 刷新后回复恢复：当用户消息已经持久化、模型请求已完成但浏览器未收到或未保存响应时，聊天页显示“恢复已完成回复”。服务端按认证用户、真实对话和原 `requestId` 只读取 D1 完成态，不接受新提示词，也不调用模型；处理中、跨用户、已删除对话和缺失记录均拒绝。下一轮优先在合法生产登录会话验证真实断网/刷新恢复及 DeepSeek 用量只增加一次；文档工具生产开关继续关闭。

2026-10-04 消息发送幂等：聊天网页为每次逻辑发送生成稳定请求标识，失败重试复用；服务端在当前用户与真实对话范围内用 D1 原子领取，重复并发不再调用模型，24 小时内完成请求直接重放保存结果，请求 ID 换内容、对话删除与跨用户复用均失败关闭或隔离。下一轮优先在合法生产登录会话验证双击/断网重试与用量只增加一次；继续保持文档工具生产开关关闭。

2026-10-03 删除/执行竞态：模型返回提议时以聊天存在为条件写入；删除聊天在同一 D1 批次清理 pending/executing 提议；成果 artifact 与 completed 终态在同一批次提交，并要求聊天与 executing 领取仍有效。已完成审计保留。下一轮仍优先合法生产身份下的真实 DeepSeek 提议、审批、下载与用量验收，未通过前不开生产开关。

2026-10-03 提议生命周期：文档工具在模型调用前验证真实、当前用户所有的对话记录；状态、批准和拒绝也要求原始对话仍存在，因此删除对话会使待处理提议不可执行。下一轮仍优先合法生产身份下的真实 DeepSeek 提议、审批、下载和用量验收；未通过前不开生产开关。

2026-10-03 审批动作最小授权：批准、拒绝和状态同步都必须由当前对话提交 ID，并与服务端隐藏提议的原始对话完全一致；同一用户跨对话操作和旧记录缺少绑定均失败关闭。下一轮仍优先合法应用身份下的真实 DeepSeek 提议、审批、下载与用量验收，未通过前不开生产开关。

2026-10-03 审批会话归属：文档提议保存服务端收到的实际对话 ID，审批审计导出逐项验证提议属于请求对话；同一用户跨对话重标、混合导出及旧记录缺少绑定均失败关闭。生产文档工具开关继续关闭；下一轮优先合法应用身份下的真实 DeepSeek 提议、审批、下载与用量验收。

2026-10-02 服务端权威审计导出：网页只提交最多 20 个提议 ID，后端按当前用户重新读取 D1 的 completed/rejected/expired 终态并生成脱敏凭证；客户端事件或伪造 receipt 不再决定导出内容。重复 ID、未终结记录、跨用户和缺失记录均失败关闭。生产文档工具开关继续关闭；下一轮仍优先合法应用身份下的真实 DeepSeek 提议、审批、下载与用量验收。

2026-10-02 审批凭证导出：文档提议进入完成、拒绝或过期终态时生成脱敏凭证；对话可下载 JSON 审计包，记录提议指纹、决定时间和已完成成果 SHA-256，不包含原始工具参数、密钥、对象键或私有下载地址。生产文档工具开关继续关闭；下一轮优先在合法应用身份下验证真实 DeepSeek 工具协议和生产下载，未通过前不启用。

2026-09-28 提议内容指纹：XLSX 提议在参数校验后对规范化文件名、列名和全部单元格计算 SHA-256，卡片显示短指纹；批准时服务端重新解析隐藏参数并复算，任何变化都停止生成且不创建成果。生产文档工具开关继续关闭；下一轮优先合法应用身份下真实验收，若身份仍不可用则推进脱敏审计导出或审批撤销事件。

2026-09-28 审批内容预览：XLSX 提议在批准前展示最多 6 列 × 5 行的普通文本样例，并明确其余行列数量；原始工具参数继续隐藏，完整文件仍只在服务器批准后生成和校验。生产文档工具开关继续关闭；下一轮优先合法应用身份下真实验收，若身份仍不可用则继续补审批撤销/审计导出等失败关闭能力。

2026-09-28 提议状态恢复：聊天中的 XLSX 提议会在卡片挂载、标签页重新可见和到达失效时间时向服务端核对状态；另一标签页已批准、拒绝或服务端已判过期时，当前会话移除旧按钮并同步成果或事件。服务端新增只返回脱敏状态的 `status` 动作，仍以 D1 原子过期判定为准。生产文档工具开关继续关闭；下一轮优先合法应用身份下的真实 DeepSeek 提议→批准→下载验收。

2026-09-27 工具提议过期：文档生成提议固定 10 分钟有效，服务端在批准或拒绝前原子判定过期并持久化 `expired`；重复处理保持幂等，前端显示失效时间并在过期响应后移除按钮、留下事件证据。生产文档工具开关继续关闭；下一轮仍优先合法应用身份下的真实 DeepSeek 提议→批准→下载验收。

2026-09-27 对话失败重试：模型失败、取消或响应前网络错误后，原问题继续恢复到输入框，错误条提供“一键重新发送”和关闭操作；重试复用最后一条相同用户消息，不制造重复气泡。下一轮优先在合法生产登录会话完成停止→重试浏览器验收，再继续文档工具真实服务验收。

2026-09-27 发布安全阀：聊天 XLSX 提议与审批代码改为仅在服务端 `DOCUMENT_TOOL_ENABLED=true` 时可运行；默认缺省状态下，即使客户端请求工具也只执行普通聊天，直接调用审批接口同样失败关闭。完整回归与生产构建已通过，下一步发布默认关闭的安全版本；待合法应用身份完成真实 DeepSeek 提议→批准→下载验收后，再单独启用开关。

2026-09-27 后续：聊天 XLSX 候选已增加显式审批。模型只能创建待审提议，用户查看文件名、行列数后批准或拒绝；批准生成幂等，跨用户审批失败。仍缺合法应用身份下的真实 DeepSeek 工具协议验收，因此继续保持未部署，线上版本 23 不变。下一轮优先完成真实提议→批准→下载→用量核验，通过后再发布。

2026-09-27：已完成受限聊天 XLSX 工具循环候选，未部署。下一轮先读 RELEASE_STATUS.json：受保护接口身份预检 HTTP 401，真实 DeepSeek 工具调用未验收。优先补至多两个真实小任务及下载/用量核验，通过后发布同一私人站点；不要把远端候选 main 当作已上线。

2026-09-26 后续：已补分会话、当前标签页内的草稿恢复，覆盖刷新、最近对话、全局搜索、新对话、发送清理和存储不可用降级。下一轮优先在合法生产登录会话完成发送/停止/切换/刷新浏览器验收；若仍缺身份，则推进受限工具代理闭环或真实代码隔离，不重复草稿功能。

2026-09-26：优先修复用户反馈的发送后输入残留，补充实际前端处理函数生命周期回归。下一轮优先在合法生产会话验证发送、停止与新草稿保留的浏览器流程，再接续本机执行能力。

2026-09-22 最新接续：已完成受限中文任务简报编译器。用户用逐行编号的“标题：正文”描述 1–10 份文档，系统只编译为既有固定文档 DAG，保存来源 SHA-256、条目数和边界提示；计划必须人工审阅并重新校验后才能运行。它不调用模型、不生成代码或外部操作，也不冒称自主规划。下一轮优先在具备 Docker/等效隔离的授权环境完成真实代码沙盒验收；若环境仍不可用，则为规则计划增加只读依赖图预览和逐步授权，而不是放宽执行边界。

2026-09-22 最新接续：已完成多批次公平并发调度。执行槽按批次轮转分派，同一轮先让每个就绪批次获得一个槽，再为仍有容量的批次补位；全局仅一个槽时也在批次间轮转。每次开始事件保存调度策略和排队时间，任务台显示分派次数。下一轮优先在具备 Docker/等效隔离的授权环境完成真实代码沙盒验收；若环境仍不允许，则推进受限、可审阅的自然语言计划编译器，不将规则编译称为模型自主规划。

2026-09-22 最新接续：已为本机 DAG 增加可审阅的运行策略，逐批限制并发 1–4、总运行时间 1–3600 秒和成果总量 1–500MB；任务台持续显示限额与实际用量，任何时长或成果超限都会停止剩余步骤、将批次判失败并跳过成果验收。断点重试继承原策略，已复用成果计入新尝试预算。本宿主仍无法提供 Docker/Podman/bwrap/user namespace/Landlock，因此代码任务继续失败关闭；下一轮优先在具备真实隔离的环境验收，否则推进受限、可审阅的自然语言计划生成。

2026-09-22 最新接续：已完成可控断点重试。失败、取消或重启中断的批次可由用户明确创建新尝试；成功步骤只有在持久化证据和当前 SHA-256 仍一致时才复用，其他步骤重新进入依赖调度，不自动重放。下一轮优先补真实 Docker 隔离验收；若宿主仍不可用，则推进受限、可审阅的自然语言计划生成，不把规则拆解或手工重试称为自主代理。

2026-09-21 最新接续：已完成受控任务的可执行成果验收。计划可声明文件类型/大小、UTF-8 文本包含或 JSON 标量路径已知答案；执行器只读取通过 SHA-256 复验的任务成果，任何标准不满足都会把整批标记失败，并在任务台展示证据。下一轮优先在可用 Docker 环境完成真实 Python/JavaScript 隔离验收，或为自然语言计划增加受限、可审阅的模型规划器；当前仍是规则/人工计划，不冒称自主代理。

2026-09-21 最新接续：已完成 Office 编辑检查点与冲突保护。每次 GenOffice 编辑附带编辑前原件、前后哈希及恢复约束；安全恢复始终写新文件，只有当前文件仍等于该次编辑结果才执行，后续修改会拒绝。下一轮优先把目标验收标准接入受控任务计划，区分文件完整性和内容验收；仍不把规则流程称为模型自主规划。

2026-09-21 用户新指定 OpenWorkBuddy 参考：已独立落地成果完整性验收（任务成功前检查、前置成果复验、持久化证据和下载复验），没有复制非商业核心。下一轮优先评估编辑检查点与冲突保护，再推进受控目标验收/模型规划；仍须真实验收并同步线上。具体取舍与许可证见 OPENWORKBUDDY_REFERENCE.md。

2026-09-21 最新接续：GenOffice 编辑后的 DOCX/XLSX/PPTX 已接入 LibreOffice + Poppler 逐页预览，三种格式在同一受保护 DAG 各完成 1 页真实渲染并逐页检查；报告和返回值明确实际引擎，不冒称 GenOffice 原生渲染。下一轮扩大常用函数和错误值样本，或在合法生产身份下验证自然语言到文档与下载流程；不重复兼容性渲染基础链路。GenOffice 原生渲染、Office/WPS 和生产浏览器仍单独列为缺口。

品牌名称统一为「幕云AI」。页面、助手自称、导出作者和后续文档沿用此名称。现有站点 ID、网址、数据与内部技术标识保持兼容，不创建新项目。

用户已于 2026-09-14 明确授权：本项目所有文件创建、修改和保存直接执行，不逐项请求确认。此授权不取消真实验收、凭据保密和保持私人访问范围的既有要求。

2026-09-15 补充：环境故障先主动检查并恢复可用运行环境、原项目工作区、执行配置和锁定依赖，恢复后接续同轮工作。保护未提交改动；工作区丢失时从原远端 main 恢复到空目录。不因一次短暂错误立即停止，有限重试后区分临时故障和缺少平台恢复能力；没有可调用的环境启动/恢复工具或认证不足时，明确实际阻塞，不绕过权限、不承诺已经恢复。遵守运行时对完全阻塞的处理要求。

用户目标：最终超越 Amazon Quick。每 6 小时启动一次改进；每轮必须自测。优先交付完整的可验证能力，不按菜单数量或模型自评宣称领先。

## 每轮固定流程

当前最高优先级（2026-09-20）：用户要求本地代码沙盒、任务拆解并发、LibreOffice 生成和渲染。候选已完成文档与表格规则 DAG、本机控制台、真实中文并发生成/预览、成果 ZIP 与逐文件哈希清单。Docker、Podman、bwrap、user/network namespace 和 Landlock 均在当前宿主缺失或被策略阻断，真实代码隔离仍未通过，相关能力保持未验收且缺环境拒绝执行。用户明确要求线上同步，已验证 Web 功能现已发布版本 10；后续每轮通过回归后同步原私人站点，不再因独立本机沙盒缺口冻结全部网页更新。下一轮必须在具备 Docker/等效隔离的授权执行环境补真实 Python/JavaScript、断网、只读、超时和清理测试；若环境仍不变，则推进不依赖代码执行的本地演示文稿链路或计划可视化，但不得虚报沙盒恢复。随后再做模型规划、受控工具循环和云端/本机配对。不得将规则模板称为 AI 自主拆解。完整边界见 `local-runner/README.md`。

1. 从 Sites 返回的现有仓库读取最新 main，保护用户未提交修改。旧 scratch 可能丢失或落后，不能以旧工作目录覆盖线上功能。
2. 阅读本文件、ITERATION_LOG.md 和 PRODUCT_ANALYSIS.md，选择一个能本轮完成的具体用户任务。
3. 定义输入、预期输出、失败行为和验收证据；实施改进。
4. 运行 `node scripts/self-test.mjs` 的完整类型检查与全部集成回归，再运行当前 Sites 生产构建。每轮按 `SELF_TEST_MATRIX.md` 检查全部已实现功能，不只测本轮新增项；新增功能必须同步补测试。涉及模型时执行少量真实用例，记录服务商返回的 Token 和耗时。逐项区分本地模拟、真实服务和未执行，不把接口测试等同于浏览器或线上端到端验收。
5. 通过本地验证后更新同一私人站点，等待部署终态。生产登录链路自测需要有效用户身份；不能因为自动测试无法登录而移除认证、伪造身份头或公开测试接口。
6. 写清楚本轮变更、结果、费用用量、问题、下一轮目标。失败保留现有线上版本，不强行发布。
7. 每轮结束更新 `RELEASE_STATUS.json`，提交并推送后运行 `node scripts/package-source.mjs`，交付最新完整源码 ZIP 的实际下载链接。包内包含代码说明 `CODE_GUIDE.md`、部署文档 `DEPLOYMENT.md`、完整提交 SHA、验证和发布状态、日志、矩阵、锁文件、迁移及测试。校验完整性并排除密钥、用户数据、缓存和 Git 认证信息；候选未部署时明确原因，不用旧包冒充新交付。用户已授权直接写入和保存，不逐项确认。

暂定真实调用上限：每轮最多 6 次请求、每次最多 2048 输出 Token，不自动重试到成功、不购买或充值。日常用户主动使用不受这个自测上限影响。

## 衡量“超越”的五条轴

| 轴 | 可重复测量方式 | 当前证据 |
| --- | --- | --- |
| 模型开放性 | 同一组任务在至少 3 个独立兼容模型服务上通过 | 支持兼容协议；目前只有 DeepSeek 真实验证 |
| 中文企业任务 | 固定输入，结构化字段正确率、缺失信息处理、复杂任务完成率 | 已建立小型初始用例；还不能代表真实企业全场景 |
| 知识与数据正确性 | 引用匹配、已知计算答案、跨资源权限和拒绝无依据结论 | 集成测试覆盖部分；需扩充真实文档语料 |
| 执行可靠性 | 中断恢复、重复请求、审批变更、工具超时的实际副作用 | 持久化节点与审批去重已有回归；无后台队列 |
| 成本与体验 | 同任务 Token、用时、失败次数、人工干预次数 | 使用真实 API 用量记录；未建立 Quick 同任务对照 |

对比 Quick 时必须使用相同输入、任务、验收规则与相近资源条件；没有对照数据就不能说“已经超越”。

## 优先队列

2026-09-17 已完成流程运行前检查：在零模型、零连接器调用下检查结构、引用、分支、可达性和副作用边界，并在编辑器展示模型/联网/外部动作/人工确认数量。它改善可控执行，但不是代理循环、后台调度或运行时服务探测。生产登录预检被认证页人机校验阻塞，没有绕过。下一轮仍优先受限工具代理循环，或在合法生产用户会话可用时完成线上对话、用量和流程检查 E2E。

2026-09-16 本轮完成格式化 XLSX，以及下一轮的 PPTX 标题解析、自动续页、品牌页脚和实际 LibreOffice 打开/另存/渲染验收；后续不重复这两项。下一轮优先实现受限工具注册与代理循环，或在合法生产用户会话可用时核验线上对话、用量与浏览器下载；不能因此伪造身份或降低认证。

2026-09-16 紧急修复：Node 模拟测试无法发现 Worker 不支持的重定向参数。完整回归入口已增加实际 workerd 阶段，后续必须执行，不能仅靠 Node 测试判断线上兼容。使用用户新提供的测试密钥完成本地受保护应用处理函数的真实模型验收；不从服务端读取 secret，也不放开身份校验。优先核对发布后的真实用户调用与用量，再继续功能扩展。

2026-09-15 本轮接续 `f2952e6573f0e1810e28dc35023f90d6a76405fa`，选择 CSV 导出公式注入防护，而不是重复 Word 表格改进。已补生产导出、数据不变性、提示、完整回归和真实 Calc 导入；候选依旧受真实模型验收门槛约束。下一轮优先恢复合法应用身份的验收条件，接着补 XLSX/PPTX 排版及浏览器下载，避免把文件结构检查当作视觉或线上通过。

1. **代理执行闭环**：受限工具注册、真实工具调用循环、步骤事件日志、引用与结果验证，保留外部动作审批。
2. **执行可靠性**：审批撤销/超时、取消语义、原子领取、幂等记录，随后评估真正的后台队列与定时器。
3. **知识质量**：中文检索基准、引用精确定位、文档结构提取、混合检索与 OCR 接口。
4. **可交付成果**：Word 表格与段落、Excel 数字/公式、PPT 布局和导出渲染验收。
5. **企业任务验证**：制造业经验整理、方案生成、数据复核、跨系统事项处理；有凭据后再接专用 OAuth。
6. **桌面能力**：评估 DeepSeek Harness 本地执行组件与现有 Web 服务的边界，再决定独立客户端或受控本机连接。

## DeepSeek Harness 参考结论

阅读其 [README](https://github.com/deepseek-ai/deepseek-harness)、[架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) 与 [安全说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md)。它是基于插件组合的代理执行框架，模型、工具、会话和执行循环均有替换接口；持久化会话事件与实时执行事件分离。适合参考代理执行与可恢复日志设计，不能视为完整 Quick 商业套件的替代品。

当前没有安装或运行它的本机 shell/browser 工具，也没有复制其源码。后续实际采用包或代码前检查对应版本、许可证、平台兼容性及权限；它处于开发预览期，不能直接跟随 master 自动升级生产。

## 凭据与运行约束

- DeepSeek 已通过 Sites 服务端 secret `DEEPSEEK_API_KEY` 配置。`managed-deepseek` 连接固定发送至官方 HTTPS 地址；客户端不能修改该连接或读出密钥。
- 原有 `VAULT_MASTER_KEY` 不得重置。不要在脚本、日志、源码、任务提示或截图中保存真实密钥。
- `tests/provider-live.mjs` 仅在安全进程环境有密钥时运行，最多 3 次，无重试；无法读取已托管 secret 时不能绕过加密或要求再次公开粘贴。
- `tests/live-model.mjs` 需要有效私人站点用户授权。Sites 的页面访问令牌未必包含应用用户身份；401 必须记录为身份阻塞，不能把它当模型故障。
- 构建保留 pnpm 11.19.0。若环境自带其他版本，为本轮安装器配置相同版本的可执行文件，不降级锁文件或更换包管理器。
- 定时任务是开发迭代触发器，不等于工作台的自动化已具备后台定时执行。


2026-11-05 · 0.37.23 候选：模型调用轮数 1–96 可在模型配置中设置，保留旧智能体默认；添加模型保存错误可见并返回列表。完整回归因离线依赖 jsdom 缺失未通过，真实 Mac/付费模型和新版离线包未验收；详情 docs/MODEL_ROUNDS_03723.md。下轮先恢复依赖后执行完整回归及 UI，核对并完成 0.37.22/后续 GitHub 发布。

2026-11-05 · 0.37.24 候选：旧模型设置暂存、失败回滚与串行保存；模型/智能体/CLI 44 项、打包边界 26 项通过。缺 jsdom，完整 UI 和完整回归未完成，无本版 arm64 构建/正式发布；见 docs/MODEL_SETTINGS_TRANSACTION_03724.md。

2026-11-05 · 0.37.25 候选：增加 Office 文件通过原生保存对话框导出 PDF，真实 Linux LibreOffice PPTX 导出及取消/版本/SHA 边界验证；46 定向、26 打包测试通过。UI/完整回归和 Mac 构建未完成；见 docs/OFFICE_PDF_EXPORT_03725.md。下一轮推进文档直接编辑及完整回归、签名构建和 GitHub 发布。

2026-11-05 · 0.37.26 候选：工作区 PDF 导出及最终发布前版本检查，拒绝无 EOF 截断 PDF；47 定向和 26 打包测试通过。完整回归/UI/Mac/离线构建未完成，见 docs/OFFICE_PDF_EXPORT_GUARDS_03726.md。下一轮优先文档内选择与编辑、完整回归和已授权 GitHub 发布。

综合办公接续：从最新内部检查点继续，优先验证 Word/PPT 真实界面与中文 IME，支持跨段及复杂对象的受保护编辑、Excel 原格式操作；完成综合回归和 Apple 芯片打包后统一交付。记录 Mac 签名和真实用户文件验收边界，不以测试夹具代替。

Word 跨段手动替换已有有界正文路径；后续核验部分选区、中文输入法和实际界面，扩展结构及样式保护，推进 Excel/PPT 及 Mac 原生综合验收后统一发布。

继续 Office 综合开发：扩展 AI 和手动编辑对复杂 Word 结构/多行格式的可核验支持，完成 Excel/PPT 原格式编辑、真实界面和中文输入法、Mac 原生安装及签名验收，再统一交付源码和 Apple 芯片应用。

继续综合办公开发：扩展 Word 复杂段落及样式保护、Excel/PPT 原格式编辑、真实生产UI与中文输入法；完成Mac原生签名和综合验收后统一交付。

继续实现和验收 Word 图片锚点/裁剪、复杂结构及 Excel/PPT 编辑，完成真实UI/IME、Mac 安装签名与综合回归后统一发布。

综合办公下一步：消除前端测试依赖阻塞，验证手动Excel入口的真实生产UI、中文IME和真实Mac；扩展Word浮动图片/位置及复杂对象与Excel图表样式保护。保留任务持续开发、分阶段检查点，满足大版本综合验收后才统一发布源码与Apple芯片包。

下一轮从最新综合工作候选继续：优先定位PPT选区间歇为空（已有selectionType/事件诊断）及Excel被Node遮挡的两次错误，恢复jsdom/zrender测试依赖；再完成复杂Office保真、真实UI/IME及Apple芯片原生签名验收。每轮实际持续开发至少30分钟，有环境限制如实记录；满足用户综合验收后统一发布源码和离线应用。

2026-11-11 下一步：完成 Apple arm64 构建签名和 Mac 原生检查，核对 GitHub 并发后补齐版本分支、PR、main 和 Release；继续 Office 输入法、复杂对象与用户实际文件验收。

下一步：继续 Mac 原生 Office/中文输入验收及复杂文档保真；GitHub 部分分支的缺失记录与自动审查限制仍需先解决，再核对合并发布。

下一步：验证真实 Electron/Mac 编辑和多任务输入草稿体验，继续中文输入法及复杂 Office 文档保真；安全策略允许且源码完整核对后再执行 GitHub 合并发布。

2026-11-12 办公输入管道检查点：下一步恢复 jsdom 并执行完整回归，检查真实 Mac 中 worker.py 错误及 LibreOfficeKit，完成综合办公后统一构建和发布。

2026-11-13 办公检查点：从本检查点接续；恢复锁定测试依赖，做真实 LibreOfficeKit 和 Mac Office/IME、签名及用户原文档验收；综合通过后统一打包发布。

2026-11-13 下一步优先Mac实测原模型轮数保存与Office原始文档启动；补齐签名及开发依赖构建最新arm64候选，开展真实界面/模型验收；避免反复安装。

0.37.56 后：优先基于用户显式选择且SHA匹配的原PDF实现真实页图与证据框核对；完成Mac ARM OCR/中文数据及离线模型分发、真实Mac进程池隔离和性能验收，再统一交付。不得将当前检查点标为M4完成。

0.37.57 接续：从本检查点继续实现原PDF安全页图与证据高亮、页码跳转；完成Mac ARM离线中文OCR/语义模型及真实Mac隔离性能验证后统一交付。核对后打开实际路径存在后续外部修改竞态。

0.37.58 后：扩展跨页证据切换并做真实Chromium/Electron渲染与Mac验收；补齐离线Mac ARM中文OCR/Poppler、语义模型及Office池隔离性能后统一交付。

2026-11-14 接续 0.37.59：继续实现 Apple ARM64 离线 OCR/中文语言数据与 PDF 渲染，真实本地嵌入模型，Mac 文档池隔离和性能验收；保护源文件及并发检查，不将内部检查点当成正式发布。

2026-11-14 工作中：完成真实Kit双进程长时间隔离测试，持续故障注入、汇总资源限制，并检查并行迭代后融合；离线Mac OCR/本地嵌入与Mac原生验收仍为M4关键缺口。

2026-11-14：完成OCR WASM版本专属第三方许可归属及来源核验后，才可提供其二进制；继续补齐中文训练数据、Mac PDF渲染和真实Mac运行验收。
