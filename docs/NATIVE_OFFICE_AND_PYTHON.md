# 内置 Python 与 LibreOffice

Apple 芯片离线包内置 Python 3.12.16（python-build-standalone 20261026）、LibreOffice 26.8.1.1 和 20 个锁定 Python 包，包括 skills-runtime-sdk、python-docx、openpyxl、python-pptx、Pillow、lxml。首次使用不运行 npm/pip，不向用户要求另装 LibreOffice/Python。第三方代码、许可证和对应源码地址随运行包保留；源码 ZIP 提供打包脚本、依赖锁和上游校验和，不重复放入大型上游二进制。SDK 已随包提供，但技能调用协议仍为 WillBuddy 现有受控脚本协议，不等同于完整 SDK actions 集成。

安装版的 Python/Office 固定解析包内路径，缺失或不支持架构时明确失败，不降级到未知系统软件。源码开发环境保留旧工具和 JS 预览路径。`scripts/prepare-native-runtimes.py` 仅在构建机下载完成后校验和解包；跨平台 wheel 哈希锁定并离线安装。`scripts/package-offline-mac.py --native-runtimes PATH` 才能生成新的完整包。electron-builder 同样要求根目录 native-runtimes，缺失会失败。

## Office 使用

安装版默认：真实 Office 字节 → 既有宏/外链/ZIP/XML门禁 → 私有临时副本 → LibreOffice 独立配置的 headless 转换 → PDF → 无网络、无原生桥的 PDF.js 沙箱分页显示。最多两项转换，60 秒进程、16MiB PDF、100页、每页800万/总8000万像素。保留当前版本/SHA核验，失败不改文档。关闭前端预览会释放帧；已提交的转换仍有服务端60秒上限，不宣称即时终止。

“LibreOffice 编辑”打开**随应用内置的独立原生窗口**，不是完整编辑器嵌入 Electron 内容区。可编辑文字、公式、表格、图片及排版。保存并退出 LibreOffice 后回到 WillBuddy 点击“收回编辑结果”，经过二次批准、原版本冲突保护、输出复读和 Office 格式门禁后保存新版本，原件及前版保留。最多两份编辑副本；应用正常退出前提示未收回编辑。崩溃后的临时副本恢复界面尚未实现，不宣称编辑会话持久恢复。宏安全等级设为最高；不是操作系统沙箱，内置编辑器仍有当前账号权限。收回仍受4MiB单文档/16MiB文档空间限制。

PDF 分页预览可查看每页提取文本，**尚未接入旧 DOCX DOM 选区到 OOXML 的坐标映射**。旧源代码开发预览/选区链路保留；下一步是 LibreOfficeKit/UNO 原生编辑与选区适配，不能把打开原生窗口称为同面板 WYSIWYG 已完成。

模型新增 `document_insert_image`：只能使用本轮明确附加的已有本机 PNG，将真实图片追加到普通 DOCX 正文末尾。逐次审批、文档版本与图片 SHA 再验证，原段落/其他部件保持；画布文档、已有选区范围内插图、任意锚点环绕暂不支持。没有图片时不生成假图片、不自动下载外部素材。

## 验收边界

实际 Linux LibreOfficeDev 26.8 alpha 处理合成 DOCX（含图片）、XLSX、PPTX并生成 PDF；真实 Chromium 生产界面渲染 PDF、原生编辑启动夹具→真实字节修改→回收新版本。原生启动、IPC、批准和模型语义仍为夹具。包内 Mac LibreOffice 26.8.1 与 Python arm64 不能在 Linux 直接启动，尚未 Mac 原生导入/排版/Keychain/启动验收，未验收 Word/WPS 像素保真。

外壳与 Python 使用 ad-hoc 签名；LibreOffice 原厂二进制和签名原样保留，不用通用签名工具重写其中的链接目标文件。校验全部运行时代码页及 ZIP 字节、链接和执行位；不是 Apple 信任链、macOS codesign 深严格资源封印或 Gatekeeper 结论。整体应用未 Developer ID 签名/公证，不移除隔离或关闭保护。Git/Codex/Ollama、未列入锁文件的 Python 模块仍属可选外部能力。
