## 0.37.61 M4 源码检查点

仅用于开发接续，未生成本版 Apple 芯片安装包或 GitHub Release；旧 0.37.32 安装候选与本版源码不匹配、未公证和未 Mac 验收。

## 0.37.60 M4 内部源码检查点

仅供开发接续；未生成对应 Apple 芯片安装包或公开发布。旧 0.37.32 应用不包含后续 M4 增量，ad-hoc 未公证、Mac 未验收，不要求反复安装。源码包未包含 WASM OCR 的七项运行资产，不能直接启用该实验引擎。

## 0.37.55 内部检查点

仅供开发接续；本轮无Apple安装包或公开发布，M4未完成。

## 0.37.54 内部检查点

供开发接续；本轮未生成 Apple 安装包或公开发布，M4 未完成。

## 0.37.53 内部检查点

仅供开发验证；本轮没有新 Apple 安装包或公开发布，M4 未完成。

## 0.37.52 内部检查点

源码检查点仅供开发验证；无本轮 Apple 安装包及公开发布。M4 未完成。

## 0.37.51 内部源码检查点

本轮强化多工具调用安全检查，未构建新的 Apple 芯片安装包，Mac 运行与公证未验收。

## 0.37.50 内部源码检查点

PDF 附件识别显示当前页；无新安装包，Mac 原生 UI、中文 OCR 和签名尚未验收。M4 未完成。

## 0.37.49 内部源码检查点

增加 PDF 识别停止，不提供新的安装包；不建议把内部检查点作为已验收正式版。M4 未完成，Mac 运行、中文 OCR、签名与公证未验收。

## 0.37.48 内部源码检查点

PDF附件OCR支持指定页范围，Mac OCR和中文依赖尚未内置，本包不是M4完成版或可安装发布版。

## 0.37.47 内部源码检查点

新增PDF附件本机识别候选；未包含Mac OCR/PDF/中文数据，不是M4或可安装发布版。

## 0.37.46 内部检查点

源码用于继续开发，不是完整M4或可安装发布版；原PDF页码证据经Linux英文OCR夹具验证，Mac中文OCR、真实模型及原生界面仍需验收。

## 2026-11-02 · 0.37.19 PPT选中文字字号与字色

## 2026-11-04 · 0.37.22 PPT选区手动编辑

用户实测反馈字体恢复；沿用0.37.21字体配置。PPT新增选中文字后载入编辑框、修改、保存和取消路径，绑定原生选区及sequence，写前持久审计，保存时校验文本与既有直接格式；迟到选区、审计失败和错误输出不发布。仅唯一普通单段文字选区，不是完整PPT编辑器；真实Mac原文档尚未验收。见docs/PPT_MANUAL_EDIT_03722.md。


## 0.37.21 中文字体候选

Office Kit 进程在 macOS 使用独立 Fontconfig 文件，读取系统、公共、用户及 LibreOffice 自带字体目录，缓存放在私有任务目录，不修改应用签名包或文档。编辑与 PDF 预览共用该进程。Linux 字体配置及真实引擎测试支持该方案；尚未在 Apple 芯片 Mac 或用户原文档验收，不能承诺已解决 Mac 方框。详细证据与局限见 docs/MAC_FONT_CANDIDATE_03721.md。


## 2026-11-04 · 0.37.20 视口滚动与受限文件搜索

Office 画布增加纵向滚轮与可拖动滚动条，切页归顶并按内核视口坐标映射点击；帮助文字折叠，避免固定栏遮住文档。已授权目录内的系统 find 仅允许明确的只读表达式自动执行，保留审计；Shell、删除、未知命令仍逐次审批，不能以“非删除”假设安全。Mac 的中文方框和预览缺字尚未定位或验收。见 docs/OFFICE_VIEWPORT_AND_CLI_03720.md。


新增 office_format_presentation，标准模型工具循环实际设置当前唯一普通单段文本框同格式选区的字号/字色，不改文字。无Electron核心复用逐字输出验收，主机与worker双层固定参数/页面选区守卫，逐次批准/持久审计/取消/CAS和每请求一次修改额度保持；未实际修改或格式不符不提交，手动保存不能绕验收。详见[实现与验证](PPT_DIRECT_FORMAT_03719.md)及validation/v0.37.19。Mac/付费模型/IME/原生签名未验收，安装慢未解决。GitHub历史审批额度提示Nov2 07:24恢复，本轮凌晨未到时点不重试或换路线；长期发布授权有效。下一轮Mac优先，否则受控PPT编辑或选区上下文，持续办公目标未完成。

## 0.37.18 · 候选下载与验收范围

PPT选词替换增加真实输出直接格式核验；混合/复杂目标预先拒绝，错误输出不能发布或手动绕过。完整源码与Apple arm64离线应用以本轮最终交付链接为准，保存结果见包外交付回执；不是GitHub已发布声明。安装端不要求npm/pip，包内Python/LibreOffice保持。应用ad-hoc未公证、无Mac真机/IME/付费模型验收，安装慢未根治，不要求为提速重装。详见[实现与验证](PPT_FORMAT_RECEIPT_03718.md)。GitHub此前自动审批额度提示11月2日恢复，当前不提前重试或绕过。

## 0.37.17 · 候选下载与验收状态

Word整表可仅设置指定外边，保留其他外边和内部网格；自动重载会清空原生撤销栈，历史版本保留。范围限唯一完整未合并正文表。完整源码与Apple arm64离线包以本轮最终交付链接为准，保存状态见包外最终回执；不是GitHub已发布声明。离线运行时包含Python/LibreOffice，无安装端npm/pip；ad-hoc未公证、未Mac真机验收，安装耗时未根治，不建议为提速反复重装。详见[实现与验证](OFFICE_PERIMETER_03717.md)。GitHub此前自动审批额度提示11月2日恢复，当前未到时点，不提前重试或绕过。

## 2026-11-01 · 0.37.16 Word完整表格全部网格

新增office_table_grid与无Electron的OOXML核心：仅整个Word包唯一正文顶层表格的完整选区，设置全部实线含内横/竖线；保留文字、直接格式、padding和非目标部件。候选经真实Kit预加载/画面与全部件SHA核验后CAS提交，在同一session自动换worker，审批明示清空原生Undo/Redo栈、前版保留。初始化/候选漂移/拒绝/取消/审计/磁盘失败保留旧版，文档服务新增提交guard支持关闭期间写前写后检查/回滚。不是失败UNO网格原型换名放行；多表、部分、合并、嵌套和复杂目标保守拒绝。详见[实现与验收](OFFICE_TABLE_GRID_03716.md)和validation/v0.37.16。保留原Web/Python、白蓝logo、旧身份及所有旧能力。Mac/付费模型/IME/原生签名和复杂Office保真仍待验收，安装慢未解决，GitHub额度提示Nov2当前不绕过，长期发布授权保留。下一轮Mac优先，否则受控单边或PPT复杂文字保护，不只加说明队列。

## 2026-11-01 · 0.37.15 Word格式完成与成品验收

Word格式工具等待固定原生命令完成通知，新增无Electron的DOCX核验核心：选区唯一对应正文连续纯文字段落，检查全部正文/页眉页脚段落文字保持，并逐片段验证请求的西文/东亚字体、字号、字色与底纹，允许原生拆run。原生未执行/部分执行/缺属性均不能发布；调用前保留dirty和验收器，手动save不能绕过，最后异步查询后再检查取消/版本，worker独立核expectedSelection。跨段全选旧能力保留，复杂/歧义选区保守拒绝，非全OOXML/字形保真。首轮错误与复测见[实现与验收](OFFICE_WORD_RECEIPT_03715.md)及validation/v0.37.15。保留原Web/Python122文件、白蓝logo和旧身份。Mac/付费模型/IME、签名安装、安装速度仍未验收或未解决；GitHub此前额度提示Nov2，不重试或换路线，长期发布授权保留。下一轮Mac优先，否则Word网格/单边或复杂PPT文字保护；不只写介绍队列。

## 2026-10-31 · 0.37.14 Excel原生单格受控公式

新增office_set_formula，单格同表算术/七函数数值结果，复用既有AST/依赖核心与原生受控定位写入；保存前核验全工作簿数据/公式及全部公式缓存，保留审批/审计/CAS/一次修改额度/错误阻断和草稿验收重试。独立布尔/文本、外链、跨表、循环、错误、共享数组/图表/合并等拒绝。没有放开常量或通用粘贴公式。449核心完整串行/9新增公式/11最终Chromium/26打包通过。首轮CJK UI失误复测通过但根因未知，保留失败记录，不称稳定性已修。详见[实现与验收](OFFICE_NATIVE_FORMULA_03714.md)。Mac/付费模型/IME未验收、未公证，安装慢未解决；GitHub额度提示Nov2不绕过，长期授权保留。下一轮Mac优先，否则Word网格或PPT复杂文字；不只改说明队列。

## 2026-10-31 · 0.37.13 PPT精确文字选区与替换

PPT普通单段文本框双击/全选后可用固定方向键与Shift精确选词；现有office_replace_selection绑定真实文字类型/页面/sequence，审批与持久审计后再检查，保存前核验真实PPTX所有页形状顺序/类型和段落文字，只允许唯一目标子串变化。重复词、分组/表格/域/链接/多段拒绝；no-op与显式保存重试受同一验收器保护。440核心完整串行/10真实Chromium/26打包通过。见[实现与验收](OFFICE_PPT_SELECTION_03713.md)。不是完整对象/格式无损/IME；Mac和付费模型未验收。保留旧能力与Web/Python、白蓝logo/旧身份，安装慢未解决。GitHub额度提示Nov2，未重试或绕过，长期授权保留。下一轮Mac优先，否则Word网格/受控公式或PPT复杂文字。


## 2026-10-31 · 0.37.12 Excel选区真实格式

新增office_format_cells，真实内核修改当前矩形的字号/字色/底色；保存前核验XLSX目标样式及全工作簿单元格数据/公式不变，精确十进制比较，主题tint/条件格式/目标富文本/共享数组公式保守拒绝。原生范围/审批/持久审计/CAS/输出失败草稿重试保护保持，checkCells供新旧工具共用。433核心/最终9格式/9Chromium/26打包通过。见[实现与验收](OFFICE_CELL_FORMAT_03712.md)。Mac/付费模型/IME未验收，ad-hoc未公证、安装慢和复杂保真未解决。GitHub仍受Nov2恢复的审批额度阻塞，本轮不绕过、未上传PR合并发布；长期授权有效。下一轮Mac优先，否则PPT选区/Word网格/受控公式。

## 2026-10-31 · 0.37.11 Excel原样文本常量

现有office_update_cells新增显式{text:...}，真实原生写入和XLSX字符串类型/精确值核验，保留前导零/日期样式/公式样式文字；普通字符串规则保留，不能执行公式。完整矩阵预检/审批/审计/CAS和失败草稿重试保护沿用。首次空文本被原生写成单引号已被核验拦截并修正，不降低非空类型断言。见[实现与验收](OFFICE_LITERAL_TEXT_03711.md)及validation/v0.37.11记录。原Web/Python、白蓝logo和旧身份不变。Mac/付费模型/IME未验收、ad-hoc未公证、安装慢未解决；GitHub额度提示Nov2，当前不绕过、未新发布。下一轮先Mac或Excel精确格式/PPT选区。

最终离线静态核验：483223518字节，SHA2a5e5cb61100db9d5cc3510ec83cf91a6733ed11a211fe81080870e465420b50；ASAR198f5fed7b59ad04b947c2f63453c80e0c0261bd5cd5648fd1cc1f9cae2d86cb，与154生产文件+最小package直接原ASAR逐字节匹配，无hostpyc。278可运行MachO/93545页、20727应用+5配套/47链接、零包内残留、封闭CRC与真实Electron页篡改负例通过。相比0.37.9仅Info.plist/Electron/app.asar/CodeResources四条目变化，Python/LO所有原条目字节/模式/链接不变；仍ad-hoc未公证，不能代替Mac原生信任验收。

## 2026-10-30 · 0.37.10 真实Excel选区常量更新

新增office_update_cells，绑定原生part/地址/光标/HTML矩形指纹，强制同尺寸单行常量矩阵，逐次审批/审计/CAS与真实XLSX输出验收；通用AI粘贴不再可扩展Excel选区。真实HTTP模型夹具→LinuxKit→独立openpyxl核验区域/样式/范围外公式重算；原生no-op或错误输出无法经显式save绕过，模型“成功”不能覆盖工具失败。修复真实Redo用例暴露的保存先于动作完成时序，以原生通知+真实历史栈状态验证后保存。419核心/最终12相关/8Chromium/26打包通过。Mac/付费模型/IME未验收，原生字体行高规范化仍有边界，ad-hoc未公证，安装耗时未解决。详见[实现及验收](OFFICE_CELLS_03710.md)。GitHub额度提示Nov2恢复，当前未重试，无上传/PR/main/Release。保存以最终交付回执为准。


最终静态构建：483219407字节，SHA647ac93e22a8e0b8aae98335945558e44c2e5abc3b69993f2e1e9ae68c7833ac；ASAR866ef2b82745337fc8e1be485289fa91ed51d2de840a1969ea1ba6a31e563a75。ASAR原始目录闭合并逐项直接extractFile核对153生产文件+最小package字节一致、无hostpyc；278可运行MachO93545页/20727应用+5配套/47链接/零包内残留/闭合CRC，真实Electron页篡改负例被拒。与0.37.8仅四个签名应用条目变化，Python/LO所有原条目字节/模式/链接不变。

解出ASAR到工作区的副本另出现未在原ASAR目录中的src/pdf/.engine.js.kzUlkt，2097152字节，恰为engine.js前缀；来源进程未知。此解出目录的闭合检查失败并保留现场，未删除后重算清单。改为直接读取已签ASAR目录和每项extractFile字节，确认原ASAR本身无该条目且与生产源码精确匹配；这是验证原交付字节，不是放行含临时文件的归档。不能称历史临时前缀来源根因已修复。Mac签名和安装耗时仍无新结论。

## 2026-10-30 · 0.37.9 精确选区文字与背景颜色

新增office_format_selection的fontColor/backgroundColor，固定原生Word选区颜色/字符底纹，两层RGB参数校验，保留原生审批/审计/CAS/单次额度；精确TARGET生产UI→实际HTTP模型夹具→真实LinuxKit→独立DOCX只改选词验证，411核心/7Chromium/26打包通过。网格原型独立DOCX断言未达到指定颜色/线宽，已撤回，外框仍清内部线。Mac/真实付费模型/IME/安装速度未验收或未解决，ad-hoc未公证。详见[实现与验收](OFFICE_SELECTION_COLORS_0379.md)。下一轮Mac真实链路或Word网格/单边与ExcelPPT受控编辑。GitHub审批额度提示Nov2恢复，当前不绕过，无新上传/PR/main/Release。


最终离线核验：483219295字节，SHA4728e067d4ddf214c5d49edbffdfc16e5ef3d52e1b7afa38ced380b47cc6048b；ASAR6b1044e93f341ec8e28e32f84cf504aeec91233549e43cfb9b8e12d4744cf131与153生产文件及最小package逐字节一致，无hostpyc；278可运行MachO/93545代码页，20727应用条目+5配套/47链接，零残留/闭合CRC/实际Electron页篡改负例通过。相比0.37.7载体仅Info.plist/Electron/app.asar/CodeResources四条目改变，Python/LO原字节/模式/链接不变。407核心/6Chromium/26打包通过后生成完整源码；权威替换将使用本轮观察的expected_current_version=46保护，是否保存和远端回读成功以包外最终回执为准，不预写成功。GitHub仍无本轮上传/PR/main/Release。

## 2026-10-30 · 0.37.8 复用Office内核导出PDF

安装版预览与编辑共用Kit运行时，固定PDF导出、启动/在途取消及回读版本守卫；407核心/6真实Chromium/26打包通过。原CLI三格式测试本轮重新通过，历史卡住根因未定位，不宣称根治。Mac签名/字体/IME/真实模型未验收，ad-hoc未公证，安装耗时未解决；跨Web核心/OAuth/stdio/自主并行与完整Office仍差距。详见[实现及验收](OFFICE_PDF_RUNTIME_0378.md)。GitHub此前审批额度提示Nov2恢复，当前未到时点，无新上传/PR/main/Release，不绕过；保存状态以最终交付为准。

> 0.37.7为候选：完整核心399/400，XLSX原生CLI PDF转换超时未过；新增键盘选区与静态arm64包检查通过，正式基线仍0.37.6。见[验证状态](validation/v0.37.7.json)。

## 2026-10-30 · 0.37.7 Word键盘选区

Word画布固定方向/Home/End+Shift/Ctrl，导航推进选区sequence但不创建文档revision；真实精准词选区→既有模型工具→独立DOCX校验。不是完整键盘/IME或Mac验收；完整网格边框、跨Web核心/OAuth/stdio/自主并行仍差距。详见[实现与验证](OFFICE_KEYBOARD_SELECTION_0377.md)。GitHub此前审批额度故障未到恢复时点，本轮不绕过，无新PR/main/Release；安装耗时未解决。


最终arm64离线ZIP483218125字节，SHA e3b239241f2e8173c33df46c88dd7514a931d827d8134f041e2e74445a0ad352；ASAR a5fd8419a48c8a049afc1f40ed5c5ae3ecf1a5b89238949663155d88fc9e28ae与151生产文件+最小package逐字节一致。278MachO/93545页、20727应用+5配套/47链接、零残留/闭合CRC/真实Electron代码页篡改负例通过。与0.37.5仅Info.plist/Electron/app.asar/CodeResources四条目变更，全部Python/LO原字节模式链接保持。初次构建在新增最后异步查询后并发保护之前生成，不作为交付；最终新私有目录重建并重跑395核心/3Chromium。仍ad-hoc未公证，无Mac codesign深严格/Gatekeeper/原生启动与安装性能结论；无新小更新。源码/权威保存回读按最终包外回执记录，本文为构建时快照。

## 2026-10-29 · 0.37.6

Word真实表格选区外框样式工具已实现：颜色/线宽/显式内边距，清内部线；不是全部网格线，合并/嵌套/超限选区拒绝。395核心/3Chromium/26打包通过，详见[验收说明](OFFICE_TABLE_OUTLINE_0376.md)。Mac原生签名/字体/IME/付费模型与安装耗时未验收，发布仍受此前审批服务额度故障阻塞。Quick/REA仅复用公开文档与旧静态证据。


最终离线构建：483216299字节，SHA256 1aba94bb84cdc4c2d3688eba1d7c5a69538c2475c9088c32a0c47ee87c1a9baf；ASAR70c1d2a67b83380b8a585c7c3a864a8a3759b9baddf6ee6a10096a47f36febe4与150生产文件及最小package逐字节一致。278可运行MachO/93545代码页、20727应用条目+5配套、47链接、闭合CRC/零残留和实际Electron页篡改负例通过。与0.37.4仅Info.plist/Electron/app.asar/CodeResources四条目不同，Python/LO全部原字节/模式/链接保留；内置依赖安装端不需npm/pip。本轮完整构建通过，仍ad-hoc未公证、无Mac深严格资源密封/Gatekeeper/安装运行结论；不是安装提速或历史异常临时副本根因已解决，没有新小更新。源码/权威保存与回读按包外最终结果记录；本文件是构建时快照。

## 2026-10-29 · 0.37.5

真实内核撤销/重做计数与执行前双重检查、生产按钮禁用/步数、失败草稿显式保存重试已实现。389核心/2Chromium/26打包通过，详见[验收说明](OFFICE_HISTORY_0375.md)。仍无Mac原生签名/IME/字体显示验收，安装耗时与临时副本根因未解决；REA复用旧静态证据。发布受此前审批额度故障阻塞，未PR/main/Release；保存下载结果以最终交付为准。


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

重新验证：379项核心测试、3条真实Chromium、20项打包/更新器测试通过；之前环境丢失候选的测试不复用。真实LinuxLibreOfficeKit画布手改v2、真实HTTP模型夹具选区修改v3与落盘历史、保存中/失败重试/已是当前版本确认、Enter/ShiftEnter/组合输入、普通资料原生审批0次均通过。IPC/审批/模型语义仍夹具，Mac原生运行未验收；本机LODev26.8alpha与Mac内置26.8.1.1不同。打包进行中。字体/字号/表格边框AI修改、撤销重做状态、Finder打开方式和原生LO欢迎页品牌、原生Kit中文方框仍待做，不能用PDF.js修复替代。最新私有截图仅作为需求，不入源码。下一步测试生产Office窗口保存/回车/权限/故障及真实Kit写入，再打包保存和GitHub分支PR/main/Release；Mac实际签名/安装/字体/IME仍需原生环境。

仅已装0.37.0可选择小更新候选ZIP，只包含4个变更应用文件，8个文件解压。Mac原生APFS/codesign未验收，不兼容旧版或不支持克隆时停止，请使用完整包。

## 0.37.1 编辑入口和中文预览修复

修复officeOpen遗漏preload造成的编辑报错，内置PDF中文映射和标准字体数据，分页状态统一WillBuddy Office。同盘安装减少第二次全量复制；全量ZIP解压/增量更新尚未解决。377核心/5相关Chromium/17打包通过，Mac原生与截图原文件仍待验收。见[截图修复范围](SCREENSHOT_FIXES_0371.md)。0.37已PR10合并main并发布；本版构建时发布待执行，以Release为准。

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

最终验证：453核心完整串行、19相关、12生产Chromium、26打包通过；158生产文件+最小package与ASARc078da2c71580d5d9f4ef18fbff5d5f61a774d024baa5fdc9111a7ba201ae447逐字节一致。离线483236512字节，SHAa516de81b28d37ebff5dae6d70cf304ac9fa6190b958da8776bf1e2f7c42dfc1；278可运行MachO/93545代码页、20727应用+5配套/47链接，零残留/封闭CRC/真实Electron页篡改拒绝；只四签名应用条目变化，Python/LO字节模式链接全部不变。静态页哈希不代替Mac deepstrictcodesign/CMS/Gatekeeper；ad-hoc未公证。保存和远端回读成功以包外交付回执为准，不预写成功。


最终验证：462核心完整串行/9新增网格/13生产Chromium/26打包通过，159生产文件+最小package与ASARacd017227bc5170424b86959ca3e1989fa029ffe381af5c6855d853602f0241e逐字节一致，无hostpyc。最终r4离线483239961字节，SHA7edba54d9cfca6cd29284a8b0ce35fa182cbaaf1ddeb29be685037208546a181；构建完整汇总与独立最终ZIP重核278MachO/93545代码页、20727应用+5配套/47链接、零残留封闭CRC/Electron页篡改拒绝全部通过，只四个签名应用条目改变，Python/LO字节模式链接未变。早期构建在部件范围检查完成前被替换，不交付。外壳/Python ad-hoc、LO原签名保留，整体未公证，无Mac原生信任或运行结论。保存和远端回读结果以包外最终交付回执为准。


2026-11-05 · 0.37.23 候选：模型调用轮数 1–96 可在模型配置中设置，保留旧智能体默认；添加模型保存错误可见并返回列表。完整回归因离线依赖 jsdom 缺失未通过，真实 Mac/付费模型和新版离线包未验收；详情 docs/MODEL_ROUNDS_03723.md。下轮先恢复依赖后执行完整回归及 UI，核对并完成 0.37.22/后续 GitHub 发布。

2026-11-05 · 0.37.24 候选：旧模型设置暂存、失败回滚与串行保存；模型/智能体/CLI 44 项、打包边界 26 项通过。缺 jsdom，完整 UI 和完整回归未完成，无本版 arm64 构建/正式发布；见 docs/MODEL_SETTINGS_TRANSACTION_03724.md。

2026-11-05 · 0.37.25 候选：增加 Office 文件通过原生保存对话框导出 PDF，真实 Linux LibreOffice PPTX 导出及取消/版本/SHA 边界验证；46 定向、26 打包测试通过。UI/完整回归和 Mac 构建未完成；见 docs/OFFICE_PDF_EXPORT_03725.md。下一轮推进文档直接编辑及完整回归、签名构建和 GitHub 发布。

2026-11-05 · 0.37.26 候选：工作区 PDF 导出及最终发布前版本检查，拒绝无 EOF 截断 PDF；47 定向和 26 打包测试通过。完整回归/UI/Mac/离线构建未完成，见 docs/OFFICE_PDF_EXPORT_GUARDS_03726.md。下一轮优先文档内选择与编辑、完整回归和已授权 GitHub 发布。

0.37.57 为内部M4源码检查点，不是已发布的Mac安装版本；尚无Mac系统验证。

0.37.58 为内部M4源码检查点，未形成新Mac安装包或公开版本。

2026-11-14：0.37.59 为源码检查点，无同版安装包；0.37.32 是较旧的 Apple ARM64 安装候选，不含后续 M4 OCR 与向量改动。

2026-11-14：0.37.60-wip.1 为内部工作检查点，无对应的Mac应用。

2026-11-14：0.37.60-wip.2 是内部源码检查点；WASM二进制/训练数据未随包，尚无匹配Mac应用。

2026-11-14：0.37.60-wip.3 不包含WASM二进制和语言数据，无对应安装包。
