# Side-by-side pictures from render_kick.js: per side and view, a sheet with A on the top row and D under it at the
# key frames; per side, a GIF of the whole timeline (side view, A left, D right). Needs Pillow.
#   python3 make_sheets.py <out folder of render_kick.js>
import json, os, sys
from PIL import Image, ImageDraw
out = sys.argv[1]; fr = os.path.join(out, 'frames')
info = json.load(open(os.path.join(out, 'frames.json')))
NAMES = {0.0: '1 wind-up', 0.1: '2 back-swing', 0.1333: '3 before strike', 0.1667: '4 strike (+1 frame)',
         0.2: '5 after strike', 0.2333: '6 swing bottom', 0.25: '7 at the ball', 0.2667: '8 at the ball',
         0.2833: '9 past the ball', 0.3: '10 follow-through', 0.4: '11 follow-through'}
BG, YEL, WHITE = (11, 20, 36), (245, 197, 66), (235, 235, 235)
for side in ['0', '-1']:
    foot = 'right foot' if side == '0' else 'left foot'
    for view in ['side', 'front34', 'foot']:
        keys = info['A']['index']['key'][side]
        ims = {v: [Image.open(os.path.join(fr, k['files'][view])).convert('RGB') for k in info[v]['index']['key'][side]] for v in 'AD'}
        w, h = ims['A'][0].size; s = 0.6; tw, th = int(w * s), int(h * s); lab = 70; top = 22
        sheet = Image.new('RGB', (lab + len(keys) * tw, top + 2 * th), BG); d = ImageDraw.Draw(sheet)
        d.text((4, 4), f'GLB mh_player, Base Striker kick, {foot}, view: {view}   (A = 0.5*swing, D = 0.5*min(swing, thigh/0.95))', fill=WHITE)
        for row, v in enumerate('AD'):
            d.text((8, top + row * th + th // 2 - 6), v, fill=YEL)
            for c, (im, k) in enumerate(zip(ims[v], keys)):
                x, y = lab + c * tw, top + row * th; sheet.paste(im.resize((tw, th)), (x, y))
                if row == 0:
                    d.rectangle([x, y, x + tw, y + 14], fill=(0, 0, 0)); d.text((x + 3, y + 2), '%s t %.3f' % (NAMES[round(k['t'], 4)], k['t']), fill=YEL)
        f = os.path.join(out, f'sheet_{view}_side{side}.png'); sheet.save(f); print(f)
    # moving picture: every frame, side view, A | D
    A = info['A']['index']['all'][side]; D = info['D']['index']['all'][side]; frames = []
    for a, b in zip(A, D):
        ia = Image.open(os.path.join(fr, a['file'])).convert('RGB'); ib = Image.open(os.path.join(fr, b['file'])).convert('RGB')
        w, h = ia.size; im = Image.new('RGB', (2 * w + 6, h + 18), BG); im.paste(ia, (0, 18)); im.paste(ib, (w + 6, 18)); d = ImageDraw.Draw(im)
        t = a['label'] if a['t'] is None else 'kick t %.3f' % a['t']
        d.text((4, 3), f'A  {t}', fill=YEL); d.text((w + 10, 3), f'D  {t}', fill=YEL)
        frames.append(im.quantize(colors=128))
    f = os.path.join(out, f'kick_A_vs_D_side{side}.gif')
    # 60 fps timeline shown at a quarter of real speed (67 ms a frame)
    frames[0].save(f, save_all=True, append_images=frames[1:], duration=67, loop=0); print(f, len(frames))
