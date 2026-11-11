# 0.37.25 Office 文档导出 PDF 候选

接续当前权威 0.37.22 和包含模型修复的 0.37.24 候选，已验证两包全部条目 SHA 与 ZIP CRC。

在成果中心和生成文档卡片增加「导出 PDF」，Word、Excel、PPT 调用现有 LibreOffice 本机转换；系统保存对话框决定路径，渲染进程不能指定路径。转换前后复核当前文档 revision/SHA，结果检查 PDF 头、体积和 SHA；写入先独占暂存、同步、比较并发布，回读核验。选择取消或文档变化不写目标；原 Office 文件和版本不修改。最大 PDF 16 MiB。PDF 无法继续当作可编辑 PPTX 使用。转换不发送给模型。

实际修改 desktop/main/pdf-export.mjs、desktop/main/document-files.mjs、desktop/main.mjs、desktop/preload.cjs、desktop/src/ui/documents.js、desktop/src/app.js、desktop/tests/pdf-export.test.mjs 及版本、日志。

测试：真实 Linux LibreOfficeDev 26.8 alpha 对合成 PPTX 转换导出 PDF，pdftotext 核验标题、源文件字节不变；取消、版本漂移、输出不匹配和缺引擎拒绝写入。串行 Office PDF/模型/智能体/CLI 定向 46 项通过；旧原生 Office 测试与新导出共 11 项通过；打包边界 26 项通过。原生保存对话框、Electron IPC 和 UI 没有真实 Mac 验收；PDF 页面的视觉保真、复杂图形、字体及大文档未穷尽测试。

当前模型相关开发依赖缓存不完整，npm 离线缺 zrender，jsdom 缺失；全量回归与 UI 未完成，无法构建本版 Apple arm64 包。未更新权威库文件或 GitHub；0.37.22 版本分支仍需补齐和验收，用户长期授权继续有效。本轮未新增 Amazon Quick 实机结论；复杂 Office 直接编辑、Web 与桌面共享业务核心、自动验收仍有差距。
