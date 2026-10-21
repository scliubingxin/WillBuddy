#!/bin/bash
set -euo pipefail
installer_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
source_app="$installer_dir/WillBuddy.app"
target_parent="$HOME/Applications"
target_app="$target_parent/WillBuddy.app"
if [ "$(uname -m)" != "arm64" ]; then
  /usr/bin/osascript -e 'display alert "此安装包仅适用于 Apple 芯片 Mac。"'
  exit 1
fi
if [ ! -d "$source_app/Contents/MacOS" ]; then
  /usr/bin/osascript -e 'display alert "请先完整解压安装包，并将安装脚本与 WillBuddy.app 放在同一目录。"'
  exit 1
fi
residue_path="$(/usr/bin/find "$source_app" \( -name '.BC.*' -o -name '._*' -o -name '__MACOSX' -o -name '.DS_Store' \) -print -quit)"
if [ -n "$residue_path" ]; then
  /usr/bin/osascript -e 'display alert "安装包包含打包残留，已停止安装。请获取重新验证的完整离线包，不要忽略签名错误。"'
  exit 1
fi
/usr/bin/osascript -e 'display dialog "将 WillBuddy 安装到你的个人 Applications 文件夹。请先从菜单彻底退出旧版 WillBuddy。已有配置与对话不会删除。" buttons {"取消", "安装"} default button "安装" cancel button "取消"'
mkdir -p "$target_parent"
if [ -L "$target_app" ]; then
  echo '安装目标是符号链接，请手动检查后再安装。'
  exit 1
fi
stage_dir="$(/usr/bin/mktemp -d "$target_parent/.WillBuddy-install.XXXXXX")"
trap 'rm -rf -- "$stage_dir"' EXIT
/usr/bin/ditto "$source_app" "$stage_dir/WillBuddy.app"
/usr/bin/codesign --verify --deep --strict "$stage_dir/WillBuddy.app"
if [ -e "$target_app" ]; then
  if [ -e "$target_parent/WillBuddy.previous.app" ]; then
    echo '已存在旧版备份 WillBuddy.previous.app；请先手动移走该备份再安装。'
    exit 1
  fi
  mv -- "$target_app" "$target_parent/WillBuddy.previous.app"
fi
if ! mv -- "$stage_dir/WillBuddy.app" "$target_app"; then
  if [ -e "$target_parent/WillBuddy.previous.app" ]; then
    mv -- "$target_parent/WillBuddy.previous.app" "$target_app"
  fi
  exit 1
fi
/usr/bin/osascript -e 'display dialog "安装完成。WillBuddy 位于个人 Applications 文件夹。首次打开如被系统拦截，请在系统设置 → 隐私与安全性中检查并选择仍要打开。" buttons {"完成"} default button "完成"'
/usr/bin/open -R "$target_app"
