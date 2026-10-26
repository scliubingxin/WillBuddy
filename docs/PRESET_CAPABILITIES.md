# 预置 Skills 与 MCP 工具

进入「智能体→Skills 技能库」：预置区支持搜索、分类、查看来源和添加。添加后在构建智能体时勾选绑定，沿用skill_read/skill_resource真实执行链。目录离线随应用提供，打开、搜索、添加均不联网、不执行资源脚本。重复添加复用原记录，已停用项不自动启用，删除后启动应用不会自动装回；既有上传技能、绑定、密钥和数据不覆盖。

12项技能：Word报告与方案、Excel数据核对、汇报PPT与演讲备注、会议纪要与行动项、有来源资料研究、网页表单与信息整理、代码项目运行与验收、SOP与知识文档整理（8项WillBuddy独立编写工作流）；系统化故障排查、测试驱动开发、交付前验证、代码评审处理（4项公开MIT技能）。后四项来自obra/superpowers固定commit 2ce8aa15d05bd57213e6f746f953aafb7ded7a8b，完整选定技能目录与LICENSE保留，逐文件SHA核验；不是复制未获许可的Office技能。资源可按需读取，不自动执行shell/脚本；提及的外部CLI/依赖和其他技能须实际具备，不能据此扩大工具权限。

8个MCP预置：Microsoft Learn、AWS Knowledge、DeepWiki、Context7、GitHub、Tavily、Apify、Exa。卡片提供官方服务地址、用途、认证方式和来源。选择「配置连接」后字段已填好，Context7/GitHub/Tavily/Apify填自己的API Key/PAT/Token（不带Bearer前缀）；其他为官方公共入口，仍可能限流或有提供方使用条件。保存不联网；缺密钥不保存为可用连接，密钥沿用主机safeStorage加密，不回填密码框、不进入模型/state/工具参数/普通审计。测试需原生批准，仅真实initialize/tools/list，不调用业务工具；绑入智能体后业务调用仍逐次批准。已有相同地址打开原配置，不另建副本。

目录依据2026-10-26官方公开文档核对。实际公网Microsoft Learn、DeepWiki均发现3项真实工具；其余6个仅核对文档与配置，未用付费账户验证，不能认为已连通。Context7 UI链路测试使用本机HTTP传输夹具而非实际Context7服务。OAuth、stdio、自定义认证头和账号开通不在本轮；未预置仅支持这些方式却无法实际连接的商业工具。

## 技能上传兼容范围

修复截图中技能原生选择器误用文档4MiB读取限制：Skill专用读取/解析输入32MiB，展开16MiB、单资源4MiB、256内容文件/2000 ZIP条目。技能库仍40项/原始资源总16MiB，SKILL.md及单次文本资源读取仍12000字符；保留路径/CRC/本地清单/UTF8/链接/重复等检查，不把不兼容大包截断成已成功导入。普通Office限制不变。

用户提供包仅做本地静态兼容测试，不把公司模板、个人配置、微信数据或账号放入公开源码。Excel→知识库包与公司PPT包已解析；CAD包本地清单冲突、Dashi包约60.6MB展开超过16MiB、微信技能正文超过12000字符，目前仍明确拒绝。这些原件未改、脚本未执行，未宣称全部导入或可自动运行。Dashi资源较大/入口嵌套与长正文分段读取、CAD ZIP兼容修复是下一步入口。

## 验证与重建

338核心（新增8）、8真实Chromium相关回归、10打包测试通过。新增生产页面12/8目录→筛选→真实ZIP技能添加→密钥空白配置表单→AES-GCM夹具存储→真实本机HTTP发现→绑定智能体→三轮HTTP模型skill_read/MCP/回复→刷新及磁盘重载。OS Keychain/原生IPC/选择器/批准/模型语义仍夹具，无Mac或付费MCP验收。先前测试错误（夹具codec解包、上游文件数硬编码、本机静态服务根路径）已纠正后完整通过，不称生产故障修复。误执行一次空Python测试发现，随后正确scripts/tests完整10项通过。

目录重建：先获取上游固定commit，再运行 `python3 scripts/vendor-capability-presets.py /path/to/superpowers`，脚本拒绝其他commit，生成确定性ZIP与SHA目录。完整MIT许可在desktop/runtime/presets/SUPERPOWERS-LICENSE.txt及每个公开技能包内；NOTICE解释来源。应用与源码内实际生产文件一致，arm64包ad-hoc未公证，Mac严格资源封印/Gatekeeper/安装启动尚未验收。
