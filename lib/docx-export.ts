import {zipSync,strToU8} from 'fflate';

const namespace='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const pageWidth=11906,margin=1200,tableWidth=pageWidth-margin*2;
const escapeXml=(value:string)=>value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// A deliberately bounded Markdown table reader, not a full Markdown/HTML renderer.
// Escaped pipes stay inside cells. Other backslashes are retained verbatim.
export function splitTableRow(raw:string):string[]|null {
 const line=raw.trim(),cells:string[]=[];let cell='',lastSeparator=-1;
 for(let i=0;i<line.length;i++){
  if(line[i]==='\\'&&line[i+1]==='\\'){cell+='\\\\';i++;continue;}
  if(line[i]==='\\'&&line[i+1]==='|'){cell+='|';i++;continue;}
  if(line[i]==='|'){cells.push(cell.trim());cell='';lastSeparator=i;}
  else cell+=line[i];
 }
 if(lastSeparator<0)return null;
 cells.push(cell.trim());
 if(line.startsWith('|'))cells.shift();
 if(lastSeparator===line.length-1)cells.pop();
 return cells;
}

function runs(text:string,header=false,literal=false){
 const parts=literal?[text]:text.replace(/\*\*/g,'').split(/<br\s*\/?\s*>/i);
 return parts.map((part,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r>${header?'<w:rPr><w:b/><w:color w:val="000000"/></w:rPr>':''}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`).join('');
}
function paragraph(line:string,literal=false){
 const heading=literal?null:line.match(/^(#{1,3})\s+(.*)/);
 return `<w:p>${heading?`<w:pPr><w:pStyle w:val="Heading${heading[1].length}"/></w:pPr>`:''}${runs(heading?heading[2]:line,false,literal)}</w:p>`;
}
function renderTable(rows:string[][],alignment:string[]){
 // Allocate more space to narrative columns while keeping short fields readable.
 const weights=alignment.map((_,column)=>rows.reduce((weight,row)=>Math.min(48,Math.max(weight,Array.from(row[column]||'').reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0))),8));
 const total=weights.reduce((a,b)=>a+b,0);
 const widths=weights.map(weight=>Math.floor(tableWidth*weight/total));
 widths[widths.length-1]+=tableWidth-widths.reduce((a,b)=>a+b,0);
 const borders=['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="D9D9D9"/>`).join('');
 const grid=widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('');
 const body=rows.map((row,index)=>`<w:tr><w:trPr>${index===0?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>`+widths.map((width,column)=>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${index===0?'<w:shd w:val="clear" w:fill="E8F0FA"/>':''}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="276" w:lineRule="auto"/><w:jc w:val="${alignment[column]}"/></w:pPr>${runs(row[column]||'',index===0)}</w:p></w:tc>`
 ).join('')+'</w:tr>').join('');
 return `<w:tbl><w:tblPr><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="100" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t/></w:r></w:p>`;
}

export function documentBody(text:string):string {
 const lines=text.replace(/\r\n?/g,'\n').split('\n'),blocks:string[]=[];
 let fence:{char:string,length:number}|null=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){
   blocks.push(paragraph(line,true));
   if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;
   continue;
  }
  if(marker){fence={char:marker[1][0],length:marker[1].length};blocks.push(paragraph(line,true));continue;}
  const header=splitTableRow(line),separator=i+1<lines.length?splitTableRow(lines[i+1]):null;
  if(header&&separator&&header.length>0&&header.length<=12&&header.length===separator.length&&separator.every(cell=>/^:?-{3,}:?$/.test(cell))){
   const alignment=separator.map(cell=>cell.startsWith(':')&&cell.endsWith(':')?'center':cell.endsWith(':')?'right':'left');
   const rows=[header];i++;
   while(i+1<lines.length&&lines[i+1].trim()&&!/^\s*(?:#{1,6}\s|`{3,}|~{3,})/.test(lines[i+1])){
    const row=splitTableRow(lines[i+1]);
    // Preserve over-wide/malformed rows as ordinary text; never discard extra cells.
    if(!row||row.length>header.length)break;
    rows.push(row);i++;
   }
   blocks.push(renderTable(rows,alignment));
   // The table already supplies a small separator; do not duplicate a Markdown blank line.
   if(i+1<lines.length&&!lines[i+1].trim())i++;
  }else blocks.push(paragraph(line));
 }
 return blocks.join('');
}

export function buildDocx(text:string):Uint8Array {
 const relationships='http://schemas.openxmlformats.org/package/2006/relationships';
 const officeRelationships='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const styles=`<w:styles xmlns:w="${namespace}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`+[1,2,3].map(n=>`<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="${n-1}"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="${38-n*4}"/></w:rPr></w:style>`).join('')+'</w:styles>';
 const files={
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':`<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationships}/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/_rels/document.xml.rels':`<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationships}/styles" Target="styles.xml"/></Relationships>`,
  'word/document.xml':`<w:document xmlns:w="${namespace}"><w:body>${documentBody(text)}<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}"/></w:sectPr></w:body></w:document>`,
  'word/styles.xml':styles,
 };
 return zipSync(Object.fromEntries(Object.entries(files).map(([path,content])=>[path,strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+content)])));
}
