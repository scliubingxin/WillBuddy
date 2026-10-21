// Local test entry only. Never included as an application route or deployed Worker.
import {complete} from '../lib/model';
import {fetchPublic} from '../lib/integrations';
import * as artifactFile from '../app/api/artifact-file/route';
import * as documentTool from '../app/api/document-tool/route';
import * as chat from '../app/api/chat/route';
import * as workspace from '../app/api/workspace/route';
import * as documents from '../app/api/documents/route';
import * as data from '../app/api/data/route';
export default {async fetch(req:Request){
 const path=new URL(req.url).pathname;
 const routes:Record<string,any>={'/api/artifact-file':artifactFile,'/api/document-tool':documentTool,'/api/chat':chat,'/api/workspace':workspace,'/api/documents':documents,'/api/data':data};
 if(routes[path]?.[req.method])return routes[path][req.method](req);
 try{
  if(path==='/legacy'){
   try{await fetch('https://provider.example.com/legacy',{redirect:'error'});return Response.json({reproduced:false});}
   catch(e){return Response.json({reproduced:e instanceof TypeError&&e.message.includes('Invalid redirect value')});}
  }
  if(path==='/model'){const p:any=await req.json();return Response.json(await complete({baseUrl:p.baseUrl,model:'fixture',maxTokens:128},'fixture-credential',[{role:'user',content:'fixture'}],req.signal));}
  if(path==='/remote'){const p:any=await req.json();const r=await fetchPublic(p.url,{headers:{Authorization:'Bearer fixture-credential'}});return Response.json({status:r.status});}
  return new Response('Not found',{status:404});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Failure'},{status:400});}
}};
