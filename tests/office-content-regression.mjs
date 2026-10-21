import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
export function officeContentRegression({check,office,fileTools}){
 const text='| 项目 | 数量 | 备注 |\n| --- | ---: | --- |\n| 设备 | 35 | =1+1 |\n| 轴承 | 12 | A\\|B |';
 const tables=office.markdownTables(text);
 check(tables.length===1&&tables[0].rows.length===2,'chat table detected with two rows');
 check(tables[0].rows[1]['备注']==='A|B','escaped pipe preserved');
 const bytes=fileTools.buildXlsx(tables[0].columns,tables[0].rows);
 const xml=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
 check(xml.includes('设备')&&xml.includes('35')&&xml.includes('=1+1')&&!xml.includes('<f>'),'chat table becomes real safe XLSX');
 check(office.markdownTables('```\n'+text+'\n```').length===0,'code block is not mistaken for table');
 check(office.markdownTables(text+'\n\n'+text).length===2,'multiple tables retained separately');
 check(office.markdownTables('| A | A |\n| --- | --- |\n| 1 | 2 |')[0].columns[1]==='A（重复）','duplicate columns do not lose values');
 assert.throws(()=>office.markdownTables('| A | B |\n| --- | --- |\n| 1 | 2 | 3 |'));
 check(true,'ragged table refused rather than silently dropped');
 check(office.markdownTables('没有表格').length===0,'no table yields no fake Excel button');
 const p=office.genOfficePlan('create_docx','# 中文');
 check(p.tasks[0].kind==='genoffice'&&p.tasks[0].payload==='# 中文','downloaded plan retains actual content and engine');
}
