# Office 视口与只读文件搜索（0.37.20）

Office 文档画布的滚轮和纵向滑块更新 LibreOfficeKit 请求视口，鼠标坐标与视口偏移一致；切换页时回到顶部，操作说明可折叠。基于真实 Chromium 页面及模拟原生桥验收，尚未在 Mac 真机验收。

只对本机固定系统 find、授权工作目录、明确允许的只读参数自动批准，仍保存审计并在执行前重新校验。bash -c、删除、执行子进程、写文件、未知参数仍需要原生逐次确认；不会把所有非删除命令当成只读。不是一般命令沙箱。

用户截图中编辑窗口中文方框和 PDF 预览缺字尚未解决。当前没有用户原文件、Mac 和原生字体诊断证据；PDF.js 字体资源不能证明 LibreOfficeKit 中文字体问题已修复。下一步在用户 Mac 验证系统字体发现、原始文档、转换 PDF 和编辑像素。

改动：desktop/src/office/index.html、office.css、office.js；desktop/runtime/agent.mjs、command.mjs、tools.mjs；desktop/tests/cli-auto-find.test.mjs、tests/acceptance/office-viewport-live.mjs；版本和本迭代记录。原 Web/Python、用户身份、logo 和许可未改。
