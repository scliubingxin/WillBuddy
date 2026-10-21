import {body,db,owner,guard,json,failure,getRecord} from '@/lib/workspace';
import {saveSecret} from '@/lib/vault';
export async function POST(req:Request){try{guard(req);const user=owner(req);const {id,key}=await body(req,15000);await getRecord(user,id);if(typeof key!=='string')throw new Error('密钥格式无效');await saveSecret(user,id,key);return json({ok:true});}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{guard(req);await db().prepare('DELETE FROM vault WHERE owner=? AND id=?').bind(owner(req),new URL(req.url).searchParams.get('id')).run();return json({ok:true});}catch(e){return failure(e);}}
