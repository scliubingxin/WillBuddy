
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
