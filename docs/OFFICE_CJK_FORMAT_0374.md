
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
