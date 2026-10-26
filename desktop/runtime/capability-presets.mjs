import catalog from './presets/catalog.json' with {type:'json'};
import {sha256} from './documents.mjs';
import {parseSkillPackage} from './skill-package.mjs';
/** Offline trusted catalog; no network, scripts, credentials or user data. */
export function capabilityPresets(){return {version:catalog.version,checkedDate:catalog.checkedDate,skills:catalog.skills.map(({archiveBase64,files,...p})=>({...p,fileCount:files.length})),mcp:structuredClone(catalog.mcp)};}
export function presetSkill(id){
 const p=catalog.skills.find(p=>p.id===id);if(!p)throw Error('预置技能不存在');
 const bytes=Buffer.from(p.archiveBase64,'base64');if(sha256(bytes)!==p.sha256)throw Error('预置技能完整性检查失败');
 const parsed=parseSkillPackage(p.id+'.zip',bytes);
 if(parsed.files.length!==p.files.length||parsed.files.some(f=>!p.files.some(e=>e.path===f.path&&e.sha256===f.sha256)))throw Error('预置技能资源清单不符');
 return {filename:p.id+'.zip',bytes,metadata:{id:p.id,title:p.title,category:p.category,source:p.source,license:p.license}};
}
