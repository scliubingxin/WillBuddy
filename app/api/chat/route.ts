import {body,owner,guard,json,failure} from '@/lib/workspace';
import {runAI} from '@/lib/ai-service';
import {abandonChatRequest,beginChatRequest,completeChatRequest,replayChatRequest} from '@/lib/chat-idempotency';
export async function GET(req:Request){try{guard(req);const url=new URL(req.url);return json(await replayChatRequest(owner(req),url.searchParams.get('chatId')||'',url.searchParams.get('requestId')||''));}catch(e){return failure(e);}}
export async function POST(req:Request){try{guard(req);const user=owner(req),data=await body(req);const started=await beginChatRequest(user,data);if(started.replayed)return json(started.replayed);let result;try{result=await runAI(user,data,req.signal);}catch(e){if(started.claim)try{await abandonChatRequest(user,started.claim);}catch{}throw e;}if(started.claim)await completeChatRequest(user,started.claim,result);return json(result);}catch(e){return failure(e);}}
