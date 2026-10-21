# 幕云AI · OpenWorkBuddy 参考与边界

检查日期：2026-09-21。官方仓库 https://github.com/CatCatUncle/openworkbuddy ，参考提交 `1a88f5839f8086fda76d220bff3ae22405ec3df9`。阅读 README、LICENSE、LICENSE-ECOSYSTEM.md、COMMERCIAL-LICENSE.md 及 goal.js/checkpoints.js/lanes.js 的相关设计。

主项目采用 PolyForm Noncommercial 1.0.0；只有 LICENSE-ECOSYSTEM.md 指定的部署、脚本、评测等部分额外采用 MIT。核心代理、前端等不在该 MIT 清单内。本轮没有复制、引入或分发其代码、资产或品牌，也没有添加该项目依赖；只参考用户体验目标，在幕云AI原有 Python 执行器上独立实现。

| 参考方向 | 幕云AI本轮落地 | 边界 / 后续 |
| --- | --- | --- |
| 目标必须有验收证据 | 成果非空、当前任务归属、路径约束、字节数与 SHA-256 持久化；未通过则任务失败并阻断依赖 | 当前是文件完整性，不是语义质量或模型自评 |
| 用户能看到真实成果 | 本机任务卡展开校验明细，下载前复验并发送同一份已验证字节 | 必须更新本机执行器；网页无法远程启动本机 |
| 依赖与并发工作 | 保留现有 1–4 并发 DAG，新增前置成果复验 | 仍为规则计划，未新增 AI 自主拆解 |
| 文件检查点 / 可回退 | Office 编辑保存编辑前原件和前后哈希；恢复只写新文件，当前文件有后续修改时拒绝 | 当前覆盖 DOCX/XLSX/PPTX 的 GenOffice 编辑，不覆盖任意目录或代码文件 |
| 技能 / 多引擎 / 目标循环 | 暂未接入该项目实现 | 后续独立设计受限工具接口、预算与可复现目标验收，再做真实模型测试 |

## 可复现验收

1. `node scripts/self-test.mjs`：全应用回归，外部模型和连接器模拟；本轮 357 + 26 项断言、22 项 Python 测试。
2. 配置已安装的 GenOffice CLI 路径（见 GENOFFICE_INTEGRATION.md），运行 `python3 tests/genoffice-live.py outputs/your-new-acceptance-run`。
3. `python3 tests/artifact-integrity-live.py outputs/your-new-acceptance-run`：重启读取真实成果，验证 37 个受保护 HTTP 下载，测试同大小篡改、删除拒绝以及恢复下载。只用于脚本生成的测试数据。
4. 文档和表格原有真实链路分别用 `tests/local-runner-live.py`、`tests/local-runner-spreadsheet-live.py` 运行；两者本轮各 7 项任务通过。

证据：`tests/acceptance/openworkbuddy-integrity-2026-09-21.json`。不是 OpenWorkBuddy 或 Quick 同任务对照试验，不宣称超越它们。生产浏览器、Docker 真实隔离、Office/WPS 与 GenOffice 原生渲染仍未验收。
