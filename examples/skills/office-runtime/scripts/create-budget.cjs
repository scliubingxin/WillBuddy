const fs=require('node:fs'),path=require('node:path');
const {zip}=require(process.env.WILLBUDDY_OFFICE_MODULE);
const input=JSON.parse(fs.readFileSync(process.env.WILLBUDDY_INPUT,'utf8'));
if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw Error('items须为1–100项');
const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
let total=0;const rows=input.items.map((x,i)=>{if(typeof x.name!=='string'||!x.name||x.name.length>100||/[\x00-\x1f]/.test(x.name)||!Number.isFinite(x.quantity)||!Number.isFinite(x.price)||x.quantity<0||x.price<0||x.quantity*x.price>1e12)throw Error('预算参数无效');const amount=x.quantity*x.price;total+=amount;return `<row r="${i+2}"><c r="A${i+2}" t="inlineStr"><is><t>${esc(x.name)}</t></is></c><c r="B${i+2}"><v>${x.quantity}</v></c><c r="C${i+2}"><v>${x.price}</v></c><c r="D${i+2}"><v>${amount}</v></c></row>`;});
const text=(a,v)=>`<c r="${a}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const entries={
 '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="预算" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${['项目','数量','单价','金额'].map((v,i)=>text('ABCD'[i]+'1',v)).join('')}</row>${rows.join('')}<row r="${rows.length+2}">${text('A'+(rows.length+2),'合计')}<c r="D${rows.length+2}"><v>${total}</v></c></row></sheetData></worksheet>`
};
fs.writeFileSync(path.join(process.env.WILLBUDDY_OUTPUT,'budget.xlsx'),zip.zipSync(Object.fromEntries(Object.entries(entries).map(([k,v])=>[k,Buffer.from(v)]))));
console.log(JSON.stringify({rows:rows.length,total,file:'budget.xlsx'}));
