import assert from 'node:assert/strict';

export function csvRegression({check,engine}){
 const risky=['=1+1','+SUM(1,2)','-1+2','@SUM(1,2)','＝1+1','＋1','－1','＠1','\t=1','\r=1','\n=1','  =1','\u00a0+1','\u200b=1','\0=1','\ufeff=1','\t普通文本','-12.5','+8613800000000'];
 for(const value of risky){
  const result=engine.toSpreadsheetCSV(['文本'],[{文本:value}]);
  check(result.protectedCells===1&&engine.parseCSV(result.csv).rows[0]['文本']==="'"+value,'CSV protects formula/control prefix '+JSON.stringify(value));
 }
 const columns=['=标题','文本','金额'];
 const rows=[{'=标题':'正常','文本':'中文,"双引号"\n第二行;=1','金额':-12.5},{'=标题':'@SUM(1,2)','文本':"'=1+1",'金额':0}];
 const before=JSON.stringify({columns,rows});
 const result=engine.toSpreadsheetCSV(columns,rows),roundtrip=engine.parseCSV(result.csv);
 check(result.protectedCells===2&&roundtrip.columns[0]==="'=标题",'CSV protects header and body with accurate count');
 check(roundtrip.rows[0]['金额']==='-12.5'&&roundtrip.rows[1]['金额']==='0','CSV retains finite typed numbers');
 check(roundtrip.rows[0]['文本']===rows[0]['文本'],'CSV delimiters, quotes, Chinese and embedded newlines stay in one cell');
 check(roundtrip.rows[1]['文本']==="'=1+1",'CSV does not double-prefix explicitly quoted text');
 check(JSON.stringify({columns,rows})===before,'CSV protection never mutates source data');
 check(result.csv.startsWith('\ufeff')&&result.csv.includes('\r\n'),'CSV preserves UTF-8 BOM and CRLF records');
 const empty=engine.toSpreadsheetCSV(['值'],[{值:null},{值:undefined},{值:false},{值:NaN},{值:Infinity}]);
 check(empty.protectedCells===0&&!empty.csv.includes('undefined')&&!empty.csv.includes('null'),'CSV null and non-finite values never become formulas');
 const raw=engine.parseCSV(engine.toCSV(['值'],[{值:'=1+1'}]));
 check(raw.rows[0]['值']==='=1+1','raw interchange serialization remains lossless');
 const protectedOnce=engine.toSpreadsheetCSV(['值'],[{值:'=1+1'}]);
 const imported=engine.parseCSV(protectedOnce.csv);
 assert.equal(engine.toSpreadsheetCSV(imported.columns,imported.rows).protectedCells,0);
 check(true,'protected CSV re-export in project does not accumulate prefixes');
 const boundary=engine.toSpreadsheetCSV(['值'],[{值:'safe\",=1+1\r\n@SUM(1,2)'}]);
 check(engine.parseCSV(boundary.csv).rows.length===1&&engine.parseCSV(boundary.csv).rows[0]['值']==='safe\",=1+1\r\n@SUM(1,2)','CSV quote breakout remains one literal field');
}
