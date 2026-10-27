文档侧栏点击发送即明确发送当前正文/选区给所选模型；不再逐条重复正文确认，AI实际写入仍逐动作审批。Enter发送、ShiftEnter换行，保存结果在顶部显示。支持边界见 OFFICE_INTERACTION_0372.md。

# WillBuddy Office：嵌入式 LibreOfficeKit

0.37.0 使用随应用分发的 LibreOffice 原生内核，通过 LibreOfficeKit C ABI、独立 Python 工作进程和自有白蓝界面接入。不是仅打开 LibreOffice 窗口，也不是重新编译或修改 LibreOffice 上游源码；上游二进制、许可证和声明原样保留，WillBuddy 适配器独立实现。Python、Pillow 与 Office 内核随 Apple 芯片包交付，用户无需另装软件或运行 npm/pip。

## 使用

文档卡片双击或点击“WillBuddy Office 编辑”打开文档窗口。同一文档复用窗口，最多同时两个文档；目前没有文档标签栏。工具栏提供撤销、重做、粗体、斜体、下划线、缩放、分页和工作表/幻灯片切换。页面来自真实原生内核像素，不把 OOXML 提取文本冒充页面。

拖动页面选中文字，或 Excel 输入 A1:B2 范围并定位；选区显示后可用文字输入框“写入文档”。这是基础嵌入式编辑，尚非完整键盘/中文 IME 所见即所得编辑器。Excel 范围最多128列、5000行且1000格，禁止整表全选；粘贴最多100行/32列/1000格，使用转义 HTML 表格避免导入对话框。新输入以 = 开头的公式暂不支持，使用原有受限公式编辑器。PPT 可真实绘制/切页和基础鼠标定位，不承诺任意对象编辑。

AI 侧栏默认折叠，点击“AI”或“AI编辑选区”展开。选区/正文经明确批准后才送当前模型；每个文档保留独立对话，复用现有模型路由与两个全局执行名额。AI 只有 office_replace_selection 单一写工具，不获得 CLI、浏览器或其他文档权限；最多4轮、单次替换600字符，每请求最多一次批准写入。模型内容、审批及原生 IPC 在开发验收仍为夹具，HTTP 请求和 Office 内核是真实执行。

## 保存与边界

文字、格式及 AI 修改会直接保存为文档新版本，不需要退出 LibreOffice 再点击“收回编辑结果”。原件不写回，保留前5版；导出仍用既有真实二进制路径。每次操作核对 docId/revision/SHA 和选区序列，外部任务改变源版本则要求重新打开。保存失败保留明确的未提交草稿，拒绝无提示关闭；模型取消/磁盘失败不会发布成功版本。已经作用于私有原生草稿的粘贴不保证自动撤销，需手动保存或恢复。

每个文档一个私有0700目录、0600副本和独立最高宏安全配置；无 TCP/UNO 监听器。单次原生请求30秒、编辑许可30分钟、最多2进程。主帧与独立只读 preload 精确绑定，拒绝子框架/其他窗口/伪造文档ID。代码运行于用户 OS 权限，不是 OS 沙箱。AI 写入前必须持久审计，审计失败阻止粘贴，审计不保存替换正文。关闭/超时终止自有工作进程，不在 Electron 中加载原生库。

LibreOffice 导入导出可能改变 OOXML 结构或不支持对象；不是任意 Office 字节无损往返。基础文字粘贴可能沿插入点样式，不承诺跨多种字体段落的全部样式保持。复杂图片/图表/批注/修订/中文字体、分页与键盘 IME 继续完善。旧 PDF 预览、结构补丁和原生编辑适配保留为兼容路径，主编辑入口不再要求手动收回。

## 证据与限制

Linux 实际 LibreOfficeKit 验证 Word 选区/替换/保存、Excel 单格和区域常量写入、PPT 绘制切页；生产 Chromium 窗口实际画布→手改v2→真实本机HTTP模型工具→原生修改v3→重载历史。macOS arm64 仅静态确认原包 libmergedlo.dylib 导出 libreofficekit_hook(_2)，不等于 Mac 运行验收。Linux 引擎为宿主 LODev26.8alpha，发行 Mac 内核26.8.1.1，平台差异未消除。应用仍 ad-hoc/未公证，无 Mac 严格 codesign、Gatekeeper、启动、付费模型或 Office/WPS 像素兼容结论。

原型曾在原生剪贴板退出析构崩溃；当前由独立进程保存后退出/宿主清理，未宣称修复上游析构。Calc 纯 TSV 粘贴曾触发导入对话框并退出，已用真实区域 HTML 粘贴回归；打包首次丢失安装脚本执行位被清单门禁拒绝，显式0755后重建验证，不放行失败产物。

ABI 固定于 LibreOffice core bf6ef2662401c7d6dce671ab4deb26ee0af3a7c1，见 desktop/runtime/office-kit/NOTICE.txt。官方接口：https://docs.libreoffice.org/libreofficekit.html 与 https://dev.blog.documentfoundation.org/2024/06/27/libreofficekit-api-in-action/ 。WorkBuddy 官方文件浏览器说明 https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/File-Browser 支持独立窗口和文档 AI 侧栏的产品参考，未披露其底层采用 LibreOffice，不能据截图确认该推测。用户私有截图未收入源码。Quick/REA 复用既有公开包部分静态证据，无新增 Amazon 运行结论。
