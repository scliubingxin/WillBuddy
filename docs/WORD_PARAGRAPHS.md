# 导入 Word 段落增删 · 0.15.0

在成果中心导入 DOCX，点击“Word 分段编辑”。有权限的段落显示“后插段落”“删除本段”，新增文字单行不超过10000字符，保存前可撤销；删除标记以划线显示。保存后重新读取坐标，再进行下一批编辑，下载真实 DOCX。导入原件不写回，前5版保留。当前不能重排段落、拆分表格或增删行列，也不提供分页保真预览。

AI 先调用批准的 document_read，使用 wordEditing.paragraphs 中 structural=true 的 part/paragraph/anchor；document_patch 结构操作为 `{action:"insertAfter",part,paragraph,anchor,text}` 或 `{action:"deleteParagraph",part,paragraph,anchor}`，不带run字段。片段改字仍使用原run坐标，两种补丁可同批，禁止删除同时修改同段。每次模型参数600字符审批上限保持。版本/段落指纹过期、重复动作、权限拒绝、取消或磁盘失败不发布候选。

## 保护范围

仅word/document.xml中顶层正文简单文字段落可增删。复杂节点/图片/域/书签、修订/内容控件、空段落、表格内段落、页眉页脚、带编号/分节/修订/样式引用的段落结构只读。保留样式引用只读是为了避免继承编号等无法可靠解析的语义。跨段域、书签、批注、移动/权限范围内的普通外观段落也保护；至少保留一个原正文段落，防止空正文。数字签名文档拒绝编辑。

新段落只复制参考段落的pPr和首run的rPr，创建新的p/r/t，文字按XML文本转义，不复制原段落ID、图片、关系或其他内容。新文字继承首片段直接格式；不代表自动识别业务语义或复制整段内混合格式。主进程先验证原始坐标，再改字，最后以原XML节点引用插入/删除，避免同批索引漂移。输出重新检查500段/2000片段上限，未改ZIP部件解压字节SHA相同；被改XML重序列化，不称ZIP字节无损或Word显示完全一致。

## 实际验证

166核心（新增10）、11真实Chromium（新增1）、9打包测试通过。新增HTTP模型夹具read→insertAfter→真实DOCX；生产页面导入→新增→撤销/再次新增→审批保存v2→真实导出→python-docx核对段落、首run粗体颜色及表格/图片/页眉页脚→刷新重载→删除新增段→撤销/再次删除→v3导出与磁盘重载。原生IPC/审批/模型内容仍夹具，未Mac/付费模型/Word或WPS显示验收。没有新增最终用户依赖，保留原GenOffice HTML→DOCX子引擎与双任务。

本轮从权威0.14.0/v15重新获取并核对412内容文件；指定Web/Python122受保护文件保持，旧Python35测试未重跑。参考[Quick官方文档编辑](https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html)的段落/结构编辑方向，2026-10-23复查；复用既有REA证据，没有新增Amazon原生运行结论。下一步优先Mac严格签名安装/原生审批/真实模型Office链路；缺目标机继续受控表格结构、精确选区、文档预览及模板/图表质量。完整GenOffice套件、任意Word保真往返、桌面MCP和跨Web核心未完成。
