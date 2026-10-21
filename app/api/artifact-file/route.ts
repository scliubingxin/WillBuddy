import {bucket,getRecord,owner,failure} from '@/lib/workspace';
export async function GET(req:Request){try{
 const user=owner(req),id=new URL(req.url).searchParams.get('id');if(!id)throw new Error('缺少成果编号');
 const record=await getRecord(user,id,'artifact');if(record.format!=='xlsx'||!record.objectKey||!record.sha256||record.objectKey!==`${user}/chat-artifacts/${id}.xlsx`)throw new Error('不是可下载的表格成果');
 const object=await bucket().get(record.objectKey);if(!object)throw new Error('成果文件不存在');if(object.size>200000)throw new Error('成果文件超出大小限额');
 const bytes=await object.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(bytes.byteLength!==record.size||sha!==record.sha256)throw new Error('成果完整性校验失败，已阻止下载');
 return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="muyun.xlsx"; filename*=UTF-8''${encodeURIComponent(record.name).replace(/'/g,'%27')}`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return failure(e);}}
