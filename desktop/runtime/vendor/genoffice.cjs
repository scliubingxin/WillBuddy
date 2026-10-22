"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vendor/genoffice-html2docx/src/index.ts
var index_exports = {};
__export(index_exports, {
  BROWSER_HELPER_SCRIPTS: () => BROWSER_HELPER_SCRIPTS,
  EXTRACTOR_CALL: () => EXTRACTOR_CALL,
  EXTRACTOR_SOURCE: () => EXTRACTOR_SOURCE,
  FONT_RULES: () => FONT_RULES,
  convertHtmlToDocx: () => convertHtmlToDocx,
  generateDocx: () => generateDocx,
  mapFont: () => mapFont,
  normalizeIr: () => normalizeIr,
  parsePageBgColor: () => parsePageBgColor,
  raceWithAbort: () => raceWithAbort
});
module.exports = __toCommonJS(index_exports);

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/styles.js
var styles_default = "  const SKIP_TAGS = new Set([\n    'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE',\n  ]);\n  let shotCounter = 0;\n  const MAX_SCREENSHOT_SLICE_COUNT = 64;\n  const DEFAULT_SCREENSHOT_SLICE_HEIGHT = 700;\n  function boundedScreenshotSliceCount(height, maxSliceHeight = DEFAULT_SCREENSHOT_SLICE_HEIGHT) {\n    const value = Number(height);\n    const sliceHeight = Number(maxSliceHeight);\n    if (\n      !Number.isFinite(value) ||\n      value <= 0 ||\n      !Number.isFinite(sliceHeight) ||\n      sliceHeight <= 0\n    ) {\n      return 0;\n    }\n    const count = Math.ceil(value / sliceHeight);\n    // Clamp rather than reject: the bound still caps the work a hostile height\n    // can demand, while a legitimately tall page keeps its first slices (the\n    // document top) instead of converting to nothing.\n    return Math.min(count, MAX_SCREENSHOT_SLICE_COUNT);\n  }\n\n  const styleCache = new WeakMap();\n  function cs(el) {\n    if (!styleCache.has(el)) styleCache.set(el, getComputedStyle(el));\n    return styleCache.get(el);\n  }\n\n  function isVisible(el) {\n    const s = cs(el);\n    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;\n    const r = el.getBoundingClientRect();\n    return r.width > 1 && r.height > 1;\n  }\n\n  function parseColor(colorStr) {\n    if (!colorStr) return null;\n    const m = colorStr.match(/rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,\\s/]+([\\d.]+))?\\s*\\)/);\n    if (!m) return null;\n    return {\n      r: +m[1],\n      g: +m[2],\n      b: +m[3],\n      a: m[4] === undefined ? 1 : parseFloat(m[4]),\n    };\n  }\n\n  function compositeRgb(color, backdrop) {\n    const a = color.a;\n    return {\n      r: Math.round(color.r * a + backdrop.r * (1 - a)),\n      g: Math.round(color.g * a + backdrop.g * (1 - a)),\n      b: Math.round(color.b * a + backdrop.b * (1 - a)),\n      a: 1,\n    };\n  }\n\n  function backdropRgbOf(el) {\n    const ancestors = [];\n    for (let cur = el?.parentElement; cur; cur = cur.parentElement) ancestors.push(cur);\n    let backdrop = { r: 255, g: 255, b: 255, a: 1 };\n    for (const ancestor of ancestors.reverse()) {\n      let color = parseColor(cs(ancestor).backgroundColor);\n      // A gradient-painted ancestor (background-image, not backgroundColor)\n      // is invisible to this walk otherwise: a translucent white overlay\n      // nested inside it composites against the default white backdrop and\n      // reads as near-white, so paintedBgHex's white-preserve fallback then\n      // hardcodes opaque FFFFFF \u2014 white text on a white cell, content\n      // effectively invisible. Approximate with the first gradient stop,\n      // same fallback bgHex uses for the gradient element itself.\n      if (!color || color.a < 0.05) {\n        const stop = gradientBaseStop(cs(ancestor).backgroundImage);\n        if (stop) color = parseColor(stop);\n      }\n      if (color && color.a >= 0.05) backdrop = compositeRgb(color, backdrop);\n    }\n    return backdrop;\n  }\n\n  // 'rgb(a)' -> 'RRGGBB' hex, or null for transparent / near-white.\n  // Light documents retain white-backed tints; dark documents pass their\n  // resolved ancestor paint so alpha colors keep their authored contrast.\n  function toHex(colorStr, { dropWhite = false, backdrop = null } = {}) {\n    const color = parseColor(colorStr);\n    if (!color) return null;\n    let { r, g, b, a } = color;\n    if (a < 0.05) return null;\n    if (a < 1) {\n      ({ r, g, b } = compositeRgb(color, backdrop || { r: 255, g: 255, b: 255 }));\n    }\n    if (dropWhite && r > 250 && g > 250 && b > 250) return null;\n    const hex = (n) => n.toString(16).padStart(2, '0');\n    return (hex(r) + hex(g) + hex(b)).toUpperCase();\n  }\n\n  function hexLuminance(hex) {\n    if (!hex || hex.length < 6) return 0;\n    const n = parseInt(hex.slice(0, 6), 16);\n    if (Number.isNaN(n)) return 0;\n    const r = (n >> 16) & 255;\n    const g = (n >> 8) & 255;\n    const b = n & 255;\n    return 0.2126 * r + 0.7152 * g + 0.0722 * b;\n  }\n\n  // Representative paint of a (possibly multi-layer) gradient background:\n  // the first sufficiently-opaque stop of the BOTTOM layer. CSS paints the\n  // first listed layer on top, so decorative low-alpha radial accents come\n  // first and the base gradient last \u2014 grabbing the first color in the whole\n  // string painted a dark hero with its 0.18-alpha gold accent (near-white\n  // shading under white text) instead of its dark base.\n  function gradientBaseStop(bgImage) {\n    if (!bgImage || !bgImage.includes('gradient')) return null;\n    const lastLayerStart = bgImage.lastIndexOf('-gradient(');\n    const layer = lastLayerStart >= 0 ? bgImage.slice(lastLayerStart) : bgImage;\n    let first = null;\n    for (const match of layer.matchAll(/rgba?\\([^)]+\\)|#[0-9a-fA-F]{3,8}/g)) {\n      first = first || match[0];\n      const color = parseColor(match[0]);\n      // #hex tokens don't parse -> opaque; skip translucent overlay stops\n      if (!color || color.a >= 0.5) return match[0];\n    }\n    return first;\n  }\n\n  function bgHex(el) {\n    const solid = toHex(cs(el).backgroundColor, { dropWhite: true, backdrop: backdropRgbOf(el) });\n    if (solid) return solid;\n    // gradient-painted box with no solid backgroundColor: approximate with\n    // a representative stop, or light foreground text lands on a white page\n    const stop = gradientBaseStop(cs(el).backgroundImage);\n    if (stop) return toHex(stop, { dropWhite: true });\n    return null;\n  }\n\n  // True when el sits on a solid tint or a CSS background-image/gradient.\n  // White cards on those surfaces must keep FFFFFF or the backdrop shows through.\n  function hasTintedBackdrop(el) {\n    let anc = el.parentElement;\n    while (anc) {\n      if (bgHex(anc)) return true;\n      const s = cs(anc);\n      if (s.backgroundImage && s.backgroundImage !== 'none') return true;\n      if (anc === document.documentElement) break;\n      anc = anc.parentElement;\n    }\n    return false;\n  }\n\n  // Like bgHex, but keeps authored white/near-white paint when it covers a\n  // tinted or gradient backdrop (page wash, section band, etc.).\n  function paintedBgHex(el) {\n    const shaded = bgHex(el);\n    if (shaded) return shaded;\n    const raw = toHex(cs(el).backgroundColor);\n    if (!raw || !hasTintedBackdrop(el)) return null;\n    return 'FFFFFF';\n  }\n\n\n  // A compact painted pill/badge (inline-block, nowrap, own background):\n  // shared signal that a container's exact visual row must be screenshot.\n  function isCompactPaintedLabel(child) {\n    const childStyle = cs(child);\n    return (\n      childStyle.display === 'inline-block' &&\n      childStyle.whiteSpace === 'nowrap' &&\n      Boolean(bgHex(child)) &&\n      (child.innerText || '').trim().length <= 30 &&\n      child.getBoundingClientRect().height <= 50\n    );\n  }\n\n  function isMono(s) {\n    return /mono|consolas|courier|menlo|jetbrains/i.test(s.fontFamily);\n  }\n\n  const DOC_RTL =\n    getComputedStyle(document.body).direction === 'rtl' ||\n    getComputedStyle(document.documentElement).direction === 'rtl';\n\n  function isRTL(el) {\n    return cs(el).direction === 'rtl';\n  }\n\n  // Resolve text-align to a physical alignment, accounting for direction.\n  // In an RTL block, 'start' (the browser default) means the right side \u2014\n  // Word's w:bidi paragraphs already default to right, so return undefined\n  // and let the bidi default apply; an explicit left/end must survive as\n  // physical left.\n  function textAlignOf(el) {\n    const s = cs(el);\n    const ta = s.textAlign;\n    if (ta === 'center') return 'center';\n    if (ta.startsWith('justify')) return 'justify';\n    if (s.direction === 'rtl') {\n      if (ta === 'left' || ta === 'end') return 'left';\n      return undefined; // start / right == bidi paragraph default\n    }\n    if (ta === 'right' || ta === 'end') return 'right';\n    return undefined;\n  }\n\n  function borderLeftOf(el) {\n    const s = cs(el);\n    const w = parseFloat(s.borderLeftWidth);\n    if (w >= 2 && s.borderLeftStyle !== 'none') {\n      const color = toHex(s.borderLeftColor);\n      if (color) return { color, widthPx: w };\n    }\n    // ::before painted as a narrow vertical accent bar (\u258E section headings,\n    // timeline rails): visually a left border, but authored as a\n    // pseudo-element; gradient rails take their first color stop.\n    const before = getComputedStyle(el, '::before');\n    if (before && before.content === '\"\"') {\n      const bw = parseFloat(before.width);\n      const bh = parseFloat(before.height);\n      const gradientStop = before.backgroundImage.match(/rgba?\\([^)]+\\)|#[0-9a-fA-F]{3,8}/)?.[0];\n      const color = toHex(before.backgroundColor) || (gradientStop && toHex(gradientStop));\n      if (color && bw >= 2 && bw <= 10 && bh >= 10) {\n        return { color, widthPx: bw };\n      }\n    }\n    return null;\n  }\n\n  function borderRightOf(el) {\n    const s = cs(el);\n    const w = parseFloat(s.borderRightWidth);\n    if (w >= 2 && s.borderRightStyle !== 'none') {\n      const color = toHex(s.borderRightColor);\n      if (color) return { color, widthPx: w };\n    }\n    return null;\n  }\n\n  // ::before/::after painted as a full-width horizontal bar (decorative\n  // section rules). Not in the DOM, so probed via computed pseudo styles.\n  function pseudoBar(el, which) {\n    const s = getComputedStyle(el, which);\n    if (!s || s.content === 'none') return null;\n    if (s.position === 'fixed') return null;\n    const h = parseFloat(s.height);\n    if (!(h >= 1 && h <= 8)) return null;\n    const w = parseFloat(s.width);\n    const elW = el.getBoundingClientRect().width;\n    const fullRule = w >= elW * 0.5;\n    // absolute pseudos are usually dropped (not in flow), but a thin\n    // full-width bar hugging the element is a decorative underline that\n    // should survive (section-title::after { position:absolute; bottom:-5px })\n    if (s.position === 'absolute') {\n      const top = Math.abs(parseFloat(s.top));\n      const bottom = Math.abs(parseFloat(s.bottom));\n      const hugsEdge = Math.min(isNaN(top) ? 99 : top, isNaN(bottom) ? 99 : bottom) <= 12;\n      if (!fullRule || !hugsEdge) return null;\n    }\n    if (s.position !== 'absolute' && s.display !== 'block') return null;\n    const shortAccent = w >= 20 && w <= 120;\n    if (!(w > 0) || (!fullRule && !shortAccent)) return null;\n    const color = toHex(s.backgroundColor, { dropWhite: true });\n    if (!color) return null;\n    return {\n      type: 'hr',\n      color,\n      heightPx: h,\n      widthFrac: Math.min(1, w / elW),\n      short: shortAccent && !fullRule,\n      spacingBeforePx: Math.max(0, parseFloat(s.marginTop) || 0),\n      spacingAfterPx: Math.max(0, parseFloat(s.marginBottom) || 0),\n    };\n  }\n\n  function pseudoMarker(el) {\n    for (const which of ['::before', '::after']) {\n      const s = getComputedStyle(el, which);\n      if (!s || s.content === 'none' || s.content === 'normal') continue;\n      const content = s.content.replace(/^['\"]|['\"]$/g, '');\n      if (content.trim()) continue;\n      const width = parseFloat(s.width);\n      const height = parseFloat(s.height);\n      if (\n        width < 5 ||\n        width > 24 ||\n        height < 5 ||\n        height > 24 ||\n        Math.abs(width - height) > 6\n      ) {\n        continue;\n      }\n      const color =\n        toHex(s.backgroundColor, { dropWhite: true }) ||\n        toHex(s.borderTopColor, { dropWhite: true });\n      if (!color) continue;\n      return {\n        text: s.transform && s.transform !== 'none' ? '\\u25c6 ' : '\\u25a0 ',\n        color,\n        sizePx: Math.max(width, height),\n        bold: false,\n      };\n    }\n    return null;\n  }\n\n  // Timeline entry decorations: an absolutely positioned pseudo dot (round\n  // marker) and/or a thin vertical connector rail in the left padding gutter.\n  // Both are position:absolute, so the flow rules drop them; callers\n  // reproduce the rail as a paragraph left border and the dot as a colored\n  // disc run.\n  function timelineDecorOf(el) {\n    const s = cs(el);\n    if (s.position !== 'relative') return null;\n    const padL = parseFloat(s.paddingLeft) || 0;\n    if (padL < 12 || padL > 60) return null;\n    let dot = null;\n    let rail = null;\n    for (const which of ['::before', '::after']) {\n      const p = getComputedStyle(el, which);\n      if (!p || p.content === 'none' || p.content === 'normal') continue;\n      if (p.position !== 'absolute') continue;\n      if (p.content.replace(/^['\"]|['\"]$/g, '').trim()) continue;\n      const w = parseFloat(p.width);\n      const h = parseFloat(p.height);\n      const left = parseFloat(p.left);\n      if (!(left >= -2 && left < padL)) continue;\n      const color = toHex(p.backgroundColor, { dropWhite: true });\n      if (!color) continue;\n      if (w >= 5 && w <= 24 && h >= 5 && h <= 24 && Math.abs(w - h) <= 6) {\n        dot = { color, sizePx: Math.max(w, h) };\n      } else if (w >= 1 && w <= 4 && h > 30) {\n        rail = { color, widthPx: Math.max(1, Math.round(w)), leftPx: left };\n      }\n    }\n    return dot || rail ? { dot, rail, padL, railLeftPx: rail?.leftPx } : null;\n  }\n\n  function borderTopOf(el) {\n    const s = cs(el);\n    const w = parseFloat(s.borderTopWidth);\n    if (w >= 2 && s.borderTopStyle !== 'none') {\n      const color = toHex(s.borderTopColor);\n      if (color) return { color, widthPx: w };\n    }\n    return null;\n  }\n\n  function borderSideOf(el, side) {\n    const s = cs(el);\n    const cap = side[0].toUpperCase() + side.slice(1);\n    const width = parseFloat(s[`border${cap}Width`]);\n    if (width < 1 || s[`border${cap}Style`] === 'none') return null;\n    const color = toHex(s[`border${cap}Color`]);\n    return color ? { color, widthPx: width, style: s[`border${cap}Style`] } : null;\n  }\n\n  function bordersOf(el) {\n    const borders = {};\n    for (const side of ['top', 'bottom', 'left', 'right']) {\n      const border = borderSideOf(el, side);\n      if (border) borders[side] = border;\n    }\n    return Object.keys(borders).length ? borders : null;\n  }\n\n  function cellPaddingOf(el) {\n    const s = cs(el);\n    return {\n      top: Math.max(0, Math.round(parseFloat(s.paddingTop) || 0)),\n      bottom: Math.max(0, Math.round(parseFloat(s.paddingBottom) || 0)),\n      left: Math.max(0, Math.round(parseFloat(s.paddingLeft) || 0)),\n      right: Math.max(0, Math.round(parseFloat(s.paddingRight) || 0)),\n    };\n  }\n\n  // Background painted by an *inline* ancestor (text highlight). Block-level\n  // backgrounds are handled as paragraph/cell shading, so stop at the first\n  // non-inline ancestor to avoid double-painting.\n  // Marker-pen highlight: linear-gradient(transparent 60%, color 40%) on an\n  // inline span. Word has no partial-height run shading, so the marker color\n  // becomes a full-height run highlight.\n  function markerGradientHex(el) {\n    const bgImage = cs(el).backgroundImage;\n    if (!bgImage || !bgImage.startsWith('linear-gradient')) return null;\n    const stops = [...bgImage.matchAll(/rgba?\\(([\\d.\\s,]+)\\)/g)];\n    if (!stops.length) return null;\n    const last = stops[stops.length - 1][1].split(',').map(parseFloat);\n    const [r, g, b, a = 1] = last;\n    if (!(a >= 0.15)) return null;\n    const mix = (c) => Math.round(c * a + 255 * (1 - a));\n    return toHex(`rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`, { dropWhite: true });\n  }\n\n  function inlineBgHex(el) {\n    let cur = el;\n    while (cur && cur.nodeType === Node.ELEMENT_NODE) {\n      const d = cs(cur).display;\n      if (!(d === 'inline' || d.startsWith('inline-') || d === 'contents')) return null;\n      const bg = bgHex(cur) || markerGradientHex(cur);\n      if (bg) return bg;\n      cur = cur.parentElement;\n    }\n    return null;\n  }\n\n  function runStyleOf(el) {\n    const s = cs(el);\n    const style = {\n      bold: parseInt(s.fontWeight, 10) >= 600,\n      italic: s.fontStyle === 'italic',\n      underline: s.textDecorationLine.includes('underline'),\n      strike: s.textDecorationLine.includes('line-through'),\n      color: toHex(s.color) || '000000',\n      sizePx: parseFloat(s.fontSize),\n      mono: isMono(s),\n      letterSpacing: parseFloat(s.letterSpacing) || 0,\n      fontFamily: s.fontFamily,\n    };\n    // Inline(-block) span underlined via border-bottom (recipient names,\n    // signature lines): text-decoration never sees it, so map the lone\n    // bottom border to a run underline. Boxed chips (any other side) skip.\n    if (\n      !style.underline &&\n      (s.display || '').startsWith('inline') &&\n      s.borderBottomStyle !== 'none' &&\n      parseFloat(s.borderBottomWidth) >= 1 &&\n      s.borderTopStyle === 'none' &&\n      s.borderLeftStyle === 'none' &&\n      s.borderRightStyle === 'none'\n    ) {\n      style.underline = true;\n      if (s.borderBottomStyle === 'dotted' || s.borderBottomStyle === 'dashed') {\n        style.underlineStyle = s.borderBottomStyle;\n      }\n      const underlineHex = toHex(s.borderBottomColor);\n      if (underlineHex) style.underlineColor = underlineHex;\n    }\n    // Inline boxed chip (O/X answer labels, small tags): a same-color border\n    // on every side of a short inline element is a character box \u2014 map it to a\n    // run border (w:bdr). Word can't round the corners, but the frame survives.\n    // Restricted to short text so a bordered inline phrase isn't boxed whole.\n    if (\n      (s.display || '').startsWith('inline') &&\n      (el.innerText || '').trim().length <= 8 &&\n      parseFloat(s.borderTopWidth) >= 1 &&\n      s.borderTopStyle !== 'none'\n    ) {\n      const bc = toHex(s.borderTopColor);\n      if (\n        bc &&\n        toHex(s.borderRightColor) === bc &&\n        toHex(s.borderBottomColor) === bc &&\n        toHex(s.borderLeftColor) === bc\n      ) {\n        style.charBorder = { color: bc, widthPx: parseFloat(s.borderTopWidth) };\n      }\n    }\n    const hl = inlineBgHex(el);\n    if (hl) style.highlight = hl;\n    if (s.verticalAlign === 'super' || el.closest('sup')) style.superscript = true;\n    else if (s.verticalAlign === 'sub' || el.closest('sub')) style.subscript = true;\n    if (s.textTransform === 'uppercase') style.uppercase = true;\n    if (s.direction === 'rtl') style.rtl = true;\n    const a = el.closest('a[href]');\n    if (a) {\n      const href = a.getAttribute('href') || '';\n      if (href.startsWith('#') && href.length > 1) {\n        try {\n          style.anchor = decodeURIComponent(href.slice(1));\n        } catch {\n          style.anchor = href.slice(1);\n        }\n      } else if (href && !/^javascript:/i.test(href)) {\n        style.href = a.href;\n      }\n    }\n    return style;\n  }\n\n";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/runs-screenshots.js
var runs_screenshots_default = `  // Regional_Indicator pairs (flag emoji \\uD83C\\uDDEC\\uD83C\\uDDE7) are not Extended_Pictographic, so
  // match them explicitly or they stay in the body-font run and render as the
  // bare letters ("GB").
  const EMOJI_RE = /\\p{Extended_Pictographic}|\\p{Regional_Indicator}/u;
  const EMOJI_SEQUENCE_RE =
    /(\\p{Regional_Indicator}{2}|\\p{Extended_Pictographic}(?:\\uFE0E|\\uFE0F)?(?:\\p{Emoji_Modifier})?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0E|\\uFE0F)?(?:\\p{Emoji_Modifier})?)*)/gu;

  // Arrows and misc technical symbols (\u2194 \u2192 \u21C4 \u2026): CJK body fonts often lack
  // the glyph in Word and render a box. Split them into symbol-font runs.
  const SYMBOL_RE = /[\u2190-\u21FF\u25A0-\u25FF\u2900-\u297F\u2B00-\u2BFF]/;
  const SYMBOL_SEQUENCE_RE = /([\u2190-\u21FF\u25A0-\u25FF\u2900-\u297F\u2B00-\u2BFF]+)/g;

  function splitEmojiRuns(runs) {
    return runs
      .flatMap((run) => {
        // Arrows first: U+2194-21FF are Extended_Pictographic, but in prose
        // they are text glyphs \u2014 the emoji font would paint them as blue
        // emoji chips.
        if (!run.text || !SYMBOL_RE.test(run.text)) return [run];
        return run.text
          .split(SYMBOL_SEQUENCE_RE)
          .filter(Boolean)
          // No VS15 injection: the symbol-font assignment already forces text
          // presentation, and the selector pollutes copied/searched text.
          .map((text) =>
            SYMBOL_RE.test(text) ? { ...run, text, symbol: true } : { ...run, text },
          );
      })
      .flatMap((run) => {
        if (run.symbol || !run.text || !EMOJI_RE.test(run.text)) return [run];
        return run.text
          .split(EMOJI_SEQUENCE_RE)
          .filter(Boolean)
          .map((text) => ({ ...run, text, emoji: isColorEmoji(text) }));
      });
  }

  // Only default-emoji-presentation glyphs (\u{1F4D8} \u{1F1EC}\u{1F1E7} \u2B50), a VS16-forced one
  // (\u2605\uFE0F), or a flag pair get the unset-font color-emoji path. Text-presentation
  // dingbats (\u2605 \u2606 \u25CF \u25A0 U+2605\u2026) stay in the body font so they keep the run's
  // color instead of turning into a colored emoji star.
  const COLOR_EMOJI_RE = /\\p{Emoji_Presentation}|\\p{Regional_Indicator}/u;
  function isColorEmoji(text) {
    return COLOR_EMOJI_RE.test(text) || /\uFE0F/.test(text);
  }

  // Collect styled text runs from a list of DOM nodes (text + inline elements).
  // baseEl provides the coordinate frame for tab-stop measurement.
  function runsFromNodes(nodes, baseEl) {
    const runs = [];
    const baseRect = baseEl ? baseEl.getBoundingClientRect() : null;
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // A long run of spaces/nbsp is a column separator (Word-exported HTML
        // spreads columns and right-aligns dates this way). Emit a tab marker
        // and measure where the following content actually starts so the
        // generator can place an equivalent tab stop.
        const raw = node.textContent;
        // newline-preserving white-space (pre-wrap message bodies): authored
        // \\n are real line/paragraph breaks, not collapsible spaces
        if (raw.includes('\\n') && node.parentElement) {
          const ws = cs(node.parentElement).whiteSpace || '';
          if (ws.startsWith('pre') || ws === 'break-spaces') {
            const style = runStyleOf(node.parentElement);
            raw.split('\\n').forEach((line, i) => {
              if (i) runs.push({ text: '\\n', ...style });
              const text = line.replace(/\\s+/g, ' ');
              if (text.trim()) runs.push({ text, ...style });
            });
            return;
          }
        }
        const parts = raw.split(/(\\s{6,})/);
        let offset = 0;
        for (const part of parts) {
          if (part) {
            let isSeparator = false;
            let tabFrac = null;
            if (/^\\s{6,}$/.test(part) && baseRect && baseRect.width > 0) {
              // Only a *rendered* wide gap is a column separator. Raw source
              // may contain long space runs that the browser collapses to a
              // single space (Word-exported HTML) \u2014 those must stay spaces.
              try {
                const range = document.createRange();
                range.setStart(node, offset);
                range.setEnd(node, offset + part.length);
                const rect = range.getBoundingClientRect();
                if (rect && rect.width > 14) {
                  isSeparator = true;
                  tabFrac = (rect.right - baseRect.left) / baseRect.width;
                }
              } catch (e) { /* fall through as plain space */ }
            }
            if (isSeparator && tabFrac != null && tabFrac >= 0.6) {
              // Gap pushing content to the far right: right-aligned tab (dates).
              runs.push({ text: '\\t', tabFrac, ...runStyleOf(node.parentElement) });
            } else if (isSeparator) {
              // Mid-line column gap: fixed wide space (tab stops in Word are
              // too fragile to reproduce arbitrary column positions).
              runs.push({ text: '\\u00a0\\u00a0\\u00a0 ', ...runStyleOf(node.parentElement) });
            } else {
              const text = part.replace(/\\s+/g, ' ');
              if (text) runs.push({ text, ...runStyleOf(node.parentElement) });
            }
          }
          offset += part.length;
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (SKIP_TAGS.has(node.tagName)) return;
      if (node.tagName === 'BR') {
        // BR has a 0x0 rect, so this must come before the visibility check
        runs.push({ text: '\\n', ...runStyleOf(node.parentElement) });
        return;
      }
      // Empty underline blanks can report ~1px height and fail isVisible.
      {
        const fillInEarly = fillInLineNode(node);
        if (fillInEarly?.inline) {
          const style = cs(node);
          const fontSize = parseFloat(style.fontSize) || 14;
          const spaceWidth = Math.max(3, fontSize * 0.45);
          const count = Math.max(3, Math.round(fillInEarly.width / spaceWidth));
          const bottom = fillInEarly.borders?.bottom;
          runs.push({
            text: '\\u00a0'.repeat(count),
            underline: true,
            underlineStyle: bottom?.style || 'solid',
            color: bottom?.color || '000000',
            sizePx: fontSize,
            preserveWhitespace: true,
          });
          return;
        }
      }
      if (!isVisible(node)) return;
      // Preceding content glued to this element in the source (no whitespace
      // text node): a block child renders on its own LINE in the browser
      // (August 16<span class="h3-sub" style="display:block">Arrival\u2026), and
      // an inline sibling separated by CSS margin needs a space \u2014 without
      // either, the words fuse in Word ("August 16Arrival").
      if (
        runs.length &&
        runs[runs.length - 1].text &&
        !/\\s$/.test(runs[runs.length - 1].text)
      ) {
        if (cs(node).display === 'block') {
          runs.push({ text: '\\n', ...runStyleOf(node.parentElement || node) });
        } else {
          const prevSibling = node.previousSibling;
          if (
            prevSibling &&
            prevSibling.nodeType === Node.TEXT_NODE &&
            /\\S$/.test(prevSibling.textContent)
          ) {
            try {
              const lastGlyph = document.createRange();
              lastGlyph.setStart(prevSibling, prevSibling.textContent.length - 1);
              lastGlyph.setEnd(prevSibling, prevSibling.textContent.length);
              const prevRight = lastGlyph.getBoundingClientRect().right;
              const glyphs = document.createRange();
              glyphs.selectNodeContents(node);
              const nodeLeft = glyphs.getBoundingClientRect().left;
              if (nodeLeft - prevRight >= 3) {
                runs.push({ text: ' ', ...runStyleOf(node.parentElement || node) });
              }
            } catch (e) {
              /* no gap detected, nothing to add */
            }
          }
        }
      }
      if (isMathContainer(node)) {
        const r = node.getBoundingClientRect();
        if (r.width >= 3 && r.height >= 6) {
          const shot = markForScreenshot(node);
          runs.push({
            text: '',
            inlineImage: true,
            shotId: shot.shotId,
            width: shot.width,
            height: shot.height,
          });
        }
        return;
      }
      if (node.tagName === 'SVG' || node.tagName === 'svg' || node.tagName === 'IMG') {
        const r = node.getBoundingClientRect();
        if (r.width <= 64 && r.height <= 64) {
          const shot = markForScreenshot(node);
          runs.push({
            text: '',
            inlineImage: true,
            shotId: shot.shotId,
            width: shot.width,
            height: shot.height,
          });
          const style = cs(node);
          const parentStyle = node.parentElement ? cs(node.parentElement) : null;
          const gapPx = Math.max(
            parseFloat(style.marginRight) || 0,
            parseFloat(parentStyle?.columnGap) || parseFloat(parentStyle?.gap) || 0,
          );
          if (gapPx >= 4) {
            const spaceWidth = Math.max(3, (parseFloat(parentStyle?.fontSize) || 14) * 0.3);
            const count = Math.max(1, Math.round((gapPx - spaceWidth) / spaceWidth));
            runs.push({
              text: '\\u00a0'.repeat(count),
              ...runStyleOf(node.parentElement || node),
              preserveWhitespace: true,
            });
          }
        }
        return;
      }
      // Empty painted chip (legend color swatch, status dot): no text, no
      // children, just a small background/border box \\u2014 dropping it loses the
      // color-to-meaning key, so inline-embed it like a small icon.
      {
        const chipStyle = cs(node);
        const r = node.getBoundingClientRect();
        if (
          !node.childElementCount &&
          !(node.innerText || '').trim() &&
          r.width >= 4 && r.width <= 28 &&
          r.height >= 4 && r.height <= 28 &&
          (bgHex(node) ||
            (chipStyle.backgroundImage || '').includes('gradient') ||
            (parseFloat(chipStyle.borderTopWidth) > 0 && parseFloat(chipStyle.borderRadius) > 0))
        ) {
          const shot = markForScreenshot(node);
          runs.push({
            text: '',
            inlineImage: true,
            shotId: shot.shotId,
            width: shot.width,
            height: shot.height,
          });
          const parentStyle = node.parentElement ? cs(node.parentElement) : null;
          const gapPx = Math.max(
            parseFloat(chipStyle.marginRight) || 0,
            parseFloat(parentStyle?.columnGap) || parseFloat(parentStyle?.gap) || 0,
          );
          if (gapPx >= 4) {
            const spaceWidth = Math.max(3, (parseFloat(parentStyle?.fontSize) || 14) * 0.3);
            const count = Math.max(1, Math.round((gapPx - spaceWidth) / spaceWidth));
            runs.push({
              text: '\\u00a0'.repeat(count),
              ...runStyleOf(node.parentElement || node),
              preserveWhitespace: true,
            });
          }
          return;
        }
      }
      if (isCheckboxLike(node)) {
        runs.push(checkboxNode(node));
        return;
      }
      const nodeStyle = cs(node);
      const nodeRect = node.getBoundingClientRect();
      // A circular painted badge (numbered day markers) has no text-run
      // equivalent \u2014 the round paint is the point. Plain rectangular chips
      // stay text so they remain searchable.
      const circularBadge =
        (parseFloat(nodeStyle.borderRadius) || 0) >= nodeRect.height / 2 - 1 &&
        Math.abs(nodeRect.width - nodeRect.height) <= nodeRect.height * 0.4 &&
        !/\\s/.test((node.innerText || '').trim());
      const compactPaintedLabel =
        (['inline-block', 'inline-flex', 'inline-grid'].includes(nodeStyle.display) ||
          // a circular badge centering its digit with flex/grid still sits
          // inline in its heading row
          (circularBadge && ['flex', 'grid'].includes(nodeStyle.display))) &&
        (nodeStyle.whiteSpace === 'nowrap' || circularBadge) &&
        // inlineBgHex rejects non-inline displays; a flex badge paints its
        // own background directly
        Boolean(inlineBgHex(node) || (circularBadge && bgHex(node))) &&
        (node.innerText || '').trim().length <= 30 &&
        nodeRect.width >= 12 &&
        nodeRect.width <= 220 &&
        nodeRect.height >= 12 &&
        nodeRect.height <= 50;
      if (compactPaintedLabel) {
        const shot = markForScreenshot(node);
        // Label crushed by a too-narrow column (letters stacked vertically):
        // ask the screenshot pass to relax it to its natural one-line size,
        // and record that relaxed size (measured under nowrap) so the docx
        // shows the image at its true aspect.
        const crushed = node.scrollWidth > node.clientWidth + 2;
        if (crushed) {
          shot.unwrap = true;
          const previousWhiteSpace = node.style.whiteSpace;
          node.style.whiteSpace = 'nowrap';
          shot.width = Math.min(220, node.scrollWidth + 2);
          shot.height = node.clientHeight || shot.height;
          node.style.whiteSpace = previousWhiteSpace || '';
        }
        // A circular badge taller than its line's text inflates the Word row
        // height and pushes near-page-height cards past the page. Display it
        // at the surrounding text's line scale; the PNG keeps full detail.
        let displayWidth = shot.width;
        let displayHeight = shot.height;
        if (circularBadge && node.parentElement) {
          const parentFont = parseFloat(cs(node.parentElement).fontSize) || 16;
          const cap = Math.round(parentFont * 1.35);
          if (displayHeight > cap) {
            displayWidth = Math.round((shot.width * cap) / shot.height);
            displayHeight = cap;
          }
        }
        runs.push({
          text: '',
          inlineImage: true,
          shotId: shot.shotId,
          width: displayWidth,
          height: displayHeight,
          unwrap: shot.unwrap,
        });
        return;
      }
      if (
        !(node.innerText || '').trim() &&
        node.children.length === 0 &&
        (nodeStyle.display === 'inline' || nodeStyle.display === 'inline-block') &&
        nodeRect.width >= 4 &&
        nodeRect.width <= 32 &&
        nodeRect.height >= 4 &&
        nodeRect.height <= 32
      ) {
        const swatch = bgHex(node);
        if (swatch) {
          runs.push({
            text: '\\u25a0 ',
            color: swatch,
            sizePx: Math.max(nodeRect.width, nodeRect.height),
          });
          return;
        }
      }
      const highlightedInline =
        nodeStyle.display.startsWith('inline-') &&
        Boolean(inlineBgHex(node)) &&
        Boolean((node.innerText || '').trim());
      const paddedSpaces = (px) => {
        if (px < 2) return '';
        const spaceWidth = Math.max(3, (parseFloat(nodeStyle.fontSize) || 14) * 0.3);
        return '\\u00a0'.repeat(Math.max(1, Math.round(px / spaceWidth)));
      };
      if (highlightedInline) {
        const leftPad = paddedSpaces(parseFloat(nodeStyle.paddingLeft) || 0);
        if (leftPad) runs.push({ text: leftPad, ...runStyleOf(node), preserveWhitespace: true });
      }
      const inlinePseudoRun = pseudoBulletRun(node);
      if (inlinePseudoRun) runs.push(inlinePseudoRun);
      for (const child of node.childNodes) walk(child);
      // Symmetric to the block-BEFORE rule above: a block child also ends
      // its own line, so following content (an eyebrow <span
      // class="section-num" style="display:block"> glued before heading
      // text) must not fuse onto it. trimRuns drops a trailing break.
      if (
        nodeStyle.display === 'block' &&
        runs.length &&
        runs[runs.length - 1].text &&
        !/\\n$/.test(runs[runs.length - 1].text)
      ) {
        runs.push({ text: '\\n', ...runStyleOf(node.parentElement || node) });
      }
      if (highlightedInline) {
        const rightPad = paddedSpaces(parseFloat(nodeStyle.paddingRight) || 0);
        if (rightPad) runs.push({ text: rightPad, ...runStyleOf(node), preserveWhitespace: true });
      }
      // Inline chip followed directly by text with no space character in the
      // source (<span class="q-mark">Q</span>How...): the visual gap comes
      // from min-width/margin/padding. Keep a space or the words glue.
      const next = node.nextSibling;
      if (
        next &&
        next.nodeType === Node.TEXT_NODE &&
        /^\\S/.test(next.textContent) &&
        runs.length &&
        runs[runs.length - 1].text &&
        !/\\s$/.test(runs[runs.length - 1].text)
      ) {
        try {
          const glyphs = document.createRange();
          glyphs.selectNodeContents(node);
          const glyphRight = glyphs.getBoundingClientRect().right;
          const first = document.createRange();
          first.setStart(next, 0);
          first.setEnd(next, 1);
          const nextLeft = first.getBoundingClientRect().left;
          if (nextLeft - glyphRight >= 3) {
            runs.push({ text: ' ', ...runStyleOf(node.parentElement || node) });
          }
        } catch (e) {
          /* no gap detected, nothing to add */
        }
      }
    }
    for (const node of nodes) walk(node);
    // Latin fragments with neutral punctuation inside an RTL context get
    // bidi-reordered by Word ("Motorola 68010, supplier A" -> "Motorola
    // supplier ,68010 A"): bracket them with LRM so the whole fragment
    // stays one LTR segment. Runs carrying RTL script keep native ordering.
    const isolated = runs.map((run) => {
      if (!run.rtl || !run.text || run.inlineImage) return run;
      if (/[\u0590-\u08FF\uFB1D-\uFEFC]/.test(run.text)) return run;
      if (!/[A-Za-z0-9]/.test(run.text)) return run;
      if (!/[()[\\]{}+*/,.:%~=-]/.test(run.text)) return run;
      return { ...run, text: \`\u200E\${run.text}\u200E\` };
    });
    return splitEmojiRuns(isolated);
  }

  // Measured gap between the element's left edge and its first visible glyph
  // (covers both CSS padding-left and leading nbsp used as manual inset).
  function textInsetLeft(el, rect) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const m = node.textContent.match(/[^\\s\\u00a0]/);
      if (!m) continue;
      try {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + 1);
        const glyph = range.getBoundingClientRect();
        if (glyph.width > 0) return glyph.left - rect.left;
      } catch (e) {
        return 0;
      }
      return 0;
    }
    return 0;
  }

  function trimRuns(runs) {
    if (runs.length) {
      if (!runs[0].preserveWhitespace) runs[0].text = runs[0].text.replace(/^\\s+/, '');
      if (!runs[runs.length - 1].preserveWhitespace) {
        runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\\s+$/, '');
      }
    }
    return runs.filter((r) => r.inlineImage || r.text.length > 0);
  }

  function collectRuns(el) {
    return trimRuns(runsFromNodes([...el.childNodes], el));
  }

  function hasBlockChildren(el) {
    let prevRect = null;
    for (const child of el.children) {
      if (SKIP_TAGS.has(child.tagName)) continue;
      const d = cs(child).display;
      if (d !== 'inline' && !d.startsWith('inline-')) return true;
      // Two wide inline-blocks that render on separate lines (an inline-block
      // heading too wide to share its line with the following inline-block
      // paragraph) are visually blocks; merging them glues the texts. The
      // width guard keeps small wrapping chips/badges on the inline path.
      if (d.startsWith('inline-')) {
        const r = child.getBoundingClientRect();
        const wide = r.width >= el.getBoundingClientRect().width * 0.4;
        if (prevRect && wide && r.height > 0 && r.top >= prevRect.bottom - 2) return true;
        if (r.height > 0 && wide) prevRect = r;
        else if (r.height > 0) prevRect = null;
      }
    }
    return false;
  }

  // Replaced elements (img/svg/canvas) are excluded from inline runs, so a
  // wrapper holding only an inline <img> must still walk children as blocks
  // or the image silently disappears.
  function isReplacedTag(el) {
    const t = el.tagName;
    if (
      t === 'IMG' ||
      t === 'CANVAS' ||
      t === 'SVG' ||
      t === 'svg' ||
      t === 'IFRAME' ||
      t === 'VIDEO' ||
      t === 'AUDIO'
    ) {
      return true;
    }
    if (t === 'TEXTAREA' || t === 'SELECT') return true;
    if (t === 'INPUT') return !isCheckboxLike(el);
    return false;
  }

  function hasReplacedDescendant(el) {
    if (isReplacedTag(el)) return true;
    for (const d of el.querySelectorAll(
      'img, svg, canvas, iframe, video, audio, textarea, select, input:not([type=checkbox]):not([type=radio])',
    )) {
      if (isVisible(d)) return true;
    }
    return false;
  }

  // needs full block walk (vs a single merged paragraph)
  function needsBlockWalk(el) {
    return hasBlockChildren(el) || hasReplacedDescendant(el);
  }

  // decorations=false: only text-level styling (align/spacing/line-height).
  // Used for paragraphs inside cards/cells where the container already owns
  // the border and shading (avoids double-drawn vertical bars).
  function paraStyleOf(el, decorations = true) {
    const s = cs(el);
    const style = {};
    style.cjk = /[\\u3000-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef]/.test(
      el.textContent || '',
    );
    if (isRTL(el)) style.rtl = true;
    const align = textAlignOf(el);
    if (align) style.align = align;
    const mb = parseFloat(s.marginBottom);
    if (mb > 2) style.spacingAfterPx = Math.min(mb, 40);
    const mt = parseFloat(s.marginTop);
    if (mt > 2) style.spacingBeforePx = Math.min(mt, 40);
    if (
      style.spacingBeforePx &&
      el.parentElement === document.body &&
      !el.nextElementSibling
    ) {
      // Large decorative signatures/flourishes at the end of a one-page
      // document should use the remaining page space, not force a blank page.
      style.spacingBeforePx = Math.min(style.spacingBeforePx, 2);
    }
    const ti = parseFloat(s.textIndent);
    if (ti > 2) style.firstLineIndentPx = Math.min(ti, 100);
    const lh = parseFloat(s.lineHeight);
    const fsz = parseFloat(s.fontSize);
    if (lh && fsz && lh / fsz > 1.25) style.lineRatio = Math.min(lh / fsz, 2.2);
    if (style.cjk && lh && fsz) style.exactLineHeightPx = lh;
    // Heading-like paragraph (bold, short, followed by content): keep it on
    // the same page as what it introduces - FAQ questions, styled pseudo-
    // headings etc. are divs/ps in HTML but behave like headings in print.
    const headText = (el.innerText || '').trim();
    if (
      parseFloat(s.fontWeight) >= 600 &&
      headText.length > 0 &&
      headText.length <= 120 &&
      !headText.includes('\\n') &&
      el.nextElementSibling
    ) {
      style.keepNext = true;
      // A short bold heading-like line must also not split across pages
      // mid-word ("EDUCATIO" / "N").
      style.keepLines = true;
    }
    // Short text rendered on ONE browser line: record the measured width so
    // the generator can size narrow cells (or shrink display banners)
    // instead of letting Word wrap "Sub Total :" or "INVOICE" mid-word.
    if (fsz >= 10 && headText.length > 0 && headText.length <= 40 && !headText.includes('\\n')) {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const textRect = range.getBoundingClientRect();
        if (textRect.width > 0 && textRect.height <= fsz * 2.1) {
          // Word's substituted font may run much wider than the webfont.
          const wordWidth = window.__h2dWordFontLineWidth
            ? window.__h2dWordFontLineWidth(el)
            : 0;
          style.oneLineWidthPx = Math.round(Math.max(textRect.width, wordWidth));
        }
      } catch (e) {
        /* leave unset */
      }
    }
    if (!decorations) {
      // decorations=false suppresses the container-owned paint, but a child
      // with its own distinct background (label chips, "OBJECTION 1 OF 6"
      // bars inside cards) must keep it.
      const ownBg = bgHex(el);
      if (ownBg && (!el.parentElement || ownBg !== bgHex(el.parentElement))) {
        style.shading = ownBg;
      }
      return style;
    }
    // manual left inset (decoration: containers that own their inset skip it)
    const padL = parseFloat(s.paddingLeft) + parseFloat(s.marginLeft);
    if (padL >= 12) style.indentLeftPx = Math.min(padL, 200);
    let shading = paintedBgHex(el);
    // authored vertical padding on unshaded wrappers (e.g. a card body div)
    // reads as spacing; shaded bars handle their padding via exact height
    if (!shading) {
      const pt = parseFloat(s.paddingTop) || 0;
      const pb = parseFloat(s.paddingBottom) || 0;
      if (pt > 2) style.spacingBeforePx = Math.min((style.spacingBeforePx || 0) + pt, 40);
      if (pb > 2) style.spacingAfterPx = Math.min((style.spacingAfterPx || 0) + pb, 40);
    }
    if (shading) {
      const textColor = toHex(s.color) || '000000';
      const shadeLum = hexLuminance(shading);
      const textLum = hexLuminance(textColor);
      // Near-white chip on a colored parent + light text would become an
      // invisible full-width white bar (benefit-num / step circles). Skip.
      if (shadeLum > 230 && textLum > 200) {
        shading = null;
      }
    }
    if (shading) {
      style.shading = shading;
      // Word's single spacing for CJK fonts has much taller leading than the
      // browser's, which fattens shaded bars. For single-line shaded
      // paragraphs, pin the rendered height as an exact line height.
      // Elements with a left accent border are note cards, not header bars -
      // the color bar table would drop the accent, keep them as paragraphs.
      const rect = el.getBoundingClientRect();
      const lineH = lh || fsz * 1.35;
      const radius = parseFloat(s.borderTopLeftRadius) || 0;
      // Compact circular badges are not full-width header bars.
      const compactBadge = rect.width > 0 && rect.width <= 72 && radius >= rect.height * 0.4;
      if (
        rect.height > 0 &&
        lineH &&
        rect.height < lineH * 1.9 &&
        !borderLeftOf(el) &&
        !compactBadge
      ) {
        style.exactLineHeightPx = rect.height;
        // single-line bar: safe to render as a fixed-height color bar table.
        // (exactLineHeightPx alone also gets set for CJK line control and
        // must NOT trigger the bar path - it would clip multi-line text.)
        style.colorBar = true;
        // Text inset inside the bar (padding-left and/or leading nbsp runs,
        // which trimRuns strips from the text itself).
        const inset = textInsetLeft(el, rect);
        if (inset > 1) style.barInsetLeftPx = Math.min(inset, 60);
      }
    }
    const bl = borderLeftOf(el);
    if (bl) {
      style.borderLeft = bl;
      const paddingLeft = parseFloat(s.paddingLeft) || 0;
      if (paddingLeft > 0) style.borderLeftSpacePx = Math.min(paddingLeft, 40);
    }
    const br = borderRightOf(el);
    if (br) {
      style.borderRight = br;
      const paddingRight = parseFloat(s.paddingRight) || 0;
      if (paddingRight > 0) style.borderRightSpacePx = Math.min(paddingRight, 40);
    }
    const bt = borderSideOf(el, 'top');
    if (bt) style.borderTop = bt;
    const bw = parseFloat(s.borderBottomWidth);
    if (bw >= 1 && s.borderBottomStyle !== 'none') {
      const color = toHex(s.borderBottomColor);
      if (color) {
        style.borderBottom = { color, widthPx: bw };
        // dotted/dashed TOC separators must not harden into solid rules
        if (s.borderBottomStyle === 'dotted' || s.borderBottomStyle === 'dashed') {
          style.borderBottom.style = s.borderBottomStyle;
        }
      }
    }
    return style;
  }

  // Lowest visible pixel row (relative to the element top) of the element's
  // own paint and descendants: text lines, replaced elements, painted boxes.
  function visibleContentBottom(el, rect) {
    let bottom = rect.top;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      if (!textNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const lineRect of range.getClientRects()) {
        if (lineRect.height > 0 && lineRect.width > 0) bottom = Math.max(bottom, lineRect.bottom);
      }
    }
    for (const child of el.querySelectorAll('*')) {
      if (!isVisible(child)) continue;
      const childRect = child.getBoundingClientRect();
      if (childRect.height <= 0 || childRect.width <= 0) continue;
      const childStyle = cs(child);
      const painted =
        child.matches('img, svg, canvas, video, iframe, input, textarea, select, button, hr') ||
        childStyle.backgroundImage !== 'none' ||
        childStyle.boxShadow !== 'none' ||
        Boolean(toHex(childStyle.backgroundColor, { dropWhite: false })) ||
        parseFloat(childStyle.borderTopWidth) > 0 ||
        parseFloat(childStyle.borderBottomWidth) > 0;
      if (painted) bottom = Math.max(bottom, Math.min(childRect.bottom, rect.bottom));
    }
    return bottom - rect.top;
  }

  function markForScreenshot(el) {
    const id = \`h2d-\${shotCounter++}\`;
    el.setAttribute('data-h2d-id', id);
    const r = el.getBoundingClientRect();
    const s = cs(el);
    const body = document.body.getBoundingClientRect();
    const offLeft = r.left - body.left;
    const offRight = body.right - r.right;
    const align =
      offLeft > 8 && offRight > 8 && Math.abs(offLeft - offRight) < Math.max(12, r.width * 0.08)
        ? 'center'
        : offLeft > offRight * 3
          ? 'right'
          : 'left';
    // A transparent wrapper much taller than its visible content (e.g. a
    // photo container stretched by the column) would embed a page-height
    // mostly-empty image and strand a phantom page. Crop the invisible tail;
    // painted elements keep their full box (the paint IS content).
    let height = Math.round(r.height);
    let clip;
    const paintedSelf =
      s.backgroundImage !== 'none' ||
      s.boxShadow !== 'none' ||
      Boolean(toHex(s.backgroundColor, { dropWhite: false })) ||
      parseFloat(s.borderTopWidth) > 0 ||
      parseFloat(s.borderBottomWidth) > 0;
    if (r.height >= 600 && !paintedSelf) {
      const contentBottom = visibleContentBottom(el, r);
      if (contentBottom > 0 && r.height - contentBottom >= 150) {
        height = Math.round(Math.min(r.height, contentBottom + 12));
        clip = {
          x: Math.max(0, Math.round(r.left)),
          y: Math.max(0, Math.round(r.top)),
          width: Math.round(r.width),
          height,
        };
      }
    }
    return {
      type: 'image',
      shotId: id,
      width: Math.round(r.width),
      height,
      ...(clip ? { clip } : {}),
      align,
      spacingBeforePx: Math.max(0, Math.round(parseFloat(s.marginTop) || 0)),
      spacingAfterPx: Math.max(0, Math.round(parseFloat(s.marginBottom) || 0)),
    };
  }

`;

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/tables-lists.js
var tables_lists_default = "  function extractTable(el) {\n    const rect = el.getBoundingClientRect();\n    const hasCompactPaintedLabel = [...el.querySelectorAll('td *, th *')].some(isCompactPaintedLabel);\n    if (hasCompactPaintedLabel && rect.height <= 900) return markForScreenshot(el);\n    return globalThis.__html2docxTable.extractTable(el, {\n      bgHex,\n      isCompactPaintedLabel,\n      bordersOf,\n      cellPaddingOf,\n      collectRuns,\n      cs,\n      hasBlockChildren,\n      isRTL,\n      isVisible,\n      markForScreenshot,\n      processChildren,\n      textAlignOf,\n      toHex,\n    });\n  }\n\n  // A CSS-grid table whose direct children are grid rows with the same number\n  // of columns (for example a Likert survey built from divs instead of table).\n  function gridTableRows(el) {\n    const rows = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    if (rows.length < 2) return null;\n    const cssTable =\n      cs(el).display === 'table' &&\n      rows.every(\n        (row) =>\n          cs(row).display === 'table-row' &&\n          [...row.children]\n            .filter((cell) => !SKIP_TAGS.has(cell.tagName) && isVisible(cell))\n            .every((cell) => cs(cell).display === 'table-cell'),\n      );\n    const counts = rows.map((row) => {\n      const s = cs(row);\n      if (s.display !== 'grid' && !(cssTable && s.display === 'table-row')) return 0;\n      return [...row.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c)).length;\n    });\n    const base = Math.max(...counts);\n    if (base < 2 || base > 12) return null;\n    // CSS tables tolerate short rows (a lone header cell): the browser leaves\n    // the missing columns empty, so extractGridTable pads them with fillers.\n    // Grid rows keep the strict equal-count rule.\n    if (counts.some((count) => count !== base && !(cssTable && count >= 1))) return null;\n    if (counts.filter((count) => count === base).length < 2) return null;\n    const widths = rows.map((row) => Math.round(row.getBoundingClientRect().width));\n    if (Math.max(...widths) - Math.min(...widths) > 8) return null;\n    // Cells must sit in the same columns in every row: alternating layouts\n    // (timeline cards flipping left/right around a center rail) are grids of\n    // rows too, but mapping their cells positionally scrambles the columns.\n    const leftsOf = (row) =>\n      [...row.children]\n        .filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c))\n        .map((c) => Math.round(c.getBoundingClientRect().left))\n        .sort((a, b) => a - b);\n    const firstLefts = leftsOf(rows[counts.indexOf(base)]);\n    for (const row of rows) {\n      const lefts = leftsOf(row);\n      if (lefts.length === base) {\n        if (lefts.some((left, i) => Math.abs(left - firstLefts[i]) > 12)) return null;\n      } else if (\n        lefts.some((left) => !firstLefts.some((columnLeft) => Math.abs(left - columnLeft) <= 12))\n      ) {\n        return null;\n      }\n    }\n    // Avoid classifying arbitrary stacks of small grids as a data table.\n    if (!cssTable && rows.length < 4 && !fullBorderOf(el)) return null;\n    return rows;\n  }\n\n  function extractGridTable(el, gridRows, depth) {\n    const cellsOf = (row) =>\n      [...row.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    const baseRow = gridRows.reduce(\n      (best, row) => (cellsOf(row).length > cellsOf(best).length ? row : best),\n      gridRows[0],\n    );\n    const firstCells = cellsOf(baseRow);\n    const colWidths = firstCells.map((c) => Math.round(c.getBoundingClientRect().width));\n    const colLefts = firstCells.map((c) => Math.round(c.getBoundingClientRect().left));\n    const rows = gridRows.map((row, rowIdx) => {\n      const domCells = cellsOf(row);\n      let cells = domCells.map((cell) => {\n          const textAlign = textAlignOf(cell);\n          const entry = {\n            shading: bgHex(cell) || bgHex(row),\n            borders: bordersOf(cell),\n            padPx: cellPaddingOf(cell),\n            vAlign: cs(row).alignItems === 'center' ? 'center' : undefined,\n            rtl: isRTL(cell) || undefined,\n          };\n          if (textAlign === 'center' || textAlign === 'right') entry.align = textAlign;\n          entry.children = needsBlockWalk(cell)\n            ? processChildren(cell, depth + 1, { decorations: false })\n            : paraNodesFrom(cell, false);\n          return entry;\n        });\n      // Short row (lone header cell in a CSS table): seat each cell in its\n      // geometric column and fill the rest with empty cells \u2014 unshaded, so\n      // they inherit the table background, same as the browser leaves them.\n      if (cells.length && cells.length < colWidths.length) {\n        const placed = new Array(colWidths.length).fill(null);\n        domCells.forEach((cell, i) => {\n          const left = Math.round(cell.getBoundingClientRect().left);\n          let col = colLefts.findIndex((columnLeft) => Math.abs(columnLeft - left) <= 12);\n          if (col < 0 || placed[col]) col = placed.findIndex((slot) => !slot);\n          placed[col] = cells[i];\n        });\n        cells = placed.map((entry) => entry || { children: [] });\n      }\n      const renderedHeight = Math.round(row.getBoundingClientRect().height);\n      return {\n        cells,\n        // Let text-driven rows use Word's natural compact height. Preserve\n        // only genuinely tall visual rows (planners / empty writing areas).\n        heightPx: renderedHeight >= 80 ? renderedHeight : undefined,\n        // Only a short strip reads as a repeatable header; a tall first row\n        // is content (card stacks) and would reprint on every page.\n        header: rowIdx === 0 && renderedHeight < 60,\n      };\n    });\n    return [{\n      type: 'table',\n      gridTable: true,\n      rows,\n      colWidths,\n      outerBorder: bordersOf(el),\n      shading: bgHex(el),\n      padPx: cellPaddingOf(el),\n      heightPx: Math.round(el.getBoundingClientRect().height),\n      rtl: isRTL(el) || undefined,\n    }];\n  }\n\n  function extractCode(el) {\n    const shading = bgHex(el) || 'F5F5F5';\n    const lines = el.innerText.replace(/\\n$/, '').split('\\n');\n    const { color, sizePx } = runStyleOf(el);\n    return [{ type: 'code', lines, shading, color, sizePx }];\n  }\n\n  function extractList(el, ordered, depth = 1) {\n    const listItems = [...el.children].filter((li) => li.tagName === 'LI' && isVisible(li));\n    // list-style:none -> the author wants plain paragraphs, not numbering.\n    // Judge by the items, not the UL: frameworks (pico.css) re-style the LI\n    // marker even when the UL itself says none.\n    const plain = listItems.length\n      ? listItems.every(\n          (li) => cs(li).listStyleType === 'none' || cs(li).display !== 'list-item',\n        )\n      : cs(el).listStyleType === 'none';\n    const needsExactPseudoMarker = (li) =>\n      /[\u2611\u2610\u274B]/u.test(pseudoBulletRun(li)?.text || '');\n    const hasCompactPaintedLabels = listItems.some((li) =>\n      [...li.querySelectorAll(':scope > *')].some(isCompactPaintedLabel),\n    );\n    if (hasCompactPaintedLabels) return [markForScreenshot(el)];\n    // CSS multi-column list (columns: 2 on a TOC): reproduce as a layout\n    // table with one cell per rendered column. Numbering continues across\n    // columns, so synthesize literal number prefixes instead of Word lists.\n    const columnCount = parseInt(cs(el).columnCount, 10);\n    if (\n      depth <= 2 &&\n      Number.isFinite(columnCount) &&\n      columnCount >= 2 &&\n      listItems.length >= columnCount &&\n      listItems.every((li) => !hasBlockChildren(li))\n    ) {\n      const lefts = listItems.map((li) => Math.round(li.getBoundingClientRect().left));\n      const uniqueLefts = [...new Set(lefts)].sort((a, b) => a - b);\n      if (uniqueLefts.length >= 2) {\n        const groups = uniqueLefts.map(() => []);\n        listItems.forEach((li, index) => {\n          groups[uniqueLefts.indexOf(lefts[index])].push({ li, index });\n        });\n        const cells = groups.map((group) => ({\n          children: group.flatMap(({ li, index }) => {\n            if (plain && needsExactPseudoMarker(li)) return [markForScreenshot(li)];\n            const runs = collectRuns(li);\n            if (!runs.length) return [];\n            const pseudoRun = pseudoBulletRun(li);\n            let prefixed = Boolean(pseudoRun);\n            if (pseudoRun) runs.unshift(pseudoRun);\n            else if (ordered) {\n              runs.unshift({ text: `${index + 1}. `, ...runStyleOf(li) });\n              prefixed = true;\n            } else if (!plain) {\n              runs.unshift({ text: '\\u2022\\u00a0', ...runStyleOf(li) });\n              prefixed = true;\n            }\n            const style = { ...paraStyleOf(el, false), ...paraStyleOf(li, false) };\n            delete style.indentLeftPx;\n            if (prefixed) {\n              const em = parseFloat(cs(li).fontSize) || 16;\n              style.indentHangingPx = Math.round(em * (ordered ? 1.1 : 0.8));\n            }\n            return [{ type: 'para', runs, style }];\n          }),\n        }));\n        const width = el.getBoundingClientRect().width || 1;\n        return [{\n          type: 'table',\n          layout: true,\n          rows: [{ cells: cells.map((cell, i) => ({ ...cell, gridStart: i, colspan: 1 })) }],\n          colWidths: uniqueLefts.map((left, i) =>\n            Math.round((i + 1 < uniqueLefts.length ? uniqueLefts[i + 1] : el.getBoundingClientRect().right) - left) || Math.round(width / uniqueLefts.length),\n          ),\n        }];\n      }\n    }\n    // Layout list: display:flex items (numbered chip + content column) need\n    // the full classifier. Flattening them to runs drops the chip and\n    // inlines nested callout boxes into the text. Items too tall for a table\n    // row (isBoxRow rejects them) still get a block walk so nested dialogue\n    // bubbles / sub-lists survive.\n    // CSS-counter numbering (\"counter(toc-counter)\") never resolves through\n    // getComputedStyle; synthesize it from the item's position.\n    const counterPrefix = (li, index) => {\n      const pseudoStyle = getComputedStyle(li, '::before');\n      const content = pseudoStyle.content || '';\n      const counterStart = content.indexOf('counter(');\n      if (counterStart < 0) return null;\n      const counterEnd = content.indexOf(')', counterStart);\n      const quotedText = (part) =>\n        [...part.matchAll(/\"([^\"]*)\"|'([^']*)'/g)]\n          .map((match) => match[1] ?? match[2] ?? '')\n          .join('');\n      const prefix = quotedText(content.slice(0, counterStart));\n      const suffix = quotedText(content.slice(counterEnd + 1));\n      let value = `${prefix}${index + 1}${suffix}`;\n      if (pseudoStyle.textTransform === 'uppercase') value = value.toUpperCase();\n      if (pseudoStyle.textTransform === 'lowercase') value = value.toLowerCase();\n      return value.endsWith(' ') ? value : `${value} `;\n    };\n    if (plain && listItems.some((li) => isBoxRow(li) || hasBlockChildren(li))) {\n      return listItems.flatMap((li, index) => {\n        if (isBoxRow(li)) return processElement(li, depth + 1);\n        // A counter badge glyph (\u2776) already carries the number \u2014 adding the\n        // synthesized plain counter text would double-number the item.\n        const bulletRun = pseudoBulletRun(li) || chipBulletRun(li);\n        const prefix = bulletRun ? null : counterPrefix(li, index);\n        if (hasBlockChildren(li)) {\n          const nodes = processChildren(li, depth + 1);\n          const first = nodes.find((n) => n.type === 'para');\n          if (first && bulletRun) first.runs = [bulletRun, ...first.runs];\n          if (first && prefix) first.runs = [{ text: prefix, ...runStyleOf(li) }, ...first.runs];\n          return nodes;\n        }\n        const runs = collectRuns(li);\n        if (!runs.length) return [];\n        if (prefix) runs.unshift({ text: prefix, ...runStyleOf(li) });\n        if (bulletRun) runs.unshift(bulletRun);\n        const style = { ...paraStyleOf(el), ...paraStyleOf(li) };\n        return [{ type: 'para', runs, style }];\n      });\n    }\n    const nativeMarkerOf = (li) => {\n      const itemStyle = cs(li);\n      if (itemStyle.display !== 'list-item' || itemStyle.listStyleType === 'none') return null;\n      const glyphs = {\n        disc: '\\u2022',\n        circle: '\\u25e6',\n        square: '\\u25aa',\n      };\n      const glyph = glyphs[itemStyle.listStyleType];\n      if (!glyph) return null;\n      const runStyle = runStyleOf(li);\n      return {\n        run: {\n          text: `${glyph}\\u00a0`,\n          color: runStyle.color,\n          sizePx: runStyle.sizePx,\n          fontFamily: runStyle.fontFamily,\n        },\n        widthPx: Math.max(10, Math.round((runStyle.sizePx || 14) * 1.05)),\n      };\n    };\n    const markers = listItems.map((li) => {\n      const first = [...li.children].find((child) => isVisible(child));\n      const nativeMarker = nativeMarkerOf(li);\n      if (first && isCheckboxLike(first)) {\n        const rect = first.getBoundingClientRect();\n        const itemStyle = cs(li);\n        return {\n          element: first,\n          widthPx: rect.width,\n          gapPx: parseFloat(itemStyle.columnGap) || parseFloat(itemStyle.gap) || 8,\n          nativeMarker,\n        };\n      }\n      const marker = pseudoCheckbox(li);\n      return marker ? { ...marker, nativeMarker } : null;\n    });\n    const checklist =\n      plain &&\n      listItems.length > 1 &&\n      markers.every(Boolean);\n    if (checklist) {\n      const listRect = el.getBoundingClientRect();\n      const firstColWidth = Math.round(\n        Math.max(\n          ...markers.map(\n            (marker) => marker.widthPx + marker.gapPx + (marker.nativeMarker?.widthPx || 0),\n          ),\n        ),\n      );\n      const rows = listItems.map((li, index) => {\n        const children = [...li.children].filter((child) => isVisible(child));\n        const marker = markers[index];\n        const label = marker.element ? children.find((child) => child !== marker.element) : null;\n        const rowBorders = bordersOf(li);\n        const pad = cellPaddingOf(li);\n        const itemStyle = cs(li);\n        const itemParaStyle = paraStyleOf(li);\n        delete itemParaStyle.spacingBeforePx;\n        delete itemParaStyle.spacingAfterPx;\n        // The marker table already consumes the list item's left padding.\n        // Keeping it on the label paragraph would indent the text twice.\n        delete itemParaStyle.indentLeftPx;\n        const markerRuns = [];\n        if (marker.nativeMarker) markerRuns.push(marker.nativeMarker.run);\n        markerRuns.push(marker.element ? checkboxNode(marker.element) : checkboxRun(marker));\n        return {\n          heightPx: Math.round(\n            li.getBoundingClientRect().height + Math.max(0, parseFloat(itemStyle.marginBottom) || 0),\n          ),\n          cells: [\n            {\n              runs: markerRuns,\n              borders: rowBorders || {},\n              padPx: { top: pad.top, bottom: pad.bottom, left: 0, right: marker.gapPx },\n            },\n            {\n              runs: label ? collectRuns(label) : collectRuns(li),\n              style: itemParaStyle,\n              borders: rowBorders || {},\n              padPx: { top: pad.top, bottom: pad.bottom, left: 0, right: 0 },\n            },\n          ],\n          last: index === listItems.length - 1,\n        };\n      });\n      const listStyle = cs(el);\n      return [{\n        type: 'table',\n        checklist: true,\n        noHeader: true,\n        rows,\n        colWidths: [firstColWidth, Math.max(1, Math.round(listRect.width) - firstColWidth)],\n        spacingBeforePx: Math.max(0, Math.round(parseFloat(listStyle.marginTop) || 0)),\n        spacingAfterPx: Math.max(0, Math.round(parseFloat(listStyle.marginBottom) || 0)),\n        rtl: isRTL(el) || undefined,\n      }];\n    }\n    const items = [];\n    for (const li of listItems) {\n      items.push({ runs: collectRuns(li), style: paraStyleOf(li) });\n    }\n    if (!items.length) return [];\n    if (plain) {\n      return items\n        .filter((it) => it.runs.length)\n        .map((it, index) => {\n          const li = listItems[index];\n          if (needsExactPseudoMarker(li)) return markForScreenshot(li);\n          const style = { ...paraStyleOf(el), ...it.style };\n          const itemStyle = cs(li);\n          const paddingTop = parseFloat(itemStyle.paddingTop) || 0;\n          const paddingBottom = parseFloat(itemStyle.paddingBottom) || 0;\n          if (paddingTop > 0) style.spacingBeforePx = (style.spacingBeforePx || 0) + paddingTop;\n          if (paddingBottom > 0) style.spacingAfterPx = (style.spacingAfterPx || 0) + paddingBottom;\n          const bulletRun = pseudoBulletRun(li) || chipBulletRun(li);\n          if (bulletRun) it.runs.unshift(bulletRun);\n          else {\n            // list-style:none + ::before counter() (self-numbered rule\n            // lists): the marker lives in the pseudo-element, not the runs\n            const prefix = counterPrefix(li, index);\n            if (prefix) {\n              const pseudoWeight = parseInt(getComputedStyle(li, '::before').fontWeight, 10);\n              it.runs.unshift({\n                text: prefix,\n                ...runStyleOf(li),\n                ...(pseudoWeight >= 600 ? { bold: true } : {}),\n              });\n              const em = parseFloat(itemStyle.fontSize) || 16;\n              style.indentHangingPx = Math.round(em * 1.1);\n            }\n          }\n          return { type: 'para', runs: it.runs, style };\n        });\n    }\n    // <ol start=\"951\">: Word numbering always restarts at 1 (startOverride\n    // is fixed), so lists with an authored start keep literal number\n    // prefixes instead \u2014 the TOC must match the 951-975 headings it links.\n    const startAt = ordered ? parseInt(el.getAttribute('start'), 10) : NaN;\n    if (Number.isFinite(startAt) && startAt !== 1 && listItems.every((li) => !hasBlockChildren(li))) {\n      return listItems.flatMap((li, index) => {\n        const runs = collectRuns(li);\n        if (!runs.length) return [];\n        runs.unshift({ text: `${startAt + index}. `, ...runStyleOf(li) });\n        const style = { ...paraStyleOf(el, false), ...paraStyleOf(li, false) };\n        const em = parseFloat(cs(li).fontSize) || 16;\n        style.indentHangingPx = Math.round(em * 1.6);\n        return [{ type: 'para', runs, style }];\n      });\n    }\n    const nestedItems = [];\n    // liIndex = ordinal of the top-level li each item came from, so column\n    // slicing can split a tall bullet list at li boundaries.\n    const appendListItems = (listEl, level, parentIndentPx, rootIndex) => {\n      const listStyle = cs(listEl);\n      const indentLeftPx = parentIndentPx + Math.max(0, parseFloat(listStyle.paddingLeft) || 0);\n      const childItems = [...listEl.children].filter(\n        (child) => child.tagName === 'LI' && isVisible(child),\n      );\n      for (let liOrdinal = 0; liOrdinal < childItems.length; liOrdinal++) {\n        const li = childItems[liOrdinal];\n        const liIndex = level === 0 ? liOrdinal : rootIndex;\n        // Walk li children in DOM order, splitting content around nested\n        // lists: text after a nested list must stay after it (a trailing\n        // \"to perform...\" clause hoisted above its sub-items inverts the\n        // reading order).\n        const segments = [];\n        let current = [];\n        for (const node of li.childNodes) {\n          const isList =\n            node.nodeType === Node.ELEMENT_NODE &&\n            (node.tagName === 'UL' || node.tagName === 'OL');\n          if (isList) {\n            if (isVisible(node)) {\n              segments.push({ content: current });\n              current = [];\n              segments.push({ list: node });\n            }\n          } else current.push(node);\n        }\n        segments.push({ content: current });\n        const style = paraStyleOf(li);\n        if (segments.some((seg) => seg.list)) delete style.spacingAfterPx;\n        let leading = true;\n        for (const seg of segments) {\n          if (seg.list) {\n            appendListItems(seg.list, level + 1, indentLeftPx, liIndex);\n            continue;\n          }\n          const runs = trimRuns(runsFromNodes(seg.content, li));\n          if (!runs.length) continue;\n          // A justified li with an explicit <br> keeps the break as \\n in one\n          // paragraph \u2014 Word stretches the line BEFORE a manual break under\n          // justify (CSS never does), blowing huge gaps into short label\n          // lines. Split at the breaks like makeParaNodes: only the final\n          // fragment keeps justify (Word never stretches a last line).\n          const fragments = [runs];\n          if (style.align === 'justify' && runs.some((run) => (run.text || '').includes('\\n'))) {\n            fragments.length = 0;\n            let currentLine = [];\n            for (const run of runs) {\n              const parts = (run.text || '').split('\\n');\n              parts.forEach((part, partIndex) => {\n                if (part) currentLine.push({ ...run, text: part });\n                if (partIndex < parts.length - 1 && currentLine.length) {\n                  fragments.push(currentLine);\n                  currentLine = [];\n                }\n              });\n            }\n            if (currentLine.length) fragments.push(currentLine);\n            if (!fragments.length) fragments.push(runs);\n          }\n          fragments.forEach((fragmentRuns, fragmentIndex) => {\n            const fragmentStyle =\n              fragments.length > 1 && fragmentIndex < fragments.length - 1\n                ? { ...style, align: undefined }\n                : style;\n            if (leading) {\n              nestedItems.push({\n                runs: fragmentRuns,\n                style: fragmentStyle,\n                level,\n                // ::before counter() numbering counts as ordered even on a UL\n                ordered:\n                  listEl.tagName === 'OL' ||\n                  (getComputedStyle(li, '::before').content || '').includes('counter('),\n                markerType: cs(li).listStyleType || listStyle.listStyleType,\n                indentLeftPx,\n                liIndex,\n              });\n              leading = false;\n            } else {\n              // continuation text of the same li: no marker, text-aligned indent\n              nestedItems.push({\n                runs: fragmentRuns,\n                style: fragmentStyle,\n                level,\n                continuation: true,\n                indentLeftPx,\n                liIndex,\n              });\n            }\n          });\n        }\n      }\n    };\n    appendListItems(el, 0, 0, 0);\n    return [{\n      type: 'list',\n      ordered,\n      items: nestedItems,\n      rtl: isRTL(el) || undefined,\n    }];\n  }\n\n  // A horizontal row of >=2 similar boxes (flex row / grid columns) -> kpirow\n";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/layouts-controls.js
var layouts_controls_default = "  function isBoxRow(el) {\n    const s = cs(el);\n    const kids = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    // bare text between element children (badge + question text + hint):\n    // column extraction iterates elements only and silently drops the text\n    for (const node of el.childNodes) {\n      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return false;\n    }\n    const navRow = el.tagName === 'NAV' && s.display === 'flex';\n    const singleGridRow = s.display === 'grid' && s.gridTemplateColumns.split(' ').length >= 2;\n    // Narrow separators (\u25B6 arrows between process steps) are not columns \u2014\n    // exclude them from the column-count cap or a 4-step flow with 3 arrows\n    // (7 children) falls back to a vertical card stack.\n    const columnCount = kids.filter((k) => k.getBoundingClientRect().width > 40).length;\n    if (kids.length < 2 || columnCount > (navRow || singleGridRow ? 12 : 6)) return false;\n    const flexRow = s.display === 'flex' && (s.flexDirection === 'row' || s.flexDirection === '');\n    const gridCols = s.display === 'grid' && (s.gridTemplateColumns.split(' ').length >= 2);\n    // CSS table layout (display: table + table-cell children) is a\n    // side-by-side row exactly like a flex row\n    const cssTableRow =\n      s.display === 'table' && kids.every((k) => cs(k).display === 'table-cell');\n    if (!flexRow && !gridCols && !cssTableRow) return false;\n    // Page-level column layouts (sidebar + main) are far too tall for one\n    // table row \u2014 Word/LO can't paginate it. Those flatten to sequential flow.\n    // A row of similar-width parallel cards (pricing tiers, lead + stacked\n    // cells) is not a page layout: page-level two-column designs are consumed\n    // by the earlier pageColumns branch and sidebars fail the width-similarity\n    // check, so allow up to the ~one-page cell budget gridRowClusters uses.\n    const kidHeights = kids.map((k) => k.getBoundingClientRect().height);\n    const kidWidths = kids.map((k) => k.getBoundingClientRect().width).filter((w) => w > 40);\n    const parallelCards =\n      kidWidths.length >= 2 && Math.max(...kidWidths) <= Math.min(...kidWidths) * 1.8;\n    if (Math.max(...kidHeights) > (parallelCards ? 950 : 500)) return false;\n    // children laid out side by side: every pair overlaps vertically\n    // (tops alone fail for align-items: center/end rows of unequal heights)\n    const rects = kids.map((k) => k.getBoundingClientRect());\n    // RTL flex rows progress right-to-left in DOM order\n    const ltr = rects.length < 2 || rects[1].left >= rects[0].left;\n    for (let i = 0; i < rects.length - 1; i++) {\n      const a = rects[i];\n      const b = rects[i + 1];\n      if (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < Math.min(a.height, b.height) * 0.5) {\n        return false;\n      }\n      // must progress consistently in one horizontal direction\n      if (ltr && b.left < a.right - 2) return false;\n      if (!ltr && b.right > a.left + 2) return false;\n    }\n    return true;\n  }\n\n  // Multi-row grid of cards (2-4 columns, 2+ rows): children clustered into\n  // rows by rendered Y position -> borderless layout table, one table row per\n  // visual row, so the side-by-side arrangement survives and Word can still\n  // paginate between rows.\n  function gridRowClusters(el) {\n    const s = cs(el);\n    const gridCols = s.display === 'grid' && s.gridTemplateColumns.split(' ').length >= 2;\n    const wrapFlex = s.display === 'flex' && s.flexWrap === 'wrap';\n    if (!gridCols && !wrapFlex) return null;\n    const kids = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    if (kids.length < 3) return null;\n    // grid-area placement makes DOM order diverge from visual order \u2014\n    // cluster by rendered position, not source position\n    kids.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);\n    const rows = [];\n    let cur = null;\n    let curTop = -1e9;\n    for (const k of kids) {\n      const t = k.getBoundingClientRect().top;\n      if (!cur || t - curTop > 20) {\n        cur = [];\n        rows.push(cur);\n        curTop = t;\n      }\n      cur.push(k);\n    }\n    if (rows.length < 2) return null;\n    const nCols = Math.max(...rows.map((r) => r.length));\n    if (nCols < 2 || nCols > 13) return null;\n    // A table row can't paginate mid-cell, so cells must fit one page. Word's\n    // usable content height is ~970px \u2014 cards up to ~950px still render as a\n    // single side-by-side row (a 2\xD72 teacher-card grid has ~780px cells).\n    if (kids.some((k) => k.getBoundingClientRect().height > 950)) return null;\n    if (kids.some((k) => k.getBoundingClientRect().height > 700)) {\n      // Page-tall rows are only safe for grids of self-painted cards; a\n      // painted section's internal text layout (dark manifesto chapters)\n      // must stay with the card/section branches that keep its backdrop.\n      const paintedKids = kids.filter(\n        (k) => bgHex(k) || paintedBgHex(k) || fullBorderOf(k),\n      ).length;\n      if (paintedKids * 2 < kids.length) return null;\n    }\n    // physical left-to-right cell order (RTL grids arrive right-to-left)\n    for (const row of rows) {\n      row.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);\n    }\n    return rows;\n  }\n\n  function largeTableGridRows(el) {\n    const s = cs(el);\n    const gridCols = s.display === 'grid' && s.gridTemplateColumns.split(' ').length >= 2;\n    const wrapFlex = s.display === 'flex' && s.flexWrap === 'wrap';\n    if (!gridCols && !wrapFlex) return null;\n    if (pageColumnParts(el)) return null;\n    const kids = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    if (kids.length < 3 || kids.length > 8) return null;\n    const tableKids = kids.filter((kid) => kid.querySelector('table'));\n    if (tableKids.length < 2 || tableKids.length * 2 < kids.length) return null;\n    if (!kids.some((kid) => kid.getBoundingClientRect().height > 700)) return null;\n    if (el.getBoundingClientRect().height > 2200) return null;\n    // same as gridRowClusters: visual order, not DOM order\n    kids.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);\n    const rows = [];\n    let current = null;\n    let currentTop = -1e9;\n    for (const kid of kids) {\n      const top = kid.getBoundingClientRect().top;\n      if (!current || top - currentTop > 20) {\n        current = [];\n        rows.push(current);\n        currentTop = top;\n      }\n      current.push(kid);\n    }\n    if (rows.length < 2 || rows.length > 4) return null;\n    const columnCount = Math.max(...rows.map((row) => row.length));\n    if (columnCount < 2 || columnCount > 4) return null;\n    for (const row of rows) {\n      row.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);\n    }\n    return rows;\n  }\n\n  function extractGridRows(\n    el,\n    gridRows,\n    depth,\n    { screenshotCells = false, noSplit = true, largeTableGrid = false } = {},\n  ) {\n    // Column tracks are clustered from cell left edges across ALL rows, not\n    // just row 0: rows can occupy different columns (timeline layouts where\n    // cards alternate left/right and empty divs are invisible), and taking\n    // row 0's cells as the column set mis-registers every other row.\n    const containerRect = el.getBoundingClientRect();\n    const trackLefts = [];\n    for (const c of gridRows.flat()) {\n      const left = c.getBoundingClientRect().left;\n      if (!trackLefts.some((x) => Math.abs(x - left) < 12)) trackLefts.push(left);\n    }\n    trackLefts.sort((a, b) => a - b);\n    const trackIndex = (x) => {\n      let best = 0;\n      for (let i = 1; i < trackLefts.length; i++) {\n        if (Math.abs(trackLefts[i] - x) < Math.abs(trackLefts[best] - x)) best = i;\n      }\n      return best;\n    };\n    let colWidths = trackLefts.map((left, i) =>\n      Math.round((i + 1 < trackLefts.length ? trackLefts[i + 1] : containerRect.right) - left),\n    );\n    const containerBg = bgHex(el);\n    const cellFor = (c) => {\n      if (screenshotCells) return { children: [markForScreenshot(c)] };\n      // screenshot cells carry their own paint - no cell shading on top\n      if (\n        isReplacedTag(c) ||\n        isPill(c) ||\n        isDecorativeLeaf(c) ||\n        isBadgeGrid(c) ||\n        needsVisualEffectScreenshot(c)\n      ) {\n        return { children: processElement(c, depth + 1) };\n      }\n      // a cell that is itself a flex row or a visual card needs the full\n      // classifier: rows collapse into a stack and cards lose their\n      // border/background when only their children are walked\n      return {\n        children: isBoxRow(c) || isCard(c, depth + 1)\n          ? processElement(c, depth + 1)\n          : needsBlockWalk(c)\n            ? processChildren(c, depth + 1, { decorations: false })\n            : paraNodesFrom(c, false),\n        // on a tinted/gradient backdrop, white card paint must survive\n        shading: paintedBgHex(c),\n      };\n    };\n    const rows = gridRows.map((cells) => {\n      const rowCells = [];\n      let pos = 0;\n      for (const c of cells) {\n        const rect = c.getBoundingClientRect();\n        const start = Math.max(pos, trackIndex(rect.left));\n        let span = 1;\n        while (start + span < trackLefts.length && trackLefts[start + span] < rect.right - 12) {\n          span += 1;\n        }\n        // empty filler for grid columns this row does not occupy\n        if (start > pos) {\n          rowCells.push({ children: [], gridStart: pos, colspan: start - pos });\n        }\n        rowCells.push({ ...cellFor(c), gridStart: start, colspan: span });\n        pos = start + span;\n      }\n      if (pos < trackLefts.length) {\n        rowCells.push({ children: [], gridStart: pos, colspan: trackLefts.length - pos });\n      }\n      return {\n        // planner-style rows of mostly-empty cells must keep their drawn height\n        heightPx:\n          cells.reduce((n, c) => n + (c.innerText || '').trim().length, 0) < 30\n            ? Math.min(420, Math.max(...cells.map((c) => Math.round(c.getBoundingClientRect().height))))\n            : undefined,\n        cells: rowCells,\n      };\n    });\n    const s = cs(el);\n    const rowGapPx = Math.min(parseFloat(s.rowGap) || 0, 60);\n    const colGapPx = Math.min(parseFloat(s.columnGap) || 0, 60);\n    // Authored grid gaps become explicit gap tracks/rows shaded with the\n    // container's background: as interior cell margins the gap would be\n    // filled by the cell's own (e.g. white card) shading and visually vanish.\n    if (colGapPx >= 8 && trackLefts.length >= 2) {\n      const totalTracks = trackLefts.length * 2 - 1;\n      for (const row of rows) {\n        const remapped = [];\n        let pos = 0;\n        for (const cell of row.cells) {\n          const start = cell.gridStart * 2;\n          if (start > pos) {\n            remapped.push({ children: [], shading: containerBg, gridStart: pos, colspan: start - pos });\n          }\n          const span = cell.colspan * 2 - 1;\n          remapped.push({\n            ...cell,\n            gridStart: start,\n            colspan: span,\n            // fillers and transparent cells show the container tint in HTML\n            shading: cell.shading ?? containerBg,\n          });\n          pos = start + span;\n        }\n        if (pos < totalTracks) {\n          remapped.push({ children: [], shading: containerBg, gridStart: pos, colspan: totalTracks - pos });\n        }\n        row.cells = remapped;\n      }\n      const expanded = [];\n      colWidths.forEach((w, i) => {\n        if (i < colWidths.length - 1) {\n          expanded.push(Math.max(10, w - colGapPx), colGapPx);\n        } else {\n          expanded.push(w);\n        }\n      });\n      colWidths = expanded;\n    }\n    if (rowGapPx >= 8) {\n      const totalTracks = colWidths.length;\n      const spaced = [];\n      rows.forEach((row, i) => {\n        spaced.push(row);\n        if (i < rows.length - 1) {\n          spaced.push({\n            gapRow: true,\n            heightPx: rowGapPx,\n            cells: [{ children: [], shading: containerBg, gridStart: 0, colspan: totalTracks }],\n          });\n        }\n      });\n      return [{\n        type: 'table',\n        layout: true,\n        noSplit,\n        largeTableGrid,\n        rowGapPx: 0,\n        rows: spaced,\n        colWidths,\n      }];\n    }\n    return [{ type: 'table', layout: true, noSplit, largeTableGrid, rowGapPx, rows, colWidths }];\n  }\n\n  // Page-level side-by-side columns (sidebar + main). Reproduced as a\n  // borderless multi-row table: content blocks from all columns are sliced\n  // into rows by their rendered Y position, so side-by-side placement\n  // survives while Word can still paginate between rows.\n  function pageColumnParts(el) {\n    const s = cs(el);\n    const kids = [...el.children].filter(\n      (c) =>\n        !SKIP_TAGS.has(c.tagName) &&\n        isVisible(c) &&\n        cs(c).position !== 'absolute' &&\n        cs(c).position !== 'fixed',\n    );\n    if (kids.length < 2 || kids.length > 4) return null;\n    const flexRow = s.display === 'flex' && (s.flexDirection === 'row' || s.flexDirection === '');\n    const gridCols = s.display === 'grid' && (s.gridTemplateColumns.split(' ').length >= 2);\n    if (!flexRow && !gridCols) return null;\n    const containerRect = el.getBoundingClientRect();\n    const columns = kids.filter((k) => k.getBoundingClientRect().height > 500);\n    if (columns.length < 2 || columns.length > 3) return null;\n    const tops = columns.map((k) => Math.round(k.getBoundingClientRect().top));\n    if (Math.max(...tops) - Math.min(...tops) >= 60) return null;\n    const ordered = [...columns].sort(\n      (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,\n    );\n    for (let i = 0; i < ordered.length - 1; i++) {\n      if (ordered[i + 1].getBoundingClientRect().left < ordered[i].getBoundingClientRect().right - 2) {\n        return null;\n      }\n    }\n    const leading = kids.filter((k) => !columns.includes(k));\n    if (\n      leading.some((k) => {\n        const r = k.getBoundingClientRect();\n        return r.width < containerRect.width * 0.8 || r.bottom > Math.min(...tops) + 2;\n      })\n    ) {\n      return null;\n    }\n    return { leading, columns: ordered };\n  }\n\n  // Flatten a column into addressable blocks with their rendered Y position.\n  function columnBlocks(col, depth, out, colIdx) {\n    let kids = [...col.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    // unwrap single-child wrappers\n    while (kids.length === 1 && kids[0].children.length && !directText(col)) {\n      col = kids[0];\n      kids = [...col.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    }\n    if (!kids.length) {\n      const nodes = paraNodesFrom(col);\n      if (nodes.length) {\n        const r = col.getBoundingClientRect();\n        out.push({ col: colIdx, top: r.top, bottom: r.bottom, nodes });\n      }\n      return;\n    }\n    for (const child of kids) {\n      const r = child.getBoundingClientRect();\n      // very tall composite blocks get split further so row slicing stays\n      // fine-grained \u2014 but never into tables/grids/lists, whose internal\n      // structure must reach the classifier whole\n      const atomic =\n        ['TABLE', 'UL', 'OL'].includes(child.tagName) ||\n        cs(child).display === 'grid' ||\n        child.querySelector('table');\n      // 320 (not a full page): slicing needs block granularity well under a\n      // page or two columns never share a legal cut line (479px job entries\n      // left no common gap below page 1's limit and degraded the layout).\n      if (r.height > 320 && !atomic && hasBlockChildren(child) && !bgHex(child) && !isBadgeGrid(child)) {\n        columnBlocks(child, depth, out, colIdx);\n        continue;\n      }\n      const nodes = processElement(child, depth + 1);\n      if (!nodes.length) continue;\n      // A tall bullet list is the classic slice blocker (a near-page atomic\n      // block forces the sequential-flow fallback): split it per top-level\n      // li so cuts can land between items. Ordered lists stay atomic \u2014\n      // splitting them would restart their numbering.\n      if (\n        r.height > 320 &&\n        (child.tagName === 'UL' || child.tagName === 'OL') &&\n        nodes.length === 1 &&\n        nodes[0].type === 'list' &&\n        nodes[0].items.every((item) => !item.ordered && item.liIndex != null)\n      ) {\n        const lis = [...child.children].filter(\n          (li) => li.tagName === 'LI' && isVisible(li),\n        );\n        const groups = new Map();\n        for (const item of nodes[0].items) {\n          if (!groups.has(item.liIndex)) groups.set(item.liIndex, []);\n          groups.get(item.liIndex).push(item);\n        }\n        const liBlocks = [];\n        for (const [liIdx, items] of groups) {\n          const li = lis[liIdx];\n          if (!li) { liBlocks.length = 0; break; }\n          const liRect = li.getBoundingClientRect();\n          liBlocks.push({\n            col: colIdx,\n            top: liRect.top,\n            bottom: liRect.bottom,\n            nodes: [{ ...nodes[0], items }],\n          });\n        }\n        if (liBlocks.length >= 2) {\n          out.push(...liBlocks);\n          continue;\n        }\n      }\n      out.push({ col: colIdx, top: r.top, bottom: r.bottom, nodes });\n    }\n  }\n\n  function directText(el) {\n    for (const n of el.childNodes) {\n      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) return true;\n    }\n    return false;\n  }\n\n  // One single-row borderless table, one cell per column, each cell holding\n  // the column's full content. The row is allowed to break across pages\n  // (Word/LO default), which paginates naturally while keeping the exact\n  // side-by-side geometry \u2014 far more faithful than slicing content into\n  // pseudo-rows by Y position.\n  function compactColumnNodes(nodes) {\n    for (const node of nodes) {\n      if (node.style) {\n        if (node.style.spacingBeforePx) {\n          node.style.spacingBeforePx = Math.max(1, Math.round(node.style.spacingBeforePx * 0.5));\n        }\n        if (node.style.spacingAfterPx) {\n          node.style.spacingAfterPx = Math.max(1, Math.round(node.style.spacingAfterPx * 0.5));\n        }\n      }\n      if (node.spacingBeforePx) {\n        node.spacingBeforePx = Math.max(1, Math.round(node.spacingBeforePx * 0.5));\n      }\n      if (node.spacingAfterPx) {\n        node.spacingAfterPx = Math.max(1, Math.round(node.spacingAfterPx * 0.5));\n      }\n      if (node.type === 'spacer') node.px = Math.max(2, Math.round(node.px * 0.5));\n      if (node.children) compactColumnNodes(node.children);\n      if (node.cells) {\n        for (const cell of node.cells) compactColumnNodes(cell.children || []);\n      }\n      if (node.rows) {\n        for (const row of node.rows) {\n          for (const cell of row.cells) compactColumnNodes(cell.children || []);\n        }\n      }\n    }\n    return nodes;\n  }\n\n  // A page column's own 1px edge border is the visual divider between\n  // columns \u2014 carry it onto the cell (borderLeftOf demands >=2px).\n  function columnEdgeBorder(csc, side) {\n    const widthPx = parseFloat(csc[`border${side}Width`]);\n    if (!(widthPx >= 1) || csc[`border${side}Style`] === 'none') return null;\n    const color = toHex(csc[`border${side}Color`]);\n    return color ? { color, widthPx } : null;\n  }\n\n  // Word never splits a table row that contains a nested table, so a\n  // taller-than-page single-row column layout strands page 1 blank and dumps\n  // everything onto page 2+. Slice the columns into multiple rows at Y\n  // positions no block straddles: each slice fits a page and Word paginates\n  // between the rows.\n  function slicedPageColumnRows(el, depth, cols, colWidths) {\n    const blocks = [];\n    cols.forEach((col, colIdx) => columnBlocks(col, depth, blocks, colIdx));\n    if (!blocks.length) return null;\n    return buildColumnRows(blocks, cols.length, colWidths, (ci, sliceIdx) => {\n      const csc = cs(cols[ci]);\n      return {\n        shading: bgHex(cols[ci]),\n        borderLeft: columnEdgeBorder(csc, 'Left'),\n        borderRight: columnEdgeBorder(csc, 'Right'),\n        gapAfterPx:\n          ci < cols.length - 1\n            ? Math.max(\n                0,\n                Math.round(\n                  cols[ci + 1].getBoundingClientRect().left -\n                    cols[ci].getBoundingClientRect().right,\n                ),\n              )\n            : 0,\n        padPx: {\n          top: sliceIdx === 0 ? Math.round(parseFloat(csc.paddingTop)) : 0,\n          left: Math.round(parseFloat(csc.paddingLeft)),\n          right: Math.round(parseFloat(csc.paddingRight)),\n        },\n      };\n    });\n  }\n\n  // Slice pre-collected column blocks into page-height rows so Word can\n  // paginate between them while keeping side-by-side placement. cellStyle\n  // supplies per-column paint/padding; children come from the sliced blocks.\n  function buildColumnRows(\n    blocks,\n    colCount,\n    colWidths,\n    cellStyle,\n    { allowSingleRow = false, ignoreHeaderOffset = false } = {},\n  ) {\n    const PAGE_H = 1123; // A4 @96dpi\n    const topMin = Math.min(...blocks.map((b) => b.top));\n    const bottomMax = Math.max(...blocks.map((b) => b.bottom));\n    // Content above the columns (title header) eats into Word's first page:\n    // the first slice must be short enough to fit the remainder, or the\n    // whole first row slides to page 2 and page 1 is stranded again. For a\n    // column block nested deep in a multi-page document the body-top distance\n    // is meaningless (Word repositions the block per page), so skip it.\n    const body = document.body.getBoundingClientRect();\n    const offsetAbove = ignoreHeaderOffset\n      ? 0\n      : Math.max(0, topMin - body.top - (parseFloat(cs(document.body).paddingTop) || 0));\n    const cuts = [];\n    const straddlerAt = (y) => blocks.find((b) => b.top < y - 4 && b.bottom > y + 4);\n    const bumpPast = (y) => {\n      for (let guard = 0; guard < 200; guard++) {\n        const straddler = straddlerAt(y);\n        if (!straddler) break;\n        y = straddler.bottom + 6;\n      }\n      return y;\n    };\n    const bumpAbove = (y) => {\n      for (let guard = 0; guard < 200; guard++) {\n        const straddler = straddlerAt(y);\n        if (!straddler) break;\n        y = straddler.top - 6;\n      }\n      return y;\n    };\n    // Word lays out the pre-column header taller than the browser (built-in\n    // heading spacing, substituted font metrics), so the browser-measured\n    // offset underestimates what page 1 has left. A row that misses the\n    // real remainder slides whole to page 2 and strands page 1 \u2014 budget\n    // conservatively; a shorter first row costs nothing.\n    const page1Limit = topMin + PAGE_H - offsetAbove * 1.2 - 160;\n    let target = topMin + Math.max(250, PAGE_H * 0.75 - offsetAbove * 1.2);\n    while (target < bottomMax - 150) {\n      let y = bumpPast(target);\n      if (!cuts.length && y > page1Limit) {\n        // An atomic straddler pushed the first cut below page 1's remaining\n        // space. Cutting above it keeps a short-but-valid first row instead\n        // of degrading the whole two-column layout to sequential flow.\n        const up = bumpAbove(Math.min(target, page1Limit));\n        if (up - topMin >= 150) y = up;\n      }\n      if (y >= bottomMax - 100) break;\n      cuts.push(y);\n      target = y + PAGE_H * 0.8;\n    }\n    // Column content that fits one page needs no cut: emit a single row when\n    // the caller has no sequential-flow fallback (CSS multi-column), else\n    // signal null so the tall-sidebar path can fall back.\n    if (!cuts.length && !allowSingleRow) return null;\n    // A first slice taller than page 1's remaining space strands page 1\n    // anyway (atomic blocks forced the cut too far down) \u2014 signal the\n    // caller to fall back to sequential flow.\n    if (cuts.length && cuts[0] - topMin > PAGE_H - offsetAbove - 80) return null;\n    const boundaries = [topMin - 1, ...cuts, bottomMax + 1];\n    const rows = [];\n    for (let s = 0; s + 1 < boundaries.length; s++) {\n      const cells = Array.from({ length: colCount }, (_, ci) => {\n        const cellBlocks = blocks\n          .filter((b) => b.col === ci && b.top >= boundaries[s] && b.top < boundaries[s + 1])\n          .sort((a, b) => a.top - b.top);\n        return {\n          ...cellStyle(ci, s),\n          children: compactColumnNodes(cellBlocks.flatMap((b) => b.nodes)),\n        };\n      });\n      rows.push({ cells });\n    }\n    return [{ type: 'table', layout: true, pageColumns: true, rows, colWidths }];\n  }\n\n  // CSS multi-column (`column-count` / `columns`): content flows into N\n  // physical columns with no per-column element. flatten the direct children,\n  // bucket each into a column by its rendered center, then slice into\n  // page-height rows like the flex/grid column path.\n  function cssMultiColumnParts(el) {\n    const s = cs(el);\n    if (s.display !== 'block' && s.display !== 'flow-root') return null;\n    let colCount = parseInt(s.columnCount, 10);\n    const hasColWidth = s.columnWidth && s.columnWidth !== 'auto';\n    if ((!Number.isFinite(colCount) || colCount < 2) && !hasColWidth) return null;\n    const kids = [...el.children].filter(\n      (c) =>\n        !SKIP_TAGS.has(c.tagName) &&\n        isVisible(c) &&\n        cs(c).position !== 'absolute' &&\n        cs(c).position !== 'fixed',\n    );\n    // need enough items to actually populate more than one column\n    if (kids.length < 4) return null;\n    const lefts = kids.map((k) => Math.round(k.getBoundingClientRect().left));\n    const buckets = [];\n    for (const x of lefts) if (!buckets.some((b) => Math.abs(b - x) < 20)) buckets.push(x);\n    if (buckets.length < 2) return null;\n    if (!Number.isFinite(colCount) || colCount < 2) colCount = buckets.length;\n    if (colCount < 2 || colCount > 4) return null;\n    const gap = parseFloat(s.columnGap);\n    const rect = el.getBoundingClientRect();\n    const colGapPx = Number.isFinite(gap) ? Math.round(gap) : Math.round(rect.width * 0.04);\n    return { colCount: Math.min(colCount, buckets.length), colGapPx };\n  }\n\n  function extractCssColumns(el, depth, colCount, colGapPx) {\n    const rect = el.getBoundingClientRect();\n    const s = cs(el);\n    const padL = parseFloat(s.paddingLeft) || 0;\n    const padR = parseFloat(s.paddingRight) || 0;\n    const contentLeft = rect.left + padL;\n    const contentWidth = Math.max(1, rect.width - padL - padR);\n    const colPitch = (contentWidth + colGapPx) / colCount;\n    const kids = [...el.children].filter(\n      (c) =>\n        !SKIP_TAGS.has(c.tagName) &&\n        isVisible(c) &&\n        cs(c).position !== 'absolute' &&\n        cs(c).position !== 'fixed',\n    );\n    const blocks = [];\n    for (const child of kids) {\n      const r = child.getBoundingClientRect();\n      let colIdx = Math.floor((r.left + r.width / 2 - contentLeft) / colPitch);\n      colIdx = Math.max(0, Math.min(colCount - 1, colIdx));\n      const nodes = processElement(child, depth + 1);\n      if (nodes.length) blocks.push({ col: colIdx, top: r.top, bottom: r.bottom, nodes });\n    }\n    if (blocks.length < 2 || new Set(blocks.map((b) => b.col)).size < 2) return null;\n    const colWidthPx = Math.round((contentWidth - colGapPx * (colCount - 1)) / colCount);\n    const colWidths = Array.from({ length: colCount }, () => colWidthPx);\n    const containerShading = bgHex(el);\n    return buildColumnRows(\n      blocks,\n      colCount,\n      colWidths,\n      (ci, sliceIdx) => ({\n        shading: containerShading,\n        gapAfterPx: ci < colCount - 1 ? colGapPx : 0,\n        padPx: { top: sliceIdx === 0 ? Math.round(parseFloat(s.paddingTop) || 0) : 0, left: 0, right: 0 },\n      }),\n      { allowSingleRow: true, ignoreHeaderOffset: true },\n    );\n  }\n\n  function extractPageColumns(el, depth, cols) {\n    const colWidths = cols.map((c) => Math.round(c.getBoundingClientRect().width));\n    const anyPositionedComposition = cols.some((col) =>\n      [...col.querySelectorAll('*')].some((descendant) => {\n        if (!isVisible(descendant)) return false;\n        const position = cs(descendant).position;\n        return position === 'absolute' || position === 'fixed';\n      }),\n    );\n    const tallestPx = Math.max(...cols.map((c) => c.getBoundingClientRect().height));\n    if (!anyPositionedComposition && tallestPx > 1123 * 1.15) {\n      const sliced = slicedPageColumnRows(el, depth, cols, colWidths);\n      if (sliced) return sliced;\n      const flowCells = cols.map((col) =>\n        compactColumnNodes(\n          needsBlockWalk(col) ? processChildren(col, depth + 1) : paraNodesFrom(col),\n        ),\n      );\n      const hasTableish = (nodes) =>\n        (nodes || []).some(\n          (n) =>\n            ['table', 'card', 'kpirow'].includes(n.type) ||\n            hasTableish(n.children) ||\n            (n.rows || []).some((row) => (row.cells || []).some((c) => hasTableish(c.children))),\n        );\n      // Nested tables make a table row unsplittable in Word: a single\n      // multi-page row would strand page 1 blank \u2014 sequential flow reads\n      // better. Pure paragraph/list columns split across pages natively,\n      // so they keep the two-column geometry as one row.\n      if (flowCells.some(hasTableish)) return flowCells.flat();\n      return [{\n        type: 'table',\n        layout: true,\n        pageColumns: true,\n        rows: [{\n          cells: cols.map((col, colIndex) => {\n            const csc = cs(col);\n            return {\n              shading: bgHex(col),\n              borderLeft: columnEdgeBorder(csc, 'Left'),\n              borderRight: columnEdgeBorder(csc, 'Right'),\n              gapAfterPx:\n                colIndex < cols.length - 1\n                  ? Math.max(\n                      0,\n                      Math.round(\n                        cols[colIndex + 1].getBoundingClientRect().left -\n                          col.getBoundingClientRect().right,\n                      ),\n                    )\n                  : 0,\n              padPx: {\n                top: Math.round(parseFloat(csc.paddingTop)),\n                left: Math.round(parseFloat(csc.paddingLeft)),\n                right: Math.round(parseFloat(csc.paddingRight)),\n              },\n              children: flowCells[colIndex],\n            };\n          }),\n        }],\n        colWidths,\n      }];\n    }\n    const cells = cols.map((col, colIndex) => {\n      const csc = cs(col);\n      const hasPositionedComposition = [...col.querySelectorAll('*')].some((descendant) => {\n        if (!isVisible(descendant)) return false;\n        const position = cs(descendant).position;\n        return position === 'absolute' || position === 'fixed';\n      });\n      const colRect = col.getBoundingClientRect();\n      const children = compactColumnNodes(\n        hasPositionedComposition && colRect.height <= 1800\n          ? [markForScreenshot(col)]\n          : needsBlockWalk(col)\n            ? processChildren(col, depth + 1)\n            : paraNodesFrom(col),\n      );\n      let topEdgeFill;\n      if (children[0]?.type === 'image' && (children[0].spacingBeforePx || 0) <= 2) {\n        const firstPaintedChild = [...col.children].find(\n          (child) => !SKIP_TAGS.has(child.tagName) && isVisible(child),\n        );\n        if (firstPaintedChild) {\n          const firstRect = firstPaintedChild.getBoundingClientRect();\n          const offLeft = firstRect.left - colRect.left;\n          const offRight = colRect.right - firstRect.right;\n          children[0].bleedLeftPx =\n            offLeft <= 2 ? Math.max(0, parseFloat(csc.paddingLeft) || 0) : 0;\n          children[0].bleedRightPx =\n            offRight <= 2 ? Math.max(0, parseFloat(csc.paddingRight) || 0) : 0;\n          children[0].align =\n            offLeft > 8 &&\n            offRight > 8 &&\n            Math.abs(offLeft - offRight) < Math.max(12, firstRect.width * 0.08)\n              ? 'center'\n              : offLeft > offRight * 3\n                ? 'right'\n                : 'left';\n        }\n        const firstStyle = firstPaintedChild ? cs(firstPaintedChild) : null;\n        const gradientColor = firstStyle?.backgroundImage.match(\n          /rgba?\\([^)]+\\)|#[0-9a-f]{3,8}/i,\n        )?.[0];\n        topEdgeFill =\n          (gradientColor && toHex(gradientColor, { dropWhite: false })) ||\n          (firstPaintedChild && bgHex(firstPaintedChild));\n        children[0].topEdgeFill = topEdgeFill;\n      }\n      return {\n        // column-level paint (sidebar background) becomes cell shading\n        shading: bgHex(col),\n        borderLeft: columnEdgeBorder(csc, 'Left'),\n        borderRight: columnEdgeBorder(csc, 'Right'),\n        gapAfterPx:\n          colIndex < cols.length - 1\n            ? Math.max(\n                0,\n                Math.round(\n                  cols[colIndex + 1].getBoundingClientRect().left -\n                    col.getBoundingClientRect().right,\n                ),\n              )\n            : 0,\n        padPx: {\n          top: Math.round(parseFloat(csc.paddingTop)),\n          left: Math.round(parseFloat(csc.paddingLeft)),\n          right: Math.round(parseFloat(csc.paddingRight)),\n        },\n        children,\n      };\n    });\n    return [{ type: 'table', layout: true, pageColumns: true, rows: [{ cells }], colWidths }];\n  }\n\n  // Grid/flex of small uniformly-painted badges (skill icons, tag clouds with\n  // shaped backgrounds): text alone can't reproduce circles/pills laid out in\n  // a grid, so capture the whole container as one image.\n  function isBadgeGrid(el) {\n    const s = cs(el);\n    const kids = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c));\n    if (kids.length < 2) return false;\n    const r = el.getBoundingClientRect();\n    if (r.height < 8 || r.height > 320) return false;\n    if ((el.innerText || '').trim().length > 150) return false;\n    const flexOrGrid = s.display === 'grid' || s.display === 'flex';\n    const pillKids = kids.filter((k) => isPill(k));\n    // Plain block tag clouds: optional label + >=3 pill chips\n    // (e.g. <div>Book tags</div><span class=\"tag-pill\">\u2026).\n    const tagCloud =\n      !flexOrGrid &&\n      pillKids.length >= 3 &&\n      pillKids.length >= kids.length - 1 &&\n      r.height <= 160;\n    if (!flexOrGrid && !tagCloud) return false;\n    const checkKids = tagCloud ? pillKids : kids;\n    // badges hold a short label at most; multi-line award/skill cards with\n    // real sentences must stay editable text (CJK chars weighted double)\n    const weighted = (t) =>\n      t.length + (t.match(/[\\u3000-\\u9fff\\uf900-\\ufaff]/g) || []).length;\n    return checkKids.every((k) => {\n      const kr = k.getBoundingClientRect();\n      return (\n        kr.height <= 130 &&\n        Boolean(bgHex(k) || paintedBgHex(k)) &&\n        weighted((k.innerText || '').trim()) <= 30 &&\n        // badges/chips are single-line; a label+value pair is a KPI stat\n        // box that must stay an editable kpirow cell\n        !(k.innerText || '').trim().includes('\\n')\n      );\n    });\n  }\n\n  // Empty bordered square drawn as a form checkbox (styled div or <input>).\n  function isCheckboxLike(el) {\n    if (el.tagName === 'INPUT') {\n      return el.type === 'checkbox' || el.type === 'radio';\n    }\n    if ((el.innerText || '').trim() || el.children.length) return false;\n    const r = el.getBoundingClientRect();\n    if (r.width < 8 || r.width > 30 || r.height < 8 || r.height > 30) return false;\n    if (Math.abs(r.width - r.height) > 6) return false;\n    const s = cs(el);\n    return parseFloat(s.borderTopWidth) >= 1 && s.borderTopStyle !== 'none';\n  }\n\n  function checkboxNode(el) {\n    const r = el.getBoundingClientRect();\n    const checked = el.tagName === 'INPUT' && el.checked;\n    const radio =\n      (el.tagName === 'INPUT' && el.type === 'radio') ||\n      // styled circle: border-radius >= 40% of the box\n      parseFloat(cs(el).borderTopLeftRadius) >= r.height * 0.4;\n    return checkboxRun({\n      checked,\n      radio,\n      contentControl: el.tagName === 'INPUT' && !radio ? 'checkbox' : undefined,\n      heightPx: r.height,\n      color: toHex(cs(el).borderTopColor) || '333333',\n    });\n  }\n\n  function checkboxRun(marker) {\n    const glyph = marker.radio\n      ? marker.checked\n        ? '\\u25c9'\n        : '\\u25cb'\n      : marker.checked\n        ? '\\u2611'\n        : '\\u2610';\n    const sizePx = Math.max(12, Math.min(22, Math.round(marker.heightPx * 1.1)));\n    return {\n      text: glyph,\n      color: marker.color || '333333',\n      sizePx,\n      contentControl: marker.contentControl,\n      checked: marker.checked,\n    };\n  }\n\n  function pseudoCheckbox(el) {\n    for (const which of ['::before', '::after']) {\n      const s = getComputedStyle(el, which);\n      if (!s || s.content === 'none' || s.content === 'normal') continue;\n      const content = s.content.replace(/^['\"]|['\"]$/g, '');\n      if (content.trim()) continue;\n      const width = parseFloat(s.width);\n      const height = parseFloat(s.height);\n      if (\n        width < 8 ||\n        width > 30 ||\n        height < 8 ||\n        height > 30 ||\n        Math.abs(width - height) > 6\n      ) {\n        continue;\n      }\n      const borderWidth = parseFloat(s.borderTopWidth);\n      if (borderWidth < 1 || s.borderTopStyle === 'none') continue;\n      const itemStyle = cs(el);\n      const left = Number.isFinite(parseFloat(s.left)) ? parseFloat(s.left) : 0;\n      const gap = Math.max(4, (parseFloat(itemStyle.paddingLeft) || 0) - left - width);\n      return {\n        widthPx: width,\n        heightPx: height,\n        gapPx: gap,\n        checked: false,\n        radio: parseFloat(s.borderTopLeftRadius) >= height * 0.4,\n        color: toHex(s.borderTopColor) || '999999',\n      };\n    }\n    return null;\n  }\n\n  // Small rounded-corner painted box with a short text (badge / pill / logo\n  // circle): rectangles can't reproduce the rounding, screenshot it.\n  function isPill(el) {\n    const r = el.getBoundingClientRect();\n    if (r.height < 14 || r.height > 90 || r.width > 420) return false;\n    if ((el.innerText || '').trim().length > 60) return false;\n    if (parseFloat(cs(el).borderTopLeftRadius) < Math.min(12, r.height * 0.25)) {\n      return false;\n    }\n    // Solid tint, or translucent/near-white paint kept only because a tinted\n    // parent sits behind it (e.g. rgba(255,255,255,.2) number chips on colored\n    // headers). bgHex alone drops those and they wrongly become white bars.\n    return Boolean(bgHex(el) || paintedBgHex(el));\n  }\n\n  // Step/number circles only \u2014 not wider tag pills that must stay inline.\n  function isCompactCircleBadge(el) {\n    if (!isPill(el)) return false;\n    const r = el.getBoundingClientRect();\n    const radius = parseFloat(cs(el).borderTopLeftRadius) || 0;\n    return (\n      r.width <= 48 &&\n      Math.abs(r.width - r.height) <= 8 &&\n      radius >= r.height * 0.4\n    );\n  }\n\n  // Textless painted leaf (progress bar, color swatch, decorative strip,\n  // fill-in box): nothing to map to OOXML text, screenshot it. Paint may\n  // live on the element itself or on a nested fill div. Height cap is\n  // generous only because the element is guaranteed textless.\n  function isDecorativeLeaf(el) {\n    // a lone emoji/pictograph still counts as textless decoration\n    if ((el.innerText || '').trim().length > 4) return false;\n    const r = el.getBoundingClientRect();\n    if (r.height < 3 || r.height > 400 || r.width < 16) return false;\n    if (bgHex(el)) return true;\n    if (cs(el).backgroundImage !== 'none') return true;\n    // bordered empty box (fill-in area) counts even without background.\n    // 1px form answer boxes fail borderTopOf (>=2px), so also accept fullBorder.\n    if (\n      r.height >= 28 &&\n      !isCheckboxLike(el) &&\n      (borderTopOf(el) || fullBorderOf(el))\n    ) {\n      return true;\n    }\n    for (const d of el.querySelectorAll('*')) {\n      if (isVisible(d) && bgHex(d)) return true;\n    }\n    return false;\n  }\n\n  // Icon-font glyph element (<i class=\"bi bi-telephone\">): the glyph lives in\n  // a ::before pseudo element, so text extraction sees nothing at all.\n  function isIconGlyph(el) {\n    if ((el.innerText || '').trim()) return false;\n    if (el.children.length) return false;\n    const r = el.getBoundingClientRect();\n    if (r.width < 6 || r.height < 6 || r.width > 48 || r.height > 48) return false;\n    const hasContent = (pseudo) => {\n      const content = getComputedStyle(el, pseudo).content;\n      return content && content !== 'none' && content !== 'normal' && content !== '\"\"';\n    };\n    return hasContent('::before') || hasContent('::after');\n  }\n\n  // Absolutely-positioned full-height painted strip hugging the card's left\n  // edge (decorative accent). Reproduced as a shaded table cell, not a float.\n  function leftAccentOf(el) {\n    const pr = el.getBoundingClientRect();\n    for (const c of el.children) {\n      if (cs(c).position !== 'absolute') continue;\n      const bg = bgHex(c);\n      if (!bg) continue;\n      const r = c.getBoundingClientRect();\n      if (\n        Math.abs(r.left - pr.left) < 3 &&\n        r.height >= pr.height * 0.85 &&\n        r.width >= 8 &&\n        r.width < pr.width * 0.4\n      ) {\n        return { el: c, color: bg, widthPx: Math.round(r.width) };\n      }\n    }\n    return null;\n  }\n\n  // Uniform border on all four sides (outlined card / framed box)\n  function fullBorderOf(el) {\n    const s = cs(el);\n    const w = parseFloat(s.borderTopWidth);\n    if (!(w >= 1) || s.borderTopStyle === 'none') return null;\n    if (\n      parseFloat(s.borderLeftWidth) < 1 ||\n      parseFloat(s.borderRightWidth) < 1 ||\n      parseFloat(s.borderBottomWidth) < 1\n    ) {\n      return null;\n    }\n    // A uniform frame paints every side the same color. A bright accent on one\n    // edge over near-background hairlines (gold top rule + dark 1px sides) is a\n    // top rule, not a box \u2014 let borderTopOf claim just that edge instead of\n    // drawing the accent color around all four sides.\n    const color = toHex(s.borderTopColor);\n    const sidesMatch =\n      toHex(s.borderRightColor) === color &&\n      toHex(s.borderBottomColor) === color &&\n      toHex(s.borderLeftColor) === color;\n    if (!sidesMatch) return null;\n    return color ? { color, widthPx: w } : null;\n  }\n\n  // Visual card: own background, strong left border, or a full outline \u2014\n  // smaller than page frame\n  function isCard(el, depth) {\n    if (depth >= 4) return false;\n    const r = el.getBoundingClientRect();\n    const shading = paintedBgHex(el);\n    const bl = borderLeftOf(el);\n    const br = borderRightOf(el);\n    const fullBorder = fullBorderOf(el);\n    // Very tall unframed wrappers are page containers, but an explicit\n    // four-sided border is authored content and must survive across pages.\n    // Exception: a full-bleed SECTION with its own solid backdrop among\n    // sibling sections (dark manifesto chapters) \u2014 without the card shading\n    // its light text lands unreadable on the page background. The card row\n    // splits across pages, so height is no obstacle.\n    if (r.height > 1000 && !fullBorder) {\n      const siblingCountAt = (node) =>\n        node.parentElement\n          ? [...node.parentElement.children].filter((c) => c !== node && isVisible(c)).length\n          : 0;\n      // shading (paintedBgHex above) includes a white sheet on a tinted\n      // page \u2014 dropping it dumps the sheet's content onto the backdrop.\n      // The painted panel may sit inside a transparent section wrapper\n      // (<section><div style=\"background:\u2026\">): the \"among sibling sections\"\n      // signal then lives on the wrapper, so look up through unpainted ones.\n      let host = el;\n      let siblings = siblingCountAt(host);\n      while (\n        siblings < 2 &&\n        host.parentElement &&\n        host.parentElement !== document.body &&\n        !paintedBgHex(host.parentElement)\n      ) {\n        host = host.parentElement;\n        siblings = siblingCountAt(host);\n      }\n      if (!(shading && siblings >= 2)) return false;\n    }\n    const s = cs(el);\n    const hasPadding = parseFloat(s.paddingLeft) >= 6 || parseFloat(s.paddingTop) >= 6;\n    return Boolean((shading || bl || br || fullBorder) && hasPadding);\n  }\n\n  function formFieldNode(el) {\n    return globalThis.__html2docxFormsMedia.formFieldNode(el, {\n      bgHex,\n      bordersOf,\n      cellPaddingOf,\n      cs,\n      runStyleOf,\n    });\n  }\n\n  function fillInLineNode(el) {\n    return globalThis.__html2docxFormsMedia.fillInLineNode(el, { bordersOf, cs });\n  }\n\n  function fillInBoxNode(el) {\n    return globalThis.__html2docxFormsMedia.fillInBoxNode(el, {\n      bordersOf,\n      cs,\n      toHex,\n      paintedBgHex,\n      runStyleOf,\n    });\n  }\n\n  function embeddedMediaNode(el) {\n    return globalThis.__html2docxFormsMedia.embeddedMediaNode(el, { markForScreenshot });\n  }\n\n";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/decorators.js
var decorators_default = "  // Rendered math (KaTeX / MathJax / MathML): the internal spans are layout\n  // hacks \u2014 walking them yields garbage text runs (\"y=ncx\"). Screenshot the\n  // whole formula instead.\n  function isMathContainer(el) {\n    const tag = el.tagName;\n    if (tag === 'MATH' || tag === 'MJX-CONTAINER') return true;\n    const cls = el.classList;\n    return Boolean(\n      cls && (cls.contains('katex') || cls.contains('katex-display') || cls.contains('MathJax')),\n    );\n  }\n\n  function pseudoBullet(el) {\n    const s = getComputedStyle(el, '::before');\n    if (!s || s.content === 'none' || s.content === 'normal') return false;\n    const content = s.content.replace(/^['\"]|['\"]$/g, '').trim();\n    return BULLET_GLYPHS.has(content);\n  }\n\n  // Real-element twin of the painted ::before dot below: a small empty\n  // painted first child (<div class=\"dot\"></div>) is a list marker, not a\n  // block \u2014 classifier would silently drop it.\n  function chipBulletRun(el) {\n    const first = [...el.children].find((child) => isVisible(child));\n    if (!first || first.childElementCount || (first.innerText || '').trim()) return null;\n    const r = first.getBoundingClientRect();\n    if (r.width < 4 || r.width > 14 || r.height < 4 || r.height > 14) return null;\n    const color = toHex(cs(first).backgroundColor);\n    if (!color) return null;\n    const round = parseFloat(cs(first).borderRadius) >= r.width / 2 - 1;\n    return {\n      text: `${round ? '\u25CF' : '\u25A0'}\xA0`,\n      color,\n      // the dot glyph inks ~60% of its em box: scale up to match the chip\n      sizePx: Math.max(8, Math.round(Math.min(r.width, r.height) / 0.6)),\n    };\n  }\n\n  function pseudoBulletRun(el) {\n    const s = getComputedStyle(el, '::before');\n    if (!s || s.content === 'none' || s.content === 'normal') return null;\n    const content = s.content.replace(/^['\"]|['\"]$/g, '').trim();\n    if (!content) {\n      // Painted dot bullet: empty ::before drawn as a small colored circle\n      // or square \\u2014 emit an equivalent colored glyph run.\n      const dotW = parseFloat(s.width);\n      const dotH = parseFloat(s.height);\n      const dotColor = toHex(s.backgroundColor);\n      // Composite icon: ::before circle + ::after strokes (check-in-circle\n      // list markers) \\u2014 a flat glyph drops the checkmark, so clip-screenshot\n      // the drawn icon box instead.\n      const after = getComputedStyle(el, '::after');\n      const afterPaints =\n        after &&\n        after.content !== 'none' &&\n        (parseFloat(after.borderLeftWidth) >= 1 ||\n          parseFloat(after.borderBottomWidth) >= 1 ||\n          Boolean(toHex(after.backgroundColor)));\n      if (\n        dotColor &&\n        afterPaints &&\n        s.position === 'absolute' &&\n        dotW >= 10 &&\n        dotW <= 28 &&\n        dotH >= 10 &&\n        dotH <= 28\n      ) {\n        const host = el.getBoundingClientRect();\n        const x = host.left + (parseFloat(s.left) || 0);\n        const y = host.top + (parseFloat(s.top) || 0);\n        if (x >= 0 && y >= 0) {\n          const gapPx = 6;\n          return {\n            text: '',\n            inlineImage: true,\n            shotId: `h2d-${shotCounter++}`,\n            clip: {\n              x: Math.round(x),\n              y: Math.round(y),\n              width: Math.round(dotW + gapPx),\n              height: Math.round(dotH),\n            },\n            width: Math.round(dotW + gapPx),\n            height: Math.round(dotH),\n          };\n        }\n      }\n      if (dotColor && dotW >= 4 && dotW <= 14 && dotH >= 4 && dotH <= 14) {\n        const round = parseFloat(s.borderRadius) >= dotW / 2 - 1;\n        return {\n          text: `${round ? '\\u25cf' : '\\u25a0'}\\u00a0`,\n          color: dotColor,\n          // the dot glyph inks ~60% of its em box: scale up to match the chip\n          sizePx: Math.max(8, Math.round(Math.min(dotW, dotH) / 0.6)),\n        };\n      }\n      return null;\n    }\n    // Numbered circle badge: content:counter(x) painted as a colored circle\n    // with a light number.\n    if (content.includes('counter(') && el.parentElement) {\n      const badgeW = parseFloat(s.width);\n      // gradient badges have a transparent backgroundColor: take the first\n      // gradient stop as the representative color\n      const gradientStop = s.backgroundImage.match(/rgba?\\([^)]+\\)|#[0-9a-f]{3,8}/i)?.[0];\n      const badgeColor =\n        toHex(s.backgroundColor) ||\n        (gradientStop && toHex(gradientStop, { dropWhite: false }));\n      // Pseudo-elements have no DOM node to screenshot, but an absolutely\n      // positioned badge's rendered box is computable from the host rect +\n      // its own offsets/size \u2014 clip-screenshot it so size and gradient\n      // survive exactly.\n      const badgeH = parseFloat(s.height) || badgeW;\n      if (\n        badgeColor &&\n        s.position === 'absolute' &&\n        badgeW >= 14 &&\n        badgeW <= 72 &&\n        badgeH >= 14 &&\n        badgeH <= 72 &&\n        parseFloat(s.borderRadius) >= badgeW / 2 - 2\n      ) {\n        const host = el.getBoundingClientRect();\n        const x = host.left + (parseFloat(s.left) || 0);\n        const y = host.top + (parseFloat(s.top) || 0);\n        if (x >= 0 && y >= 0) {\n          const gapPx = 8; // right whitespace baked in as the text gap\n          return {\n            text: '',\n            inlineImage: true,\n            shotId: `h2d-${shotCounter++}`,\n            clip: {\n              x: Math.round(x),\n              y: Math.round(y),\n              width: Math.round(badgeW + gapPx),\n              height: Math.round(badgeH),\n            },\n            width: Math.round(badgeW + gapPx),\n            height: Math.round(badgeH),\n          };\n        }\n      }\n      // Word has no circular chips \u2014 a negative circled digit (\u2776\u2777\u2026) in the\n      // badge color reads the same.\n      if (badgeColor && badgeW >= 14 && parseFloat(s.borderRadius) >= badgeW / 2 - 2) {\n        const siblings = [...el.parentElement.children].filter(\n          (sibling) => sibling.tagName === el.tagName && isVisible(sibling),\n        );\n        const index = siblings.indexOf(el) + 1;\n        const glyph =\n          index >= 1 && index <= 10\n            ? String.fromCodePoint(0x2775 + index)\n            : `${index}.`;\n        return {\n          text: `${glyph} `,\n          color: badgeColor,\n          sizePx: Math.max(10, Math.round(parseFloat(s.fontSize) * 1.15) || 16),\n        };\n      }\n    }\n    // Authored visible text prefixes (\"\u25C6 SLIDE \") count too, not only\n    // single-glyph markers.\n    const literalListMarker =\n      content.length <= 24 &&\n      !content.includes('counter(') &&\n      !content.includes('attr(') &&\n      !content.includes('url(');\n    if (!BULLET_GLYPHS.has(content) && !literalListMarker) return null;\n    return {\n      text: `${content}\\u00a0`,\n      color: toHex(s.color) || undefined,\n      sizePx: parseFloat(s.fontSize) || undefined,\n      fontFamily: BULLET_GLYPHS.has(content) ? s.fontFamily || undefined : 'Arial Unicode MS',\n    };\n  }\n\n  function hrNode(el) {\n    const s = cs(el);\n    const r = el.getBoundingClientRect();\n    const body = document.body.getBoundingClientRect();\n    const border = borderSideOf(el, 'top') || borderSideOf(el, 'bottom');\n    return {\n      type: 'hr',\n      color: border?.color || bgHex(el) || 'CCCCCC',\n      heightPx: border?.widthPx || Math.max(1, Math.min(r.height, 8)),\n      widthFrac: body.width > 0 ? Math.min(1, r.width / body.width) : 1,\n      align:\n        Math.abs(r.left + r.width / 2 - (body.left + body.width / 2)) < 12\n          ? 'center'\n          : 'left',\n    };\n  }\n\n  function thinRuleNode(el) {\n    if ((el.innerText || '').trim() || el.children.length) return null;\n    const r = el.getBoundingClientRect();\n    const parentWidth = el.parentElement?.getBoundingClientRect().width || r.width;\n    if (r.height < 1 || r.height > 8 || r.width < parentWidth * 0.5) return null;\n    const border = borderSideOf(el, 'top') || borderSideOf(el, 'bottom');\n    const color = border?.color || bgHex(el);\n    if (!color) return null;\n    return {\n      type: 'hr',\n      color,\n      heightPx: border?.widthPx || Math.max(1, r.height),\n      widthFrac: Math.min(1, r.width / document.body.getBoundingClientRect().width),\n      align: 'left',\n      spacingBeforePx: Math.max(0, Math.round(parseFloat(cs(el).marginTop) || 0)),\n      spacingAfterPx: Math.max(0, Math.round(parseFloat(cs(el).marginBottom) || 0)),\n    };\n  }\n\n  function isOverlaidInfographic(el) {\n    const rect = el.getBoundingClientRect();\n    if (rect.width < 200 || rect.height < 160 || rect.width > 1000 || rect.height > 1000) {\n      return false;\n    }\n    const children = [...el.children].filter((child) => isVisible(child));\n    const layoutChild = children.find((child) => {\n      const display = cs(child).display;\n      return display === 'grid' || display === 'flex';\n    });\n    if (!layoutChild) return false;\n    const layoutRect = layoutChild.getBoundingClientRect();\n    return children.some((child) => {\n      if (child === layoutChild || cs(child).position !== 'absolute') return false;\n      const childRect = child.getBoundingClientRect();\n      if (childRect.width < 40 || childRect.height < 40) return false;\n      return (\n        childRect.left < layoutRect.right &&\n        childRect.right > layoutRect.left &&\n        childRect.top < layoutRect.bottom &&\n        childRect.bottom > layoutRect.top\n      );\n    });\n  }\n\n  function needsVisualEffectScreenshot(el) {\n    return globalThis.__html2docxVisualEffects.needsScreenshot(el, {\n      bgHex,\n      cs,\n      fullBorderOf,\n    });\n  }\n\n";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/classifier.js
var classifier_default = `  function markForScreenshotSlices(el, maxSliceHeight = DEFAULT_SCREENSHOT_SLICE_HEIGHT) {
    const rect = el.getBoundingClientRect();
    if (
      !Number.isFinite(rect.left) ||
      !Number.isFinite(rect.top) ||
      !Number.isFinite(rect.width) ||
      rect.width <= 0
    ) return [];
    const sliceCount = boundedScreenshotSliceCount(rect.height, maxSliceHeight);
    if (sliceCount === 0) return [];
    const base = markForScreenshot(el);
    // Decorative absolutes bleeding past the element box (half-out hero
    // circles) get flat-cut by an element-width clip: extend to overhanging
    // descendants still touching the element band, capped so parked
    // off-screen decorations (left: -10000px) can't drag the clip away.
    let paintLeft = rect.left;
    let paintRight = rect.right;
    const maxBleed = 200;
    const elOverflow = cs(el).overflow;
    if (elOverflow !== 'hidden' && elOverflow !== 'clip') {
      for (const child of el.querySelectorAll('*')) {
        const childRect = child.getBoundingClientRect();
        if (!childRect.width || !childRect.height) continue;
        if (
          childRect.right <= rect.left - maxBleed ||
          childRect.left >= rect.right + maxBleed
        ) continue;
        if (childRect.left < paintLeft) paintLeft = Math.max(childRect.left, rect.left - maxBleed);
        if (childRect.right > paintRight) paintRight = Math.min(childRect.right, rect.right + maxBleed);
      }
    }
    const clipX = Math.max(0, Math.round(paintLeft));
    const clipWidth = Math.round(paintRight) - clipX;
    if (!Number.isFinite(clipWidth) || clipWidth <= 0) return [];
    return Array.from({ length: sliceCount }, (_, index) => {
      const sliceHeight = Math.min(maxSliceHeight, rect.height - index * maxSliceHeight);
      return {
        ...base,
        shotId: index === 0 ? base.shotId : \`h2d-\${shotCounter++}\`,
        width: clipWidth,
        height: Math.round(sliceHeight),
        spacingBeforePx: index === 0 ? base.spacingBeforePx : 0,
        spacingAfterPx: index === sliceCount - 1 ? base.spacingAfterPx : 0,
        clip: {
          x: clipX,
          y: Math.max(0, Math.round(rect.top + index * maxSliceHeight)),
          width: clipWidth,
          height: Math.round(sliceHeight),
        },
      };
    });
  }

  let cachedForcedPageBreakCount = null;
  function forcedPageBreakCount() {
    if (cachedForcedPageBreakCount === null) {
      cachedForcedPageBreakCount = [...document.querySelectorAll('*')].filter((element) => {
        const style = cs(element);
        return style.breakBefore === 'page' || style.pageBreakBefore === 'always';
      }).length;
    }
    return cachedForcedPageBreakCount;
  }

  // Classification tracing (H2D_TRACE_SELECTOR): record what each matching
  // element became \u2014 the recurring debugging question is "which branch
  // consumed this element", answered by tag+depth+output node types without
  // hand-inserting probes.
  function processElement(el, depth) {
    const traceSelector = globalThis.__h2dTraceSelector;
    if (!traceSelector) return processElementImpl(el, depth);
    const nodes = processElementImpl(el, depth);
    try {
      if (el.matches?.(traceSelector)) {
        (globalThis.__h2dTrace ||= []).push({
          where: 'classify',
          tag: el.tagName,
          cls: String(el.className).slice(0, 60),
          depth,
          out: nodes.map((node) => \`\${node.type}\${node.shotId ? ':shot' : ''}\`).join(',') || '(dropped)',
        });
      }
    } catch (e) { /* invalid selector: trace disabled */ }
    return nodes;
  }

  function processElementImpl(el, depth) {
    if (SKIP_TAGS.has(el.tagName)) return [];
    if (!isVisible(el)) {
      // Zero-height fill-in rules (border-top signature lines) fail the
      // height check but must still emit their line.
      const thinLine = fillInLineNode(el);
      return thinLine && !thinLine.inline ? [thinLine] : [];
    }
    const out = [];
    const s = cs(el);
    const explicitHeader = el.hasAttribute('data-docx-header');
    const explicitFooter = el.hasAttribute('data-docx-footer');
    const fixedSemanticHeader =
      s.position === 'fixed' && (el.tagName === 'HEADER' || el.getAttribute('role') === 'banner');
    const fixedSemanticFooter =
      s.position === 'fixed' && (el.tagName === 'FOOTER' || el.getAttribute('role') === 'contentinfo');
    if (depth <= 1 && (explicitHeader || explicitFooter || fixedSemanticHeader || fixedSemanticFooter)) {
      return [{
        type: explicitFooter || fixedSemanticFooter ? 'footerpart' : 'headerpart',
        children: needsBlockWalk(el)
          ? processChildren(el, depth + 1, { decorations: false })
          : paraNodesFrom(el, false),
      }];
    }

    if (isMathContainer(el)) {
      // katex-display spans the full line: shoot the inner .katex tight box
      // so the image is crisp and markForScreenshot detects center alignment
      const target =
        (el.classList?.contains('katex-display') && el.querySelector(':scope > .katex')) || el;
      const r = target.getBoundingClientRect();
      return r.width >= 4 && r.height >= 6 ? [markForScreenshot(target)] : [];
    }

    if (isIconGlyph(el)) return [markForScreenshot(el)];

    const positionedTextOverlay = [...el.children].some((child) => {
      const childPosition = cs(child).position;
      return (
        (childPosition === 'absolute' || childPosition === 'fixed') &&
        (child.innerText || '').trim().length >= 4
      );
    });
    if (s.position === 'relative' && positionedTextOverlay) {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 40 && rect.width <= 1000 && rect.height >= 20 && rect.height <= 600) {
        return [markForScreenshot(el)];
      }
      // Coordinate-composed page section (cover pages): every visible child
      // is absolutely positioned, so flow classification would emit nothing
      // and silently drop the whole section.
      const visibleKids = [...el.children].filter((child) => isVisible(child));
      if (
        visibleKids.length >= 2 &&
        visibleKids.every((child) => {
          const position = cs(child).position;
          return position === 'absolute' || position === 'fixed';
        }) &&
        rect.height <= window.innerHeight * 1.25 &&
        (el.innerText || '').trim().length >= 20
      ) {
        return [{ ...markForScreenshot(el), pageComposition: rect.height >= window.innerHeight * 0.7 }];
      }
    }

    // Oversized final names/signatures are decorative page furniture. Word
    // otherwise moves the entire line to a blank second page even when the
    // HTML places it at the bottom of page one.
    if (
      el.parentElement === document.body &&
      !el.nextElementSibling &&
      parseFloat(s.fontSize) > 40
    ) {
      const r = el.getBoundingClientRect();
      const body = document.body.getBoundingClientRect();
      const bs = cs(document.body);
      const shot = markForScreenshot(el);
      return [{
        ...shot,
        type: 'floatimg',
        isolate: true,
        xPx: Math.round(r.left - body.left - parseFloat(bs.paddingLeft)),
        yPx: Math.round(r.top - body.top - parseFloat(bs.paddingTop)),
        pageWpx: Math.round(body.width - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)),
        pageHpx: Math.round(body.height - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom)),
        atPageBottom: true,
      }];
    }

    // absolutely positioned decorations (page art, footers/headers) don't
    // belong in flow. Visible ones on the first page become floating images
    // anchored at their rendered page position; the rest are dropped.
    // A childless, textless painted box shoved far from its flow slot by
    // relative offsets is coordinate-placed art too \u2014 in flow it interrupts
    // the surrounding text at its static position.
    const relativeDecoration =
      s.position === 'relative' &&
      !el.children.length &&
      !(el.innerText || '').trim() &&
      (s.backgroundImage !== 'none' || paintedBgHex(el)) &&
      Math.abs(parseFloat(s.top) || 0) +
        Math.abs(parseFloat(s.left) || 0) +
        Math.abs(parseFloat(s.right) || 0) +
        Math.abs(parseFloat(s.bottom) || 0) >
        40;
    if (s.position === 'absolute' || s.position === 'fixed' || relativeDecoration) {
      if (el.hasAttribute('data-h2d-skip')) return [];
      const r = el.getBoundingClientRect();
      // effective z: nearest explicit z-index up the ancestor chain (the
      // stacking context often lives on a wrapper, not the painted box)
      const effectiveZ = (node) => {
        let cur = node;
        while (cur && cur !== document.body) {
          const z = Number.parseInt(cs(cur).zIndex, 10);
          if (Number.isFinite(z)) return z;
          cur = cur.parentElement;
        }
        return null;
      };
      const zIndex = effectiveZ(el) ?? 0;
      const coveredByPaint = [...document.querySelectorAll('*')].some((candidate) => {
        if (
          candidate === el ||
          candidate.contains(el) ||
          el.contains(candidate) ||
          !isVisible(candidate)
        ) {
          return false;
        }
        // gradient/image fills are paint too (gold banner boards etc.)
        const candidateStyle = cs(candidate);
        if (!paintedBgHex(candidate) && candidateStyle.backgroundImage === 'none') return false;
        // no explicit z counts as 0: static paint still covers negative-z
        // decorations (z:-1 backdrop art behind a painted card)
        const candidateZ = effectiveZ(candidate) ?? 0;
        if (candidateZ <= zIndex) return false;
        const cr = candidate.getBoundingClientRect();
        const overlapWidth = Math.max(0, Math.min(r.right, cr.right) - Math.max(r.left, cr.left));
        const overlapHeight = Math.max(0, Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top));
        return overlapWidth * overlapHeight >= r.width * r.height * 0.8;
      });
      if (coveredByPaint) return [];
      const PAGE_H = 1123; // A4 @96dpi
      const thinBar = r.height <= 40 && r.width > 500; // full-width rule/footer strip
      const smallDecoration = r.width <= 140 && r.height <= 140;
      // small art at the very bottom of a roughly one-page document (poster
      // corner triangles): keep it, pinned to the page bottom
      const docBottom = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const bottomDecoration =
        smallDecoration && docBottom <= PAGE_H * 1.45 && r.top + r.height >= docBottom - 80;
      // decoration positioned inside an ancestor box (banner leaf icons,
      // section watermark numerals): page-anchoring drifts when the ancestor
      // lands elsewhere in Word, so also record coordinates relative to the
      // containing block. Such decorations are kept on ANY page \u2014 the card
      // that carries them anchors them locally; leftovers without a card
      // context are dropped by the generator instead.
      let inParent = null;
      // not offsetParent: SVG elements (a leaf icon) don't have it
      let anchorParent = null;
      for (let cur = el.parentElement; cur && cur !== document.body; cur = cur.parentElement) {
        if (cs(cur).position !== 'static') {
          anchorParent = cur;
          break;
        }
      }
      if (anchorParent && anchorParent !== document.documentElement) {
        const pr = anchorParent.getBoundingClientRect();
        if (
          pr.width > 0 && pr.height > 0 &&
          r.left >= pr.left - 8 && r.right <= pr.right + 8 &&
          r.top >= pr.top - 8 && r.bottom <= pr.bottom + 8
        ) {
          inParent = {
            xPx: Math.round(r.left - pr.left),
            yPx: Math.round(r.top - pr.top),
            parentWpx: Math.round(pr.width),
            parentHpx: Math.round(pr.height),
          };
        }
      }
      // In-card overlays draw in FRONT of text (behind-text images vanish
      // under cell shading). An under-text decoration (z<=0) that is neither
      // a see-through ghost nor clear of the parent's text would cover words
      // \u2014 those keep the legacy page-anchor path instead.
      if (inParent && zIndex <= 0) {
        const elOpacity = parseFloat(s.opacity);
        const ghost = Number.isFinite(elOpacity) && elOpacity <= 0.35;
        if (!ghost) {
          // glyph-level rects, not element boxes: a centered heading's block
          // box spans the full banner width without its TEXT reaching the
          // decoration
          const overlapsText = [...anchorParent.querySelectorAll('*')].some((cand) => {
            if (cand === el || el.contains(cand) || cand.contains(el) || !isVisible(cand)) {
              return false;
            }
            for (const child of cand.childNodes) {
              if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(child);
              for (const cr of range.getClientRects()) {
                const ow = Math.max(0, Math.min(r.right, cr.right) - Math.max(r.left, cr.left));
                const oh = Math.max(0, Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top));
                if (ow * oh > r.width * r.height * 0.15) return true;
              }
            }
            return false;
          });
          if (overlapsText) inParent = null;
        }
      }
      if (
        (depth <= 1 || smallDecoration || thinBar || inParent) &&
        r.width >= 8 &&
        r.height >= 8 &&
        (r.width <= 500 || thinBar) &&
        r.height <= 500 &&
        r.top >= 0 &&
        (r.top + r.height <= PAGE_H + 40 || bottomDecoration || inParent)
      ) {
        // coordinates relative to the body's content box, so the generator can
        // anchor to the DOCX margin origin (page paddings differ)
        const body = document.body.getBoundingClientRect();
        const bs = cs(document.body);
        const originX = body.left + parseFloat(bs.paddingLeft);
        const originY = body.top + parseFloat(bs.paddingTop);
        const shot = markForScreenshot(el);
        return [{
          ...shot,
          type: 'floatimg',
          isolate: true,
          xPx: Math.round(r.left - originX),
          yPx: Math.round(r.top - originY),
          // content-box size, so the generator can rescale coordinates to the
          // (usually narrower) DOCX content area
          pageWpx: Math.round(body.width - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)),
          pageHpx: Math.round(
            Math.min(PAGE_H, body.height) - parseFloat(bs.paddingTop) - parseFloat(bs.paddingBottom),
          ),
          // pinned to the page bottom (footer bars): anchor there in DOCX too.
          // Measured against the page/document end, not body.bottom \u2014 a short
          // body (~90px) otherwise turns every top decoration into a "footer".
          atPageBottom:
            bottomDecoration ||
            r.top + r.height >= Math.min(PAGE_H, Math.max(body.bottom, docBottom)) - 8,
          // z <= 0 paints under the content layer in HTML (section pills,
          // corner art) \u2014 in front it would cover Word text instead
          behindText: zIndex <= 0,
          ...(inParent ? { inParent } : {}),
        }];
      }
      return [];
    }

    // Page-break semantics. A handful of authored breaks are deliberate
    // chapter starts and are honored. Templates that spray break-before on
    // EVERY section are format noise: honoring them yields a train of
    // mostly-empty pages (a 380px section alone, stranded section tails),
    // so noisy documents flow naturally instead \u2014 keep chains already hold
    // each heading to its body.
    if (
      (s.breakBefore === 'page' || s.pageBreakBefore === 'always') &&
      forcedPageBreakCount() <= 3
    ) {
      out.push({ type: 'pagebreak' });
    }

    // large top padding/margin (cover pages, section spacing) -> vertical spacer;
    // threshold 80px excludes ordinary page-frame padding, catches cover-style gaps
    const topGap = parseFloat(s.paddingTop) + parseFloat(s.marginTop);
    if (topGap > 80 && depth === 0) {
      out.push({ type: 'spacer', px: Math.min(topGap, 260) });
    }

    const tag = el.tagName;
    const headingMatch = tag.match(/^H([1-6])$/);
    const rect = el.getBoundingClientRect();
    // Image mosaic (grid/flex of imgs, often with row/col spans): rasterize
    // the collage whole \u2014 native processing stacks the photos vertically and
    // destroys the composition.
    {
      const visibleChildren = [...el.children].filter((child) => isVisible(child));
      const directImages = visibleChildren.filter((child) => child.tagName === 'IMG');
      if (
        (s.display === 'grid' || s.display === 'flex') &&
        directImages.length >= 3 &&
        directImages.length === visibleChildren.length &&
        rect.height <= 700 &&
        rect.height >= 80
      ) {
        return out.concat([markForScreenshot(el)]);
      }
    }
    // An empty, unpainted, borderless block with explicit height is
    // intentional whitespace (e.g. a hand-signature gap between "Sincerely,"
    // and the name) \u2014 preserve the height instead of dropping an empty
    // paragraph. Replaced elements (broken img alt fallback) and bordered
    // blanks (underline fill-in fields) have their own handling.
    if (
      !/^(IMG|SVG|CANVAS|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT|BUTTON|HR)$/.test(tag) &&
      !(el.innerText || '').trim() &&
      el.children.length === 0 &&
      rect.height >= 16 &&
      !bgHex(el) &&
      !paintedBgHex(el) &&
      s.backgroundImage === 'none' &&
      !(parseFloat(s.borderTopWidth) > 0) &&
      !(parseFloat(s.borderBottomWidth) > 0) &&
      !(parseFloat(s.borderLeftWidth) > 0) &&
      !(parseFloat(s.borderRightWidth) > 0) &&
      s.boxShadow === 'none'
    ) {
      const beforePseudo = getComputedStyle(el, '::before');
      const beforeText = (beforePseudo?.content || '').replace(/^['"]|['"]$/g, '').trim();
      if (!beforeText || beforeText === 'none' || beforeText === 'normal') {
        // bindsNeighbors: an authored in-flow gap (signature space) belongs
        // WITH its neighbors \u2014 "Sincerely," + gap + name must not split
        // across a page boundary.
        return out.concat([
          { type: 'spacer', px: Math.min(Math.round(rect.height), 400), bindsNeighbors: true },
        ]);
      }
    }
    if (
      tag === 'SECTION' &&
      rect.height > 1000 &&
      // a self-painted section must stay a card: flattening drops the
      // backdrop (dark paint, or a white sheet on a tinted page) and
      // strands its text on the page background
      !paintedBgHex(el) &&
      el.querySelector('h1, h2, h3') &&
      el.querySelector('svg, canvas')
    ) {
      const paddingTopPx = Math.max(0, parseFloat(s.paddingTop) || 0);
      const paddingBottomPx = Math.max(0, parseFloat(s.paddingBottom) || 0);
      return out.concat(
        paddingTopPx > 2 ? [{ type: 'spacer', px: paddingTopPx }] : [],
        processChildren(el, depth + 1),
        paddingBottomPx > 2 ? [{ type: 'spacer', px: paddingBottomPx }] : [],
      );
    }
    const beforeStyle = getComputedStyle(el, '::before');
    const beforeContent = (beforeStyle?.content || '').replace(/^['"]|['"]$/g, '').trim();
    if (
      !(el.innerText || '').trim() &&
      el.children.length === 0 &&
      beforeContent &&
      beforeContent !== 'none' &&
      beforeContent !== 'normal' &&
      rect.width >= 4 &&
      rect.width <= 64 &&
      rect.height >= 4 &&
      rect.height <= 64
    ) {
      return out.concat([markForScreenshot(el)]);
    }

    const hasFloatedLabel = [...el.querySelectorAll('*')].some((child) => {
      const float = cs(child).cssFloat;
      return float === 'left' || float === 'right';
    });
    const compactPaintedTracks = [...el.querySelectorAll('*')].filter((child) => {
      const childRect = child.getBoundingClientRect();
      return (
        !(child.innerText || '').trim() &&
        childRect.width >= 40 &&
        childRect.height >= 3 &&
        childRect.height <= 20 &&
        Boolean(bgHex(child) || paintedBgHex(child))
      );
    });
    if (
      hasFloatedLabel &&
      compactPaintedTracks.length >= 2 &&
      rect.width <= 400 &&
      rect.height <= 400
    ) {
      return out.concat([markForScreenshot(el)]);
    }

    if (tag === 'DETAILS' && !el.open) {
      const summary = [...el.children].find((child) => child.tagName === 'SUMMARY' && isVisible(child));
      if (!summary) return out;
      const border = fullBorderOf(el);
      const nodes = paraNodesFrom(summary, false);
      for (const node of nodes) {
        node.style = {
          ...node.style,
          shading: paintedBgHex(el),
          borderTop: border || undefined,
          borderBottom: border || undefined,
          borderLeft: border || undefined,
          borderRight: border || undefined,
          indentLeftPx: Math.max(
            node.style?.indentLeftPx || 0,
            Math.round(parseFloat(s.paddingLeft) || 0),
          ),
          spacingBeforePx: Math.max(0, Math.round(parseFloat(s.marginTop) || 0)),
          spacingAfterPx: Math.max(0, Math.round(parseFloat(s.marginBottom) || 0)),
        };
      }
      return out.concat(nodes);
    }

    const pseudoLabel = tag !== 'LI' ? pseudoBulletRun(el) : null;
    if (pseudoLabel && bgHex(el)) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 500 && rect.height <= 60) {
        return out.concat([markForScreenshot(el)]);
      }
    }

    if (headingMatch) {
      const rect = el.getBoundingClientRect();
      const backgroundClip =
        s.backgroundClip ||
        s.webkitBackgroundClip ||
        s.getPropertyValue('background-clip') ||
        s.getPropertyValue('-webkit-background-clip');
      const clippedGradientText =
        s.backgroundImage.includes('gradient') &&
        backgroundClip === 'text';
      if (clippedGradientText && rect.height <= 240) {
        return out.concat([markForScreenshot(el)]);
      }
      if (
        bgHex(el) &&
        rect.height <= 120 &&
        parseFloat(s.borderTopLeftRadius) >= 4
      ) {
        return out.concat([markForScreenshot(el)]);
      }
      const runs = collectRuns(el);
      const marker = pseudoMarker(el);
      if (marker) runs.unshift(marker);
      if (runs.length) {
        const headingBefore = pseudoBar(el, '::before');
        const headingAfter = pseudoBar(el, '::after');
        const style = paraStyleOf(el);
        if (headingAfter) {
          // the bar is a decorative underline: keep it tight under the text
          // and move the heading's own bottom margin below the bar. The
          // explicit small after-spacing also suppresses the built-in
          // Heading style's default (larger) spacing.
          headingAfter.spacingBeforePx = 0;
          headingAfter.spacingAfterPx =
            (headingAfter.spacingAfterPx || 0) + Math.max(0, (style.spacingAfterPx || 0) - 4);
          style.spacingAfterPx = 4;
        }
        if (headingBefore) out.push(headingBefore);
        out.push({ type: 'heading', level: +headingMatch[1], runs, style });
        if (headingAfter) out.push(headingAfter);
      } else {
        // empty heading (author-inserted blank line) still occupies height
        const r = el.getBoundingClientRect();
        const gap = r.height + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
        if (gap > 16) out.push({ type: 'spacer', px: Math.min(gap, 260) });
      }
      return out;
    }
    if (tag === 'TABLE') {
      const tableNodes = extractTable(el);
      const cap = el.caption;
      if (cap && isVisible(cap) && tableNodes.length) {
        const capRuns = collectRuns(cap);
        if (capRuns.length) {
          const capStyle = paraStyleOf(cap);
          const capPara = { type: 'para', runs: capRuns, style: capStyle };
          if (cs(cap).captionSide === 'bottom') return out.concat(tableNodes, [capPara]);
          capStyle.keepNext = true;
          return out.concat([capPara], tableNodes);
        }
      }
      return out.concat(tableNodes);
    }
    if (tag === 'UL') return out.concat(extractList(el, false, depth));
    if (tag === 'OL') return out.concat(extractList(el, true, depth));
    if (tag === 'PRE') return out.concat(extractCode(el));
    if (tag === 'HR') return out.concat([hrNode(el)]);
    if (tag === 'IMG') {
      if (!el.complete || el.naturalWidth === 0) {
        const rect = el.getBoundingClientRect();
        if (
          rect.width >= 80 &&
          rect.height >= 60 &&
          (bgHex(el) || paintedBgHex(el))
        ) {
          return out.concat([markForScreenshot(el)]);
        }
        const alt = (el.getAttribute('alt') || '').trim();
        if (!alt) return out;
        const parent = el.parentElement || el;
        return out.concat([{
          type: 'para',
          runs: [{ text: alt, ...runStyleOf(parent) }],
          style: paraStyleOf(parent),
        }]);
      }
      return out.concat([markForScreenshot(el)]);
    }
    if (tag === 'TEXTAREA' || tag === 'SELECT') {
      return out.concat([formFieldNode(el)]);
    }
    if (tag === 'IFRAME' || tag === 'VIDEO' || tag === 'AUDIO') {
      if (tag === 'VIDEO' || tag === 'AUDIO') {
        try {
          el.pause();
        } catch {
          // Some custom media elements reject scripted playback control.
        }
      }
      return out.concat([embeddedMediaNode(el)]);
    }
    if (tag === 'CANVAS' || tag === 'SVG' || tag === 'svg') {
      if (rect.height > 700) {
        return out.concat(markForScreenshotSlices(el));
      }
      return out.concat([markForScreenshot(el)]);
    }
    // Chart-library mount node (ECharts/Chart.js): the canvas/svg sits inside
    // nested wrappers, often absolutely positioned - walking children would
    // drop it via the absolute-decoration rule. Capture the mount as one image.
    {
      const chartKid = el.querySelector('canvas, svg');
      if (chartKid) {
        const r = el.getBoundingClientRect();
        const cr = chartKid.getBoundingClientRect();
        if (
          r.height > 40 &&
          cr.width >= r.width * 0.7 &&
          cr.height >= r.height * 0.5 &&
          isVisible(chartKid)
        ) {
          if (r.height > 700) {
            return out.concat(markForScreenshotSlices(el));
          }
          return out.concat([markForScreenshot(el)]);
        }
      }
    }
    if (isCheckboxLike(el)) {
      // flex/margin centering of the box inside its parent -> paragraph align
      const r = el.getBoundingClientRect();
      const pr = el.parentElement ? el.parentElement.getBoundingClientRect() : r;
      const offL = r.left - pr.left;
      const offR = pr.right - r.right;
      const style = {};
      if (offL > 8 && offR > 8 && Math.abs(offL - offR) < Math.max(8, offL * 0.4)) {
        style.align = 'center';
      } else if (offL > 12 && offL > offR * 3) {
        style.align = 'right';
      }
      return out.concat([{ ...formFieldNode(el), style }]);
    }
    if (tag === 'INPUT') {
      return out.concat([formFieldNode(el)]);
    }
    {
      const fillIn = fillInLineNode(el);
      if (fillIn && !fillIn.inline) return out.concat([fillIn]);
      const fillBox = fillInBoxNode(el);
      if (fillBox) return out.concat([fillBox]);
    }
    const visibleElementChildren = [...el.children].filter(
      (child) => !SKIP_TAGS.has(child.tagName) && isVisible(child),
    );
    const inlineIconTextRow =
      s.display === 'flex' &&
      (s.flexDirection === 'row' || s.flexDirection === '') &&
      visibleElementChildren.length === 1 &&
      isReplacedTag(visibleElementChildren[0]) &&
      visibleElementChildren[0].getBoundingClientRect().width <= 64 &&
      [...el.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      );
    if (inlineIconTextRow) {
      return out.concat(paraNodesFrom(el));
    }
    if (needsVisualEffectScreenshot(el)) {
      if (rect.height > 1000 && rect.width >= 400) {
        return out.concat(markForScreenshotSlices(el));
      }
      return out.concat([markForScreenshot(el)]);
    }
    const thinRule = thinRuleNode(el);
    if (thinRule) return out.concat([thinRule]);
    if (isPill(el) || isBadgeGrid(el) || isDecorativeLeaf(el)) {
      return out.concat([markForScreenshot(el)]);
    }
    // gradient-painted container: OOXML shading is flat color only, and the
    // text inside is usually styled for the gradient (white on purple) - the
    // whole block must be captured as one image. Tall gradient heroes (cover
    // banners with KPI strips) also qualify: flowing their light-on-gradient
    // text onto a white page makes it unreadable.
    if (s.backgroundImage.includes('gradient') && rect.height <= 1000) {
      // Text-heavy gradient cards (class schedules, content panels) lose
      // all editability as pixels \u2014 let them fall through to the card path,
      // which approximates the gradient with its first color stop and keeps
      // the text native. Text-light decorative fills (fee chips, banners)
      // stay screenshots for fidelity.
      const gradText = (el.innerText || '').trim();
      const gradLines = gradText ? gradText.split('\\n').filter((line) => line.trim()).length : 0;
      const textHeavy = gradLines >= 4 && gradText.length >= 30 && Boolean(bgHex(el));
      if (!textHeavy) {
        if (rect.height > 700) {
          return out.concat(markForScreenshotSlices(el));
        }
        return out.concat([markForScreenshot(el)]);
      }
    }
    // block-level element rendered entirely in monospace -> code block
    if (isMono(s) && hasBlockChildren(el) === false && el.innerText.includes('\\n')) {
      return out.concat(extractCode(el));
    }

    if (isOverlaidInfographic(el)) {
      // A tall section often contains one bounded infographic plus native
      // headings. Rasterizing the parent hides those headings when Word has
      // to paginate the oversized image. Let its children classify instead.
      if (rect.height > 1000) {
        // Continue through the normal container flow below.
      } else if (rect.height > 700) {
        return out.concat(markForScreenshotSlices(el));
      } else {
        return out.concat([markForScreenshot(el)]);
      }
    }

    const gridTable = gridTableRows(el);
    if (gridTable) {
      return out.concat(extractGridTable(el, gridTable, depth));
    }

    const pageColumns = pageColumnParts(el);
    if (pageColumns) {
      const leading = pageColumns.leading.flatMap((child) => processElement(child, depth + 1));
      return out.concat(leading, extractPageColumns(el, depth, pageColumns.columns));
    }

    const cssColumns = depth < 4 ? cssMultiColumnParts(el) : null;
    if (cssColumns) {
      const columnRows = extractCssColumns(el, depth, cssColumns.colCount, cssColumns.colGapPx);
      if (columnRows) return out.concat(columnRows);
    }

    const largeTableGrid = depth < 4 ? largeTableGridRows(el) : null;
    if (largeTableGrid) {
      return out.concat(
        extractGridRows(el, largeTableGrid, depth, {
          screenshotCells: true,
          noSplit: false,
          largeTableGrid: true,
        }),
      );
    }

    const compactWrappedDiagram =
      s.display === 'flex' &&
      s.flexWrap === 'wrap' &&
      el.children.length > 6 &&
      el.getBoundingClientRect().height <= 420 &&
      (el.innerText || '').trim().length <= 500;
    if (compactWrappedDiagram) {
      return out.concat([markForScreenshot(el)]);
    }

    const gridRows = depth < 4 ? gridRowClusters(el) : null;
    if (gridRows) {
      return out.concat(extractGridRows(el, gridRows, depth));
    }

    const boxRow = isBoxRow(el);
    if (boxRow) {
      const rowChildren = [...el.children].filter(
        (child) => !SKIP_TAGS.has(child.tagName) && isVisible(child),
      );
      const compactParallelTextBlocks =
        rowChildren.length >= 2 &&
        rowChildren.length <= 3 &&
        el.getBoundingClientRect().height <= 180 &&
        (parseFloat(s.columnGap) || parseFloat(s.gap) || 0) >= 20 &&
        rowChildren.every(
          (child) =>
            child.children.length >= 2 &&
            (child.innerText || '').trim().length <= 180 &&
            !paintedBgHex(child) &&
            !fullBorderOf(child),
        );
      if (compactParallelTextBlocks) {
        return out.concat([markForScreenshot(el)]);
      }
      // physical left-to-right order regardless of DOM/flex direction (RTL
      // rows arrive in right-to-left DOM order; the geometry math below
      // assumes ascending left edges)
      const kids = [...el.children]
        .filter((c) => !SKIP_TAGS.has(c.tagName) && isVisible(c))
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      // measured geometry: column boundaries at gap midpoints, cell alignment
      // from where the child actually sits inside its column (reproduces
      // justify-content: space-between / center layouts)
      const pr = el.getBoundingClientRect();
      const rects = kids.map((k) => k.getBoundingClientRect());
      const bounds = [pr.left];
      for (let i = 0; i < rects.length - 1; i++) {
        bounds.push((rects[i].right + rects[i + 1].left) / 2);
      }
      bounds.push(pr.right);
      const colWidths = rects.map((r, i) => Math.max(10, Math.round(bounds[i + 1] - bounds[i])));
      const alignOf = (i) => {
        const colW = bounds[i + 1] - bounds[i];
        const offL = rects[i].left - bounds[i];
        const offR = bounds[i + 1] - rects[i].right;
        // child fills its column (flex: 1 etc, or narrower only by the
        // split flex gap): box edges carry no alignment intent, leave inner
        // text-align in charge
        if (rects[i].width >= colW - 16 || offL + offR <= 28) return 'left';
        if (offL <= 8 || offL <= offR / 3) return 'left';
        if (offR <= 8 || offR <= offL / 3) return 'right';
        return 'center';
      };
      const applyAlign = (nodes, align) => {
        if (align === 'left') return nodes;
        for (const n of nodes) {
          if (n.type === 'para' || n.type === 'heading') {
            if (!n.style) n.style = {};
            if (!n.style.align) n.style.align = align;
          } else if (n.type === 'image') {
            n.align = align;
          }
        }
        return nodes;
      };
      const containerTop = borderTopOf(el);
      // Keep white row paint over tinted/gradient backdrops.
      let rowBg = paintedBgHex(el);
      // uniform box border (bordered form fields / cards) -> full cell border
      const cellBorderOf = (c) => {
        const csc = cs(c);
        const w = parseFloat(csc.borderTopWidth);
        if (w < 1 || csc.borderTopStyle === 'none') return null;
        if (parseFloat(csc.borderLeftWidth) < 1 || parseFloat(csc.borderBottomWidth) < 1) return null;
        const color = toHex(csc.borderTopColor);
        return color ? { color, widthPx: w } : null;
      };
      const cells = kids.map((c, i) => {
        const align = alignOf(i);
        // screenshot cells already contain their own paint - no cell shading
        // from the child itself, but the container bar color must still fill
        // the cell area around the image
        if (
          isReplacedTag(c) ||
          isCheckboxLike(c) ||
          isPill(c) ||
          isDecorativeLeaf(c) ||
          isBadgeGrid(c) ||
          isIconGlyph(c) ||
          needsVisualEffectScreenshot(c)
        ) {
          return {
            children: applyAlign(processElement(c, depth + 1), align),
            shading: rowBg,
            borderTop: borderTopOf(c) || containerTop,
          };
        }
        // A bordered/shaded child inside a layout row (for example a Hero
        // side panel) owns its visual height. Keep it as a nested card instead
        // of stretching its paint across the full outer table cell.
        if (isCard(c, depth + 1)) {
          return {
            children: applyAlign(processElement(c, depth + 1), align),
            borderTop: containerTop,
          };
        }
        // nested flex row (logo + name): needs the full classifier
        if (isBoxRow(c)) {
          return {
            children: applyAlign(processElement(c, depth + 1), align),
            // fall back to the container paint: a transparent cell inside a
            // shaded row must not punch a white hole in the bar
            shading: bgHex(c) || rowBg,
            borderTop: borderTopOf(c) || containerTop,
          };
        }
        // An empty underline blank (form-input div) as a direct row cell:
        // the block walk below finds no text and emits an empty cell.
        {
          const cellFillIn = fillInLineNode(c);
          if (cellFillIn && !cellFillIn.inline) {
            return {
              children: [cellFillIn],
              shading: bgHex(c) || rowBg,
              borderTop: borderTopOf(c) || containerTop,
            };
          }
        }
        return {
          children: applyAlign(
            needsBlockWalk(c)
              ? processChildren(c, depth + 1, { decorations: false })
              : paraNodesFrom(c, false),
            align,
          ),
          shading: bgHex(c) || rowBg,
          border: cellBorderOf(c),
          borderTop: borderTopOf(c) || containerTop,
        };
      });
      // align-self: center children (arrows between process steps) center in
      // their cell even when the row itself stretches.
      kids.forEach((c, i) => {
        if (cells[i] && cs(c).alignSelf === 'center') cells[i].vAlign = 'center';
      });
      const gapWidths = rects
        .slice(0, -1)
        .map((rect, i) => Math.max(0, Math.round(rects[i + 1].left - rect.right)));
      const outerGapWidths = [
        Math.max(0, Math.round(rects[0].left - pr.left)),
        Math.max(0, Math.round(pr.right - rects[rects.length - 1].right)),
      ];
      const explicitGaps =
        gapWidths.some((gap) => gap >= 2) || outerGapWidths.some((gap) => gap >= 2);
      const separateCells =
        cells.length > 1 &&
        cells.every((cell) => Boolean(cell.border)) &&
        gapWidths.every((gap) => gap >= 4);
      if (separateCells) {
        for (const cell of cells) {
          for (const child of cell.children || []) {
            if (child.type === 'para' || child.type === 'heading') {
              child.style = { ...child.style, align: 'center' };
            }
          }
        }
      }
      const hasNestedCard = cells.some((cell) =>
        (cell.children || []).some((child) => child.type === 'card'),
      );
      out.push({
        type: 'kpirow',
        cells,
        colWidths,
        // Short labels ("Q10.", "Delivery") wrap mid-word when Word's font
        // metrics run a hair wider than the browser's; give tight cells a
        // little slack so single words never split. CJK glyphs run wider in
        // Word than in Chrome, so scale the slack with the CJK char count.
        itemWidths: rects.map((rect, i) => {
          const text = (kids[i].innerText || '').trim();
          let bonus = 0;
          if (text && !text.includes('\\n')) {
            const cjkCount = (text.match(/[\\u3000-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef]/g) || []).length;
            // Word's font metrics run wider than Chrome's; without slack,
            // short labels shed their last character onto a new line
            // ("2023.08" -> "2023.0 / 8", "RESUME" -> "RESUM / E").
            if (text.length <= 20) bonus = Math.max(10, Math.round(rect.width * 0.05));
            if (/^\\S+[-\u2013]\\S+$/.test(text)) {
              bonus = Math.max(bonus, 15 + Math.round(rect.width * 0.25));
            }
            if (cjkCount >= 2) {
              // CJK glyph width delta grows with font size (28px headings
              // need far more slack than 12px labels)
              const fsz = parseFloat(cs(kids[i]).fontSize) || 14;
              bonus = Math.max(bonus, Math.min(90, Math.round(cjkCount * fsz * 0.25)));
            }
            if (cs(kids[i]).whiteSpace === 'nowrap') {
              // author explicitly forbids wrapping; the docx library exposes
              // no <w:noWrap/>, so buy enough slack for Word's wider metrics
              bonus = Math.max(bonus, 12 + Math.round(rect.width * 0.15));
            }
            // Emails / URLs / phones / long contact lines: Word wraps the last
            // glyph ("\u2026email.co / m", "(555) 456-789 / 0") when the cell is
            // sized to Chrome's metrics; a wrapped footer bar can also get
            // orphaned onto a blank page.
            const hasEmailOrUrl = /@|https?:\\/\\/|\\.(com|net|org|io|email)\\b/i.test(text);
            const hasPhone = /\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}/.test(text);
            const longContact = text.length > 20 && text.length <= 64;
            if (hasEmailOrUrl || hasPhone || longContact) {
              bonus = Math.max(
                bonus,
                18 + Math.round(Math.min(rect.width, 280) * 0.14),
              );
            }
          }
          return Math.round(rect.width) + bonus;
        }),
        gapWidths,
        outerGapWidths,
        explicitGaps: explicitGaps || undefined,
        gapShading: rowBg,
        // row-level paint (accent bar / full border on the row element):
        // deep rows re-materialize as cards from these
        rowBorderLeft: borderLeftOf(el) || undefined,
        rowBorder: cellBorderOf(el) || undefined,
        rowShading: rowBg || undefined,
        separateCells: separateCells || undefined,
        compact: tag === 'NAV' || undefined,
        // Navigation labels may wrap slightly differently in Word; an exact
        // browser row height would clip them. Let Word grow this compact row.
        heightPx:
          tag === 'NAV' || hasNestedCard
            ? undefined
            : Math.round(el.getBoundingClientRect().height),
        padPx: cellPaddingOf(el),
        vAlign: separateCells || s.alignItems === 'center' ? 'center' : undefined,
        spacingBeforePx: Math.max(0, Math.round(parseFloat(s.marginTop) || 0)),
        spacingAfterPx: Math.max(0, Math.round(parseFloat(s.marginBottom) || 0)),
      });
      return out;
    }

    if (isCard(el, depth)) {
      const accent = leftAccentOf(el);
      // mark before walking children so the accent isn't picked up as a float
      if (accent) accent.el.setAttribute('data-h2d-skip', '1');
      const children = needsBlockWalk(el)
        ? processChildren(el, depth + 1, { decorations: false })
        : paraNodesFrom(el, false);
      const before = pseudoBar(el, '::before');
      const after = pseudoBar(el, '::after');
      if (before) children.unshift(before);
      if (after) children.push(after);
      if (accent) {
        // painted strip on the card's left edge -> narrow shaded cell
        const w = el.getBoundingClientRect().width;
        for (const child of children) {
          if (child.style?.indentLeftPx) {
            child.style.indentLeftPx = Math.max(0, child.style.indentLeftPx - accent.widthPx);
          }
        }
        out.push({
          type: 'kpirow',
          cells: [
            { children: [], shading: accent.color },
            { children, shading: paintedBgHex(el) },
          ],
          colWidths: [accent.widthPx, Math.max(10, Math.round(w - accent.widthPx))],
          heightPx: Math.round(el.getBoundingClientRect().height),
          padPx: cellPaddingOf(el),
          spacingBeforePx: Math.max(0, Math.round(parseFloat(s.marginTop) || 0)),
          spacingAfterPx: Math.max(0, Math.round(parseFloat(s.marginBottom) || 0)),
        });
        return out;
      }
      out.push({
        type: 'card',
        children,
        shading: paintedBgHex(el),
        border: fullBorderOf(el),
        borderLeft: borderLeftOf(el),
        borderRight: borderRightOf(el),
        borderTop: borderTopOf(el),
        radiusPx: Math.max(0, Math.round(parseFloat(s.borderTopLeftRadius) || 0)),
        widthPx:
          s.display === 'inline-block'
            ? Math.round(el.getBoundingClientRect().width)
            : undefined,
        // Keep-whole is a page-space budget, not an absolute: >80% of a page
        // can never be protected without stranding most of a page, so it
        // always splits (even over an authored break-inside:avoid); >35%
        // follows print semantics and splits unless the author opted out.
        allowSplit:
          el.getBoundingClientRect().height > 1123 * 0.8 ||
          (el.getBoundingClientRect().height > 1123 * 0.35 && cs(el).breakInside !== 'avoid') ||
          undefined,
        heightPx: Math.round(el.getBoundingClientRect().height),
        padPx: cellPaddingOf(el),
        spacingBeforePx: Math.max(0, Math.round(parseFloat(s.marginTop) || 0)),
        spacingAfterPx: Math.max(0, Math.round(parseFloat(s.marginBottom) || 0)),
      });
      return out;
    }

    // Colored top/bottom rules on flow containers (header { border-top: 5px
    // solid accent }): the container itself never becomes a paragraph or
    // card, so without synthesis the authored rule vanishes.
    const containerRule = (side) => {
      const width = parseFloat(s[side === 'top' ? 'borderTopWidth' : 'borderBottomWidth']);
      const borderStyle = s[side === 'top' ? 'borderTopStyle' : 'borderBottomStyle'];
      const color = toHex(s[side === 'top' ? 'borderTopColor' : 'borderBottomColor']);
      // 1px hairlines are the most common section separator (header rules)
      if (!(width >= 0.8) || borderStyle === 'none' || !color) return null;
      const body = document.body.getBoundingClientRect();
      return {
        type: 'hr',
        color,
        heightPx: Math.min(width, 8),
        widthFrac: body.width > 0 ? Math.min(1, rect.width / body.width) : 1,
        align: 'left',
      };
    };
    if (!needsBlockWalk(el)) {
      const before = pseudoBar(el, '::before');
      const after = pseudoBar(el, '::after');
      const nodes = paraNodesFrom(el);
      if (pseudoBullet(el)) {
        for (const node of nodes) {
          // A colored glyph run is already prepended by pseudoBulletRun and
          // kept literal (makePara preserves colored markers); adding Word
          // numbering on top would double the bullet ("\u2022 \u2022").
          const first = (node.runs || [])[0];
          const firstIsColoredGlyph =
            first &&
            BULLET_GLYPHS.has((first.text || '').trim()) &&
            first.color &&
            first.color !== '000000';
          if (!firstIsColoredGlyph) node.style = { ...node.style, bullet: true };
        }
      }
      return out.concat(before ? [before] : [], nodes, after ? [after] : []);
    }
    {
      const before = pseudoBar(el, '::before');
      const after = pseudoBar(el, '::after');
      const children = processChildren(el, depth);
      // timeline entry (dot + vertical rail drawn as absolute pseudos in the
      // left padding gutter): dot -> colored disc run on the first line;
      // rail -> narrow shaded column (paragraph left borders are ignored by
      // Word/LibreOffice inside table cells, so reuse the accent-strip
      // pattern instead)
      const decor = timelineDecorOf(el);
      const marginBottomPx = Math.max(0, parseFloat(s.marginBottom) || 0);
      const paddingTopPx = Math.max(0, parseFloat(s.paddingTop) || 0);
      const paddingBottomPx = Math.max(0, parseFloat(s.paddingBottom) || 0);
      if (decor) {
        // Nested tables can't split across pages in Word (a whole timeline
        // block gets shoved to the next page), so the rail becomes a
        // paragraph left border. Word/LibreOffice drop paragraph borders in
        // table cells unless the paragraph is indented, hence indentLeftPx.
        const railLeft = Math.max(4, Math.round(decor.railLeftPx ?? 5));
        let firstWithRuns = true;
        for (const child of children) {
          if (child.type !== 'para' && child.type !== 'heading') continue;
          if (decor.rail) {
            child.style = {
              ...child.style,
              borderLeft: { color: decor.rail.color, widthPx: decor.rail.widthPx },
              // indent the text to the authored padding, then push the border
              // back toward the rail's authored offset so wrapped lines keep
              // a consistent gap from the line
              indentLeftPx: Math.max(child.style?.indentLeftPx || 0, Math.round(decor.padL)),
              borderLeftOutsetPx: Math.max(2, Math.round(decor.padL) - railLeft),
            };
          }
          if (firstWithRuns && decor.dot && child.runs?.length) {
            child.runs.unshift({
              text: '\\u25CF ',
              color: decor.dot.color,
              sizePx: decor.dot.sizePx,
            });
            firstWithRuns = false;
          }
        }
      }
      const topRule = isCard(el, depth) ? null : containerRule('top');
      const bottomRule = isCard(el, depth) ? null : containerRule('bottom');
      return out.concat(
        topRule ? [topRule] : [],
        before ? [before] : [],
        paddingTopPx > 2 ? [{ type: 'spacer', px: paddingTopPx }] : [],
        children,
        after ? [after] : [],
        paddingBottomPx > 2 ? [{ type: 'spacer', px: paddingBottomPx }] : [],
        bottomRule ? [bottomRule] : [],
        marginBottomPx > 2 ? [{ type: 'spacer', px: marginBottomPx }] : [],
      );
    }
  }

  // A paragraph whose text starts with a literal bullet glyph (Word-exported
  // HTML fakes lists this way: Symbol-font "\xB7" + nbsp gap) is a real list
  // item \u2014 strip the fake marker and flag it so the generator emits a native
  // Word bullet.
  const BULLET_GLYPHS = new Set(['\xB7', '\u2022', '\u25CF', '\u25A0', '\u25AA', '\u2023', '\u25E6', '\u2219', '\xA7']);
`;

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/core/paragraphs-document.js
var paragraphs_document_default = "  function makePara(runs, style) {\n    const first = runs[0];\n    const marker = first && first.text.trim();\n    if (marker && BULLET_GLYPHS.has(marker)) {\n      if (first.color && first.color !== '000000') {\n        return { type: 'para', runs, style };\n      }\n      let rest = runs.slice(1);\n      // swallow the separator gap right after the marker\n      if (rest.length && !rest[0].text.replace(/[\\s\\u00a0\\t]/g, '')) rest = rest.slice(1);\n      if (rest.length) return { type: 'para', runs: rest, style: { ...style, bullet: true } };\n    }\n    if (first && /^[\xB7\u2022\u25CF\u25AA\u2023\u25E6\u2219]\\s+/.test(first.text)) {\n      if (first.color && first.color !== '000000') {\n        return { type: 'para', runs, style };\n      }\n      const runsCopy = runs.slice();\n      runsCopy[0] = { ...first, text: first.text.replace(/^[\xB7\u2022\u25CF\u25AA\u2023\u25E6\u2219]\\s+/, '') };\n      return { type: 'para', runs: runsCopy, style: { ...style, bullet: true } };\n    }\n    return { type: 'para', runs, style };\n  }\n\n  function makeParaNodes(runs, style) {\n    if (style.align !== 'justify' || !runs.some((run) => (run.text || '').includes('\\n'))) {\n      return [makePara(runs, style)];\n    }\n    const lines = [[]];\n    for (const run of runs) {\n      if (run.inlineImage) {\n        lines[lines.length - 1].push(run);\n        continue;\n      }\n      const parts = (run.text || '').split('\\n');\n      parts.forEach((part, index) => {\n        if (part) lines[lines.length - 1].push({ ...run, text: part });\n        if (index < parts.length - 1) lines.push([]);\n      });\n    }\n    const nonEmptyLines = lines.filter((line) => line.length);\n    if (nonEmptyLines.length <= 1) return [makePara(runs, style)];\n    return nonEmptyLines.map((line, index) => {\n      const lineStyle = { ...style };\n      if (index < nonEmptyLines.length - 1) delete lineStyle.align;\n      if (index > 0) delete lineStyle.spacingBeforePx;\n      if (index < nonEmptyLines.length - 1) delete lineStyle.spacingAfterPx;\n      return makePara(line, lineStyle);\n    });\n  }\n\n  function paraNodesFrom(el, decorations = true) {\n    // A painted display:block span inside a paragraph (scripture-line quote\n    // boxes with border-left + tint) renders as its own bordered block in\n    // the browser \u2014 merging it into the parent's runs loses both the\n    // paragraph break and the decoration. Split the paragraph around it.\n    const paintedBlocks = [...el.children].filter((child) => {\n      if (SKIP_TAGS.has(child.tagName) || !isVisible(child)) return false;\n      const childStyle = cs(child);\n      const painted = Boolean(bgHex(child)) || Boolean(borderLeftOf(child));\n      if (!painted) return false;\n      if (childStyle.display === 'block') return true;\n      // Inline quote box (scripture-line): border/tint + padding wrapping\n      // multiple lines reads as a block quote even at display:inline \u2014\n      // short painted chips stay inline via the single-line guard.\n      if (parseFloat(childStyle.paddingLeft) < 6) return false;\n      if ((child.innerText || '').trim().length < 40) return false;\n      const lineHeight = parseFloat(childStyle.lineHeight) || 20;\n      return child.getBoundingClientRect().height > lineHeight * 1.4;\n    });\n    if (paintedBlocks.length && el.children.length <= 8) {\n      const style = paraStyleOf(el, decorations);\n      const nodes = [];\n      let pending = [];\n      const flushPending = () => {\n        const runs = trimRuns(runsFromNodes(pending, el));\n        pending = [];\n        if (runs.length) nodes.push(...makeParaNodes(runs, { ...style }));\n      };\n      for (const node of el.childNodes) {\n        if (paintedBlocks.includes(node)) {\n          flushPending();\n          const quoteRuns = trimRuns(runsFromNodes([...node.childNodes], node));\n          if (quoteRuns.length) {\n            const quoteStyle = paraStyleOf(node, decorations);\n            const bl = borderLeftOf(node);\n            if (bl) quoteStyle.borderLeft = bl;\n            const shading = bgHex(node);\n            if (shading) quoteStyle.shading = shading;\n            const padLeft = parseFloat(cs(node).paddingLeft) || 0;\n            const marginLeft = parseFloat(cs(node).marginLeft) || 0;\n            if (padLeft + marginLeft > 2) quoteStyle.indentLeftPx = Math.round(padLeft + marginLeft);\n            nodes.push(...makeParaNodes(quoteRuns, quoteStyle));\n          }\n        } else pending.push(node);\n      }\n      flushPending();\n      if (nodes.length) return nodes;\n    }\n    const runs = collectRuns(el);\n    if (!runs.length) return [];\n    if (el.tagName !== 'LI') {\n      const pseudoRun = pseudoBulletRun(el);\n      if (pseudoRun) runs.unshift(pseudoRun);\n    }\n    return makeParaNodes(runs, paraStyleOf(el, decorations));\n  }\n\n  const PHRASING_TAGS = new Set([\n    'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'A', 'CODE', 'SMALL', 'SUB', 'SUP', 'MARK', 'ABBR', 'Q', 'CITE', 'KBD',\n  ]);\n\n  function isInlineNode(node) {\n    if (node.nodeType === Node.TEXT_NODE) return true;\n    if (node.nodeType !== Node.ELEMENT_NODE) return false;\n    if (SKIP_TAGS.has(node.tagName)) return false;\n    if (node.tagName === 'IMG' || node.tagName === 'CANVAS' || node.tagName === 'svg') return false;\n    if (node.tagName === 'IFRAME' || node.tagName === 'VIDEO' || node.tagName === 'AUDIO') return false;\n    if (node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') return false;\n    // checkbox inputs flow inline with their label; other inputs are blocks\n    if (node.tagName === 'INPUT') return isCheckboxLike(node);\n    // Compact circular number badges (30\xD730 inline-flex chips) must go through\n    // processElement for screenshot \u2014 otherwise they flatten to white bars.\n    // Wider tag pills stay inline so wrap/flow is preserved.\n    if (isCompactCircleBadge(node)) return false;\n    const d = cs(node).display;\n    if (\n      d === 'inline-block' &&\n      node.getBoundingClientRect().width >= 120 &&\n      fullBorderOf(node) &&\n      (parseFloat(cs(node).paddingLeft) >= 2 || parseFloat(cs(node).paddingTop) >= 2)\n    ) {\n      return false;\n    }\n    if (d === 'inline' || d.startsWith('inline-') || d === 'contents') return true;\n    // Chrome reports display:block for phrasing elements that are actually\n    // laid out inline (flex containers blockify children; some elements\n    // compute block with no matching rule at all). Trust the geometry: if\n    // the element shares a line with adjacent text, it flows inline.\n    if (PHRASING_TAGS.has(node.tagName) && node.children.length === 0) {\n      const sameLine = (textNode, textEdge) => {\n        try {\n          const range = document.createRange();\n          range.selectNodeContents(textNode);\n          const rects = range.getClientRects();\n          const box = textEdge === 'last' ? rects[rects.length - 1] : rects[0];\n          const r = node.getBoundingClientRect();\n          if (!box) return false;\n          if (textEdge === 'last') return r.top < box.bottom - 2 && r.left >= box.right - 4;\n          return box.top < r.bottom - 2 && box.left >= r.right - 4;\n        } catch (e) {\n          return false;\n        }\n      };\n      const prev = node.previousSibling;\n      if (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent.trim() && sameLine(prev, 'last')) {\n        return true;\n      }\n      const next = node.nextSibling;\n      if (next && next.nodeType === Node.TEXT_NODE && next.textContent.trim() && sameLine(next, 'first')) {\n        return true;\n      }\n    }\n    return false;\n  }\n\n  function attachBookmark(nodes, id) {\n    if (!id) return false;\n    for (const node of nodes) {\n      if (node.type === 'para' || node.type === 'heading') {\n        node.bookmarks = [...new Set([...(node.bookmarks || []), id])];\n        return true;\n      }\n      if (node.type === 'list' && node.items?.length) {\n        const item = node.items[0];\n        item.bookmarks = [...new Set([...(item.bookmarks || []), id])];\n        return true;\n      }\n      if (node.children && attachBookmark(node.children, id)) return true;\n      for (const cell of node.cells || []) {\n        if (cell.children && attachBookmark(cell.children, id)) return true;\n      }\n    }\n    return false;\n  }\n\n  // Walk a block container: consecutive inline siblings merge into one paragraph,\n  // block-level children are classified recursively.\n  function processChildren(el, depth, opts = {}) {\n    const decorations = opts.decorations !== false;\n    const out = [];\n    const containerStyle = cs(el);\n    const singleColumnGrid =\n      containerStyle.display === 'grid' &&\n      containerStyle.gridTemplateColumns.split(' ').filter(Boolean).length === 1;\n    const columnFlex =\n      containerStyle.display === 'flex' &&\n      (containerStyle.flexDirection === 'column' || containerStyle.flexDirection === 'column-reverse');\n    const stackGapPx =\n      singleColumnGrid || columnFlex\n        ? Math.min(\n            120,\n            Math.max(\n              0,\n              parseFloat(containerStyle.rowGap) || parseFloat(containerStyle.gap) || 0,\n            ),\n          )\n        : 0;\n    let emittedGroup = false;\n    let inlineBuffer = [];\n    const appendGroup = (nodes) => {\n      if (!nodes.length) return;\n      if (emittedGroup && stackGapPx > 0) out.push({ type: 'spacer', px: stackGapPx });\n      out.push(...nodes);\n      emittedGroup = true;\n    };\n    const flush = () => {\n      if (!inlineBuffer.length) return;\n      const runs = trimRuns(runsFromNodes(inlineBuffer, el));\n      if (runs.length) appendGroup(makeParaNodes(runs, paraStyleOf(el, decorations)));\n      inlineBuffer = [];\n    };\n    // CSS `order` / *-reverse reorders flex/grid items visually without\n    // touching the DOM: walking childNodes would emit e.g. the photo/content\n    // stack in authored order while the browser shows the reverse. Only\n    // reorder when the author opted in and no bare text is in play.\n    let iterNodes = el.childNodes;\n    if (\n      (containerStyle.display === 'grid' || containerStyle.display === 'flex') &&\n      ([...el.children].some((c) => (parseInt(cs(c).order, 10) || 0) !== 0) ||\n        containerStyle.flexDirection.endsWith('-reverse')) &&\n      [...el.childNodes].every(\n        (n) => n.nodeType !== Node.TEXT_NODE || !n.textContent.trim(),\n      )\n    ) {\n      iterNodes = [...el.children].sort((a, b) => {\n        const ra = a.getBoundingClientRect();\n        const rb = b.getBoundingClientRect();\n        return ra.top - rb.top || (DOC_RTL ? rb.left - ra.left : ra.left - rb.left);\n      });\n    }\n    for (const node of iterNodes) {\n      if (isInlineNode(node)) {\n        // An inline-block that starts on a fresh line below the buffered\n        // content is a visual block (inline-block heading + inline-block\n        // paragraph stacked by wrapping): break the paragraph between them.\n        if (\n          inlineBuffer.length &&\n          node.nodeType === Node.ELEMENT_NODE &&\n          cs(node).display.startsWith('inline-')\n        ) {\n          const r = node.getBoundingClientRect();\n          // skip buffered whitespace-only text nodes to find the last element\n          let prevEl = null;\n          for (let i = inlineBuffer.length - 1; i >= 0; i--) {\n            const b = inlineBuffer[i];\n            if (b.nodeType === Node.TEXT_NODE && !b.textContent.trim()) continue;\n            if (b.nodeType === Node.ELEMENT_NODE) prevEl = b;\n            break;\n          }\n          const pr = prevEl && prevEl.getBoundingClientRect();\n          if (\n            pr &&\n            r.height > 0 &&\n            pr.height > 0 &&\n            r.top >= pr.bottom - 2 &&\n            r.width >= el.getBoundingClientRect().width * 0.4\n          ) {\n            flush();\n            appendGroup(processElement(node, depth));\n            continue;\n          }\n        }\n        inlineBuffer.push(node);\n      } else if (node.nodeType === Node.ELEMENT_NODE) {\n        flush();\n        const children = processElement(node, depth);\n        attachBookmark(children, node.id);\n        appendGroup(children);\n      }\n    }\n    flush();\n    return out;\n  }\n\n  return globalThis.__html2docxPages.build({\n    cs,\n    docRTL: DOC_RTL,\n    isVisible,\n    markForScreenshot,\n    boundedScreenshotSliceCount,\n    maxScreenshotSliceCount: MAX_SCREENSHOT_SLICE_COUNT,\n    nextShotId: () => `h2d-${shotCounter++}`,\n    processChildren,\n    processElement,\n    toHex,\n  });";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/table.js
var table_default = `(function installHtmlTableExtractor(global) {
  function extractTable(el, deps) {
    const {
      bgHex,
      isCompactPaintedLabel,
      bordersOf,
      cellPaddingOf,
      collectRuns,
      cs,
      hasBlockChildren,
      isRTL,
      isVisible,
      markForScreenshot,
      processChildren,
      textAlignOf,
      toHex,
    } = deps;
    // Gradient-painted cells (th { background: linear-gradient(...) }) have a
    // transparent backgroundColor; approximate with the first gradient stop so
    // white header text doesn't land on a white cell.
    const gradHex = (node) => {
      const bgImage = cs(node).backgroundImage;
      if (!bgImage || !bgImage.includes('gradient')) return null;
      const m = bgImage.match(/rgba?\\([^)]*\\)|#[0-9a-fA-F]{3,8}/);
      return m ? toHex(m[0]) : null;
    };
    const cellShading = (cell, tr) => {
      const own = bgHex(cell) || gradHex(cell);
      if (own) return own;
      const behind = bgHex(tr) || gradHex(tr);
      if (!behind) return null;
      // A cell's own opaque paint (even white, which bgHex drops) covers the
      // row color \u2014 without this the row bleeds through and the cell's dark
      // text lands on dark row shading.
      return toHex(cs(cell).backgroundColor) || behind;
    };
    const rows = [];
    const boundarySamples = [];
    const activeSpans = [];
    let gridColumnCount = 0;
    const tableRect = el.getBoundingClientRect();
    const tableRows = [...el.querySelectorAll(
      ':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr',
    )];
    for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
      const tr = tableRows[rowIndex];
      if (!isVisible(tr)) continue;
      const cells = [];
      const rowBorders = bordersOf(tr);
      const occupied = new Set();
      for (const span of activeSpans) {
        if (span.endRow <= rowIndex) continue;
        for (let col = span.gridStart; col < span.gridStart + span.colspan; col++) {
          occupied.add(col);
        }
        cells.push({
          ...span.cell,
          runs: [],
          children: undefined,
          gridStart: span.gridStart,
          verticalMerge: 'continue',
        });
      }
      const directCells = [...tr.children].filter(
        (cell) => cell.tagName === 'TD' || cell.tagName === 'TH',
      );
      const exactVisualRow = directCells.some(
        (cell) => [...cell.children].filter(isCompactPaintedLabel).length >= 2,
      );
      if (exactVisualRow && !activeSpans.some((span) => span.endRow > rowIndex)) {
        const colspan = directCells.reduce((sum, cell) => sum + (cell.colSpan || 1), 0);
        cells.push({
          colspan,
          rowspan: 1,
          gridStart: 0,
          children: [markForScreenshot(tr)],
          borders: {},
          padPx: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        const rect = tr.getBoundingClientRect();
        (boundarySamples[0] ||= []).push(rect.left - tableRect.left);
        (boundarySamples[colspan] ||= []).push(rect.right - tableRect.left);
        gridColumnCount = Math.max(gridColumnCount, colspan);
        rows.push({ cells, heightPx: Math.round(rect.height) });
        continue;
      }
      let nextColumn = 0;
      for (const cell of tr.children) {
        if (cell.tagName !== 'TD' && cell.tagName !== 'TH') continue;
        const colspan = cell.colSpan || 1;
        while (
          [...Array(colspan).keys()].some((offset) => occupied.has(nextColumn + offset))
        ) {
          nextColumn++;
        }
        const rowspan = cell.rowSpan || 1;
        const entry = {
          colspan,
          rowspan,
          gridStart: nextColumn,
          verticalMerge: rowspan > 1 ? 'restart' : undefined,
          shading: cellShading(cell, tr),
          bold: cell.tagName === 'TH' || undefined,
          borders: bordersOf(cell) || rowBorders,
          padPx: cellPaddingOf(cell),
          rtl: isRTL(cell) || undefined,
        };
        const textAlign = textAlignOf(cell);
        if (textAlign === 'center' || textAlign === 'right') entry.align = textAlign;
        const verticalAlign = cs(cell).verticalAlign;
        if (verticalAlign === 'middle') entry.vAlign = 'center';
        else if (verticalAlign === 'bottom') entry.vAlign = 'bottom';
        // decorations: false - the cell entry already owns border/shading;
        // paragraphs merged from the cell's inline children must not inherit
        // the td's border as a paragraph border (drew stray lines inside cells)
        if (hasBlockChildren(cell)) {
          entry.children = processChildren(cell, 2, { decorations: false });
        }
        else {
          entry.runs = collectRuns(cell);
          // CJK cell text: with no explicit line height Word applies the CJK
          // font's own leading (Yu Mincho \u22481.7x) \u2014 uncapped, invoice rows
          // balloon and push a one-page layout onto a second page. Pin the
          // browser's line box; skip tight leadings that EXACT would clip.
          const lineHeightPx = parseFloat(cs(cell).lineHeight);
          const fontSizePx = parseFloat(cs(cell).fontSize);
          const hasCJK = (entry.runs || []).some((run) =>
            /[\\u3000-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef]/.test(run.text || ''),
          );
          if (hasCJK && lineHeightPx && fontSizePx && lineHeightPx / fontSizePx >= 1.3) {
            entry.style = { ...entry.style, cjk: true, exactLineHeightPx: lineHeightPx };
          }
        }
        // Empty cell showing placeholder text via ::before content
        // ("Click to edit..." on contenteditable template cells): keep the
        // rendered placeholder so the grid doesn't collapse into blank space.
        if (!entry.children && !(entry.runs || []).length) {
          const pseudo = getComputedStyle(cell, '::before');
          const m = (pseudo.content || '').match(/^"(.*)"$/);
          if (m && m[1].trim()) {
            const run = { text: m[1], color: toHex(pseudo.color) || '999999' };
            if (pseudo.fontStyle === 'italic') run.italic = true;
            const sz = parseFloat(pseudo.fontSize);
            if (sz) run.sizePx = sz;
            entry.runs = [run];
          }
        }
        // Short cell content ("Wave 1" pills, "11." numbers): record the
        // forced single-line width (nowrap min-content, works even when the
        // browser already crushed the column) so the generator can guarantee
        // the column never wraps it letter-by-letter into a fake vertical
        // stack.
        {
          const cellText = (cell.innerText || '').trim();
          if (cellText && cellText.length <= 40 && !cellText.includes('\\n')) {
            // nowrap + Range: the true single-line CONTENT width. Plain
            // scrollWidth reports the stretched layout width for uncrushed
            // cells, which would inflate every column's floor equally.
            // inner width BEFORE forcing nowrap \u2014 nowrap reflows the auto
            // table layout and stretches the cell to fit the text
            const pad = cellPaddingOf(cell);
            const innerWidth =
              cell.getBoundingClientRect().width - (pad.left || 0) - (pad.right || 0);
            const previousWhiteSpace = cell.style.whiteSpace;
            cell.style.whiteSpace = 'nowrap';
            try {
              const range = document.createRange();
              range.selectNodeContents(cell);
              let textWidth = range.getBoundingClientRect().width;
              // Only short label-like content that the browser itself renders
              // on one line gets a keep-on-one-line floor. A cell the browser
              // already wrapped must be allowed to wrap in Word too \u2014 floors
              // from wrapped cells starve the remaining columns (a 5-column
              // table's last column collapsed to 600 twips).
              if (textWidth > 0 && textWidth <= 160 && textWidth <= innerWidth + 2) {
                // Word's substituted font may run much wider than the webfont.
                const wordWidth = window.__h2dWordFontLineWidth
                  ? window.__h2dWordFontLineWidth(cell)
                  : 0;
                entry.oneLineWidthPx = Math.round(Math.max(textWidth, wordWidth));
              }
            } catch (e) {
              /* leave unset */
            }
            cell.style.whiteSpace = previousWhiteSpace || '';
          }
        }
        cells.push(entry);
        const rect = cell.getBoundingClientRect();
        const startPx = isRTL(el) ? tableRect.right - rect.right : rect.left - tableRect.left;
        const endPx = isRTL(el) ? tableRect.right - rect.left : rect.right - tableRect.left;
        (boundarySamples[nextColumn] ||= []).push(startPx);
        (boundarySamples[nextColumn + colspan] ||= []).push(endPx);
        if (rowspan > 1) {
          activeSpans.push({
            gridStart: nextColumn,
            colspan,
            endRow: rowIndex + rowspan,
            cell: {
              colspan,
              shading: entry.shading,
              borders: entry.borders,
              padPx: entry.padPx,
              rtl: entry.rtl,
              align: entry.align,
              vAlign: entry.vAlign,
            },
          });
          for (let col = nextColumn; col < nextColumn + colspan; col++) occupied.add(col);
        }
        nextColumn += colspan;
      }
      if (!cells.length) continue;
      cells.sort((a, b) => a.gridStart - b.gridStart);
      gridColumnCount = Math.max(
        gridColumnCount,
        ...cells.map((cell) => cell.gridStart + (cell.colspan || 1)),
      );
      const renderedHeight = Math.round(tr.getBoundingClientRect().height);
      const rowText = (tr.innerText || '').trim();
      // Only a real header row repeats across pages: flagging plain first
      // rows duplicates a data row at every page break.
      const isHeaderRow =
        tr.parentElement?.tagName === 'THEAD' ||
        (directCells.length > 0 && directCells.every((cell) => cell.tagName === 'TH'));
      rows.push({
        cells,
        header: isHeaderRow || undefined,
        rawHeightPx: renderedHeight,
        // Compact text rows should use Word's natural height. Keeping the
        // browser's measured minimum double-counts small font-metric/padding
        // differences and makes ordinary data tables visibly too loose.
        heightPx:
          renderedHeight >= 80 || (renderedHeight >= 30 && !rowText)
            ? renderedHeight
            : undefined,
      });
    }
    if (!rows.length) return [];
    // Uniform form grid (fill-in sheets sized for handwriting): the author
    // gave every body row the same generous height. Preserving it only on
    // the EMPTY rows (rule above) makes filled rows collapse to text height
    // and the grid uneven \u2014 carry the shared height to all of them.
    {
      const body = rows.slice(1);
      const heights = body.map((row) => row.rawHeightPx);
      if (
        body.length >= 4 &&
        Math.min(...heights) >= 32 &&
        Math.max(...heights) - Math.min(...heights) <= 4
      ) {
        for (const row of body) row.heightPx = row.rawHeightPx;
      }
      for (const row of rows) delete row.rawHeightPx;
    }
    const boundaries = Array(gridColumnCount + 1).fill(null);
    boundaries[0] = 0;
    boundaries[gridColumnCount] = tableRect.width;
    for (let index = 1; index < gridColumnCount; index++) {
      const samples = boundarySamples[index];
      if (samples?.length) {
        const sorted = [...samples].sort((a, b) => a - b);
        boundaries[index] = sorted[Math.floor(sorted.length / 2)];
      }
    }
    let previousKnown = 0;
    for (let index = 1; index <= gridColumnCount; index++) {
      if (boundaries[index] == null) continue;
      const span = index - previousKnown;
      const start = boundaries[previousKnown];
      const end = boundaries[index];
      for (let fill = 1; fill < span; fill++) {
        boundaries[previousKnown + fill] = start + ((end - start) * fill) / span;
      }
      previousKnown = index;
    }
    const colWidths = boundaries
      .slice(0, -1)
      .map((start, index) => Math.max(1, Math.round(boundaries[index + 1] - start)));
    return [{
      type: 'table',
      rows,
      colWidths,
      outerBorder: bordersOf(el),
      shading: bgHex(el),
      preserveRowHeights: true,
      // rendered height drives the keep-together call: a table that fits on
      // one page should jump to the next page whole instead of splitting
      heightPx: Math.round(tableRect.height),
      rtl: isRTL(el) || undefined,
    }];
  }

  global.__html2docxTable = { extractTable };
})(globalThis);
`;

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/forms-media.js
var forms_media_default = `(function installFormsAndMediaExtractor(global) {
  // Empty block/inline with only a bottom border is a fill-in underline
  // (consent forms, contract blanks). Without this they collapse away.
  function fillInLineNode(el, deps) {
    const { bordersOf, cs } = deps;
    if ((el.innerText || '').trim() || el.children.length) return null;
    const borders = bordersOf(el);
    // A signature rule drawn as border-top on a zero-height div is the same
    // fill-in line as a border-bottom one.
    const line =
      borders?.bottom && !borders.top && !borders.left && !borders.right
        ? borders.bottom
        : borders?.top && !borders.bottom && !borders.left && !borders.right
          ? borders.top
          : null;
    if (!line) return null;
    const rect = el.getBoundingClientRect();
    const style = cs(el);
    const display = style.display;
    const inline = display === 'inline' || display.startsWith('inline-');
    // Empty inline blanks often report ~1px height (border only) while
    // min-width still reserves the fill-in gap in the line.
    const minWidth = parseFloat(style.minWidth) || 0;
    const width = Math.max(rect.width, minWidth);
    if (inline) {
      if (width < 24 || width > 480 || rect.height > 40) return null;
    } else if (width < 40 || rect.height > 48) {
      return null;
    }
    return {
      type: 'formfield',
      mode: 'line',
      controlType: 'text',
      width: Math.round(width),
      height: Math.round(Math.max(rect.height, 16)),
      runs: [],
      borders: { bottom: line },
      inline,
    };
  }

  // Empty fully-bordered writing area (form answer boxes with min-height).
  // These are not checkboxes and must keep their authored height.
  function fillInBoxNode(el, deps) {
    const { bordersOf, cs, toHex, paintedBgHex, runStyleOf } = deps;
    if ((el.innerText || '').trim() || el.children.length) return null;
    const borders = bordersOf(el);
    if (!borders?.top || !borders?.bottom || !borders?.left || !borders?.right) {
      return null;
    }
    const style = cs(el);
    const rect = el.getBoundingClientRect();
    // An image container is not a fill-in blank: a div painted by
    // background-image (even one whose URL now 404s and shows only the
    // border ring) or shaped as a circle must stay on the screenshot path \u2014
    // as a formfield it rendered an opaque white box over the title.
    if ((style.backgroundImage || '').includes('url(')) return null;
    const radius = String(style.borderTopLeftRadius || '');
    const radiusValue = parseFloat(radius) || 0;
    // computed border-radius keeps authored percentages ("50%") as-is
    const circle = radius.includes('%')
      ? radiusValue >= 40
      : radiusValue >= Math.min(rect.width, rect.height) * 0.4;
    if (circle) return null;
    const minH = parseFloat(style.minHeight) || 0;
    const height = Math.max(rect.height, minH);
    if (height < 28 || rect.width < 48) return null;
    // checkbox-sized squares stay on the checkbox path
    if (rect.width <= 32 && height <= 32) return null;
    const rawBg = toHex(style.backgroundColor);
    // contenteditable answer boxes show their hint via
    // :empty::before { content: attr(data-placeholder) } \u2014 resolve it so
    // the box isn't exported empty
    let placeholder = '';
    const pseudo = getComputedStyle(el, '::before');
    const pseudoContent = pseudo?.content || '';
    const attrRef = pseudoContent.match(/attr\\(([-\\w]+)\\)/);
    if (attrRef) placeholder = el.getAttribute(attrRef[1]) || '';
    else if (pseudoContent && pseudoContent !== 'none' && pseudoContent !== 'normal') {
      placeholder = pseudoContent.replace(/^["']|["']$/g, '');
    }
    const placeholderColor = placeholder && pseudo ? toHex(pseudo.color) : null;
    return {
      type: 'formfield',
      mode: 'box',
      controlType: 'multiline',
      width: Math.round(rect.width),
      height: Math.round(height),
      value: placeholder || undefined,
      valueColor: placeholderColor || undefined,
      runs: placeholder
        ? [{
            text: placeholder,
            ...(runStyleOf ? runStyleOf(el) : {}),
            ...(placeholderColor ? { color: placeholderColor } : {}),
          }]
        : [],
      borders,
      shading: (paintedBgHex && paintedBgHex(el)) || rawBg || 'FFFFFF',
    };
  }

  function formFieldNode(el, deps) {
    const { bgHex, bordersOf, cellPaddingOf, cs, runStyleOf } = deps;
    const rect = el.getBoundingClientRect();
    cs(el);
    const value = el.value || el.getAttribute('placeholder') || '';
    const inputType = (el.getAttribute('type') || 'text').toLowerCase();
    const controlType =
      el.tagName === 'SELECT'
        ? 'dropdown'
        : el.tagName === 'TEXTAREA'
          ? 'multiline'
          : inputType === 'checkbox'
            ? 'checkbox'
            : inputType === 'radio'
              ? 'radio'
              : 'text';
    const borders = bordersOf(el);
    const hasOnlyBottomBorder =
      borders &&
      borders.bottom &&
      !borders.top &&
      !borders.left &&
      !borders.right;
    return {
      type: 'formfield',
      mode: hasOnlyBottomBorder ? 'line' : 'box',
      controlType,
      name: el.name || el.id || undefined,
      alias: el.getAttribute('aria-label') || el.name || el.id || undefined,
      value,
      checked: Boolean(el.checked),
      options:
        el.tagName === 'SELECT'
          ? [...el.options].map((option) => ({
              value: option.value,
              label: option.textContent || option.value,
              selected: option.selected,
            }))
          : undefined,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      runs: value ? [{ text: value, ...runStyleOf(el) }] : [],
      borders,
      shading: bgHex(el),
      padPx: cellPaddingOf(el),
    };
  }

  function embeddedMediaNode(el, { markForScreenshot }) {
    const rawHref =
      el.tagName === 'IFRAME'
        ? el.src
        : el.tagName === 'VIDEO' || el.tagName === 'AUDIO'
          ? el.currentSrc || el.src
          : '';
    const href = /^https?:/i.test(rawHref || '') ? rawHref : undefined;
    return {
      ...markForScreenshot(el),
      mediaType: el.tagName.toLowerCase(),
      href,
      fallbackText:
        el.getAttribute('title') ||
        el.getAttribute('aria-label') ||
        \`\${el.tagName === 'IFRAME' ? 'Embedded content' : el.tagName === 'VIDEO' ? 'Video' : 'Audio'}\`,
    };
  }

  global.__html2docxFormsMedia = {
    embeddedMediaNode,
    fillInBoxNode,
    fillInLineNode,
    formFieldNode,
  };
})(globalThis);
`;

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/visual-effects.js
var visual_effects_default = "(function installVisualEffectClassifier(global) {\n  function needsScreenshot(el, deps) {\n    const { bgHex, cs, fullBorderOf } = deps;\n    // A broken image's rendered box is Chrome's placeholder chrome (icon +\n    // clipped alt text), never the author's design \u2014 even when transformed\n    // or shadowed, let the IMG branch fall back to alt text instead.\n    if (el.tagName === 'IMG' && (!el.complete || el.naturalWidth === 0)) return false;\n    const style = cs(el);\n    const rect = el.getBoundingClientRect();\n    if (rect.width < 20 || rect.height < 12 || rect.width > 1000 || rect.height > 1000) {\n      return false;\n    }\n    const transformed = style.transform && style.transform !== 'none';\n    const shadowed = style.boxShadow && style.boxShadow !== 'none';\n    const filtered =\n      (style.filter && style.filter !== 'none') ||\n      (style.backdropFilter && style.backdropFilter !== 'none');\n    const radii = [\n      style.borderTopLeftRadius,\n      style.borderTopRightRadius,\n      style.borderBottomRightRadius,\n      style.borderBottomLeftRadius,\n    ].map((value) => parseFloat(value) || 0);\n    const complexRadius =\n      Math.max(...radii) >= 8 &&\n      (Boolean(bgHex(el)) || Boolean(fullBorderOf(el))) &&\n      (new Set(radii.map((radius) => Math.round(radius))).size > 1 ||\n        style.overflow === 'hidden' ||\n        Math.max(...radii) >= Math.min(rect.width, rect.height) * 0.25);\n    // Text-heavy cards must stay editable/searchable: soft shadows, filters\n    // and rounded corners are not worth rasterizing paragraphs of content.\n    // Transforms still rasterize (flowed text would land in the wrong place).\n    // CJK counts double: a 60-char Japanese question carries as much content\n    // as a 120-char English sentence.\n    const text = (el.innerText || '').trim();\n    const cjkCount = (text.match(/[\\u3000-\\u9fff\\uf900-\\ufaff\\uff66-\\uff9f]/g) || []).length;\n    const weightedTextLength = text.length + cjkCount;\n    // Many short lines (schedule cards, subject lists) are as content-heavy\n    // as long prose \\u2014 a 5-day timetable trapped in pixels is uneditable.\n    const lineCount = text ? text.split('\\n').filter((line) => line.trim()).length : 0;\n    const textHeavy = weightedTextLength > 80 || (lineCount >= 4 && text.length >= 30);\n    const compactRoundedCard =\n      complexRadius && rect.height <= 160 && weightedTextLength <= 200 && lineCount < 4;\n    return Boolean(\n      transformed ||\n      ((shadowed || filtered || complexRadius) && (!textHeavy || compactRoundedCard)),\n    );\n  }\n\n  global.__html2docxVisualEffects = { needsScreenshot };\n})(globalThis);\n";

// raw:/workspace/scratch/0d433941ca14/iter012-work/muyun-ai/vendor/genoffice-html2docx/src/browser/pages.js
var pages_default = "(function installPageExtractor(global) {\n  function build(deps) {\n    const {\n      cs,\n      docRTL,\n      isVisible,\n      markForScreenshot,\n      boundedScreenshotSliceCount,\n      maxScreenshotSliceCount,\n      nextShotId,\n      processChildren,\n      processElement,\n      toHex,\n    } = deps;\n    const rootBodyStyle = cs(document.body);\n    const absoluteRootChildren = [...document.body.children].filter(\n      (child) => isVisible(child) && cs(child).position === 'absolute',\n    );\n    const bodyHeight = document.body.getBoundingClientRect().height;\n    const visibleBodyChildren = [...document.body.children].filter(isVisible);\n    const authoredPageRoots = visibleBodyChildren.filter(\n      (child) => child.hasAttribute('data-docx-page') || child.hasAttribute('data-page'),\n    );\n    const inferredPageRoots = visibleBodyChildren.filter((child) => {\n      if (authoredPageRoots.includes(child)) return false;\n      if (!isVisible(child)) return false;\n      const style = cs(child);\n      const rect = child.getBoundingClientRect();\n      return (\n        (style.breakAfter === 'page' || style.pageBreakAfter === 'always') &&\n        rect.width >= 300 &&\n        rect.height >= 400\n      );\n    });\n    const multiPageComposition = authoredPageRoots.length >= 2;\n    const mixedPageComposition = !multiPageComposition && inferredPageRoots.length >= 2;\n    const renderedPageHeight = window.innerHeight;\n    // Fixed-composition slide pages: page-sized relative sections whose\n    // direct children are absolutely positioned (coordinate layouts authored\n    // without data-docx-page). Flow classification drops the positioned\n    // content entirely, so rasterize each page like authored pages.\n    const slidePageRoots = visibleBodyChildren.filter((child) => {\n      if (authoredPageRoots.includes(child)) return false;\n      const style = cs(child);\n      if (style.position !== 'relative' && style.position !== 'absolute') return false;\n      const rect = child.getBoundingClientRect();\n      if (Math.abs(rect.height - renderedPageHeight) > renderedPageHeight * 0.08) return false;\n      if (rect.width < window.innerWidth * 0.8) return false;\n      const absoluteKids = [...child.children].filter(\n        (kid) => isVisible(kid) && cs(kid).position === 'absolute',\n      );\n      return absoluteKids.length >= 2 && (child.innerText || '').trim().length >= 20;\n    });\n    const slidePageComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      slidePageRoots.length >= 2 &&\n      slidePageRoots.length >= visibleBodyChildren.length - 1;\n    const multiPageAbsoluteComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      bodyHeight > renderedPageHeight &&\n      bodyHeight <= renderedPageHeight * 10 &&\n      absoluteRootChildren.some(\n        (child) => child.getBoundingClientRect().top >= renderedPageHeight - 2,\n      );\n    const activePageView = [...document.body.children].find(\n      (child) =>\n        isVisible(child) &&\n        child.classList.contains('page-view') &&\n        child.classList.contains('active-page'),\n    );\n    const fixedNavigation = [...document.body.children].some((child) => {\n      if (!isVisible(child)) return false;\n      const style = cs(child);\n      return (\n        (child.tagName === 'NAV' || child.tagName === 'HEADER') &&\n        (style.position === 'fixed' || style.position === 'sticky')\n      );\n    });\n    const webPageComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      !multiPageAbsoluteComposition &&\n      Boolean(activePageView) &&\n      fixedNavigation &&\n      bodyHeight > renderedPageHeight &&\n      activePageView.querySelector('img') &&\n      activePageView.querySelector('.container, .row, [class*=\"grid\"]');\n    const pageComposition =\n      (rootBodyStyle.position === 'relative' || rootBodyStyle.position === 'absolute') &&\n      rootBodyStyle.overflow === 'hidden' &&\n      bodyHeight >= 700 &&\n      bodyHeight <= 1600 &&\n      absoluteRootChildren.length >= 3 &&\n      (document.body.innerText || '').trim().length >= 20;\n    const singleVisualPageRoot = visibleBodyChildren.length === 1 ? visibleBodyChildren[0] : null;\n    const singleVisualPageRect = singleVisualPageRoot?.getBoundingClientRect();\n    const singleVisualPageStyle = singleVisualPageRoot ? cs(singleVisualPageRoot) : null;\n    const singleVisualPagePaint =\n      singleVisualPageStyle &&\n      (singleVisualPageStyle.backgroundImage !== 'none' ||\n        Boolean(toHex(singleVisualPageStyle.backgroundColor, { dropWhite: true })));\n    const singleVisualPageLayout = singleVisualPageRoot\n      ? [...singleVisualPageRoot.querySelectorAll('*')].some((element) => {\n          const style = cs(element);\n          return (\n            (style.display === 'grid' && style.gridTemplateColumns.split(' ').length >= 2) ||\n            (style.display === 'flex' &&\n              (style.flexDirection === 'row' || style.flexDirection === ''))\n          );\n        })\n      : false;\n    const flowingVisualComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      !multiPageAbsoluteComposition &&\n      !webPageComposition &&\n      !pageComposition &&\n      Boolean(singleVisualPageRoot) &&\n      singleVisualPageStyle.position === 'relative' &&\n      (singleVisualPageStyle.overflow === 'hidden' ||\n        singleVisualPageStyle.overflow === 'clip') &&\n      singleVisualPagePaint &&\n      singleVisualPageLayout &&\n      singleVisualPageRect.width >= window.innerWidth * 0.7 &&\n      singleVisualPageRect.height > renderedPageHeight * 1.05 &&\n      singleVisualPageRect.height <= renderedPageHeight * 3 &&\n      (singleVisualPageRoot.innerText || '').trim().length >= 20;\n    const singlePageVisualComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      !multiPageAbsoluteComposition &&\n      !webPageComposition &&\n      !pageComposition &&\n      !flowingVisualComposition &&\n      Boolean(singleVisualPageRoot) &&\n      (singleVisualPageStyle.position === 'relative' ||\n        singleVisualPageStyle.position === 'absolute') &&\n      (singleVisualPageStyle.overflow === 'hidden' ||\n        singleVisualPageStyle.overflow === 'clip') &&\n      singleVisualPagePaint &&\n      singleVisualPageRect.width >= window.innerWidth * 0.7 &&\n      singleVisualPageRect.height >= renderedPageHeight * 0.7 &&\n      singleVisualPageRect.height <= renderedPageHeight * 1.35 &&\n      (singleVisualPageRoot.innerText || '').trim().length >= 20;\n    const bodySinglePageVisualComposition =\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      !multiPageAbsoluteComposition &&\n      !webPageComposition &&\n      !pageComposition &&\n      !singlePageVisualComposition &&\n      rootBodyStyle.position === 'relative' &&\n      rootBodyStyle.backgroundImage !== 'none' &&\n      rootBodyStyle.maxWidth !== 'none' &&\n      visibleBodyChildren.length >= 2 &&\n      visibleBodyChildren.length <= 5 &&\n      bodyHeight >= renderedPageHeight * 0.7 &&\n      bodyHeight <= renderedPageHeight * 1.35 &&\n      (document.body.innerText || '').trim().length >= 20;\n    const bodyRect = document.body.getBoundingClientRect();\n    // Word (Mac) insets the first line ~26px below the page top even at zero\n    // margins, so a slice scaled to the full content height loses its bottom\n    // rows to the page edge. Budget slices below the page height so the\n    // width-driven scale governs every slice (uniform scale across pages)\n    // and Word never clips a pixel row. Matches the 45px renderer headroom:\n    // 1 - 45/1123.\n    const sliceBudget = Math.round(renderedPageHeight * 0.96);\n    // Bands (y ranges relative to body top) a slice boundary must not cross:\n    // text lines and replaced elements always; painted card boxes when small\n    // enough to move to the next page whole.\n    const collectCutBands = () => {\n      const lineBands = [];\n      const boxBands = [];\n      const push = (bands, rect) => {\n        if (rect.height > 0 && rect.width > 0) {\n          bands.push({ top: rect.top - bodyRect.top, bottom: rect.bottom - bodyRect.top });\n        }\n      };\n      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);\n      while (walker.nextNode()) {\n        const textNode = walker.currentNode;\n        if (!textNode.textContent.trim()) continue;\n        const range = document.createRange();\n        range.selectNodeContents(textNode);\n        for (const rect of range.getClientRects()) push(lineBands, rect);\n      }\n      for (const element of document.body.querySelectorAll('*')) {\n        if (!isVisible(element)) continue;\n        const rect = element.getBoundingClientRect();\n        if (rect.height <= 0 || rect.width <= 0) continue;\n        if (\n          element.matches('img, svg, canvas, video, iframe, input, textarea, select, button')\n        ) {\n          push(lineBands, rect);\n          continue;\n        }\n        if (rect.height < 40 || rect.height > sliceBudget * 0.9) continue;\n        const style = cs(element);\n        // dropWhite:false \u2014 an explicit white card on a tinted page is still\n        // a visual card whose rows must not be split across pages.\n        const painted =\n          style.backgroundImage !== 'none' ||\n          style.boxShadow !== 'none' ||\n          Boolean(toHex(style.backgroundColor, { dropWhite: false })) ||\n          parseFloat(style.borderTopWidth) > 0 ||\n          parseFloat(style.borderBottomWidth) > 0;\n        if (painted) push(boxBands, rect);\n      }\n      return { lineBands, boxBands };\n    };\n    const chooseCut = (ideal, minCut, bands) => {\n      const clearance = 3;\n      for (let y = ideal; y >= minCut; y -= 2) {\n        const blocked = bands.some(\n          (band) => band.top < y + clearance && band.bottom > y - clearance,\n        );\n        if (!blocked) return y;\n      }\n      return null;\n    };\n    const sliceBoundaries = () => {\n      if (boundedScreenshotSliceCount(bodyHeight, sliceBudget) === 0) return [];\n      // A composition only slightly taller than one page reads as a\n      // single-page design (e.g. a resume): render one full slice and let\n      // the renderer's page scale absorb the few percent, instead of\n      // stranding a couple of lines on a second page.\n      if (bodyHeight <= sliceBudget * 1.12) return [Math.round(bodyHeight)];\n      const { lineBands, boxBands } = collectCutBands();\n      const allBands = [...lineBands, ...boxBands];\n      const boundaries = [];\n      let cursor = 0;\n      while (bodyHeight - cursor > sliceBudget) {\n        // The slice cap bounds hostile heights: keep the page top and drop the\n        // tail instead of the whole composition.\n        if (boundaries.length >= maxScreenshotSliceCount - 1) {\n          boundaries.push(cursor + sliceBudget);\n          return boundaries;\n        }\n        const ideal = cursor + sliceBudget;\n        const minCut = cursor + Math.round(sliceBudget * 0.6);\n        // Whole cards move to the next page when a gap exists; otherwise cut\n        // between text lines inside the card; otherwise hard-cut.\n        const cut =\n          chooseCut(ideal, minCut, allBands) ??\n          chooseCut(ideal, minCut, lineBands) ??\n          ideal;\n        boundaries.push(cut);\n        cursor = cut;\n      }\n      boundaries.push(Math.round(bodyHeight));\n      // Trailing sliver: absorb a short final slice into the previous page\n      // when the merged slice still fits with a small page-scale shrink.\n      if (boundaries.length >= 2) {\n        const previousStart = boundaries.length >= 3 ? boundaries[boundaries.length - 3] : 0;\n        const lastStart = boundaries[boundaries.length - 2];\n        if (\n          bodyHeight - lastStart <= sliceBudget * 0.25 &&\n          bodyHeight - previousStart <= sliceBudget * 1.12\n        ) {\n          boundaries.splice(boundaries.length - 2, 1);\n        }\n      }\n      return boundaries;\n    };\n    const screenshotPageSlices = ({ authoredPageHeights = false } = {}) => {\n      const sliceCount = authoredPageHeights\n        ? boundedScreenshotSliceCount(bodyHeight, renderedPageHeight)\n        : boundedScreenshotSliceCount(bodyHeight, sliceBudget);\n      if (sliceCount === 0) return [];\n      // Absolutely-positioned multi-page canvases are authored in exact\n      // viewport-height pages: gap-aware cuts would shift authored page\n      // boundaries, so slice at the authored pitch and let the renderer\n      // headroom shrink each page to fit.\n      const boundaries = authoredPageHeights\n        ? Array.from(\n            { length: sliceCount },\n            (_, index) => Math.min(bodyHeight, (index + 1) * renderedPageHeight),\n          )\n        : sliceBoundaries();\n      // Decorative absolutes bleeding past the body's box (half-out hero\n      // circles) get flat-cut by a body-width clip. Extend the horizontal\n      // extent to overhanging descendants that still touch the body band \u2014\n      // capped so parked off-screen decorations (left/right: -10000px)\n      // never drag the clip away.\n      let paintLeft = bodyRect.left;\n      let paintRight = bodyRect.right;\n      const maxBleed = 200;\n      for (const d of document.body.querySelectorAll('*')) {\n        const dr = d.getBoundingClientRect();\n        if (!dr.width || !dr.height) continue;\n        if (dr.right <= bodyRect.left - maxBleed || dr.left >= bodyRect.right + maxBleed) continue;\n        if (dr.left < paintLeft) paintLeft = Math.max(dr.left, bodyRect.left - maxBleed);\n        if (dr.right > paintRight) paintRight = Math.min(dr.right, bodyRect.right + maxBleed);\n      }\n      paintLeft = Math.max(0, Math.round(paintLeft));\n      const paintWidth = Math.round(paintRight - paintLeft);\n      if (!Number.isFinite(paintWidth) || paintWidth <= 0) return [];\n      let previousBoundary = 0;\n      return boundaries.map((boundary) => {\n        const sliceHeight = Math.round(boundary - previousBoundary);\n        const sliceTop = previousBoundary;\n        previousBoundary = boundary;\n        return {\n          type: 'image',\n          shotId: nextShotId(),\n          width: paintWidth,\n          height: sliceHeight,\n          align: 'center',\n          pageComposition: true,\n          capturesDocumentText: true,\n          clip: {\n            x: paintLeft,\n            y: Math.max(0, Math.round(bodyRect.top + sliceTop)),\n            width: paintWidth,\n            height: sliceHeight,\n          },\n        };\n      });\n    };\n    const buildMixedPageIr = () => {\n      const output = [];\n      const pageRoots = new Set(inferredPageRoots);\n      let pendingPageBreak = false;\n      let previousPageRootFillsPage = false;\n      const append = (nodes) => {\n        for (const node of nodes) {\n          if (\n            node.type === 'pagebreak' &&\n            (!output.length || output[output.length - 1].type === 'pagebreak')\n          ) {\n            continue;\n          }\n          output.push(node);\n        }\n      };\n      for (const child of visibleBodyChildren) {\n        const style = cs(child);\n        const isPageRoot = pageRoots.has(child);\n        const breaksBefore =\n          style.breakBefore === 'page' || style.pageBreakBefore === 'always';\n        const naturalPageAdvance = pendingPageBreak && previousPageRootFillsPage;\n        if (\n          !naturalPageAdvance &&\n          (pendingPageBreak || (isPageRoot && breaksBefore)) &&\n          output.length\n        ) {\n          append([{ type: 'pagebreak' }]);\n        }\n        const nodes = isPageRoot\n          ? [{ ...markForScreenshot(child), pageComposition: true }]\n          : processElement(child, 0);\n        if (naturalPageAdvance && nodes[0]?.type === 'pagebreak') nodes.shift();\n        append(nodes);\n        pendingPageBreak =\n          style.breakAfter === 'page' || style.pageBreakAfter === 'always';\n        previousPageRootFillsPage =\n          isPageRoot &&\n          child.getBoundingClientRect().height >= renderedPageHeight - 12;\n      }\n      return output;\n    };\n    const ir = multiPageComposition\n      ? authoredPageRoots.flatMap((page, index) => [\n          ...(index > 0 ? [{ type: 'pagebreak' }] : []),\n          { ...markForScreenshot(page), pageComposition: true },\n        ])\n      : slidePageComposition\n        ? slidePageRoots.flatMap((page, index) => [\n            ...(index > 0 ? [{ type: 'pagebreak' }] : []),\n            { ...markForScreenshot(page), pageComposition: true },\n          ])\n      : mixedPageComposition\n        ? buildMixedPageIr()\n        : webPageComposition\n          ? screenshotPageSlices()\n          : multiPageAbsoluteComposition\n            ? screenshotPageSlices({ authoredPageHeights: true })\n            : flowingVisualComposition\n              ? screenshotPageSlices()\n            : singlePageVisualComposition\n              ? [{ ...markForScreenshot(singleVisualPageRoot), pageComposition: true }]\n              : bodySinglePageVisualComposition\n                ? [{ ...markForScreenshot(document.body), pageComposition: true }]\n              : pageComposition\n                ? [{ ...markForScreenshot(document.body), pageComposition: true }]\n                : processChildren(document.body, 0);\n    while (ir.length && ir[0].type === 'pagebreak') ir.shift();\n    for (let index = ir.length - 1; index >= 0; index--) {\n      const node = ir[index];\n      if (\n        node.type !== 'image' ||\n        node.clip ||\n        node.pageComposition ||\n        node.height <= 1000\n      ) {\n        continue;\n      }\n      const element = document.querySelector(`[data-h2d-id=\"${node.shotId}\"]`);\n      if (!element) continue;\n      const rect = element.getBoundingClientRect();\n      if (\n        !Number.isFinite(rect.left) ||\n        !Number.isFinite(rect.top) ||\n        !Number.isFinite(rect.width) ||\n        rect.width <= 0\n      ) {\n        ir.splice(index, 1);\n        continue;\n      }\n      const maxSliceHeight = 700;\n      const sliceCount = boundedScreenshotSliceCount(rect.height, maxSliceHeight);\n      if (sliceCount === 0) {\n        ir.splice(index, 1);\n        continue;\n      }\n      const sliceWidth = Math.round(rect.width);\n      if (!Number.isFinite(sliceWidth) || sliceWidth <= 0) {\n        ir.splice(index, 1);\n        continue;\n      }\n      const slices = Array.from({ length: sliceCount }, (_, sliceIndex) => {\n        const sliceHeight = Math.min(\n          maxSliceHeight,\n          rect.height - sliceIndex * maxSliceHeight,\n        );\n        return {\n          ...node,\n          shotId: sliceIndex === 0 ? node.shotId : nextShotId(),\n          height: Math.round(sliceHeight),\n          spacingBeforePx: sliceIndex === 0 ? node.spacingBeforePx : 0,\n          spacingAfterPx:\n            sliceIndex === sliceCount - 1 ? node.spacingAfterPx : 0,\n          clip: {\n            x: Math.max(0, Math.round(rect.left)),\n            y: Math.max(0, Math.round(rect.top + sliceIndex * maxSliceHeight)),\n            width: sliceWidth,\n            height: Math.round(sliceHeight),\n          },\n        };\n      });\n      ir.splice(index, 1, ...slices);\n    }\n\n    // A centered \"paper sheet\" holding all the content on a tinted desk\n    // backdrop (body bg + one max-width/box-shadow child): the desk color is\n    // screen chrome, the sheet IS the page \u2014 take its paint instead.\n    const paperSheet = (() => {\n      const kids = [...document.body.children].filter(\n        (child) =>\n          isVisible(child) &&\n          ((child.innerText || '').trim() || child.querySelector('img,svg,canvas,table')),\n      );\n      if (kids.length !== 1) return null;\n      const el = kids[0];\n      const st = cs(el);\n      if (!toHex(st.backgroundColor, { dropWhite: false })) return null;\n      const rect = el.getBoundingClientRect();\n      const centered = Math.abs(rect.left - (window.innerWidth - rect.right)) <= 24;\n      const coversContent = rect.height >= document.body.scrollHeight * 0.8;\n      const sheetLike = st.boxShadow !== 'none' || parseFloat(st.maxWidth) > 0;\n      return centered && coversContent && sheetLike ? el : null;\n    })();\n    const bodyBackground = toHex(cs(document.body).backgroundColor, {\n      dropWhite: false,\n    });\n    // The desk-vs-sheet call only holds for neutral backdrops: a saturated\n    // color or gradient behind the sheet is poster design, not screen chrome.\n    const backdropDesigned = (() => {\n      if (cs(document.body).backgroundImage.includes('gradient')) return true;\n      if (!bodyBackground) return false;\n      const channels = [0, 2, 4].map((i) => parseInt(bodyBackground.slice(i, i + 2), 16));\n      return Math.max(...channels) - Math.min(...channels) > 24;\n    })();\n    const deskSheet = backdropDesigned ? null : paperSheet;\n    const pageBg = deskSheet\n      ? toHex(cs(deskSheet).backgroundColor, { dropWhite: true })\n      : bodyBackground\n        ? toHex(cs(document.body).backgroundColor, { dropWhite: true })\n        : toHex(cs(document.documentElement).backgroundColor, { dropWhite: true });\n    const bodyHasPaint =\n      !deskSheet &&\n      (cs(document.body).backgroundImage !== 'none' || Boolean(bodyBackground));\n    const bgSource = bodyHasPaint ? document.body : document.documentElement;\n    const bgStyle = cs(bgSource);\n    const pagePseudoPaints = (which) => {\n      const pseudo = getComputedStyle(bgSource, which);\n      if (!pseudo || pseudo.content === 'none' || pseudo.content === 'normal') return false;\n      const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(\n        (side) =>\n          parseFloat(pseudo[`border${side}Width`]) >= 1 &&\n          pseudo[`border${side}Style`] !== 'none',\n      );\n      return (\n        hasBorder ||\n        pseudo.backgroundImage !== 'none' ||\n        Boolean(toHex(pseudo.backgroundColor, { dropWhite: true }))\n      );\n    };\n    // a flat solid body color needs no backdrop screenshot: w:background\n    // renders the exact hex, while the header-image route's resampled tone\n    // visibly differs from same-color shading fills on content blocks\n    const backdropHasArt =\n      bgStyle.backgroundImage !== 'none' ||\n      pagePseudoPaints('::before') ||\n      pagePseudoPaints('::after') ||\n      Boolean(paperSheet && backdropDesigned);\n    if (\n      !pageComposition &&\n      !multiPageComposition &&\n      !mixedPageComposition &&\n      !multiPageAbsoluteComposition &&\n      !webPageComposition &&\n      !flowingVisualComposition &&\n      !singlePageVisualComposition &&\n      !bodySinglePageVisualComposition &&\n      backdropHasArt\n    ) {\n      const backdrop = document.createElement('div');\n      const width = window.innerWidth;\n      const height = window.innerHeight;\n      // park off-screen on the side the document ignores for overflow:\n      // in RTL, left-side overflow extends the scrollable area and shifts\n      // the capture surface origin, blanking every later element screenshot\n      const rtlDoc =\n        cs(document.documentElement).direction === 'rtl' ||\n        cs(document.body).direction === 'rtl';\n      Object.assign(backdrop.style, {\n        position: 'absolute',\n        [rtlDoc ? 'right' : 'left']: '-10000px',\n        top: '0',\n        width: `${width}px`,\n        height: `${height}px`,\n        backgroundColor: pageBg ? `#${pageBg}` : bgStyle.backgroundColor,\n        backgroundImage: bgStyle.backgroundImage,\n        backgroundSize: bgStyle.backgroundSize,\n        backgroundPosition: bgStyle.backgroundPosition,\n        backgroundRepeat: bgStyle.backgroundRepeat,\n        pointerEvents: 'none',\n      });\n      const appendPagePseudo = (which) => {\n        const pseudo = getComputedStyle(bgSource, which);\n        if (!pseudo || pseudo.content === 'none' || pseudo.content === 'normal') return;\n        const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(\n          (side) =>\n            parseFloat(pseudo[`border${side}Width`]) >= 1 &&\n            pseudo[`border${side}Style`] !== 'none',\n        );\n        const hasPaint =\n          pseudo.backgroundImage !== 'none' ||\n          Boolean(toHex(pseudo.backgroundColor, { dropWhite: true }));\n        if (!hasBorder && !hasPaint) return;\n        const overlay = document.createElement('div');\n        Object.assign(overlay.style, {\n          position: 'absolute',\n          top: pseudo.top === 'auto' ? '0' : pseudo.top,\n          right: pseudo.right === 'auto' ? '0' : pseudo.right,\n          bottom: pseudo.bottom === 'auto' ? '0' : pseudo.bottom,\n          left: pseudo.left === 'auto' ? '0' : pseudo.left,\n          boxSizing: 'border-box',\n          backgroundColor: pseudo.backgroundColor,\n          backgroundImage: pseudo.backgroundImage,\n          backgroundSize: pseudo.backgroundSize,\n          backgroundPosition: pseudo.backgroundPosition,\n          backgroundRepeat: pseudo.backgroundRepeat,\n          borderTop: pseudo.borderTop,\n          borderRight: pseudo.borderRight,\n          borderBottom: pseudo.borderBottom,\n          borderLeft: pseudo.borderLeft,\n          opacity: pseudo.opacity,\n        });\n        backdrop.appendChild(overlay);\n      };\n      appendPagePseudo('::before');\n      appendPagePseudo('::after');\n      // Designed backdrop with a content sheet on top (poster on gradient):\n      // paint the sheet's box into the backdrop so page chrome = backdrop +\n      // sheet, and the flowing text keeps its readable card behind it.\n      if (paperSheet && backdropDesigned) {\n        const sheetRect = paperSheet.getBoundingClientRect();\n        const sheetStyle = cs(paperSheet);\n        const sheet = document.createElement('div');\n        Object.assign(sheet.style, {\n          position: 'absolute',\n          left: `${Math.round(sheetRect.left)}px`,\n          top: `${Math.round(Math.max(0, sheetRect.top))}px`,\n          width: `${Math.round(sheetRect.width)}px`,\n          height: `${Math.round(Math.max(100, height - Math.max(0, sheetRect.top)))}px`,\n          backgroundColor: sheetStyle.backgroundColor,\n          borderRadius: sheetStyle.borderRadius,\n          boxShadow: sheetStyle.boxShadow,\n        });\n        backdrop.appendChild(sheet);\n      }\n      document.body.appendChild(backdrop);\n      const shot = markForScreenshot(backdrop);\n      ir.unshift({\n        type: 'pagebg',\n        color: pageBg,\n        shotId: shot.shotId,\n        width,\n        height,\n      });\n    } else if (pageBg) {\n      ir.unshift({ type: 'pagebg', color: pageBg });\n    }\n    for (let index = ir.length - 1; index > 0; index--) {\n      if (ir[index].type === 'pagebreak' && ir[index - 1].type === 'spacer') {\n        ir.splice(index - 1, 1);\n      }\n    }\n    // Section boundaries stack spacers (padding-bottom + divider walk +\n    // padding-top emitted by different branches): the real CSS gap is the\n    // two paddings, so keep the two largest of a run and drop the rest.\n    for (let index = ir.length - 1; index >= 0; index--) {\n      if (ir[index].type !== 'spacer' || ir[index].bindsNeighbors) continue;\n      let first = index;\n      while (first > 0 && ir[first - 1].type === 'spacer' && !ir[first - 1].bindsNeighbors) first--;\n      if (first === index) continue;\n      const run = ir.slice(first, index + 1).map((node) => node.px || 0).sort((a, b) => b - a);\n      const merged = Math.min(260, run[0] + (run[1] || 0));\n      ir.splice(first, index - first + 1, { type: 'spacer', px: merged });\n      index = first;\n    }\n    const lastContent = ir[ir.length - 1];\n    if (lastContent?.spacingAfterPx != null) lastContent.spacingAfterPx = 0;\n    if (lastContent?.style?.spacingAfterPx != null) lastContent.style.spacingAfterPx = 0;\n\n    const bodyStyle = cs(document.body);\n    const cssLengthPx = (value) => {\n      const match = String(value || '').trim().match(/^([\\d.]+)(px|pt|in|cm|mm)?$/i);\n      if (!match) return null;\n      const amount = parseFloat(match[1]);\n      return (\n        amount *\n        ({ px: 1, pt: 96 / 72, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 }[\n          (match[2] || 'px').toLowerCase()\n        ] || 1)\n      );\n    };\n    const namedPageSizes = {\n      a3: [1123, 1587],\n      a4: [794, 1123],\n      a5: [559, 794],\n      letter: [816, 1056],\n      legal: [816, 1344],\n      tabloid: [1056, 1632],\n      ledger: [1632, 1056],\n    };\n    let pageSizePx = null;\n    for (const sheet of [...document.styleSheets]) {\n      let rules;\n      try {\n        rules = [...sheet.cssRules];\n      } catch {\n        continue;\n      }\n      for (const rule of rules) {\n        if (rule.type !== CSSRule.PAGE_RULE) continue;\n        const parts = (rule.style.getPropertyValue('size') || '').trim().toLowerCase().split(/\\s+/);\n        const orientation = parts.find((part) => part === 'landscape' || part === 'portrait');\n        const named = parts.find((part) => namedPageSizes[part]);\n        if (named) {\n          pageSizePx = [...namedPageSizes[named]];\n        } else {\n          const lengths = parts.map(cssLengthPx).filter((value) => value != null);\n          if (lengths.length >= 2) pageSizePx = [lengths[0], lengths[1]];\n          else if (lengths.length === 1) pageSizePx = [lengths[0], lengths[0] * Math.SQRT2];\n        }\n        if (pageSizePx && orientation === 'landscape' && pageSizePx[0] < pageSizePx[1]) {\n          pageSizePx.reverse();\n        }\n        if (pageSizePx && orientation === 'portrait' && pageSizePx[0] > pageSizePx[1]) {\n          pageSizePx.reverse();\n        }\n        break;\n      }\n      if (pageSizePx) break;\n    }\n    if (!pageSizePx && (multiPageComposition || mixedPageComposition)) {\n      const pageRect = (authoredPageRoots[0] || inferredPageRoots[0]).getBoundingClientRect();\n      pageSizePx = [pageRect.width, pageRect.height];\n    } else if (!pageSizePx && multiPageAbsoluteComposition) {\n      pageSizePx = [bodyRect.width, renderedPageHeight];\n    } else if (!pageSizePx && pageComposition) {\n      pageSizePx = [bodyRect.width, bodyRect.height];\n    }\n    pageSizePx ||= [794, 1123];\n    const composed =\n      pageComposition ||\n      multiPageComposition ||\n      slidePageComposition ||\n      mixedPageComposition ||\n      multiPageAbsoluteComposition ||\n      webPageComposition ||\n      flowingVisualComposition ||\n      singlePageVisualComposition ||\n      bodySinglePageVisualComposition;\n    // A natively-rendered flow document slightly taller than one page (e.g. a\n    // resume that strands two lines on page 2) reads as a one-page design.\n    // Word lays such docs out ~10% denser than the browser proxy (narrower\n    // Arial + width scale), so browser ratios up to ~1.22 are recoverable\n    // with a small whole-document squeeze applied to geometry and fonts.\n    // ratio against the page height at the ACTUAL viewport width \u2014 the\n    // viewport height is not resized when the authored width differs, so\n    // innerHeight is the wrong denominator there (880-wide doc in a\n    // 1024-proportioned window read as 0.95 pages instead of 1.11)\n    const flowCanvasWidth = Math.min(\n      window.innerWidth,\n      Math.max(Math.round(pageSizePx[0]), Math.ceil(bodyRect.width)),\n    );\n    const flowPageHeight = flowCanvasWidth * (pageSizePx[1] / pageSizePx[0]);\n    const flowRatio = bodyHeight / flowPageHeight;\n    const squeezableFlow = !composed && !authoredPageRoots.length && !inferredPageRoots.length;\n    (globalThis.__h2dTrace ||= []).push({\n      where: 'pageFitSqueeze',\n      flowRatio: Math.round(flowRatio * 1000) / 1000,\n      bodyHeight: Math.round(bodyHeight),\n      renderedPageHeight,\n      composed: Boolean(composed),\n      authoredRoots: authoredPageRoots.length,\n      inferredRoots: inferredPageRoots.length,\n    });\n    // Word lays text-heavy docs ~10% denser than the browser proxy (narrower\n    // Arial), which the 0.9 fudge credits. Table/fixed-height-heavy docs get\n    // no such densening, so past ~1.05 the fudge under-squeezes and the last\n    // block still strands (invoice stamp boxes) \u2014 taper the credit away.\n    const pageFitSqueeze =\n      squeezableFlow && flowRatio > 1.05 && flowRatio <= 1.22\n        ? // table/fixed-height-heavy docs (invoices) get none of the Arial\n          // densening the 0.9 fudge below assumes \u2014 squeeze at face value\n          // plus slack so the trailing block doesn't strand by one line\n          // 0.90/0.82 (was 0.92/0.84): Word (Mac) lays these table-heavy\n          // docs up to ~9% taller than the browser proxy \u2014 the old floor\n          // left a marginal one-pager's footer stranding on page 2\n          Math.max(0.8, Math.min(1, 0.88 / flowRatio))\n        : squeezableFlow && flowRatio > 1.02 && flowRatio <= 1.05\n          ? Math.max(0.88, Math.min(1, 0.98 / (flowRatio * 0.9)))\n          : // A doc filling exactly one browser page (invoices, forms) is a\n            // one-page design; Word's layout runs a few percent taller (table\n            // leading, min row heights), so squeeze preemptively.\n            squeezableFlow && flowRatio > 0.96 && flowRatio <= 1.02\n            ? 0.94\n            : 1;\n    // A viewport wider than the authored canvas (1024 reload of a\n    // letter-width design) centers the body with auto margins \u2014 a viewport\n    // artifact, not an authored page margin. Measure against the canvas and\n    // strip the centering offset, or the page gets ~3cm fake margins and the\n    // content shrinks by the canvas/viewport ratio.\n    const canvasWidth = Math.min(\n      window.innerWidth,\n      Math.max(Math.round(pageSizePx[0]), Math.ceil(bodyRect.width)),\n    );\n    const centerOffset = Math.max(0, (window.innerWidth - canvasWidth) / 2);\n    // flowed documents get a small margin floor: an authored padding:0 body\n    // puts Word text hard against the physical page edge, which no print\n    // layout intends; composed pages keep exact geometry. The floor widens\n    // the margins beyond the measured geometry, so the reported canvas must\n    // widen by the same amount or the px->page scale over-sizes the content\n    // and Word clips it at the right margin.\n    const rawLeftPx = composed\n      ? Math.max(0, Math.round(bodyRect.left - centerOffset))\n      : Math.max(\n          0,\n          Math.round(bodyRect.left - centerOffset + (parseFloat(bodyStyle.paddingLeft) || 0)),\n        );\n    const rawRightPx = Math.max(\n      0,\n      composed\n        ? Math.round(canvasWidth - (bodyRect.right - centerOffset))\n        : Math.round(\n            canvasWidth -\n              (bodyRect.right - centerOffset) +\n              (parseFloat(bodyStyle.paddingRight) || 0),\n          ),\n    );\n    const leftPx = composed ? rawLeftPx : Math.max(24, rawLeftPx);\n    const rightPx = composed ? rawRightPx : Math.max(24, rawRightPx);\n    const metaContent = (name) =>\n      document.querySelector(`meta[name=\"${name}\" i]`)?.content?.trim() || undefined;\n    ir.unshift({\n      type: 'docsettings',\n      viewportWidthPx: canvasWidth + (leftPx - rawLeftPx) + (rightPx - rawRightPx),\n      rtl: docRTL || undefined,\n      lang: document.documentElement.lang || undefined,\n      meta: {\n        title: (document.title || '').trim() || undefined,\n        author: metaContent('author'),\n        description: metaContent('description'),\n        keywords: metaContent('keywords'),\n      },\n      composed: composed || undefined,\n      pageFitSqueeze: pageFitSqueeze < 1 ? pageFitSqueeze : undefined,\n      pageSizePx: { width: Math.round(pageSizePx[0]), height: Math.round(pageSizePx[1]) },\n      marginsPx: {\n        top: composed\n          ? Math.max(0, Math.round(bodyRect.top))\n          : Math.max(24, Math.round(bodyRect.top + (parseFloat(bodyStyle.paddingTop) || 0))),\n        bottom: composed\n          ? 0\n          : Math.max(24, Math.round(parseFloat(bodyStyle.paddingBottom) || 0)),\n        left: leftPx,\n        right: rightPx,\n      },\n    });\n    return ir;\n  }\n\n  global.__html2docxPages = { build };\n})(globalThis);\n";

// vendor/genoffice-html2docx/src/extract.ts
var EXTRACTOR_BODY = [
  styles_default,
  runs_screenshots_default,
  tables_lists_default,
  layouts_controls_default,
  decorators_default,
  classifier_default,
  paragraphs_document_default
].join("\n");
var EXTRACTOR_SOURCE = `function extractIR() {
${EXTRACTOR_BODY}
}`;
var EXTRACTOR_CALL = `(${EXTRACTOR_SOURCE})()`;
var BROWSER_HELPER_SCRIPTS = [
  table_default,
  forms_media_default,
  visual_effects_default,
  pages_default
];

// existing:docx
var office = __toESM(require("./office.cjs"));
var { AlignmentType, BookmarkEnd, BookmarkStart, BorderStyle, CheckBox, Document, ExternalHyperlink, Footer, Header, HeadingLevel, HeightRule, ImageRun, ImportedXmlComponent, InternalHyperlink, LevelFormat, LevelSuffix, LineRuleType, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Tab, TabStopType, Table, TableCell, TableLayoutType, TableRow, TextRun, TextWrappingType, UnderlineType, VerticalAlign, VerticalMergeType, VerticalPositionAlign, WidthType, bookmarkUniqueNumericIdGen } = office.word;

// vendor/genoffice-html2docx/src/generate/fonts.ts
var CJK_RE = /[\u1100-\u11ff\u2e80-\u2fdf\u3000-\u30ff\u31f0-\u31ff\u3130-\u318f\u3400-\u9fff\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{3134f}]/u;
var HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
var KANA_RE = /[\u3040-\u30ff\u31f0-\u31ff]/;
var FONT_RULES = [
  [/jetbrains|consolas|menlo|courier|mono/i, "Consolas"],
  [/fredoka/i, "Arial Rounded MT Bold"],
  [
    /brush script|lucida handwriting|pacifico|dancing script|great vibes|cursive|comic sans/i,
    "Segoe Script"
  ],
  [/dm serif|playfair|cormorant/i, "Georgia"],
  [/archivo|bebas|oswald/i, "Arial Narrow"],
  [/malgun|맑은/i, "Malgun Gothic"],
  [/yu gothic|meiryo|hiragino kaku|ms gothic|noto sans jp/i, "Yu Gothic"],
  [/batang|바탕|noto serif kr/i, "Batang"],
  [/yu mincho|ms mincho|hiragino mincho|noto serif jp/i, "Yu Mincho"],
  [
    /noto sans cjk|noto sans sc|noto sans tc|noto sans kr|yahei|pingfang|heiti|source han sans|\u5fae\u8f6f\u96c5\u9ed1|\u9ed1\u4f53/i,
    "Microsoft YaHei"
  ],
  [
    /noto serif cjk|noto serif sc|songti|stsong|simsun|kaiti|fangsong|source han serif|\u5b8b\u4f53/i,
    "SimSun"
  ],
  [/arial unicode/i, "Arial Unicode MS"],
  [/arial|helvetica|verdana|tahoma|segoe|roboto|inter|lato|open sans|sans/i, "Arial"],
  [/times|georgia|garamond|cambria|palatino|book antiqua|serif/i, "Times New Roman"],
  [/.*/, "Arial"]
];
function mapFont(fontFamily = "", mono = false, text = "") {
  if (mono) return "Consolas";
  let font = "Arial";
  for (const [pattern, name] of FONT_RULES) {
    if (pattern.test(fontFamily)) {
      font = name;
      break;
    }
  }
  if (CJK_RE.test(text)) {
    const sans = HANGUL_RE.test(text) ? "Malgun Gothic" : KANA_RE.test(text) ? "Yu Gothic" : "Microsoft YaHei";
    const serif = HANGUL_RE.test(text) ? "Batang" : KANA_RE.test(text) ? "Yu Mincho" : "SimSun";
    if (font === "Arial") font = sans;
    if (font === "Times New Roman") font = serif;
  }
  return font;
}

// vendor/genoffice-html2docx/src/generate/bookmarks.ts
var nextBookmarkLinkId = bookmarkUniqueNumericIdGen();
function bookmarkName(id) {
  const value = String(id || "");
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const safe = value.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 24) || "anchor";
  return `h2d_${safe}_${(hash >>> 0).toString(36)}`.slice(0, 40);
}
function withBookmarks(children, bookmarks = []) {
  if (!bookmarks?.length) return children;
  const starts = [];
  const ends = [];
  for (const id of bookmarks) {
    const linkId = nextBookmarkLinkId();
    starts.push(new BookmarkStart(bookmarkName(id), linkId));
    ends.unshift(new BookmarkEnd(linkId));
  }
  return [...starts, ...children, ...ends];
}
function mergeBookmarks(existing, incoming) {
  return [.../* @__PURE__ */ new Set([...existing || [], ...incoming])];
}
function carryInto(entry, bookmarks) {
  if (!entry || typeof entry !== "object") return null;
  if (Array.isArray(entry.children)) {
    const children = carryBookmarks(entry.children, bookmarks);
    return children ? { ...entry, children } : null;
  }
  if (Array.isArray(entry.runs)) {
    return { ...entry, bookmarks: mergeBookmarks(entry.bookmarks, bookmarks) };
  }
  return null;
}
function carryBookmarks(nodes, bookmarks) {
  if (!Array.isArray(nodes)) return null;
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (!node || typeof node !== "object") continue;
    let carried = null;
    if (node.type === "para" || node.type === "heading") {
      carried = { ...node, bookmarks: mergeBookmarks(node.bookmarks, bookmarks) };
    } else if (node.type === "list" && node.items?.length) {
      const items = [...node.items];
      items[0] = { ...items[0], bookmarks: mergeBookmarks(items[0].bookmarks, bookmarks) };
      carried = { ...node, items };
    } else if (node.rows?.[0]?.cells?.[0]) {
      const { bookmarks: _, ...table } = carryTableBookmarks({
        ...node,
        bookmarks: mergeBookmarks(node.bookmarks, bookmarks)
      });
      carried = table;
    } else {
      for (const key of ["children", "cells"]) {
        const kids = node[key];
        if (!Array.isArray(kids)) continue;
        for (let k = 0; k < kids.length; k++) {
          const replacement = carryInto(kids[k], bookmarks);
          if (!replacement) continue;
          const nextKids = [...kids];
          nextKids[k] = replacement;
          carried = { ...node, [key]: nextKids };
          break;
        }
        if (carried) break;
      }
    }
    if (!carried) continue;
    const out = [...nodes];
    out[index] = carried;
    return out;
  }
  return null;
}
function carryTableBookmarks(node) {
  const first = node.rows?.[0]?.cells?.[0];
  if (!node.bookmarks?.length || !first) return node;
  const [head, ...rest] = node.rows;
  const [lead, ...tail] = head.cells;
  return {
    ...node,
    rows: [
      {
        ...head,
        cells: [{ ...lead, bookmarks: mergeBookmarks(lead.bookmarks, node.bookmarks) }, ...tail]
      },
      ...rest
    ]
  };
}

// vendor/genoffice-html2docx/src/generate/word-utils.ts
function finitePx(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}
function runText(value) {
  if (typeof value === "string") return value;
  return value == null ? "" : String(value);
}
function makeRuns(context, runs, images = {}) {
  const out = [];
  for (const r of runs) {
    if (r.pageNumberField) {
      out.push(
        new TextRun({
          children: [r.pageNumberField === "total" ? PageNumber.TOTAL_PAGES : PageNumber.CURRENT],
          bold: r.bold || void 0,
          italics: r.italic || void 0,
          color: r.color || void 0,
          size: r.sizePx ? context.pxToHalfPoints(r.sizePx) : void 0,
          font: mapFont(r.fontFamily, r.mono, r.text)
        })
      );
      continue;
    }
    if (r.contentControl === "checkbox") {
      out.push(new CheckBox({ checked: Boolean(r.checked), alias: r.alias || "Checkbox" }));
      continue;
    }
    if (r.inlineImage) {
      const image = images[r.shotId];
      if (image) {
        out.push(
          new ImageRun({
            type: "png",
            data: image,
            transformation: { width: finitePx(r.width), height: finitePx(r.height) }
          })
        );
      }
      continue;
    }
    const underlineType = r.underlineStyle === "dotted" ? UnderlineType.DOTTED : r.underlineStyle === "dashed" ? UnderlineType.DASHED : UnderlineType.SINGLE;
    const style = {
      bold: r.bold || void 0,
      italics: r.italic || void 0,
      underline: r.underline ? { type: underlineType, color: r.underlineColor || void 0 } : void 0,
      strike: r.strike || void 0,
      // always explicit: inherited styles (Heading1..6 theme blue) must not win
      color: r.color || void 0,
      size: r.sizePx ? context.pxToHalfPoints(r.sizePx) : void 0,
      // Emoji: leave the font unset so Word's built-in emoji fallback picks the
      // platform color-emoji font. Forcing 'Segoe UI Emoji' renders tofu boxes
      // (and flags as "GB") on Mac Word, which lacks that font.
      font: r.emoji ? void 0 : r.symbol ? "Arial Unicode MS" : mapFont(r.fontFamily, r.mono, r.text),
      characterSpacing: r.letterSpacing > 0.5 ? context.pxToTwips(r.letterSpacing) : void 0,
      superScript: r.superscript || void 0,
      subScript: r.subscript || void 0,
      allCaps: r.uppercase || void 0,
      // w:rtl on the run so Arabic/Hebrew glyphs shape and order correctly
      // (docx mirrors size/bold/italics into their complex-script twins)
      rightToLeft: r.rtl || void 0,
      // arbitrary hex needs character shading (w:highlight only takes named colors)
      shading: r.highlight ? { type: ShadingType.CLEAR, fill: r.highlight } : void 0,
      // inline boxed chip -> character border (w:bdr); space:1 keeps a hair of
      // padding between glyph and frame like the authored chip padding
      border: r.charBorder ? {
        style: BorderStyle.SINGLE,
        size: context.pxToBorderEighths(r.charBorder.widthPx),
        color: r.charBorder.color,
        space: 1
      } : void 0,
      noProof: true
    };
    const lines = runText(r.text).split("\n");
    lines.forEach((line, i) => {
      const segments = line.split("	");
      segments.forEach((segment, j) => {
        const needsBreak = i > 0 && j === 0;
        const children = [];
        if (j > 0) children.push(new Tab());
        if (segment) children.push(segment);
        if (!children.length && !needsBreak) return;
        const run = new TextRun({ ...style, children, break: needsBreak ? 1 : void 0 });
        if (r.anchor) {
          out.push(new InternalHyperlink({ children: [run], anchor: bookmarkName(r.anchor) }));
        } else if (r.href) {
          out.push(new ExternalHyperlink({ children: [run], link: r.href }));
        } else {
          out.push(run);
        }
      });
    });
  }
  return out;
}
var MAX_INSET_SPACES = 1024;
function makeNodeRuns(context, node, images = {}) {
  const runs = makeRuns(context, node.runs, images);
  const insetPx = node.style?.borderLeftSpacePx || 0;
  if (insetPx > 0) {
    const sample = node.runs.find((run) => run.text) || {};
    const fontSizePx = Math.max(1, sample.sizePx || 16);
    const count = Math.min(MAX_INSET_SPACES, Math.max(1, Math.ceil(insetPx / (fontSizePx * 0.65))));
    runs.unshift(
      new TextRun({
        text: "\xA0".repeat(count),
        size: context.pxToHalfPoints(fontSizePx),
        font: mapFont(sample.fontFamily, sample.mono, sample.text),
        noProof: true
      })
    );
  }
  return runs;
}
function tabStopsFor(context, runs) {
  const tabs = runs.filter((r) => runText(r.text).includes("	"));
  if (!tabs.length) return [];
  const stops = [];
  const seen = /* @__PURE__ */ new Set();
  for (const r of tabs) {
    const stop = r.tabFrac != null && r.tabFrac < 0.75 ? {
      type: TabStopType.LEFT,
      position: Math.max(0, Math.round(r.tabFrac * context.contentDxa))
    } : { type: TabStopType.RIGHT, position: context.contentDxa };
    const key = `${stop.type}:${stop.position}`;
    if (!seen.has(key)) {
      seen.add(key);
      stops.push(stop);
    }
  }
  return stops;
}
function paraOptions(context, style = {}) {
  const opts = {};
  if (style.rtl) opts.bidirectional = true;
  if (style.align === "center") opts.alignment = AlignmentType.CENTER;
  if (style.align === "right") opts.alignment = AlignmentType.RIGHT;
  if (style.align === "left" && style.rtl) opts.alignment = AlignmentType.LEFT;
  if (style.align === "justify") opts.alignment = AlignmentType.JUSTIFIED;
  if (style.indentLeftPx || style.indentHangingPx) {
    const hang = style.indentHangingPx ? context.pxToTwips(style.indentHangingPx) : 0;
    opts.indent = {
      left: context.pxToTwips(style.indentLeftPx || 0) + hang,
      ...hang ? { hanging: hang } : {}
    };
  } else if (style.firstLineIndentPx) {
    opts.indent = { firstLine: context.pxToTwips(style.firstLineIndentPx) };
  }
  opts.spacing = {};
  if (style.spacingAfterPx) opts.spacing.after = context.pxToTwips(style.spacingAfterPx);
  if (style.spacingBeforePx) opts.spacing.before = context.pxToTwips(style.spacingBeforePx);
  if (style.lineRatio) {
    const effective = Math.max(1, style.lineRatio / (style.cjk ? 1.3 : 1.15));
    opts.spacing.line = Math.round(effective * 240);
  }
  if (style.exactLineHeightPx) {
    opts.spacing.line = context.pxToTwips(style.exactLineHeightPx);
    opts.spacing.lineRule = style.borderLeft || style.borderRight ? LineRuleType.AT_LEAST : LineRuleType.EXACT;
  }
  if (style.shading) opts.shading = { type: ShadingType.CLEAR, fill: style.shading };
  if (style.borderLeft || style.borderRight || style.borderTop || style.borderBottom) {
    opts.border = {};
    if (style.borderLeft) {
      opts.border.left = {
        style: BorderStyle.SINGLE,
        size: context.pxToBorderEighths(style.borderLeft.widthPx),
        color: style.borderLeft.color,
        // w:space pushes the border left, away from the text (in points,
        // capped at 31 by Word)
        space: style.borderLeftOutsetPx ? Math.min(
          31,
          Math.max(1, Math.round(style.borderLeftOutsetPx * 0.75 * context.measurementScale))
        ) : void 0
      };
    }
    if (style.borderBottom) {
      opts.border.bottom = {
        style: style.borderBottom.style === "dotted" ? BorderStyle.DOTTED : style.borderBottom.style === "dashed" ? BorderStyle.DASHED : BorderStyle.SINGLE,
        size: context.pxToBorderEighths(style.borderBottom.widthPx),
        color: style.borderBottom.color,
        space: 4
      };
    }
    if (style.borderRight) {
      opts.border.right = {
        style: BorderStyle.SINGLE,
        size: context.pxToBorderEighths(style.borderRight.widthPx),
        color: style.borderRight.color,
        space: style.borderRightSpacePx ? Math.max(1, Math.round(style.borderRightSpacePx * 0.75 * context.measurementScale)) : void 0
      };
    }
    if (style.borderTop) {
      opts.border.top = {
        style: BorderStyle.SINGLE,
        size: context.pxToBorderEighths(style.borderTop.widthPx),
        color: style.borderTop.color,
        space: 4
      };
    }
  }
  return opts;
}
function spacerParagraph(context, px, { keepNext = false, shading = null, borderLeft = null } = {}) {
  const paragraph = new Paragraph({
    // Word tables already contribute a few pixels of leading. Force only
    // authored block gaps large enough to be visually meaningful.
    children: [new TextRun({ text: px >= 24 ? "\u200B" : "", size: 2, noProof: true })],
    ...keepNext ? { keepNext: true } : {},
    ...shading ? { shading: { type: ShadingType.CLEAR, fill: shading } } : {},
    // continues a flattened card's left rail through spacing gaps
    ...borderLeft ? {
      border: {
        left: {
          style: BorderStyle.SINGLE,
          size: context.pxToBorderEighths(borderLeft.widthPx),
          color: borderLeft.color
        }
      }
    } : {},
    spacing: {
      before: 0,
      after: 0,
      line: context.pxToTwips(Math.max(px, 2)),
      lineRule: LineRuleType.EXACT
    }
  });
  const marked = paragraph;
  marked.__h2dSpacerPx = px;
  marked.__h2dSpacerShading = shading;
  marked.__h2dSpacerBorderLeft = borderLeft;
  return paragraph;
}
var NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
var NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER
};
var NO_TABLE_BORDERS = {
  ...NO_BORDERS,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER
};
function wordBorder(context, border) {
  if (!border) return NO_BORDER;
  const styles = {
    dotted: BorderStyle.DOTTED,
    dashed: BorderStyle.DASHED,
    double: BorderStyle.DOUBLE
  };
  return {
    style: styles[border.style] || BorderStyle.SINGLE,
    // Floor at 0.75pt: a scaled 1px CSS border falls to 0.5pt and turns
    // nearly invisible in Word at common zoom levels (same floor as cards).
    size: Math.max(6, context.pxToBorderEighths(border.widthPx)),
    color: border.color
  };
}
var HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6
];

// vendor/genoffice-html2docx/src/generate/document-meta.ts
function forEachRunText(ir, fn) {
  ;
  (function walk(nodes) {
    for (const node of nodes) {
      for (const run of node.runs || []) fn(runText(run.text));
      if (node.children) walk(node.children);
      if (node.cells) for (const cell of node.cells) walk(cell.children || []);
      if (node.rows) {
        for (const row of node.rows) {
          for (const cell of row.cells) walk(cell.children || (cell.runs ? [cell] : []));
        }
      }
      if (node.items) {
        for (const item of node.items) {
          walk([{ runs: Array.isArray(item) ? item : item.runs }]);
        }
      }
    }
  })(ir);
}
function detectCJK(ir) {
  let cjk = 0;
  let total = 0;
  forEachRunText(ir, (text) => {
    total += text.length;
    for (const char of text) if (CJK_RE.test(char)) cjk++;
  });
  return total > 0 && cjk / total > 0.05;
}
function eastAsiaLangOf(lang = "", ir = []) {
  const lower = String(lang ?? "").toLowerCase();
  const primary = lower.split("-")[0];
  if (primary === "ja") return "ja-JP";
  if (primary === "ko") return "ko-KR";
  if (primary === "zh") {
    return /hant|tw|hk|mo/.test(lower) ? "zh-TW" : "zh-CN";
  }
  let kana = 0;
  let hangul = 0;
  forEachRunText(ir, (text) => {
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code >= 12352 && code <= 12543 || code >= 12784 && code <= 12799) kana++;
      else if (code >= 44032 && code <= 55215 || code >= 4352 && code <= 4607) hangul++;
    }
  });
  if (hangul > kana && hangul > 10) return "ko-KR";
  if (kana > 10) return "ja-JP";
  return "zh-CN";
}
function bidiLangOf(lang = "") {
  const value = String(lang ?? "");
  const primary = value.toLowerCase().split("-")[0];
  return { ar: "ar-SA", he: "he-IL", fa: "fa-IR", ur: "ur-PK" }[primary] || (value.includes("-") ? value : "ar-SA");
}

// vendor/genoffice-html2docx/src/generate/numbering.ts
function orderedNumberingLevels(format = LevelFormat.DECIMAL) {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format,
    text: `%${level + 1}.`,
    suffix: LevelSuffix.SPACE,
    start: 1,
    style: {
      paragraph: {
        indent: { left: 360 * (level + 1), hanging: 240 }
      }
    }
  }));
}
function orderedReference(markerType) {
  return {
    "decimal-leading-zero": "h2d-ol-decimal-zero",
    "lower-alpha": "h2d-ol-lower-letter",
    "lower-latin": "h2d-ol-lower-letter",
    "upper-alpha": "h2d-ol-upper-letter",
    "upper-latin": "h2d-ol-upper-letter",
    "lower-roman": "h2d-ol-lower-roman",
    "upper-roman": "h2d-ol-upper-roman"
  }[markerType] || "h2d-ol";
}
var BULLET_MARKER_TYPES = /* @__PURE__ */ new Set(["disc", "circle", "square"]);
function bulletNumberingLevels(text) {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: LevelFormat.BULLET,
    text,
    style: {
      paragraph: {
        indent: { left: 360 * (level + 1), hanging: 240 }
      }
    }
  }));
}
function buildNumberingConfig() {
  return [
    { reference: "h2d-ol", levels: orderedNumberingLevels() },
    {
      reference: "h2d-ol-decimal-zero",
      levels: orderedNumberingLevels(LevelFormat.DECIMAL_ZERO)
    },
    {
      reference: "h2d-ol-lower-letter",
      levels: orderedNumberingLevels(LevelFormat.LOWER_LETTER)
    },
    {
      reference: "h2d-ol-upper-letter",
      levels: orderedNumberingLevels(LevelFormat.UPPER_LETTER)
    },
    {
      reference: "h2d-ol-lower-roman",
      levels: orderedNumberingLevels(LevelFormat.LOWER_ROMAN)
    },
    {
      reference: "h2d-ol-upper-roman",
      levels: orderedNumberingLevels(LevelFormat.UPPER_ROMAN)
    },
    { reference: "h2d-ul", levels: bulletNumberingLevels("\u2022") },
    { reference: "h2d-ul-circle", levels: bulletNumberingLevels("\u25E6") },
    { reference: "h2d-ul-square", levels: bulletNumberingLevels("\u25AA") }
  ];
}

// vendor/genoffice-html2docx/src/generate/page-settings.ts
var import_node_zlib = __toESM(require("node:zlib"), 1);
function partitionIr(ir) {
  const docSettings = ir.find((node) => node.type === "docsettings");
  const pageBgNode = ir.find((node) => node.type === "pagebg");
  const headerNode = ir.find((node) => node.type === "headerpart");
  const footerNode = ir.find((node) => node.type === "footerpart");
  const bodyIr = ir.filter(
    (node) => node.type !== "docsettings" && node.type !== "pagebg" && node.type !== "headerpart" && node.type !== "footerpart"
  );
  return { bodyIr, docSettings, footerNode, headerNode, pageBgNode };
}
function parsePageBgColor(color) {
  return typeof color === "string" && /^[0-9a-fA-F]{6}$/.test(color) ? color : null;
}
function solidColorPng(hex) {
  const valid = parsePageBgColor(hex);
  if (!valid) return null;
  const rgb = [0, 2, 4].map((i) => parseInt(valid.slice(i, i + 2), 16));
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(import_node_zlib.default.crc32(body) >>> 0, body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = import_node_zlib.default.deflateSync(Buffer.from([0, ...rgb]));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
function addPageBackgroundFloat(generator, pageBgNode) {
  const shotData = pageBgNode?.shotId ? generator.images[pageBgNode.shotId] : null;
  const data = shotData || (pageBgNode?.color ? solidColorPng(pageBgNode.color) : null);
  if (!data) return;
  const context = generator.context;
  generator.pageBackgroundFloat = new ImageRun({
    type: "png",
    data,
    transformation: {
      width: Math.round(context.pageWidthDxa / 15),
      height: Math.round(context.pageHeightDxa / 15)
    },
    floating: {
      horizontalPosition: { relative: "page", offset: 0 },
      verticalPosition: { relative: "page", offset: 0 },
      behindDocument: true,
      wrap: { type: TextWrappingType.NONE },
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    }
  });
}
function renderSection(generator, { bodyIr, footerNode, headerNode }) {
  const headerChildren = [];
  if (generator.pageBackgroundFloat) {
    headerChildren.push(
      new Paragraph({
        children: [generator.pageBackgroundFloat],
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
      })
    );
  }
  if (headerNode) {
    headerChildren.push(...generator.render(withPageNumberFields(headerNode.children || [])));
  }
  const footerChildren = footerNode ? generator.render(withPageNumberFields(footerNode.children || [])) : [];
  const children = generator.render(bodyIr);
  while (children.length > 1 && children[children.length - 1]?.__h2dSpacerPx) {
    children.pop();
  }
  if (!(children[children.length - 1] instanceof Paragraph)) {
    children.push(
      new Paragraph({
        children: [],
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
      })
    );
  }
  let lastBlock = children.length - 1;
  while (lastBlock >= 0 && children[lastBlock] instanceof Paragraph) lastBlock--;
  if (children[lastBlock] instanceof Table) {
    let firstSpacer = lastBlock;
    while (firstSpacer > 0 && children[firstSpacer - 1]?.__h2dSpacerPx) firstSpacer--;
    const runPx = children.slice(firstSpacer, lastBlock).reduce((sum, spacer) => sum + spacer.__h2dSpacerPx, 0);
    if (runPx > 16) {
      children.splice(firstSpacer, lastBlock - firstSpacer, spacerParagraph(generator.context, 8));
    }
  }
  if (generator.floats.length) {
    children.unshift(
      new Paragraph({
        children: generator.floats,
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
      })
    );
  }
  return { children, footerChildren, headerChildren };
}
var LATIN_PAGE_RE = /\b((?:page|pg\.?|p\.)\s*)(\d+)((?:\s*(?:of|\/|de)\s*)(\d+))?/i;
var CJK_PAGE_RE = /(\u7b2c\s*)(\d+)(\s*[\u9875\u9801])((?:\s*[,\uff0c/]?\s*\u5171\s*)(\d+)(\s*[\u9875\u9801]))?/;
function pageFieldSegments(run) {
  const text = run.text || "";
  const match = LATIN_PAGE_RE.exec(text) || CJK_PAGE_RE.exec(text);
  if (!match) return null;
  const isCjk = match.length > 5;
  const segments = [];
  const push = (t) => t && segments.push({ ...run, text: t });
  push(text.slice(0, match.index) + match[1]);
  segments.push({ ...run, text: "", pageNumberField: "current" });
  if (isCjk) {
    push(match[3]);
    if (match[5]) {
      push(match[4].slice(0, match[4].length - match[5].length - match[6].length));
      segments.push({ ...run, text: "", pageNumberField: "total" });
      push(match[6]);
    }
    push(text.slice(match.index + match[0].length));
  } else {
    if (match[4]) {
      push(match[3].slice(0, match[3].length - match[4].length));
      segments.push({ ...run, text: "", pageNumberField: "total" });
    }
    push(text.slice(match.index + match[0].length));
  }
  return segments;
}
function withPageNumberFields(nodes) {
  const mapCells = (cells) => (cells || []).map((cell) => ({
    ...cell,
    runs: cell.runs ? cell.runs.flatMap((run) => pageFieldSegments(run) || [run]) : cell.runs,
    children: cell.children ? withPageNumberFields(cell.children) : cell.children
  }));
  return (nodes || []).map((node) => {
    const mapped = { ...node };
    if (node.runs) {
      mapped.runs = node.runs.flatMap((run) => pageFieldSegments(run) || [run]);
    }
    if (node.children) mapped.children = withPageNumberFields(node.children);
    if (node.rows) {
      mapped.rows = node.rows.map((row) => ({ ...row, cells: mapCells(row.cells) }));
    }
    if (node.cells) mapped.cells = mapCells(node.cells);
    if (node.items) mapped.items = withPageNumberFields(node.items);
    return mapped;
  });
}
function createDocument(context, parts, rendered, generator) {
  const isCJK = detectCJK(parts.bodyIr);
  const docRTL = Boolean(parts.docSettings?.rtl);
  const bidiLang = docRTL ? bidiLangOf(parts.docSettings?.lang) : void 0;
  const hasPageBackgroundHeader = Boolean(generator?.pageBackgroundFloat) && !parts.headerNode;
  const needsTopBleed = hasPageBackgroundHeader && context.pageMargins.top === 0;
  const pageMargins = hasPageBackgroundHeader ? {
    ...context.pageMargins,
    top: needsTopBleed ? -context.pxToTwips(14) : context.pageMargins.top,
    header: 0
  } : context.pageMargins;
  const meta = parts.docSettings?.meta || {};
  const pageBgColor = parsePageBgColor(parts.pageBgNode?.color);
  return new Document({
    title: meta.title,
    creator: meta.author || "html2docx",
    description: meta.description,
    keywords: meta.keywords,
    background: pageBgColor ? { color: pageBgColor } : void 0,
    numbering: { config: buildNumberingConfig() },
    styles: {
      default: {
        document: {
          // OOXML default is OFF unless a style sets it; Word's own new-doc
          // template enables it — match that so no stranded single lines
          paragraph: { widowControl: true },
          run: isCJK ? {
            // ascii/hAnsi stay Latin-proportional: a CJK font on Latin
            // runs renders SimSun-style monospaced glyphs.
            font: {
              ascii: "Arial",
              hAnsi: "Arial",
              eastAsia: { "ja-JP": "Yu Gothic", "ko-KR": "Malgun Gothic" }[eastAsiaLangOf(parts.docSettings?.lang, parts.bodyIr)] || "Microsoft YaHei"
            },
            size: Math.round(21 * context.fontScale),
            // w:lang w:val must stay Latin: tagging it zh-CN makes Word
            // apply CJK line breaking to Latin words ("Rep/ort").
            language: {
              value: "en-US",
              eastAsia: eastAsiaLangOf(parts.docSettings?.lang, parts.bodyIr)
            }
          } : {
            font: "Arial",
            size: Math.round(21 * context.fontScale),
            language: docRTL ? { value: bidiLang, bidirectional: bidiLang } : { value: "en-US" }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: context.pageWidthDxa, height: context.pageHeightDxa },
            margin: pageMargins
          }
        },
        headers: rendered.headerChildren.length ? { default: new Header({ children: rendered.headerChildren }) } : void 0,
        footers: rendered.footerChildren.length ? { default: new Footer({ children: rendered.footerChildren }) } : void 0,
        children: rendered.children
      }
    ]
  });
}

// vendor/genoffice-html2docx/src/generate/render-context.ts
var DEFAULT_PAGE_WIDTH_PX = 794;
var DEFAULT_PAGE_HEIGHT_PX = 1123;
var MARGIN_DXA = 1134;
function createRenderContext(docSettings = {}, options = {}) {
  const finiteOr = (v, fallback) => Number.isFinite(v) ? v : fallback;
  const marginsPx = docSettings.marginsPx || {};
  const marginPx = (v) => {
    const n = finiteOr(v, MARGIN_DXA / 15);
    return n < 0 ? MARGIN_DXA / 15 : n;
  };
  const pageDim = (v, fallback) => Number.isFinite(v) && v > 0 ? v : fallback;
  const pageWidthDxa = Math.max(
    1440,
    Math.round(pageDim(docSettings.pageSizePx?.width, DEFAULT_PAGE_WIDTH_PX) * 15)
  );
  const pageHeightDxa = Math.max(
    1440,
    Math.round(pageDim(docSettings.pageSizePx?.height, DEFAULT_PAGE_HEIGHT_PX) * 15)
  );
  const viewportW = finiteOr(docSettings.viewportWidthPx, 0);
  const baseScale = viewportW > 0 ? Math.min(1, pageWidthDxa / 15 / viewportW) : 1;
  const rawSqueeze = finiteOr(docSettings.pageFitSqueeze, 1);
  const squeeze = rawSqueeze > 0 && rawSqueeze <= 1 ? rawSqueeze : 1;
  const measurementScale = baseScale * squeeze;
  const fontScale = Math.min(1, baseScale * 1.04) * squeeze;
  const pxToTwips = (px) => Math.round(finiteOr(px, 0) * 15 * measurementScale);
  const pageMargins = {
    top: pxToTwips(marginPx(marginsPx.top)),
    bottom: pxToTwips(marginPx(marginsPx.bottom)),
    left: pxToTwips(marginPx(marginsPx.left)),
    right: pxToTwips(marginPx(marginsPx.right)),
    header: docSettings.composed ? 0 : void 0,
    footer: docSettings.composed ? 0 : void 0
  };
  return {
    pageWidthDxa,
    pageHeightDxa,
    pageMargins,
    // Each margin is clamped on its own, but two healthy ones can still add up
    // past the page width. A negative content width scales every downstream
    // extent (floating images included) negative, and Word reads that as a
    // corrupt file, so floor it at the 1in minimum the page width already uses.
    contentDxa: Math.max(1440, pageWidthDxa - pageMargins.left - pageMargins.right),
    measurementScale,
    fontScale,
    marginDxa: MARGIN_DXA,
    pxToHalfPoints: (px) => Math.round(finiteOr(px, 0) * 1.5 * fontScale),
    pxToTwips,
    pxToBorderEighths: (px) => Math.max(4, Math.round(finiteOr(px, 0) * 6 * measurementScale)),
    naturalTableWidth: Boolean(options.naturalTableWidth)
  };
}

// vendor/genoffice-html2docx/src/generate/content-controls.ts
function createContentControlFactory(startId = 1e3) {
  let nextId = startId;
  return function contentControl(node) {
    if (node.controlType === "checkbox") {
      return new CheckBox({
        alias: node.alias || node.name || "Checkbox",
        checked: Boolean(node.checked)
      });
    }
    if (node.controlType === "radio") {
      return new TextRun({ text: node.checked ? "\u25C9" : "\u25CB", noProof: true });
    }
    const sdt = new ImportedXmlComponent("w:sdt");
    const properties = new ImportedXmlComponent("w:sdtPr");
    if (node.alias || node.name) {
      properties.push(new ImportedXmlComponent("w:alias", { "w:val": node.alias || node.name }));
    }
    if (node.name) {
      properties.push(new ImportedXmlComponent("w:tag", { "w:val": node.name }));
    }
    properties.push(new ImportedXmlComponent("w:id", { "w:val": String(nextId++) }));
    if (node.controlType === "dropdown") {
      const dropdown = new ImportedXmlComponent("w:dropDownList");
      for (const option of node.options || []) {
        dropdown.push(
          new ImportedXmlComponent("w:listItem", {
            "w:displayText": option.label,
            "w:value": option.value
          })
        );
      }
      properties.push(dropdown);
    } else {
      properties.push(
        new ImportedXmlComponent("w:text", {
          "w:multiLine": node.controlType === "multiline" ? "1" : "0"
        })
      );
    }
    const content = new ImportedXmlComponent("w:sdtContent");
    content.push(
      new TextRun({
        text: node.value || "\xA0",
        noProof: true,
        // placeholder hints keep their authored light gray
        color: node.valueColor || void 0
      })
    );
    sdt.push(properties);
    sdt.push(content);
    return sdt;
  };
}

// vendor/genoffice-html2docx/src/generate/table-renderers.ts
function cellChildren(generator, entry, depth, cellDxa, { keepWithNext = generator.forceKeepNext } = {}) {
  const saved = generator.avail;
  const savedKeep = generator.suppressKeepNext;
  const savedForce = generator.forceKeepNext;
  if (cellDxa) generator.avail = Math.max(300, cellDxa);
  generator.suppressKeepNext = !keepWithNext;
  generator.forceKeepNext = keepWithNext;
  try {
    return cellChildrenInner(generator, entry, depth);
  } finally {
    generator.avail = saved;
    generator.suppressKeepNext = savedKeep;
    generator.forceKeepNext = savedForce;
  }
}
function cellChildrenInner(generator, entry, depth) {
  let children;
  if (entry.children) {
    const carried = entry.bookmarks?.length ? carryBookmarks(entry.children, entry.bookmarks) : null;
    children = generator.render(carried || entry.children, depth + 1);
  } else {
    const opts = paraOptions(generator.context, entry.style);
    const spacing = {
      ...opts.spacing || {},
      before: 0,
      after: 0
    };
    const align = entry.align === "center" ? AlignmentType.CENTER : entry.align === "right" ? AlignmentType.RIGHT : void 0;
    children = [
      new Paragraph({
        children: withBookmarks(
          makeRuns(generator.context, entry.runs || [], generator.images),
          entry.bookmarks
        ),
        alignment: align,
        bidirectional: entry.rtl || void 0,
        ...opts,
        keepNext: generator.forceKeepNext || opts.keepNext || void 0,
        spacing
      })
    ];
  }
  if (!children.length) {
    children = [new Paragraph({ keepNext: generator.forceKeepNext || void 0 })];
  }
  return children;
}
function renderTable(generator, node, depth) {
  const context = generator.context;
  if (node.splitPerRow && node.rows.length > 1) {
    return node.rows.flatMap(
      (row) => renderTable(generator, { ...node, splitPerRow: false, rows: [row] }, depth)
    );
  }
  if (node.pageColumns) return renderPageColumns(generator, node, depth);
  const totalPx = (node.colWidths || []).reduce((a, b) => a + b, 0) || 1;
  const tableDxa = context.naturalTableWidth ? Math.min(generator.avail, context.pxToTwips(totalPx)) : generator.avail;
  const colDxa = (node.colWidths || []).map((w) => Math.round(w / totalPx * tableDxa));
  if (colDxa.length > 1) {
    const floors = colDxa.map(() => 0);
    for (const row of node.rows) {
      for (const cell of row.cells) {
        if (!cell.oneLineWidthPx || (cell.colspan || 1) > 1) continue;
        const col = cell.gridStart ?? row.cells.indexOf(cell);
        if (col < 0 || col >= floors.length) continue;
        const pad = cell.padPx || {};
        const needDxa = context.pxToTwips(Math.round(cell.oneLineWidthPx * 1.1)) + context.pxToTwips((pad.left ?? 6) + (pad.right ?? 6)) + 120;
        floors[col] = Math.max(floors[col], needDxa);
      }
    }
    const cellHasText = (cell, depth2 = 0) => {
      if (depth2 > 3 || !cell || typeof cell !== "object") return false;
      if ((cell.runs || []).some((run) => (run.text || "").trim().length >= 2)) return true;
      return (cell.children || []).some((child) => cellHasText(child, depth2 + 1));
    };
    const TEXT_COL_FLOOR_DXA = 800;
    for (const row of node.rows) {
      for (const cell of row.cells) {
        if ((cell.colspan || 1) > 1 || !cellHasText(cell)) continue;
        const col = cell.gridStart ?? row.cells.indexOf(cell);
        if (col < 0 || col >= floors.length) continue;
        floors[col] = Math.max(floors[col], TEXT_COL_FLOOR_DXA);
      }
    }
    floors.forEach((floor, col) => {
      if (!floor || colDxa[col] >= floor) return;
      let deficit = floor - colDxa[col];
      const donors = colDxa.map((w, j) => ({ j, slack: j === col ? 0 : w - Math.max(600, floors[j]) })).filter((d) => d.slack > 0).sort((a, b) => b.slack - a.slack);
      for (const donor of donors) {
        if (deficit <= 0) break;
        const take = Math.min(deficit, donor.slack);
        colDxa[donor.j] -= take;
        deficit -= take;
      }
      colDxa[col] = floor - Math.max(0, deficit);
    });
  }
  const layout = Boolean(node.layout);
  const keepWhole = !layout && !node.checklist && node.rows.length > 1 && (node.heightPx || 0) > 0 && node.heightPx <= 850;
  const padScale = 1;
  const border = NO_BORDER;
  const rowGap = node.rowGapPx ? context.pxToTwips(node.rowGapPx) : 0;
  const pageContentDxa = context.pageHeightDxa - context.pageMargins.top - context.pageMargins.bottom;
  const rows = node.rows.map((row, rowIdx) => {
    const tallerThanPage = row.heightPx && context.pxToTwips(row.heightPx) > pageContentDxa - 900;
    return new TableRow({
      cantSplit: layout ? node.noSplit || void 0 : tallerThanPage ? void 0 : true,
      tableHeader: !node.noHeader && row.header || void 0,
      // Always ATLEAST: EXACT clips lines when Word wraps text differently
      // than the browser measurement (see kpirow note below).
      // Cap the minimum height below one page: a row whose declared floor
      // exceeds the page can never be placed and strands a blank page
      // before it; the content still sets the real rendered height.
      height: row.heightPx && !tallerThanPage ? {
        value: Math.min(context.pxToTwips(row.heightPx), pageContentDxa - 900),
        rule: HeightRule.ATLEAST
      } : void 0,
      children: row.cells.map((cell, ci) => {
        const gridStart = cell.gridStart ?? row.cells.slice(0, ci).reduce((sum, previous) => sum + (previous.colspan || 1), 0);
        const cellDxa = colDxa.slice(gridStart, gridStart + (cell.colspan || 1)).reduce((sum, width) => sum + width, 0);
        if (cell.bold && cell.runs) cell.runs = cell.runs.map((r) => ({ ...r, bold: true }));
        const cellBorders = {};
        for (const side of ["top", "bottom", "left", "right"]) {
          cellBorders[side] = cell.borders ? wordBorder(context, cell.borders[side]) : border;
        }
        if (node.outerBorder) {
          if (rowIdx === 0 && node.outerBorder.top) {
            cellBorders.top = wordBorder(context, node.outerBorder.top);
          }
          if (rowIdx === node.rows.length - 1 && node.outerBorder.bottom) {
            cellBorders.bottom = wordBorder(context, node.outerBorder.bottom);
          }
          if (ci === 0 && node.outerBorder.left) {
            cellBorders.left = wordBorder(context, node.outerBorder.left);
          }
          if (ci === row.cells.length - 1 && node.outerBorder.right) {
            cellBorders.right = wordBorder(context, node.outerBorder.right);
          }
        }
        const pad = cell.padPx || {};
        const tablePad = node.padPx || {};
        return new TableCell({
          children: cellChildren(generator, cell, depth, cellDxa, {
            keepWithNext: keepWhole && rowIdx < node.rows.length - 1
          }),
          width: cellDxa ? { size: cellDxa, type: WidthType.DXA } : void 0,
          columnSpan: cell.colspan > 1 ? cell.colspan : void 0,
          verticalMerge: cell.verticalMerge === "restart" ? VerticalMergeType.RESTART : cell.verticalMerge === "continue" ? VerticalMergeType.CONTINUE : void 0,
          shading: cell.shading || node.shading ? { type: ShadingType.CLEAR, fill: cell.shading || node.shading } : void 0,
          borders: cellBorders,
          verticalAlign: cell.vAlign === "center" ? VerticalAlign.CENTER : cell.vAlign === "bottom" ? VerticalAlign.BOTTOM : void 0,
          margins: layout ? {
            top: cell.shading ? 40 : 0,
            bottom: rowIdx < node.rows.length - 1 ? rowGap : 0,
            left: cell.shading ? 60 : 0,
            // shaded layout cells (planner headers) form contiguous bars
            right: cell.shading ? 60 : 200
          } : {
            top: context.pxToTwips(
              (pad.top ?? 4) * padScale + (rowIdx === 0 ? tablePad.top || 0 : 0)
            ),
            bottom: context.pxToTwips(
              (pad.bottom ?? 4) * padScale + (rowIdx === node.rows.length - 1 ? tablePad.bottom || 0 : 0)
            ),
            left: context.pxToTwips(
              (pad.left ?? 6) * padScale + (ci === 0 ? tablePad.left || 0 : 0)
            ),
            right: context.pxToTwips(
              (pad.right ?? 6) * padScale + (ci === row.cells.length - 1 ? tablePad.right || 0 : 0)
            )
          }
        });
      })
    });
  });
  const output = [];
  if (node.spacingBeforePx) {
    output.push(spacerParagraph(context, node.spacingBeforePx, { shading: node.ambientShading }));
  }
  output.push(
    new Table({
      borders: NO_TABLE_BORDERS,
      rows,
      width: { size: tableDxa, type: WidthType.DXA },
      columnWidths: colDxa.length ? colDxa : void 0,
      layout: TableLayoutType.FIXED,
      // RTL source table: first DOM cell renders rightmost, same as browser
      visuallyRightToLeft: node.rtl || void 0
    }),
    // required separator paragraph after a table
    spacerParagraph(context, node.spacingAfterPx ?? 8, { shading: node.ambientShading })
  );
  return output;
}
function stripLeadingKeep(cell) {
  const children = cell.children || [];
  const index = children.findIndex((n) => n.type !== "spacer");
  const first = children[index];
  if (!first || first.type !== "heading" && !first.style?.keepNext) return cell;
  return {
    ...cell,
    children: [
      ...children.slice(0, index),
      { ...first, style: { ...first.style, keepNext: false } },
      ...children.slice(index + 1)
    ]
  };
}
function renderPageColumns(generator, node, depth) {
  const context = generator.context;
  const tableDxa = generator.avail;
  const totalPx = (node.colWidths || []).reduce((a, b) => a + b, 0) || 1;
  const colDxa = (node.colWidths || []).map((w) => Math.round(w / totalPx * tableDxa));
  return [
    new Table({
      borders: NO_TABLE_BORDERS,
      // FIXED, or Word autofits: a cell whose image is naturally wider than
      // its column expands the column past the page edge and clips it
      layout: TableLayoutType.FIXED,
      rows: node.rows.map(
        (row) => new TableRow({
          children: row.cells.map((cell, ci) => {
            const pad = cell.padPx || {};
            const leftMargin = context.pxToTwips(pad.left || 0);
            const rightMargin = Math.max(
              context.pxToTwips(pad.right || 0),
              context.pxToTwips(cell.gapAfterPx || 0)
            );
            const columnChildren = cellChildren(
              generator,
              stripLeadingKeep(cell),
              depth,
              Math.max(240, colDxa[ci] - leftMargin - rightMargin)
            );
            while (columnChildren.length > 1 && columnChildren[columnChildren.length - 1]?.__h2dSpacerPx) {
              columnChildren.pop();
            }
            if (!(columnChildren[columnChildren.length - 1] instanceof Paragraph)) {
              columnChildren.push(
                new Paragraph({
                  children: [],
                  spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
                })
              );
            }
            return new TableCell({
              children: columnChildren,
              width: { size: colDxa[ci], type: WidthType.DXA },
              shading: cell.shading ? { type: ShadingType.CLEAR, fill: cell.shading } : void 0,
              borders: {
                ...NO_BORDERS,
                ...cell.borderLeft ? { left: wordBorder(context, cell.borderLeft) } : {},
                ...cell.borderRight ? { right: wordBorder(context, cell.borderRight) } : {}
              },
              margins: {
                top: context.pxToTwips(pad.top || 0),
                bottom: 60,
                left: leftMargin,
                right: rightMargin
              }
            });
          })
        })
      ),
      width: { size: tableDxa, type: WidthType.DXA },
      columnWidths: colDxa.length ? colDxa : void 0
    }),
    spacerParagraph(context, 8)
  ];
}
function isLightShading(hex) {
  if (!hex) return true;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  return [0, 2, 4].every((i) => parseInt(hex.slice(i, i + 2), 16) >= 221);
}
var FLOW_CHILD_TYPES = /* @__PURE__ */ new Set(["para", "heading", "list", "spacer", "hr"]);
function cardShouldFlatten(node, depth) {
  if (depth !== 0 || !node.allowSplit || (node.heightPx || 0) <= 561 || // > half a page: keep-whole wastes more than it protects
  !Array.isArray(node.children) || node.children.length <= 1 || node.border || !isLightShading(node.shading)) {
    return false;
  }
  if (node.children.some((child) => child.type === "table" || child.type === "kpirow")) {
    return true;
  }
  return node.children.every((child) => FLOW_CHILD_TYPES.has(child.type));
}
function cardOverlays(generator, node) {
  return (node.children || []).filter(
    (child) => child?.type === "floatimg" && child.inParent && generator.images[child.shotId]
  );
}
function withCardShading(child, shading, borderLeft = null) {
  switch (child.type) {
    case "spacer":
      return {
        ...child,
        shading: child.shading ?? shading,
        borderLeft: child.borderLeft ?? borderLeft
      };
    case "list":
      return {
        ...child,
        items: (child.items || []).map(
          (item) => Array.isArray(item) ? { runs: item, style: { shading, borderLeft } } : {
            ...item,
            style: {
              ...item.style,
              shading: item.style?.shading ?? shading,
              borderLeft: item.style?.borderLeft ?? borderLeft
            }
          }
        )
      };
    case "kpirow":
      return {
        ...child,
        ambientShading: shading,
        gapShading: child.gapShading ?? shading,
        cells: (child.cells || []).map((cell) => ({
          ...cell,
          shading: cell.shading ?? shading
        }))
      };
    case "table":
      return { ...child, ambientShading: shading, shading: child.shading ?? shading };
    case "card":
    case "hr":
      return { ...child, ambientShading: shading };
    default:
      return child;
  }
}
function renderCardFlattened(generator, node, depth) {
  const context = generator.context;
  const pad = node.padPx || {};
  const shading = node.shading;
  const insetPx = shading ? 0 : Math.min(24, pad.left ?? 8);
  const overlays = cardOverlays(generator, node);
  const colPx = generator.avail / 15;
  const overlayPadNeed = overlays.reduce((need, ov) => {
    const rel = ov.inParent;
    if (rel.yPx >= (pad.top ?? 0)) return need;
    const parentContentW = Math.max(1, rel.parentWpx - (pad.left ?? 8) - (pad.right ?? 8));
    const scale = Math.min(1, colPx / parentContentW);
    return Math.max(need, rel.yPx + Math.round(ov.height * scale) + 8);
  }, 0);
  const padTopCapPx = pad.top > 2 ? Math.min(pad.top, Math.max(24, overlayPadNeed)) : 0;
  const railBorder = node.borderLeft || null;
  const children = node.children.filter((child) => !overlays.includes(child)).flatMap((child) => {
    if (child.type === "para" || child.type === "heading") {
      const style = {
        ...child.style,
        shading: child.style?.shading ?? shading ?? void 0,
        indentLeftPx: (child.style?.indentLeftPx || 0) + insetPx
      };
      if (railBorder) {
        style.borderLeft = style.borderLeft ?? railBorder;
        style.borderLeftSpacePx = style.borderLeftSpacePx ?? Math.min(24, pad.left ?? 8);
      }
      if (!shading && !railBorder) return [{ ...child, style }];
      const out = [];
      if (style.spacingBeforePx) {
        out.push({ type: "spacer", px: style.spacingBeforePx, shading, borderLeft: railBorder });
        style.spacingBeforePx = 0;
      }
      const trailing = style.spacingAfterPx;
      style.spacingAfterPx = 0;
      out.push({ ...child, style });
      if (trailing) out.push({ type: "spacer", px: trailing, shading, borderLeft: railBorder });
      return out;
    }
    return [shading || railBorder ? withCardShading(child, shading, railBorder) : child];
  });
  const output = [];
  if (node.spacingBeforePx) output.push(spacerParagraph(context, node.spacingBeforePx));
  if (overlays.length) {
    output.push(cardOverlayParagraph(generator, node, overlays, colPx, { padTopCapPx }));
  }
  if (padTopCapPx) {
    output.push(spacerParagraph(context, padTopCapPx, { shading, borderLeft: railBorder }));
  }
  output.push(...generator.render(children, depth + 1));
  if (pad.bottom > 2) {
    output.push(
      spacerParagraph(context, Math.min(pad.bottom, 24), { shading, borderLeft: railBorder })
    );
  }
  if (node.spacingAfterPx) output.push(spacerParagraph(context, node.spacingAfterPx));
  return output;
}
function cardOverlayParagraph(generator, node, overlays, colPx, { padTopCapPx = null } = {}) {
  const EMU_PER_PX = 9525;
  const pad = node.padPx || {};
  const runs = overlays.map((ov) => {
    const rel = ov.inParent;
    const parentContentW = Math.max(1, rel.parentWpx - (pad.left ?? 8) - (pad.right ?? 8));
    const scale = Math.min(1, colPx / parentContentW);
    const width = Math.max(1, Math.round(ov.width * scale));
    const height = Math.max(1, Math.round(ov.height * scale));
    const x = Math.max(
      0,
      Math.min(Math.round((rel.xPx - (pad.left ?? 8)) * scale), Math.round(colPx - width))
    );
    const padT = pad.top ?? 8;
    const y = padTopCapPx !== null && padT > 0 ? rel.yPx <= padT ? Math.max(0, Math.round(rel.yPx * padTopCapPx / padT)) : Math.round(rel.yPx - padT + padTopCapPx) : Math.max(0, Math.round(rel.yPx - padT));
    return new ImageRun({
      type: "png",
      data: generator.images[ov.shotId],
      transformation: { width, height },
      floating: {
        horizontalPosition: { relative: "column", offset: x * EMU_PER_PX },
        verticalPosition: { relative: "paragraph", offset: y * EMU_PER_PX },
        wrap: { type: TextWrappingType.NONE },
        allowOverlap: true
      }
    });
  });
  return new Paragraph({
    children: runs,
    spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
  });
}
function renderCard(generator, node, depth) {
  const context = generator.context;
  const cardDxa = node.widthPx ? Math.min(generator.avail, Math.max(240, context.pxToTwips(node.widthPx))) : generator.avail;
  if (node.bookmarks?.length) {
    const carried = carryBookmarks(node.children, node.bookmarks);
    if (carried) node = { ...node, children: carried, bookmarks: [] };
  }
  if (depth >= 3) return generator.render(node.children, depth);
  if (cardShouldFlatten(node, depth)) return renderCardFlattened(generator, node, depth);
  const overlays = cardOverlays(generator, node);
  if (overlays.length) {
    node = { ...node, children: node.children.filter((child) => !overlays.includes(child)) };
  }
  const output = [];
  const spacingBefore = (node.heightPx || 0) > 700 && !node.allowSplit ? Math.min(node.spacingBeforePx || 0, 8) : node.spacingBeforePx;
  if (spacingBefore) {
    output.push(spacerParagraph(context, spacingBefore, { shading: node.ambientShading }));
  }
  const borders = { ...NO_BORDERS };
  if (node.border && (node.radiusPx || 0) <= 12) {
    const b = {
      style: BorderStyle.SINGLE,
      // A scaled 1px CSS card border otherwise falls to 0.5pt and becomes
      // nearly invisible in Word at common zoom levels.
      size: Math.max(6, context.pxToBorderEighths(node.border.widthPx)),
      color: node.border.color
    };
    borders.top = b;
    borders.bottom = b;
    borders.left = b;
    borders.right = b;
  }
  if (node.borderLeft) {
    borders.left = {
      style: BorderStyle.SINGLE,
      size: context.pxToBorderEighths(node.borderLeft.widthPx),
      color: node.borderLeft.color
    };
  }
  if (node.borderRight) {
    borders.right = {
      style: BorderStyle.SINGLE,
      size: context.pxToBorderEighths(node.borderRight.widthPx),
      color: node.borderRight.color
    };
  }
  if (node.borderTop) {
    borders.top = {
      style: BorderStyle.SINGLE,
      size: context.pxToBorderEighths(node.borderTop.widthPx),
      color: node.borderTop.color
    };
  }
  const pad = node.padPx || {};
  const cellMargins = {
    top: context.pxToTwips(pad.top ?? 8),
    bottom: context.pxToTwips(pad.bottom ?? 8),
    left: context.pxToTwips(pad.left ?? 8),
    right: context.pxToTwips(pad.right ?? 8)
  };
  const cellKids = cellChildren(
    generator,
    node,
    depth,
    Math.max(240, cardDxa - cellMargins.left - cellMargins.right - 80)
  );
  if (overlays.length) {
    cellKids.unshift(
      cardOverlayParagraph(
        generator,
        node,
        overlays,
        (cardDxa - cellMargins.left - cellMargins.right) / 15
      )
    );
  }
  output.push(
    new Table({
      borders: NO_TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: node.allowSplit ? void 0 : true,
          children: [
            new TableCell({
              children: cellKids,
              // Explicit tcW: a fixed-layout nested table without it
              // collapses to its minimum width in Word for Mac.
              width: { size: cardDxa, type: WidthType.DXA },
              shading: node.shading ? { type: ShadingType.CLEAR, fill: node.shading } : void 0,
              borders,
              margins: cellMargins
            })
          ]
        })
      ],
      width: { size: cardDxa, type: WidthType.DXA },
      // Fixed layout: with autofit, one unbreakable inner run (fill-in
      // blanks, screenshots) re-widens the card past its container and Word
      // shoves the whole card sideways off the cell.
      layout: TableLayoutType.FIXED,
      columnWidths: [cardDxa],
      // Word hangs a table border 3pt into the left margin even with tblInd=0.
      // Cancel that renderer offset so top-level card borders align with
      // adjacent paragraphs, matching the browser box model.
      indent: depth === 0 ? { size: 60, type: WidthType.DXA } : void 0
    })
  );
  if ((node.spacingAfterPx ?? 8) > 0) {
    output.push(
      spacerParagraph(context, node.spacingAfterPx ?? 8, { shading: node.ambientShading })
    );
  }
  return output;
}
function renderColorBar(generator, node) {
  const context = generator.context;
  const style = node.style;
  const out = [];
  if (style.spacingBeforePx) out.push(spacerParagraph(context, style.spacingBeforePx));
  const align = style.align === "center" ? AlignmentType.CENTER : style.align === "right" ? AlignmentType.RIGHT : void 0;
  out.push(
    new Table({
      borders: NO_TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          height: { value: context.pxToTwips(style.exactLineHeightPx), rule: HeightRule.EXACT },
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: withBookmarks(
                    makeRuns(context, node.runs, generator.images),
                    node.bookmarks
                  ),
                  alignment: align,
                  bidirectional: style.rtl || void 0,
                  // header bars must not dangle at a page bottom while their
                  // card body starts on the next page
                  keepNext: true,
                  spacing: {
                    before: 0,
                    after: 0,
                    line: context.pxToTwips(style.exactLineHeightPx),
                    lineRule: LineRuleType.EXACT
                  }
                })
              ],
              shading: { type: ShadingType.CLEAR, fill: style.shading },
              borders: NO_BORDERS,
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 0,
                bottom: 0,
                left: style.barInsetLeftPx ? context.pxToTwips(style.barInsetLeftPx) : 60,
                right: 60
              }
            })
          ]
        })
      ],
      width: { size: generator.avail, type: WidthType.DXA },
      columnWidths: [generator.avail]
    })
  );
  out.push(spacerParagraph(context, style.spacingAfterPx || 4, { keepNext: true }));
  return out;
}
function renderKpiRow(generator, node, depth) {
  const context = generator.context;
  if (depth >= 3) {
    const isInlineBox = (kid) => kid.type === "formfield" && (kid.controlType === "checkbox" || kid.controlType === "radio" || kid.mode === "box" && (kid.width || 99) <= 20 && (kid.height || 99) <= 20);
    const inlineCellPara = (cell) => {
      const kids = cell.children || [];
      if (kids.length === 2 && isInlineBox(kids[0]) && kids[1].type === "para") {
        return {
          type: "para",
          runs: [
            { text: "", contentControl: "checkbox", checked: kids[0].checked },
            { text: " " },
            ...kids[1].runs
          ],
          style: kids[1].style || {}
        };
      }
      if (kids.length !== 1) return null;
      const kid = kids[0];
      if (kid.type === "para") return kid;
      if (isInlineBox(kid)) {
        return {
          type: "para",
          runs: [{ text: "", contentControl: "checkbox", checked: kid.checked }],
          style: {}
        };
      }
      if (kid.type === "kpirow") {
        const parts = (kid.cells || []).map(inlineCellPara);
        if (!parts.length || parts.some((part) => !part)) return null;
        const runs = [];
        parts.forEach((part, i) => {
          if (i > 0) runs.push({ text: " " });
          runs.push(...part.runs);
        });
        const {
          shading: _shading,
          colorBar: _colorBar,
          exactLineHeightPx: _exactLineHeightPx,
          ...style
        } = parts.find((part) => part.style && Object.keys(part.style).length)?.style || {};
        return { type: "para", runs, style };
      }
      return null;
    };
    const singleParas = node.cells.map(inlineCellPara);
    const inlineable = node.cells.length > 1 && singleParas.every(
      (p) => p && (p.runs || []).reduce((n, r) => n + (r.text || "").length, 0) <= 30
    );
    let flow;
    if (inlineable) {
      const runs = [];
      singleParas.forEach((p, i) => {
        if (i > 0) runs.push({ text: "  ", style: {} });
        runs.push(...p.runs);
      });
      const {
        shading: _shading,
        colorBar: _colorBar,
        exactLineHeightPx: _exactLineHeightPx,
        ...style
      } = singleParas[0].style || {};
      flow = [{ type: "para", runs, style }];
    } else {
      flow = node.cells.flatMap((cell) => cell.children || []);
      const icon = singleParas[0];
      if (icon && (icon.runs || []).reduce((n, r) => n + (r.text || "").length, 0) <= 4 && flow[1] && flow[1].type === "para") {
        flow = flow.slice(1);
        flow[0] = { ...flow[0], runs: [...icon.runs, { text: " ", style: {} }, ...flow[0].runs] };
      }
    }
    if (node.rowBorder || node.rowShading) {
      return renderCard(
        generator,
        {
          type: "card",
          children: flow,
          border: node.rowBorder,
          shading: node.rowShading,
          padPx: node.padPx,
          spacingBeforePx: node.spacingBeforePx,
          spacingAfterPx: node.spacingAfterPx
        },
        depth
      );
    }
    return generator.render(flow, depth);
  }
  const tracks = [];
  const useExplicitGaps = Boolean(node.explicitGaps || node.separateCells);
  if (useExplicitGaps) {
    const [leadingGap] = node.outerGapWidths || [0, 0];
    if (leadingGap >= 2) tracks.push({ gap: true, widthPx: leadingGap });
    node.cells.forEach((cell, index) => {
      tracks.push({ cell, widthPx: node.itemWidths[index] });
      if (index < node.cells.length - 1 && node.gapWidths[index] >= 2) {
        tracks.push({ gap: true, widthPx: node.gapWidths[index] });
      }
    });
    const last = tracks.length - 1;
    if (last >= 1 && tracks[last - 1]?.gap && !tracks[last].gap) {
      const firstChild = tracks[last].cell?.children?.[0];
      if (firstChild?.style?.align === "right") {
        tracks[last].widthPx += tracks[last - 1].widthPx;
        tracks.splice(last - 1, 1);
      }
    }
  } else {
    node.cells.forEach((cell, index) => {
      tracks.push({ cell, widthPx: node.colWidths?.[index] || 1 });
    });
  }
  let colDxa;
  if (useExplicitGaps) {
    colDxa = tracks.map((track) => context.pxToTwips(track.widthPx));
    const sum = colDxa.reduce((a, b) => a + b, 0) || 1;
    if (sum > generator.avail) {
      const contentSum = tracks.reduce((acc, track, i) => track.gap ? acc : acc + colDxa[i], 0);
      const gapSum = sum - contentSum;
      if (contentSum <= generator.avail && gapSum > 0) {
        const gapScale = Math.max(0, generator.avail - contentSum) / gapSum;
        colDxa = tracks.map(
          (track, i) => track.gap ? Math.max(0, Math.round(colDxa[i] * gapScale)) : colDxa[i]
        );
      } else {
        const scale = generator.avail / sum;
        colDxa = colDxa.map((w) => Math.max(40, Math.round(w * scale)));
      }
    }
  } else {
    const totalPx = tracks.reduce((sum, track) => sum + track.widthPx, 0) || 1;
    colDxa = tracks.map((track) => Math.round(track.widthPx / totalPx * generator.avail));
  }
  const oneLineNeedDxa = (track) => {
    if (track.gap || !track.cell) return 0;
    const needPx = Math.max(
      0,
      ...(track.cell.children || []).map((child) => child.style?.oneLineWidthPx || 0)
    );
    const cellText = (track.cell.children || []).flatMap((child) => child.runs || []).map((run) => run.text || "").join("").trim();
    const marginAllowance = cellText.length > 0 && cellText.length <= 5 ? 420 : 260;
    return needPx ? context.pxToTwips(Math.round(needPx * 1.1)) + marginAllowance : 0;
  };
  tracks.forEach((track, index) => {
    const needDxa = oneLineNeedDxa(track);
    if (process.env.H2D_DEBUG_KPI && needDxa)
      console.error(
        "[kpi]",
        JSON.stringify({
          index,
          needDxa,
          colDxa,
          avail: generator.avail,
          text: (track.cell?.children || []).flatMap((c) => c.runs || []).map((r) => r.text).join("").slice(0, 20)
        })
      );
    if (!needDxa || needDxa <= colDxa[index]) return;
    let deficit = needDxa - colDxa[index];
    for (let g = 0; g < tracks.length && deficit > 0; g++) {
      if (!tracks[g].gap) continue;
      const take = Math.min(deficit, Math.max(0, colDxa[g] - 60));
      colDxa[g] -= take;
      deficit -= take;
    }
    if (deficit > 0) {
      const rowSum = colDxa.reduce((a, b) => a + b, 0);
      deficit -= Math.min(deficit, Math.max(0, generator.avail - rowSum));
    }
    if (deficit > 0) {
      let widest = -1;
      tracks.forEach((sibling, j) => {
        if (sibling.gap || !sibling.cell || j === index) return;
        if (widest < 0 || colDxa[j] > colDxa[widest]) widest = j;
      });
      if (widest >= 0) {
        const siblingFloor = Math.max(600, oneLineNeedDxa(tracks[widest]));
        const take = Math.min(deficit, Math.max(0, colDxa[widest] - siblingFloor));
        colDxa[widest] -= take;
        deficit -= take;
      }
    }
    colDxa[index] += needDxa - colDxa[index] - Math.max(0, deficit);
  });
  const output = [];
  if (node.spacingBeforePx) {
    output.push(spacerParagraph(context, node.spacingBeforePx, { shading: node.ambientShading }));
  }
  output.push(
    new Table({
      borders: NO_TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          // ATLEAST, not EXACT: Word wraps text at slightly different points
          // than the browser; an exact browser-measured height clips the
          // overflowing lines (truncated dates / vanishing second lines).
          height: node.heightPx ? {
            value: Math.min(
              context.pxToTwips(node.heightPx),
              context.pageHeightDxa - context.pageMargins.top - context.pageMargins.bottom - 900
            ),
            rule: HeightRule.ATLEAST
          } : void 0,
          children: tracks.map((track, ci) => {
            const accent = ci === 0 && node.rowBorderLeft ? {
              style: BorderStyle.SINGLE,
              size: context.pxToBorderEighths(node.rowBorderLeft.widthPx),
              color: node.rowBorderLeft.color
            } : null;
            const frame = node.rowBorder ? {
              style: BorderStyle.SINGLE,
              size: Math.max(6, context.pxToBorderEighths(node.rowBorder.widthPx)),
              color: node.rowBorder.color
            } : null;
            const frameBorders = (base) => {
              if (!frame) return base;
              const out = { ...base, top: frame, bottom: frame };
              if (ci === 0) out.left = frame;
              if (ci === tracks.length - 1) out.right = frame;
              return out;
            };
            if (track.gap) {
              return new TableCell({
                children: [new Paragraph({})],
                width: { size: colDxa[ci], type: WidthType.DXA },
                shading: node.gapShading ? { type: ShadingType.CLEAR, fill: node.gapShading } : void 0,
                borders: frameBorders(accent ? { ...NO_BORDERS, left: accent } : NO_BORDERS),
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
              });
            }
            const cell = track.cell;
            const kids = cell.children || [];
            const loneCard = kids.length === 1 && kids[0].type === "card" && !kids[0].widthPx && !kids[0].borderLeft && !kids[0].borderRight && !kids[0].borderTop && !cell.shading ? kids[0] : null;
            const cellEntry = loneCard ? { ...cell, children: loneCard.children } : cell;
            let borders = { ...NO_BORDERS };
            if (accent) borders.left = accent;
            const fullBorder = loneCard?.border || cell.border;
            if (fullBorder) {
              const b = {
                style: BorderStyle.SINGLE,
                size: context.pxToBorderEighths(fullBorder.widthPx),
                color: fullBorder.color
              };
              borders.top = b;
              borders.bottom = b;
              borders.left = b;
              borders.right = b;
            }
            if (cell.borderTop) {
              borders.top = {
                style: BorderStyle.SINGLE,
                size: context.pxToBorderEighths(cell.borderTop.widthPx),
                color: cell.borderTop.color
              };
            }
            borders = frameBorders(borders);
            const cellMargins = loneCard ? {
              top: context.pxToTwips(loneCard.padPx?.top ?? 8),
              bottom: context.pxToTwips(loneCard.padPx?.bottom ?? 8),
              left: context.pxToTwips(loneCard.padPx?.left ?? 8),
              right: context.pxToTwips(loneCard.padPx?.right ?? 8)
            } : {
              top: context.pxToTwips(node.padPx?.top || 0),
              bottom: context.pxToTwips(node.padPx?.bottom || 0),
              // With explicit gap tracks the cell width equals the child's
              // rendered box; side margins would steal ~19px and wrap short
              // labels ("Position:" -> "Positio / n:"). Gap columns already
              // provide the separation.
              left: node.compact || node.explicitGaps ? 20 : 140,
              right: node.compact || node.explicitGaps ? 20 : 140
            };
            return new TableCell({
              children: cellChildren(
                generator,
                cellEntry,
                depth,
                colDxa[ci] - (loneCard ? cellMargins.left + cellMargins.right : 0)
              ),
              width: { size: colDxa[ci], type: WidthType.DXA },
              shading: loneCard?.shading ?? cell.shading ? { type: ShadingType.CLEAR, fill: loneCard?.shading ?? cell.shading } : void 0,
              borders,
              verticalAlign: node.vAlign === "center" || cell.vAlign === "center" ? VerticalAlign.CENTER : void 0,
              margins: cellMargins
            });
          })
        })
      ],
      width: { size: colDxa.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: colDxa,
      layout: TableLayoutType.FIXED
    }),
    spacerParagraph(context, Math.max(1, node.spacingAfterPx ?? 8), {
      shading: node.ambientShading
    })
  );
  return output;
}

// vendor/genoffice-html2docx/src/generate/renderer.ts
function splitVerticalBorderSpacing(style = {}) {
  if (!style.borderLeft && !style.borderRight) {
    return { paragraphStyle: style, spacingAfterPx: 0, spacingBeforePx: 0 };
  }
  const spacingBeforePx = style.spacingBeforePx || 0;
  const spacingAfterPx = style.spacingAfterPx || 0;
  return {
    paragraphStyle: {
      ...style,
      spacingBeforePx: 0,
      spacingAfterPx: 0
    },
    spacingAfterPx,
    spacingBeforePx
  };
}
function finitePx2(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}
function withExternalBorderSpacing(context, paragraph, spacingBeforePx, spacingAfterPx, shading = null) {
  const output = [];
  if (spacingBeforePx) output.push(spacerParagraph(context, spacingBeforePx, { shading }));
  output.push(paragraph);
  if (spacingAfterPx) output.push(spacerParagraph(context, spacingAfterPx, { shading }));
  return output;
}
var Generator = class {
  constructor(images, context) {
    this.images = images;
    this.context = context;
    this.contentControl = createContentControlFactory();
    this.avail = context.contentDxa;
    this.floats = [];
    this.pageBackgroundFloat = null;
    this.olInstance = 0;
    this.suppressKeepNext = false;
    this.forceKeepNext = false;
  }
  render(nodes, depth = 0) {
    const out = [];
    let chainActive = false;
    let ledeAllowance = 0;
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      let rendered;
      if (!this.suppressKeepNext && node.type === "para" && nodes[index + 1]?.type === "spacer" && nodes[index + 1].bindsNeighbors) {
        rendered = this.renderNode({ ...node, style: { ...node.style, keepNext: true } }, depth);
        chainActive = false;
      } else if (node.type === "spacer" && nodes[index + 1]?.type === "card" && (nodes[index + 1].heightPx || 0) > 700) {
        rendered = [
          spacerParagraph(this.context, Math.min(node.px, 8), {
            keepNext: chainActive,
            shading: node.shading
          })
        ];
      } else if ((chainActive || node.bindsNeighbors && !this.suppressKeepNext) && node.type === "spacer") {
        rendered = [
          spacerParagraph(this.context, node.px, { keepNext: true, shading: node.shading })
        ];
      } else if (chainActive && node.type === "para" && ledeAllowance > 0) {
        let next = index + 1;
        while (next < nodes.length && nodes[next].type === "spacer") next += 1;
        if (next < nodes.length && nodes[next].type !== "heading") {
          ledeAllowance -= 1;
          rendered = this.renderNode({ ...node, style: { ...node.style, keepNext: true } }, depth);
        } else {
          rendered = this.renderNode(node, depth);
          chainActive = false;
        }
      } else {
        rendered = this.renderNode(node, depth);
        if (node.type === "heading" && !this.suppressKeepNext) {
          const last = rendered.length - 1;
          if (rendered[last]?.__h2dSpacerPx) {
            rendered[last] = spacerParagraph(this.context, rendered[last].__h2dSpacerPx, {
              keepNext: true,
              shading: rendered[last].__h2dSpacerShading,
              borderLeft: rendered[last].__h2dSpacerBorderLeft
            });
          }
        } else if (chainActive && rendered[0]?.__h2dSpacerPx) {
          rendered[0] = spacerParagraph(this.context, rendered[0].__h2dSpacerPx, {
            keepNext: true,
            shading: rendered[0].__h2dSpacerShading,
            borderLeft: rendered[0].__h2dSpacerBorderLeft
          });
        }
        if (node.type === "heading") {
          chainActive = !this.suppressKeepNext;
          ledeAllowance = 1;
        } else {
          chainActive = false;
        }
      }
      if (nodes[index + 1]?.type === "card" && (nodes[index + 1].heightPx || 0) > 700 && !nodes[index + 1].allowSplit) {
        const last = rendered.length - 1;
        if ((rendered[last]?.__h2dSpacerPx || 0) > 8) {
          rendered[last] = spacerParagraph(this.context, 8, {
            shading: rendered[last].__h2dSpacerShading
          });
        }
      }
      out.push(...rendered);
    }
    return out;
  }
  renderNode(node, depth) {
    const context = this.context;
    switch (node.type) {
      case "pagebreak":
        return [
          new Paragraph({
            children: [new PageBreak()],
            spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }
          })
        ];
      case "spacer":
        return [
          spacerParagraph(context, node.px, {
            keepNext: this.forceKeepNext,
            shading: node.shading,
            borderLeft: node.borderLeft
          })
        ];
      case "heading": {
        if (node.style?.shading && node.style?.colorBar) {
          return renderColorBar(this, node);
        }
        node = this.fitOneLineRuns(node);
        const { paragraphStyle, spacingAfterPx, spacingBeforePx } = splitVerticalBorderSpacing(
          node.style
        );
        const opts = paraOptions(context, paragraphStyle);
        opts.spacing = {
          ...opts.spacing,
          before: opts.spacing?.before ?? 0,
          after: opts.spacing?.after ?? 0
        };
        const stops = tabStopsFor(context, node.runs);
        if (stops.length) opts.tabStops = stops;
        return withExternalBorderSpacing(
          context,
          new Paragraph({
            heading: HEADING_LEVELS[Math.min(node.level, 6) - 1],
            children: withBookmarks(makeNodeRuns(context, node, this.images), node.bookmarks),
            keepNext: this.forceKeepNext ? true : node.style?.keepNext === false || this.suppressKeepNext ? void 0 : true,
            keepLines: true,
            ...opts
          }),
          spacingBeforePx,
          spacingAfterPx,
          paragraphStyle.shading
        );
      }
      case "para": {
        if (!node.runs.length) return [];
        if (node.style?.shading && node.style?.colorBar) {
          return renderColorBar(this, node);
        }
        node = this.fitFillInRuns(node);
        node = this.fitOneLineRuns(node);
        const { paragraphStyle, spacingAfterPx, spacingBeforePx } = splitVerticalBorderSpacing(
          node.style
        );
        const opts = paraOptions(context, paragraphStyle);
        const stops = tabStopsFor(context, node.runs);
        if (stops.length) opts.tabStops = stops;
        if (node.style?.bullet) {
          opts.numbering = { reference: "h2d-ul", level: 0 };
        }
        if (this.forceKeepNext || node.style?.keepNext && !this.suppressKeepNext) {
          opts.keepNext = true;
        }
        if (node.style?.keepLines) opts.keepLines = true;
        return withExternalBorderSpacing(
          context,
          new Paragraph({
            children: withBookmarks(makeNodeRuns(context, node, this.images), node.bookmarks),
            ...opts
          }),
          spacingBeforePx,
          spacingAfterPx,
          paragraphStyle.shading
        );
      }
      case "list": {
        const instanceByLevel = [];
        return node.items.map((entry) => {
          const item = Array.isArray(entry) ? { runs: entry, style: {} } : entry;
          const opts = paraOptions(context, item.style);
          const markerWidthPx = Math.max(10, Math.min(16, (item.runs[0]?.sizePx || 14) * 0.8));
          opts.indent = {
            left: context.pxToTwips(item.indentLeftPx || node.indentLeftPx || 22),
            hanging: context.pxToTwips(markerWidthPx)
          };
          if (node.rtl) opts.bidirectional = true;
          if (this.forceKeepNext) opts.keepNext = true;
          const ordered = item.ordered ?? node.ordered;
          const level = Math.max(0, Math.min(8, item.level || 0));
          if (level < instanceByLevel.length - 1) instanceByLevel.length = level + 1;
          const numbered = ordered && !BULLET_MARKER_TYPES.has(item.markerType);
          if (numbered && instanceByLevel[level] == null) instanceByLevel[level] = this.olInstance++;
          const bulletReference = item.markerType === "square" ? "h2d-ul-square" : item.markerType === "circle" ? "h2d-ul-circle" : "h2d-ul";
          if (item.continuation) {
            opts.indent = { left: context.pxToTwips(item.indentLeftPx || node.indentLeftPx || 22) };
          } else {
            opts.numbering = numbered ? {
              reference: orderedReference(item.markerType),
              level: 0,
              instance: instanceByLevel[level]
            } : { reference: bulletReference, level };
          }
          return new Paragraph({
            children: withBookmarks(
              makeNodeRuns(context, { runs: item.runs, style: item.style }, this.images),
              item.bookmarks
            ),
            ...opts
          });
        });
      }
      case "code":
        return node.lines.map(
          (line) => new Paragraph({
            children: [
              new TextRun({
                text: line || " ",
                font: "Consolas",
                size: node.sizePx ? context.pxToHalfPoints(node.sizePx) : 18,
                color: node.color && node.color !== "000000" ? node.color : void 0,
                noProof: true
              })
            ],
            shading: { type: ShadingType.CLEAR, fill: node.shading }
          })
        );
      case "hr": {
        const widthFrac = Math.max(0.05, Math.min(1, node.widthFrac || 1));
        if (node.short) {
          const width = Math.max(120, Math.round(this.avail * widthFrac));
          const output = [];
          if (node.spacingBeforePx) {
            output.push(
              spacerParagraph(context, node.spacingBeforePx, { shading: node.ambientShading })
            );
          }
          output.push(
            new Table({
              borders: NO_TABLE_BORDERS,
              rows: [
                new TableRow({
                  height: {
                    value: context.pxToTwips(node.heightPx || 2),
                    rule: HeightRule.EXACT
                  },
                  children: [
                    new TableCell({
                      children: [new Paragraph({ spacing: { before: 0, after: 0 } })],
                      shading: { type: ShadingType.CLEAR, fill: node.color || "CCCCCC" },
                      borders: NO_BORDERS,
                      margins: { top: 0, bottom: 0, left: 0, right: 0 }
                    })
                  ]
                })
              ],
              width: { size: width, type: WidthType.DXA },
              columnWidths: [width],
              layout: TableLayoutType.FIXED
            }),
            spacerParagraph(context, node.spacingAfterPx || 2, { shading: node.ambientShading })
          );
          return output;
        }
        const spare = Math.round(this.avail * (1 - widthFrac));
        const left = node.align === "center" ? Math.round(spare / 2) : 0;
        const right = node.align === "center" ? spare - left : spare;
        return [
          new Paragraph({
            indent: { left, right },
            shading: node.ambientShading ? { type: ShadingType.CLEAR, fill: node.ambientShading } : void 0,
            // collapse the carrier paragraph to (almost) just the border line;
            // a default-height empty line reads as a stray blank row
            children: [new TextRun({ text: "", size: 2, noProof: true })],
            spacing: {
              before: context.pxToTwips(node.spacingBeforePx || 0),
              after: context.pxToTwips(node.spacingAfterPx || 2),
              line: context.pxToTwips(Math.max(2, node.heightPx || 2)),
              lineRule: LineRuleType.EXACT
            },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: node.heightPx ? Math.max(6, Math.round(node.heightPx * 8)) : 6,
                color: node.color || "CCCCCC"
              }
            }
          })
        ];
      }
      case "formfield": {
        if (node.controlType === "checkbox" || node.controlType === "radio") {
          return [
            new Paragraph({
              children: [this.contentControl(node)],
              spacing: { before: 0, after: 0 },
              ...paraOptions(context, node.style)
            })
          ];
        }
        if (node.mode === "line") {
          return [
            new Paragraph({
              children: [this.contentControl(node)],
              border: { bottom: wordBorder(context, node.borders?.bottom) },
              spacing: { before: 0, after: 0, line: 240 }
            })
          ];
        }
        const width = Math.min(this.avail, Math.max(300, context.pxToTwips(node.width || 100)));
        const borders = {};
        for (const side of ["top", "bottom", "left", "right"]) {
          borders[side] = wordBorder(context, node.borders?.[side]);
        }
        const pad = node.padPx || {};
        return [
          new Table({
            borders: NO_TABLE_BORDERS,
            rows: [
              new TableRow({
                cantSplit: true,
                height: node.height ? { value: context.pxToTwips(node.height), rule: HeightRule.ATLEAST } : void 0,
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [this.contentControl(node)],
                        spacing: { before: 0, after: 0 }
                      })
                    ],
                    borders,
                    shading: node.shading ? { type: ShadingType.CLEAR, fill: node.shading } : void 0,
                    margins: {
                      top: context.pxToTwips(pad.top || 4),
                      bottom: context.pxToTwips(pad.bottom || 4),
                      left: context.pxToTwips(pad.left || 6),
                      right: context.pxToTwips(pad.right || 6)
                    }
                  })
                ]
              })
            ],
            width: { size: width, type: WidthType.DXA },
            columnWidths: [width]
          }),
          spacerParagraph(context, 2)
        ];
      }
      case "image":
        return this.renderImage(node);
      case "floatimg":
        return this.collectFloatingImage(node);
      case "table":
        return renderTable(this, carryTableBookmarks(node), depth);
      case "card":
        return renderCard(this, node, depth);
      case "kpirow":
        return renderKpiRow(this, node, depth);
      default:
        return [];
    }
  }
  // Display text measured as one browser line but wider than the cell it
  // landed in: Word would wrap it mid-word ("INVOIC/E"). Shrink the font
  // proportionally so it stays on one line. Display sizes only — body text
  // in narrow columns should wrap naturally, not shrink.
  // A fill-in blank is an unbreakable nbsp run sized to its browser width.
  // Inside a narrow table cell it overflows and blows up Word's fixed
  // layout (the whole table widens past the page and clips) — shrink the
  // blank to the width the cell actually has left.
  fitFillInRuns(node) {
    const runs = node.runs || [];
    const isBlank = (run) => run.underline && run.preserveWhitespace && /^\u00a0+$/.test(run.text || "");
    if (!runs.some(isBlank)) return node;
    const availPx = this.avail / 15 / this.context.measurementScale;
    const spaceWidth = (run) => Math.max(3, (run.sizePx || 14) * 0.45);
    const textPx = runs.reduce(
      (sum, run) => isBlank(run) ? sum : sum + (run.text || "").length * (run.sizePx || 14) * 0.6,
      0
    );
    const blankPx = runs.reduce(
      (sum, run) => isBlank(run) ? sum + run.text.length * spaceWidth(run) : sum,
      0
    );
    if (textPx + blankPx <= availPx * 0.92) return node;
    const budget = Math.max(0, availPx * 0.92 - textPx);
    const scale = blankPx > 0 ? Math.min(1, budget / blankPx) : 1;
    return {
      ...node,
      runs: runs.map(
        (run) => isBlank(run) ? { ...run, text: "\xA0".repeat(Math.max(3, Math.floor(run.text.length * scale))) } : run
      )
    };
  }
  fitOneLineRuns(node) {
    if (!node.style?.oneLineWidthPx) return node;
    const sizeFloor = node.type === "heading" || node.style?.keepLines ? 14 : 24;
    if (!node.runs.some((run) => (run.sizePx || 0) >= sizeFloor)) return node;
    const availPx = this.avail / 15 / this.context.measurementScale;
    if (node.style.oneLineWidthPx <= availPx * 0.94) return node;
    const fit = Math.max(0.55, availPx * 0.94 / node.style.oneLineWidthPx);
    return {
      ...node,
      runs: node.runs.map((run) => run.sizePx ? { ...run, sizePx: run.sizePx * fit } : run)
    };
  }
  renderImage(node) {
    const img = this.images[node.shotId];
    if (!img) {
      const fallbackRun = new TextRun({
        text: node.fallbackText || node.href || "Unavailable embedded content",
        color: node.href ? "0563C1" : "666666",
        underline: node.href ? {} : void 0,
        noProof: true
      });
      return [
        new Paragraph({
          children: node.href ? [new ExternalHyperlink({ children: [fallbackRun], link: node.href })] : [fallbackRun]
        })
      ];
    }
    const bleedLeftPx = node.bleedLeftPx || 0;
    const bleedRightPx = node.bleedRightPx || 0;
    const maxPx = Math.floor((this.avail + this.context.pxToTwips(bleedLeftPx + bleedRightPx)) / 15);
    const pageContentHeightPx = (this.context.pageHeightDxa - this.context.pageMargins.top - this.context.pageMargins.bottom) / 15;
    const pageScale = node.pageComposition ? Math.max(0.01, pageContentHeightPx - 45) / node.height : Infinity;
    const scale = Math.min(this.context.measurementScale, maxPx / node.width, pageScale);
    const output = [];
    if (node.spacingBeforePx > 2 && !node.pageComposition) {
      output.push(spacerParagraph(this.context, node.spacingBeforePx));
    }
    const renderedWidthPx = finitePx2(node.width * scale);
    const renderedHeightPx = finitePx2(node.height * scale);
    const imageRun = new ImageRun({
      type: "png",
      data: img,
      transformation: {
        width: renderedWidthPx,
        height: renderedHeightPx
      }
    });
    output.push(
      new Paragraph({
        children: node.href ? [new ExternalHyperlink({ children: [imageRun], link: node.href })] : [imageRun],
        // wide short strips are section banners — never strand one at a
        // page bottom with its section content on the next page
        keepNext: !this.suppressKeepNext && !node.pageComposition && renderedWidthPx >= this.avail / 15 * 0.85 && renderedHeightPx <= 220 ? true : void 0,
        alignment: (
          // Full-page slides: headroom scaling leaves a margin — split it
          // symmetrically instead of piling white space on one side.
          node.pageComposition || node.align === "center" ? AlignmentType.CENTER : node.align === "right" ? AlignmentType.RIGHT : void 0
        ),
        indent: bleedLeftPx || bleedRightPx ? {
          left: -this.context.pxToTwips(bleedLeftPx),
          right: -this.context.pxToTwips(bleedRightPx)
        } : void 0,
        spacing: {
          before: 0,
          after: 0,
          line: Math.max(1, renderedHeightPx * 15),
          // Word positions inline images relative to the text baseline.
          // An exact line box equal to the image height clips the image's top
          // and may push it to the next page. "At least" keeps the authored
          // image height while allowing Word to include the full ascent.
          lineRule: LineRuleType.AT_LEAST
        },
        border: node.topEdgeFill ? {
          top: {
            style: BorderStyle.SINGLE,
            size: 48,
            color: node.topEdgeFill,
            space: 0
          }
        } : void 0
      })
    );
    if (node.spacingAfterPx > 2 && !node.pageComposition) {
      output.push(spacerParagraph(this.context, node.spacingAfterPx));
    }
    return output;
  }
  collectFloatingImage(node) {
    const img = this.images[node.shotId];
    if (!img) return [];
    if (node.inParent && node.yPx + node.height > (node.pageHpx || 1123)) return [];
    const EMU = 9525;
    const contentHeightDxa = this.context.pageHeightDxa - 2 * this.context.marginDxa;
    const sx = node.pageWpx ? this.context.contentDxa / 15 / node.pageWpx : 1;
    const sy = node.pageHpx ? contentHeightDxa / 15 / node.pageHpx : 1;
    this.floats.push(
      new ImageRun({
        type: "png",
        data: img,
        transformation: {
          width: Math.round(node.width * sx),
          height: Math.round(node.height * sx)
        },
        floating: {
          // margin origin = start of the content area, matching the
          // body-content-box coordinates measured in the browser
          horizontalPosition: { relative: "margin", offset: Math.round(node.xPx * sx * EMU) },
          verticalPosition: node.atPageBottom ? { relative: "page", align: VerticalPositionAlign.BOTTOM } : { relative: "margin", offset: Math.round(node.yPx * Math.min(sy, 1) * EMU) },
          // decorations painted under the HTML content layer (z<=0) go
          // behind text; explicit z>0 art stays in front (table-cell shading
          // would paint over a behind-text image, so only when needed)
          behindDocument: Boolean(node.behindText),
          wrap: { type: TextWrappingType.NONE }
        }
      })
    );
    return [];
  }
};

// vendor/genoffice-html2docx/src/generate.ts
async function generateDocx(ir, images, options = {}) {
  const parts = partitionIr(ir);
  const context = createRenderContext(parts.docSettings, options);
  const generator = new Generator(images, context);
  addPageBackgroundFloat(generator, parts.pageBgNode);
  const rendered = renderSection(generator, parts);
  const document2 = createDocument(context, parts, rendered, generator);
  return Packer.toBuffer(document2);
}

// vendor/genoffice-html2docx/src/convert.ts
function widestAuthoredWidth() {
  const candidates = [document.body, ...document.body.querySelectorAll("*")];
  let widest = 0;
  let seen = 0;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    const maxWidth = parseFloat(getComputedStyle(el).maxWidth);
    if (!Number.isFinite(maxWidth) || maxWidth <= window.innerWidth || maxWidth > 1600 || rect.width < window.innerWidth * 0.55 || rect.height < 20) {
      continue;
    }
    seen++;
    if (maxWidth > widest) widest = maxWidth;
  }
  return seen ? Math.round(widest) : null;
}
var A4_VIEWPORT = { width: 794, height: 1123, deviceScaleFactor: 2 };
var NAVIGATION_TIMEOUT_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function createAbortError() {
  return new DOMException("html2docx conversion aborted", "AbortError");
}
function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}
function normalizeIr(raw) {
  if (!Array.isArray(raw)) {
    const received = raw === null ? "null" : typeof raw;
    throw new Error(
      `html2docx: extractor returned malformed IR (expected an array, got ${received}); refusing to continue with compromised page JavaScript`
    );
  }
  return raw.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(
        `html2docx: extractor returned malformed IR at index ${index} (expected an object node); refusing to continue with compromised page JavaScript`
      );
    }
    const candidate = item;
    if (typeof candidate.type !== "string" || candidate.type.length === 0) {
      throw new Error(
        `html2docx: extractor returned malformed IR at index ${index} (missing string "type"); refusing to continue with compromised page JavaScript`
      );
    }
    if (candidate.shotId !== void 0 && candidate.shotId !== null && (typeof candidate.shotId !== "string" || candidate.shotId.length === 0)) {
      throw new Error(
        `html2docx: extractor returned malformed IR at index ${index} (invalid "shotId"); refusing to continue with compromised page JavaScript`
      );
    }
    for (const key of ["width", "height", "widthFrac", "heightPx", "xPx", "yPx", "px"]) {
      const v = candidate[key];
      if (v !== void 0 && v !== null) {
        const n = Number(v);
        const signed = key === "xPx" || key === "yPx";
        if (!Number.isFinite(n) || !signed && n < 0) {
          throw new Error(
            `html2docx: extractor returned malformed IR at index ${index} (invalid numeric "${key}"); refusing to continue with compromised page JavaScript`
          );
        }
      }
    }
    return item;
  });
}
function raceWithAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(createAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}
async function convertHtmlToDocx(input, driver, options = {}) {
  const { signal, traceSelector, onIr } = options;
  const log = options.log ?? (() => {
  });
  const progress = (stage, pct) => options.onProgress?.({ stage, pct });
  const { url } = input;
  progress("load", 0);
  await driver.setViewport(A4_VIEWPORT);
  if (traceSelector) {
    await driver.addInitScript(`globalThis.__h2dTraceSelector = ${JSON.stringify(traceSelector)};`);
  }
  log(`[html2docx] loading ${url}`);
  await driver.goto(url, { timeoutMs: NAVIGATION_TIMEOUT_MS });
  await driver.evaluate(() => document.fonts.ready.catch(() => {
  }));
  await sleep(300);
  throwIfAborted(signal);
  const authoredWidth = await driver.evaluate(widestAuthoredWidth);
  const overflowsA4 = !authoredWidth && await driver.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth + 8) return true;
    if ([...document.querySelectorAll("table")].some(
      (table) => table.scrollWidth > table.clientWidth + 4
    )) {
      return true;
    }
    return [...document.querySelectorAll("td, th")].some(
      (cell) => cell.scrollWidth > cell.clientWidth + 2
    );
  });
  if (authoredWidth || overflowsA4) {
    const renderWidth = Math.max(1024, authoredWidth || 0);
    await driver.setViewport({
      width: renderWidth,
      height: Math.round(1123 * renderWidth / 794),
      deviceScaleFactor: 2
    });
    await driver.goto(url, { timeoutMs: NAVIGATION_TIMEOUT_MS });
    await driver.evaluate(() => document.fonts.ready.catch(() => {
    }));
    await sleep(300);
  }
  throwIfAborted(signal);
  progress("load", 60);
  await raceWithAbort(
    driver.evaluate(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const originalY = window.scrollY;
      const htmlScrollBehavior = document.documentElement.style.scrollBehavior;
      const bodyScrollBehavior = document.body.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const step = Math.max(400, Math.round(window.innerHeight * 0.75));
      for (let y = 0; y <= maxY; y += step) {
        window.scrollTo(0, y);
        await wait(60);
      }
      window.scrollTo(0, maxY);
      await wait(100);
      const imageWaits = [...document.images].map((image) => {
        if (image.complete && image.naturalWidth > 0) {
          return image.decode?.().catch(() => {
          });
        }
        return new Promise((resolve) => {
          const finish = () => resolve();
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          setTimeout(finish, 15e3);
        });
      });
      await Promise.all(imageWaits);
      window.scrollTo(0, originalY);
      await wait(100);
      document.documentElement.style.scrollBehavior = htmlScrollBehavior;
      document.body.style.scrollBehavior = bodyScrollBehavior;
    }),
    signal
  );
  await sleep(200);
  throwIfAborted(signal);
  progress("load", 100);
  await driver.evaluate(
    (rules) => {
      const parsed = rules.map(
        ([source, flags, name]) => [new RegExp(source, flags), name]
      );
      const w = window;
      w.__h2dWordFontLineWidth = (el) => {
        let family;
        try {
          family = getComputedStyle(el).fontFamily || "";
        } catch {
          return 0;
        }
        let mapped = "Arial";
        for (const [re, name] of parsed) {
          if (re.test(family)) {
            mapped = name;
            break;
          }
        }
        const prevFont = el.style.fontFamily;
        const prevWhiteSpace = el.style.whiteSpace;
        let width = 0;
        try {
          el.style.fontFamily = mapped;
          el.style.whiteSpace = "nowrap";
          const range = document.createRange();
          range.selectNodeContents(el);
          width = range.getBoundingClientRect().width;
        } catch {
        }
        el.style.fontFamily = prevFont || "";
        el.style.whiteSpace = prevWhiteSpace || "";
        return width;
      };
    },
    FONT_RULES.map(([re, name]) => [re.source, re.flags, name])
  );
  for (const source of BROWSER_HELPER_SCRIPTS) {
    await driver.addScript(source);
  }
  log("[html2docx] extracting intent tree");
  progress("extract", 0);
  const rawIr = await driver.evaluate(EXTRACTOR_CALL);
  const ir = normalizeIr(rawIr);
  if (onIr) {
    const trace = await driver.evaluate(() => globalThis.__h2dTrace || []);
    onIr(ir, trace);
  }
  log(`[html2docx] extracted ${ir.length} top-level nodes`);
  throwIfAborted(signal);
  progress("extract", 100);
  await driver.evaluate(() => {
    for (const img of document.querySelectorAll("img")) {
      if (!img.complete || img.naturalWidth === 0) img.style.visibility = "hidden";
    }
  });
  const images = {};
  const shotIds = [];
  const shotNodes = /* @__PURE__ */ new Map();
  const pageBgShotIds = new Set(
    ir.flatMap((node) => node.type === "pagebg" && node.shotId ? [node.shotId] : [])
  );
  const collectRunShots = (runs) => {
    for (const run of runs || []) {
      if (run.inlineImage && run.shotId) {
        shotIds.push(run.shotId);
        if (run.unwrap || run.clip) shotNodes.set(run.shotId, run);
      }
    }
  };
  (function collectShots(nodes) {
    for (const n of nodes) {
      if (n.type === "image" || n.type === "floatimg" || n.type === "pagebg" && n.shotId) {
        shotIds.push(n.shotId);
        shotNodes.set(n.shotId, n);
      }
      collectRunShots(n.runs);
      for (const item of n.items || []) collectRunShots(item.runs);
      for (const key of ["children", "cells"]) {
        if (Array.isArray(n[key])) {
          for (const sub of n[key]) {
            collectRunShots(sub.runs);
            if (sub.children) collectShots(sub.children);
          }
          if (key === "children") collectShots(n[key]);
        }
      }
      if (n.rows) {
        for (const row of n.rows) {
          for (const cell of row.cells) {
            collectRunShots(cell.runs);
            if (cell.children) collectShots(cell.children);
          }
        }
      }
    }
  })(ir);
  const uniqueShotIds = [...new Set(shotIds)];
  let shotIndex = 0;
  for (const id of uniqueShotIds) {
    throwIfAborted(signal);
    progress("screenshot", Math.round(shotIndex++ / Math.max(1, uniqueShotIds.length) * 100));
    const shotNode = shotNodes.get(id);
    const selector = `[data-h2d-id="${id}"]`;
    const hasElement = shotNode?.clip ? false : await driver.elementExists(selector);
    if (!hasElement && !shotNode?.clip) continue;
    try {
      if (shotNode?.unwrap) {
        await driver.evaluate((shotId) => {
          const target = document.querySelector(`[data-h2d-id="${shotId}"]`);
          if (!target) return;
          target.setAttribute("data-h2d-unwrap-style", target.getAttribute("style") || "");
          target.style.whiteSpace = "nowrap";
          target.style.width = "max-content";
          target.style.maxWidth = "none";
        }, id);
      }
      if (shotNode?.isolate) {
        await driver.evaluate((shotId) => {
          const target = document.querySelector(`[data-h2d-id="${shotId}"]`);
          if (!target) return;
          for (const candidate of document.body.querySelectorAll("*")) {
            if (candidate === target || candidate.contains(target) || target.contains(candidate)) {
              continue;
            }
            candidate.setAttribute("data-h2d-isolate-visibility", candidate.style.visibility || "");
            candidate.style.visibility = "hidden";
          }
          let scrub = target.parentElement;
          while (scrub) {
            scrub.setAttribute("data-h2d-isolate-bg", scrub.getAttribute("style") || "");
            scrub.style.background = "transparent";
            scrub = scrub.parentElement;
          }
        }, id);
      }
      if (pageBgShotIds.has(id)) {
        await driver.evaluate((shotId) => {
          const backdrop = document.querySelector(`[data-h2d-id="${shotId}"]`);
          for (const child of document.body.children) {
            child.setAttribute("data-h2d-old-visibility", child.style.visibility || "");
            child.style.visibility = child === backdrop ? "visible" : "hidden";
          }
          backdrop.setAttribute("data-h2d-old-style", backdrop.getAttribute("style") || "");
          Object.assign(backdrop.style, {
            position: "fixed",
            left: "0",
            top: "0",
            zIndex: "2147483647",
            visibility: "visible"
          });
        }, id);
      }
      let overhang = null;
      if (hasElement && shotNode?.type === "image" && !shotNode.pageComposition && !shotNode.clip) {
        overhang = await driver.evaluate((shotId) => {
          const target = document.querySelector(`[data-h2d-id="${shotId}"]`);
          if (!target) return null;
          const ts = getComputedStyle(target);
          if (ts.overflow === "hidden" || ts.overflow === "clip") return null;
          const r = target.getBoundingClientRect();
          const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          for (const d of target.querySelectorAll("*")) {
            if (getComputedStyle(d).position !== "absolute") continue;
            const dr = d.getBoundingClientRect();
            if (!dr.width || !dr.height) continue;
            if (dr.left < r.left - 48 || dr.right > r.right + 48 || dr.top < r.top - 48 || dr.bottom > r.bottom + 48)
              continue;
            box.left = Math.min(box.left, dr.left);
            box.top = Math.min(box.top, dr.top);
            box.right = Math.max(box.right, dr.right);
            box.bottom = Math.max(box.bottom, dr.bottom);
          }
          if (box.left >= r.left - 1 && box.top >= r.top - 1 && box.right <= r.right + 1 && box.bottom <= r.bottom + 1)
            return null;
          const doc = document.documentElement;
          const rtlShift = getComputedStyle(doc).direction === "rtl" || getComputedStyle(document.body).direction === "rtl" ? Math.max(0, doc.scrollWidth - doc.clientWidth) : 0;
          const x = Math.max(0, Math.round(box.left + window.scrollX + rtlShift));
          const y = Math.max(0, Math.round(box.top + window.scrollY));
          return {
            x,
            y,
            width: Math.round(box.right - box.left),
            height: Math.round(box.bottom - box.top)
          };
        }, id);
      }
      if (overhang) {
        images[id] = await driver.screenshot({ clip: overhang });
        shotNode.width = overhang.width;
        shotNode.height = overhang.height;
      } else if (shotNode?.clip) {
        images[id] = await driver.screenshot({ clip: shotNode.clip });
      } else {
        const rtlBox = await driver.evaluate((shotId) => {
          const doc = document.documentElement;
          const rtl = getComputedStyle(doc).direction === "rtl" || getComputedStyle(document.body).direction === "rtl";
          const shift = rtl ? Math.max(0, doc.scrollWidth - doc.clientWidth) : 0;
          if (!shift) return null;
          const target = document.querySelector(`[data-h2d-id="${shotId}"]`);
          if (!target) return null;
          const r = target.getBoundingClientRect();
          return {
            x: Math.max(0, Math.round(r.left + shift + doc.scrollLeft)),
            y: Math.max(0, Math.round(r.top + window.scrollY)),
            width: Math.round(r.width),
            height: Math.round(r.height)
          };
        }, id);
        const omitBackground = Boolean(shotNode?.isolate);
        const shot = rtlBox ? await driver.screenshot({ clip: rtlBox, omitBackground }) : await driver.screenshotElement(selector, { omitBackground });
        if (shot) images[id] = shot;
      }
      if (images[id]) log(`[html2docx] screenshot ${id}: ${images[id].length} bytes`);
    } catch (e) {
      log(`[html2docx] screenshot ${id} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (shotNode?.unwrap) {
        try {
          await driver.evaluate((shotId) => {
            const target = document.querySelector(`[data-h2d-id="${shotId}"]`);
            if (!target) return;
            target.setAttribute("style", target.getAttribute("data-h2d-unwrap-style") || "");
            target.removeAttribute("data-h2d-unwrap-style");
          }, id);
        } catch (e) {
          log(
            `[html2docx] restore unwrap ${id} failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      if (shotNode?.isolate) {
        try {
          await driver.evaluate(() => {
            for (const candidate of document.querySelectorAll(
              "[data-h2d-isolate-visibility]"
            )) {
              candidate.style.visibility = candidate.getAttribute("data-h2d-isolate-visibility") || "";
              candidate.removeAttribute("data-h2d-isolate-visibility");
            }
            for (const scrubbed of document.querySelectorAll("[data-h2d-isolate-bg]")) {
              scrubbed.setAttribute("style", scrubbed.getAttribute("data-h2d-isolate-bg") || "");
              scrubbed.removeAttribute("data-h2d-isolate-bg");
            }
          });
        } catch (e) {
          log(
            `[html2docx] restore isolate ${id} failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      if (pageBgShotIds.has(id)) {
        try {
          await driver.evaluate((shotId) => {
            const backdrop = document.querySelector(`[data-h2d-id="${shotId}"]`);
            if (backdrop) {
              backdrop.setAttribute("style", backdrop.getAttribute("data-h2d-old-style") || "");
              backdrop.removeAttribute("data-h2d-old-style");
            }
            for (const child of document.querySelectorAll(
              "[data-h2d-old-visibility]"
            )) {
              child.style.visibility = child.getAttribute("data-h2d-old-visibility") || "";
              child.removeAttribute("data-h2d-old-visibility");
            }
          }, id);
        } catch (e) {
          log(
            `[html2docx] restore pagebg ${id} failed: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  }
  progress("screenshot", 100);
  const rasterizedDocumentText = [...shotNodes.values()].some((node) => node.capturesDocumentText);
  const screenshotText = await driver.evaluate((includeBodyText) => {
    const parts = [];
    if (includeBodyText) {
      const bodyText = (document.body.innerText || "").trim();
      if (bodyText) parts.push(bodyText);
    }
    for (const el of document.querySelectorAll("[data-h2d-id]")) {
      const text = (el.innerText || (el.tagName === "IMG" ? el.getAttribute("alt") : "") || "").trim();
      if (text) parts.push(text);
    }
    return parts.join("\n");
  }, rasterizedDocumentText);
  throwIfAborted(signal);
  log("[html2docx] generating docx");
  progress("generate", 0);
  const docx = new Uint8Array(
    await generateDocx(ir, images, { naturalTableWidth: options.naturalTableWidth })
  );
  log(`[html2docx] generated ${docx.length} bytes`);
  progress("generate", 100);
  return {
    docx,
    ir,
    screenshotText,
    stats: { screenshots: Object.keys(images).length, rasterizedDocumentText }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BROWSER_HELPER_SCRIPTS,
  EXTRACTOR_CALL,
  EXTRACTOR_SOURCE,
  FONT_RULES,
  convertHtmlToDocx,
  generateDocx,
  mapFont,
  normalizeIr,
  parsePageBgColor,
  raceWithAbort
});
