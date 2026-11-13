/** Bounded slide objects: ordered arrays map directly to the PowerPoint z-order. */
const types=new Set(['text','rect','roundRect','ellipse','line','image']);
const color=v=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v);
export function validatePptLayers(slide){
 if(slide.background!==undefined&&!color(slide.background))throw Error('幻灯片背景须为#RRGGBB');
 if(slide.transition!==undefined&&!['none','fade'].includes(slide.transition))throw Error('仅支持无切换或淡入切换');
 if(slide.layers===undefined)return;
 if(!Array.isArray(slide.layers)||slide.layers.length>60)throw Error('每页图层最多60个');
 if(slide.chart||slide.cards||slide.table||(slide.bullets||[]).length)throw Error('自定义图层不能与预置正文布局混用');
 for(const l of slide.layers){
  if(!l||typeof l!=='object'||Array.isArray(l)||!types.has(l.type)||Object.keys(l).some(k=>!['type','x','y','w','h','fill','stroke','strokeWidth','text','fontSize','textColor','bold','align','imageId','opacity'].includes(k)))throw Error('PPT图层类型或属性无效');
  if(['x','y','w','h'].some(k=>typeof l[k]!=='number'||!Number.isFinite(l[k]))||l.x<0||l.y<0||l.w<.05||l.h<.05||l.x+l.w>13.3331||l.y+l.h>7.5001)throw Error('图层位置或尺寸超出页面');
  for(const key of ['fill','stroke','textColor'])if(l[key]!==undefined&&!color(l[key]))throw Error('图层颜色须为#RRGGBB');
  if(l.opacity!==undefined&&(typeof l.opacity!=='number'||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>100))throw Error('图层透明度范围0至100');
  if(l.strokeWidth!==undefined&&(typeof l.strokeWidth!=='number'||!Number.isFinite(l.strokeWidth)||l.strokeWidth<0||l.strokeWidth>6))throw Error('线宽范围0至6');
  if(l.type==='text'&&(typeof l.text!=='string'||l.text.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(l.text)))throw Error('文字图层内容无效');
  if(l.fontSize!==undefined&&(typeof l.fontSize!=='number'||!Number.isFinite(l.fontSize)||l.fontSize<6||l.fontSize>96))throw Error('文字字号范围6至96');
  if(l.bold!==undefined&&typeof l.bold!=='boolean')throw Error('bold须为布尔值');
  if(l.align!==undefined&&!['left','center','right'].includes(l.align))throw Error('文字对齐方式无效');
  if(l.type==='image'&&(typeof l.imageId!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(l.imageId)))throw Error('图片必须使用本轮附加的图片ID');
 }
}
export function pptImageIds(spec){return [...new Set(spec.slides.flatMap(s=>(s.layers||[]).filter(l=>l.type==='image').map(l=>l.imageId)))];}
export function drawPptLayers(slide,layers,images){
 for(const l of layers||[]){const {x,y,w,h}=l;if(l.type==='image'){const img=images?.[l.imageId];if(!img)throw Error('未获得此PPT图片的有效授权');const scale=Math.min(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;slide.addImage({data:'data:image/png;base64,'+img.base64,x:x+(w-iw)/2,y:y+(h-ih)/2,w:iw,h:ih});continue;}
  if(l.type==='text'){slide.addText(l.text,{x,y,w,h,fontSize:l.fontSize||18,fontFace:'Arial',color:(l.textColor||'#25364A').slice(1),bold:l.bold===true,align:l.align||'left',valign:'top',margin:0,fit:'shrink',breakLine:false});continue;}
  slide.addShape(l.type,{x,y,w,h,line:{color:(l.stroke||l.fill||'#0078CB').slice(1),width:l.strokeWidth??1,transparency:l.type==='line'||l.stroke?0:100},...(l.type==='line'?{}:{fill:{color:(l.fill||'#FFFFFF').slice(1),transparency:100-(l.opacity??100)}})});
 }
}
