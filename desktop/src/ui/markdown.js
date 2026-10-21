import { Marked } from '../vendor/marked.js';
import createDOMPurify from '../vendor/purify.js';
export const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parser = new Marked({ gfm: true, breaks: true });
const tags = ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 's', 'del', 'u', 'a', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'div', 'span', 'section', 'article', 'header', 'footer', 'small', 'details', 'summary', 'dl', 'dt', 'dd', 'kbd', 'sup', 'sub', 'abbr', 'img', 'input'];
const attrs = ['href', 'title', 'alt', 'colspan', 'rowspan', 'align', 'start', 'reversed', 'open', 'type', 'checked'];
const config = { ALLOWED_TAGS: tags, ALLOWED_ATTR: attrs, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'textarea', 'select', 'option', 'svg', 'math', 'template', 'meta', 'link', 'base'], SANITIZE_NAMED_PROPS: true };
export function extractHtml(content) { const text = String(content || ''); const fenced = text.match(/(?:^|\n)\s*```html[^\n]*\n([\s\S]*?)(?:\n\s*```|$)/i); return fenced ? fenced[1] : /^\s*(?:<!doctype\s+html|<html[\s>]|<body[\s>]|<(?:div|section|article|table|h[1-6]|p)[\s>])/i.test(text) ? text : null; }
export function createRich(window) {
    const purifier = createDOMPurify(window);
    function sanitize(source, { links = true, preview = false } = {}) {
        const settings = preview ? { ...config, ALLOWED_TAGS: [...tags, 'style'], ALLOWED_ATTR: [...attrs, 'style', 'class', 'id'], FORBID_TAGS: config.FORBID_TAGS.filter(tag => tag !== 'style'), FORCE_BODY: true, SANITIZE_NAMED_PROPS: false } : config;
        const fragment = purifier.sanitize(source, { ...settings, RETURN_DOM_FRAGMENT: true });
        for (const link of fragment.querySelectorAll('a')) {
            const href = link.getAttribute('href') || '';
            if (!links || !/^https?:\/\//i.test(href) || /[\u0000-\u0020]/.test(href)) {
                link.removeAttribute('href');
            }
            else {
                try {
                    const url = new URL(href);
                    if (url.username || url.password)
                        link.removeAttribute('href');
                    else {
                        link.className = 'rendered-link';
                        link.rel = 'noopener noreferrer';
                    }
                }
                catch {
                    link.removeAttribute('href');
                }
            }
        }
        for (const img of fragment.querySelectorAll('img')) {
            const label = window.document.createElement('span');
            label.className = 'media-placeholder';
            label.textContent = '[图片' + (img.alt ? '：' + img.alt : '') + ']';
            img.replaceWith(label);
        }
        for (const input of fragment.querySelectorAll('input')) {
            if (input.getAttribute('type') !== 'checkbox') {
                input.remove();
                continue;
            }
            input.disabled = true;
            input.tabIndex = -1;
        }
        for (const table of [...fragment.querySelectorAll('table')]) {
            if (table.closest('table') !== table)
                continue;
            const wrap = window.document.createElement('div');
            wrap.className = 'table-scroll';
            table.replaceWith(wrap);
            wrap.append(table);
        }
        const wrapper = window.document.createElement('div');
        wrapper.append(fragment);
        return wrapper.innerHTML;
    }
    return { rich: content => sanitize(parser.parse(String(content || ''))), sanitizeHtml: sanitize };
}
let browserRenderer;
export function rich(content) { browserRenderer ??= createRich(window); return browserRenderer.rich(content); }
export function htmlPreview(content) {
    browserRenderer ??= createRich(window);
    const body = browserRenderer.sanitizeHtml(String(content).slice(0, 200000), { links: false, preview: true });
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; form-action \'none\'; base-uri \'none\'"><style>body{margin:24px;font:15px/1.8 -apple-system,BlinkMacSystemFont,\"PingFang SC\",sans-serif;color:#243447;background:white;overflow-wrap:anywhere}table{border-collapse:collapse}td,th{border:1px solid #dce5ee;padding:8px 12px}pre{white-space:pre;overflow:auto}.table-scroll{overflow:auto}</style></head><body>' + body + '</body></html>';
}
