# Body orientation, trunk lean, arms and knees by speed from SkillCorner's 3D body pose (29 joints per player, 25 fps,
# from broadcast video): the sample in github.com/SkillCorner/opendata data/bodypose/ (12.3 s, 21 players). The full
# matches are on Hugging Face (not reachable from this environment). Development tool; results: MOVEMENT_ANALYSIS.md
# section 6.   python3 -I pose_an.py <sample_1925299_phase406.jsonl.gz>
import gzip,json,numpy as np,collections,math,sys
fr=[json.loads(l) for l in gzip.open(sys.argv[1] if len(sys.argv)>1 else 'pose_sample.jsonl.gz','rt')]
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle','lHeel','rHeel','lBigToe','rBigToe','lEar','rEar']
tr=collections.defaultdict(dict)   # pid -> frame index -> dict
ball={}
for i,f in enumerate(fr):
  b=f['ball_data'];ball[i]=(b['x'],b['y'])
  for p in f['player_data']:
    if p.get('joints'):tr[p['player_id']][i]={'xy':(p['x'],p['y']),**{j:np.array(p['joints'][j]['xyz']) for j in J if j in p['joints']}}
dt=1/25
def sm(a,k=5):
  w=np.ones(k)/k;return np.array([np.convolve(a[:,c],w,mode='same') for c in range(a.shape[1])]).T
rows=[]
for pid,d in tr.items():
  idx=sorted(d);segs=[];cur=[idx[0]]
  for a,b in zip(idx,idx[1:]):
    if b==a+1:cur.append(b)
    else:segs.append(cur);cur=[b]
  segs.append(cur)
  for s in segs:
    if len(s)<15:continue
    A={j:np.array([d[i][j] for i in s]) for j in J}
    pel=sm(A['midHip'],5)[:,:2]
    v=np.gradient(pel,dt,axis=0);v=sm(v,5);spd=np.hypot(v[:,0],v[:,1])
    acc=np.gradient(spd,dt);acc=sm(acc[:,None],5)[:,0]
    hipR=A['rHip']-A['lHip'];shR=A['rShoulder']-A['lShoulder']
    # forward = up x (right-left)? check with nose
    fwd=np.stack([-hipR[:,1],hipR[:,0]],1);fwd/=np.linalg.norm(fwd,axis=1,keepdims=True)+1e-9
    noseF=(A['nose']-A['neck'])[:,:2]
    sign=np.sign(np.nanmedian((fwd*noseF).sum(1)))
    fwd*=sign;fwd=sm(fwd,5);fwd/=np.linalg.norm(fwd,axis=1,keepdims=True)
    sfw=np.stack([-shR[:,1],shR[:,0]],1)*sign;sfw=sm(sfw,5);sfw/=np.linalg.norm(sfw,axis=1,keepdims=True)
    trunk=A['neck']-A['midHip']
    for k in range(2,len(s)-2):
      if spd[k]<0.01:continue
      u=v[k]/max(spd[k],1e-6)
      ang=math.degrees(math.atan2(fwd[k,0]*u[1]-fwd[k,1]*u[0],(fwd[k]*u).sum()))
      tw=math.degrees(math.atan2(fwd[k,0]*sfw[k,1]-fwd[k,1]*sfw[k,0],(fwd[k]*sfw[k]).sum()))
      t=trunk[k];h=np.hypot(t[0],t[1]);lean_fwd=math.degrees(math.atan2((t[:2]*fwd[k]).sum(),t[2]))
      lean_mv=math.degrees(math.atan2((t[:2]*u).sum(),t[2]))
      b=ball[s[k]];db=(b[0]-pel[k,0],b[1]-pel[k,1]) if b[0] is not None else (np.nan,np.nan)
      look=math.degrees(math.atan2(fwd[k,0]*db[1]-fwd[k,1]*db[0],fwd[k,0]*db[0]+fwd[k,1]*db[1])) if b[0] is not None else np.nan
      # arm swing: wrist relative to shoulder along facing; elbow angle
      wr=[((A[sd+'Wrist'][k]-A[sd+'Shoulder'][k])[:2]*fwd[k]).sum() for sd in 'lr']
      el=[]
      for sd in 'lr':
        a1=A[sd+'Shoulder'][k]-A[sd+'Elbow'][k];a2=A[sd+'Wrist'][k]-A[sd+'Elbow'][k]
        el.append(math.degrees(math.acos(np.clip((a1*a2).sum()/np.linalg.norm(a1)/np.linalg.norm(a2),-1,1))))
      kn=[]
      for sd in 'lr':
        a1=A[sd+'Hip'][k]-A[sd+'Knee'][k];a2=A[sd+'Ankle'][k]-A[sd+'Knee'][k]
        kn.append(math.degrees(math.acos(np.clip((a1*a2).sum()/np.linalg.norm(a1)/np.linalg.norm(a2),-1,1))))
      ank=((A['lAnkle'][k]-A['rAnkle'][k])[:2]*u).sum()
      rows.append(dict(pid=pid,seg=s[0],k=k,spd=spd[k],acc=acc[k],ang=ang,tw=tw,leanF=lean_fwd,leanM=lean_mv,look=look,wrL=wr[0],wrR=wr[1],elL=el[0],elR=el[1],knL=kn[0],knR=kn[1],ank=ank,hipH=A['midHip'][k][2],distBall=math.hypot(*db) if b[0] is not None else np.nan))
R=rows;print('player-frames',len(R),'players',len(tr))
spd=np.array([r['spd'] for r in R])
bands=[(0,0.7),(0.7,2),(2,4),(4,5.5),(5.5,7),(7,11)]
print('\nspeed band | n | travel vs hips facing: fwd(<45) side(45-135) back(>135) | lean fwd of trunk (deg) median | twist shoulders-hips |abs| median | elbow median | knee median | wrist fwd-back range (p90-p10, m)')
for a,b in bands:
  S=[r for r in R if a<=r['spd']<b]
  if len(S)<20:print(a,b,len(S));continue
  ang=np.abs([r['ang'] for r in S]);f=(ang<45).mean();sd=((ang>=45)&(ang<135)).mean();bk=(ang>=135).mean()
  wr=np.array([r['wrL'] for r in S]+[r['wrR'] for r in S])
  print(f"{a}-{b} m/s | {len(S)} | {f:.0%} {sd:.0%} {bk:.0%} | {np.median([r['leanM'] for r in S]):.1f} | {np.median(np.abs([r['tw'] for r in S])):.1f} | {np.median([r['elL'] for r in S]+[r['elR'] for r in S]):.0f} | {np.median([r['knL'] for r in S]+[r['knR'] for r in S]):.0f} | {np.percentile(wr,90)-np.percentile(wr,10):.2f}")
print('\nlean vs accel (speed>2): accel band -> median trunk lean along travel')
for a,b in [(-9,-3),(-3,-1),(-1,1),(1,3),(3,9)]:
  S=[r['leanM'] for r in R if r['spd']>2 and a<=r['acc']<b];print(a,b,len(S),round(float(np.median(S)),1) if S else None)
lk=np.abs([r['look'] for r in R if not np.isnan(r['look'])]);print('\nhips facing within 45 deg of ball:',f"{(lk<45).mean():.0%}",'within 90:',f"{(lk<90).mean():.0%}")
