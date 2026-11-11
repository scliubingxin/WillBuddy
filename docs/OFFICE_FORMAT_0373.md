
最终检查：20项打包/更新器测试通过。两次独立私有目录完整离线重建均在rcodesign签Electron Framework临时文件时失败：binary parsing error: type is too big (171409408)，各次临时输入长度不同，根因未确定。未删除残留后重算清单，未绕过签名或修改Python/LO，不放行任何0.37.3应用包。最终ASAR/完整ZIP/MachO页/完整资源清单未通过本轮构建，不能借用0.37.2结果。保存0.37.3完整源码候选，不覆盖正式权威0.37.2/v43。下一轮应先复现临时文件解析并核对原始已签输入与临时输出，不能无证据重签或关安全机制。
实际修改：desktop/runtime/office-format.mjs（新）；desktop/runtime/office-kit/worker.py；desktop/services/office-workspace.mjs、office-chat.mjs；desktop/src/office/index.html；desktop/tests/office-format.test.mjs（新）、office-chat.test.mjs；desktop/package.json、package-lock.json；scripts/package-desktop-source.py、repackage-native-mac.py；迭代/差距/REA/下载/验证与发布状态文档。原Web/Python122保护文件SHA不变，无新生产依赖；旧35Python执行器未改未重跑。

# 0.37.3 Word选区字体与字号

从权威0.37.2/v43重取653内容文件逐SHA核验。实际新增office_format_selection模型工具：Word当前真实选区→单独原生确认→持久审计→固定UNO字体/字号命令→真实DOCX新版本/CAS。与文字替换共用每请求最多一次修改额度，不能混改两次；不开放任意UNO命令或参数。主服务与Python worker两层校验字体名80字符、无控制字符/路径字符，字号6–96pt、0.5pt步长；审批前后核选区/版本，过30分钟授权拒绝。审计不记录选区或参数正文。

本轮验证到的是西文字体属性ascii/hAnsi与字号。未设置eastAsia；不是中文字体或缺字修复，不捆绑微软雅黑等商业字体，不保证目标机器已安装指定字体。仅DOCX；Excel/PPT格式、表格边框、撤销状态、Finder关联和原生LO欢迎品牌仍待做。常规手工工具栏未新增字体输入框，仅现有Office AI对话可调用真实工具。

382项核心测试通过（较0.37.2新增3）；15项相关测试单独通过。实际本机HTTP模型夹具→真实LinuxLibreOfficeKit→保存DOCX→独立python-docx校验全部非空run字体Liberation Serif、18.5pt、文字保持，旧版保留。拒绝/旧选区/取消/审计磁盘失败不发布新revision。首次原型使用错误UNO参数名，独立DOCX断言失败拦下；按LibreOffice官方FontController参数CharFontName.FamilyName/FontHeight.Height修正后全部重测通过，不把命令回执当修改成功。1项生产Chromium真Kit手改/模型选区替换/保存/历史回归通过。IPC/审批/模型语义仍夹具；LinuxLODev26.8alpha不等于Mac包内26.8.1.1，未Mac/真实付费模型验收。

官方参数参考：https://docs.libreoffice.org/android/html/FontController_8java_source.html
Quick沿用docs/REA_FINDINGS.md既有公开包部分静态证据，无新Amazon运行结论。距完整Office替代仍有中文字体、复杂格式/对象、键盘IME与Mac安装签名差距。

GitHub0.37.2分支0ce6074已654文件逐SHA核验，但创建PR被自动审批额度故障阻塞，main仍0.37.1；本轮不重试或换路线绕过。用户持续发布授权有效，不缺权限确认。0.37.3新发布尚未执行，无新Release链接；安装故障、全量解压耗时未解决，不要求用户为提速重装。下一轮先Mac签名原始stderr/原文档CJK证据，再东亚字体与表格边框定向编辑。
