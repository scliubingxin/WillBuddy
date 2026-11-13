
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
