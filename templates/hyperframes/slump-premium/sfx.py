import json, numpy as np, soundfile as sf
SR=48000; d=json.load(open('beats.json')); B=d['B']; END=d['END']
N=int(SR*(END+0.5)); out=np.zeros(N,np.float32); rng=np.random.default_rng(4)
def env(n,a,dec): t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/dec); return e
def bp(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def add(t,x,g):
    i=int(t*SR); x=x[:N-i]; out[i:i+len(x)]+=x*g
def clank(dur=0.5):
    n=int(SR*dur); x=bp(rng.standard_normal(n),500,3500)*env(n,0.002,0.06)
    t=np.arange(n)/SR
    for f,a in((1240,.3),(2010,.2),(3170,.12)): x+=a*np.sin(2*np.pi*f*t)*np.exp(-t/0.12)*np.max(np.abs(x))
    return x/np.max(np.abs(x))
def thud(dur=0.4,lo=40,hi=300,dec=0.09):
    n=int(SR*dur); x=bp(rng.standard_normal(n),lo,hi)*env(n,0.004,dec); return x/np.max(np.abs(x))
def whoosh(dur=0.45,up=True):
    n=int(SR*dur); t=np.arange(n)/SR; x=rng.standard_normal(n)
    seg=[]; k=8
    for j in range(k):
        a,b=j*n//k,(j+1)*n//k; c=(j+.5)/k; f=300+2500*(c if up else 1-c)
        seg.append(bp(x[a:b],f*0.6,f*1.6))
    x=np.concatenate(seg)*np.sin(np.pi*t/dur)**2; return x/np.max(np.abs(x))
def paper(dur=0.35):
    n=int(SR*dur); t=np.arange(n)/SR; x=bp(rng.standard_normal(n),2500,9000)*np.sin(np.pi*t/dur)**1.5; return x/np.max(np.abs(x))
T1,T2,T3,T4,T5,T6=B[1],B[2],B[3],B[4],B[5],B[6]
add(T1+0.62,clank(),0.35)
for (a,b) in [(T2+0.95,T2+1.9),(T2+2.4,T2+3.3),(T2+3.8,T2+4.6)]:
    for i in range(6): add(a+(i+0.45)/6*(b-a),thud(0.25,60,500,0.04),0.16)
add(T3-0.08,whoosh(0.4),0.22)
for dd in (0.22,0.52,0.86): add(T3+dd+0.02,thud(0.5,30,180,0.12),0.5)
add(T4-0.34,whoosh(0.35,False),0.18)
LIFT0=T4+0.25; LIFT1=LIFT0+4.6; FLIP0=LIFT1+0.05; FLIP1=FLIP0+0.85; ROD1=FLIP1+0.1+0.7
add(LIFT0+1.9,thud(0.7,30,160,0.25),0.28)
add(FLIP0+0.1,whoosh(0.5),0.12)
add(FLIP1,clank(0.5),0.3)
add(ROD1-0.05,clank(0.4),0.18)
add(T6+0.25,paper(),0.18)
add(T6+2.45,thud(0.3,80,900,0.05),0.3)
add(T6+5.25+0.35,thud(0.5,40,200,0.1),0.4)
add(B[7]-0.3,whoosh(0.4,False),0.12)
pk=np.max(np.abs(out)); out=out/pk*10**(-3/20)
sf.write('proj/assets/sfx.wav',out,SR); print('ok',END)
