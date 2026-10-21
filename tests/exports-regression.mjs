import {unzipSync,strFromU8} from 'fflate';
import assert from 'node:assert/strict';
import {docxRegression} from './docx-regression.mjs';
import {csvRegression} from './csv-regression.mjs';

export async function exportsRegression({check,fileTools,slides,engine}){
 docxRegression({check,fileTools});
 csvRegression({check,engine});
 const text=await fileTools.extractFile(new File(['维修步骤：先断电。'],'设备.txt'));
 check(text.text==='维修步骤：先断电。','UTF-8 text extraction');
 const csv=await fileTools.extractFile(new File(['区域,金额\n华东,15'],'数据.csv'));
 check(csv.table.rows[0]['金额']==='15','CSV extraction returns tabular data');
 await assert.rejects(()=>fileTools.extractFile(new File([''],'空.txt')));check(true,'empty file rejected');
 await assert.rejects(()=>fileTools.extractFile(new File(['binary'],'未知.exe')));check(true,'unsupported extension rejected');
 await assert.rejects(()=>fileTools.extractFile({name:'大.txt',size:10000001}));check(true,'oversized file rejected before reading bytes');
 const roundtrip=engine.parseCSV(engine.toCSV(['内容'],[{'内容':'中文,"双引号"\n第二行'}]));
 check(roundtrip.rows[0]['内容']==='中文,"双引号"\n第二行','CSV export roundtrip preserves Chinese, quotes and newlines');

 // Real ZIP serialization, intercepted download DOM. Not Office rendering or browser QA.
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 const originalCreate=URL.createObjectURL;let blob,download,clicked=0;
 URL.createObjectURL=value=>{blob=value;return 'blob:test-export'};
 globalThis.document={createElement:()=>({click(){download=this.download;clicked++;}})};
 try{
  fileTools.exportDocx('幕云AI/验收','# 维修方案\n零件 <A> & 检查');
  let entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  check(download==='幕云AI_验收.docx'&&clicked===1,'Word download sanitizes filename');
  check(!!entries['[Content_Types].xml']&&!!entries['word/_rels/document.xml.rels'],'Word package has content types and relationships');
  const word=strFromU8(entries['word/document.xml']);
  check(word.includes('Heading1')&&word.includes('零件 &lt;A&gt; &amp; 检查'),'Word headings and XML escaping preserved');
  fileTools.exportXlsx('幕云AI验收',['项目','金额'],[{'项目':'零件 <A>','金额':12.5},{'项目':'=1+1','金额':'未提供'}]);
  entries=unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const sheet=strFromU8(entries['xl/worksheets/sheet1.xml']);
  const styles=strFromU8(entries['xl/styles.xml']);
  check(download==='幕云AI验收.xlsx'&&blob.type==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Excel download uses sanitized name and official MIME');
  check(sheet.includes('<c r="B2" s="4"><v>12.5</v></c>'),'Excel writes real numeric cells with number formatting');
  check(sheet.includes('&lt;A&gt;')&&sheet.includes('t="inlineStr"><is><t xml:space="preserve">=1+1'),'Excel escapes XML and keeps formula-like input as text');
  check(sheet.includes('state="frozen"')&&sheet.includes(`<autoFilter ref="A1:B3"/>`),'Excel freezes and filters the complete data range');
  check(sheet.includes('<cols>')&&sheet.includes('orientation="landscape"'),'Excel includes bounded column widths and landscape print settings');
  check(styles.includes('FF2563EB')&&styles.includes('numFmtId="164"'),'Excel includes branded header, banding and numeric styles');
  const csvResult=fileTools.exportCsv('幕云AI/验收',['=标题','金额'],[{'=标题':'=1+1','金额':-12.5}]);
  const csvDownload=engine.parseCSV(await blob.text());
  check(download==='幕云AI_验收.csv'&&blob.type==='text/csv;charset=utf-8','CSV download uses sanitized name and UTF-8 MIME');
  check(csvResult.protectedCells===2&&csvDownload.rows[0]["'=标题"]==="'=1+1",'actual CSV download Blob uses protected header and content');
  const ppt=slides.buildPptx('幕云AI验收','## 第一页\n- 维修记录\n- 检查结果\n## 第二页\n验收结论');
  entries=unzipSync(await ppt.write({outputType:'uint8array'}));
  const pages=Object.keys(entries).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
  const pageXml=pages.map(n=>strFromU8(entries[n])).join('\n');
  check(pages.length===3&&pageXml.includes('验收结论'),'PowerPoint package contains cover and generated Chinese content slides');
  check(pageXml.includes('幕云AI')&&pageXml.includes('2 / 3'),'PowerPoint includes branded identity and consistent page numbering');
  check(pageXml.includes('•')&&pageXml.includes('维修记录'),'PowerPoint keeps visibly consistent editable bullet text');
  let printed=false,html='';
  globalThis.window={open:()=>({document:{write:s=>{html=s},close(){}},focus(){},print(){printed=true}})};
  fileTools.printDocument('幕云AI报告','<script>不可执行</script>');
  check(printed&&html.includes('&lt;script&gt;')&&!html.includes('<script>'),'print payload escapes untrusted content');
  globalThis.window={open:()=>null};
  assert.throws(()=>fileTools.printDocument('报告','内容'),/弹出窗口/);check(true,'blocked print window produces actionable error');
 }finally{
  URL.createObjectURL=originalCreate;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
 }
 console.log('PASS category: text/CSV parsing, formatted XLSX, DOCX/PPTX packages and print payload (no browser rendering)');
}
