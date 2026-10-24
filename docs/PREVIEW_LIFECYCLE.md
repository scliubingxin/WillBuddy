# 0.18.0 预览生命周期

## 实际问题与修改

0.17修复了安装版组件启动问题，但`render()`仍对整个`#app`设置innerHTML，后台状态绘制、侧栏等操作会把已渲染的Office frame销毁，重复读取二进制并解析；Excel工作表与滚动状态也被重置。

新增`src/ui/office-workspace.js`连接态更新器，只有当前页面/任务scope与documentId/revision都相同且布局结构完整时复用现有预览。原iframe、host、preview-scroll、session-panel、workbench不摘除、不重新挂载。只替换侧栏、顶栏、对话内容和预览工具条/页签等外围节点，缩放class同步；任务状态/文档名称仍更新。页面退出调用dispose。

这不是截图/HTML缓存，也没有跨文档的二进制LRU：一次只保留当前可见预览。关闭工作区/提取文本、切换任务或文档、删除文档、版本变化、未知布局都会释放旧桥和frame，然后按原规则重新读取/校验。重开不是免校验缓存；不保留关闭文档的私密内容。重启不恢复帧。完整GenOffice编辑器、分页全保真、图片锚点、图表和复杂字体没有在本轮实现。

原0.17固定两资源协议、引擎SHA校验、sandbox allow-scripts/opaque origin、无Node/preload/原生桥、CSP禁网络、单次快照/版本校验、5秒启动与15秒渲染超时/显式重新加载均保持。没有扩大浏览器/模型/文件授权，没有新生产依赖，不需要另外安装GenOffice/Office/npm。

## 验证

- 177项核心（新增4）：30次同版本绘制不移除frame任何祖先，滚动/工具条/缩放更新；版本/ID/任务scope失效；关闭释放及重开；加载/错误态与未知布局降级。
- 12项真实Chromium回归。生产预览页使用真实XLSX，选第二张表后12次运行时状态取回+界面绘制，frame相同且二进制读取次数不增加；侧栏调整同样保持。真实服务修改B3到9并发布v2，下一次界面更新必须换frame、重新读一次并看到9。DOCX末段、PPT末页与原有生成/编辑/导出、CLI/双任务回归保持。模型内容与审批/浏览器原生桥仍夹具。
- 9项打包Python通过。原122 Web/Python保护文件SHA未变，旧35项Python未重跑。
- Linux真实Electron42+实际生产HTML/preload/IPC/Service，三种真实合成Office二进制各20次界面调整，原WebFrameMain身份保持且额外二进制读取=0，Excel第二表仍可见；对交付ASAR也执行同样断言。容器启动无沙箱仅开发验收参数，不改变生产配置。
- arm64离线包沿用固定官方Electron/完整SHA、ASAR逐字节、Mach-O代码页、封闭ZIP清单/链接/执行位门禁；签名仍ad-hoc。

## 仍待验收与接续

没有Apple芯片目标机、Developer ID/公证或真实付费模型账户，因此Mac安装/严格资源密封/Gatekeeper/启动及用户文档显示质量未验收。不承诺大文档耗时或全部Office保真。下一轮优先Mac反馈，继续Excel图片锚点/复杂表格/分页质量，以及受限模板/图表；MCP、跨Web核心与自主并行子任务仍有差距。

2026-10-23复查Amazon Quick公开文档：生成文件完成后可在独立面板检查内容/格式并下载；这作为功能目标，不证明其内部缓存或渲染实现。https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html 。REA复用`REA_FINDINGS.md`旧DMG根哈希/部分静态证据，本轮未新运行Amazon应用/不复制其资源。
