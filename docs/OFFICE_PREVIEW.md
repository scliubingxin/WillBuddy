# WillBuddy 0.16.0 内置 Office 预览

点击文档卡片「预览」直接渲染保存的真实二进制版本；不再展示 ZIP/XML 文本作为默认 Office 预览。不需要安装 GenOffice、Office、Python 或 npm。提取文本仅为显式备用视图。GenOffice 外部编辑/收回按钮已移除，旧动作重定向预览；原生内部适配保留兼容但无用户入口。此前内置的 GenOffice HTML→DOCX 子引擎及编辑能力保留。

## 实现与边界

- Word：内置 docx-preview 0.4.1（Apache-2.0），正文、表格、图片、页眉页脚、分页。关闭 altChunk。浏览器分页、缺失字体、浮动对象及复杂字段可能与 Word 不同。
- Excel：自有 SpreadsheetML 渲染器读取 workbook/rels/sharedStrings/styles/worksheets；全部工作表可切换、合并格、列宽/行高、字体、直接颜色、基本边框/对齐、SSF0.11.2 数字格式、已有公式缓存。内嵌图片集中显示，未还原锚点位置；不支持图表、条件格式、主题色/复杂样式或透视表显示。不执行公式、链接或宏。
- PPT：内置 @aiden0z/pptx-renderer1.4.0（Apache-2.0），所有幻灯片静态渲染，关闭 PDF.js 远程回退；不支持动画、某些复杂对象和缺失字体。不是完整 GenOffice 套件。
- 最大压缩文件4MiB/解压32MiB沿用既有门禁；Excel最多10表、5000行、128列、30000网格/表，超过直接报错，不静默截断。整体预览30秒超时销毁隔离帧；不会修改文档。
- `documentPreview` 仅返回当前指定revision，SHA校验、现有ZIP/XML/宏/外链检查通过后取原字节。普通state不增加base64、模型工具不增加免审批正文接口。
- 子帧sandbox仅allow-scripts，无same-origin、preload、Node或原生桥；CSP禁网络、file/远程图片、worker、内嵌frame、object、表单与base。只允许内存图片/字体。父子消息按frame来源、随机token、消息类型核对；单次传入不可变快照，关闭/切版本后迟到结果忽略。链接点击阻止。原审批/文件授权不削弱。
- 当前应用整体刷新会重建预览帧，可能复位滚动/选中的工作表。后续应实现预览宿主独立于会话重绘的生命周期。

## 构建和许可证

源码开发 `npm ci --prefix desktop`，`npm run vendor:preview --prefix desktop` 生成离线engine.js和PREVIEW-MANIFEST/许可证。生产ASAR直接包含成品；安装端不运行这些命令。不捆绑第三方字体、GenOffice企业版或外部桌面程序。ExcelJS4.4.0仅开发生成独立测试文件，不进入预览成品。PPT上游随包THIRD_PARTY_NOTICES与licenses全部保留。

上游：https://github.com/VolodymyrBaydalka/docxjs 、https://github.com/aiden0z/pptx-renderer 、https://github.com/SheetJS/ssf 。

## 验收

见 docs/validation/v0.16.0.json。核心服务与生产Chromium/真实Office文件验证；原生IPC桥仍测试适配，无Mac真机、Office/WPS显示、Developer ID/公证或Gatekeeper验收。复用既有Quick/REA证据，未宣称本轮运行Amazon安装包。跨端核心、桌面MCP、自主并行子任务组及复杂Office保真仍有差距。
