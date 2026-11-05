#!/bin/sh
# Build → render → loudness for each reel, one at a time (a render reads index.html).
# Usage: sh capture/render-all.sh [cbt proctor sched]
set -e
cd "$(dirname "$0")/.."
mkdir -p ../../exports "D:/hf-render-tmp"
for r in ${@:-cbt proctor sched}; do
  node capture/build-reel.mjs "$r" | tail -1
  cp index.html "capture/$r/index.html"
  TMP="D:\hf-render-tmp" TEMP="D:\hf-render-tmp" npx hyperframes render --quality looks --workers 2 --output "renders/reel-$r-v1.mp4" > "renders/render-$r.log" 2>&1
  # YouTube/Instagram loudness: two-pass loudnorm to -14 LUFS, picture copied.
  m=$(ffmpeg -hide_banner -nostats -i "renders/reel-$r-v1.mp4" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  val() { echo "$m" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
  ffmpeg -y -loglevel error -i "renders/reel-$r-v1.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true,aresample=48000" -c:a aac -b:a 256k -movflags +faststart "../../exports/testoza-reel-$r-v1.mp4"
  echo "$r done: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "../../exports/testoza-reel-$r-v1.mp4")s"
done
