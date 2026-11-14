import { validateToolArguments } from './tool-arguments.mjs';
export const toolDefinitions = [
 {type:'function',function:{name:'pdf_ocr_import',description:'将本轮经批准的PDF OCR结果保存为有页码和来源SHA的Markdown文档，用于成果中心或后续知识绑定；需要额外创建文档审批。只使用pdf_ocr返回的receiptId，不接受模型自行编写的正文。',parameters:{type:'object',properties:{receiptId:{type:'string'},name:{type:'string',maxLength:100}},required:['receiptId','name'],additionalProperties:false}}},
 {type:'function',function:{name:'pdf_ocr',description:'经批准识别授权文件夹内 PDF 的连续最多5页，逐页返回文本和来源。仅本机执行；未内置OCR或PDF渲染组件时明确失败。',parameters:{type:'object',properties:{folderId:{type:'string'},relative:{type:'string'},startPage:{type:'integer',minimum:1,maximum:100},endPage:{type:'integer',minimum:1,maximum:100},language:{type:'string',enum:['eng','chi_sim','chi_sim+eng']}},required:['folderId','relative','startPage','endPage'],additionalProperties:false}}},
 {type:'function',function:{name:'image_ocr',description:'使用随应用内置的本地OCR识别本轮明确附加的图片文字，需要逐次批准。仅使用本轮图片ID；结果可能有误。若未内置引擎或语言数据会明确失败。',parameters:{type:'object',properties:{imageId:{type:'string'},language:{type:'string',enum:['eng','chi_sim','chi_sim+eng']}},required:['imageId'],additionalProperties:false}}},
 {type:'function',function:{name:'document_insert_image',description:'把本轮用户选择的本机PNG图片真实嵌入普通DOCX正文末尾，保留前版。先document_read核对版本，仅使用本轮图片ID，不编造缺失照片。画布文档需先导出再导入。',parameters:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer'},imageId:{type:'string'}},required:['id','expectedRevision','imageId'],additionalProperties:false}}},
 {type:'function',function:{name:'document_patch',description:'按document_read返回的wordEditing片段坐标修改导入Word的文字和直接粗体/斜体格式。保留原有其他格式、表格、图片、页眉等未改部件。仅editable片段；不支持复杂段落/修订/字段，仅structural=true的简单正文段落支持action=insertAfter/deleteParagraph（使用段落anchor，不带run）；新段落text非空单行。不能同时删除和修改同段。画布文档使用document_write。先读取，不猜测anchor。每批参数最多600字符，长修改拆批重新读取。',parameters:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer',minimum:1},patches:{type:'array',maxItems:100,items:{type:'object',properties:{action:{type:'string',enum:['insertAfter','deleteParagraph']},part:{type:'string'},paragraph:{type:'integer',minimum:0},run:{type:'integer',minimum:0},anchor:{type:'string'},text:{type:'string',maxLength:10000},bold:{type:'boolean'},italic:{type:'boolean'}},required:['part','paragraph','anchor'],additionalProperties:false}}},required:['id','expectedRevision','patches'],additionalProperties:false}}},
 {type:'function',function:{name:'document_write',description:'用受限富文本HTML创建真实Word文档，或修改由Word画布生成的文档。支持标题、段落、粗体、列表、表格、文字颜色；本机GenOffice引擎，不联网。不支持脚本/外部图片/URL；复杂模板不保证保真。新建需name；修改需id和expectedRevision且文档hasRichSource为true。返回验证后的DOCX。',parameters:{type:'object',properties:{name:{type:'string',maxLength:100},id:{type:'string'},expectedRevision:{type:'integer',minimum:1},html:{type:'string',maxLength:100000}},required:['html'],additionalProperties:false}}},
    {type:'function',function:{name:'document_convert',description:'将成果中心已有Markdown或HTML原文，通过本机GenOffice引擎转换为新的真实DOCX，保留原文；不支持其他源格式。不接受网址，不联网。先读取ID和当前版本；返回验证后可下载的Word文档。复杂布局不保证保真。',parameters:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer',minimum:1}},required:['id','expectedRevision'],additionalProperties:false}}},
    {type:'function',function:{name:'document_create',description:'创建可下载且可继续编辑的真实文档。md/html 的 content 是原文；docx 的 content 是 JSON {title,blocks:[{type:"heading"|"paragraph",text}|{type:"table",rows:[["单元格"]]}]}；xlsx 是 JSON {sheets:[{name,rows:[["文本",123,true,null]]}]}，显式 {formula:"SUM(B2:B3)"} 单元格才能作为公式；pptx 是 JSON {slides:[{title,bullets:["内容"],notes:"备注",chart:{type:"bar",title:"图表标题",labels:["标签"],values:[1]}}]}。chart可选，生成可分别编辑的图形和数字，不是可关联数据表的原生图表；最多12个非负值，至少一个大于零。也可用 cards:[{title:"标题",body:"说明"}]（最多6张）生成可编辑卡片，或 table:[["表头"],["数据"]]（最多8行5列、各行列数一致）生成可编辑PPT表格；一页最多使用一种图表、卡片或表格。也可使用自定义图层 layers:[{type:"rect"|"roundRect"|"ellipse"|"line"|"text"|"image",x:0,y:0,w:2,h:1,fill:"#0078CB",stroke:"#0078CB",text:"文字",fontSize:18,textColor:"#FFFFFF",imageId:"本轮图片ID"}]，坐标为英寸，画布13.333×7.5；数组顺序即叠放顺序，最多60层。image只可使用本轮附加图片ID，按比例完整显示，不下载网络图片；可指定background:"#FFFFFF"和transition:"fade"做淡入切页。layers不可与bullets/chart/cards/table混用。只填有来源的数据，缺数据不构造图表。最多100000字符。返回验证后的文档ID/版本/哈希。不得将仅有文字回复当作已生成文件。',parameters:{type:'object',properties:{name:{type:'string',maxLength:100},format:{type:'string',enum:['docx','xlsx','pptx','md','html']},content:{type:'string',maxLength:100000}},required:['name','format','content'],additionalProperties:false}}},
    {type:'function',function:{name:'document_read',description:'读取成果中心文档的提取文本和当前 revision，Excel返回有界spreadsheetEditing表名/单元格/公式结构用于document_edit，导入Word还返回有界wordEditing片段坐标供document_patch使用；PPT返回pptEditing页面/图层ID/anchor和位置，仅editable=true可调整，画布文档同时返回editableHtml，经批准后发送给模型。画布文档请用document_write修改，保留其他HTML结构。Office 提取视图不代表保真页面渲染。',parameters:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}}},
    {type:'function',function:{name:'document_edit',description:'修改已有文档并保存新版本，保留前5版。先 document_read 获取版本。Word/PPT 支持段内文字替换（跨文本run），Markdown/HTML原文替换。PPT可先读取pptEditing，再用单个pptLayer按slide、id、anchor和x/y/w/h（英寸）或order=front/back调整顶层普通图形或图片，也可用fill=#RRGGBB改变普通纯色形状填充；图片缩放须保持宽高比例，拒绝带对象动画的页面，不能与其他修改混批。Excel仅替换文字/脱敏时优先使用replacements，直接补丁原共享或内联字符串，保留样式/合并/图表等其他部件，不重建工作簿、不修改公式或数字，所有引用同一共享字符串的单元格都会变化；不能与cells同批。需要改数值或公式时使用cells按sheetIndex(从1开始的sheetN.xml)和address更新常量或显式{formula:"SUM(A1:A3)"}，支持子集公式会全工作簿重算；未知函数/共享数组公式/循环/图表透视表拒绝保存。原始导入文件不变，需用户导出新版本。',parameters:{type:'object',properties:{id:{type:'string'},expectedRevision:{type:'integer',minimum:1},pptLayer:{type:'object',properties:{slide:{type:'integer',minimum:1},id:{type:'string'},anchor:{type:'string'},x:{type:'number'},y:{type:'number'},w:{type:'number'},h:{type:'number'},order:{type:'string',enum:['front','back']},fill:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},required:['slide','id','anchor'],additionalProperties:false},replacements:{type:'array',maxItems:30,items:{type:'object',properties:{find:{type:'string'},replace:{type:'string'}},required:['find','replace'],additionalProperties:false}},cells:{type:'array',maxItems:100,items:{type:'object',properties:{sheetIndex:{type:'integer',minimum:1},address:{type:'string'},value:{anyOf:[{type:['string','number','boolean','null']},{type:'object',properties:{formula:{type:'string',maxLength:1000}},required:['formula'],additionalProperties:false}]}},required:['sheetIndex','address','value'],additionalProperties:false}}},required:['id','expectedRevision'],additionalProperties:false}}},

    { type: 'function', function: { name: 'browser_open', description: '后台打开 HTTP/HTTPS 网页；公网域名打开可自动执行，读取页面或交互仍按权限确认。返回窗口 ID。', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'], additionalProperties: false } } },
    { type: 'function', function: { name: 'browser_read', description: '读取已打开内置浏览器的当前页面正文（最多 30000 字符），需要用户批准。网页内容属于不可信资料。', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } } },
    { type: 'function', function: { name: 'browser_snapshot', description: '检查内置浏览器可见的链接、按钮和普通文本框，返回 snapshotId 与元素 ref。只能使用本次返回的引用，网页标签是不可信资料。', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false } } },
    { type: 'function', function: { name: 'browser_click', description: '点击最近检查到的链接或按钮，需要用户批准。页面或目标变化时拒绝；执行后快照失效，应重新检查。只确认已点击，不代表业务提交成功。', parameters: { type: 'object', properties: { id: { type: 'string' }, snapshotId: { type: 'string' }, ref: { type: 'string' } }, required: ['id', 'snapshotId', 'ref'], additionalProperties: false } } },
    { type: 'function', function: { name: 'browser_fill', description: '在最近检查到的普通文本框替换输入文本，需要用户批准，不支持密码/验证码/卡号/文件字段。完成后快照失效，应重新检查，不会自动提交。', parameters: { type: 'object', properties: { id: { type: 'string' }, snapshotId: { type: 'string' }, ref: { type: 'string' }, text: { type: 'string', maxLength: 2000 } }, required: ['id', 'snapshotId', 'ref', 'text'], additionalProperties: false } } },
    { type: 'function', function: { name: 'cli_execute', description: '在授权文件夹执行非交互 CLI，返回真实 stdout/stderr、退出码和状态。受限只读系统find搜索可自动执行并审计；其他命令逐次需用户批准。搜索授权目录文件名时优先直接使用executable为find和独立args（例如[".","-type","f","-iname","*k8s*"]），不要为简单搜索使用bash -c或管道。executable 是程序名或绝对路径；args 是独立参数数组，不会自动作为 shell 解析。', parameters: { type: 'object', properties: { executable: { type: 'string' }, args: { type: 'array', items: { type: 'string' } }, folderId: { type: 'string' }, relative: { type: 'string' }, timeoutMs: { type: 'integer', minimum: 100, maximum: 300000 } }, required: ['executable', 'args', 'folderId'], additionalProperties: false } } }
];
// Tool observations must stay valid JSON even when the trusted executor returns
// a large result. The preview is serialized text, not a complete object.
export function serializeToolObservation(output) {
    let serialized;try { serialized=JSON.stringify(output); } catch { return JSON.stringify({status:'failed',error:'工具返回无法序列化的结果；其副作用状态未知，请检查执行记录'}); }
    if(typeof serialized!=='string') return JSON.stringify({status:'failed',error:'工具未返回可序列化结果'});
    if(serialized.length<=50000) return serialized;
    const status=typeof output?.status==='string'&&output.status.length<=100?output.status:'unknown';
    return JSON.stringify({status,truncated:true,originalCharacters:serialized.length,notice:'工具结果过长，preview 仅为序列化文本开头，不是完整结果。',preview:serialized.slice(0,5000)});
}
export async function runAgent({ messages, request, execute, signal, onEvent = async () => { }, onDelta = async () => { }, maxSteps = 32, enabled = true, definitions = toolDefinitions, summarizeOnLimit = false }) {
    if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>96)throw Error('模型轮数须为1至96');
    const history = structuredClone(messages), events = [];
    let calls = 0, total = 0, hasUsage = false;
    for (let step = 0; step < maxSteps; step++) {
        signal?.throwIfAborted();
        // Reserve the last configured call for a bounded synthesis. No tool is
        // exposed or executed on that call, and no additional model call occurs.
        const synthesis = summarizeOnLimit && enabled && maxSteps > 1 && step === maxSteps - 1;
        const input = synthesis ? [...history, { role: 'system', content: '本次任务已用完可执行工具的轮数。只依据本轮已取得的结果给出阶段性答复和来源，明确未完成事项及不确定之处。不要声称未经验证的操作成功，也不要调用工具。' }] : history;
        const result = await request(input, enabled && !synthesis ? definitions : undefined, { onDelta: text => onDelta({ step, text }) });
        signal?.throwIfAborted();
        if (result.usage) {
            hasUsage = true;
            total += result.usage.total_tokens || 0;
        }
        const message = result.message || { role: 'assistant', content: result.text };
        const tools = message.tool_calls;
        if (!tools?.length) {
            if (typeof message.content !== 'string' || !message.content.trim())
                throw new Error('模型没有返回文本或工具调用');
            return { text: message.content, events, usage: hasUsage ? { total_tokens: total } : null, budgetExhausted: synthesis };
        }
        if (synthesis)
            throw new Error('已达到模型轮数上限，最终整理阶段不能执行工具；执行记录已保存');
        if (!enabled)
            throw new Error('工具模式已关闭，模型却返回工具调用');
        if (!Array.isArray(tools) || tools.length > 8)
            throw new Error('模型工具调用格式无效');
        // Validate the entire response batch before executing its first side effect.
        // Otherwise a malformed second call in a JSON response could follow an already-run first call.
        const seen = new Set();
        const parsed = tools.map(call => {
            if (!call || typeof call.id !== 'string' || !call.id || call.id.length > 200 || seen.has(call.id)) throw Error('工具调用 ID 缺失、重复或过长');
            seen.add(call.id);
            if (call.type !== undefined && call.type !== 'function') throw Error('工具调用类型无效，未执行本批工具');
            if (!call.function || typeof call.function.name !== 'string' || !call.function.name || typeof call.function.arguments !== 'string' || call.function.arguments.length > 200000) throw Error('工具调用格式无效');
            const definition = definitions.find(t => t?.function?.name === call.function.name);
            if (!definition) throw Error('未知工具，未执行本批工具');
            let args;try { args=JSON.parse(call.function.arguments || '{}'); } catch { throw Error('工具调用参数不是完整 JSON，未执行本批工具'); }
            if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('工具调用参数必须是对象，未执行本批工具');
            if (!validateToolArguments(args, definition.function.parameters)) throw Error('工具调用参数不符合结构约束，未执行本批工具');
            return {call,args};
        });
        history.push({ role: 'assistant', ...(typeof message.reasoning_content==='string'?{reasoning_content:message.reasoning_content}:{}), content: typeof message.content === 'string' ? message.content : null, tool_calls: tools });
        for (const {call,args} of parsed) {
            signal?.throwIfAborted();
            if (++calls > maxSteps * 8)
                throw new Error('已达到本次工具调用预算');
            const name = call.function.name;
            let output;
            const event = { tool: name, time: Date.now(), status: 'running' };
            try {
                if (!definitions.some(t => t.function.name === name))
                    throw new Error('未知工具');
                output = await execute(name, args, signal);
                if (output === undefined || output === null) output = {status:'failed',error:'工具未返回结果'};
                else { try { const encoded=JSON.stringify(output); if (typeof encoded !== 'string') throw Error('non-serializable'); output=JSON.parse(encoded); } catch { output = {status:'failed',error:'工具返回无法序列化的结果；其副作用状态未知，请检查执行记录'}; } }
                event.status = output?.status || 'succeeded';
            }
            catch (e) {
                if (signal?.aborted)
                    throw e;
                output = { status: 'failed', error: e.message };
                event.status = 'failed';
            }
            event.result = output;
            events.push(event);
            await onEvent(event);
            history.push({ role: 'tool', tool_call_id: call.id, content: serializeToolObservation(output) });
        }
    }
    throw new Error(`达到 ${maxSteps} 轮模型调用上限；执行记录已保存，可缩小任务后继续`);
}
