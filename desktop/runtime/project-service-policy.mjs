/** Host-only execution policy. Never read this policy from renderer/model CLI arguments. */
export const PROJECT_SERVICE_MS = 30 * 60 * 1000;
export const isServiceStep = id => ['dev','start','run:main.py','run:app.py','run:server.py'].includes(id);
export function projectServicePolicy(projectId,stepId){
 if(typeof projectId!=='string'||!/^[0-9a-f-]{36}$/.test(projectId)||!isServiceStep(stepId))throw Error('只有项目启动入口可以使用服务模式');
 return Object.freeze({version:1,projectId,stepId,maxDurationMs:PROJECT_SERVICE_MS,outputMode:'tail'});
}
export function checkServicePolicy(policy,args){
 if(!policy)return null;
 const expected=projectServicePolicy(policy.projectId,policy.stepId);
 if(JSON.stringify(policy)!==JSON.stringify(expected)||args.folderId!=='project:'+policy.projectId||args.relative)throw Error('项目服务执行策略无效');
 return expected;
}
