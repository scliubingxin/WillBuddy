# MCP Bearer 认证与凭据配置

连接器管理和智能体构建内的「配置新的 MCP」均支持手动 Bearer Token。这里只消费用户为该服务取得的 Token；没有 OAuth 登录、授权服务器发现、PKCE、刷新令牌、自定义认证头或 stdio，也不宣称完整实现 MCP OAuth 规范。

## 使用

1. 在「智能体 → MCP 连接器」添加或编辑连接，填写准确的 Streamable HTTP 服务地址。
2. 选择「Bearer Token」，填写裸令牌，不要带 `Bearer ` 前缀。范围为8–4096字符，使用令牌常见的ASCII字母、数字、点、横线、下划线、波浪线、斜杠、加号和末尾等号；不接受空白、换行或URL内的密钥。
3. 保存仅加密写入本机，不联网。系统安全存储不可用或使用 `basic_text` 时拒绝保存，不降级为明文或匿名连接。
4. 点击「测试连接」，经原生批准后解密并连接、发现目录。此操作不调用业务工具，也不表示服务持续在线。
5. 在智能体绑定该连接后开始对话；每轮连接发现和每次业务调用仍走原审批，权限没有因配置 Token 扩大。

重新打开配置时密码框始终为空，显示「凭据已配置」。同一地址下留空保留旧令牌；改变地址（含路径）必须重新填写，避免把旧凭据带到新目标。选择「无认证」并保存将清除凭据；替换、停用或修改连接会使原有客户端失效并清除旧测试结果。解除绑定后可删除连接。

401/403会显示认证失败或权限不足，由用户检查或重新配置，不自动刷新、换站、降级或重试。请求不跟随HTTP重定向；HTTPS和显式本机HTTP仍沿原地址规则。该凭据仅向所配置的准确地址发送，不复用为模型API Key或其他连接器的凭据。手动令牌的颁发、权限、受众与到期状态由目标服务负责，用户应取得适用于该服务的令牌。

## 架构与秘密边界

- `main/mcp-secrets.mjs` 只适配 Electron safeStorage，保留原 Actwill 系统加密身份、appId和用户目录，未迁移/覆盖已有模型密钥。使用当前锁定Electron42支持的同步加密API；Mac Keychain首次访问可能弹系统授权，实际签名一致性与原生表现待真机验收。
- `services/mcp-access.mjs` 负责输入验证、元数据投影和请求工厂；`mcpViews`不向renderer返回明文或密文，只返回认证方式与hasToken。它不读取任意文件，不连接未配置服务。
- 仅在原生连接审批通过并核对配置版本之后解密；每次请求前、响应后检查连接ID/地址/revision/启用状态/密文是否一致，变化时不返回工具结果，且不再向旧目标发送DELETE清理。已发送的请求及远端副作用无法撤回，不是服务端事务回滚或全局exactly-once。
- `runtime/mcp.mjs`在私有字段中持有本次客户端令牌，不可修改目标URL。initialize、initialized、tools/list、tools/call和正常DELETE清理都带该连接的Authorization Bearer头；不放入JSON工具参数、URL、cookie或模型请求。关闭后释放引用并拒绝再次调用，不声称可保证JavaScript字符串物理擦除。
- 已知令牌原样出现在远端JSON/SSE返回或错误中会被脱敏，避免写入工具目录、观察结果、审计或界面状态；解析错误不回显响应正文。这不是防止恶意服务任意编码/分片转写数据的通用防泄漏系统。
- Token在用户填写时必然短暂存在可信主窗口输入框和IPC参数中；提交后立即清空，关闭对话框也清空，不回填、不写表单草稿。模型、Skill、网页和沙箱子帧没有凭据读取接口，原原生IPC主帧校验保持。
- schema1连接记录增量`auth`和`encryptedToken`，密文通过既有Store的600权限原子保存。旧配置无字段按无认证处理；配置失败/磁盘错误保留旧记录，不自动匿名执行。清除配置不是磁盘安全擦除或服务器吊销Token。

## 验收与边界

264项核心（新增15项认证）、4项相关真实Chromium、9项打包Python通过。15项覆盖格式/注入、系统存储不可用/basic_text/解密异常、真实AES-GCM夹具加密落盘和重载、元数据隐藏、同地址保留/改地址重输/清除、磁盘回滚、拒绝前不解密/不联网、401/403单次请求、原样回显脱敏、轮换/在途变更、真实HTTP JSON+SSE initialize/list/call/DELETE、真实HTTP跳转不转发、审批期间变更、目标URL不可重定向和空密码框。

生产Chromium页面实际填写密码框→保存（请求数0、输入立即清空）→重新配置不回填→原生审批夹具→真实HTTP目录→构建内新建带认证连接→保存绑定/重载→5轮本机HTTP模型Skill/资源/两份知识/MCP/最终回复。测试服务确实检查所有MCP请求的Bearer Header，正常会话清理也检查；模型端请求、界面state、审计与持久文件不含合成明文令牌。

系统加密接口使用独立Node AES-GCM夹具，未冒充真实Mac Keychain。原生IPC/审批/选择器及模型语义仍夹具；未验收Mac安装、严格资源密封、Gatekeeper、原生启动/权限、真实付费模型或认证企业服务。离线包仍ad-hoc、未公证；不移除隔离或关闭系统保护。不是OAuth账户登录/自动刷新，也不保证所有商业MCP服务可接入。

## 参考与下一步

- [MCP Authorization 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)：区分手动访问令牌与完整OAuth授权流程，不把本实现称为规范全量OAuth客户端。
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)：系统加密依赖、basic_text限制与Mac签名一致性，2026-10-25复查。当前保留Electron42和既有系统身份；异步安全存储/稳定签名与公证另行验收。
- [Quick desktop](https://docs.aws.amazon.com/quick/latest/userguide/what-is-desktop.html)：公开MCP/本机配置能力映射，不推断Amazon内部认证实现。REA继续复用原有公开包部分静态证据，没有新增Amazon运行结论。

下一步先Mac原生与实际服务联调；缺目标机器时继续受控知识索引、认证端到端故障恢复或Office兼容。OAuth/PKCE与安全回调、stdio、跨Web完整核心、自主子任务组和完整Office保真仍未完成。
