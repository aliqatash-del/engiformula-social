set -e
S=/tmp/claude-0/-home-claude/6ebc464b-f5af-5953-b0f4-521268b638ee/scratchpad; P=$S/prem/proj
cd $S/libs && NODE_PATH=$S/libs/node_modules npx esbuild $P/src/scene.js --bundle --format=iife --minify --log-level=error --outfile=$P/assets/lib/stage.js
python3 - <<'PY'
p='/tmp/claude-0/-home-claude/6ebc464b-f5af-5953-b0f4-521268b638ee/scratchpad/prem/proj/assets/lib/stage.js'; s=open(p).read()
s=s.replace('Math.random()','__hfRand()').replace('requestAnimationFrame','__hfRAF')
pre='var __hfSeed=12345;function __hfRand(){__hfSeed=(__hfSeed*16807)%2147483647;return (__hfSeed-1)/2147483646;}function __hfRAF(){return 0;}\n'
open(p,'w').write(pre+s)
PY
python3 $S/prem/gen.py
