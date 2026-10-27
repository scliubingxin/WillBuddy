#!/bin/bash
set -euo pipefail
# Same-volume rename avoids copying all bundled runtime files again.
# Cross-volume source (e.g. mounted image) retains a verified staging copy.
install_app_transaction() (
  set -euo pipefail
  local source_app="$1" target_app="$2" parent stage_dir staged backup source_dev target_dev moved=0
  parent="$(dirname -- "$target_app")"
  [ ! -L "$target_app" ] || return 1
  [ ! -e "$parent/WillBuddy.previous.app" ] || { echo '已存在旧版备份，请先移走 WillBuddy.previous.app。'; return 1; }
  stage_dir="$(mktemp -d "$parent/.WillBuddy-install.XXXXXX")"
  staged="$stage_dir/WillBuddy.app"
  backup="$parent/WillBuddy.previous.app"
  # Cleanup must restore source and previous version on any failed commit.
  rollback() {
    local result=$?
    if [ "$result" -ne 0 ]; then
      if [ "$moved" = 1 ] && [ -d "$staged" ] && [ ! -e "$source_app" ]; then mv -- "$staged" "$source_app" || true; fi
      if [ -d "$backup" ] && [ ! -e "$target_app" ]; then mv -- "$backup" "$target_app" || true; fi
    fi
    rmdir "$stage_dir" 2>/dev/null || true
    exit "$result"
  }
  trap rollback EXIT
  source_dev="$(stat -f %d "$source_app")"
  target_dev="$(stat -f %d "$parent")"
  [ -n "$source_dev" ] && [ -n "$target_dev" ]
  if [ "$source_dev" = "$target_dev" ]; then
    echo '同一磁盘：直接移动应用，不再复制内置运行时。'
    mv -- "$source_app" "$staged"
    moved=1
  else
    echo '跨磁盘：复制到目标磁盘后校验。'
    /usr/bin/ditto "$source_app" "$staged"
    /usr/bin/codesign --verify --deep --strict "$staged"
  fi
  [ ! -e "$target_app" ] || mv -- "$target_app" "$backup"
  mv -- "$staged" "$target_app"
)

main() {
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
/usr/bin/osascript -e 'display dialog "将已解压的 WillBuddy 移入个人 Applications 文件夹（同一磁盘不重复复制）。请先从菜单彻底退出旧版 WillBuddy。已有配置与对话不会删除。" buttons {"取消", "安装"} default button "安装" cancel button "取消"'
mkdir -p "$target_parent"
if [ -L "$target_app" ]; then
  echo '安装目标是符号链接，请手动检查后再安装。'
  exit 1
fi
echo '[1/3] 正在校验签名与资源，请保持窗口打开…'
/usr/bin/codesign --verify --deep --strict "$source_app"
echo '[2/3] 正在安装…'
install_app_transaction "$source_app" "$target_app"
echo '[3/3] 安装完成。'
/usr/bin/osascript -e 'display dialog "安装完成。WillBuddy 位于个人 Applications 文件夹。首次打开如被系统拦截，请在系统设置 → 隐私与安全性中检查并选择仍要打开。" buttons {"完成"} default button "完成"'
/usr/bin/open -R "$target_app"

}
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main; fi
