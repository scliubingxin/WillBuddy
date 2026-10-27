# 0.37.1 截图故障修复

用户九张截图已逐张查看，包含私有事故资料；原图和资料不收入源码。修复范围按证据分开：

1. 多个 WillBuddy Office 编辑按钮报 api[name] is not a function：0.37主进程已有officeOpen注册，生产preload白名单漏掉该方法。补齐精确方法，不新增任意IPC入口。新增VM实际加载生产preload验证冻结接口/准确channel，再将真实preload导出的接口名用于生产Chromium页面回归，覆盖成果中心、预览工作区、文档双击三入口。旧测试手工模拟桥接遗漏这层，已补覆盖。界面接口缺失时也显示中文升级/重启提示。
2. 中文预览缺字：旧PDF组件未分发CMap与标准字体数据。固定pdfjs-dist5.6.205自带资源全量内联到引擎，独立内存BinaryDataFactory精确键查找，useWorkerFetch=false，无网络或文件代理，不放宽CSP。保留Adobe/Foxit/Liberation许可证。使用无嵌入中文CID字体、UniGB-UCS2-H真实PDF：旧引擎提取文字为空，修复后完整中文文本/2387暗像素且无外部请求、无CMap加载错误。已查看真实画布截图，中文可读。测试宿主临时安装官方NotoSansCJK字体用于显示，不随应用分发；原图文档没有文件原件，不能称原文档全部字体/内容已验收。源DOCX/XLSX已丢失的正文/图片不会由本修复补造。
3. 正常分页预览标题和状态统一WillBuddy Office，保留第三方许可/开发说明。编辑窗口使用现有蓝红logo。桥接修通后正常入口为WillBuddy自有Kit窗口；主应用已有dock.setIcon，历史外部LO进程的独立Dock图标不是简单改按钮文字能解决。Mac Dock实际显示与Kit启动仍未真机验收，不称图标问题完全解决。
4. 纳入此前安装性能候选：同盘严格签名检查后移动已解压app，不再次ditto复制整个Python/LO；跨盘保留复制后codesign，事务失败恢复原件/旧版。13打包事务测试含新增3项真实文件系统inode保持、提交失败回滚、备份冲突拒绝。设备号通过开发测试适配；Mac跨盘与签名调用未跑。全量ZIP解压和增量更新/原生DMG仍未完成，不能把本补丁称完整安装性能修复。

377核心、5相关真实Chromium、13打包测试通过。新桥接测试本身初次语法笔误修正后通过；新PDF测试初次静态服务器根路径多斜线导致404，修正测试后通过；未把这些测试错误称生产Bug。真实LinuxKit/HTTP夹具沿既有链路回归，IPC/原生审批/Keychain/模型语义仍夹具。无Mac原生/付费模型/Gatekeeper/公证验收。应用不移除隔离或关闭保护。Python/LibreOffice原载荷保留，148生产文件ASAR逐字节相同，原Web/Python保护文件不改。

下一轮：实际用户Mac编辑启动/中文文件与Dock验收，优先原生安装和仅应用代码变更的更新包，避免反复解压全部运行时；再完整IME和Office对象编辑。用户WorkBuddy截图仅交互参考，无底层实现推断，不拷贝其资产。Quick/REA复用既有部分静态证据，没有新增Amazon运行结论。
