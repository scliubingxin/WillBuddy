#!/bin/bash
set -euo pipefail
here="$(cd -- "$(dirname -- "$0")" && pwd)"
app="$HOME/Applications/WillBuddy.app"
[ -d "$app" ] || app='/Applications/WillBuddy.app'
[ -d "$app" ] || { echo '未找到已安装应用；请使用完整离线包。'; exit 1; }
/usr/bin/osascript -e 'display dialog "此小更新仅支持已安装的 WillBuddy 0.37.0。请先从菜单彻底退出应用。更新使用本机 APFS 克隆，不再解压整套 Python/Office。旧版保留为备份，校验失败停止。" buttons {"取消", "更新"} default button "更新" cancel button "取消"'
python="$app/Contents/Resources/runtimes/python/bin/python3.12"
[ -x "$python" ] || { echo '缺少内置Python，请使用完整包。'; exit 1; }
"$python" -I "$here/update-app.py" "$app"
/usr/bin/osascript -e 'display dialog "更新已完成。可以重新打开 WillBuddy。" buttons {"完成"}'
