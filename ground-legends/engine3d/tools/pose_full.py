# Body motion by speed from body-pose keypoints, the same code for real players (SkillCorner body pose from match
# video: 29 joints, 25 fps, two full A-League matches on huggingface.co/datasets/SkillCorner/opendata-bodypose) and
# for the game's 3D players (tools/export_match_pose.js, 30 fps). Development tool; results: MOVEMENT_ANALYSIS.md
# section 7.
#   SC_DATA=<folder with <id>_match.json> python3 -I pose_full.py real <id>.jsonl.zip [...] <out.json>
#   python3 -I pose_full.py game <game_pose.jsonl> [...] <out.json>
# Per player, unbroken runs of frames with joints (outfield players only) give: pelvis speed and acceleration, the
# hips' facing (square to the hip line, its sign from the nose), and per frame the travel against the facing, the trunk
# lean (neck over the hip middle) along the travel and sideways, the shoulders' twist against the hips, elbow and knee
# angles, and whether the head points within 45 / 90 deg of the ball. Over steady stretches (1.6 s, speed within 20%
# of its mean) the gait: steps per second (from the times the feet pass each other along the travel, with 6 cm
# hysteresis; at least three passes),
# stride length (two steps), arm swing (the wrist's range along the facing), knee range and the hips' bounce.
# Everything is grouped by speed (0.5 m/s bins) and the median of each bin is reported.
import json,sys,os,math,zipfile,collections,numpy as np
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle']
BINS=np.arange(0,9.5,0.5)

def frames(path):
    if path.endswith('.zip'):
        z=zipfile.ZipFile(path);name=[n for n in z.namelist() if n.endswith('.jsonl')][0]
        with z.open(name) as fh:
            for l in fh:yield json.loads(l)
    else:
        for l in open(path):
            d=json.loads(l)
            if 'meta' in d:continue
            yield d

def ang(a,b,c):
    u=a-b;v=c-b;return np.degrees(np.arccos(np.clip((u*v).sum(1)/(np.linalg.norm(u,axis=1)*np.linalg.norm(v,axis=1)+1e-9),-1,1)))

def ma(a,k):
    if len(a)<k:return a
    pad=k//2;ap=np.pad(a,[(pad,pad)]+[(0,0)]*(a.ndim-1),mode='edge');w=np.ones(k)/k
    return np.stack([np.convolve(ap[:,c],w,'valid') for c in range(a.shape[1])],1) if a.ndim>1 else np.convolve(ap,w,'valid')

class Acc:
    def __init__(s):s.f=collections.defaultdict(lambda:collections.defaultdict(list));s.w=collections.defaultdict(lambda:collections.defaultdict(list));s.n=0;s.acc=collections.defaultdict(list);s.turn=[]
    def seg(s,A,ball,fps):
        n=len(A['midHip']);dt=1/fps
        if n<fps:return
        s.n+=n
        P=ma(A['midHip'][:,:2],5);V=ma(np.gradient(P,dt,axis=0),5);v=np.hypot(V[:,0],V[:,1])
        acc=ma(np.gradient(v,dt),5)
        hip=A['rHip']-A['lHip'];f=np.stack([-hip[:,1],hip[:,0]],1)   # square to the hip line (left to right): forward or backward
        nf=(A['nose']-A['neck'])[:,:2];sg=np.sign(np.median((f*nf).sum(1)));f=ma(f*sg,5);f/=np.linalg.norm(f,axis=1,keepdims=True)+1e-9
        sh=A['rShoulder']-A['lShoulder'];fs=ma(np.stack([-sh[:,1],sh[:,0]],1)*sg,5);fs/=np.linalg.norm(fs,axis=1,keepdims=True)+1e-9
        u=V/(v[:,None]+1e-9)
        trav=np.degrees(np.arctan2(f[:,0]*u[:,1]-f[:,1]*u[:,0],(f*u).sum(1)))
        tw=np.degrees(np.arctan2(f[:,0]*fs[:,1]-f[:,1]*fs[:,0],(f*fs).sum(1)))
        T=A['neck']-A['midHip'];leanM=np.degrees(np.arctan2((T[:,:2]*u).sum(1),T[:,2]))
        side=np.stack([-u[:,1],u[:,0]],1);leanS=np.degrees(np.arctan2((T[:,:2]*side).sum(1),T[:,2]))   # towards the travel's left
        el=(ang(A['lShoulder'],A['lElbow'],A['lWrist'])+ang(A['rShoulder'],A['rElbow'],A['rWrist']))/2
        kn=np.stack([ang(A['lHip'],A['lKnee'],A['lAnkle']),ang(A['rHip'],A['rKnee'],A['rAnkle'])],1)
        hd=np.stack([A['nose'][:,0]-A['neck'][:,0],A['nose'][:,1]-A['neck'][:,1]],1)
        look=np.full(n,np.nan)
        if ball is not None:
            db=ball-A['neck'][:,:2];look=np.degrees(np.abs(np.arctan2(hd[:,0]*db[:,1]-hd[:,1]*db[:,0],(hd*db).sum(1))))
        # turning: heading rate, centripetal acceleration
        hdg=np.unwrap(np.arctan2(V[:,1],V[:,0]));om=ma(np.gradient(hdg,dt),5);ac=v*om
        for i in range(n):
            b=int(min(v[i],9.4)//0.5);F=s.f[b]
            if v[i]>0.3:F['trav'].append(trav[i]);F['leanM'].append(leanM[i])
            F['twist'].append(abs(tw[i]));F['elbow'].append(el[i]);F['knee'].append(kn[i].mean())
            if not np.isnan(look[i]):F['look'].append(look[i])
            if v[i]>2:s.acc[int(np.clip(round(acc[i]),-6,6))].append(leanM[i])
            if v[i]>2.5 and abs(ac[i])<12:s.turn.append((ac[i],leanS[i]))
        # gait over steady stretches
        d=ma(((A['lAnkle']-A['rAnkle'])[:,:2]*u).sum(1),3)
        Wn=int(1.6*fps);st=Wn//2
        for a in range(0,n-Wn,st):
            sl=slice(a,a+Wn);vm=v[sl].mean()
            if vm<0.8 or v[sl].min()<0.8*vm or v[sl].max()>1.2*vm:continue
            x=d[sl]-d[sl].mean();tc=[];state=0
            for i,y in enumerate(x):
                if y>0.06 and state<=0:
                    if state<0:tc.append(i)
                    state=1
                elif y<-0.06 and state>=0:
                    if state>0:tc.append(i)
                    state=-1
            if len(tc)<3:continue
            cad=(len(tc)-1)/((tc[-1]-tc[0])*dt);b=int(min(vm,9.4)//0.5);Wb=s.w[b]   # steps a second from the crossing times
            Wb['cadence'].append(cad);Wb['stride'].append(vm*2/cad)
            wr=np.concatenate([((A['lWrist']-A['lShoulder'])[sl,:2]*f[sl]).sum(1),((A['rWrist']-A['rShoulder'])[sl,:2]*f[sl]).sum(1)])
            Wb['armSwing'].append(float(np.percentile(wr,90)-np.percentile(wr,10)))
            k=kn[sl];Wb['kneeMin'].append(float(np.percentile(k,5)));Wb['kneeMax'].append(float(np.percentile(k,95)))
            z=A['midHip'][sl,2];Wb['bounce'].append(float(np.percentile(z,95)-np.percentile(z,5)))
    def report(s):
        R={'playerFrames':s.n,'bySpeed':{}}
        for b in sorted(set(s.f)|set(s.w)):
            F=s.f[b];W=s.w[b];o={'n':len(F['knee'])}
            if F['trav']:t=np.abs(F['trav']);o['travel']={'fwd':round(float((t<45).mean()*100)),'side':round(float(((t>=45)&(t<135)).mean()*100)),'back':round(float((t>=135).mean()*100))}
            for k in ['leanM','twist','elbow','knee']:
                if F[k]:o[k]=round(float(np.median(F[k])),1)
            if F['look']:L=np.array(F['look']);o['lookBall45']=round(float((L<45).mean()*100));o['lookBall90']=round(float((L<90).mean()*100))
            for k,v in W.items():o[k]=round(float(np.median(v)),3);o['nWin']=len(W['cadence'])
            R['bySpeed'][f'{b*0.5:.1f}-{b*0.5+0.5:.1f}']=o
        R['leanByAccel']={k:round(float(np.median(v)),1) for k,v in sorted(s.acc.items()) if len(v)>30}
        if s.turn:t=np.array(s.turn);ok=np.abs(t[:,0])<8;R['turnLeanDegPerMs2']=round(float(np.polyfit(t[ok,0],t[ok,1],1)[0]),2)
        return R

def run(kind,paths):
    S=Acc()
    for path in paths:
        gk=set();fps=25
        if kind=='real':
            mid=os.path.basename(path).split('.')[0];m=json.load(open(os.path.join(os.environ.get('SC_DATA','.'),f'{mid}_match.json')))
            gk={p['id'] for p in m['players'] if (p.get('player_role') or {}).get('acronym')=='GK'}
        else:fps=30
        buf={};last={}
        def close(pid):
            B=buf.pop(pid,None)
            if B and len(B['f'])>=fps:
                A={j:np.array([x[j] for x in B['j']],dtype=float) for j in J};S.seg(A,np.array(B['b'],dtype=float) if None not in B['b'] else None,fps)
        nf=0
        for d in frames(path):
            nf+=1;fr=d['frame'];b=d['ball_data'];bxy=(b['x'],b['y']) if b and b.get('x') is not None else None;seen=set()
            for p in d['player_data']:
                pid=p['player_id']
                if pid in gk or p.get('gk'):continue
                js=p.get('joints')
                if not js or any(j not in js for j in J):continue
                seen.add(pid)
                if pid in buf and last.get(pid)!=fr-1:close(pid)
                B=buf.setdefault(pid,{'f':[],'j':[],'b':[]});B['f'].append(fr);B['j'].append({j:js[j]['xyz'] for j in J});B['b'].append(bxy);last[pid]=fr
            for pid in [q for q in buf if q not in seen]:close(pid)
            if nf%20000==0:print(path,nf,'frames',S.n,'player-frames',flush=True)
        for pid in list(buf):close(pid)
    return S.report()

if __name__=='__main__':
    R=run(sys.argv[1],sys.argv[2:-1]);json.dump(R,open(sys.argv[-1],'w'),indent=1)
    print('player-frames',R['playerFrames'])
    for k,o in R['bySpeed'].items():print(k,json.dumps(o,ensure_ascii=False))
    print('lean by accel',R['leanByAccel'],'turn lean deg per m/s2',R.get('turnLeanDegPerMs2'))
