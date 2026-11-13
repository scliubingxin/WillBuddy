
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
