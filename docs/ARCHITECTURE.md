# 0.10.0 文档服务扩展

`runtime/documents.mjs` 负责有界OOXML/UTF-8生成、导入检查和定向修改；`runtime/vendor/` 是构建时预打包的纯JS编解码器与许可。`services/documents.mjs` 管理文档版本、单次候选凭证、串行乐观提交和持久化回滚，不依赖Electron。`main/document-files.mjs` 只处理原生对话框授权路径的有界导入与暂存导出，渲染进程和模型不能指定任意路径。`ToolRuntime` 将document工具接入既有逐次原生审批/审计；`src/ui/documents.js` 是纯视图。普通state不暴露二进制，正文读取模型另行审批。documents是schema1增量字段，旧Web/Python/密钥身份不变。

前端pending和草稿按chatId保存，移除全局阻止新建/切换的门禁，后台仍采用现有两名额shared run queue；CLI独立FIFO未改变。不是自动子任务树或全局exactly-once。详见OFFICE_WORKSPACE.md。

0.9.0：runtime/run-queue.mjs负责对话与每日任务持久受理/并发/去重/取消/事件；services/conversation与tasks仅保留业务流程，main组装注入。src/ui/runs.js纯队列视图，重启迁移与状态版本拒绝过期覆盖。CLI仍是独立队列，共享active容量。见 SHARED_RUNS.md。

0.8.0：新增无Electron的 services/commands.mjs 管理手动CLI持久队列与版本化状态事件；runtime/tools.mjs增加审计关联、输出检查点和持久化门禁；src/ui/commands.js为独立纯队列视图。详情见 DURABLE_COMMANDS.md。原Web/Agent/每日任务尚未共用此队列。

0.7.0 新入口：runtime/model-stream.mjs 为 SSE 传输模块；services/conversation.mjs 保存增量检查点并向主进程发出 stream 事件；src/ui/markdown.js 统一安全 Markdown/HTML。离线第三方渲染模块在 src/vendor，更新脚本 scripts/vendor-desktop-renderer.mjs。详见 STREAMING_AND_RENDERING.md。

# WillBuddy 项目导航与模块边界

本次整理版本：0.6.1。先拆职责与建立可测试接口，不搬动仍被 Web 构建、迁移和历史数据使用的目录。

| 位置 | 负责什么 | 修改入口 |
| --- | --- | --- |
| `app/`、`lib/`、`components/`、`public/` | 原 Web 系统，保留既有服务与页面 | Web 页面或服务改动先查看相邻代码 |
| `local-runner/` | 原 Python 执行器 | `server.py` 与该目录说明 |
| `desktop/main.mjs` | Electron 组装、窗口/菜单/快捷键、秘密存储、系统文件对话框、服务注册 | 系统集成与应用生命周期 |
| `desktop/main/` | 原生平台适配器：可信 IPC、串行确认框 | `ipc.mjs`、`approval.mjs` |
| `desktop/services/` | 不依赖 Electron 的业务用例 | 对话、任务、工作空间增删、中断恢复、输入校验 |
| `desktop/runtime/` | 模型工具循环、浏览器/DOM、CLI、授权审计、历史身份 | `agent.mjs`、`tools.mjs`、`browser*.mjs`、`command.mjs` |
| `desktop/core.mjs` | 现有持久化、文件授权/读取、模型协议、每日调度函数 | 保留原路径，避免破坏消费者 |
| `desktop/preload.cjs` | 最小白名单原生桥 | 新 IPC 必须同时核对来源校验与允许接口 |
| `desktop/src/app.js` | 界面状态、用户事件与原生桥调用 | 不在视图模块中直接调用原生桥 |
| `desktop/src/ui/` | 纯 Markdown 与任务/成果视图 | `markdown.js`、`workspace.js`；输入快照，输出 HTML |
| `desktop/src/*.css`、`assets/` | 样式与现有蓝红品牌资源 | 白底 #FFFFFF，主蓝 #0078CB |
| `desktop/tests/` | 业务、权限、协议、CLI、模拟桥 UI 回归 | `services.test.mjs` 覆盖本次拆分 |
| `desktop/tests/acceptance/` | 真实 Chromium 浏览器/工作区验收 | 原生桥和模型仍是确定性夹具 |
| `desktop/installer/`、`scripts/` | arm64 安装与源码/离线包构建校验 | 两种打包路径都必须收录 main/services/src/runtime |
| `docs/validation/` | 逐版实际验证范围 | 查看相应版本 JSON |
| 根目录 `ITERATION_*`、`RELEASE_STATUS.json` | 接续计划、历史与发布边界 | 不把未验收项目写成已完成 |

## 依赖方向

Electron 宿主创建服务，将模型密钥读取、原生通知、审批和视图快照作为依赖传入。业务服务调用 core 和 Agent Runtime；界面通过 preload 白名单调用宿主。纯视图不持有窗口、密钥或系统权限。

`services/conversation.mjs` 统一本轮 runId、模型/工具调用、取消、完成和失败状态；`services/tasks.mjs` 负责定时任务执行并在首次异步保存前占用共享执行名额；`services/workspace.mjs` 负责原 schema 的业务增删；`services/recovery.mjs` 只标记中断，不重放动作。

IPC 频道仍是 actwill，应用加密身份和旧数据目录继续保留。这是兼容边界，不是遗漏改名。

## 常用开发入口

```sh
npm --prefix desktop ci
npm --prefix desktop test
npm --prefix desktop start
python3 -m unittest discover -s scripts/tests -v
npm --prefix desktop run test:workspace
npm --prefix desktop run test:browser
python3 scripts/package-desktop-source.py /absolute/output/WillBuddy-source.zip
```

源码中 `tests/helpers/load-ui.mjs` 只为 JSDOM 加载实际生产视图模块；真实 Chromium 直接加载 ESM，没有测试替代版页面。安装用户不需要运行 npm；这些命令属于开发环境。

## 仍待推进

Web 与桌面尚未共用完整业务核心；本轮提供无 Electron 的服务边界，但没有声称已经完成跨端统一。core 的存储/授权/模型接口仍可继续拆分，界面控制器的其他页面与事件也可逐步模块化。持久任务队列、MCP、文件写入、Office 成果、原生 Mac 启动与公证属于后续能力，不在本次目录整理中伪实现。
