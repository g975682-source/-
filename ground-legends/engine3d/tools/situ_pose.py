# Real players' body in given match situations, and how often each kind of non-running pose happens, from SkillCorner's
# body pose (3D joints from broadcast video, 25 fps) and dynamic events. Development analysis.
#   python3 -I situ_pose.py <sc folder> <out.json> <match ids...>
import json,sys,os,zipfile,csv,collections,math
import numpy as np
SC=sys.argv[1];OUT=sys.argv[2];MIDS=sys.argv[3:]
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle','lBigToe','rBigToe']
def v(js,k):return np.array(js[k]['xyz'],float)
def ang(a,b,c):
    u=a-b;w=c-b;return float(np.degrees(np.arccos(np.clip(u@w/(np.linalg.norm(u)*np.linalg.norm(w)+1e-9),-1,1))))
def feats(js):
    P={k:v(js,k) for k in J}
    T=P['neck']-P['midHip'];tl=np.linalg.norm(T)+1e-9;up=T/tl
    hipv=P['rHip']-P['lHip'];side=hipv/ (np.linalg.norm(hipv)+1e-9)
    fwd=np.cross(up,side)   # forward from the hips (left to right x up)
    if (P['nose']-P['neck'])@fwd<0:fwd=-fwd
    f={}
    f['hipZ']=P['midHip'][2];f['neckZ']=P['neck'][2];f['noseZ']=P['nose'][2]
    f['lean']=float(np.degrees(np.arctan2(T@np.array([fwd[0],fwd[1],0])/ (np.hypot(fwd[0],fwd[1])+1e-9),T[2])))   # trunk forward of vertical
    f['trunkTilt']=float(np.degrees(np.arccos(np.clip(T[2]/tl,-1,1))))
    for s in 'lr':
        sh,el,wr,hp,kn,an=P[s+'Shoulder'],P[s+'Elbow'],P[s+'Wrist'],P[s+'Hip'],P[s+'Knee'],P[s+'Ankle']
        ua=el-sh;f[s+'ArmElev']=ang(el,sh,sh-T)            # 0 hanging down, 90 horizontal, 180 straight up
        f[s+'ArmFwd']=float(np.degrees(np.arctan2(ua@fwd,-(ua@up))))   # flexion in the sagittal plane
        f[s+'ArmOut']=float(np.degrees(np.arctan2(ua@(side if s=='r' else -side),-(ua@up))))
        f[s+'Elbow']=ang(sh,el,wr);f[s+'Knee']=ang(hp,kn,an);f[s+'HipFlex']=180-ang(P['neck'],hp,kn)
        f[s+'WristZrel']=wr[2]-P['nose'][2];f[s+'WristHead']=float(np.linalg.norm(wr-P['nose']));f[s+'WristKnee']=float(np.linalg.norm(wr-kn));f[s+'WristHip']=float(np.linalg.norm(wr-hp))
        f[s+'KneeZ']=kn[2]
    return f
def cls(f):
    out=[]
    if f['hipZ']<0.45:out.append('ground_lying' if f['neckZ']<0.55 else 'ground_sitting')
    elif min(f['lKneeZ'],f['rKneeZ'])<0.2 and f['hipZ']<0.75:out.append('kneeling')
    elif f['hipZ']<0.72:out.append('crouch')
    if f['lWristZrel']>0.05 and f['rWristZrel']>0.05:out.append('both_arms_up')
    elif f['lWristZrel']>0.05 or f['rWristZrel']>0.05:out.append('one_arm_up')
    if f['lWristHead']<0.3 and f['rWristHead']<0.3:out.append('hands_on_head')
    if f['lean']>30 and f['lWristKnee']<0.22 and f['rWristKnee']<0.22:out.append('hands_on_knees')
    if f['lWristHip']<0.16 and f['rWristHip']<0.16 and f['lElbow']<130 and f['rElbow']<130:out.append('hands_on_hips')
    return out
def events(mid):
    W=[]   # (player or team, f0, f1, label)
    rows=list(csv.DictReader(open(os.path.join(SC,f'{mid}_dynamic_events.csv'))))
    for r in rows:
        if r['event_type']!='player_possession':continue
        pid=int(float(r['player_id']));f0=int(r['frame_start']);f1=int(r['frame_end']);tid=int(float(r['team_id']))
        e=r['end_type'];after=r['game_interruption_after'];before=r['game_interruption_before']
        if e=='shot':
            W.append((pid,f1-12,f1+8,'shot_strike'))
            W.append((pid,f1+20,f1+100,'after_shot_goal' if after=='goal_for' else 'after_shot_miss' if after in('goal_kick_against','goal_kick_for','corner_for','corner_against') else 'after_shot_other'))
        if after=='goal_for':W.append((('team',tid),f1+25,f1+25*45,'goal_scoring_team'));W.append((('opp',tid),f1+25,f1+25*45,'goal_conceding_team'));W.append((pid,f1+10,f1+25*30,'goal_scorer'))
        if e=='foul_suffered':W.append((pid,f1-5,f1+75,'foul_victim'))
        if e=='foul_committed':W.append((pid,f1,f1+75,'foul_committer'))
        if e=='clearance':W.append((pid,f1-12,f1+8,'clearance'))
        if before=='throw_in_for':W.append((pid,f0,min(f1,f0+60),'throw_in_taker'))
        if before=='goal_kick_for':W.append((pid,f0,f1,'goal_kick_taker'))
        if before=='corner_for':W.append((pid,f0,f1,'corner_taker'))
        if before=='free_kick_for':W.append((pid,f0,f1,'free_kick_taker'))
    return W
FKEYS=None
res={'classAll':collections.Counter(),'classByRole':collections.defaultdict(collections.Counter),'frames':0,'situ':{},'situCount':collections.Counter(),'classFeat':collections.defaultdict(list),'situFeat':collections.defaultdict(list),'situClass':collections.defaultdict(collections.Counter),'examples':collections.defaultdict(list)}
for mid in MIDS:
    m=json.load(open(os.path.join(SC,f'{mid}_match.json')))
    team={p['id']:p['team_id'] for p in m['players']};gk={p['id'] for p in m['players'] if (p.get('player_role') or {}).get('acronym')=='GK'}
    W=events(mid);byf=collections.defaultdict(list)
    for w in W:
        res['situCount'][w[3]]+=1
        for fr in range(w[1],w[2]+1):byf[fr].append(w)
    z=zipfile.ZipFile(os.path.join(SC,'pose',f'{mid}.jsonl.zip'));name=[n for n in z.namelist() if n.endswith('.jsonl')][0]
    n=0
    with z.open(name) as fh:
        for line in fh:
            d=json.loads(line);fr=d['frame'];n+=1
            ws=byf.get(fr,())
            for p in d['player_data']:
                js=p.get('joints')
                if not js or any(k not in js for k in J):continue
                pid=p['player_id'];f=feats(js);c=cls(f);role='gk' if pid in gk else 'out'
                res['frames']+=1
                for k in c:
                    res['classAll'][k]+=1;res['classByRole'][role][k]+=1
                    if len(res['classFeat'][role+':'+k])<4000:res['classFeat'][role+':'+k].append(f)
                    if len(res['examples'][role+':'+k])<6 and n%7==0:res['examples'][role+':'+k].append({'match':mid,'frame':fr,'player':pid,'joints':{j:js[j]['xyz'] for j in js}})
                for w in ws:
                    who=w[0];ok=(who==pid) if not isinstance(who,tuple) else ((team.get(pid)==who[1]) if who[0]=='team' else (team.get(pid)!=who[1] and pid in team))
                    if not ok:continue
                    lab=w[3];res['situFeat'][lab].append(f)
                    for k in c:res['situClass'][lab][k]+=1
                    res['situClass'][lab]['_frames']+=1
                    if len(res['examples']['situ:'+lab])<8 and fr%10==0:res['examples']['situ:'+lab].append({'match':mid,'frame':fr,'player':pid,'joints':{j:js[j]['xyz'] for j in js}})
            if n%20000==0:print(mid,n,res['frames'],flush=True)
def med(L):
    if not L:return {}
    ks=L[0].keys();return {k:round(float(np.median([x[k] for x in L])),3) for k in ks}
out={'frames':res['frames'],'classAll':res['classAll'],'classByRole':res['classByRole'],'situCount':res['situCount'],
     'situClass':res['situClass'],'situMedian':{k:med(v) for k,v in res['situFeat'].items()},'classMedian':{k:med(v) for k,v in res['classFeat'].items()},
     'classN':{k:len(v) for k,v in res['classFeat'].items()}}
json.dump(out,open(OUT,'w'),indent=1);json.dump(res['examples'],open(OUT.replace('.json','_examples.json'),'w'))
print(json.dumps({'frames':out['frames'],'classAll':out['classAll'],'situCount':out['situCount']},indent=0))
