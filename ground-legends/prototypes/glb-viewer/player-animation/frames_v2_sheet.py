# Contact sheets from frames_v2.js: one sheet per scene, frames in time order (left to right, top to bottom), each
# labelled with its time from the game's contact tick. Needs Pillow.
#   python3 frames_v2_sheet.py <frames folder> <out folder>
import json, os, sys
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
info = json.load(open(os.path.join(src, 'frames.json')))
for sc in info['scenes']:
    ims = [Image.open(os.path.join(src, f['file'])).convert('RGB') for f in sc['frames']]
    w, h = ims[0].size; s = 0.5; tw, th = int(w * s), int(h * s); cols = 8; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * th), (11, 20, 36)); d = ImageDraw.Draw(sheet)
    for k, (im, f) in enumerate(zip(ims, sc['frames'])):
        x, y = (k % cols) * tw, (k // cols) * th; sheet.paste(im.resize((tw, th)), (x, y))
        d.rectangle([x, y, x + 92, y + 16], fill=(0, 0, 0)); d.text((x + 3, y + 2), 'contact %+.3f s' % f['dt'], fill=(245, 197, 66))
    out = os.path.join(dst, 'frames_' + sc['name'].replace(' ', '_').replace('.', '_') + '.png'); sheet.save(out); print(out, len(ims))
