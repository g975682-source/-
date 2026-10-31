#!/usr/bin/env python3
"""Build a skinned football-player GLB from MakeHuman's CC0 assets (MPFB2 data), with no Blender and no MPFB code.

Inputs (assets/mpfb2/, copied from github.com/makehumancommunity/mpfb2, commit in SOURCE_COMMIT, CC0 1.0 per
LICENSE.md / LICENSE.ASSETS.md there): the base mesh (base.obj), macro targets (targets/*.target.gz), the Mixamo-named
rig (rigs/rig.mixamo.json: each bone's head and tail are the mean of listed base-mesh vertices) and its skin weights
(rigs/weights.mixamo.json). The generated model is a combination of those assets and the parameters below.

What it does:
  1. applies the macro targets the way MakeHuman's macro modifiers combine them (gender, age, muscle, weight,
     proportions, height, a third of each of the three ethnic targets),
  2. keeps the body only (no helper geometry: tights, skirt, hair, eyes, teeth, tongue, joint markers),
  3. places each bone at the mean of its vertices on the morphed mesh, with no rotation in the rest pose (bones are
     plain translations; a retargeter works from rest orientations, see ../retarget.js),
  4. writes the four largest skin weights per vertex, normalised,
  5. colours the vertices by body region from the dominant bone and height (shirt, shorts, socks, boots, skin, hair)
     so that one material with vertex colours draws a kit; a game would swap the colours per team,
  6. scales to `--height` metres with the feet on y = 0, facing +z (the game's front), y up, metres.

Usage: python3 build_player.py [--out out/mh_player.glb] [--height 1.80] [--muscle 0.75] [--weight 0.45]
"""
import argparse, gzip, json, math, os, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets', 'mpfb2')

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'mh_player.glb'))
ap.add_argument('--height', type=float, default=1.80)
ap.add_argument('--muscle', type=float, default=0.75)      # 0.5 average, 1 max
ap.add_argument('--weight', type=float, default=0.45)      # 0 min, 0.5 average
ap.add_argument('--proportions', type=float, default=1.0)  # 0.5 neutral, 1 ideal
ap.add_argument('--tall', type=float, default=0.6)         # 0.5 neutral, 1 max height
ap.add_argument('--fingers', type=int, default=1)          # 0: drop the finger bones (weights go to the hand)
args = ap.parse_args()

# ---- base mesh ----
verts, faces, groups = [], [], []
cur = None
with open(os.path.join(SRC, 'base.obj')) as f:
    for line in f:
        if line.startswith('v '):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '):
            cur = line.split()[1]
        elif line.startswith('f '):
            idx = [int(tok.split('/')[0]) - 1 for tok in line.split()[1:]]
            faces.append((cur, idx))
NV = len(verts)

# ---- macro targets ----
def target(name):
    out = {}
    with gzip.open(os.path.join(SRC, 'targets', name + '.target.gz'), 'rt') as f:
        for line in f:
            if not line.strip() or line.startswith('#'):
                continue
            a = line.split()
            out[int(a[0])] = (float(a[1]), float(a[2]), float(a[3]))
    return out

def split(v, lo_name, hi_name):   # MakeHuman: a value between the two ends of one part of a macro slider
    return {lo_name: 1 - v, hi_name: v}

mus = split((args.muscle - 0.5) / 0.5, 'averagemuscle', 'maxmuscle') if args.muscle >= 0.5 else None
wgt = split(args.weight / 0.5, 'minweight', 'averageweight') if args.weight <= 0.5 else None
if not mus or not wgt:
    sys.exit('muscle must be 0.5..1 and weight 0..0.5 (the targets copied here cover that range)')
applied = []
def add(name, w):
    if w <= 1e-6:
        return
    t = target(name)
    for i, (dx, dy, dz) in t.items():
        p = verts[i]; p[0] += dx * w; p[1] += dy * w; p[2] += dz * w
    applied.append((name, round(w, 4), len(t)))

# race x gender x age: a third of each ethnic group, male, young (age 25)
for race in ('african', 'asian', 'caucasian'):
    add(f'{race}-male-young', 1 / 3)
# gender x age x muscle x weight
for m, mw in mus.items():
    for w_, ww in wgt.items():
        add(f'universal-male-young-{m}-{w_}', mw * ww)
# proportions and height: only the averageweight targets were copied, so they take the muscle split alone
for m, mw in mus.items():
    add(f'male-young-{m}-averageweight-idealproportions', mw * max(0, (args.proportions - 0.5) / 0.5))
    add(f'male-young-{m}-averageweight-maxheight', mw * max(0, (args.tall - 0.5) / 0.5))

# ---- rig ----
rig = json.load(open(os.path.join(SRC, 'rigs', 'rig.mixamo.json')))['bones']
wts = json.load(open(os.path.join(SRC, 'rigs', 'weights.mixamo.json')))['weights']
def mean(ix):
    n = len(ix); s = [0.0, 0.0, 0.0]
    for i in ix:
        for k in range(3): s[k] += verts[i][k]
    return [c / n for c in s]
FINGER = ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')
names = [n for n in rig if args.fingers or not any(k in n for k in FINGER)]
def parent_kept(n):   # the nearest kept ancestor ('' or None: a root)
    p = rig[n].get('parent') or None
    while p and p not in names:
        p = rig[p].get('parent') or None
    return p
# a joint is the mean of listed vertices (MEAN) or of the vertices of a joint marker cube in the base mesh (CUBE)
gverts = {}
for g, idx in faces:
    gverts.setdefault(g, set()).update(idx)
def place(j):
    if j['strategy'] == 'CUBE':
        return mean(sorted(gverts[j['cube_name']]))
    if j['strategy'] == 'MEAN':
        return mean(j['vertex_indices'])
    raise SystemExit('unknown joint strategy ' + j['strategy'])
head = {n: place(rig[n]['head']) for n in names}
tail = {n: place(rig[n]['tail']) for n in names}
# finger weights fall to the nearest kept ancestor
vw = [dict() for _ in range(NV)]
for b, lst in wts.items():
    tb = b if b in names else parent_kept(b)
    if tb is None:
        continue
    for i, w in lst:
        vw[i][tb] = vw[i].get(tb, 0) + w

# ---- body faces, compact vertices ----
body = [idx for g, idx in faces if g == 'body']
used = sorted({i for idx in body for i in idx})
remap = {o: n for n, o in enumerate(used)}
tris = []
for idx in body:
    a = [remap[i] for i in idx]
    for k in range(1, len(a) - 1):
        tris.append((a[0], a[k], a[k + 1]))

# ---- units: decimetres -> metres, feet on the ground, height to args.height ----
ys = [verts[o][1] for o in used]
y0, y1 = min(ys), max(ys)
s = args.height / (y1 - y0)
T = lambda p: [p[0] * s, (p[1] - y0) * s, p[2] * s]
P = [T(verts[o]) for o in used]
for n in names:
    head[n] = T(head[n]); tail[n] = T(tail[n])

# ---- normals ----
N = [[0.0, 0.0, 0.0] for _ in P]
for a, b, c in tris:
    u = [P[b][k] - P[a][k] for k in range(3)]; v = [P[c][k] - P[a][k] for k in range(3)]
    n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    for i in (a, b, c):
        for k in range(3): N[i][k] += n[k]
for n in N:
    l = math.sqrt(sum(x * x for x in n)) or 1
    for k in range(3): n[k] /= l

# ---- skin: four largest weights ----
jidx = {n: i for i, n in enumerate(names)}
J = []; W = []; dom = []
for o in used:
    items = sorted(vw[o].items(), key=lambda kv: -kv[1])[:4]
    if not items:
        items = [('mixamorig:Hips', 1.0)]
    tot = sum(w for _, w in items) or 1
    j = [jidx[b] for b, _ in items] + [0] * (4 - len(items))
    w = [x / tot for _, x in items] + [0.0] * (4 - len(items))
    J.append(j); W.append(w); dom.append(items[0][0].split(':')[1])

# ---- kit colours by region ----
def hexc(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
KIT = {'shirt': hexc('#c8102e'), 'shorts': hexc('#f4f4f4'), 'socks': hexc('#c8102e'), 'boots': hexc('#141414'),
       'skin': hexc('#c99a74'), 'hair': hexc('#2a1d14')}
knee = {sd: head[f'mixamorig:{sd}Leg'][1] for sd in ('Left', 'Right')}
hipY = {sd: head[f'mixamorig:{sd}UpLeg'][1] for sd in ('Left', 'Right')}
headY = head['mixamorig:Head'][1]
region = []
for i, d in enumerate(dom):
    y = P[i][1]; sd = 'Left' if d.startswith('Left') else 'Right' if d.startswith('Right') else None
    if d in ('Head',):
        # a short haircut: above the ears and not on the face
        r = 'hair' if (y > headY + 0.10 and P[i][2] < head['mixamorig:Head'][2] + 0.05) else 'skin'
    elif d in ('Neck',) or d.endswith('ForeArm') or d.endswith('Hand') or any(k in d for k in FINGER):
        r = 'skin'
    elif d.startswith('Spine') or d.endswith('Shoulder') or d.endswith('Arm'):
        r = 'shirt'
    elif d == 'Hips':
        r = 'shorts' if y > min(hipY.values()) - 0.12 else 'shirt'
    elif d.endswith('UpLeg'):
        r = 'shorts' if y > knee[sd] + 0.55 * (hipY[sd] - knee[sd]) else 'skin'
    elif d.endswith('Leg'):
        r = 'socks' if y < knee[sd] - 0.07 else 'skin'
    elif d.endswith('Foot') or d.endswith('ToeBase'):
        r = 'boots'
    else:
        r = 'skin'
    region.append(r)
C = [KIT[r] + [1.0] for r in region]

# ---- glTF ----
bufs = bytearray(); views = []; accs = []
def push(data, fmt, count, comp, typ, target=None, minmax=None):
    global bufs
    while len(bufs) % 4: bufs += b'\0'
    off = len(bufs); bufs += data
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), **({'target': target} if target else {})})
    a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': count, 'type': typ}
    if minmax: a['min'], a['max'] = minmax
    accs.append(a); return len(accs) - 1
flat = lambda L: [x for r in L for x in r]
mn = [min(p[k] for p in P) for k in range(3)]; mx = [max(p[k] for p in P) for k in range(3)]
aP = push(struct.pack(f'<{len(P)*3}f', *flat(P)), 'f', len(P), 5126, 'VEC3', 34962, (mn, mx))
aN = push(struct.pack(f'<{len(N)*3}f', *flat(N)), 'f', len(N), 5126, 'VEC3', 34962)
aC = push(struct.pack(f'<{len(C)*4}f', *flat(C)), 'f', len(C), 5126, 'VEC4', 34962)
aJ = push(struct.pack(f'<{len(J)*4}H', *flat(J)), 'H', len(J), 5123, 'VEC4', 34962)
aW = push(struct.pack(f'<{len(W)*4}f', *flat(W)), 'f', len(W), 5126, 'VEC4', 34962)
aI = push(struct.pack(f'<{len(tris)*3}I', *flat(tris)), 'I', len(tris) * 3, 5125, 'SCALAR', 34963)
ibm = []
for n in names:
    h = head[n]; ibm += [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -h[0], -h[1], -h[2], 1]
aB = push(struct.pack(f'<{len(ibm)}f', *ibm), 'f', len(names), 5126, 'MAT4')

nodes = []
for n in names:   # joints: names as Mixamo files carry them (three.js drops the ':' when it binds tracks)
    p = parent_kept(n); h = head[n]; ph = head[p] if p else [0, 0, 0]
    nodes.append({'name': n, 'translation': [h[k] - ph[k] for k in range(3)]})
for n in names:
    ch = [jidx[c] for c in names if parent_kept(c) == n]
    if ch: nodes[jidx[n]]['children'] = ch
roots = [jidx[n] for n in names if parent_kept(n) is None]
mesh_node = len(nodes); nodes.append({'name': 'PlayerBody', 'mesh': 0, 'skin': 0})
arm = len(nodes); nodes.append({'name': 'Armature', 'children': roots})
top = len(nodes); nodes.append({'name': 'MHPlayer', 'children': [arm, mesh_node]})
gltf = {
    'asset': {'version': '2.0', 'generator': 'ground-legends build_player.py (MakeHuman CC0 assets via MPFB2 data)',
              'copyright': 'CC0 1.0: generated from MakeHuman / MPFB2 CC0 assets'},
    'scene': 0, 'scenes': [{'nodes': [top]}], 'nodes': nodes,
    'meshes': [{'name': 'PlayerBody', 'primitives': [{'attributes': {'POSITION': aP, 'NORMAL': aN, 'COLOR_0': aC, 'JOINTS_0': aJ, 'WEIGHTS_0': aW},
                                                       'indices': aI, 'material': 0}]}],
    'materials': [{'name': 'Kit', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.75}}],
    'skins': [{'name': 'MHPlayer', 'joints': list(range(len(names))), 'inverseBindMatrices': aB, 'skeleton': roots[0]}],
    'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': 0}],
}
while len(bufs) % 4: bufs += b'\0'
gltf['buffers'][0]['byteLength'] = len(bufs)
js = json.dumps(gltf, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bufs)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bufs), 0x004E4942) + bufs
os.makedirs(os.path.dirname(args.out), exist_ok=True)
open(args.out, 'wb').write(glb)
from collections import Counter
info = {'out': os.path.relpath(args.out, HERE), 'bytes': len(glb), 'vertices': len(P), 'triangles': len(tris), 'joints': len(names),
        'height_m': args.height, 'scale_dm_to_m': round(s, 5), 'targets': applied, 'regions': dict(Counter(region)),
        'knee_y': {k: round(v, 3) for k, v in knee.items()}, 'hip_y': {k: round(v, 3) for k, v in hipY.items()}}
json.dump(info, open(os.path.splitext(args.out)[0] + '.json', 'w'), indent=1)
print(json.dumps(info))
