const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+__dirname+'/export.html');
const out=await p.evaluate(()=>{const r=[];const N=Math.round(37.077*30);for(let f=0;f<N;f++){window.__renderStage(f/30);r.push(JSON.parse(JSON.stringify(window.__lastState)));}return r;});
require('fs').writeFileSync(__dirname+'/states.json',JSON.stringify(out));console.log(out.length, JSON.stringify(out[300]));await b.close();})();
