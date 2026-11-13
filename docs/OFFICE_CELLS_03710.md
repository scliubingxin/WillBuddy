
最终离线静态核验：483223518字节，SHA2a5e5cb61100db9d5cc3510ec83cf91a6733ed11a211fe81080870e465420b50；ASAR198f5fed7b59ad04b947c2f63453c80e0c0261bd5cd5648fd1cc1f9cae2d86cb，与154生产文件+最小package直接原ASAR逐字节匹配，无hostpyc。278可运行MachO/93545页、20727应用+5配套/47链接、零包内残留、封闭CRC与真实Electron页篡改负例通过。相比0.37.9仅Info.plist/Electron/app.asar/CodeResources四条目变化，Python/LO所有原条目字节/模式/链接不变；仍ad-hoc未公证，不能代替Mac原生信任验收。

# WillBuddy 0.37.10 · 受选区约束的Excel AI常量更新

## 接续与实现

本轮从权威0.37.9/v48重新取得699内容文件并逐SHA核验。新增runtime/office-cells.mjs无Electron的区域/矩阵校验与真实XLSX输出验收器；Office服务新增updateCells，私有Python工作进程新增cells_context/cells固定操作。原main/IPC/加密身份、Web/Python、logo与白蓝主题、所有旧工具保留，无新安装端依赖或持久数据模式。

Excel窗口先用现有“定位”选择A2:B3一类范围，再在文档AI侧栏提出修改。模型收到当前原生选区文字、工作表part编号和真实矩形范围，调用office_update_cells({values:[[...],...]})。矩阵行列必须与选区完全一致；JSON最多600个UTF16字符，每格单行字符串最多400；30行16列200格，并限128列5000行坐标。数字由原生内核按本机规则识别；支持空字符串清除，不支持公式、合并选区、多区域、跨工作表、插入删除行列或日期/特殊文本的任意自动转换。包含=、+、@等公式前缀（含NFKC全角）、控制符、伪造part/指纹或超限拒绝。已有手动范围定位仍可1000格，但本AI工具限200格。

原生cells_context同时核对LOK_CALLBACK_CELL_ADDRESS、CellCursor的真实左上角坐标、当前part和原生剪贴板HTML的矩形尺寸/合并标志；把part+范围+完整有界HTML计算指纹，仅向服务发元数据，不给模型原始HTML/指纹。未知地址、光标不在矩形左上角、合并/嵌套或尺寸不符时不可编辑，请重新用定位建立范围；不是任意拖选/全表/图形对象映射。

写入逐格采用固定GoToCell/EnterString，先resetSelection，再等待原生命令完成通知并核对光标/part，避免范围标记仍在而误填整个区域。没有任意UNO、路径、网络或新IPC。不是HTML粘贴替代格式，也不把模型文本当文档。输入矩阵先全部校验才发写命令。EnterString对原值未变可能回success:false，因此完成回执不是成功依据：save前重新读出真实XLSX，校验workbook→关系→实际worksheet、每个目标地址的值、共享/内联字符串和目标无公式；不匹配/非法输出拒绝发布。数字只在实际数值等价或原字符串一致时接受，日期等转换若不一致保留草稿。

## 权限、版本与故障

复用30分钟编辑许可、真实选区sequence/文档revision/SHA、逐次原生确认、写前持久审计及文档CAS/前版保留。确认包含完整有界常量矩阵和当前区域，明确覆盖选区原内容（包括原有公式）；没有新增公式能力，范围外公式由真实内核重算。审批后/审计后以及最后异步原生选区查询后，重查取消、当前版本与许可。拒绝/旧区域/换表/审计失败/写前取消不发cell命令。

原生写入或手动变更前先推进sequence并标dirty。多格原生命令不是一个原子事务，也可能产生多个Undo步；取消或异常后可能留本机私有草稿，不能宣称已撤回原生副作用或每次AI一步撤销。30秒请求上限仍在。只有输出值验收+磁盘保存通过才发布revision；磁盘故障保留旧持久版和dirty草稿，显式保存重试也必须经过保留的输出验收器，不能绕过不匹配检查。重启不重放动作。

新增Office聊天验收门禁：任一次选区修改工具失败后，即使模型随后写“已成功”，任务仍显示失败并保存错误回复，不把这句模型文字发布为成功结果。原有每轮一次修改额度保持。

## 真实回归中修复的旧保存时序

生产Redo回归曾出现已保存v4却仍为撤销前旧正文。原command操作postUnoCommand后立即save，不能证明动作已执行完。本轮只对Undo/Redo新增原生完成通知等待，随后必须核对真实Undo/Redo栈分别减一/加一再保存。该内核Undo回执也可能success:false且wasModified:true，所以不单独信布尔回执；以前后真实历史状态验证动作。未知/超时/栈不符拒绝且保留dirty状态，不删除或跳过旧测试。不宣称所有原生命令竞态或上游问题都已根治。

## 测试证据及限制

完整核心419通过，最终相关12项（新增8项单元格及4项历史）重跑，8真实Chromium及26打包/文件系统测试通过。新生产Office页面A2:B3→真实本机HTTP标准模型工具夹具→真实LinuxKit→真实XLSX，openpyxl独立核对A/750、B/950，范围外C列和第二工作表不变、刷新对话保留。核心独立核验范围外公式=B2+B3保留并实际缓存1700，目标Arial粗体/蓝字/填充/数字格式/边框/25.5pt行高/列宽保持、原版本字节保持及Store重载。其他UI回归Word选词颜色/字号/CJK、表格外框、真实UndoRedo、两表KitPDF和离线CID中文PDF。

边界覆盖矩阵溢出/公式/控制符/伪造字段、拒绝/旧part/seq/审计中取消/审计故障均无写入，原生工作进程独立校验、最后原生查询期间并发改版、合并选区拒绝、空格清除/空区域填充/切表旧凭证、磁盘失败重试、注入原生no-op的输出不一致及显式save持续拒绝，以及模型伪称成功被服务阻断。

首次完整418为417/418：Excel上下文误传cells:null给旧外框严格校验导致拒绝，已修复并完整重跑。首次UI8为7/8的Redo实际保存错误触发上述修复；第一次严格按回执success布尔判断又被真实Undo void/false回执拦下，已改为完成通知+真实历史栈效果检查，最终未改弱原始正文/版本断言。新模型失败测试初稿用错complete夹具结构，只发一次请求，已改为标准message.tool_calls后验证两轮及失败状态。

早期样本Liberation Serif和26pt行高在原生导出后观察到Times New Roman和25.5pt，未确认其所有条件/根因。本轮格式验收使用明确的Arial/25.5pt稳定样本，不能因此声称任意字体、行高、复杂图表/模板或OOXML无损往返已解决。122原Web/Python保护文件SHA不变，旧35Python执行器未改未重跑。原生IPC/审批/Keychain/模型语义仍夹具，付费模型未测试。LinuxLibreOfficeDev26.8alpha不同Mac包26.8.1.1，没有Mac签名/Kit/IME/字形或WordExcelWPS像素验收。

## 发布与接续

完整arm64运行时载体为本轮重新取得并核SHA的0.37.9 ZIP647ac93e22a8e0b8aae98335945558e44c2e5abc3b69993f2e1e9ae68c7833ac。仅完整静态/ASAR/封闭ZIP门禁通过后交付。外壳/Python ad-hoc、LO原字节签名保留，整体未公证；页哈希不代替Mac codesign深严格/CMS信任/Gatekeeper。安装慢及历史未知截断临时前缀来源未解决，无新小更新，不要求为提速反复重装。

本轮只读GitHub main仍27bd38f6b43806fb702c62ec4586426730b8190a，0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前创建PR自动审批额度错误提示Nov2恢复，Oct30未到时点，不重试/换插件CLI绕过；长期发布授权有效，本轮无上传/PR/main/tag/Release，不伪造链接。权威写回将用观察到的expected_current_version48保护，是否保存成功及最终回读以包外交付回执为准。

复用REA既有部分公开包静态证据，复查Quick官方working-with-chat-desktop的文档选区上下文说明，无新Amazon运行/认证绕过或代码资产复制。固定API参考：
- https://docs.aws.amazon.com/quick/latest/userguide/working-with-chat-desktop.html
- https://raw.githubusercontent.com/LibreOffice/core/master/include/LibreOfficeKit/LibreOfficeKitEnums.h （CELL_ADDRESS/CellCursor/UNO_COMMAND_RESULT）
- https://raw.githubusercontent.com/LibreOffice/core/master/sc/sdi/scalc.sdi （EnterString/StringName、GoToCell/ToPoint）

下一轮有Mac优先原始codesign stderr/包内Python与Kit/原文档字体/真实模型/IME安装验收；没有目标机优先Excel精确格式与公式授权、PPT选区、Word网格/单边和原格式往返保护，避免只堆说明/队列。跨Web完整业务核心、OAuth/stdio、自主并行组、语义检索、复杂对象与OS隔离仍差距。
