# Real footballers' movement from SkillCorner's broadcast body pose (3D joints, 25 fps) written as BVH takes with the
# CMU joint names retarget.js knows, so they can go through the same retargeting as the motion-capture takes.
# FOR ANALYSIS AND NON-COMMERCIAL USE ONLY: the joints were estimated from broadcast video (see MOTION_DATA.md).
# Development tool.
#   python3 -I pose_to_bvh.py <pose zip> <segments.json> <out folder> [tag ...]
# Each bone's world rotation is found from the joints: the pelvis from the hip line and the line up to the neck, the
# chest from the shoulder line, the spine between the two, each leg from hip, knee and ankle (the knee's bending axis
# from the plane of the three), the foot from heel to big toe, each arm from shoulder, elbow and wrist, the head from
# the ears and nose. Before that the feet are put on the ground and pinned while they stand (plant()), the joints are
# smoothed (+-2 frames, not the pinned feet) and the knees solved again (knee_ik()); FKCHECK=1 prints how far the
# written skeleton's ankles are from those joints. Rest pose: legs down, spine up, arms out to the sides,
# toes forward; the offsets are the player's own mean bone lengths over the take. Axes: pitch x, y, z (z up) to BVH
# X = x, Y = z, Z = -y (right-handed, y up), in centimetres.
import json,sys,zipfile,os,numpy as np
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle','lBigToe','rBigToe','lHeel','rHeel','lEar','rEar']
FPS=25
def nrm(v):return v/(np.linalg.norm(v,axis=-1,keepdims=True)+1e-9)
def frame_from(y,xh):   # rotation matrices whose columns are x, y, z: y along the given axis, x as close to xh as can be
    y=nrm(y);x=nrm(xh-np.sum(xh*y,-1,keepdims=True)*y);z=np.cross(x,y);return np.stack([x,y,z],-1)
def to_euler_zxy(R):    # R = Rz * Rx * Ry  (BVH channel order Zrotation Xrotation Yrotation), degrees
    x=np.arcsin(np.clip(R[...,2,1],-1,1));z=np.arctan2(-R[...,0,1],R[...,1,1]);y=np.arctan2(-R[...,2,0],R[...,2,2]);return np.degrees(np.stack([z,x,y],-1))
def read_segments(zp,segs):
    want={}
    for i,s in enumerate(segs):
        for f in range(s['f0'],s['f1']+1):want.setdefault(f,[]).append(i)
    data={i:{} for i in range(len(segs))}
    z=zipfile.ZipFile(zp);name=[n for n in z.namelist() if n.endswith('.jsonl')][0]
    with z.open(name) as fh:
        for line in fh:
            d=json.loads(line);ids=want.get(d['frame'])
            if not ids:continue
            for p in d['player_data']:
                for i in ids:
                    if p['player_id']==segs[i]['pid'] and p.get('joints') and all(k in p['joints'] for k in J):data[i][d['frame']]={k:p['joints'][k]['xyz'] for k in J}
    return data
FOOT=('Ankle','Heel','BigToe')
def plant(P,thr=0.3):
    # Broadcast pose has no clean foot contacts: the standing foot drifts ~1 m/s and the ground height wanders. On the raw
    # joints (smoothing would blur a sprint's 2-3 frame contacts) the ground is put back under the feet (a smoothed lower
    # envelope of the soles) and each stance is found: the ankle's horizontal speed under thr x the hips' speed + 60 cm/s
    # with the sole within 10 cm of the ground, and every slowest moment of a step near the ground (at least 2 frames).
    # Each foot is also brought down to the ground once a stride (its own lower envelope) where the estimate floats.
    # Each stance is pinned to its mean position. P is in BVH axes (cm, y up), changed in place; returns the stance masks.
    n=len(P['midHip']);hip=(P['lHip']+P['rHip'])/2;hv=np.linalg.norm(np.gradient(hip[:,[0,2]],axis=0),axis=1)*FPS
    hv=np.convolve(np.pad(hv,(2,2),mode='edge'),np.ones(5)/5,'valid')
    env=lambda a:np.convolve(np.pad(np.array([a[max(0,i-8):i+9].min() for i in range(n)]),(4,4),mode='edge'),np.ones(9)/9,'valid')
    gb=env(np.min(np.stack([P[k][:,1] for k in ('lBigToe','rBigToe','lHeel','rHeel')]),0))
    for k in P:P[k]=P[k]-np.stack([0*gb,gb,0*gb],1)
    for s in 'lr':   # each foot down to the ground once a stride (its own lower envelope over +-8 frames, a sprint stride)
        g=env(np.minimum(P[s+'Heel'][:,1],P[s+'BigToe'][:,1]))
        for k in FOOT:P[s+k]=P[s+k]-np.stack([0*g,g,0*g],1)
    low={s:np.minimum(P[s+'Heel'][:,1],P[s+'BigToe'][:,1]) for s in 'lr'};mask={}
    for s in 'lr':
        v=np.linalg.norm(np.gradient(P[s+'Ankle'][:,[0,2]],axis=0),axis=1)*FPS
        st=(v<thr*hv+60)&(low[s]<10)
        for f in range(1,n-1):
            if v[f]<=v[f-1] and v[f]<=v[f+1] and low[s][f]<20 and v[f]<0.7*hv[f]+60:st[f]=True;st[f+1 if v[f+1]<v[f-1] else f-1]=True
        i=0
        while i<n:
            if not st[i]:i+=1;continue
            j=i
            while j+1<n and st[j+1]:j+=1
            for k in FOOT:
                k=s+k;m=P[k][i:j+1].mean(0);d=m-P[k][i:j+1];d[:,1]=np.maximum(0,-low[s][i:j+1])   # pin x, z; lift soles below 0
                P[k][i:j+1]+=d
            i=j+1
        mask[s]=st
    return mask
def knee_ik(P):   # knee solved again for the (pinned) ankle: two bones of the take's mean lengths, the same bending plane
    for s in 'lr':
        h,kn,an=P[s+'Hip'],P[s+'Knee'],P[s+'Ankle'];a=np.linalg.norm(kn-h,axis=1).mean();b=np.linalg.norm(an-kn,axis=1).mean()
        d=an-h;L=np.clip(np.linalg.norm(d,axis=1),1e-3,(a+b)*0.999);u=d/np.linalg.norm(d,axis=1,keepdims=True)
        side=kn-h-np.sum((kn-h)*u,1,keepdims=True)*u;side=side/(np.linalg.norm(side,axis=1,keepdims=True)+1e-9)
        x=(a*a-b*b+L*L)/(2*L);y=np.sqrt(np.clip(a*a-x*x,0,None));P[s+'Knee']=h+u*x[:,None]+side*y[:,None]
        sh=(an-h)-u*L[:,None]   # ankle pulled in where the leg was over-stretched (keeps the foot's offset to the ankle)
        for k in FOOT:P[s+k]=P[s+k]-sh
def write_bvh(path,P):
    # P: joint -> (n,3) in BVH axes (cm). Feet pinned on the raw joints, then everything smoothed (+-2 frames) except the
    # pinned stances (their first and last frame half way), then the knees solved again.
    n=len(P['midHip']);sm=lambda a:np.stack([np.convolve(np.pad(a[:,c],(2,2),mode='edge'),np.ones(5)/5,'valid') for c in range(3)],1)
    P={k:v.copy() for k,v in P.items()};mask=plant(P);S={k:sm(v) for k,v in P.items()}
    for s in 'lr':
        w=mask[s].astype(float);w=np.maximum(w,0.5*np.maximum(np.r_[w[1:],0],np.r_[0,w[:-1]]))[:,None]
        for k in FOOT:S[s+k]=w*P[s+k]+(1-w)*S[s+k]
    P=S;knee_ik(P)
    hipC=(P['lHip']+P['rHip'])/2;shC=(P['lShoulder']+P['rShoulder'])/2;up=shC-hipC
    L=lambda a,b:float(np.mean(np.linalg.norm(P[a]-P[b],axis=1)))
    # world rotations (columns: bone frame axes; rest frame = identity)
    Rh=frame_from(up,P['lHip']-P['rHip'])                       # pelvis: y up the trunk, x to the left hip
    Rc=frame_from(P['neck']-shC*0.0-hipC,P['lShoulder']-P['rShoulder'])   # chest
    def mid(Ra,Rb,t):   # rotation part way from Ra to Rb (via the y and x axes)
        y=nrm((1-t)*Ra[...,:,1]+t*Rb[...,:,1]);x=nrm((1-t)*Ra[...,:,0]+t*Rb[...,:,0]);return frame_from(y,x)
    R={'Hips':Rh,'LowerBack':mid(Rh,Rc,0.33),'Spine':mid(Rh,Rc,0.66),'Spine1':Rc}
    eh=(P['lEar']+P['rEar'])/2;R['Neck']=frame_from(eh-P['neck'],P['lEar']-P['rEar']);R['Head']=R['Neck']
    for s,S in (('l','Left'),('r','Right')):
        hip,kn,an,toe,heel=P[s+'Hip'],P[s+'Knee'],P[s+'Ankle'],P[s+'BigToe'],P[s+'Heel']
        bend=nrm(np.cross(kn-hip,an-kn));bend=np.where(np.linalg.norm(np.cross(kn-hip,an-kn),axis=1,keepdims=True)<1e-3,Rh[...,:,0],bend)   # straight leg: the pelvis' x
        R[S+'UpLeg']=frame_from(hip-kn,bend);R[S+'Leg']=frame_from(kn-an,bend)
        fdir=toe-heel;R[S+'Foot']=frame_from(np.cross(bend,fdir)*-1,bend)   # y up from the sole (x the bending axis), z along the foot
        R[S+'ToeBase']=R[S+'Foot']
        sh,el,wr=P[s+'Shoulder'],P[s+'Elbow'],P[s+'Wrist'];sg=1 if s=='l' else -1
        eb=nrm(np.cross(el-sh,wr-el));eb=np.where(np.linalg.norm(np.cross(el-sh,wr-el),axis=1,keepdims=True)<1e-3,Rc[...,:,2],eb)
        # rest: arm along +x (left) or -x (right): bone frame y axis = -(direction) * sg mapping, built so rest is identity
        R[S+'Shoulder']=Rc
        def armframe(a,b):d=(b-a)*sg;x=nrm(d);zz=nrm(np.cross(x,eb));y=np.cross(zz,x);return np.stack([x,y,zz],-1)
        R[S+'Arm']=armframe(sh,el);R[S+'ForeArm']=armframe(el,wr);R[S+'Hand']=R[S+'ForeArm']
    # hierarchy with rest offsets (cm): legs down, spine up, arms out
    lw=L('lHip','rHip')/2;tl=(L('lHip','lKnee')+L('rHip','rKnee'))/2;sl=(L('lKnee','lAnkle')+L('rKnee','rAnkle'))/2;tr=float(np.mean(np.linalg.norm(up,axis=1)))
    sw=L('lShoulder','rShoulder')/2;ua=(L('lShoulder','lElbow')+L('rShoulder','rElbow'))/2;fa=(L('lElbow','lWrist')+L('rElbow','rWrist'))/2;ft=(L('lHeel','lBigToe')+L('rHeel','rBigToe'))/2
    H=[('Hips',None,[0,0,0]),('LowerBack','Hips',[0,tr*0.15,0]),('Spine','LowerBack',[0,tr*0.3,0]),('Spine1','Spine',[0,tr*0.3,0]),('Neck','Spine1',[0,tr*0.25,0]),('Head','Neck',[0,8,0])]
    for S,sg in (('Left',1),('Right',-1)):
        H+=[(S+'UpLeg','Hips',[sg*lw,0,0]),(S+'Leg',S+'UpLeg',[0,-tl,0]),(S+'Foot',S+'Leg',[0,-sl,0]),(S+'ToeBase',S+'Foot',[0,-4,ft*0.75]),
            (S+'Shoulder','Spine1',[sg*3,tr*0.2,0]),(S+'Arm',S+'Shoulder',[sg*(sw-3),0,0]),(S+'ForeArm',S+'Arm',[sg*ua,0,0]),(S+'Hand',S+'ForeArm',[sg*fa,0,0])]
    kids={};[kids.setdefault(p,[]).append(c) for c,p,_ in H]
    off={c:o for c,_,o in H};par={c:p for c,p,_ in H}
    out=['HIERARCHY']
    def emit(j,depth):
        t='  '*depth;o=off[j]
        out.append(f"{t}{'ROOT' if par[j] is None else 'JOINT'} {j}");out.append(t+'{');out.append(f"{t}  OFFSET {o[0]:.3f} {o[1]:.3f} {o[2]:.3f}")
        out.append(f"{t}  CHANNELS {'6 Xposition Yposition Zposition ' if par[j] is None else '3 '}Zrotation Xrotation Yrotation")
        if j in kids:
            for c in kids[j]:emit(c,depth+1)
        else:out.append(f"{t}  End Site");out.append(t+'  {');out.append(f"{t}    OFFSET 0 {-5 if 'Foot' in j or 'Toe' in j else 5} 0");out.append(t+'  }')
        out.append(t+'}')
    emit('Hips',0)
    order=[];st=['Hips']
    def walk(j):order.append(j);[walk(c) for c in kids.get(j,[])]
    walk('Hips')
    loc={}
    for j in order:
        Rw=R[j];loc[j]=Rw if par[j] is None else np.einsum('nji,njk->nik',R[par[j]],Rw)
    E={j:to_euler_zxy(loc[j]) for j in order}
    if os.environ.get('FKCHECK'):   # forward kinematics of what is written vs the (planted) joints: ankle error, stance slide
        Wp={'Hips':hipC};Wr={'Hips':R['Hips']}
        for j in order[1:]:Wr[j]=R[j];Wp[j]=Wp[par[j]]+np.einsum('nij,j->ni',R[par[j]],np.array(off[j],float))
        for s,S in (('l','Left'),('r','Right')):
            e=np.linalg.norm(Wp[S+'Foot']-P[s+'Ankle'],axis=1);print(S,'ankle FK err cm mean %.1f max %.1f'%(e.mean(),e.max()),end='  ')
        print()
    root=hipC-np.array([0,0,0])
    out+=['MOTION',f'Frames: {n}',f'Frame Time: {1/FPS:.6f}']
    for i in range(n):
        vals=[*root[i]]+[v for j in order for v in E[j][i]]
        out.append(' '.join(f'{v:.4f}' for v in vals))
    open(path,'w').write('\n'.join(out)+'\n')
if __name__=='__main__':
    zp,sj,od=sys.argv[1],sys.argv[2],sys.argv[3];tags=set(sys.argv[4:]);os.makedirs(od,exist_ok=True)
    segs=[s for s in json.load(open(sj)) if not tags or s['tag'] in tags]
    data=read_segments(zp,segs);mid=os.path.basename(zp).split('.')[0];nw=0
    for i,s in enumerate(segs):
        fr=sorted(data[i]);
        if len(fr)<int(1.2*FPS) or fr[-1]-fr[0]!=len(fr)-1:continue
        A={k:np.array([data[i][f][k] for f in fr],float) for k in J}
        P={k:np.stack([v[:,0],v[:,2],-v[:,1]],1)*100 for k,v in A.items()}
        write_bvh(os.path.join(od,f"SC_{mid}_{s['tag']}_{s['pid']}_{fr[0]}.bvh"),P);nw+=1
    print('wrote',nw,'of',len(segs))
