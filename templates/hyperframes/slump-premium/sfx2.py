"""Slump reel SFX: earshot (made offline) + Openverse CC0 recordings. No music."""
import json, subprocess, numpy as np, soundfile as sf
SR=48000; d=json.load(open('beats.json')); B=d['B']; END=d['END']
N=int(SR*(END+0.5)); out=np.zeros(N,np.float32)
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    x=np.frombuffer(raw,np.float32).copy(); return x/(np.max(np.abs(x))+1e-9)
def trim(x,dur,fade=0.03):
    n=min(len(x),int(dur*SR)); x=x[:n].copy(); f=int(fade*SR); x[-f:]*=np.linspace(1,0,f); return x
def rate(x,r):  # simple resample for pitch variation
    i=np.arange(0,len(x)-1,r); return np.interp(i,np.arange(len(x)),x).astype(np.float32)
def add(t,x,g):
    i=int(t*SR); x=x[:N-i]; out[i:i+len(x)]+=x*g
s=lambda n: load('snd/'+n)
CLANK=s('pot_lid_set.wav'); MUD=s('step_mud.wav'); HEAVY=s('heavy_drop_floor.wav'); ROD=s('metal_drop.wav')
TICK=s('tick_metal.wav'); BAG=s('bag_drop.wav'); WH1=s('whoosh_1.mp3'); WH2=s('whoosh_2.mp3'); PAPER=s('paper-slide_1.mp3')
AMB=s('site-ambience_1.mp3')
T1,T2,T3,T4,T5,T6=B[1],B[2],B[3],B[4],B[5],B[6]
add(T1+0.62,trim(CLANK,0.8),0.34)                      # cone set on the plate
rng=np.random.default_rng(7)
for (a,b) in [(T2+0.95,T2+1.9),(T2+2.4,T2+3.3),(T2+3.8,T2+4.6)]:
    add(a-0.25,trim(BAG,0.35),0.16)                    # scoop of concrete in
    for i in range(6): add(a+(i+0.45)/6*(b-a),trim(rate(MUD,rng.uniform(0.9,1.15)),0.22),0.12)  # rod strokes
add(T3-0.1,WH1,0.30)                                   # re-hook flood
for dd in (0.22,0.52,0.86): add(T3+dd+0.02,trim(HEAVY,0.5),0.30)
add(T4-0.34,rate(WH2,1.1),0.22)
LIFT0=T4+0.25; LIFT1=LIFT0+4.6; FLIP0=LIFT1+0.05; FLIP1=FLIP0+0.85; ROD1=FLIP1+0.1+0.7
add(LIFT0+1.9,trim(rate(MUD,0.7),0.6),0.20)            # concrete sags
add(FLIP0+0.1,WH2,0.14)
add(FLIP1,trim(CLANK,0.8),0.28)                        # cone set down inverted
add(ROD1-0.05,trim(ROD,0.6),0.20)                      # rod laid across
add(T6+0.25,trim(PAPER,0.6),0.22)                      # ticket slides in
add(T6+2.45,trim(TICK,0.3),0.30)
add(T6+5.6,trim(HEAVY,0.5),0.30)
add(B[7]-0.3,rate(WH1,1.2),0.16)
# site ambience bed, low and filtered, fading in and out
a=AMB[int(3*SR):int(3*SR)+N]; a=np.pad(a,(0,N-len(a)))
X=np.fft.rfft(a); f=np.fft.rfftfreq(N,1/SR); X[f>6000]*=0.3; a=np.fft.irfft(X,N).astype(np.float32)
e=np.ones(N,np.float32); k=int(1.2*SR); e[:k]=np.linspace(0,1,k); e[-k:]=np.linspace(1,0,k)
out+=a*e*0.05
pk=np.max(np.abs(out)); out=out/pk*10**(-3/20)
sf.write('proj/assets/sfx.wav',out,SR); print('ok',END,round(float(pk),3))
