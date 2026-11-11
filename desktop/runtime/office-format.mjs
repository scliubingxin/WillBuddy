export function normalizeOfficeFormat(p) {
  if (!p || Object.keys(p).some(k => !['fontName', 'fontNameAsian', 'fontSize', 'fontColor', 'backgroundColor'].includes(k))) throw Error('不支持的格式参数');
  const out = {};
  for (const key of ['fontName', 'fontNameAsian']) {
    if (p[key] === undefined) continue;
    const n = p[key];
    if (typeof n !== 'string' || !n.length || n.length > 80 || n !== n.trim() || /[\u0000-\u001f\u007f<>:/\\]/u.test(n)) throw Error('字体名称无效');
    out[key] = n;
  }
  if (p.fontSize !== undefined) {
    const n = p.fontSize;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 6 || n > 96 || !Number.isInteger(n * 2)) throw Error('字号限6–96pt，步长0.5pt');
    out.fontSize = n;
  }
  for (const key of ['fontColor', 'backgroundColor']) {
    if (p[key] === undefined) continue;
    if (typeof p[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(p[key])) throw Error('颜色须为#RRGGBB');
    out[key] = p[key].toUpperCase();
  }
  if (!Object.keys(out).length) throw Error('请指定字体、字号或颜色');
  return out;
}
export const officeFormatDefinition = {type:'function',function:{name:'office_format_selection',description:'经用户单独批准修改当前Word可唯一对应的简单正文连续纯文字段落选区的西文字体、东亚字体属性、字号、文字颜色fontColor或文字背景色backgroundColor并保存新版本；不替换文字。每任务最多一次修改。指定字体不保证本机已安装，fontName为西文字体，fontNameAsian为中文等东亚字体；统一中西文字体时须分别指定。不保证缺字已解决。',parameters:{type:'object',properties:{fontName:{type:'string',maxLength:80},fontNameAsian:{type:'string',maxLength:80},fontColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},backgroundColor:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},fontSize:{type:'number',minimum:6,maximum:96}},additionalProperties:false}}};
