/** Only trusted native counts can enable history commands; unsupported stays unknown. */
export function officeHistory(value) {
 const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000?v:null;
 return {undo:count(value?.undo),redo:count(value?.redo)};
}
export function historyCommandAvailable(history,command) {
 const key=command==='.uno:Undo'?'undo':command==='.uno:Redo'?'redo':null;
 return key!==null&&officeHistory(history)[key]>0;
}
