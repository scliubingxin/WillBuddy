#!/bin/bash
set -e
cd -- "$(dirname -- "$0")/desktop"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo '请先安装 Node.js 24 LTS，然后重新打开此文件。'
  read -r -p '按 Enter 关闭…'
  exit 1
fi
if [ ! -d node_modules/electron ]; then npm ci; fi
npm start
