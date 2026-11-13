// Fixed Word navigation vocabulary. No text injection or arbitrary native keycode.
export const OFFICE_NAVIGATION_KEYS=Object.freeze(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End']);
export function officeNavigation(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['op','key','shift','control'].includes(k))||value.op!==undefined&&value.op!=='navigate'||!OFFICE_NAVIGATION_KEYS.includes(value.key)||typeof value.shift!=='boolean'||typeof value.control!=='boolean')throw Error('无效的Word导航键或修饰键');
 return {key:value.key,shift:value.shift,control:value.control};
}
export function officeNavigationEvent(event){
 if(event.isComposing||event.keyCode===229||event.altKey||event.metaKey||!OFFICE_NAVIGATION_KEYS.includes(event.key))return null;
 return officeNavigation({key:event.key,shift:!!event.shiftKey,control:!!event.ctrlKey});
}

// Only printable committed keys are forwarded. Composition, shortcuts and
// control keys remain with the browser/OS and are never turned into text.
export function officeTypingEvent(event){
 if(!event||event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||typeof event.key!=='string')return null;
 if(Array.from(event.key).length!==1||/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(event.key))return null;
 return event.key;
}
