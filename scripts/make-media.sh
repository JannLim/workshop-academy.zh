#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2026 SubLang International <https://sublang.ai>

# 重新生成 media/ 下的示例视频：640×360，H.264 + AAC，带 faststart。
# 用法：scripts/make-media.sh
# 依赖：ffmpeg（带 libx264），以及 python3 + Pillow 用指定字体渲染中文文字图层
# （Homebrew 的 ffmpeg 未编入 drawtext 滤镜）。
# 可用 FFMPEG、FONT、PYTHON 环境变量覆盖默认路径。

set -euo pipefail

FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"
FONT="${FONT:-/System/Library/Fonts/Hiragino Sans GB.ttc}"
PYTHON="${PYTHON:-python3}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/media"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

# 文字图层：背景（底色、标题、副标题）和每秒一张的计时图。
# 计时和进度条放在顶部，底部约 70 像素留给浏览器的播放控件。
# render_layers <文件名> <时长秒> <背景色> <标题>
render_layers() {
  "$PYTHON" - "$WORK" "$FONT" "$@" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFont

work, font_path, name, seconds, bg, title = sys.argv[1:7]
seconds = int(seconds)
bg = '#' + bg.removeprefix('0x')
W, H = 640, 360

def font(size):
    return ImageFont.truetype(font_path, size)

def centered(draw, y, text, size, fill):
    f = font(size)
    width = draw.textlength(text, font=f)
    draw.text(((W - width) / 2, y), text, font=f, fill=fill)

image = Image.new('RGB', (W, H), bg)
draw = ImageDraw.Draw(image)
# 顶部像素条与左上角品牌块
for x in range(0, W, 16):
    draw.rectangle([x, 0, x + 7, 7], fill='#E3C8F0' if (x // 16) % 2 == 0 else '#B86FDB')
draw.rectangle([40, 40, 63, 63], fill='#FFFFFF')
draw.polygon([(48, 45), (48, 59), (58, 52)], fill=bg)
draw.text((76, 40), '学堂在线', font=font(18), fill='#FFFFFF')
centered(draw, 104, title, 34, '#FFFFFF')
centered(draw, 156, '示例视频 · 仅供课堂练习', 18, '#E3C8F0')
image.save(f'{work}/{name}-bg.png')

for second in range(seconds + 1):
    timer = Image.new('RGBA', (220, 28), (0, 0, 0, 0))
    label = f'{second} 秒 / {seconds} 秒'
    timer_draw = ImageDraw.Draw(timer)
    timer_draw.text((220 - timer_draw.textlength(label, font=font(18)), 2), label, font=font(18), fill='#FFFFFF')
    timer.save(f'{work}/{name}-timer-{second:02d}.png')
PY
}

# make <文件名> <时长秒> <背景色> <方块色> <方块横坐标表达式> <方块纵坐标表达式> <标题>
make() {
  local name="$1" seconds="$2" bg="$3" block="$4" bx="$5" by="$6" title="$7"
  render_layers "$name" "$seconds" "$bg" "$title"

  # 进度条：浅色条在深色槽里随时间右移，槽外部分被裁掉；位于品牌行下方。
  local video="color=c=0x15161A:s=560x6:r=24:d=$seconds[track];"
  video+="color=c=0xE3C8F0:s=560x6:r=24:d=$seconds[fill];"
  video+="[track][fill]overlay=x='-560+560*t/$seconds':y=0[bar];"
  video+="[0:v][bar]overlay=x=40:y=80"
  video+=",drawbox=x='$bx+4':y='$by+4':w=28:h=28:color=0x15161A@0.6:t=fill"
  video+=",drawbox=x='$bx':y='$by':w=28:h=28:color=$block:t=fill[base];"
  video+="[base][1:v]overlay=x=380:y=40:eof_action=repeat,format=yuv420p[v];"
  video+="[2:a]volume=0.02[a]"

  "$FFMPEG" -hide_banner -loglevel error -y \
    -loop 1 -framerate 24 -t "$seconds" -i "$WORK/$name-bg.png" \
    -framerate 1 -i "$WORK/$name-timer-%02d.png" \
    -f lavfi -i "sine=frequency=330:sample_rate=44100:duration=$seconds" \
    -filter_complex "$video" \
    -map '[v]' -map '[a]' \
    -c:v libx264 -preset slow -tune animation -crf 30 -g 48 \
    -c:a aac -b:a 32k -ac 1 \
    -t "$seconds" -movflags +faststart \
    "$OUT/$name.mp4"
  printf '已生成 media/%s.mp4（%s 字节）\n' "$name" "$(wc -c < "$OUT/$name.mp4" | tr -d ' ')"
}

make python-basics   18 0x27063D 0xE3C8F0 '40+mod(t*60\,532)'           '220'                        'Python 入门：写出第一个程序'
make git-essentials  20 0x5B0F84 0xF6F0F9 '40+abs(mod(t*90\,1064)-532)' '200+abs(mod(t*40\,120)-60)' '用 Git 管好每一次修改'
make web-api-testing 22 0x890FBC 0x27063D '306+200*sin(t*0.9)'          '180+abs(mod(t*70\,160)-80)' 'Web 接口设计与测试'
make sqlite-modeling 16 0x3D0A5C 0xB86FDB '306+220*cos(t*1.2)'          '230+30*sin(t*2.4)'          'SQLite 数据建模实践'
