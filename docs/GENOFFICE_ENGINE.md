# WillBuddy 0.12.0：内置 GenOffice Word 引擎与写作画布

检查日期：2026-10-22。上一轮0.11只有外部GenOffice应用接续；本轮把其实际HTML→DOCX子引擎编入WillBuddy离线应用，不要求安装GenOffice、Microsoft Office、Python或npm。完整GenOffice套件尚未嵌入。

## 可直接使用

1. 成果中心点击“写 Word 文档”，在内部画布编辑内容，选择文字后设置标题、正文、粗体、斜体、列表；可插入基础表格和撤销/重做。点击“保存为 Word”，原生确认后保存经过验证的DOCX，卡片可下载真实文件。
2. 新画布生成的Word有“Word 画布”入口，重新打开后继续编辑，保存新版本；旧版本保留。不是修改后只保存聊天文字。
3. 已有Markdown或HTML文档点击“转换为 Word”，保留原件并生成独立DOCX，包含标题、文字、列表、表格等可编辑OOXML结构。转换产物也可在画布继续修改。
4. 模型工具新增`document_write`（富文本HTML创建/修改Word）与`document_convert`（已有md/html转换Word），共用原生审批、文档版本、配额和可信文件卡片；不是固定演示回复。所选模型仍需支持标准tool_calls。用户模型未实测。

画布由WillBuddy实现，转换使用真实GenOffice子引擎。手工画布保存及本地转换本身不调用模型、不访问网络；AI任务依旧使用用户指定的模型地址。原“双任务+排队”、浏览器/CLI、Web/Python与加密身份均保留。

## 实际集成与许可

- 官方项目：https://github.com/genspark-ai/genoffice
- 固定源码提交：`342abce4280ea92bf7e59580f1ecaf9b562d0f72`。
- `vendor/genoffice-html2docx/src/`的29份源码与该提交逐字节一致；保留上游Apache-2.0 LICENSE、NOTICE、包元数据与架构文档。没有复制ee/企业代码、字体、原生sidecar、其他编辑器或Amazon代码。
- `scripts/vendor-genoffice.mjs`处理上游`?raw`浏览器提取脚本导入，以36个导出复用现有锁定docx9.13.0/office.cjs；没有增加运行时npm依赖。生成的CJS引擎约357KiB，附运行时LICENSE/NOTICE、所有源码哈希和原office.cjs哈希。第三方许可仍生效；未更改WillBuddy自身UNLICENSED。
- `runtime/document-converter.mjs`组织真实浏览器布局提取→IR→OOXML与结果检查；Electron适配在`main/conversion-browser.mjs`，不污染业务核心。

## 权限、取消与版本

转换使用独立、非持久session和隐藏BrowserWindow，无preload、Node集成、共享Cookie或工具授权；sandbox与contextIsolation开启。新窗口、导航、摄像头等权限均拒绝；网络/本地file请求拦截，只接受主进程构造的data内存文档。可信提取脚本运行于隔离世界1008，不执行输入HTML中的脚本。

DOMPurify白名单清理输入：只保留基础文字/表格/列表和有限样式，移除脚本、外链、图片、iframe、表单、事件与CSS URL。最多100000字符、2000元素、30000px布局；同时最多2个转换、15秒超时，取消会销毁浏览器；迟到driver关闭，无隐式重试。Word产物继续走4MiB、ZIP/XML/CRC/宏/嵌入/外链门禁；整页文字图片化结果拒绝。

候选先生成再确认，确认通过且源/目标revision仍一致才入库；源变化、并发修改、拒绝、取消或磁盘失败都不发布候选。原件不覆盖，前5版保留。画布HTML源留在文档记录，普通state只提供hasRichSource；模型document_read经审批后可读取小型editableHtml，审计移除HTML正文。超过12000字符的HTML不完整发给模型，返回明确提示，使用本机画布处理。现有文本替换工具拒绝画布文档，避免旧操作丢失富文本源。

## 已验证与未验收

123项核心（本轮新增10项）、8项真实Chromium（本轮新增2项）、7项打包Python通过。实际GenOffice引擎、DOM布局提取、标题/粗体/编号列表/表格生成、恶意HTML净化与无请求转换，及生产UI写作→真实DOCX→修改新版本→导出→刷新/磁盘重载完整执行。生成的文件由独立python-docx读取，核对表格单元格、粗体及修改后段落。独立字体仅安装在验证容器，不随源码或应用分发。

Electron适配器的session/权限/世界/Node隔离是构造夹具测试；实际转换跑在Chromium Headless Shell，不等于Electron/Mac真机。原生IPC、审批为桥接夹具，模型内容仍夹具。没有Mac原生严格签名/Gatekeeper/启动、真实付费模型、Word/WPS保真或完整上游编辑器验收。

## 边界与下一步

- 当前画布面向新建/本机转换的Word，不能保真打开任意导入DOCX；导入文件仍用段落编辑或可选GenOffice应用接续。
- 不承诺复杂CSS/模板、图片、页眉页脚、页码、分页所见即所得、修订批注保真；图片/外链被剔除。画布不展示分页，修改会重新生成当前文档，前版仍可下载。
- Excel公式/图表、PPT画布、完整多格式往返和自主并行子任务尚未实现。下一轮优先原生Mac验收与DOCX结构解析/保真往返，再推进表格/公式引擎，不把此子引擎称为完整Office替代品。
