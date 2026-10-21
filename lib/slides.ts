import pptxgen from 'pptxgenjs';

type Section={title:string;items:string[]};
const clean=(value:string)=>value
 .replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1')
 .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
 .replace(/[*_`~]/g,'')
 .replace(/^\s*(?:[-+] |\d+[.)]\s+)/,'')
 .trim();
const visualLength=(value:string)=>Array.from(value).reduce((n,char)=>n+(/[\u2e80-\uffff]/.test(char)?2:1),0);
function wrap(value:string,limit=70){
 const result:string[]=[];let current='';
 for(const char of Array.from(value)){
  if(current&&visualLength(current+char)>limit){result.push(current.trim());current='';}
  current+=char;
 }
 if(current.trim())result.push(current.trim());
 return result.length?result:[''];
}
function parse(name:string,text:string){
 const sections:Section[]=[];let current:Section={title:'内容摘要',items:[]};
 for(const raw of text.replace(/\r/g,'').split('\n')){
  const heading=raw.match(/^#{1,3}\s+(.*)$/);
  if(heading){if(current.items.length)sections.push(current);current={title:clean(heading[1])||'内容摘要',items:[]};continue;}
  const value=clean(raw);if(!value||/^[-:|\s]+$/.test(value))continue;
  current.items.push(...wrap(value));
 }
 if(current.items.length)sections.push(current);
 if(!sections.length)sections.push({title:name,items:['暂无正文内容']});
 return sections;
}
function addFooter(slide:any,name:string,page:number,total:number){
 slide.addText('幕云AI',{x:0.72,y:7.05,w:1.5,h:0.18,fontFace:'Microsoft YaHei',fontSize:9,bold:true,color:'2563EB',margin:0});
 slide.addText(`${name.slice(0,42)}    ${page} / ${total}`,{x:7.2,y:7.05,w:5.4,h:0.18,fontFace:'Microsoft YaHei',fontSize:8.5,color:'74849A',align:'right',margin:0});
}
export function buildPptx(name:string,text:string){
 const pptx=new pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='幕云AI';pptx.subject=name;pptx.title=name;pptx.company='幕云AI';
 pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei'};
 const sections=parse(name,text),pages=sections.flatMap(section=>{
  const chunks:string[][]=[];let current:string[]=[],weight=0;
  for(const item of section.items){const next=Math.max(1,Math.ceil(visualLength(item)/36));if(current.length&&(current.length>=6||weight+next>10)){chunks.push(current);current=[];weight=0;}current.push(item);weight+=next;}
  if(current.length)chunks.push(current);
  return chunks.map((items,index)=>({title:section.title+(index?`（续 ${index+1}）`:''),items}));
 });
 const total=pages.length+1;
 const cover=pptx.addSlide();cover.background={color:'10233F'};
 cover.addText(name,{x:0.9,y:2.05,w:11.5,h:1.25,fontFace:'Microsoft YaHei',fontSize:40,bold:true,color:'FFFFFF',margin:0,fit:'shrink',valign:'middle'});
 cover.addText('幕云AI  ·  工作成果',{x:0.92,y:3.55,w:5,h:0.34,fontFace:'Microsoft YaHei',fontSize:14,bold:true,color:'71A7FF',charSpacing:1.2,margin:0});
 cover.addText('内容可编辑，可继续补充和调整',{x:0.92,y:4.12,w:6.5,h:0.32,fontFace:'Microsoft YaHei',fontSize:13,color:'CEDAF0',margin:0});
 cover.addText(`1 / ${total}`,{x:11.5,y:6.9,w:0.85,h:0.2,fontFace:'Microsoft YaHei',fontSize:9,color:'91A4C2',align:'right',margin:0});
 pages.forEach((page,index)=>{
  const slide=pptx.addSlide();slide.background={color:'F8FAFD'};
  slide.addText(page.title,{x:0.72,y:0.58,w:11.9,h:0.68,fontFace:'Microsoft YaHei',fontSize:30,bold:true,color:'18375F',margin:0,fit:'shrink'});
  const step=Math.min(1.05,4.75/Math.max(1,page.items.length));
  page.items.forEach((item,itemIndex)=>slide.addText(`•  ${item}`,{x:0.94,y:1.62+itemIndex*step,w:11.3,h:Math.min(0.82,step-0.08),fontFace:'Microsoft YaHei',fontSize:page.items.length<=3?21:18.5,color:'2D405B',margin:[2,2,2,2],fit:'shrink',valign:'middle',breakLine:false}));
  addFooter(slide,name,index+2,total);
 });
 return pptx;
}
export async function exportPptx(name:string,text:string){await buildPptx(name,text).writeFile({fileName:name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+'.pptx'});}
