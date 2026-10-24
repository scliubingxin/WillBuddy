> 历史0.11接续说明。0.12已内置HTML→DOCX子引擎和本机Word画布，见[新说明](GENOFFICE_ENGINE.md)。下文“尚未内嵌”指0.11及完整套件，不能用于否认0.12的实际子引擎集成。

# Office 交付修复与 GenOffice 接续 · 0.11.0

2026-10-22 根据用户截图定位：模型已创建DOCX，但回复/工作区的通用导出仍导出文字收据为Markdown。不是下载扩展名改为docx就能解决：必须选择真正生成并校验的二进制文件。

## 本轮实际行为

- conversation 在成功的 document_create/edit 工具结果中保存 runId/id/revision/sha256 文档引用；界面不从模型回复里猜ID。旧版本有完整执行审计的任务可从同聊天、同run的成功verified工具记录找回文件。
- 回复显示真实文件卡片与下载DOCX/XLSX/PPTX按钮。回复“在工作区查看”优先打开这些文档；工作区导出调用documentExport并使用实际文件格式。多文件时明确选择，聊天记录另标“导出对话Markdown”。
- 段落内容编辑：DOCX/PPTX按ZIP部件+段落坐标编辑，避免相同文字误改。已修改段落采用首文字节点样式，可能简化段内混合字体；其他ZIP部件保持。未实现整篇WYSIWYG、分页、结构增删、复杂样式和图片编辑。
- XLSX显示现有常量单元格并更新，最多显示500个，单次最多100处。保持数值/布尔常量类型，输入以=开头的文字不执行为公式。不计算公式；有公式时明确转用外部编辑器。
- Markdown/HTML可直接修改整篇原文；HTML静态预览继续隔离脚本、表单及远程资源。编辑HTML不会执行它。
- 保存采用乐观revision检查，审批期间有新版本则拒绝覆盖；保留前5版、验证字节和哈希，原导入文件不变。磁盘保存失败回滚内存候选。

## GenOffice 集成到了哪里

本轮是 **可选的本机应用接续适配器**，不是把整个GenOffice编辑器嵌入WillBuddy，也没有将GenOffice引擎加入离线应用包。内置Office创建/内容编辑无需安装GenOffice、Python或Microsoft Office。

1. 用户安装[官方 GenOffice](https://github.com/genspark-ai/genoffice)的Apple芯片版到个人或系统Applications。
2. WillBuddy成果中心或文档预览点击“GenOffice 编辑”。原生确认后只启动固定的`/usr/bin/open -a <已发现的GenOffice.app> -- <主进程生成路径>`，不接受renderer/model指定程序或命令参数。
3. 将当前版本字节写入0700独立临时目录、0600副本；不把原件或模型密钥传给GenOffice。GenOffice是独立应用，其自身权限/联网/AI设置由它管理；这不构成对它的文件系统沙箱。
4. 在GenOffice保存；**退出WillBuddy前**点击“收回编辑结果”。重新检查Office包格式、ZIP/XML边界、4MiB上限、宏/外链限制、哈希及目标revision。审批期间副本变化、符号链接替换、旧版本覆盖均拒绝；确认后保存新版本并清理副本。
5. 最多5个编辑副本；每文档同一时刻只允许一个接续操作。正常退出清理临时副本，重启不自动导入或重放。尚不支持自动监控保存、外部应用退出侦测或崩溃恢复；重要外部修改请先在GenOffice另存备份。

Mac原生启动尚未验收，找不到应用时会明确报错；不会后台下载依赖、假装启动成功或回退导出Markdown。

## 上游调研依据与后续集成

2026-10-22 只读检查官方源代码提交 `285540a4f178a840485bcc09b0cdb9bb0caa2ff2`：

- [项目README](https://github.com/genspark-ai/genoffice)与[CLI说明](https://github.com/genspark-ai/genoffice/blob/285540a4f178a840485bcc09b0cdb9bb0caa2ff2/packages/cli/README.md)：本地Docs/Sheets/Slides、Markdown/HTML编辑器，create/read/apply/check/render与MCP。CLI与编辑器共用引擎，部分命令依赖app renderer、jsdom、电子表格原生sidecar；复制单个入口不能成为完整离线集成。
- 根LICENSE为Apache-2.0并有NOTICE；ee目录及字体、依赖另有许可。此次没有复制/分发上游代码、资产或字体，没有更改本项目许可证。
- 原Web/Python中既有`local-runner/genoffice_adapter.py`保留，历史CLI验收不是本轮桌面原生验收。

下一轮优先：Mac真实GenOffice打开/保存/收回与用户模型生成验收；然后抽取上游可独立构建的编辑器/文档引擎，在权限隔离的内部编辑面板集成，纳入arm64离线依赖与许可清单。公式计算、分页、图表、修订与撤销需要其真实引擎，不用内容编辑表单冒充完整Office替代品。Quick差距继续见QUICK_GAPS.md。

## 验证范围

113项Node/JSDOM核心、6项真实Chromium、7项Python打包边界测试通过。新增8项编辑/GenOffice接续/权限/并发版本/故障测试；Chromium已有Office验收新增实际HTTP模型工具调用→生成文件卡片→DOCX导出→界面段落修改→再次二进制导出→刷新留存。

模型内容、原生IPC/审批及GenOffice启动/保存使用夹具。真实文件编解码、服务、HTTP请求、Chromium DOM交互和文件字节读写实际执行。没有Mac、真实付费模型、GenOffice原生GUI/CLI引擎或Microsoft Office兼容性验收。
