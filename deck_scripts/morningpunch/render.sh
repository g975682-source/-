#!/bin/bash
# usage: render.sh file.pptx outdir
SK=$(ls -d /root/.claude/skills/synced/*/pptx)
f=$1; o=$2; mkdir -p $o; rm -f $o/*
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf --outdir $o $f >/dev/null 2>&1
pdftoppm -r 50 -jpeg $o/*.pdf $o/p
python3 - <<PY
import glob
from PIL import Image
fs=sorted(glob.glob('$o/p-*.jpg'))
ims=[Image.open(f) for f in fs]
w,h=ims[0].size
cols=3
for part in range(0,len(ims),9):
    sub=ims[part:part+9]
    rows=(len(sub)+cols-1)//cols
    sh=Image.new('RGB',(w*cols,h*rows),'white')
    for i,im in enumerate(sub): sh.paste(im,((i%cols)*w,(i//cols)*h))
    sh.save('$o/sheet%d.jpg'%(part//9))
print(len(ims),'pages',w,h)
PY
