from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
DPI=200; W,H=int(13.333*DPI),int(7.5*DPI)
def px(i): return int(round(i*DPI))
def plus(d,x,y,col,a=14,w=3):
    d.line([(x-a,y),(x+a,y)],fill=col,width=w); d.line([(x,y-a),(x,y+a)],fill=col,width=w)
def board(bg,dot,line,cross,vlines,hlines,crossp,name):
    bg,dot,line,cross=['#'+c for c in (bg,dot,line,cross)]
    im=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(im)
    step=px(0.4)
    for x in range(step//2,W,step):
        for y in range(step//2,H,step): d.ellipse([x-2,y-2,x+2,y+2],fill=dot)
    for x in vlines: d.line([(px(x),0),(px(x),H)],fill=line,width=3)
    for y in hlines: d.line([(0,px(y)),(W,px(y))],fill=line,width=3)
    for (x,y) in crossp: plus(d,px(x),px(y),cross)
    im.save(f'assets/{name}.png',optimize=True)
LV=[0.45,12.883]
# body: header rule at 1.35, bottom rule 6.93
board('F5F7FA','E0E6EF','D0D8E4','7F93B4',LV,[1.35,6.93],[(0.45,1.35),(12.883,1.35),(0.45,6.93),(12.883,6.93)],'bg_body')
# cover
board('F5F7FA','E0E6EF','D0D8E4','7F93B4',LV+[6.15],[0.8,6.7],[(0.45,0.8),(6.15,0.8),(12.883,0.8),(0.45,6.7),(6.15,6.7),(12.883,6.7)],'bg_cover')
# dark
board('0A2A5E','163C75','1B4380','6E94CF',LV,[1.35,6.93],[(0.45,1.35),(12.883,1.35),(0.45,6.93),(12.883,6.93)],'bg_dark')

# ---------------- illustration (pillow + folding robot arm), blue duotone
S=2400
def grad(size,c1,c2,vertical=True):
    a=np.linspace(0,1,size[1] if vertical else size[0])
    c1=np.array(c1);c2=np.array(c2)
    arr=(c1[None,:]*(1-a[:,None])+c2[None,:]*a[:,None]).astype('uint8')
    arr=np.repeat(arr[:,None,:],size[0],axis=1) if vertical else np.repeat(arr[None,:,:],size[1],axis=0)
    return Image.fromarray(arr)
img=grad((S,S),(226,235,248),(150,176,214))
def layer(): return Image.new('RGBA',(S,S),(0,0,0,0))
def paste(l): 
    global img
    img=Image.alpha_composite(img.convert('RGBA'),l).convert('RGB')
def shadow(shape_fn,blur,off,alpha):
    l=layer(); d=ImageDraw.Draw(l); shape_fn(d,(10,30,70,alpha)); l=l.filter(ImageFilter.GaussianBlur(blur))
    l=ImageChops.offset(l,off[0],off[1]); paste(l)
# soft background circles
l=layer(); d=ImageDraw.Draw(l); d.ellipse([300,300,2100,2100],fill=(255,255,255,60)); d.ellipse([650,650,1750,1750],fill=(255,255,255,50)); paste(l)
# pillow
PX0,PY0,PX1,PY1=300,1290,2100,1960
shadow(lambda d,c:d.ellipse([PX0+60,PY1-90,PX1-20,PY1+120],fill=c),55,(0,0),120)
mask=Image.new('L',(S,S),0); ImageDraw.Draw(mask).rounded_rectangle([PX0,PY0,PX1,PY1],300,fill=255)
sh=grad((S,S),(250,252,255),(186,204,232)).convert('RGBA')
shl=Image.new('RGBA',(S,S),(0,0,0,0)); shl.paste(sh,(0,0),mask); paste(shl)
l=layer(); d=ImageDraw.Draw(l); d.rounded_rectangle([PX0+140,PY0+50,PX1-140,PY0+190],70,fill=(255,255,255,120)); l=l.filter(ImageFilter.GaussianBlur(30)); paste(l)
import math
def dashed_rr(d,box,r,col,dash=26,gap=22,w=6):
    x0,y0,x1,y1=box; path=[]
    cx0,cy0,cx1,cy1=x0+r,y0+r,x1-r,y1-r
    def arc(cx,cy,a0,a1,k=40):
        for i in range(k+1):
            a=a0+(a1-a0)*i/k; path.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    path.append((cx0,y0)); path.append((cx1,y0)); arc(cx1,cy0,-math.pi/2,0); path.append((x1,cy1)); arc(cx1,cy1,0,math.pi/2); path.append((cx0,y1)); arc(cx0,cy1,math.pi/2,math.pi); path.append((x0,cy0)); arc(cx0,cy0,math.pi,1.5*math.pi)
    acc=0; draw=True
    for (a,b) in zip(path[:-1],path[1:]):
        seg=math.dist(a,b)
        if seg==0: continue
        if draw: d.line([a,b],fill=col,width=w)
        acc+=seg; lim=dash if draw else gap
        if acc>=lim: acc=0; draw=not draw
l=layer(); d=ImageDraw.Draw(l); dashed_rr(d,[PX0+80,PY0+80,PX1-80,PY1-80],230,(120,146,190,210)); paste(l)
# storage pocket on the right side of the pillow
l=layer(); d=ImageDraw.Draw(l); d.rounded_rectangle([1640,1355,2040,1445],45,fill=(10,42,94,255)); paste(l)
NAVY=(10,42,94); MID=(44,90,160)
def capsule(p0,p1,wd,col,hl):
    shadow(lambda d,c:d.line([p0,p1],fill=c,width=wd),30,(18,34),110)
    l=layer(); d=ImageDraw.Draw(l)
    d.line([p0,p1],fill=col+(255,),width=wd)
    for p in (p0,p1): d.ellipse([p[0]-wd//2,p[1]-wd//2,p[0]+wd//2,p[1]+wd//2],fill=col+(255,))
    vx,vy=p1[0]-p0[0],p1[1]-p0[1]; n=math.hypot(vx,vy); nx,ny=-vy/n,vx/n; o=wd*0.22
    d.line([(p0[0]+nx*o,p0[1]+ny*o),(p1[0]+nx*o,p1[1]+ny*o)],fill=hl+(255,),width=int(wd*0.2)); paste(l)
A=(1840,1400); B=(1700,800); Cc=(1060,880)
capsule(A,B,130,NAVY,MID); capsule(B,Cc,120,NAVY,MID)
def joint(p,r):
    shadow(lambda d,c:d.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r],fill=c),22,(10,22),110)
    l=layer(); d=ImageDraw.Draw(l)
    d.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r],fill=(232,240,252,255)); d.ellipse([p[0]-r*0.72,p[1]-r*0.72,p[0]+r*0.72,p[1]+r*0.72],fill=(10,42,94,255)); d.ellipse([p[0]-r*0.34,p[1]-r*0.34,p[0]+r*0.34,p[1]+r*0.34],fill=(120,160,220,255)); paste(l)
joint(B,104); joint(A,76)
# wrist, palm and fingers (pad facing down onto the cushion)
shadow(lambda d,c:d.rounded_rectangle([Cc[0]-170,Cc[1]+20,Cc[0]+170,Cc[1]+330],80,fill=c),34,(14,30),120)
l=layer(); d=ImageDraw.Draw(l)
d.rounded_rectangle([Cc[0]-50,Cc[1]-10,Cc[0]+50,Cc[1]+80],30,fill=NAVY+(255,))
HAND=(74,134,220,255)
d.rounded_rectangle([Cc[0]-165,Cc[1]+50,Cc[0]+165,Cc[1]+270],85,fill=HAND)
for dx in (-120,-40,40,120):
    d.rounded_rectangle([Cc[0]+dx-36,Cc[1]+200,Cc[0]+dx+36,Cc[1]+335],36,fill=HAND)
d.rounded_rectangle([Cc[0]-215,Cc[1]+90,Cc[0]-140,Cc[1]+190],36,fill=HAND)
paste(l)
l=layer(); d=ImageDraw.Draw(l); d.rounded_rectangle([Cc[0]-125,Cc[1]+75,Cc[0]+60,Cc[1]+115],20,fill=(160,198,248,210)); l=l.filter(ImageFilter.GaussianBlur(7)); paste(l)
joint(Cc,66)
# impact marks on the cushion
l=layer(); d=ImageDraw.Draw(l)
for (x0,y0,x1,y1) in [(Cc[0]-300,1290,Cc[0]-230,1245),(Cc[0]-330,1335,Cc[0]-240,1325),(Cc[0]+250,1245,Cc[0]+320,1290),(Cc[0]+260,1325,Cc[0]+345,1335)]:
    d.line([(x0,y0),(x1,y1)],fill=(10,42,94,200),width=14)
paste(l)
img.resize((1200,1200),Image.LANCZOS).save('assets/illus.png',optimize=True)
print('done')
