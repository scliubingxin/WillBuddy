
## 2026-11-13 · 0.37.31 Office 编辑与PPT版式候选

基于0.37.30源码，修改 desktop/runtime/office-cell-format.mjs、office-kit/worker.py、office-worker-bundle.mjs、services/office-workspace.mjs、services/office-chat.mjs、runtime/documents.mjs、runtime/agent.mjs；新增 desktop/tests/ppt-layouts-03731.test.mjs，扩充 office-cell-format.test.mjs。AI Excel当前真实矩形选区新增粗体和斜体的设置、取消；逐次审批、选区/版本校验和审计保持，实际保存后核对单元格格式、数据、公式及非目标内容，失败保留草稿。真实Linux LibreOfficeKit选区修改/取消，openpyxl验证成功，不保证Mac或所有复杂格式。PPT生成可选多卡片和原生表格，内容为可编辑形状或表格，每页只能使用一种图表/卡片/表格布局；不支持任意复杂布局或保证所有文字不会溢出。模型通过现有document_create执行并提交真实PPT；独立python-pptx验证，Linux LibreOffice PDF渲染两页合成英文样例，无Mac/真实模型/用户原件验收。

22项Office、worker和截图回归通过，Python原生工作进程、Office审批和模型内容部分使用夹具。Mac签名/启动/IME、复杂PPT、图表数据驱动、完整Excel公式及跨Web核心仍待做。下一轮优先继续PPT内容编辑与模板保真、Excel更多格式与公式能力，以及用户Mac现场实际验收。
