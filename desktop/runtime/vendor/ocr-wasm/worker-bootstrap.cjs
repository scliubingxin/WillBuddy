'use strict';
const path=require('path');
process.env.NODE_PATH=path.join(__dirname,'deps');require('module').Module._initPaths();
global.fetch=async()=>{throw Error('OCR 网络访问已禁用');};
require('./deps/tesseract.js/src/worker-script/node/index.js');
