# WillBuddy 0.37.13 · PPT精确文字选区与AI替换核验

从权威0.37.12/v51重新读取并逐SHA核验734内容文件后开发，不从旧main或旧scratch回退。

## 使用与实际修改

双击普通PPT文本框，再点击“全选”进入文字选区。画布获得焦点后，方向键、Home/End与Shift/Ctrl可在文字内精确定位和选词；展开AI侧栏，明确发送当前资料，要求替换选中文字。沿用标准office_replace_selection工具、逐次原生修改确认、持久审计与每轮一次修改额度。独立Office窗口、白蓝logo、旧身份和所有旧Office/Web/Python能力保留，无新依赖或持久数据模式。

主机复用固定六键导航；私有worker仅在真实text selection/type=1确立文字编辑状态后允许PPT导航。折叠到光标后可继续导航，鼠标操作、切页和其他命令清除该状态，下一次需重新建立文字选区。不是方向键移动形状、全键盘编辑、中文IME或Mac Cmd/Option映射。原Word导航行为保留，Excel仍拒绝此键盘路径。

AI写入前绑定sequence、真实文字选区类型、当前part、revision/SHA、30分钟授权；审批前后、持久running审计后重新核对，异步画面查询之后再检查取消/版本/时限。worker粘贴前再次核对part、type=1和准确expectedSelection，不接收任意键码或UNO。已有Word替换也补上审计后取消/选区重查和修改前dirty草稿拒绝。

## 保存验收与边界

新增无Electron的runtime/office-presentation.mjs。按presentation.xml→关系映射真实页序，不假设slideN即显示顺序。每页校验形状ID唯一；选中文字须在当前页所有形状段落中**恰好出现一次**，目标必须是顶层普通单段文本框，无分组、表格、域、换行、超链接。最多50页、2000个形状标识、10万文字；选区12000字符、替换600字符，单行且不含控制符或孤立代理项。重复词请先选择更完整的唯一文字；不根据模型自报坐标定位。

保存后独立解包PPTX并比较全部页序、形状顺序/类型、逐段文字，要求唯一目标子串准确替换、其余幻灯片文字不变。LibreOffice会重新编号形状ID和拆分文字run，因此不把生成ID/run切分当作稳定语义。第一次原型将形状ID当稳定标识，被真实输出断言拦下；确认导出重新编号后按上述明确范围比较，并保留其他文字断言。原型文字导航曾在Home折叠选区后丢失文字状态，现只在真实文字选区建立本地状态并在离开编辑上下文时清除。

这不是任意OOXML无损往返：不核验所有字体/行高/动画/母版/备注/图片/对象几何或关系字节；原生保存可能规范化样式。不能操作分组、表格、任意PPT对象或跨段选区，不称全面替代PowerPoint。重复文字或复杂结构保守拒绝，不自动扩大选区。

验收器挂到当前私有草稿，原生no-op、错误输出或磁盘失败均不发布假成功；显式“保存”重试继续经过同一文字验收，不能绕过。保留原件和前版。失败/取消仍可能留下已执行的本机私有草稿，非原生原子事务；成功提交后的完成审计故障无法撤回已保存内容。重启不重放审批或编辑。

## 证据、环境与后续

验证结果见validation/v0.37.13.json及对应日志。真实LinuxLibreOfficeKit执行、真实本机HTTP模型协议夹具、生产Chromium页面、真实导出PPTX经python-pptx独立读取；原生IPC/审批/Keychain/模型语义仍夹具。Linux26.8alpha不同于包内Mac26.8.1.1，没有Mac启动/签名/中文IME/字形像素或付费模型验收。

下一轮优先Mac原始codesign stderr、包内PythonKit、真实模型与原文档/IME；无Mac继续Word内部网格/受控公式或PPT复杂文本保护，不只加说明或队列。安装慢与历史临时截断副本来源未解决，不提供新的小更新速度承诺。离线包仍arm64、内置Python/LibreOffice，安装端不装npm/pip；ad-hoc未公证，不去隔离或关系统保护。

2026-10-31复查Quick working-with-chat-desktop官方文档的渲染文档/选区上下文能力，以及LibreOfficeKit公开C API。REA沿用既有部分静态证据，无新Amazon原生运行结论，不复制分发Amazon代码资产。

GitHub只读main仍27bd38f6b43806fb702c62ec4586426730b8190a，.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前CreatePR自动审批额度故障提示Nov2恢复，本轮未到时点，不重试或换插件/CLI绕过。长期每轮发布授权有效，无须重问；本轮没有上传/PR/main/tag/Release，不将候选误称公开发布。

最终离线静态核验：483229339字节，SHAfefb67eb65b08ff64ee25a4b97f0682299231a5d0f25499b081e651256837be4；ASAR240b17ef936b952941e4abfcfbaddabd0b89ac732ea12e826c4a07d998df0620与156生产文件+最小package逐字节匹配，无hostpyc。278可运行MachO/93545页、20727应用条目+5配套/47链接，零残留/封闭CRC/真实Electron页篡改负例通过。与0.37.12仅Info.plist/Electron/app.asar/CodeResources四条目变化，Python/LibreOffice原字节模式链接不变。仍ad-hoc未公证，静态页哈希不代替Mac codesign深严格/CMS/Gatekeeper/运行。权威写回使用本轮观察expected_current_version=51保护，最终保存/回读以包外回执为准，不预写成功。
