// Produce a synthetic workbook through the production XLSX serializer.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildXlsx} from '../lib/xlsx-export.ts';

const columns=['区域','项目','金额','交接说明'];
const rows=Array.from({length:42},(_,index)=>({
 区域:['华东','华南','华北'][index%3],
 项目:index===2?'=1+1':`设备改造 ${index+1}`,
 金额:index%5===0?-(index+1)*1250.5:(index+1)*980.25,
 交接说明:index%7===0?'第一行：核对材料\n第二行：确认责任人':'检查记录、批次和责任人后归档。',
}));
const bytes=buildXlsx(columns,rows),directory=resolve('outputs/xlsx-acceptance'),file=resolve(directory,'muyun-ai-formatted-data.xlsx');
mkdirSync(directory,{recursive:true});writeFileSync(file,bytes);
console.log(JSON.stringify({file,rows:rows.length,columns:columns.length,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),model_requests:0,scope:'synthetic production XLSX; no services or user data'},null,2));
