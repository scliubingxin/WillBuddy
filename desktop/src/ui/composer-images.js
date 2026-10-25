import {imageFromBase64} from '../shared/image-bytes.js';
/** Selected local thumbnails only; no network and no model call. */
export function createComposerImages(root,read){
 const entries=new Map();let disposed=false;
 const paint=(id,url)=>root.querySelectorAll('img[data-composer-image]').forEach(img=>{if(img.dataset.composerImage===id)img.src=url;});
 return {update(){
  const selected=new Set([...root.querySelectorAll('img[data-composer-image]')].map(i=>i.dataset.composerImage));
  for(const [id,e] of entries)if(!selected.has(id)){e.active=false;if(e.url)URL.revokeObjectURL(e.url);entries.delete(id);}
  for(const id of selected){let e=entries.get(id);if(e){if(e.url)paint(id,e.url);continue;}
   e={active:true};entries.set(id,e);Promise.resolve().then(()=>read(id)).then(row=>{const bytes=imageFromBase64(row.base64);if(!e.active||disposed)return;e.url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));paint(id,e.url);}).catch(()=>{});
  }
 },dispose(){disposed=true;for(const e of entries.values()){e.active=false;if(e.url)URL.revokeObjectURL(e.url);}entries.clear();}};
}
