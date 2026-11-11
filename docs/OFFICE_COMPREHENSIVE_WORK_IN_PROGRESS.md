# Office 综合能力改造：工作检查点，非发布版

用户要求集中完成办公能力后一次交付，不要逐项发布小版本。当前工作在 0.37.26 候选上继续，尚未完成综合目标，不能作为正式版/安装版发布，也不得覆盖权威 0.37.22。

本次实际代码工作：desktop/runtime/office-presentation.mjs 放宽普通顶层 PPT 多段文本框中同一段的唯一文字选区编辑；desktop/services/office-workspace.mjs 允许用户手动修改最多 4000 字符，模型修改仍 600 字符并逐次审批。仍不支持跨段选区、混合直接格式、分组/表格/链接/域/复杂效果等，验证不能声明全格式或视觉保真。

Linux LibreOfficeKit 实际合成 PPTX 多段文本框定位、单词替换、保存后由 python-pptx 核对其他段落和幻灯片；较长手动修改与 AI 600 字限制覆盖。最终 office-presentation.test.mjs 串行 24/24 通过。首次完整测试 21/23，出现原有选择时序失败以及多段文本框坐标选不到；改用页面实际位置依次定位后的目标测试 3/3 和最终完整 24/24 通过，不声称 Mac 选择问题已解决。测试日志 docs/validation/office-full-*.txt。

尚未完成：Word/PPT 直接键盘/IME、跨段与复杂对象编辑、Excel/PPT 格式和版式、可靠且可恢复的 AI 生成修改验收、Office 全套 UI、真实模型/Mac/安全签名/安装验收；jsdom/zrender 依赖缺失导致完整核心/UI 回归无法通过。0.37.22 公开版本分支仍不完整，不能合并；无本轮 Mac 包或 GitHub 发布。下一次从权威和此检查点重新读取，继续完成综合能力，检查并发后按用户授权发布；不要将此检查点视作用户要安装的小版本。

2026-11-05：PPT 选区修改或字体修改后的验收新增普通文本框显式位置、尺寸、旋转和翻转检查；允许坐标和尺寸差最多 720 EMU，容许 LibreOffice 在合成样例中观察到的 360 EMU 取整。其他文本框发生超过容差的位移或尺寸变化时拒绝发布。没有显式变换的母版继承位置、图片/图表/组合对象以及其他视觉属性不在此检查范围，不能声称完整布局保真。首次完全相等方案导致真实 Linux Kit 10 项失败，未采用；调整容差后 25 项串行测试通过，包含实际 Kit 修改和 720/721 EMU 以及明显移动/缩放负例。生产改动 desktop/runtime/office-presentation.mjs，测试 desktop/tests/office-presentation.test.mjs。仍未进行 Mac、真实付费模型、完整 UI 与离线应用构建验收。

2026-11-06：允许手动载入的普通 PPT 文字选区改为空，以删除所选文字；工作进程仅在真实 PPT 文字选区及页面一致时发固定删除命令，继续执行版本和选区二次验证、审计及文字/格式/文本框位置输出校验。模型空内容仍拒绝，普通粘贴不能发空删除；并非任意形状或跨段删除。Linux 真实 Kit 对两页合成 PPT 执行删除，python-pptx 独立确认目标文字与其他幻灯片，过期选区及 AI 空替换拒绝；PPT 整组 26 项串行通过。涉及 desktop/runtime/office-presentation.mjs、desktop/services/office-workspace.mjs、desktop/runtime/office-kit/worker.py、desktop/src/office/office.js、desktop/tests/office-presentation.test.mjs；未进行 UI/输入法/Mac 原生/付费模型或离线应用构建验收。

2026-11-06 后续：普通输入框直接替换当前 PPT 文字选区此前绕开专用选区的输出校验；现改为先读取真实选区、为普通可验证文本建立保存回执，传递页面和原选区供内核二次核对，输出未匹配时不发布修订，失败草稿保留校验器。已有未保存草稿必须先显式保存。光标处无选区的插入继续使用旧路径，不受此回执保护；此改动不等于画布直接键盘或输入法支持。真实 Linux Kit 选区替换及模拟原生 no-op 后保存拒绝，PPT 测试 28/28 通过。修改 desktop/services/office-workspace.mjs、desktop/tests/office-presentation.test.mjs；仍缺生产 UI、Mac、复杂对象和图片保真验收。

2026-11-06 后续键盘工作：Word/PPT 画布焦点时输入单个可打印字符会带入现有下方输入框，用户继续编辑并明确写入；已有草稿保留，PPT 文字选区绑定既有 sequence 校验；执行中或导航排队时不触发转发。快捷键、控制键和输入法组合事件不转发。此为输入框焦点切换，不是画布内直接编辑或原生 IME，中文组合应直接在输入框中完成，仍需真实 UI 与 Mac 验收。修改 desktop/src/office/office.js、index.html、src/shared/office-navigation.js 和 tests/office-navigation.test.mjs；字符策略与 Linux Kit/PPT 相关 34 项、打包脚本 26 项通过，未做完整 UI 回归或新离线安装包。

2026-11-06 后续：PPT 文字修改/格式保存的输出回执增加顶层普通图片的显式位置、尺寸、旋转、翻转核对，与文本框使用同一 720 EMU 坐标容差。真实 Linux Kit 编辑包含 PNG 的两页 PPT 后，python-pptx 验证图片位置和目标文字；合成移动图片输出被拒绝。相关 PPT/导航测试 35 项及打包脚本 26 项通过。修改 desktop/runtime/office-presentation.mjs 与 desktop/tests/office-presentation.test.mjs。此检查不验证图片内容、裁剪、图片效果、分组、图表和母版继承位置；不代表复杂页面完整保真，也没有 Mac 或真实用户文件验收。

2026-11-06 图片内容保护：PPT 文字或格式修改的保存回执通过页面内部图片关系解析图片资源，比较原始图片字节 SHA-256；关系缺失、重复、外链或路径无效时拒绝，输出中图片字节变化时不发布新修订。此检查覆盖关联的普通图片字节，并不核验裁剪、效果、图表、母版或其他视觉效果；有些编辑器可能重编码图片，此时会保守拒绝保存，不承诺全部图片格式可编辑。真实 Linux LibreOfficeKit 对带 PNG 的 PPT 修改选区并保存通过，篡改图片字节负例被拒绝；PPT/导航 35 项、打包测试 26 项通过，见 validation/office-picture-integrity-tests.txt 和 office-picture-pack-tests.txt。Mac、真实用户文档和完整 UI 尚未验收。修改 desktop/runtime/office-presentation.mjs 与 desktop/tests/office-presentation.test.mjs。本记录属于综合工作检查点，未达到统一发布条件。

2026-11-06 Word 手动选区：Office 界面开放 Word“编辑选中文字”，将有界非空单段文字载入输入框，显式保存后对内核选区再次核对、按原文档唯一正文段建立回执，保存时检查正文和页眉页脚段落文字，防止空操作、错误文字或其他文字被更改后发布。重复匹配、跨段、复杂段落、空文本拒绝；未核对全部样式、图片和视觉布局，普通光标插入及 AI 替换未迁移到此回执。修改 desktop/runtime/office-word-format.mjs、desktop/services/office-workspace.mjs、desktop/runtime/office-kit/worker.py、desktop/src/office/office.js 和 desktop/tests/office-word-format.test.mjs。真实 Linux Kit 修改中文 Word 后 python-docx 独立读取确认；空操作不能保存、过期选区和歧义拒绝。Word/PPT/导航 42 项和打包 26 项通过，见 validation/office-word-manual-selection-tests.txt 和 office-word-manual-pack-tests.txt。浏览器 UI、Mac、真实用户文档和输入法仍未验收；这是工作检查点，非正式版本或安装包。

2026-11-06 后续 Word 选区删除与输入：显式加载单段普通正文选区后允许清空输入框并提交，以删除经主机与内核再次核实的文字；AI 空替换、无选区空粘贴和过期选区仍拒绝。文字内容回执检查正文及页眉页脚，失败保留未发布草稿。Word 画布有选区且输入框无草稿时敲入可打印字符，会绑定原选区并转入输入框，明确提交后执行受校验替换；不是画布内键入或中文 IME 实现，已有草稿不覆盖。真实 Linux Kit 删除合成中文 DOCX 选区，经 python-docx 确认输出、AI 空替换及过期选区拒绝；Word/PPT/导航串行 43 项、打包 26 项通过。修改 desktop/runtime/office-word-format.mjs、desktop/runtime/office-kit/worker.py、desktop/src/office/office.js 和 desktop/tests/office-word-format.test.mjs。UI 焦点链路、真实 Mac、中文 IME、样式/图片及真实用户文档未验收，不能宣称完整编辑器；本检查点未发布。

2026-11-06 后续 Word 跨段编辑：Word 手动选区回执支持选择连续顶层正文中多个普通段落，替换为单行文字或删除，保存时将预期段落合并并核对所有正文及页眉页脚文字。必须能唯一匹配，各段非空、直接属于正文且在 XML 中连续；编号、分节、表格跨越、链接、域、修订或图片所在复杂段拒绝。原生选区和版本仍二次核验，失败草稿不可绕过回执保存，AI 修改并未切换到该回执。真实 Linux LibreOfficeKit 选中三个正文段替换为中文，python-docx 独立验证保存结果；局部跨段回执、歧义、编号、原文变更及空端点负例、Word/PPT/导航合计 45 项、打包 26 项通过。修改 desktop/runtime/office-word-format.mjs、新增 desktop/tests/office-word-cross-selection.test.mjs。正文文字核对不代表段落样式、图片或布局无损；未验收 Mac、真实 UI/输入法、真实文档或付费模型。此为综合开发工作检查点，未构建新应用或发布。

2026-11-06 Word AI 保存验收：office_replace_selection 的 Word 分支接入真实选区二次校验和 wordTextVerifier；完成内核操作后核对正文及页眉页脚文字，no-op 或意外更改不能发布，手动保存也不能绕过失败回执。逐次审批、审计、取消、600 字上限和版本检查继续有效。为防止不可核验输出，现在 AI 选区须唯一对应普通正文，跨段仅支持无编号/分节的连续顶层简单段落，替换只能单行；这收窄了此前未核验的复杂段/多行替换，不能称所有 Word 内容均支持。更新模型工具描述明确限制。实际本机 HTTP 模型夹具→原生 Linux Kit Word 修改→保存及持久聊天通过；新增模拟原生 no-op 的失败草稿及手动保存拒绝。Word/PPT/导航/Office对话 58 项、最终工具描述调整后对话回归另过、打包 26 项通过。见 docs/validation/office-word-ai-*-tests.txt。修改 desktop/services/office-workspace.mjs、desktop/services/office-chat.mjs、desktop/tests/office-chat.test.mjs。格式/图片视觉保真、Mac、真实模型、IME 及完整 UI 未验收；工作检查点未发布应用。

2026-11-06 Word 多段替换：扩展 Word 文本验收，允许手动和 AI 将选区替换为多行，作为多个正文段落保存（最多100段、手动4000字符、AI600字符）。涉及跨段或插入换行时只接受唯一匹配、无编号或分节的连续顶层普通正文，输出核对所有正文及页眉页脚文字，越界、复杂段、控制字符和不匹配输出拒绝；不保证原段落样式、图片或视觉布局保真。PPT 仍单行。真实 Linux Kit 手动及 HTTP 模型夹具→实际 Office 工具替换多段，python-docx 独立读取新段落；60项相关测试、另4项跨段及边界测试、26项打包通过。修改 desktop/runtime/office-word-format.mjs、desktop/services/office-chat.mjs、desktop/tests/office-word-cross-selection.test.mjs 和 desktop/tests/office-chat.test.mjs。真实模型、Mac、IME、生产UI和用户真实文档未验收；本检查点未发布应用。

2026-11-06 Word 图片内容保护：手动和 AI Word 选区文字保存回执增加 word/media 内资源 SHA-256 多重集合核验，允许内核更改资源文件名，但若图片字节新增、删除或变化则拒绝发布；若内核对未修改图片重编码也会保守拒绝。此检查不验证图片锚点、裁剪、关系或视觉位置，也不涵盖非 word/media 资源，不能声称完整保真。真实 Linux LibreOfficeKit 对另一段带 PNG 图片的 DOCX 修改正文，python-docx 校验文字和图片对象；图片篡改/删除负例拒绝。Word/PPT/AI/导航62项、打包26项通过。修改 desktop/runtime/office-word-format.mjs、新增 desktop/tests/office-word-media.test.mjs，详见 validation/office-word-media-*.txt。真实Mac、UI、IME、付费模型及用户原文档未验收，工作检查点未发布应用。

2026-11-06 综合开发检查点：
- Word 文字替换时核对行内图片与实际内部资源 SHA 对应关系及精确宽高，防止交换两张图或缩放后发布；保护范围不含浮动图、裁剪、位置、图表和完整视觉保真，内核重编码或重排可能保守拒绝。Linux Kit 带图DOCX成功保存，篡改尺寸/调换图片、外部/缺失/重复关系负例拒绝。
- Excel 提供“写入选中单元格”：输入框使用制表符/换行分隔，同尺寸有界矩阵、原生选区与版本二次核验、审计并保存。复用受限常量写入（最多200格、JSON 600字符、不运行公式）；可能覆盖选区原公式。UI新按钮尚无真实浏览器/Electron验收。TSV 允许合理的末尾换行、保留空格子。
- Excel AI或手动矩阵写入、单格公式写入核对选区外所有工作表的单元格值及公式；格式修改核对所有单元格值与公式，缓存重算允许变化，不保证全部样式、图表、批注、图片或布局保真。数值比较使用有界精确十进制而非浮点 Number，防止相邻大整数误判；不支持的表结构可能保守拒绝。失败草稿不能通过后续单元格写入覆盖回执。
- 本次源码涉及 desktop/runtime/office-word-format.mjs、office-cells.mjs、desktop/services/office-workspace.mjs、desktop/main/office-windows.mjs、desktop/office-preload.cjs、desktop/src/office/index.html、office.js、desktop/src/shared/office-tsv.js 及相关测试。真实 Linux Kit 合成 DOCX/XLSX、HTTP模型夹具及 openpyxl/python-docx 验证；Office相关最终回归100项、追加Excel专项16项、preload/TSV 2项、打包26项通过。Excel早期组合33项出现一次内核“Unspecified Application Error”，独立公式9项重跑通过，根因未确定；错误日志保留。完整回归未通过：jsdom缺失，离线 npm ci 因 zrender 缓存缺失 ENOTCACHED；无真实模型、Mac、中文输入法或完整UI验收。该检查点未构建离线应用、未发布、未覆盖权威基线，继续综合办公开发。

2026-11-06 后续：Excel 手动写入增加“原样文本”选项，前导零和等号内容通过文本方式写入、不执行公式；生产控制器→模拟DOM/IPC→真实Linux Kit→XLSX/openpyxl通过，错误/形状不符保留草稿，DOM模拟不等于真实界面或Electron验收。Office相关回归105项、Excel与TSV专项19项通过；更完整回归仍因依赖缺失受阻。新增桌面控制器测试及选项，未构建应用。详见 validation/office-comprehensive-regression-2.txt、office-excel-*-fixture.txt、office-excel-literal-tests.txt。

2026-11-06 继续：Excel 使用原有“写入”主按钮执行同尺寸受保护矩阵写入，避免双按钮歧义；原样文本选项保留，生产控制器经模拟DOM/IPC连接真实Linux Kit和openpyxl验证，不等于真实Electron渲染。Word文字修改回执增加未选中文字已直接指定的字号、颜色、底纹、粗斜体、下划线及适用字符的西文字体/东亚字体检查；不覆盖所有继承样式、字体字形、表格/复杂段落及全部版式，内核合理的直接格式重写也可能被保守拒绝。真实Linux Kit保存保留选区外粗体/斜体/字号/颜色，篡改负例拒绝，Word/AI相关27项通过；详见 validation/office-word-unselected-style-tests.txt。30分钟原生稳定性测试仍进行中，本记录不是完整结果。

2026-11-06 后续：Word 选区替换增加对统一直接格式的替换文字校验（已明确设定的字号、颜色、底纹、粗斜体、下划线及适用字体），保留未选内容直接格式校验；混合选区内部格式、继承样式和完整视觉保真不作保证。Word 选区格式操作同样核对图片字节、行内图片引用及尺寸。生产控制器经模拟DOM/IPC调用真实Linux Kit修改Word并由python-docx核对未选粗体；真实UI/Mac/IME未验。Word相关真实/故障回归14项和模拟控制器真实内核1项通过，打包26项通过。30分钟持续回归当时仍在执行，出现1次Excel测试异常“Unterminated template”，此前与其相同现象曾重跑通过，具体原因未明；不能声称稳定性验证通过。完整依赖和原生验收仍受阻，本包为候选检查点。

2026-11-06 草稿失败恢复：Office窗口增加“放弃草稿并关闭”。只允许受信主帧发起，必须存在未保存草稿，主机原生确认后持久审计；拒绝或审计失败保持草稿和已保存文档。确认后关闭内核并清理私有临时目录，若清理失败返回标记、审计并向用户原生提示；关闭期间排队的操作检查会话失效，不能再执行。真实Linux Kit no-op失败草稿、用户拒绝/批准、审计故障、临时目录失败、排队竞争，以及生产控制器模拟DOM/IPC→真实Kit均通过；原生确认/Electron真实界面与Mac未验。修改 desktop/services/office-workspace.mjs、desktop/main/office-windows.mjs、desktop/main.mjs、desktop/office-preload.cjs、desktop/src/office/index.html、office.js 与测试，见 validation/office-discard-*.txt。30分钟稳定性回归进行中，已有一次Excel异常，尚非通过结论。

2026-11-06 后续：放弃草稿时等待办公进程退出后再清理临时文件；若5秒未确认进程停止则不删除目录，报告清理失败并审计，清理失败或用户取消都不影响已保存文档。按钮初始禁用，失败后读取会话脏状态启用。真实Linux Kit、进程未确认退出及模拟IPC/DOM故障测试通过，生产Electron/Mac仍未验收。新增有界原生回归脚本及进程组超时清理测试；112项Office相关回归（当时版本）、追加恢复测试、4项模拟DOM控制器与真实Kit联动、28项打包/诊断脚本测试通过。30分钟稳定性回归尚在运行，已观察Excel错误被Node诊断遮挡及PPT选区取得失败，不能称稳定性通过；测试诊断增强用于后续定位，不等于生产根因修复。

2026-11-06 30分钟稳定性与本轮结果：稳定性脚本在上一工作树上对合成文档依次运行Word、Excel、PPT真实Linux Kit用例，首个完成轮到最后完成轮间1806.76秒，共153轮（各51），5轮失败。第143轮Excel实际失败来自审计测试将随机ID/哈希/时间戳整体字符串搜索“750”的误判；测试现排除随机元数据、仍检查审计内容不含该值。第23/95轮同一测试的原始错误被Node错误格式化遮住，不能认定与第143轮同因；PPT第93/135轮未取得文字选区，第135轮观察到选区几何事件但 selectionType=0、文字为空，原因未定。诊断用例现输出更清晰，单独60轮Excel测试全部通过，但不能称问题根治。测试文件在连续运行中仅增强诊断及修正断言，生产代码未在运行基线中变更；脚本后续增加超时进程组清理，当前30分钟记录未发生超时。原始JSONL及进度、隔离重复/强制诊断、打包日志在 validation/office-stress-30min*、office-excel-* 和 office-30min-*。

本工作树最终Office相关116项通过（真实Linux Kit、HTTP模型夹具、生产控制器模拟DOM/IPC）、打包与稳定性脚本28项通过。Word未选文字/统一选区的已知直接格式回执和行内图片保护、Excel受控矩阵/原样文本与选区外数据保护、原生确认丢弃草稿均已实施；详见本文件前文。原Web/Python保护目录122文件与当前权威0.37.22逐文件SHA一致。完整前端测试仍因缺失jsdom及zrender离线缓存阻断，PPT选区间歇失败、Mac真实安装/签名/IME/付费模型未验；不发布应用或合并，权威保持不变。本源包是综合工作候选，不是完成版。

2026-11-06 综合办公检查点：PPT 文字/格式保存回执新增普通图片源裁剪（a:srcRect 四边）核验：缺省按零处理，非法数值或重复项拒绝，保存后变化拒绝发布并保留原版和未发布草稿。实测 Linux LibreOfficeKit 将测试图片左裁剪 12500 改为 12736、上裁剪 10000 改为 9906；严格检查因此可能阻止带裁剪图片保存，不能称已修复内核差异或实现视觉无损。测试含输入篡改、删除裁剪、格式操作及模拟保存篡改；无 Mac、真实文档、完整 UI 或付费模型验收。修改 desktop/runtime/office-presentation.mjs、desktop/tests/office-presentation.test.mjs。

另一次短时交叉压力测试出现 Excel 两项“Office内核已退出 1 Unspecified Application Error”；原因未知，重新从原始检查点解压独立树运行重复测试，不把偶尔通过当根因修复。完整综合版本、离线包和 GitHub 发布仍未完成，权威来源未覆盖。

PPT相关完整串行回归 30/30 通过，证据见 validation/office-ppt-crop-full-tests.txt。

2026-11-06 综合办公检查点：Excel 单元格常量写入、公式及格式修改复用的 workbookContentsVerifier 新增图片资源 SHA-256 多重集合校验，并逐一检查 drawing 内图片引用的关系存在、内部类型、路径与目标资源存在；输出图片被篡改、删除、新增重复或关系改外链时拒绝发布，受校验草稿无法绕过手动保存。引擎可重命名图片资源；此机制不校验锚点、裁剪、两图片交换、图表、全部样式或视觉保真；不支持的关系可能保守拒绝。真实 Linux LibreOfficeKit 合成带图 XLSX 完成单元格编辑，openpyxl 独立检查；注入篡改输出后原版本保留且手动重试不能绕过。Excel 18 项串行通过，其后新增外链负例并独立通过。修改 desktop/runtime/office-cells.mjs 和 desktop/tests/office-cells.test.mjs。无 Mac、真实 UI/模型或用户文档验收；不发布微版本，未构建新应用，不覆盖权威来源。

2026-11-06 后续 Excel 图片引用保护：保存回执进一步按工作表记录有序图片内容摘要，验证图片仍引用相同资源，防止不同图片互换或跨表变换绕过单纯内容集合核验。未检查图片锚点、裁剪、效果及图表，不等同视觉保真；不同编辑器重新排序对象时可能保守拒绝。真实 Linux LibreOfficeKit 合成含两张不同 PNG 的 XLSX，编辑单元格并用 openpyxl 确认图片仍在；交换图片关系负例拒绝，相关 Excel 18 项全通过。旧文字“未校验两图片交换”已被本条更新覆盖。仍无 Mac 原生、完整UI/模型、用户原件和安装验收；综合开发候选未发布。

2026-11-06 后续 Excel 图片起始锚点保护：在已有逐工作表图片顺序和资源内容核验上，额外比较每张图片起始单元格、起始偏移（或绝对位置）；单元格必须相同，偏移允许最多 720 EMU 取整差。支持一格和两格锚点起点互认，起点移动、过期或非法锚点阻止发布；不检查终点、尺寸、裁剪、旋转、图表或全部视觉效果，可能因内核重新锚定而保守拒绝。实际 Linux LibreOfficeKit 合成两张图 XLSX 写入成功；跨行移动、偏移720/721边界、资源交换/外链/丢失和故障草稿拒绝均通过。Excel完整串行18项、打包脚本28项通过。此前“未检查锚点”由本条精确范围更新。Mac原生、真实模型、用户文档、完整UI/依赖和新离线包未验收；综合办公工作候选未发布。

2026-11-06 后续 Excel 图片尺寸保护：当原图片锚点含明确 ext 尺寸，或两格锚点起止处于同一单元格时，保存后比较可解析宽高，容差720 EMU；有原尺寸但输出无法比较时保守拒绝。原本跨单元格两格锚点的宽高尚不可直接计算，仍只校验起点和内容/引用，不宣称全尺寸保护。实际 Linux Kit 两张图片的写入和缩放/无法比较输出负例通过；Excel全组18项通过。此前“未检查任何尺寸”由本条有界范围更新。Mac、真实文档、UI、模型和安装未验收；未发布候选。

2026-11-06 后续 Excel 跨单元格终点：原文件与结果均为两格锚点时，额外核对终点行列与偏移（720 EMU 容差）；原终点无法与输出端点或可比较宽高对应时保守拒绝。合成跨格终点篡改负例及 Excel 全组18项通过。另一个真实 Linux Kit 跨格样例把原终点 (col4,row5,0,0) 输出为 (col3,row4,611280,190080)，当前拒绝；这些表示是否在该文件中视觉等价需结合列宽和行高进一步验证，不能称已修复或支持所有跨格图片。修改 desktop/runtime/office-cells.mjs、desktop/tests/office-cells.test.mjs；完整 UI、Mac、真实模型和原文档未验收，未发布候选。

2026-11-06 后续 Excel 图片裁剪保护：校验每个工作表图片源裁剪 a:srcRect 四边（缺省为零），变化、重复或非法数值拒绝发布；真实 Linux Kit 未裁剪图片写入、输出注入裁剪负例及 Excel 全组18项通过。未验证所有复杂裁剪、旋转、效果、图表及实际文件保真；Linux 与 Mac 可能转换裁剪参数，当前严格策略可能保守拒绝。命令队列14项通过（包含真实Node子进程）；浏览器运行时测试因缺 jsdom 无法启动，不能视作通过。修改 desktop/runtime/office-cells.mjs、desktop/tests/office-cells.test.mjs；未构建安装包、未发布，Mac/真实模型/完整UI/用户原件仍未验收。

补充：最终 Excel 全组 18 项重新通过；裁剪非法数值和重复属性的负例通过。

2026-11-06 验证补记：最终候选 Word/PPT/Excel 组合串行 56 项通过，命令队列 14 项通过、打包脚本 28 项通过；浏览器测试因缺 jsdom 未启动。另对本轮较早、独立冻结的源码树循环执行真实 Linux Kit Word/Excel/PPT 测试，111轮无失败后在1694.7秒主动结束，未达到30分钟压力测试，且该树早于最终图片锚点/尺寸/裁剪修改，不能作为最终代码30分钟稳定性结论。先前非隔离短测出现2项内核异常退出，根因未确定。Mac/真实模型/用户原件/完整UI和新离线应用未验收。

2026-11-11 内部候选：Excel 文字或单元格编辑保存的图片校验增加 OOXML 图片旋转和水平/垂直翻转对比；缺省属性按零旋转和未翻转处理，属性非法或变化则拒绝发布，避免其他编辑导致图片方向变化。真实 Linux LibreOfficeKit 带图表格编辑保存通过，输出 XML 变换篡改、非法参数和合成原始旋转比较等负例通过；未对真实旋转图片在 Mac 上往返验收，复杂图片效果和位置仍有限。修改 desktop/runtime/office-cells.mjs 与 desktop/tests/office-cells.test.mjs；Office 相关 56 项和打包边界 28 项通过（日志在 docs/validation/office-image-transform-20261111-*）。模型语义、原生审批及 IPC 有夹具；完整 UI、真实模型、Mac/Gatekeeper 未验。本源码为候选，尚未生成本轮 Apple arm64 包及 GitHub 发布。
