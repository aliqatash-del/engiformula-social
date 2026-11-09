// Render motion-kit scenes to MP4: node scripts/render_motion.js <scene> [...] [--out dir] [--fps 30] [--stills t1,t2]
// Each scene lives in motion/scenes/<scene>.js and is a pure function of time, so frames are deterministic.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = opt('--out', path.join(__dirname, '..', 'motion', 'out'));
const fps = Number(opt('--fps', 30));
const preview = args.includes('--preview'); if (preview) args.splice(args.indexOf('--preview'), 1);
const stills = (opt('--stills', '') || '').split(',').filter(Boolean).map(Number);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const name of args) {
    const url = 'file://' + path.join(__dirname, '..', 'motion', 'index.html') + '?scene=' + name;
    await page.goto(url);
    const dur = await page.evaluate(() => window.ready);
    const n = preview ? 0 : Math.round(dur * fps);
    const mp4 = path.join(out, name + '.mp4');
    if (!preview) {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
      '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-g', '60',
      '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const data = await page.evaluate(t => window.frame(t), f / fps);
      const buf = Buffer.from(data.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    }
    for (const t of stills) {
      const data = await page.evaluate(t => window.frame(t, 0.9), t);
      fs.writeFileSync(path.join(out, `${name}@${t}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    }
    console.log(`${name}: ${n} frames, ${dur}s -> ${mp4}`);
  }
  await browser.close();
})();
