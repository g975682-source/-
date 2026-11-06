# Real footballers' sprints, sharp cuts and hard stops in SkillCorner's broadcast body pose: unbroken runs of a player's
# frames with all joints (25 fps), smoothed pelvis speed and heading; segments kept with a margin of 0.4 s.
# Development tool; the segments go to pose_to_bvh.py.
#   python3 -I sc_segments.py <pose zip> <out.json>
import json,sys,zipfile,numpy as np,collections
J=['nose','neck','lShoulder','rShoulder','lElbow','rElbow','lWrist','rWrist','midHip','lHip','rHip','lKnee','rKnee','lAnkle','rAnkle','lBigToe','rBigToe','lHeel','rHeel','lEar','rEar']
z=zipfile.ZipFile(sys.argv[1]);name=[n for n in z.namelist() if n.endswith('.jsonl')][0]
buf={};last={};segs=[];FPS=25
def close(pid):
    B=buf.pop(pid,None)
    if not B or len(B['f'])<2*FPS:return
    P=np.array([[f['midHip'][0],f['midHip'][1]] for f in B['j']]);k=7;Ps=np.stack([np.convolve(np.pad(P[:,c],(k//2,k//2),mode='edge'),np.ones(k)/k,'valid') for c in (0,1)],1)
    V=np.gradient(Ps,1/FPS,axis=0);sp=np.hypot(V[:,0],V[:,1]);hd=np.unwrap(np.arctan2(V[:,1],V[:,0]))
    n=len(sp);m=int(0.4*FPS)
    for i in range(n):
        tags=[]
        if sp[i]>=7.0:tags.append('sprint')
        j=min(n-1,i+int(0.6*FPS))
        if sp[i]>=4 and sp[j]>=3 and abs(hd[j]-hd[i])>np.radians(45):tags.append('cut')
        if sp[i]>=5.5 and sp[j]<=2.0:tags.append('stop')
        if sp[i]<=1.0 and sp[j]>=5.0:tags.append('start')
        for t in tags:segs.append({'pid':pid,'tag':t,'f0':B['f'][max(0,i-m)],'f1':B['f'][min(n-1,j+m)],'vmax':float(sp[i:j+1].max()),'dturn':float(np.degrees(abs(hd[j]-hd[i])))})
with z.open(name) as fh:
    for line in fh:
        d=json.loads(line);fr=d['frame'];seen=set()
        for p in d['player_data']:
            js=p.get('joints')
            if not js or any(k not in js for k in J):continue
            pid=p['player_id'];seen.add(pid)
            if pid in buf and last.get(pid)!=fr-1:close(pid)
            B=buf.setdefault(pid,{'f':[],'j':[]});B['f'].append(fr);B['j'].append({k:js[k]['xyz'] for k in J});last[pid]=fr
        for pid in [q for q in buf if q not in seen]:close(pid)
for pid in list(buf):close(pid)
# merge overlapping segments of the same player and tag
out=[];segs.sort(key=lambda s:(s['pid'],s['tag'],s['f0']))
for s in segs:
    if out and out[-1]['pid']==s['pid'] and out[-1]['tag']==s['tag'] and s['f0']<=out[-1]['f1']:
        o=out[-1];o['f1']=max(o['f1'],s['f1']);o['vmax']=max(o['vmax'],s['vmax']);o['dturn']=max(o['dturn'],s['dturn'])
    else:out.append(dict(s))
json.dump(out,open(sys.argv[2],'w'))
c=collections.Counter(s['tag'] for s in out);secs=collections.defaultdict(float)
for s in out:secs[s['tag']]+=(s['f1']-s['f0'])/FPS
print({k:(c[k],round(secs[k],1)) for k in c});print('vmax p50/p90',np.percentile([s['vmax'] for s in out if s['tag']=='sprint'],[50,90]) if c['sprint'] else None)
