
最终离线核验：483219295字节，SHA4728e067d4ddf214c5d49edbffdfc16e5ef3d52e1b7afa38ced380b47cc6048b；ASAR6b1044e93f341ec8e28e32f84cf504aeec91233549e43cfb9b8e12d4744cf131与153生产文件及最小package逐字节一致，无hostpyc；278可运行MachO/93545代码页，20727应用条目+5配套/47链接，零残留/闭合CRC/实际Electron页篡改负例通过。相比0.37.7载体仅Info.plist/Electron/app.asar/CodeResources四条目改变，Python/LO原字节/模式/链接不变。407核心/6Chromium/26打包通过后生成完整源码；权威替换将使用本轮观察的expected_current_version=46保护，是否保存和远端回读成功以包外最终回执为准，不预写成功。GitHub仍无本轮上传/PR/main/Release。

# WillBuddy 0.37.8 · 共用Office内核导出PDF

## 实际变化

从当前权威0.37.6/v46重取678内容SHA，并从已保存0.37.7候选重取684内容SHA后接续。保留0.37.7真实Word键盘选区，不从旧main或scratch退回旧代码。

Apple芯片安装版的Office预览改用同一LibreOfficeKit适配器，编辑和PDF转换共用main中的officeRuntime工厂及runtime/office-kit.mjs。新增无Electron的runtime/office-pdf.mjs，真实读取私有DOCX/XLSX/PPTX副本，经固定saveAs(pdf)写到私有output/document.pdf，再经服务读取上限、PDF头和文档版本核验，交给原有离线PDF.js分页。没有截图代替PDF或XML文本代替渲染，没有新增占位入口；生产成果“预览”直接使用新链路。原CLI转换保留为没有配置pdfRuntime的显式开发/兼容路径，安装版Kit失败不会自动重放/改走CLI。原独立窗口编辑、历史、文档AI、字体/外框和所有其他能力保留。

worker只允许无参数export_pdf，固定目录/文件/格式；拒绝额外路径参数，不暴露任意导出路径/UNO/脚本。主服务仍最多2个预览、整体60秒（覆盖准备/运行时解析/启动/导出/回读），16MiB输出；PDF页数/像素仍受原renderer限制。16MiB为导出后回读门禁，并非OS磁盘配额。输入沿原ZIP/XML/宏/外链/4MiB门禁，最高宏安全私有profile，无共享cookies/账号或TCP监听。程序仍以当前OS账号运行，非OS沙箱。

startOfficeKit新增AbortSignal与closed生命周期：启动前及复制worker后重查取消，等待ready或执行期间取消会杀掉自有进程、拒绝挂起请求并等待退出；预览适配器对迟到runtime/driver也立即拒绝并关闭迟到driver，停止/超时/退出不发布成功PDF，也不自动重试。成功后同样结束临时worker。新增PDF回读后的当前版本/SHA和取消再检查，避免读取期间并发改动返回旧结果。无持久数据迁移、新安装依赖或第三方许可变化。

## 证据与上轮阻塞边界

本轮全新取回源码后，**未修改前**的原生CLI三格式用例通过（19.2秒），之前的XLSX→PDF卡住在当前环境未复现。因此不能把它归因为确定的源码缺陷，也不能宣称旧CLI卡住根因已修。strace诊断因PTRACE_TRACEME Operation not permitted被宿主阻止，未提权绕过。新Kit导出路径真实成功；选择共用内核是本轮实际架构/功能增量，不是把旧失败测试删除或改成跳过。

407项核心完整串行通过，原CLI三格式测试保留并通过；新增7项PDF/生命周期测试单独通过。真实LinuxKit输出Word、两表Excel、两页PPT的PDF，pdftotext独立核对两表文字/600/900和两张幻灯片，原文档bytes/revision不变、私有任务目录清空。另验证双容量/取消释放、迟到driver只关闭不导出、版本漂移/非法PDF/链接输出拒绝、真实已ready Kit取消退出、无ready协议进程夹具的启动取消/超时无活进程遗留、预取消不启动、退出时runtime迟到不启动。启动未ready测试为真实进程协议夹具，不是Mac或LibreOffice初始化卡住的实测。

6条真实Chromium路径通过：新生产文档页→双表Excel→真实Kit PDF两页→opaque分页/提取文字→服务提交v2后重开真实750而非600、额外网络0、子帧无原生桥；保留精准选词→HTTP模型夹具→真实Kit→DOCX字体、CJK字体、Undo/Redo、Word外框及离线CID中文PDF回归。首次新PDF测试locator(details)匹配两页而报严格模式错误，改为读取全部页文字后重跑6条通过，没有放宽内容断言或声称修复生产问题。26项打包与真实文件系统事务测试通过。122个原Web/Python保护文件SHA不变，旧35Python执行器未改未重跑。

真实传输/进程/二进制文档/PDF与生产浏览器执行，模型语义/原生IPC/审批/Keychain仍夹具。LinuxLibreOfficeDev26.8.0.0.alpha0 build2c87e51eeaa2b413ff4ae097b2705eea1995d8e5不同Mac包26.8.1.1；无Mac原生Kit初始化/签名/Gatekeeper/字体/IME或真实付费模型验收。不把PDF.js中文资源回归等同原生Kit字形修复，不保证复杂Office任意保真或完整Office替代。

## 交付、参考与下一轮

离线构建使用已逐字节/页/清单核验的0.37.7候选ZIP作为静态运行时载体，固定SHA084c3d65b12304b4f0240f180f8733e26db205eda3f2cc11a43c5efe66b478ef；这不把历史失败候选追认为已发布版本。应用源码完全更新为0.37.8，原Python/LO运行时逐项保留，只有完整静态/ASAR/闭合ZIP检查通过才交付。仍ad-hoc未公证，没有新小更新/DMG/PKG，安装耗时和历史异常截断临时副本来源未解决，不要求为提速反复重装。最终构建摘要见validation/v0.37.8.json，保存回读以包外最终回执为准。

2026-10-30复查Quick官方系统工具页 https://docs.aws.amazon.com/quick/latest/userguide/system-tools-desktop.html 及 https://quick.aws.com/sn ，REA复用已有公开包部分静态证据，无新Amazon原生运行结论。LibreOfficeKit转换/固定C API参考 https://docs.libreoffice.org/libreofficekit.html 及 https://docs.libreoffice.org/desktop/html/init_8cxx.html ，不复制分发上游实现/资产。

GitHub只读main仍27bd38f6b43806fb702c62ec4586426730b8190a，0.37.2分支0ce607437ef2c7814b295b43ec7b4ccd3c0b4a42。此前创建PR自动审批服务额度故障提示Nov2恢复；本轮未到时点，按用户要求不重试、不改插件/CLI绕过。长期每轮通过后分支/PR/main/Release授权有效，无新确认要求；本轮无GitHub上传/PR/main/tag/Release，不假造链接。

下一轮优先Mac原始codesign stderr/内置Python和Kit真实预览/编辑/IME/实际模型验收；无机器继续Word内部网格/单边和Excel/PPT受控选区编辑。跨Web完整业务核心、OAuth/stdio、自主并行任务组、完整Office对象/图表/修订和OS隔离仍差距。旧CLI未复现并不消除稳定性调查，保留原失败记录，不删除失败候选或旧下载。

实际代码变更：desktop/main.mjs共用officeRuntime；runtime/office-kit.mjs取消/退出、runtime/office-kit/worker.py固定export_pdf；services/libreoffice.mjs预览分支/全程时限/回读guard；新增runtime/office-pdf.mjs、tests/office-pdf.test.mjs、tests/acceptance/office-pdf-kit-live.mjs；package/lock版本、scripts/repackage-native-mac.py载体pin及日志/差距/下载/发布/验证记录。README保持产品重点，品牌/白蓝主题/旧加密身份不改。
