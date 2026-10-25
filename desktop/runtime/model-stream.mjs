/** OpenAI-compatible SSE transport. Never execute incomplete tool arguments or replay requests. */
const LIMIT = 4 * 1024 * 1024;
export async function readCompletion(response, { signal, onDelta, toolsEnabled = false } = {}) {
    const reader = response.body?.getReader();
    if (!reader)
        throw new Error('模型返回空响应');
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    async function read() { signal?.throwIfAborted(); const result = await reader.read(); signal?.throwIfAborted(); if (!result.done && (bytes += result.value.length) > LIMIT)
        throw new Error('模型响应超过 4 MB'); return result; }
    function validate(message, usage) { const text = message?.content; if ((typeof text !== 'string' || !text.trim()) && !(toolsEnabled && Array.isArray(message?.tool_calls) && message.tool_calls.length))
        throw new Error('模型没有返回文本内容'); return { text, usage: usage || null, message }; }
    try {
        if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
            let body = '';
            while (true) {
                const part = await read();
                if (part.done)
                    break;
                body += decoder.decode(part.value, { stream: true });
            }
            body += decoder.decode();
            const data = JSON.parse(body);
            if (data.error)
                throw new Error('模型返回错误：' + String(data.error.message || '未知错误').slice(0, 300));
            const result = validate(data.choices?.[0]?.message, data.usage);
            if (typeof result.text === 'string' && result.text)
                await onDelta?.(result.text);
            return result;
        }
        let buffer = '', dataLines = [], text = '', reasoning = '', usage = null, done = false, finished = false, toolMode = false;
        const calls = new Map();
        async function dispatch() {
            if (!dataLines.length)
                return;
            const data = dataLines.join('\n');
            dataLines = [];
            if (data === '[DONE]') {
                done = true;
                return;
            }
            let packet;
            try {
                packet = JSON.parse(data);
            }
            catch {
                throw new Error('模型流包含无效 JSON');
            }
            if (packet.error)
                throw new Error('模型流返回错误：' + String(packet.error.message || '未知错误').slice(0, 300));
            if (packet.usage)
                usage = packet.usage;
            const choice = packet.choices?.find(c => c.index === 0 || c.index === undefined);
            if (!choice)
                return;
            if (finished && (choice.delta?.content || choice.delta?.reasoning_content || choice.delta?.tool_calls?.length))
                throw new Error('模型在结束标记后继续输出');
            if (choice.finish_reason === 'length')
                throw new Error('模型输出达到长度上限；已保留接收内容，请继续生成');
            if (choice.finish_reason === 'content_filter')
                throw new Error('模型服务过滤了本轮输出');
            const delta = choice.delta || {};
            if(delta.reasoning_content!==undefined&&delta.reasoning_content!==null){if(typeof delta.reasoning_content!=='string')throw Error('模型思考字段无效');reasoning+=delta.reasoning_content;}
            if (delta.content !== undefined && delta.content !== null) {
                if (typeof delta.content !== 'string')
                    throw new Error('模型流文本格式无效');
                text += delta.content;
                if (delta.content)
                    await onDelta?.(delta.content);
            }
            if (delta.tool_calls !== undefined) {
                if (!toolsEnabled || !Array.isArray(delta.tool_calls))
                    throw new Error('工具模式关闭或工具流格式无效');
                toolMode = true;
                for (const piece of delta.tool_calls) {
                    if (!Number.isInteger(piece.index) || piece.index < 0 || piece.index > 7)
                        throw new Error('工具流索引无效');
                    const call = calls.get(piece.index) || { id: '', type: 'function', function: { name: '', arguments: '' } };
                    if (piece.id !== undefined) {
                        if (typeof piece.id !== 'string')
                            throw new Error('工具流 ID 无效');
                        call.id += piece.id;
                    }
                    if (piece.type !== undefined && piece.type !== 'function')
                        throw new Error('工具流类型无效');
                    for (const field of ['name', 'arguments'])
                        if (piece.function?.[field] !== undefined) {
                            if (typeof piece.function[field] !== 'string')
                                throw new Error('工具流参数无效');
                            call.function[field] += piece.function[field];
                        }
                    if (call.id.length > 200 || call.function.name.length > 200 || call.function.arguments.length > 200000)
                        throw new Error('工具流参数过长');
                    calls.set(piece.index, call);
                }
            }
            if (choice.finish_reason) {
                if (!['stop', 'tool_calls', 'function_call'].includes(choice.finish_reason))
                    throw new Error('模型流结束状态无效');
                finished = true;
            }
        }
        async function line(value) { if (value === '') {
            await dispatch();
            return;
        } if (value.startsWith('data:'))
            dataLines.push(value.slice(5).replace(/^ /, '')); }
        while (!done) {
            const part = await read();
            if (part.done) {
                buffer += decoder.decode();
                break;
            }
            buffer += decoder.decode(part.value, { stream: true });
            let end;
            while ((end = buffer.search(/[\r\n]/)) !== -1) {
                if (buffer[end] === '\r' && end === buffer.length - 1)
                    break;
                const width = buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1;
                const current = buffer.slice(0, end);
                buffer = buffer.slice(end + width);
                await line(current);
                if (done)
                    break;
            }
        }
        if (!done) {
            if (buffer)
                await line(buffer.replace(/\r$/, ''));
            await dispatch();
        }
        if (!done && !finished)
            throw new Error('模型流意外中断，已保留接收内容');
        signal?.throwIfAborted();
        const tool_calls = [...calls].sort(([a], [b]) => a - b).map(([index, call], position) => { if (index !== position || !call.id || !call.function.name)
            throw new Error('工具流不完整'); try {
            const args = JSON.parse(call.function.arguments || '{}');
            if (!args || typeof args !== 'object' || Array.isArray(args))
                throw new Error();
        }
        catch {
            throw new Error('工具流参数未完整结束，未执行任何工具');
        } return call; });
        if (toolMode && !tool_calls.length)
            throw new Error('工具流不完整');
        const result = validate({ role: 'assistant', ...(reasoning?{reasoning_content:reasoning}:{}), content: text || null, ...(tool_calls.length ? { tool_calls } : {}) }, usage);
        return result;
    }
    finally {
        // Includes protocol errors, cancellation, size limits and [DONE] without socket close.
        try {
            await reader.cancel();
        }
        catch { }
        reader.releaseLock();
    }
}
