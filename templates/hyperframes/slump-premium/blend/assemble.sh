# fill hidden-frame gaps with the nearest rendered frame, composite over the paper ground, upscale, encode
set -e
cd "$(dirname "$0")"; rm -rf seq; mkdir seq
last=""
for i in $(seq 0 1112); do
  f=$(printf "plate/f%04d.png" $i)
  if [ -f "$f" ]; then last=$f; fi
  ln -s "../$last" $(printf "seq/%04d.png" $i)
done
ffmpeg -y -v error -f lavfi -i "color=c=0xEFEBE4:s=1080x1920:r=30" -framerate 30 -i seq/%04d.png \
  -filter_complex "[1]scale=1080:1920:flags=lanczos,format=rgba[p];[0][p]overlay=shortest=1,format=yuv420p" \
  -frames:v 1113 -c:v libx264 -crf 14 -preset slow -g 15 ../proj/assets/plate.mp4
ffprobe -v error -count_frames -show_entries stream=nb_read_frames -of csv=p=0 ../proj/assets/plate.mp4
