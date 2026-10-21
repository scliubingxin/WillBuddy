# 幕云AI · GenOffice 集成说明

## 本次交付

2026-09-20，首版采用本机 CLI 适配，不是把整个 Electron 桌面套件嵌入 Cloudflare Worker。网站可准备操作计划，独立本地任务台实际执行，按 DAG 管理依赖、取消、日志和文件下载。聊天回复新增 Word / PowerPoint / 打印 PDF 下载，检测到规范 Markdown 表格时提供 Excel 下载及多表选择；这部分沿用幕云AI 原有导出引擎，不冒称由 GenOffice 生成。回复下方另可导出 GenOffice Word/Excel 计划。

GenOffice 需要在用户电脑安装。网站下载 JSON **不等于文档已经生成**；计划导入本机、校验、明确提交后才执行。没有自动云端配对、没有模型自主工具循环，没有将 API Key 传给 GenOffice。

## 依赖与授权来源

- 上游：[genspark-ai/genoffice](https://github.com/genspark-ai/genoffice)，源实现参考提交 `316ded6f0a39235fec8d21c068d8a0766ee6172b`。
- 已阅读根 LICENSE（Apache-2.0）、NOTICE，以及 `packages/cli/README.md`、create/资源定位/文档与表格实现。
- 真实验收使用官方 Linux 包 `v0.10.639`，CLI 显示 `0.10.0`。deb SHA-256：`33ac55225349a08c220474692cc05c3e45a81a8f6bc8f72312696736547da249`。
- 本仓库为独立编写的协议/命令适配器，不复制或分发上游源码、字体、第三方依赖或可执行文件。安装应用时保留其 LICENSE、NOTICE 和第三方声明。不要把 GenOffice 品牌替换为本产品作者声明。
- 上游 CLI 规范：[官方说明](https://github.com/genspark-ai/genoffice/blob/main/packages/cli/README.md)。完整应用、表格 sidecar 与 GUI 渲染器依赖分别独立；不能仅靠一个命令在 PATH 就宣称所有功能就绪。

## 安装与操作

1. 从官方 Releases 安装适合本机的 GenOffice，确认 `genoffice --version`。
2. 解压幕云AI 源码，用 Python 3.10+ 启动：`python3 local-runner/server.py --concurrency 2`。
3. 如命令未加入 PATH，先将环境变量 `MUYUN_GENOFFICE_BIN` 设置为实际 `genoffice` 启动器的绝对路径。不要指向任意 shell 指令串。
4. 打开本地任务台 `http://127.0.0.1:8765`，检查 GenOffice CLI 状态。
5. 在网站或本地任务台选择操作，填写正文/JSON 或上传文件；网站生成的计划需导入本地任务台，校验并提交。
6. 下载成功任务的文档和 `genoffice-report.json`；后续操作可以使用一个前置文档任务为输入。

创建 Word 输入 Markdown；创建 Excel 输入二维 JSON 数组或 `{sheets:[{name,rows}]}`，显式以 `=` 开头的单元格可能作为公式执行，必须审阅。聊天表格导出的计划会为公式样式字符串加单引号。PPT 创建和编辑采用上游 ops；使用 `genoffice guide docs / sheets / slides` 查看准确结构。所有编辑以副本输入、另存输出，原上传文件不会被覆盖。

可选环境变量：`GENOFFICE_APP_BIN`、`GENOFFICE_NODE`、`XLSX_SIDECAR_PATH`、`GENOFFICE_PDFIUM_WASM` 只用于已安装程序的定位；普通安装通常不需设置。没有新增云端 secret、依赖锁变更或 D1 迁移。回滚网站不删除用户电脑的本机数据，回滚本机执行器前先停止并备份数据目录。

## 验证状态和限制

| 操作 | 本轮证据 |
| --- | --- |
| DOCX 创建、读取、追加编辑、检查、结构查询、转 Markdown | 真实官方 CLI + 本机受保护 HTTP + DAG 通过 |
| XLSX 创建、读取、检查，普通无公式工作簿编辑 | 真实 CLI 通过；新建 SUM(12,23) 的结果为 35；普通单元格改为 20 后读回一致 |
| PPTX 创建、读取、添加文本编辑、布局检查 | 真实 CLI 通过，重新解包验证新增中文文本 |
| 修改已有普通公式工作簿 | 先修改编辑副本，再提取普通公式并通过 GenOffice 原生 `sheet apply --cells` 全量重提交；同表 SUM 从 35 刷新为 43；跨表 SUM 从 35→43、引用乘法从 24→40，均为真实 CLI 结果 |
| 公式重算审计 | 报告记录公式数、涉及工作表、缓存变化总数和最多 100 条 `{sheet, cell, before, after}`；公式集合改变或重算后缺缓存即不交付 |
| 共享、数组、结构化或大量公式 | 为避免破坏 OOXML 公式语义，检测到公式属性、空公式体或超过 1000 个公式时失败关闭；原上传文件不覆盖 |
| Office 逐页预览 | GenOffice 生成并编辑的 DOCX/XLSX/PPTX 在同一受保护 DAG 中交给 LibreOfficeDev 26.8 转 PDF、Poppler 26.05.0 生成 PNG；三种格式各 1 页，下载字节、PNG 文件头、页数和报告引擎通过，三页逐页检查中文可读、无裁切重叠 |
| GenOffice 原生 render、PDF 转换/OCR | 未执行真实验收；当前 `render` 明确是 LibreOffice + Poppler 兼容性预览，不称为 GenOffice 原生渲染 |
| 生产浏览器、Microsoft Office、WPS、跨平台 | 未验证 |

只支持可信文档，不是通用不可信文件沙盒。上传内嵌计划的文件上限 400KB；Office ZIP 元数据限制 2,000 项、解压声明总大小 50MB，并拒绝宏与异常路径。单个任务 120 秒、输出日志 64KB、最多 20 个 PNG、单文件 20MB。CLI 固定参数无 shell；不开放 open/search/image/media 命令；设置 GENOFFICE_ALLOWED_ROOTS 为本任务目录，隔离 HOME、认证和用户配置，不继承云密钥或一般环境。预览子进程同样使用环境白名单、独立 HOME 和 LibreOffice profile。部分运行器变量按允许列表传递。它不是操作系统隔离，防不了未知文档解析漏洞。

## 重现测试

```sh
node scripts/self-test.mjs
python3 tests/genoffice-live.py outputs/genoffice-preview-acceptance-new
```

输出目录必须不存在，避免旧成果混入。第二条需要真实 GenOffice、LibreOffice、Poppler 和中文字体，会在同一流程产出三页 PNG，必须逐页人工/视觉检查。缺依赖时失败，不使用假文件替代。普通完整回归有独立的适配边界模拟测试，不能把它算作真实 GenOffice 服务验证。

下一步：扩大常用函数、错误值和大型工作簿样本，完成 GenOffice 原生渲染、受控自然语言编辑规划与身份合法的生产用户流程；在完成前不宣称全套 GenOffice 功能已集成或已超越 Quick。
