import {body,db,owner,guard,json,failure,getRecord} from '@/lib/workspace';
import {advanceJob,decideJob,inspectNodes,validateNodes} from '@/lib/job-engine';

export async function GET(req:Request){try{const rows=await db().prepare('SELECT id,state,updated,lease FROM jobs WHERE owner=? ORDER BY updated DESC LIMIT 100').bind(owner(req)).all();return json({jobs:rows.results.map((r:any)=>({...JSON.parse(r.state),id:r.id,updated:r.updated,busy:r.lease>Date.now()}))});}catch(e){return failure(e);}}

export async function POST(req:Request){try{
 guard(req);const user=owner(req),d=await body(req);
 if(d.op==='inspect')return json(inspectNodes(d.nodes));
 if(d.op==='create'){
  let flow=await getRecord(user,d.resource,'automation');
  if(!d.useDraft){if(!flow.publishedVersion)throw new Error('请先发布流程，或选择运行草稿');const v=await db().prepare('SELECT data FROM versions WHERE owner=? AND resource=? AND version=?').bind(user,d.resource,flow.publishedVersion).first<{data:string}>();if(!v)throw new Error('发布版本不存在');flow=JSON.parse(v.data);}
  validateNodes(flow.nodes);const id=crypto.randomUUID();const state={id,name:flow.name,resource:d.resource,profileId:d.profileId||'',spaceId:d.spaceId||'',nodes:flow.nodes,input:String(d.input||''),cursor:0,outputs:[],timeline:[],status:'ready',created:Date.now()};
  await db().prepare('INSERT INTO jobs(owner,id,state,revision,lease,updated) VALUES(?,?,?,0,0,?)').bind(user,id,JSON.stringify(state),Date.now()).run();return json(state);
 }
 if(d.op==='step')return json(await advanceJob(user,d.id,d));
 if(d.op==='approve'||d.op==='reject')return json(await decideJob(user,d.id,d.op==='approve',d));
 if(d.op==='cancel'){
  const row=await db().prepare('SELECT state,lease,revision FROM jobs WHERE owner=? AND id=?').bind(user,d.id).first<any>();
  if(!row)throw new Error('任务不存在');const s=JSON.parse(row.state);
  if(s.status==='cancelled')return json(s);
  if(s.status==='executing_action')throw new Error('外部操作已经开始，不能取消；请先核对目标系统的结果');
  if(!['ready','waiting'].includes(s.status))throw new Error('任务已经结束，不能更改为已取消');
  if(row.lease>Date.now())throw new Error('当前步骤正在执行，请等待本步结束后停止');
  const now=Date.now();s.status='cancelled';s.pending=null;
  s.timeline=[...(s.timeline||[]),{node:s.nodes?.[s.cursor]?.id,status:'cancelled',time:now}];
  const changed=await db().prepare('UPDATE jobs SET state=?,updated=?,lease=0,revision=revision+1 WHERE owner=? AND id=? AND revision=? AND lease<=?').bind(JSON.stringify(s),now,user,d.id,row.revision,now).run();
  if(!changed.meta.changes)throw new Error('任务状态已变化，请刷新后再停止');return json(s);
 }
 throw new Error('未知任务操作');
}catch(e){return failure(e);}}
