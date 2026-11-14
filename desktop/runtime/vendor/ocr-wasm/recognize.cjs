'use strict';
const fs=require('fs'),path=require('path');
process.env.NODE_PATH=path.join(__dirname,'deps');require('module').Module._initPaths();
global.fetch=async()=>{throw Error('OCR 网络访问已禁用');};
const {createWorker}=require('./deps/tesseract.js');
(async()=>{
 const input=process.argv[2],language=process.argv[3];
 if(language!=='eng')throw Error('此离线 OCR 仅含英文语言数据');
 const image=fs.readFileSync(input);if(image.length>4*1024*1024)throw Error('OCR 图片超过大小限制');
 const worker=await createWorker('eng',1,{workerPath:path.join(__dirname,'worker-bootstrap.cjs'),langPath:path.join(__dirname,'data'),gzip:false,cacheMethod:'none'});
 try{const result=await worker.recognize(image,{}, {text:false,tsv:true});if(typeof result.data.tsv!=='string')throw Error('OCR 输出缺少定位数据');process.stdout.write(result.data.tsv);}
 finally{await worker.terminate();}
})().catch(e=>{process.stderr.write(String(e?.message||e).slice(0,500)+'\n');process.exitCode=1;});
