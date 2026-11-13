完整树验证补记：Linux 实际解压旧应用完整目录，使用 cp -a --reflink=auto 克隆并应用候选补丁；结果与目标包 20727 个应用文件逐项 SHA-256、模式、符号链接完全一致，原始树保留为备份。codesign 和 macOS APFS 原生门禁仍为模拟，不能由此推断 Mac 验收或安装耗时。

实包验证：从旧完整 ZIP 提取四个真实基线文件，用候选小包在 Linux 临时目录更新后，目标三个文件 SHA 与新完整 ZIP 一致，备份四文件 SHA 与旧版一致；签名门禁和 APFS 克隆以模拟替代，运行时用标记文件模拟，未解压并克隆整套应用。新增测试 3 项，连同旧更新器 7 项共 10 项通过。

## 2026-11-12 · 精确候选构建的小更新（未发布）

针对网络慢和重复下载完整运行时，新增仅适用于两个精确 0.37.26 候选构建的小更新生成器和安装脚本。输入完整 ZIP 的 SHA-256 固定，打包前校验闭合清单，只允许 Electron、app.asar、CodeResources 三个文件变化；20,724 个应用条目不变。更新器除了版本还固定原 Info.plist、Electron、app.asar 与 CodeResources 四项 SHA，并固定目标三项摘要和权限；保留原及候选 deep/strict codesign、APFS 克隆、备份回滚、超时和日志。运行端无需 npm/pip。

该补丁仅适用于此前 draft 候选（app.asar SHA 9749e55d...）到 draft-generation 候选（23897d9b...），不适用于其他同版本构建；用户现有安装版本未知。此前用户报告 codesign 失败，根因未确认，本轮不声称解决或加快 Mac 安装。Linux 文件系统测试使用模拟签名/克隆，Mac codesign、APFS 和真实安装未验收。旧离线应用未更改。

源码修改：scripts/package-draft-generation-update.py、desktop/installer/update-draft-generation.py、desktop/installer/Apply-Draft-Generation-Update.command、scripts/tests/test_draft_generation_update.py。下一步在 Apple 芯片真机收集原始签名日志、检验旧构建身份及更新/回滚；继续 Office 编辑与用户文档验收。

