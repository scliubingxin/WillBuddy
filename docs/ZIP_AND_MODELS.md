# ZIP附件与多模型选择

## ZIP附件

输入框“上传附件”可选择ZIP。实际在内存中解压并验证每个条目，对DOCX/XLSX/PPTX/Markdown/HTML/UTF-8文本和常见代码（JS/TS/Python/Java/Go/Rust/C/C++/CSS/SQL/YAML/XML/Shell/TOML等）提取真实正文。代码只当文本，不执行脚本、不安装依赖、不落地压缩包路径。支持文件逐项显示包名/内部路径，可预览、移除；发送当前问题时正文交给所选模型。原ZIP和原文件不改，支持文件作为本机文档副本保存。代码/普通文本副本格式为Markdown，但保留原扩展名。

限制：ZIP输入4MiB，最多128条目，单文件4MiB，展开合计16MiB，最多32份可问答文档/合计10万UTF-16正文字符，另受原文档空间100个/16MiB JSON上限。实际ZIP CRC/目录/本地头/大小与展开结果复核。绝对路径、..、驱动器/反斜线、控制字符、符号链接与特殊文件、大小写/NFKC冲突、加密/分卷ZIP、畸形/超限包拒绝。支持文件有解析失败或预算超限时整批不导入，保存失败恢复原文档字段，不留下成功一半的批次。不授予源目录读取权限。

PDF/图片/音视频/程序/隐藏文件/不支持格式不作为正文理解，弹出跳过报告；嵌套ZIP不递归。模型同时收到“仅支持正文，不保证已读所有条目”的说明。RAR、7z、tar/gzip、密码包和OCR尚未实现。ZIP中的图片不会自动发送视觉模型。

## 配置多个模型

点击“模型配置”→“添加模型”，填写显示名称、Base URL、模型ID、快速/均衡/极致类型、思考参数协议和默认强度、tools/视觉能力、优先级、文本JSON输入字符预算、最大输出Token预算及输出参数名。API Key各自独立，可仅本次运行或用系统safeStorage加密保存；不可用/basic_text拒绝加密，无明文降级。密钥不回填，关闭或提交清空密码框。地址/模型ID变化须重新输入或明确清除旧密钥。临时密钥退出后失效，配置保留但拒绝匿名调用直到重填；显式无密钥配置允许无认证本地服务。普通state只返回hasKey/keySaved，不包含密文/明文。最多20个配置，保存不联网。

原单模型settings/encryptedKey/sessionKey与Actwill系统身份不迁移、不覆盖。输入框“原配置”继续使用它；原模型编辑入口仍保留。现有每日任务默认沿原配置；本轮重点是对话选择。没有新增安装端依赖。

输入框可手动指定模型，单独选择关闭/低/中/高思考强度（按协议支持范围）；也可选择自动快速/均衡/极致。选择和手动强度随任务保存。切换模型会把本轮资料及既有最近对话发给所选地址，输入框明确提示。

| 自动档位 | 选择条件 | 实际参数策略 |
| --- | --- | --- |
| 快速 | 启用、类型fast、支持本轮工具/视觉且可关闭思考 | 关闭思考；非思考模型不发思考参数，混合模型显式关闭 |
| 均衡 | 启用、类型balanced、支持本轮工具/视觉 | OpenAI medium；DeepSeek适配low；Qwen预算4096；非思考模型不发参数 |
| 极致 | 启用、类型extreme、配置思考协议、支持本轮工具/视觉 | OpenAI/DeepSeek high；Qwen预算16384 |

同档位按配置优先级小到大、再按稳定ID选一个。在受理时固定选择，不按问题内容额外调用分类模型，不自动跨档位、跨服务重试/降级；没有合适配置直接报错。配置类型和能力由用户按服务文档声明，不代表自动测得速度/质量/价格。不伪造模型市场或价格倍率。

## 思考协议和边界

OpenAI兼容发送reasoning_effort=none/low/medium/high；none只有用户声明模型支持关闭时才允许。DeepSeek适配发送thinking.type=enabled/disabled，开启时发送reasoning_effort=low/high（本适配不提供medium映射）。Qwen兼容发送enable_thinking与思考预算1024/4096/16384。部分模型只思考、参数不支持或需要max_completion_tokens，需按实际接口配置；不兼容时明确失败，不假称生效。最大输出预算和思考预算不同，实际输出受服务/模型限制。字符预算不是Tokenizer或Token上下文承诺，图片数据使用原独立体积/像素限制而不按base64字符计预算。

SSE的reasoning_content仅用于同一轮工具协议续接，受原4MiB响应上限控制，不作为答案增量展示、不新增思考正文聊天存档。不同服务仍可能需要其他特有字段/协议，本轮不是完整Responses/Anthropic/Gemini原生客户端。没有付费模型账户实测，参数语义由用户实际服务验收。

配置版本/启用/地址/密钥发生变化后，排队或后续请求拒绝；返回中/迟到结果也复核，不发布为成功。已发出的远端请求无法撤回；已显示的部分文本仍按原中断机制保留。超出文本JSON预算停止，不将资料暗中改发别的服务。

## 验收

306核心（新增20）、5个相关真实Chromium、9打包测试通过。真实ZIP含DOCX/CSV/代码与跳过项，真实文档解析和Store批次/故障测试；真实HTTP请求分别检查模型ID、各自Authorization与思考字段；生产页面配置两个模型、ZIP问答、自动快速/极致、指定模型low、刷新保留选择/强度/来源。原生选择器、IPC、OS Keychain及模型回答语义是夹具；不是Mac/真实OpenAI/DeepSeek/Qwen服务验收。旧Web/Python保护文件不变。

2026-10-25核对的官方参数参考：
- https://developers.openai.com/api/docs/guides/reasoning?api-mode=chat
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://docs.qwencloud.com/developer-guides/text-generation/thinking

下一步：Mac实际密钥/多模型/ZIP链路，真实服务参数验收；缺机器推进有界PDF正文、长文分块来源/更广压缩格式与完整跨Web核心。
