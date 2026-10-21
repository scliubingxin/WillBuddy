# 0.8.0 · 可恢复查看的 CLI 命令队列

在「浏览器与 CLI」提交命令后，界面立即显示已受理的队列记录，不再等进程结束才返回。排队、等待系统审批、执行中、停止中、成功、失败、拒绝、取消、超时、输出超限及中断分别保存。刷新页面不会丢失命令 ID，仍能查看和停止实际进程。

## 使用与恢复

1. 授权项目目录，填写程序与 JSON 参数数组，点击「审阅并执行」。正在执行的对话、每日模型任务与命令共用两个执行名额，CLI 按受理先后领取空位；最多20条未完成命令。
2. 每次真正执行前仍弹出系统确认框，核对解析后的程序、工作目录和参数。排队期间撤销目录授权会使执行失败，不弹出误导审批。
3. 可取消尚未开始的命令；执行中可停止，返回真实进程状态。停止后已经发生的文件/网络操作不会回滚。
4. 退出/重启后，排队记录变为「已暂停」，已领取/等待审批/执行中记录变为「已中断」。不会自动弹出历史审批、重放命令或把上次批准当作新批准。原子写入提供进程重启恢复，未声称已完成断电/fsync耐久性验证。
5. 核查可能已产生的副作用后，点击「重新审阅并重试」。这会创建新的尝试，保留原记录与关联，并重新校验目录、程序及系统审批。原命令的文件偏移/进程状态不能续跑。重试不是 exactly-once 外部事务保证。
6. 「清理队列记录」只清理结束的队列项，独立工具审计仍保留在其既有保留窗口内。队列最多200条，清理前请自行导出需要保存的输出；清理也会移除该条请求的去重键。命令参数、路径和输出继续明文存于本地工作空间，避免输入秘密。

## 架构与兼容

- `desktop/services/commands.mjs` 无 Electron 依赖；拥有持久化受理、FIFO、共享容量、取消、重试、去重及事件。主进程只组装依赖、注册可信 IPC，并每秒唤醒等待命令。
- `commandJobs` 是 schema 1 工作空间的增量字段。旧空间在恢复/服务初始化时补空数组，旧 chats/tasks/folders/密钥身份与原 Web/Python 不变。
- 同一受理 ID、同一规范请求返回既有记录；同 ID 改参数会拒绝。重复重试 ID 返回同一新尝试，另一 ID 试图再次分叉同一父尝试会拒绝。去重以本地仍保留的记录为范围；不承诺第三方副作用全局 exactly-once。
- 每条记录含单调 revision 和最多50条 `version:1/type:command.status` 事件，字段为 jobId/sequence/previous/status/time。参数和输出不进入状态事件。事件作为 JSON 快照一并保存，不是跨端事件总线或订阅游标协议。
- `executionId/jobId` 连接队列和实际工具审计；stdout/stderr只保存于审计，避免重复大段输出。活跃队列的审计不会被普通200条滚动清理挤掉，结束后回到原保留策略。
- 工具审计的前50000字符 partial 在收到第一段以及后续输出间隔达到500ms时检查点保存，结尾保存完整受限结果。不增加空闲定时写入；写入失败中止当前CLI并记录失败。历史的浏览器填写脱敏保持。
- 受理保存、领取保存、批准后的运行状态保存均成功后才允许下一阶段；保存失败不会静默放行新子进程。程序和 cwd 在审批后再次检查。
- preload 只增加/替换明确的 `enqueueCommand/retryCommand/forgetCommand/cancelCommand` 方法；没有任意频道、函数或 Node 权限。现有未公开的阻塞 `executeCommand` 被队列接口替换，模型工具名 `cli_execute` 保持兼容。

## 实际验证

64项 Node/JSDOM 回归通过，其中新增14项队列/故障/权限测试，启动真实 Node 子进程检查单次副作用、退出码、输出、取消和磁盘故障；审批为确定性夹具。

4项真实 Chromium 验收通过：新命令队列（真实服务→真实Node，模拟原生桥）、原 SSE→服务→页面、原工作区以及原浏览器可信输入/CDP。新队列验收包括持久文件核对、页面刷新后停止、手动重试产生第二次审批、1000px无横向溢出。原生系统确认、Electron/macOS、第三方 Codex CLI、用户真实模型均未据此验收。

复现：

```sh
npm --prefix desktop ci
npm --prefix desktop test
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:commands
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:streaming
CHROME_PATH=/absolute/chrome-headless-shell npm --prefix desktop run test:workspace
CHROME_PATH=/absolute/chrome-headless-shell CHROME_TEST_NO_SANDBOX=1 npm --prefix desktop run test:browser
python3 -m unittest discover -s scripts/tests -v
```

`CHROME_TEST_NO_SANDBOX`只用于容器内浏览器夹具，不改变产品sandbox:true。7项打包边界测试通过。原生Mac严格签名/启动、Gatekeeper、Developer ID及公证仍待目标机器/凭据。

## 下一步

此次队列只接入手动 CLI。模型对话中的工具审计同样获得输出检查点，但整个 Agent 轮次、每日任务尚未迁入此队列；无法自动续接模型历史或执行断点。下一轮先在Apple芯片机器验证安装、审批、取消、退出恢复与真实模型，再统一对话/定时任务/命令的队列和事件契约，继续保持外部副作用不自动重放。
