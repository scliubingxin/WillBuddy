// Exercise the production serializer, not an independent workbook authoring library.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {toCSV,toSpreadsheetCSV} from '../lib/data-engine.ts';
const directory=resolve(process.argv[2]||'outputs/csv-safety-acceptance');
mkdirSync(directory,{recursive:true});
const columns=['=1+1','内容','金额'];
const values=['=1+1','+SUM(1,2)','-1+2','@SUM(1,2)','＝1+1','＋1','－1','＠1','\t=1','\r=1','\n=1','  =1','\u200b=1','-12.5','中文,"引号"\n第二行;=1','safe\",=1+1\r\n@SUM(1,2)'];
const rows=values.map((value,i)=>({'=1+1':`记录${i+1}`,内容:value,金额:-12.5}));
const result=toSpreadsheetCSV(columns,rows);
writeFileSync(resolve(directory,'protected.csv'),result.csv);
// Harmless positive control: proves formula evaluation was enabled in the importer.
writeFileSync(resolve(directory,'control.csv'),toCSV(['对照'],[{对照:'=1+1'}]));
writeFileSync(resolve(directory,'fixture.json'),JSON.stringify({columns,rows,protectedCells:result.protectedCells},null,2)+'\n');
console.log(JSON.stringify({directory,rows:rows.length,protectedCells:result.protectedCells,scope:'synthetic production CSV; no services or user data'}));
