// Spreadsheet input is a bounded, explicit rectangular matrix. A final row
// separator from spreadsheet copy is ignored only when the shape proves it is
// a separator; an intentional empty last row is otherwise preserved.
export function officeTsvMatrix(text,cells,{literal=false}={}){
 if(typeof text!=='string'||!cells||!Number.isInteger(cells.rows)||!Number.isInteger(cells.columns)||cells.rows<1||cells.rows>30||cells.columns<1||cells.columns>16||cells.rows*cells.columns>200)throw Error('请先定位受支持的Excel矩形选区');
 if(text.length>4000||/\r(?!\n)/.test(text))throw Error('输入数据超过限制或换行格式不受支持');
 const lines=text.replace(/\r\n/g,'\n').split('\n');if(lines.length===cells.rows+1&&lines.at(-1)==='')lines.pop();
 const rows=lines.map(line=>line.split('\t'));if(rows.length!==cells.rows||rows.some(row=>row.length!==cells.columns))throw Error('输入数据的行列数必须与选区一致；不支持带换行的引号单元格');
 return literal?rows.map(row=>row.map(value=>({text:value}))):rows;
}
