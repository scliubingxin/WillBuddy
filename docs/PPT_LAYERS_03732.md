
## 2026-11-13 · 0.37.32 PPT 图层、图像与配色候选

实际修改 desktop/runtime/ppt-layers.mjs（新增）、runtime/documents.mjs、runtime/agent.mjs、runtime/tools.mjs、services/documents.mjs、services/conversation.mjs，新增 desktop/tests/ppt-layers-03732.test.mjs。PPT生成允许模型输出有限位置和尺寸的文字、矩形、圆角矩形、椭圆、线条及本轮已选PNG图片图层；数组顺序决定前后顺序，形状/文字为独立可编辑对象，颜色/字体尺寸/对齐/背景可配置。图片只引用本轮ID、不取网络，按原比例完整包含，生成前与提交前核验字节及SHA，图片移除/更改拒绝保存；旧原生逐次审批和版本保护保持。每页最多60层，最多8张来源图片；不支持任意代码/URL/SVG。新增淡入幻灯片切换的OOXML，已静态验证，未测试播放；不是逐对象动画或自动设计效果。原PPT表格/卡片及Excel能力保留。

测试覆盖图层顺序、实际图片比例、色彩、非法几何/颜色/脚本/URL拒绝、超限、未授权图片及审批期间图片改变；python-pptx独立解析真实输出，Linux LibreOffice将英文合成PPT导出并人工查看PDF画面。PNG为合成测试图；模型/原生审批适配为夹具，无用户原件、Mac、PowerPoint或动效播放验收。下一轮优先原生编辑图层的选择/移动/缩放、复杂图表与可验证对象动画，继续Mac实际验收。
