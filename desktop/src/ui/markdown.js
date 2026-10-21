export const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function rich(content) { const inline = s => escape(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); const lines = String(content || '').replace(/\r\n/g, '\n').split('\n'); let html = '', i = 0; while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
        const language = line.trim().slice(3), code = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i]))
            code.push(lines[i++]);
        i++;
        html += `<pre class="code-block"><small>${escape(language || '代码')}</small><code>${escape(code.join('\n'))}</code></pre>`;
        continue;
    }
    if (!line.trim()) {
        i++;
        continue;
    }
    if (/^#{1,6}\s/.test(line)) {
        const level = Math.min(4, line.match(/^#+/)[0].length);
        html += `<h${level}>${inline(line.replace(/^#+\s+/, ''))}</h${level}>`;
        i++;
        continue;
    }
    if (i + 1 < lines.length && line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        const cells = s => s.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
        const headers = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim())
            rows.push(cells(lines[i++]));
        html += `<div class="table-scroll"><table><thead><tr>${headers.map(c => '<th>' + c + '</th>').join('')}</tr></thead><tbody>${rows.map(row => '<tr>' + row.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('')}</tbody></table></div>`;
        continue;
    }
    const list = line.match(/^\s*(?:([-*])|(\d+)\.)\s+(.+)/);
    if (list) {
        const ordered = !!list[2], items = [];
        while (i < lines.length) {
            const m = lines[i].match(ordered ? /^\s*\d+\.\s+(.+)/ : /^\s*[-*]\s+(.+)/);
            if (!m)
                break;
            items.push(inline(m[1]));
            i++;
        }
        html += `<${ordered ? 'ol' : 'ul'}>${items.map(t => '<li>' + t + '</li>').join('')}</${ordered ? 'ol' : 'ul'}>`;
        continue;
    }
    if (/^>\s?/.test(line)) {
        html += '<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>';
        i++;
        continue;
    }
    html += '<p>' + inline(line) + '</p>';
    i++;
} return html; }
