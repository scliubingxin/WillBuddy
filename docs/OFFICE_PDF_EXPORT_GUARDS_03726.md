# 0.37.26 办公成果 PDF 导出边界

从权威 0.37.22 和 0.37.25 候选各自回读，所有内容 SHA 和 ZIP CRC 检验通过。继续保留 PPT 选区编辑、模型配置和 PDF 转换。

工作区当前 Office 预览可直接选择导出 PDF，仍由系统对话框决定位置。PDF 至少需要文件头、尾部 EOF、大小及 SHA 检查；不是完整 PDF 结构验证或视觉验收。暂存文件同步与读取核验后、替换目标前再次检查源文档版本和 SHA；源在此期间发生变化时拒绝发布并删除暂存，已有目标保持。该检查不构成跨文件系统和跨进程的原子事务。

改动 desktop/main/document-files.mjs、desktop/main/pdf-export.mjs、desktop/src/ui/workspace.js、desktop/src/app.js、desktop/tests/pdf-export.test.mjs、包版本及日志。47 项 Office PDF/模型/智能体/CLI 定向测试和 26 项 Python 打包测试通过。包含真实 Linux LibreOffice 合成 PPTX → PDF 和 pdftotext；注入截断 PDF、最终写入前版本漂移并核验已有文件不变。UI/原生对话框、Mac、真实模型和复杂文档未验收。

缺开发依赖 jsdom/zrender，完整回归和 UI 未完成；无 rcodesign、Mac 或本版 arm64 应用。保存候选，不替换权威；0.37.22 GitHub 部分分支仍待补齐、并发核验和 PR/main/Release。复杂文档的选区、表格、图形直接编辑及自动视觉验收仍待完成；没有推断或复制 ChatGPT 未公开实现。
