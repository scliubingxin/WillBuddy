# WillBuddy 0.37.12 · Excel选区格式与保存验收

## 实际变化

从权威0.37.11/v50重新取得并逐SHA核验722内容文件。本轮新增无Electron的runtime/office-cell-format.mjs，Office服务formatCells和标准模型工具office_format_cells，私有Python worker新增固定cells_format操作。现有“定位”建立真实矩形后，文档AI可修改fontSize（6–96pt/半点）、fontColor和backgroundColor（严格#RRGGBB）。可单项或组合设置，不替换数据或公式，没有新增手工格式工具栏或PPT格式能力。

复用cellSelection的真实范围校验；将原updateCells的选区检查提取为共享checkCells，两个工具都在审批前后、持久审计后核验part/ref/HTML指纹/原生光标、selection/sequence、文档revision/SHA、取消和30分钟许可。新的最后异步查询后也再次检查sequence/取消/当前版本，不能用旧范围批准覆盖新文档。模型及worker均拒绝额外命令；只调用固定FontHeight/Color/BackgroundColor并等待完成通知，无任意UNO、新IPC、文件路径、网络或权限扩大。与其他Office修改共用每轮一次额度。

数据/公式保护不是只写在提示词中：修改前从当前持久XLSX建立有界语义收据，保存后重新解析实际workbook→关系→worksheet→单元格和styles。每格的非空文本/布尔/错误/数值、公式文本与工作表顺序名称必须一致，忽略公式旧缓存以允许原生重算。数值比较用十进制系数与指数规范形式，避免IEEE-754把9007199254740992与9007199254740993误判相等。原件不改，成功发布新revision并保留前版。

每个目标单元格必须在真实XLSX中具有指定字号、直接RGB文字色/solid填充；不把主题色/带tint的颜色当指定RGB。不匹配或原生no-op拒绝发布。保留验证器供显式save重试使用，不能用手动保存绕过。审计不记录单元格正文或格式参数；原生确认显示准确区域及完整小参数对象。运行审计写入失败/拒绝/写前取消不执行原生格式；输出或文档磁盘失败保留旧持久版和dirty草稿，显式保存仍须验收。原生修改可能产生多个撤销步骤，不是原子事务；完成审计失败或取消不能撤回已发生的本机副作用，任务不能据模型文字冒称成功。重启不重放。

## 保守边界

限同一原生矩形30行16列200格、128列5000行坐标；验收工作簿最多10表、5000个已存储单元格。修改前要求没有待保存草稿。含条件格式的目标工作表、目标段内富文本、共享/数组公式、未知单元格类型及超限先拒绝；输出新增条件格式/目标段内富文本同样拒绝。合并、多区域、跨表范围依旧不支持。公式只验收保持，不新增输入或执行公式能力；普通常量与显式{text:...}原样文本沿0.37.11保留。

这是有界格式修改，不是任意Office无损往返。语义收据不验证图表/批注/关系等所有复杂对象，未请求的任意样式、字体与行高可能被原生规范化；此前Liberation Serif/26pt归一为Times New Roman/25.5pt的边界未解决。本轮样本验证已有粗体、数字格式和底边保留，不泛化为所有文件保真。没有OS沙箱、Mac或真实付费模型结论。

## 测试与失败记录

433项核心完整串行、9项最终格式测试、9条真实Chromium与26项打包/文件系统测试通过。最初6项格式测试中，服务误把测试传入的完整context剩余元数据当格式字段拒绝；改为与旧接口一致的显式参数解构，仅三种格式字段进入标准化，模型入口/worker仍严格拒绝额外参数。修正后6项通过，增加富文本/条件格式/共享公式/5000格/精确十进制/最后查询并发改版边界，最终9项通过。不将早期拒绝候选称已发布。

真实LinuxKit→XLSX经openpyxl独立核对A2:B3字号17.5、蓝字0078CB/底色DDEEFF；数据A/600/B/900、范围外公式=B2+B3及文字、另一工作表未变，已有粗体/数字格式/底边保留、前版原字节与Store重载通过。另测空区域仅白色底色，保存新revision。拒绝/旧sequence/审计取消/审计故障原生格式0次；原生no-op/输出未生效不能经save发布；磁盘故障保留草稿，恢复后显式save成功；worker非法颜色、布尔字号、未知字段/伪造part不改变历史。

生产Office窗口定位→真实本机HTTP标准模型工具夹具→真实LinuxKit→v2→实际XLSX导出与独立样式/内容核验→刷新对话保留；另回归常量、原样文本、Word颜色/CJK/外框/UndoRedo、Kit PDF与CID中文PDF。IPC/审批/Keychain和模型语义为夹具，LinuxDev26.8alpha不同Mac26.8.1.1，无Mac/付费模型/IME/字体像素或Excel-WPS验收。原122个Web/Python保护文件SHA未变，旧35原Python执行器未改未重跑，无生产依赖或数据迁移/许可变化。

## 打包、对齐与接续

本轮重新取得0.37.11完整离线载体SHA9c520e74cea62e3f895540dc7fda4948f301a2617c30ff1c6330f4c005753f5c并核CRC，以新私有目录/独立签名输入输出/精确树门禁构建。Python/LO原始载荷保留，安装端不装npm/pip。最终静态结果见offline记录；ad-hoc未公证，代码页/封闭ZIP不是Mac codesign深严格/CMS/Gatekeeper/启动验收。安装慢与历史未知临时前缀来源未修，无新小更新，不要求为提速重装。

2026-10-31重新阅读Quick官方working-with-chat-desktop：session tab中的渲染编辑/选区上下文继续作为产品对齐方向，不据此推断其底层Office引擎。参考https://docs.aws.amazon.com/quick/latest/userguide/working-with-chat-desktop.html；LibreOffice官方help/helpers/uno_hid.lst确认固定命令名称，实际参数/效果以本轮真实Kit/XLSX证据为准。REA复用既有公开包部分静态证据，无新Amazon运行、认证绕过或代码资产复制。

本轮只读GitHub main仍27bd38f6b43806fb702c62ec4586426730b8190a，.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。长期每轮发布授权有效；此前CreatePR自动审批额度提示11月2日恢复，当前未到时点，不重试/换路线绕过，本轮无上传/PR/main/tag/Release。权威写回将以本轮观察版本50保护，最终保存/回读以交付回执为准。下一轮先Mac签名原始stderr、包内Python/Kit/真实模型/IME/安装；缺机器继续PPT对象/文字选区、Word内部网格或受控公式。跨Web完整核心、OAuth/stdio、自主并行组、语义检索和复杂Office保真仍差距。

最终离线静态核验：483226544字节，SHAdf398c7c02547a676a2245fa15955b7392790be98e0089d91be4a6e690625048；ASAR63fdb45a53727956f01d84ca71e24d1931b2b035bcff80a37445a471248a64bb，155生产文件+最小package直接逐字节匹配，无hostpyc。278可运行MachO93545页/20727应用+5配套/47链接、零残留/封闭CRC/真实Electron页篡改负例通过；与0.37.11仅四个签名应用条目变化，Python/LO字节/模式/链接不变。Mac codesign深严格/CMS/Gatekeeper未验收，ad-hoc未公证。
