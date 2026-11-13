
## 2026-11-13 · 0.37.30 截图问题候选

本轮修改 desktop/runtime/browser.mjs、runtime/tools.mjs、runtime/documents.mjs、runtime/agent.mjs、main/approval.mjs、main.mjs、services/documents.mjs、services/libreoffice.mjs、src/ui/workspace.js、src/workbench.css，新增 desktop/tests/screenshot-feedback-03730.test.mjs。自动网页后台打开，最多5个页面时回收最早隐藏页并报告失效引用；手动浏览器仍可见。文档读取仅同一次任务、同文档版本和SHA可选择复用，其他类型的操作仍单次审批，未实现所有弹窗的整段对话始终允许。Office 预览两并发、最多20个等待、排队可取消，排队代替立即繁忙错误；未证明解决用户机器转换慢的根因。PPT新增非负条形图，由单独可编辑的形状和文本组成，不是原生数据驱动图表；图表最多12项，仍不支持复杂模板/任意图形和完整Office保真。隐藏已完成的中间工具前言并调整用户气泡，未做Mac实际视觉验收。

测试：相关 52 项Node测试（含真实Linux LibreOffice，模型和部分原生桥为夹具）通过；独立 python-pptx 验证生成PPT含9个形状和对应数值。Mac浏览器后台输入/用户原始文档/实际PPT像素/付费模型/Office签名启动未验收。下一步优先Mac检查后台点击/输入是否有效、长任务授权交互、Office预览的真实耗时及PPT复杂图形与版面。
