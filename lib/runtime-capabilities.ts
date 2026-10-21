import {env} from 'cloudflare:workers';

export function documentToolsEnabled(){
 return String((env as any).DOCUMENT_TOOL_ENABLED||'').trim().toLowerCase()==='true';
}
