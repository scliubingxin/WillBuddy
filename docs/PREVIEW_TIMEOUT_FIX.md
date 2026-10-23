# 0.17.0 修复安装包内 Office 预览无法启动

用户报告：2487字节XLSX等待后显示「预览超时」。这是组件加载问题的信号，不能让用户反复拆分小文件。本轮优先修复这条链路；此前规划的缓存/图片定位没有列为本轮完成项。

## 复现和实际修复

真实 Electron42/Linux 虚拟显示环境，file://宿主、sandbox=allow-scripts隔离子帧、既有预览引擎：旧file://路径5秒仍未出现office-ready（ready=false）；新应用内协议约134ms完成同一合成XLSX。不是只在HTTP服务器上测试，也未通过放宽webSecurity/CSP、移除sandbox或开启Node来规避。

`main/preview-protocol.mjs` 启动前注册standard/secure的willbuddy-preview协议；app就绪后只映射src/preview/index.html和engine.js两个固定资源。启动一次读取引擎并核对PREVIEW-MANIFEST的SHA与长度；未知主机、端口、用户信息、查询、路径、方法拒绝。不是文件系统代理，不接受用户路径或提供用户数据。关闭bypassCSP/fetch/ServiceWorker权限，保持限制性CSP/no-store/nosniff；主页面仅增添精确frame-src willbuddy-preview://local，不开放网络。

安装包file://主页面使用应用内协议，HTTP开发页面继续用本地相对地址。子帧仍是opaque origin，无same-origin、preload、Node或IPC桥。现有原生IPC registrar仍仅接受原主页面sender/mainFrame/entryURL；并不授权预览页面调用原生业务。文件仍按版本与SHA校验后只读传入。

加载状态区分「组件启动」与「文件校验/渲染」：5秒没握手即说明文件尚未开始渲染，握手后15秒渲染限时；提供显式重新加载，使用新token和新帧，关闭后迟到响应不生效。不自动重放工具、CLI或审批。About版本从app.getVersion读取，修复历史固定0.10.1。

## 验收与复现

- 173核心（新增4）：固定资源边界、篡改引擎、file宿主路由、伪造消息/取消后迟到、阶段超时/手动重试。修正0.16源码中经格式化后失效的静态正则测试，采用真实JSDOM桥行为验证；不把旧正则测试失败称生产安全失效。
- 12条真实Chromium回归与9项打包测试。
- `tests/native/preview-electron.mjs`：实际Electron旧file路径失败/新协议成功对照。
- `tests/native/production-preview.mjs`：实际生产HTML、preload、IPC registrar、service、真实三种Office二进制，分别源码与交付ASAR加载；ASAR测试还通过WebFrameMain读取子帧ready/正文及确认无actwill/require。合成XLSX/DOCX/PPTX单次约165/181/198ms，仅为本容器小文件样本，不承诺用户机器或大文档速度。
- 68个生产文件与ASAR逐字节一致，arm64运行时官方SHA/ZIP/代码页/链接/执行位门禁沿用。

开发机已安装依赖后：`npm run test:preview-native --prefix desktop`；对照测试为test:preview-transport。Mac CI新增原生预览门禁，workflow_dispatch手动运行，本轮没有运行Mac CI。Linux虚拟显示测试环境依赖仅用于开发，不随应用分发；root容器的--no-sandbox仅为测试启动参数，生产配置保持sandbox/webSecurity。

## 仍未验收和下一步

不是Mac真机、付费模型、Word/Excel/WPS显示兼容、Developer ID/公证/Gatekeeper结论。仍是ad-hoc arm64候选。用户截图中的8轮模型上限为另一问题，本轮未调整Agent执行上限。原GenOffice子引擎、编辑与生成、多任务、Web/Python、用户身份和白蓝logo保留。

复杂图表/条件格式/字体/分页，以及预览状态刷新后的滚动保持仍待完善；Excel图片当前仍为0.16的集中示意显示。本轮没有把丢失的未发布缓存/图片实现当成已经完成。Quick/REA复用已有公开证据，未新增Amazon原生运行结论。

协议参考（2026-10-23核对）：https://www.electronjs.org/docs/latest/api/protocol 。
