// Produce a reproducible Chinese enterprise deck with the production exporter.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {buildPptx} from '../lib/slides.ts';

const title='设备维护月度复盘';
const content=`# 本月情况
- 完成 42 台设备例行检查，发现 6 项需要跟进的问题。
- 3 项问题已完成处理，其余事项均已指定责任人和完成时间。
- 一线记录继续保留原始描述，复盘时补充标准术语，避免遗漏现场信息。

## 重点问题
- 包装线传感器出现间歇性误报，需要核对安装位置和接线状态。
- 两份交接记录缺少材料批次，责任人将在本周五前补齐。
- 夜班故障描述存在口语表达，已安排班组长复核并补充标准故障名称。
- 本月未发生影响交付的停线事故。

## 下月安排
- 完成传感器专项检查并记录整改前后的误报次数。
- 将维修记录模板更新为“现象、位置、操作、结果”四项必填字段。
- 每周抽查 10 条记录，发现信息缺失时在班前会反馈。`;
const deck=buildPptx(title,content),bytes=await deck.write({outputType:'uint8array'}),directory=resolve('outputs/pptx-acceptance'),file=resolve(directory,'muyun-ai-maintenance-review.pptx');
mkdirSync(directory,{recursive:true});writeFileSync(file,bytes);
console.log(JSON.stringify({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),expected_slides:4,model_requests:0,scope:'synthetic production PPTX; no services or user data'},null,2));
