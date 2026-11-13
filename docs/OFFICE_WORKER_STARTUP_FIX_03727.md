修复包补记：从实际候选安装包提取 ASAR，Electron 42（Linux，ELECTRON_RUN_AS_NODE）加载真实包中的 Office 模块、启动真实 LibreOfficeKit 并渲染 Word；164 个可比较应用源码与 ASAR 字节一致。两个旧 0.37.26 候选到 0.37.27 只改 Info.plist、Electron、app.asar、CodeResources；新增约7.2MB双基线修复补丁。仅接受两个指定旧构建，每个基线固定四文件摘要，目标固定四文件摘要与权限；保留原始和目标 codesign、APFS 克隆、回滚。11 项更新器测试通过，真实两个旧 ZIP 的四个文件经更新后与目标 SHA 一致；Linux 的签名与 APFS 为模拟。用户当前安装构建未知，其他版本不匹配会停止；之前 codesign 失败根因未确认。尚无 Apple 芯片 Mac 原生启动/签名/安装结论。

## 2026-11-12 · 0.37.27 Office 启动故障修复候选

用户截图报告临时 worker.py 首行出现语法错误，Office 内核退出。检查当前候选源文件和上轮应用 app.asar 均为正确的 Python；Linux Electron 42 对同一 app.asar 的 fs.promises URL 读取与 ASAR 解包字节均一致，因此尚不能确定用户 Mac 现场的错误来源，未宣称完全修复。用户原始截图和路径不收入源码。

将权威 worker.py 与 ABI.json 在构建时生成 JS 数据模块，由已有模块加载链路提供完整内容；启动前验证内嵌内容 SHA-256、私有目录独占写入后再回读核对 SHA-256，校验失败拒绝启动。打包前执行生成物与源文件一致性检查，防止 Worker 后续修改与内嵌副本漂移。用户数据、审批和原有身份保持。修改 desktop/runtime/office-kit.mjs，新增 desktop/runtime/office-worker-bundle.mjs、scripts/bundle-office-worker.py、desktop/tests/office-worker-materialization.test.mjs、desktop/tests/native/office-worker-asar.mjs，scripts/repackage-native-mac.py 增加构建前一致性门禁。

7 项 Office 测试通过，包括真实 Linux LibreOfficeKit Word/Excel/PPT、写入损坏拒绝与不覆盖已有文件；13 项构建/更新器测试通过。另以真实 Linux Electron 42（ELECTRON_RUN_AS_NODE）从测试 ASAR 加载生产代码，启动 Python Office worker 并渲染 Word；不是 Electron GUI、Apple 芯片或 Mac 原生验收。Mac 运行、签名、公证、用户现场根因及真实文件尚未验收。原 GitHub 版本分支缺失文件，安全审查拒绝仍未解除，未 PR/合并/发布。下一步在用户 Mac 验证启动并定位原现场数据。

