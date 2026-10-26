# Skill 代码运行与 CLI 输出

在 Skills 技能库搜索“预算脚本”，添加“预算脚本运行（Node）”，构建智能体时绑定它并保留 cli_execute 与 document_create，开启对话工具模式，要求按实际数据制作预算表。模型读取说明后调用 skill_run，用户批准后才运行；成功后 skill_import_output 再次审批，将真实 budget.xlsx 导入成果中心并预览、导出。可自行上传同一结构的技能包。

## 实际执行协议

- scripts/ 或 actions/ 内的 .js/.cjs/.mjs 使用应用内置 Node；.py 使用本机已安装 python3。复制并校验整个包，不执行上传动作，不自动 npm/pip 安装。
- skill_read 返回 runnableScripts；skill_run 参数为 name/path、可选 args 字符串数组和 input JSON 对象。input 至多20000字符；20项参数、整个参数JSON至多300字符。未知脚本、字段、路径与资源SHA不符拒绝。
- 每次原生审批展示脚本、包SHA、完整参数与输入长度。JSON正文输入写入私有 input.json，环境 WILLBUDDY_INPUT 指向它；WILLBUDDY_OUTPUT 指向 output/。WILLBUDDY_OFFICE_MODULE 指向本轮复制的既有离线Office编解码器。APIKey不主动注入环境。
- shell:false 真实进程，120秒、合计64KiB stdout/stderr上限；停止对话会取消进程组。输出限额、非零退出、缺依赖、拒绝、取消和源码变化都不是成功。
- 成功成果仅回收 output/ 内最多8个普通平面文件，每个4MiB、总16MiB；链接、子目录和字节/SHA变化拒绝。回收还验证当前chat/run/包版本/配置，另行审批，经过既有Office/XML/宏外链门禁，保存新副本并生成可信文件卡。
- 运行状态、真实输出及成果摘要在本机保留；输入/参数正文不重复写入执行审计。最近20条终态运行及其成功目录保留，旧目录清理不会删除已经导入的成果。重启后未完成记录标中断，不自动重放。

代码使用当前系统账号权限，可访问工作目录以外的文件和网络；私有复制目录不是OS沙箱。既有本机CLI的权限模型不放宽，只有明确绑定Skill且允许cli_execute的智能体得到运行工具。不要运行不信任的代码。普通CLI的5分钟及项目服务30分钟策略不变。

## CLI-Anything 参考

参考用户提供的 [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything)（2026-10-27核对）：采用命令工具真实执行、结构化 --json 观察、检查真实产物的思路。CLI参数包含字面量 --json 且输出未截断时，至多32KiB的完整JSON对象/数组可作为 structuredOutput，仍保留原始输出和真实退出码。拒绝超深/超多节点输出，不能把JSON存在当操作成功。

没有捆绑 CLI-Anything 的全部harness，也未内置LibreOffice/Blender/GIMP等外部后端。该项目不是免安装所有软件的替代品。

## SDK 与当前边界

已参考 [skills-runtime-sdk](https://pypi.org/project/skills-runtime-sdk/) 的真实进程执行边界；当前是WillBuddy原生Node/Python执行适配，不宣称已集成该Python SDK，也未实现其frontmatter.actions协议、依赖管理或隔离适配。Python解释器和第三方Python依赖仍需预先准备；本例Node与Office编解码器离线内置，不要求用户每次安装npm/pip。

Mac原生审批/取消、Electron内置Node子进程、真实付费模型、Keychain与严格签名/公证尚待目标机验收。测试中模型内容、原生桥和审批为夹具；Node/Python进程、HTTP、XLSX字节和Chromium渲染真实运行。

下一步：受控依赖预检与离线Python/SDK适配、Mac实际链路；继续Excel/PPT选区和原格式定向修改，后台浏览器焦点与定时历史仍待处理。
