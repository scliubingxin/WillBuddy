// Produce a reproducible, synthetic user report with the production Word exporter.
// Node.js 24 strips TypeScript; no model, live data, DOM, or credentials required.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildDocx} from '../lib/docx-export.ts';

const rows=Array.from({length:36},(_,i)=>`| ${String(i+1).padStart(2,'0')} | 装配记录 ${i+1} | 核对工单编号、材料批次与交接记录，确认三项一致后填写复核结果。 | ${i%2?'已复核':'待复核'} |`);
const content=[
 '# 幕云AI交接记录复核',
 '这份样例用于检查交接记录在 Word 中的可编辑表格、中文换行和跨页显示。待复核记录应由责任人补充确认后再归档。',
 '',
 '## 记录清单',
 '| 编号 | 项目 | 复核说明 | 状态 |',
 '| :---: | :--- | :--- | :---: |',
 ...rows,
 '',
 '## 字符与换行检查',
 '| 字段 | 内容 |',
 '| :--- | :--- |',
 '| 特殊字符 | 零件 <A> & B |',
 '| 分隔符 | 工序 A\\|B |',
 '| 单元格换行 | 第一行<br/>第二行 |',
 '| 金额说明 | 12.50 元为样例值，不是实际费用 |',
 '',
 '全部 36 条样例记录均应保留，跨页后的表头应重复显示。',
].join('\n');
const bytes=buildDocx(content),dir=resolve('outputs/docx-table-acceptance');
mkdirSync(dir,{recursive:true});
const path=resolve(dir,'muyun-ai-word-tables.docx');
writeFileSync(path,bytes);
const report={fixture:'synthetic-handover-36-rows',expected_tables:2,expected_rows:[37,5],expected_cells:[148,10],bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),model_requests:0,dom_download:'not_executed',visual_review:'run renderer and inspect every page separately'};
writeFileSync(resolve(dir,'fixture-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file:path,...report},null,2));
