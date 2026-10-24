# 0.19.0 Excel 图片锚点预览

## 实际变化

旧版枚举`xl/media`并在工作簿末尾堆放图片，图片不属于对应工作表，位置/尺寸丢失。本轮新增`src/preview/spreadsheet-images.js`纯解析与几何模块，renderer复用：从worksheet drawing关系→drawing→image关系读取本表引用图片，不展示未引用媒体。

支持OOXML单格锚点from+ext、双格锚点from+to、绝对pos+ext，EMU按9525/像素换算。解析原始行列/偏移，先有界扩展网格再依照实际渲染列宽/行高定位透明图片层；隐藏列使用collapse，隐藏行不占几何高度。PNG/JPEG/GIF保留原始像素数据、按锚点尺寸显示；切表只显示所属图片。图片覆盖层不拦截鼠标。不改写用户二进制，不新增权限/数据模式，不需要GenOffice/Office/npm/Python额外安装。

关系仅允许规范化xl内部路径与正确drawing/image类型；拒绝外部URL、编码/路径逃逸、重复或缺失ID、错误文件。解码前嗅探PNG/JPEG/GIF真实头与尺寸，单张≤4096×4096/16M像素/4MiB；全工作簿最多32次图片引用、32Mi像素。行列仍受5000/128/30000网格限制，坐标/偏移/总布局有界；超限明确失败，不截断伪装完整。格式伪装/SVG不进浏览器解码器。裁剪/旋转/翻转暂不支持且报错；图表/形状等非图片绘图显示未渲染数量提示，不冒称保真。尚不支持Excel主题色/条件格式/图表、打印分页、复杂字体和完整GenOffice编辑器。

Blob URL在失败/pagehide时撤销，关闭frame原有dispose生效；原单次token/版本/SHA、opaque sandbox、CSP无网络/文件/worker、无Node/preload/原生桥保留。0.18同版本预览连接保持、切换/新版重校验与两任务并发不变。5秒启动/15秒渲染限时未放宽。

## 验证与实际边界

- 184项核心（新增7）：三种锚点/EMU与隐藏网格几何、正确关系与孤儿媒体排除、URL/路径/重复ID/缺失关系、SVG伪装/坏JPEG/超像素、坐标/计数/像素预算、裁剪旋转和非图片提示。
- 12项真实Chromium回归。生产页面导入真实ExcelJS合成多表XLSX：2张图片对齐B2及E4→G7，48×32像素尺寸/实际decode，隐藏行列、第二表独立图片、状态刷新保留、新版B3=9和重新读取均通过；DOCX/PPT末段末页及CLI/并发/流式/编辑回归通过。实际openpyxl独立读取锚点、图像数及隐藏维度。
- ExcelJS4.4测试生成器会在oneCellAnchor写入多余editAs，空隐藏行也会省略。仅对开发夹具去掉该属性，并给隐藏行放入合成文字，避免把无效测试文件当兼容性结论；生产导入不做这种改写。openpyxl采用列min/max范围验证隐藏列，避免以字典键代替实际范围。
- Linux真实Electron42源码/最终ASAR，生产HTML+preload+IPC+服务读取实际XLSX，检查2张图片已解码、首图对齐B2与48×32，子帧无Node/原生桥；三格式连续20次界面调整保留同一帧、额外读=0。不是Mac验收。一次早期并行原生夹具返回error时未带status诊断，原因未确认；补充状态诊断后源码及包验收通过，记录范围，不据此宣称Mac稳定性。
- 9项打包测试、原122文件SHA保留、70生产文件ASAR精确匹配；官方arm64运行时、闭合ZIP/链接/执行位、15MachO/51216页与篡改负例保持。签名ad-hoc，无Developer ID/公证/Mac严格资源密封/Gatekeeper/启动结论。未改旧Python执行器，旧35项未重跑。

下一轮先Mac实际预览/签名安装/模型链路，有阻塞继续复杂图表/主题样式/受控模板与PDF；不能反复只加介绍或队列。不把图片锚点称完整Office保真。MCP、跨Web核心、自主并行子任务仍待完成。

参考：2026-10-24复查Microsoft Open XML TwoCellAnchor官方文档（from/to/picture组成）与AWS文档预览功能说明；作为公开能力/格式依据，不推断Quick内部实现。REA复用原DMG/部分静态证据，未新运行Amazon软件、不复制其代码或资产。
- https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.spreadsheet.twocellanchor?view=openxml-3.0.1
- https://docs.aws.amazon.com/quick/latest/userguide/document-and-visual-creation.html
