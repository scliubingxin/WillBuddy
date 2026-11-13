# WillBuddy 0.37.9 · Word精确选区文字与背景颜色

从权威0.37.8/v47重新获取690内容文件并逐SHA核验；保留全部0.37.8能力。本轮没有Mac机器或用户原始codesign stderr，不把Linux验证当Mac验收。

## 实际功能和边界

office_format_selection新增fontColor与backgroundColor，分别修改Word真实选区的文字颜色和文字背景底纹；仅#RRGGBB，主机归一化为大写，私有Python工作进程再次验证类型/完整字符串/额外字段。固定原生命令.uno:Color和.uno:CharBackColor，无任意UNO、路径、网络或新IPC入口。背景色为字符底纹，不是Word有限调色板的w:highlight，不提供清除/自动主题色。可单独或同时指定，不改正文，不扩展Excel/PPT支持。

仍走已有真实选区sequence/revision/SHA、30分钟手动会话许可、逐次原生审批、写前持久审计、共享单次修改额度、文档服务CAS保存与前版保留。确认摘要明确两个颜色；审计不新记正文。取消/拒绝/旧选区/审计失败不发送原生命令；已经原生修改后文档磁盘失败保留dirty草稿和旧持久版，需显式保存重试。并非OS沙箱、任意格式无损或完整键盘/中文IME。

## 验收证据

411核心完整串行通过（新增4），7真实Chromium路径通过，26打包/真实文件系统边界测试通过；新增颜色相关6项单独通过。生产Office页面键盘精确选中Before TARGET after中的TARGET→实际本机HTTP标准模型工具夹具→真实LinuxKit→真实DOCX。python-docx/lxml独立断言只有TARGET为0078CB文字、FFFF00背景底纹，外侧文字无新颜色/底纹，全文保持；刷新对话保持。服务真实颜色修改/文档磁盘故障→dirty→显式重试v2→Store重载→真实Undo产生v3；旧原件字节保持。worker非法颜色/额外命令拒绝且Undo计数不变；授权拒绝、旧sequence、审计中取消和审计磁盘失败native format次数为0。7条UI还回归精准字号、CJK字体、UndoRedo、外框、双表Kit PDF和CID中文PDF。

原生IPC/审批/Keychain/模型语义仍夹具，真实付费模型未验收。LinuxLibreOfficeDev26.8alpha不同Mac包26.8.1.1，不能宣称Mac颜色/字体像素/IME/安装启动已通过。122个原Web/Python保护文件SHA不变，旧35Python执行器未改未重跑，无新生产依赖。

## 未通过的探索（未进入生产）

本轮尝试按LibreOffice公开SvxBoxInfoItem参数编码原生网格：.uno:BorderOuter+BorderInner、SetBorderStyle的OuterBorder/InnerBorder及序列边线编码均返回成功，但独立DOCX仍保留黑色0.5pt内部线或其他非预期结果，没有得到指定蓝色1.5pt全网格证据。原型已撤回，未暴露grid操作/工具/按钮，不把成功回执当功能实现。本轮交付明确转为真实文字/背景颜色增量。既有office_table_outline依旧只设外框、清内部线并显式padding，不冒称全网格或单边编辑。官方参考（只读，不复制实现）：
- https://raw.githubusercontent.com/LibreOffice/core/master/editeng/source/items/frmitems.cxx
- https://raw.githubusercontent.com/LibreOffice/core/master/include/editeng/boxitem.hxx
- https://raw.githubusercontent.com/LibreOffice/core/master/svx/sdi/svx.sdi

## 构建、发布与下一步

完整Apple arm64包复用本轮重新取得并核SHA的0.37.8静态运行时载体4728e067d4ddf214c5d49edbffdfc16e5ef3d52e1b7afa38ced380b47cc6048b；安装端不另装npm/Python/LibreOffice。构建和ASAR/页/ZIP最终结果见validation/v0.37.9.json，不用旧版页哈希替代本轮验证。仍ad-hoc未公证，页哈希不等于Mac codesign深严格资源封印/CMS信任链/Gatekeeper，安装耗时和历史临时截断来源未解决，没有新小更新，不要求用户为提速重装。

GitHub只读main仍27bd38f6b43806fb702c62ec4586426730b8190a，0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前CreatePR自动审批服务额度错误提示Nov2恢复，今天Oct30未到时点，不重试或换插件/CLI绕过；长期发布授权有效，本轮无上传/PR/main/tag/Release，不声称已发布。权威源码保存使用本轮观察expected_current_version47保护，保存/远端回读成功与下载以最终交付回执为准。

下一轮优先Mac原始签名错误/包内Python与Kit/原文档字体/真实模型；缺机器继续Word内部网格/单边真实原生参数或Excel/PPT受控选区与格式编辑。不要反复只堆说明或队列。完整跨Web核心、OAuth/stdio、自主并行组、语义检索/复杂Office对象和OS隔离仍差距。

最终静态构建：483219407字节，SHA647ac93e22a8e0b8aae98335945558e44c2e5abc3b69993f2e1e9ae68c7833ac；ASAR866ef2b82745337fc8e1be485289fa91ed51d2de840a1969ea1ba6a31e563a75。ASAR原始目录闭合并逐项直接extractFile核对153生产文件+最小package字节一致、无hostpyc；278可运行MachO93545页/20727应用+5配套/47链接/零包内残留/闭合CRC，真实Electron页篡改负例被拒。与0.37.8仅四个签名应用条目变化，Python/LO所有原条目字节/模式/链接不变。

解出ASAR到工作区的副本另出现未在原ASAR目录中的src/pdf/.engine.js.kzUlkt，2097152字节，恰为engine.js前缀；来源进程未知。此解出目录的闭合检查失败并保留现场，未删除后重算清单。改为直接读取已签ASAR目录和每项extractFile字节，确认原ASAR本身无该条目且与生产源码精确匹配；这是验证原交付字节，不是放行含临时文件的归档。不能称历史临时前缀来源根因已修复。Mac签名和安装耗时仍无新结论。
