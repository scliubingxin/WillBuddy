/** Fixed diagnostic hints only. No automatic installation, retries or source modifications. */
export function projectDiagnostic(result){
 const status=result?.status,text=[result?.error,result?.stderr,result?.stdout].filter(Boolean).join('\n');
 if(status==='succeeded')return null;
 if(status==='cancelled')return {code:'cancelled',message:'已停止本次执行；没有自动重启。'};
 if(status==='denied')return {code:'denied',message:'未获得本次命令授权，没有启动进程。'};
 if(status==='timed_out')return {code:'lease_expired',message:'运行时限已到，已停止进程。核查日志后可重新确认启动。'};
 if(/EADDRINUSE|Address already in use/i.test(text))return {code:'port_in_use',message:'端口被占用。请核查正在运行的服务或项目端口配置；不会自动结束其他进程。'};
 if(/Cannot find module|ERR_MODULE_NOT_FOUND|ModuleNotFoundError|No module named/i.test(text))return {code:'missing_dependency',message:'项目依赖缺失。请检查对应依赖安装步骤是否成功，再手动重新运行；不会自动安装。'};
 if(/找不到命令|ENOENT|command not found|not recognized as/i.test(text))return {code:'missing_tool',message:'本机程序或入口缺失。请检查npm/Node/Python及项目虚拟环境，完整错误保留在日志中。'};
 if(/EACCES|Permission denied|Operation not permitted/i.test(text))return {code:'permission',message:'系统权限或执行权限不足。请核查文件权限；不会使用sudo或关闭系统保护。'};
 return {code:'execution_failed',message:'执行未成功。请检查退出码与原始日志；不会自动重试或改写项目。'};
}
