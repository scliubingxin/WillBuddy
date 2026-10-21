# 0.7.0：流式输出与内容排版修复

## 现在的行为

桌面对话向支持 SSE 的 Chat Completions 接口发送 `stream:true`。收到正文增量后即显示，最后一个 token 到达前不会等待整段响应再绘制。仅返回 JSON 的兼容服务仍可正常使用，但无法把服务端整段 JSON 变成真实流式响应；不会为此隐藏重试或再次收费请求。

支持完整 GFM Markdown：标题、段落、加粗/斜体/删除线、嵌套清单、任务清单、链接、引用、表格和代码块。流式中未闭合的代码块会随后续内容更新。导出与继续修改使用原文，不把渲染 HTML 反写为模型消息。

原始 HTML 的标题、段落、表格等会在回复中安全排版。包含 HTML 文档或 html 代码块的回复可点「在工作区查看」→「HTML 预览」，查看带 CSS 的静态页面；可切换原文与 Markdown 视图。预览不是可运行的 Web 应用：脚本、表单、远程图片/资源和跳转不会执行，避免模型内容取得桌面权限。

## 模块与事件

- `runtime/model-stream.mjs`：UTF-8 增量解码，SSE LF/CRLF/CR、多行 data、注释、usage、结束标记与工具参数分片。限制 4 MB；截断、无效 JSON、长度上限、服务错误和取消均失败关闭。
- `core.complete(..., options)`：有 `onDelta` 才发送流式请求，原定时任务与非流式调用保持兼容。JSON 响应只交付一次，不伪造逐字动画。
- `services/conversation.mjs`：逐轮消息 ID、runId、单调 sequence；每约 500ms 和结束时保存检查点。取消保留已收到的部分，标记未完成；重启标记中断，不自动重放工具。
- `main.mjs` / `preload.cjs`：独立只读 `actwill:stream` 事件；事件含 version/type/chatId/runId/messageId/sequence/content/start/time，无密钥和 IPC 原始事件对象。
- `src/app.js`：约 40ms 合并 UI 绘制，只更新当前回复；落后的状态快照不能覆盖较新的正文，旧请求不能复活完成状态。保留输入框本身、草稿、焦点、选区与滚动，不在每个 token 重建工作台。
- `src/ui/markdown.js`：固定版本 Marked 18.1.1 + DOMPurify 3.4.17，源码与许可证离线内置于 `src/vendor/`。普通回复删除脚本、样式、id/class、data-action 等；生成的 HTTPS/HTTP 链接仍通过现有浏览器工具与原生确认打开。

工具参数只在服务端发出结束信号、完整拼接且 JSON 合法后交给已有审批/审计链路。未完成参数不会执行。Agent 工具轮次的说明可见，但最终回复不会重复追加一遍。

## HTML 隔离

完整 HTML 样式只进入 `sandbox=""` 的独立 iframe，不授予 scripts、same-origin、forms、popups、downloads 或顶层导航权限。内容先净化，外链去除，iframe 自身 CSP 的 default-src/script-src 为 none，只有内联样式可用。宿主 script-src 仍为 self，Node 隔离、contextIsolation、sandbox 和原生审批不变。宿主允许内联样式以便 srcdoc 继承策略后展示 CSS；宿主正文仍严格禁止模型 style 标签/属性。

图片显示为占位说明，数学公式/语法高亮、交互脚本和任意站点嵌入不在本轮支持范围。HTML 预览限制 20 万字符，原文保留完整。崩溃可能损失最近一次检查点之后约 500ms 内的增量；正常停止和失败会保存最终已收内容。

## 实际验证

50 项 Node/JSDOM 回归、7 项 Python 打包边界、3 项真实 Chromium 验收通过。其中新的端到端路径使用真实本地 HTTP SSE → 生产服务 → 模拟原生桥 → 生产 ESM 页面；服务端暂停后先断言首段已显示，再放行后续内容。覆盖原输入框/选区保留、无重复终稿、GFM、CSS HTML 预览、脚本/操作注入阻断和原文导出。另一条 SSE 工具链实际运行 Node 子进程，审批为测试夹具。

```sh
npm --prefix desktop ci
npm --prefix desktop test
npm --prefix desktop run vendor:renderer
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:streaming
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:workspace
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:browser
python3 -m unittest discover -s scripts/tests -v
```

没有使用用户真实 API Key、付费模型或第三方 Codex CLI；没有 Mac 真机启动、公证或 Gatekeeper 结论。免 npm 的 arm64 包仍为 ad-hoc 候选。
