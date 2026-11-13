// Display the same inherited budget used by a tool-enabled legacy-model run.
export function legacyRoundLimit(settings,agents,agentId){
 const valid=n=>Number.isInteger(n)&&n>=1&&n<=96;
 if(valid(settings?.maxSteps))return {value:settings.maxSteps,inherited:false};
 const inherited=agents?.find(agent=>agent.id===agentId)?.maxSteps;
 return {value:valid(inherited)?inherited:32,inherited:true};
}
