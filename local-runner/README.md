# 幕云AI 本地执行器（首版）

## 受限中文任务简报

任务台可将 1–10 条逐行编号的“标题：正文”编译为固定文档生成/渲染/预览/打包 DAG。计划保存原简报 SHA-256、条目数和边界提示；用户必须检查 JSON 并再次校验后才能执行，断点重试保留来源。说明行最多一行且须以冒号结尾；未编号补充、缺少分隔符、重复标题和超限文本会被拒绝。

这是确定性规则编译，不调用模型、不推断代码或外部操作，也不是多智能体自主规划。表格、代码、GenOffice 编辑或连接器动作仍使用各自明确入口和授权边界。

## 多批次公平调度

多个批次同时就绪时，执行器采用轮转分派：每轮先为每个批次安排一个任务，再用下一轮补齐空闲槽；全局只有一个槽时也会在批次间轮流。单批并发、预算、依赖和取消仍是硬约束。任务台显示公平分派次数，时间线的 started 事件保存排队时间和策略。这样避免一个含大量独立步骤的批次先占满全部线程，但不提供租户权重、任务优先级或跨主机队列。

## 运行预算

计划可在顶层声明 `policy`：`maxConcurrency` 1–4、`maxRunSeconds` 1–3600、`maxArtifactBytes` 1–500000000。执行器同时遵守启动参数的全局并发上限与单批上限；任务台显示当前时间/成果字节。超时或成果总量超限会停止未完成工作、把批次判为失败并跳过成果验收，不会把部分结果冒充交付成功。断点重试继承原策略，复用成果计入新批次预算。文档/表格规则计划默认并发 2、600 秒、200MB。

这是资源失控保护，不是 Docker 隔离、计费额度或远程多租户配额。每任务既有文件/数量限制仍独立生效。

## 断点重试

失败、取消或重启中断的批次会显示“重试未完成步骤”。重试创建新的 attempt，不改写原批次；已成功步骤只有在保存的完整性证据仍能通过时才复用，其余步骤按原依赖图重新执行，并重新运行成果验收。成功任务、仍在执行的任务、仅内容验收失败但所有步骤已完成的任务以及成果被修改的任务不会原样重试。该功能必须由用户明确触发，不会自动重放代码或外部操作。

## 成果验收

计划可在顶层添加最多 20 条可执行 `acceptance`：`artifact_exists` 检查唯一扩展名成果及大小，`text_contains` 检查安全文本中的精确内容，`json_equals` 按字符串/非负数组索引路径比较标量已知答案。所有标准只读取对应任务已经过 SHA-256 完整性验证的成果；不满足时任务步骤仍保留成功证据，但整个批次失败。任务台会显示逐项证据和原因。这个受限 DSL 不执行用户断言代码，也不等于语义质量评审。

新任务成功前检查实际文件并保存大小与 SHA-256；后续步骤、HTTP 下载和预览均先复验。任务卡可展开明细。缺失、空文件、目录/符号链接、跨任务路径或超过限额会失败，不接受伪造的任务 result。每文件 50MB、每任务 50 个文件/总计 100MB。旧任务没有证据，需重新运行后网页下载；本机原文件不会删除。这里只证明文件完整性，不证明内容正确，也不替代 Docker 隔离。

Office 编辑任务额外输出 `edit-checkpoint.zip`，其中保存编辑前文件及前后 SHA-256。安全恢复示例：`python3 local-runner/restore_checkpoint.py --checkpoint edit-checkpoint.zip --current 编辑结果.xlsx --output 恢复副本.xlsx`。恢复目标不能已存在，当前文件必须仍与该检查点的编辑结果一致；如有后续修改会拒绝恢复，原文件和当前文件都不会被覆盖。

GenOffice 接入：安装官方应用并确保 `genoffice --version` 可运行，必要时设置 `MUYUN_GENOFFICE_BIN` 为启动器绝对路径。本地控制台可创建/读取/编辑/检查 Office，云端页面只导出待审阅计划；文件上限 400KB，修改另存。普通单元格公式会经 GenOffice 原生引擎重新提交并刷新缓存；共享、数组、结构化或超过 1000 个公式的工作簿拒绝自动编辑。DOCX/XLSX/PPTX/PDF 的 `render` 操作由固定的 LibreOffice + Poppler 兼容性链路生成最多 20 页 PNG，报告明确引擎，不冒称 GenOffice 原生渲染。完整依赖、真实测试范围和安全边界见 `../GENOFFICE_INTEGRATION.md`。

本机任务台提供文档规则拆解、依赖图并发调度、日志、取消、重启中止、文件下载与逐页预览。独立任务默认并发 2，最多 4；父任务失败阻断子任务，不自动重试。记录在本地 SQLite，关闭网页后服务继续运行；关闭执行器会取消未完成任务。崩溃重启将未完成任务标为 interrupted，不重放代码。

## 安装与启动

Linux 或 macOS，Python 3.10+（仅标准库），LibreOffice、Poppler，中文字体 Noto Sans CJK SC。Windows 当前需 WSL2；其他平台未经本轮实际验证。`soffice`、`pdfinfo`、`pdftoppm` 必须在 PATH 中。macOS LibreOffice 可执行文件通常位于 `/Applications/LibreOffice.app/Contents/MacOS/soffice`，请自行将其所在目录加入 PATH。

可用 `MUYUN_LIBREOFFICE_BIN`、`MUYUN_PDFINFO_BIN`、`MUYUN_PDFTOPPM_BIN` 指定可信安装的绝对路径；这些变量由本机操作者设置，任务计划不能改变。预览使用隔离的 LibreOffice profile 和 HOME，固定转换参数，不接收任意命令。

```sh
python3 local-runner/server.py --concurrency 2
```

打开 `http://127.0.0.1:8765`。可用 `--port` 调整端口，`--data-dir /绝对路径` 指定数据目录（默认用户目录的 `.muyun-ai-runner`）。不要将该服务反向代理到公网；当前是单用户本机控制台，不是多租户远端服务。仅绑定回环地址，校验 Host、Origin 和随机会话头，不开放 CORS。会话只在当前服务存活期间有效。

## 文档生成与渲染

添加标题和纯文本正文，点击“拆解本批文档”，最多 10 份。每份生成 3 个依赖任务：固定 FODT 模板 → LibreOffice 生成 DOCX/PDF → Poppler 生成逐页 PNG；全部成功后再运行一个汇总任务，下载包含 Word、PDF、全部预览和 `MANIFEST.json` 的 ZIP。清单记录每个文件的来源、字节数与 SHA-256，ZIP 只使用受校验的任务 ID 和文件基本名，最多 50 个文件、50MB。校验后执行；任务卡片也可分别下载 Word/PDF 或查看全部预览。LibreOffice 每个任务使用独立 profile，避免并发串文档；只接收本程序转义生成的 FODT，不接受任意 XML、Office 上传、宏、URL 或原始 shell 命令。正文最多 4 万字符，预览最多 20 页；这是受控文档渲染子进程，不宣称为通用代码沙盒。

代码任务与文件生成任务可由 JSON 计划组合；`dependsOn` 指向先决任务 ID。自动规划目前只支持上述文档规则，没有模型自主拆解、工具循环或自动汇总多个代理答案。托管站点与本机通过计划 JSON 导出/导入衔接，尚未自动配对、同步任务、传送文件或共享云端模型密钥。

## 表格生成与渲染

本地任务台可批量加入 1–5 份 CSV，每份拆为 FODS 结构生成 → LibreOffice 转为 XLSX/PDF → Poppler 逐页 PNG，最后汇总为带 SHA-256 清单的 ZIP。CSV 最多 4 万字符、200 行、30 列；不规则行补空。有限十进制写成数值单元格，其余内容全部作为文本，`=1+1` 等公式样式输入不会生成活动公式。首行使用蓝色表头，数据单元格有边框，横向打印适配一页宽。

这是从用户粘贴的 CSV 生成新表格，不读取现有工作簿，不保留公式、图表、合并单元格、条件格式、图片或宏，也不是无损模板转换。复杂 CSV 方言、日期/币种类型推断、Excel/WPS 兼容性仍需单独验收。

## 代码沙盒

安装并启动 Docker（在个人电脑上通常为 Docker Desktop）。操作者自行预先安装运行镜像，执行器不会下载镜像或购买服务：

```sh
docker pull python:3.12-slim
docker pull node:22-slim
```

可用 `MUYUN_PYTHON_IMAGE` / `MUYUN_JAVASCRIPT_IMAGE` 环境变量指定已经安装的镜像；镜像必须含 coreutils 的 `timeout`，使执行器崩溃后容器仍受 30 秒限时约束。生产使用建议锁定镜像 digest。镜像名称仅由本机操作者配置，任务计划不能改变它。

每个任务独立容器：无网络、只读根、非 root 用户、移除 capabilities、no-new-privileges、1 CPU、256MB、64 PID、30 秒、日志 64KB。输入目录只读；临时工作盘 64MB；不挂载宿主用户目录、Docker socket 或密钥。Python 用 `-I`，JavaScript 用 Node；不允许指定任意启动命令。依赖结果 JSON 位于 `/input/input.json`；代码通过 stdout 返回结果，当前不导出容器内文件。超时或取消强制清理对应命名容器。

Docker 或镜像不可用时明确拒绝代码任务，绝不降级到主机执行、Node vm 或普通子进程。Docker 仍共享内核，不等同于高保证多租户虚拟机；本版本适用于可信本机操作者，敌对多租户部署需额外 VM/沙盒安全评审。

## 验证及许可证

`python3 tests/local-runner-test.py`：真实调度、取消/阻断、重启恢复、HTTP 边界与命令构造测试。`python3 tests/local-runner-live.py`：真实 LibreOffice 两份中文文档并发生成/渲染。`python3 tests/local-runner-spreadsheet-live.py`：真实生成两份 XLSX/PDF、解析已知答案、确认零活动公式、渲染全部页面并校验成果包。两组均不调用模型。`python3 tests/local-runner-docker.py`：需要 Docker 和两种镜像，真实验证代码、断网、只读根、超时和输出限制；环境缺失返回非零，不伪报通过。全量自测入口包括本地执行器的确定性回归；真实 Office/Docker 验收需单独记录。

LibreOffice 作为独立安装的可执行程序调用，不复制或打包其源代码/二进制。已阅读 [官方仓库](https://github.com/LibreOffice/core)、[COPYING](https://github.com/LibreOffice/core/blob/master/COPYING) 和 [CLI 参数](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html)。分发 LibreOffice 二进制时需保留对应版本许可证和源码获取说明，本包不承担该分发。参考 Harness 架构但未复制其实现。
