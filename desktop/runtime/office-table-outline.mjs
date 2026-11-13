/** Fixed Word outline preset. Interior borders are cleared; padding is explicit. */
export function normalizeTableOutline(p) {
 if(!p||Object.keys(p).some(k=>!['color','width','padding'].includes(k))||typeof p.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(p.color))throw Error('边框颜色须为#RRGGBB');
 if(typeof p.width!=='number'||!Number.isFinite(p.width)||p.width<0.5||p.width>3||!Number.isInteger(p.width*4))throw Error('外框线宽限0.5–3pt，步长0.25pt');
 if(typeof p.padding!=='number'||!Number.isFinite(p.padding)||p.padding<0||p.padding>12||!Number.isInteger(p.padding*2))throw Error('请明确指定0–12pt单元格内边距，步长0.5pt');
 return {color:p.color.toUpperCase(),width:p.width,padding:p.padding};
}
export const officeTableOutlineDefinition={type:'function',function:{name:'office_table_outline',description:'经单独批准给当前Word简单矩形表格选区设置实线外框颜色/线宽，清除选区内部线并明确设置四边单元格内边距；不是全部网格线。不改正文。仅真实表格选区，最多30行16列200格，不支持合并/嵌套表格。一轮与其他修改共用一次额度。',parameters:{type:'object',properties:{color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},width:{type:'number',minimum:0.5,maximum:3},padding:{type:'number',minimum:0,maximum:12}},required:['color','width','padding'],additionalProperties:false}}};
