#!/bin/bash
set -euo pipefail
umask 077
here="$(cd -- "$(dirname -- "$0")" && pwd)"
app="$HOME/Applications/WillBuddy.app"
[ -d "$app" ] || app='/Applications/WillBuddy.app'
[ -d "$app" ] || { echo '未找到已安装应用；请使用完整离线包。'; exit 1; }
/usr/bin/osascript -e 'display dialog "此小更新仅支持已安装的 WillBuddy 0.37.0。请先从菜单彻底退出应用。更新使用本机 APFS 克隆，不再解压整套 Python/Office。旧版保留为备份，校验失败停止。" buttons {"取消", "更新"} default button "更新" cancel button "取消"'
python="$app/Contents/Resources/runtimes/python/bin/python3.12"
[ -x "$python" ] || { echo '缺少内置Python，请使用完整包。'; exit 1; }
log_dir="$HOME/Library/Logs/WillBuddy"
mkdir -p "$log_dir"
log="$log_dir/update-$(date +%Y%m%d-%H%M%S)-$$.log"
echo "更新进度与系统原始错误将保存在：$log"
echo '签名检查可能需要一段时间，每5秒显示进度；超时会停止。'
if "$python" -I -B "$here/update-app.py" "$app" 2>&1 | /usr/bin/tee "$log"; then
  echo "日志：$log"
else
  echo "更新未完成，请保留此日志以定位原因：$log"
  echo '请勿反复重试，也不要移除隔离属性或跳过签名验证。'
  exit 1
fi
/usr/bin/osascript -e 'display dialog "更新已完成。可以重新打开 WillBuddy。" buttons {"完成"}'
