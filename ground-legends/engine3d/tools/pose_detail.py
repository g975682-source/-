# Joint by joint and gesture by gesture analysis of real footballers from SkillCorner's body pose (match video, 29
# joints, 25 fps, huggingface.co/datasets/SkillCorner/opendata-bodypose) with the match's dynamic events (possessions,
# passes and shots, pressing engagements, off-ball runs). Development tool; results: MOVEMENT_ANALYSIS.md section 8.
#   SC_DATA=<folder> python3 -I pose_detail.py extract <id>.jsonl.zip <out.npz>     (one match; about 15 min)
#   python3 -I pose_detail.py report <a.npz> [<b.npz> ...] <out.json>
# SC_DATA holds <id>_match.json and <id>_dynamic_events.csv. Per player-frame (unbroken runs of frames with joints,
# lightly smoothed) it measures, in the player's own frame (forward = square to the hip line, up = z):
#  trunk lean forward and sideways, shoulders' twist against the hips, head turn against the shoulders and head drop,
#  each arm's elevation (upper arm from hanging, in the side plane and the front plane), elbow angle, the wrist's height,
#  forward and outward place against its shoulder, wrist bend (forearm to hand: elbow-wrist-middle of thumb and pinky),
#  each leg's hip flexion (thigh from vertical, forward +), knee angle, foot pitch (big toe over heel) and toe-out,
#  stance width, the hips' height against the player's own standing height,
# and the context: goalkeeper, team in or out of possession, the ball carrier, pressing (an on-ball engagement), an
# off-ball run, distance to the ball and to the nearest opponent, speed and acceleration. Gestures are counted from the
# joints: an arm raised (wrist 15 cm above the shoulder), both raised, an arm out to the side (wrist 45 cm out), pointing
# (a straight arm, elbow over 150 deg, the wrist at shoulder height and 50 cm out in front or to the side), hands on hips,
# hands on knees. Kicks (possessions ending in a pass, shot or clearance) keep the joints from 0.8 s before to 0.4 s
# after the strike (the kicking ankle's fastest moment within 0.25 s of the event's end), in the kick's own frame
# (forward = the ball's direction after it).
import json,sys,os,math,zipfile,csv,collections,numpy as np
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','lThumb','rThumb','lPinky','rPinky','midHip','lHip','rHip',
   'lKnee','rKnee','lAnkle','rAnkle','lHeel','rHeel','lBigToe','rBigToe']
FEAT=['v','acc','trav','leanF','leanS','twist','headYaw','headDrop','lookBall',
  'lElevS','rElevS','lElevF','rElevF','lElbow','rElbow','lWrZ','rWrZ','lWrF','rWrF','lWrOut','rWrOut','lWrBend','rWrBend',
  'lHipFlex','rHipFlex','lKnee','rKnee','lFootPitch','rFootPitch','lToeOut','rToeOut','stance','hipH',
  'gk','inPoss','carrier','press','run','dBall','dOpp','turnRate']
KJ=['neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle','lBigToe','rBigToe']

def frames(path):
    z=zipfile.ZipFile(path);name=[n for n in z.namelist() if n.endswith('.jsonl')][0]
    with z.open(name) as fh:
        for l in fh:yield json.loads(l)

def ma(a,k):
    if len(a)<k:return a
    pad=k//2;ap=np.pad(a,[(pad,pad)]+[(0,0)]*(a.ndim-1),mode='edge');w=np.ones(k)/k
    if a.ndim==1:return np.convolve(ap,w,'valid')
    sh=a.shape;f=ap.reshape(ap.shape[0],-1);out=np.stack([np.convolve(f[:,c],w,'valid') for c in range(f.shape[1])],1);return out.reshape((sh[0],)+sh[1:])

def ang(a,b,c):
    u=a-b;v=c-b;return np.degrees(np.arccos(np.clip((u*v).sum(-1)/(np.linalg.norm(u,axis=-1)*np.linalg.norm(v,axis=-1)+1e-9),-1,1)))

def extract(path,out):
    mid=os.path.basename(path).split('.')[0];D=os.environ.get('SC_DATA','.')
    m=json.load(open(f'{D}/{mid}_match.json'));home=m['home_team']['id']
    team={p['id']:(0 if p['team_id']==home else 1) for p in m['players']};gk={p['id'] for p in m['players'] if (p.get('player_role') or {}).get('acronym')=='GK'}
    ev=list(csv.DictReader(open(f'{D}/{mid}_dynamic_events.csv')))
    press=collections.defaultdict(list);run=collections.defaultdict(list);kicks=collections.defaultdict(list)
    for e in ev:
        pid=int(float(e['player_id'])) if e['player_id'] else None
        if pid is None:continue
        a,b=int(round(2.5*int(e['frame_start']))),int(round(2.5*int(e['frame_end'])))
        if e['event_type']=='on_ball_engagement':press[pid].append((a,b,e['event_subtype']))
        elif e['event_type']=='off_ball_run':run[pid].append((a,b,e['event_subtype']))
        elif e['event_type']=='player_possession' and e.get('end_type') in('pass','shot','clearance'):kicks[pid].append((b,e['end_type'],e.get('pass_outcome','') or '',e.get('pass_distance_received','') or ''))
    rows=[];kw=[];buf={};last={};balls={};nf=0
    def close(pid):
        B=buf.pop(pid,None)
        if not B or len(B['f'])<25:return
        F=np.array(B['f']);A={j:ma(np.array([x[j] for x in B['j']],dtype=float),3) for j in J};n=len(F);dt=0.04
        P=A['midHip'][:,:2];V=ma(np.gradient(P,dt,axis=0),5);v=np.hypot(V[:,0],V[:,1]);acc=ma(np.gradient(v,dt),5)
        hip=A['rHip']-A['lHip'];f=np.stack([-hip[:,1],hip[:,0]],1);nf_=(A['nose']-A['neck'])[:,:2];sg=np.sign(np.median((f*nf_).sum(1)) or 1)
        f=ma(f*sg,5);f/=np.linalg.norm(f,axis=1,keepdims=True)+1e-9;l=np.stack([-f[:,1],f[:,0]],1)   # l: the player's left
        F3=np.concatenate([f,np.zeros((n,1))],1);L3=np.concatenate([l,np.zeros((n,1))],1);U3=np.tile([0,0,1.0],(n,1))
        dot=lambda a,b:(a*b).sum(1)
        u=V/(v[:,None]+1e-9);trav=np.degrees(np.arctan2(f[:,0]*u[:,1]-f[:,1]*u[:,0],(f*u).sum(1)))
        T=A['neck']-A['midHip'];leanF=np.degrees(np.arctan2(dot(T,F3),T[:,2]));leanS=np.degrees(np.arctan2(dot(T,L3),T[:,2]))
        sh=A['rShoulder']-A['lShoulder'];fs=np.stack([-sh[:,1],sh[:,0]],1)*sg;fs/=np.linalg.norm(fs,axis=1,keepdims=True)+1e-9
        twist=np.degrees(np.arctan2(f[:,0]*fs[:,1]-f[:,1]*fs[:,0],(f*fs).sum(1)))
        hd=(A['nose']-A['neck']);hdh=hd[:,:2]/(np.linalg.norm(hd[:,:2],axis=1,keepdims=True)+1e-9)
        headYaw=np.degrees(np.arctan2(fs[:,0]*hdh[:,1]-fs[:,1]*hdh[:,0],(fs*hdh).sum(1)));headDrop=hd[:,2]
        bl=np.array(B['b'],dtype=float);look=np.full(n,np.nan)
        ok=~np.isnan(bl[:,0])
        if ok.any():db=bl[:,:2]-A['neck'][:,:2];look[ok]=np.degrees(np.abs(np.arctan2(hdh[ok,0]*db[ok,1]-hdh[ok,1]*db[ok,0],(hdh[ok]*db[ok]).sum(1))))
        dBall=np.where(ok,np.hypot(bl[:,0]-P[:,0],bl[:,1]-P[:,1]),np.nan)
        out=[]
        for s in 'lr':
            S=A[s+'Shoulder'];E=A[s+'Elbow'];W=A[s+'Wrist'];H=(A[s+'Thumb']+A[s+'Pinky'])/2
            ua=E-S;side=1 if s=='l' else -1
            elevS=np.degrees(np.arctan2(dot(ua,L3)*side,-ua[:,2]))   # out to the side from hanging
            elevF=np.degrees(np.arctan2(dot(ua,F3),-ua[:,2]))        # forward from hanging
            out+= [elevS,elevF,ang(S,E,W),W[:,2]-S[:,2],dot(W-S,F3),dot(W-S,L3)*side,ang(E,W,H)]
        lE,rE=out[0:7],out[7:14]
        legs=[]
        for s in 'lr':
            Hh=A[s+'Hip'];K=A[s+'Knee'];An=A[s+'Ankle'];He=A[s+'Heel'];To=A[s+'BigToe'];th=K-Hh
            hipFlex=np.degrees(np.arctan2(dot(th,F3),-th[:,2]));kn=ang(Hh,K,An);ft=To-He
            pitch=np.degrees(np.arctan2(ft[:,2],np.hypot(ft[:,0],ft[:,1])));side=1 if s=='l' else -1
            toeOut=np.degrees(np.arctan2(dot(ft,L3)*side,dot(ft,F3)))
            legs.append((hipFlex,kn,pitch,toeOut))
        stance=np.abs(dot(A['lAnkle']-A['rAnkle'],L3));hipH=A['midHip'][:,2]
        hdg=np.unwrap(np.arctan2(f[:,1],f[:,0]));turnRate=np.degrees(ma(np.gradient(hdg,dt),5))
        pid=B['pid'];isgk=float(pid in gk);tm=team.get(pid,-1)
        pr=np.zeros(n);rn=np.zeros(n)
        for a,b,_ in press.get(pid,[]):pr[(F>=a)&(F<=b)]=1
        for a,b,_ in run.get(pid,[]):rn[(F>=a)&(F<=b)]=1
        inPoss=np.array([1.0 if g==tm else 0.0 if g is not None and g>=0 else np.nan for g in B['g']]);car=np.array([float(c==pid) for c in B['c']])
        dOpp=np.array(B['o'],dtype=float)
        R=np.stack([v,acc,trav,leanF,leanS,twist,headYaw,headDrop,look,
            lE[0],rE[0],lE[1],rE[1],lE[2],rE[2],lE[3],rE[3],lE[4],rE[4],lE[5],rE[5],lE[6],rE[6],
            legs[0][0],legs[1][0],legs[0][1],legs[1][1],legs[0][2],legs[1][2],legs[0][3],legs[1][3],stance,hipH,
            np.full(n,isgk),inPoss,car,pr,rn,dBall,dOpp,turnRate],1).astype(np.float32)
        rows.append(np.concatenate([R,np.full((n,1),pid,np.float32)],1))
        # kicks in this run
        for fe,typ,outc,dist in kicks.get(pid,[]):
            i0=np.searchsorted(F,fe)
            if i0<20 or i0>n-11:continue
            # the kicking foot and the strike: the ankle's fastest moment within 0.25 s of the event's end
            best=None
            for s in 'lr':
                Av=np.hypot(*np.gradient(A[s+'Ankle'][:,:2],dt,axis=0).T)
                for i in range(max(1,i0-6),min(n-1,i0+7)):
                    if best is None or Av[i]>best[0]:best=(Av[i],i,s)
            sp,i,s=best
            if i<20 or i>n-11:continue
            b0=bl[i];b1=bl[min(n-1,i+5)]
            if np.isnan(b0).any() or np.isnan(b1).any() or np.hypot(*(b1[:2]-b0[:2]))<0.2:continue
            d=(b1[:2]-b0[:2]);d/=np.linalg.norm(d);fx=np.array([d[0],d[1],0]);lx=np.array([-d[1],d[0],0])
            if s=='r':lx=-lx   # mirrored so that the kicking foot is always "right"
            org=A['midHip'][i].copy();org[2]=0
            sw=lambda j:j if s=='r' else ('l'+j[1:] if j[0]=='r' else 'r'+j[1:] if j[0]=='l' else j)
            W=np.array([[[((A[sw(j)][i+k]-org)*fx).sum(),((A[sw(j)][i+k]-org)*lx).sum(),A[sw(j)][i+k][2]] for j in KJ] for k in range(-20,11)])
            ballr=[float(((b0[:2]-org[:2])*fx[:2]).sum()),float(((b0[:2]-org[:2])*lx[:2]).sum())]
            kw.append({'type':typ,'outcome':outc,'dist':dist,'foot':s,'footSpeed':float(sp),'approach':float(v[max(0,i-10)]),'ball':ballr,'w':W.astype(np.float32)})
    for d in frames(path):
        nf+=1;fr=d['frame'];b=d['ball_data'];bxy=(b['x'],b['y']) if b and b.get('x') is not None else (np.nan,np.nan)
        g=d['possession']['group'];g=0 if g=='home team' else 1 if g=='away team' else None;c=d['possession']['player_id'];seen=set()
        pos={p['player_id']:(p['x'],p['y']) for p in d['player_data'] if p.get('x') is not None}
        for p in d['player_data']:
            pid=p['player_id'];js=p.get('joints')
            if pid not in team or not js or any(j not in js for j in J):continue
            seen.add(pid)
            if pid in buf and last.get(pid)!=fr-1:close(pid)
            tm=team[pid];x,y=pos.get(pid,(np.nan,np.nan))
            do=min([math.hypot(x-q[0],y-q[1]) for k2,q in pos.items() if team.get(k2,tm)!=tm] or [np.nan])
            B=buf.setdefault(pid,{'pid':pid,'f':[],'j':[],'b':[],'g':[],'c':[],'o':[]})
            B['f'].append(fr);B['j'].append({j:js[j]['xyz'] for j in J});B['b'].append(bxy);B['g'].append(g if g is not None else -1);B['c'].append(c);B['o'].append(do);last[pid]=fr
        for pid in [q for q in buf if q not in seen]:close(pid)
        if nf%20000==0:print(mid,nf,'frames',sum(len(r) for r in rows),'rows',len(kw),'kicks',flush=True)
        if os.environ.get('LIMIT') and nf>=int(os.environ['LIMIT']):break   # for a quick test
    for pid in list(buf):close(pid)
    X=np.concatenate(rows);np.savez_compressed(out,X=X,feat=np.array(FEAT+['pid']),kw=np.array([k['w'] for k in kw]) if kw else np.zeros((0,31,len(KJ),3)),
        kmeta=np.array([json.dumps({k2:v2 for k2,v2 in k.items() if k2!='w'}) for k in kw]),kj=np.array(KJ))
    print('done',mid,X.shape,len(kw),'kicks')


# ---------------- report ----------------
SPEEDS=[('stand',0,0.5),('walk',0.5,2),('jog',2,4),('run',4,5.5),('fast',5.5,7),('sprint',7,12)]
SUMMARY=['leanF','leanS','twist','headYaw','headDrop','lookBall','elevS','elevF','elbow','wrZ','wrF','wrOut','wrBend','hipFlex','knee','footPitch','toeOut','stance','hipDrop','turnRate']
def report(paths,out):
    Xs=[];K=[];M=[]
    for p in paths:
        d=np.load(p,allow_pickle=False);Xs.append(d['X']);K.append(d['kw']);M+=[json.loads(m) for m in d['kmeta']];feat=list(d['feat']);kj=list(d['kj'])
    X=np.concatenate(Xs);c={k:i for i,k in enumerate(feat)};col=lambda k:X[:,c[k]]
    # the hips' drop against each player's own standing height (median of his frames under 0.5 m/s)
    pid=col('pid');hh=col('hipH');stand=np.zeros(len(X))
    for q in np.unique(pid):
        m=pid==q;s=m&(col('v')<0.5);stand[m]=np.nanmedian(hh[s]) if s.sum()>50 else np.nanmedian(hh[m])
    hipDrop=(stand-hh)*100   # cm lower than standing
    both=lambda k:np.concatenate([col('l'+k[0].upper()+k[1:]),col('r'+k[0].upper()+k[1:])])
    def getf(k,m):
        if k in('elevS','elevF','elbow','wrZ','wrF','wrOut','wrBend','hipFlex','knee','footPitch','toeOut'):
            L={'elevS':'ElevS','elevF':'ElevF','elbow':'Elbow','wrZ':'WrZ','wrF':'WrF','wrOut':'WrOut','wrBend':'WrBend','hipFlex':'HipFlex','knee':'Knee','footPitch':'FootPitch','toeOut':'ToeOut'}[k]
            return np.concatenate([X[m,c['l'+L]],X[m,c['r'+L]]])
        if k=='hipDrop':return hipDrop[m]
        if k=='twist' or k=='headYaw' or k=='leanS' or k=='turnRate':return np.abs(X[m,c[k]])
        return X[m,c[k]]
    v=col('v');gk=col('gk')>0.5;inP=col('inPoss');car=col('carrier')>0.5;pr=col('press')>0.5;rn=col('run')>0.5;dB=col('dBall')
    ctx={}
    out_=~gk
    for name,a,b in SPEEDS:ctx['open_'+name]=out_&~car&~pr&~rn&(v>=a)&(v<b)
    for name,a,b in SPEEDS[:5]:ctx['carrier_'+name]=out_&car&(v>=a)&(v<b)
    ctx['support_near']=out_&(inP==1)&~car&(dB<15);ctx['defend_near']=out_&(inP==0)&~pr&(dB<15)
    ctx['pressing']=out_&pr;ctx['offball_run']=out_&rn
    ctx['gk_stand']=gk&(v<0.5);ctx['gk_move']=gk&(v>=0.5)
    R={'frames':int(len(X)),'contexts':{}}
    for k,m in ctx.items():
        n=int(m.sum())
        if n<200:continue
        o={'n':n,'seconds':round(n/25)}
        for f in SUMMARY:
            a=getf(f,m);a=a[~np.isnan(a)]
            if len(a):o[f]=[round(float(np.percentile(a,10)),3),round(float(np.median(a)),3),round(float(np.percentile(a,90)),3)]
        # travel against facing
        t=np.abs(X[m,c['trav']]);mv=v[m]>0.5
        if mv.sum()>50:tt=t[mv];o['travel']={'fwd':round(float((tt<45).mean()*100),1),'side':round(float(((tt>=45)&(tt<135)).mean()*100),1),'back':round(float((tt>=135).mean()*100),1)}
        # gestures (% of frames)
        lz,rz=X[m,c['lWrZ']],X[m,c['rWrZ']];lo,ro=X[m,c['lWrOut']],X[m,c['rWrOut']];lf,rf=X[m,c['lWrF']],X[m,c['rWrF']];le,re=X[m,c['lElbow']],X[m,c['rElbow']]
        ls,rs=X[m,c['lElevS']],X[m,c['rElevS']];vv=v[m];lF=X[m,c['leanF']]
        up=(lz>0.15)|(rz>0.15);bothUp=(lz>0.15)&(rz>0.15);armOut=(lo>0.45)|(ro>0.45)
        point=((le>150)&(np.abs(lz)<0.15)&((lf>0.5)|(lo>0.5)))|((re>150)&(np.abs(rz)<0.15)&((rf>0.5)|(ro>0.5)))
        hips=(vv<0.6)&(le<120)&(re<120)&(lz>-0.6)&(lz<-0.3)&(rz>-0.6)&(rz<-0.3)&(lo>0.12)&(ro>0.12)&(ls>25)&(rs>25)
        knees=(vv<0.6)&(lF>35)&(lz<-0.55)&(rz<-0.55)
        o['gestures_pct']={k2:round(float(a.mean()*100),2) for k2,a in [('arm_up',up),('both_up',bothUp),('arm_out',armOut),('point',point),('hands_on_hips',hips),('hands_on_knees',knees)]}
        R['contexts'][k]=o
    # acceleration and lean, turning and side lean (open play, moving)
    mm=out_&(v>2);a=col('acc')[mm];lf=col('leanF')[mm]
    R['leanByAccel']={str(b):round(float(np.median(lf[(a>=b-0.5)&(a<b+0.5)])),1) for b in range(-5,6) if ((a>=b-0.5)&(a<b+0.5)).sum()>100}
    # kicks
    KW=np.concatenate([k for k in K if len(k)]) if any(len(k) for k in K) else np.zeros((0,31,len(kj),3));j={n:i for i,n in enumerate(kj)}
    groups={'pass_short':[],'pass_long':[],'shot':[],'clearance':[]}
    for i,mt in enumerate(M):
        try:dist=float(mt['dist'])
        except:dist=np.nan
        g='shot' if mt['type']=='shot' else 'clearance' if mt['type']=='clearance' else ('pass_long' if dist>=25 else 'pass_short' if dist==dist else 'pass_short')
        groups[g].append(i)
    KR={}
    T=[round((k-20)*0.04,2) for k in range(31)]
    def angle3(a,b,cc):u=a-b;w=cc-b;return np.degrees(np.arccos(np.clip((u*w).sum(-1)/(np.linalg.norm(u,axis=-1)*np.linalg.norm(w,axis=-1)+1e-9),-1,1)))
    for g,idx in groups.items():
        if len(idx)<5:continue
        W=KW[idx]   # n, 31, joints, 3 (x forward along the ball's path from the hips' middle, y towards the plant foot's side, z up)
        med=lambda a:[round(float(x),3) for x in np.nanmedian(a,0)]
        kneeK=angle3(W[:,:,j['rHip']],W[:,:,j['rKnee']],W[:,:,j['rAnkle']]);kneeP=angle3(W[:,:,j['lHip']],W[:,:,j['lKnee']],W[:,:,j['lAnkle']])
        th=W[:,:,j['rKnee']]-W[:,:,j['rHip']];hipK=np.degrees(np.arctan2(th[...,0],-th[...,2]))
        tr=W[:,:,j['neck']]-W[:,:,j['midHip']];lean=np.degrees(np.arctan2(tr[...,0],tr[...,2]));leanSide=np.degrees(np.arctan2(tr[...,1],tr[...,2]))
        armA=W[:,:,j['lWrist']]-W[:,:,j['lShoulder']];armK=W[:,:,j['rWrist']]-W[:,:,j['rShoulder']]
        ball=np.array([M[i]['ball'] for i in idx])
        plant=W[:,20,j['lAnkle']]
        KR[g]={'n':len(idx),'t':T,'approachSpeed':round(float(np.median([M[i]['approach'] for i in idx])),2),'footSpeedAtStrike':round(float(np.median([M[i]['footSpeed'] for i in idx])),2),
          'kickAnkle_x':med(W[:,:,j['rAnkle'],0]),'kickAnkle_y':med(W[:,:,j['rAnkle'],1]),'kickAnkle_z':med(W[:,:,j['rAnkle'],2]),
          'kickKnee_deg':med(kneeK),'kickHipFlex_deg':med(hipK),'plantKnee_deg':med(kneeP),'trunkLean_deg':med(lean),'trunkSideLean_deg':med(leanSide),
          'otherArm_out':med(armA[...,1]),'otherArm_up':med(armA[...,2]),'kickSideArm_fwd':med(armK[...,0]),
          'plantFoot_vs_ball_atStrike':{'behind_m':round(float(np.median(ball[:,0]-plant[:,0])),3),'beside_m':round(float(np.median(plant[:,1]-ball[:,1])),3)},
          'ball_vs_hips_atStrike':{'ahead_m':round(float(np.median(ball[:,0])),3),'side_m':round(float(np.median(ball[:,1])),3)}}
    R['kicks']=KR
    json.dump(R,open(out,'w'),indent=1);print('contexts',list(R['contexts']),'kicks',{k:v['n'] for k,v in KR.items()})

if __name__=='__main__':
    if sys.argv[1]=='extract':extract(sys.argv[2],sys.argv[3])
    elif sys.argv[1]=='report':report(sys.argv[2:-1],sys.argv[-1])
