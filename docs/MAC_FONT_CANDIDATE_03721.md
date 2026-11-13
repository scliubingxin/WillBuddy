# macOS Office 中文字体候选 0.37.21

OfficeKit 和 PDF 预览使用同一 worker；macOS 上启动前为每个私有工作目录创建 Fontconfig 配置，显式包括系统/公共/用户字体以及内置LibreOffice字体，缓存位于私有目录。只传给子进程，不修改系统设置、原文件或已签名 LibreOffice。字体路径含 XML 特殊字符会转义；无效或无法写入的路径拒绝启动。其他平台环境不变。

可疑上游现象：macOS headless LibreOffice 未配置 FONTCONFIG_FILE 时简体中文 PPT 导出 PDF 丢字，显式配置字体目录后使用 PingFang；见 https://github.com/openai/codex/issues/32968。这不是证明本机故障根因。

开发 Linux 测试：实际 Fontconfig 识别临时用户字体，路径转义/权限/非法输入验证；真实 Linux LibreOfficeKit 加载合成中文 PPT、由工作进程导出 PDF，PDF 实际嵌入测试 NotoSansSC 且可提取中文。测试字体仅开发使用，不放入应用。真实 Mac 系统字体发现、编辑画面、预览及用户原件均未验收，Mac 所带 LibreOffice 编译参数、字体可用性与字形/排版可能不同。

修改文件：desktop/runtime/office-fonts.mjs、office-kit.mjs、desktop/tests/office-fonts.test.mjs、桌面版本、迭代日志与状态。本候选应在用户的 Apple 芯片机器对中文 PPT、DOCX 分别验证编辑和预览；不可声称所有 Office 字体或文件已解决。
