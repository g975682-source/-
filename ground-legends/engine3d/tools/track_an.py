# Movement and team-behaviour metrics from 10 Hz match tracking, the same code for real matches (SkillCorner open
# data: broadcast-video tracking of 20 A-League matches, github.com/SkillCorner/opendata, MIT) and for the game's
# AI-vs-AI matches (exported by export_match_track.js). Development tool; the data is not part of this repository.
#   SC_DATA=<folder> python3 -I track_an.py real <out.json> [n matches]
#   python3 -I track_an.py game <frames.jsonl...> <out.json>
# SC_DATA holds matches.json and, per match, <id>_match.json, <id>_tracking_extrapolated.jsonl and
# <id>_phases_of_play.csv (fetch_skillcorner.sh downloads them, about 1.8 GB). Results: MOVEMENT_ANALYSIS.md section 6.
# Metrics (outfield players, ball in play): speed bands as measure_match_motion.js, metres per minute, acceleration of
# speed, turns (> 45 deg within 0.5 s above 1 m/s), sprint bouts (> 7 m/s), speed by distance to the ball, travel
# against the ball and the attacking direction, team length/width/last-man height/centroid against the ball with and
# without the ball, pressure on the carrier (nearest and second defender, closing speed), shift with the ball (least
# squares slope of each player's x, y on the ball's), and possession spells.
import json,sys,math,numpy as np,collections,csv,os
D=os.environ.get('SC_DATA',os.path.dirname(os.path.abspath(__file__)))

def load_sc(mid):
    m=json.load(open(f'{D}/{mid}_match.json'))
    home=m['home_team']['id'];team={};gk={};role={}
    for p in m['players']:
        team[p['id']]=0 if p['team_id']==home else 1;r=(p.get('player_role') or {}).get('acronym','');role[p['id']]=r;gk[p['id']]=r=='GK'
    inplay=np.zeros(200000,bool)
    for r in csv.DictReader(open(f'{D}/{mid}_phases_of_play.csv')):
        inplay[int(r['frame_start']):int(r['frame_end'])+1]=True
    frames=[];last=None
    for l in open(f'{D}/{mid}_tracking_extrapolated.jsonl'):
        d=json.loads(l);fr=d['frame']
        if not d['period'] or fr>=len(inplay) or not inplay[fr]:continue
        g=d['possession']['group'];poss=0 if g=='home team' else 1 if g=='away team' else None
        if poss is not None:last=poss
        b=d['ball_data'];pl={p['player_id']:(p['x'],p['y']) for p in d['player_data'] if p['player_id'] in team}
        frames.append(dict(f=fr,half=d['period'],ball=(b['x'],b['y']) if b['x'] is not None else None,poss=last,carrier=d['possession']['player_id'],pl=pl))
    return dict(name=str(mid),frames=frames,team=team,gk=gk,role=role,dt=0.1)

def load_game(path):
    frames=[];team={};gk={};role={}
    for l in open(path):
        d=json.loads(l)
        if 'end' in d:continue
        if 'meta' in d:
            for pid,t,g,r in d['meta']:team[pid]=t;gk[pid]=bool(g);role[pid]=r
            continue
        frames.append(dict(f=d['f'],half=d['h'],ball=tuple(d['b']),poss=d['p'],carrier=d['c'],pl={p[0]:(p[1],p[2]) for p in d['pl']}))
    return dict(name=os.path.basename(path),frames=frames,team=team,gk=gk,role=role,dt=0.1)

def ma(a,k):
    if len(a)<k:return a
    w=np.ones(k)/k;pad=k//2;ap=np.pad(a,((pad,pad),(0,0)),mode='edge');return np.stack([np.convolve(ap[:,c],w,'valid') for c in range(a.shape[1])],1)

def analyse(M):
    F=M['frames'];dt=M['dt'];team=M['team'];gk=M['gk']
    # attacking direction per half and team: away from the own keeper's mean x
    dirs={}
    for h in (1,2):
        for t in (0,1):
            xs=[fr['pl'][p][0] for fr in F if fr['half']==h for p in fr['pl'] if gk.get(p) and team[p]==t]
            dirs[(h,t)]=-np.sign(np.mean(xs)) if xs else (1 if t==0 else -1)
    # per player contiguous series
    ser=collections.defaultdict(list)
    for i,fr in enumerate(F):
        for p,xy in fr['pl'].items():ser[p].append((i,fr['f'],xy[0],xy[1]))
    vel={}   # (frame index, pid) -> (vx,vy,ax_along)
    for p,s in ser.items():
        if gk.get(p):continue
        seg=[];cur=[s[0]]
        for a,b in zip(s,s[1:]):
            if b[1]==a[1]+1:cur.append(b)
            else:seg.append(cur);cur=[b]
        seg.append(cur)
        for c in seg:
            if len(c)<7:continue
            P=ma(np.array([[q[2],q[3]] for q in c]),3);V=np.gradient(P,dt,axis=0);V=ma(V,3);S=np.hypot(V[:,0],V[:,1]);A=np.gradient(S,dt);A=ma(A[:,None],3)[:,0]
            for k,q in enumerate(c):vel[(q[0],p)]=(V[k,0],V[k,1],A[k])
    sp=collections.Counter();n=0;acc=[];dist=0;turns=0;bouts=[];run={};hist={}
    spd_by_db=collections.defaultdict(list);towards=collections.Counter();goalward=collections.Counter()
    shape={0:collections.defaultdict(list),1:collections.defaultdict(list)}
    press=collections.defaultdict(list);reg=collections.defaultdict(list)
    for i,fr in enumerate(F):
        b=fr['ball']
        for p,xy in fr['pl'].items():
            if gk.get(p) or (i,p) not in vel:continue
            vx,vy,a=vel[(i,p)];v=math.hypot(vx,vy);n+=1
            sp['stand' if v<0.2 else 'walk' if v<2 else 'jog' if v<4 else 'run' if v<5.5 else 'hsr' if v<7 else 'sprint']+=1
            acc.append(a);dist+=v*dt
            h=hist.setdefault(p,collections.deque(maxlen=6));h.append(math.atan2(vy,vx) if v>1 else None)
            if len(h)==6 and h[0] is not None and h[5] is not None:
                d=abs(math.atan2(math.sin(h[5]-h[0]),math.cos(h[5]-h[0])))
                if d>math.pi/4:turns+=1;h.clear()
            r=run.get(p,0)
            if v>7:run[p]=r+dt
            elif r>0:bouts.append(r);run[p]=0
            if b:
                db=math.hypot(b[0]-xy[0],b[1]-xy[1]);spd_by_db[min(4,int(db//10))].append(v)
                if v>1:
                    cang=abs(math.atan2((b[1]-xy[1])*vx-(b[0]-xy[0])*vy,(b[0]-xy[0])*vx+(b[1]-xy[1])*vy))
                    towards['to ball' if cang<math.pi/3 else 'away' if cang>2*math.pi/3 else 'across']+=1
                    gd=dirs[(fr['half'],team[p])]*vx/v
                    goalward['forward' if gd>0.5 else 'back' if gd<-0.5 else 'lateral']+=1
        # team shape and shift (outfield, both possession states)
        if not b or fr['poss'] is None:continue
        for t in (0,1):
            ps=[(p,xy) for p,xy in fr['pl'].items() if team[p]==t and not gk.get(p)]
            if len(ps)<9:continue
            dr=dirs[(fr['half'],t)];X=np.array([xy[0]*dr for p,xy in ps]);Y=np.array([xy[1] for p,xy in ps])
            st='in' if fr['poss']==t else 'out'
            shape[t]['len_'+st].append(X.max()-X.min());shape[t]['wid_'+st].append(Y.max()-Y.min())
            shape[t]['line_'+st].append(X.min()+52.5);shape[t]['cx_ball_'+st].append(X.mean()-b[0]*dr)
            shape[t]['spread_'+st].append(np.mean(np.hypot(X-X.mean(),Y-Y.mean())))
            for (p,xy),x in zip(ps,X):reg[(p,st)].append((b[0]*dr,b[1],x,xy[1]))
        # pressing on the ball carrier
        c=fr['carrier'];pt=fr['poss']
        if c in fr['pl'] and team.get(c)==pt:
            cx,cy=fr['pl'][c];ds=sorted((math.hypot(xy[0]-cx,xy[1]-cy),p) for p,xy in fr['pl'].items() if team[p]!=pt and not gk.get(p))
            if ds:
                press['nearest'].append(ds[0][0]);press['second'].append(ds[1][0] if len(ds)>1 else np.nan);press['within5'].append(sum(1 for d,_ in ds if d<5))
                q=ds[0][1]
                if (i,q) in vel:
                    vx,vy,_=vel[(i,q)];qx,qy=fr['pl'][q];L=ds[0][0] or 1;press['close_speed'].append((vx*(cx-qx)+vy*(cy-qy))/L)
    for p,r in run.items():
        if r>0:bouts.append(r)
    nplay=len(F)*dt/60;players=20
    pct=lambda C:{k:round(100*v/max(1,sum(C.values())),1) for k,v in C.items()}
    A=np.array(acc);out=dict(name=M['name'],minutesInPlay=round(nplay,1),speed=pct(sp),
        metresPerMinPerPlayer=round(dist/players/nplay,1),
        accel={'p5':round(float(np.percentile(A,5)),2),'p95':round(float(np.percentile(A,95)),2),'pct_over_2':round(100*float((A>2).mean()),1),'pct_under_-2':round(100*float((A<-2).mean()),1),'pct_over_3':round(100*float((A>3).mean()),1)},
        turnsPerPlayerPer90=round(turns/players/nplay*90),sprintBoutsPerPlayerPer90=round(len(bouts)/players/nplay*90,1),meanSprintSeconds=round(float(np.mean(bouts)) if bouts else 0,2),
        meanSpeedByBallDistance={f'{k*10}-{k*10+10 if k<4 else "+"}m':round(float(np.mean(v)),2) for k,v in sorted(spd_by_db.items())},
        travelVsBall=pct(towards),travelVsGoal=pct(goalward))
    sh={}
    for k in ['len_in','len_out','wid_in','wid_out','line_in','line_out','cx_ball_in','cx_ball_out','spread_in','spread_out']:
        v=[x for t in (0,1) for x in shape[t][k]];sh[k]=round(float(np.median(v)),1) if v else None
    out['shape']=sh
    out['press']={k:round(float(np.nanmedian(v)),2) for k,v in press.items()}
    out['press']['nearest_p25']=round(float(np.percentile(press['nearest'],25)),2) if press['nearest'] else None
    # shift with the ball: per player and possession state, least squares x = a + kx*ballx, y = c + ky*bally
    ks=collections.defaultdict(list)
    for (p,st),R in reg.items():
        if len(R)<300:continue
        R=np.array(R);kx=np.polyfit(R[:,0],R[:,2],1)[0];ky=np.polyfit(R[:,1],R[:,3],1)[0]
        res=np.std(R[:,2]-np.polyval(np.polyfit(R[:,0],R[:,2],1),R[:,0]))
        ks[st].append((kx,ky,res))
    out['shift']={st:{'kx':round(float(np.median([a for a,_,_ in v])),2),'ky':round(float(np.median([b for _,b,_ in v])),2),'resid_x_m':round(float(np.median([c for _,_,c in v])),1)} for st,v in ks.items()}
    sp_=[];cur=None;k=0;pf=None
    for fr in F:
        if fr['poss']!=cur or (pf is not None and fr['f']!=pf+1):
            if cur is not None and k>0:sp_.append(k*dt)
            cur=fr['poss'];k=0
        k+=1;pf=fr['f']
    S=np.array(sp_) if sp_ else np.zeros(1)
    out['possessionSpells']={'median_s':round(float(np.median(S)),1),'mean_s':round(float(S.mean()),1),'pct_play_in_spells_over_20s':round(100*float(S[S>20].sum()/max(S.sum(),1e-9)),1)}
    return out

def pool(res):
    # mean over matches of every number
    def avg(vals):
        if isinstance(vals[0],dict):return {k:avg([v[k] for v in vals if k in v and v[k] is not None]) for k in vals[0]}
        if isinstance(vals[0],str):return len(vals)
        return round(float(np.mean(vals)),2)
    return avg(res)

if __name__=='__main__':
    if sys.argv[1]=='real':
        ids=[m['id'] for m in json.load(open(f'{D}/matches.json'))][:int(sys.argv[3]) if len(sys.argv)>3 else 99]
        res=[]
        for mid in ids:
            r=analyse(load_sc(mid));res.append(r);print(mid,r['minutesInPlay'],r['speed'],flush=True)
    else:
        res=[analyse(load_game(p)) for p in sys.argv[2:-1]]
    out={'matches':res,'pooled':pool(res)};json.dump(out,open(sys.argv[-1] if sys.argv[1]=='game' else sys.argv[2],'w'),indent=1)
    print(json.dumps(out['pooled'],indent=1,ensure_ascii=False))
