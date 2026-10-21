const PREFIX='muyun-ai:chat-draft:v1:';
const MAX_LENGTH=20000;

type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;

function defaultStorage():DraftStorage|undefined{
 try{return typeof window==='undefined'?undefined:window.sessionStorage;}catch{return undefined;}
}

export function chatDraftKey(chatId=''){
 return PREFIX+encodeURIComponent(chatId||'new');
}

export function readChatDraft(chatId='',storage:DraftStorage|undefined=defaultStorage()){
 if(!storage)return '';
 try{return (storage.getItem(chatDraftKey(chatId))||'').slice(0,MAX_LENGTH);}catch{return '';}
}

export function writeChatDraft(chatId:string,value:string,storage:DraftStorage|undefined=defaultStorage()){
 if(!storage)return;
 try{
  const key=chatDraftKey(chatId);
  if(value)storage.setItem(key,value.slice(0,MAX_LENGTH));
  else storage.removeItem(key);
 }catch{}
}
