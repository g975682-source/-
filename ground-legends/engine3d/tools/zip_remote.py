# Remote zip helper for tools/fetch_100style.sh: list a zip's entries over HTTP range requests, fetch single entries, and
# rename 100STYLE joints to the CMU names retarget.js knows. Development tool.
#   python3 -I zip_remote.py list <url> <tail.bin> <size>      python3 -I zip_remote.py get <url> <index.json> <outdir> <names...>
#   python3 -I zip_remote.py rename <indir> <outdir>
import sys,struct,subprocess,json,zlib,os,re
def do_list(url,tailf,size):
    t=open(tailf,'rb').read();base=size-len(t)
    i=t.rfind(b'PK\x05\x06');assert i>=0
    _,_,_,_,n,cdsize,cdoff,_=struct.unpack('<IHHHHIIH',t[i:i+22])
    if cdoff==0xFFFFFFFF or n==0xFFFF:   # zip64
        j=t.rfind(b'PK\x06\x06');n=struct.unpack('<Q',t[j+32:j+40])[0];cdsize=struct.unpack('<Q',t[j+40:j+48])[0];cdoff=struct.unpack('<Q',t[j+48:j+56])[0]
    if cdoff<base:
        subprocess.run(['curl','-sSL','--max-time','120','-r',f'{cdoff}-{cdoff+cdsize-1}','-o',tailf+'.cd',url],check=True);cd=open(tailf+'.cd','rb').read()
    else:cd=t[cdoff-base:cdoff-base+cdsize]
    p=0;out=[]
    while p<len(cd) and cd[p:p+4]==b'PK\x01\x02':
        meth,=struct.unpack('<H',cd[p+10:p+12]);csz,usz=struct.unpack('<II',cd[p+20:p+28]);fl,el,cl=struct.unpack('<HHH',cd[p+28:p+34]);off,=struct.unpack('<I',cd[p+42:p+46])
        name=cd[p+46:p+46+fl].decode('utf8','replace');ex=cd[p+46+fl:p+46+fl+el]
        if 0xFFFFFFFF in (csz,usz,off):   # zip64 extra
            q=0
            while q<len(ex):
                hid,hl=struct.unpack('<HH',ex[q:q+4])
                if hid==1:
                    vals=list(struct.unpack('<'+'Q'*(hl//8),ex[q+4:q+4+hl]));k=0
                    if usz==0xFFFFFFFF:usz=vals[k];k+=1
                    if csz==0xFFFFFFFF:csz=vals[k];k+=1
                    if off==0xFFFFFFFF:off=vals[k];k+=1
                q+=4+hl
        out.append({'name':name,'meth':meth,'csz':csz,'usz':usz,'off':off})
        p+=46+fl+el+cl
    json.dump(out,open(tailf+'.json','w'));print(len(out),'entries')
def do_get(url,idx,outdir,want):
    E={e['name']:e for e in json.load(open(idx))};os.makedirs(outdir,exist_ok=True)
    for n in want:
        e=E[n];a=e['off'];b=a+30+len(n.encode())+1024+e['csz']
        tmp=os.path.join(outdir,'part.bin');subprocess.run(['curl','-sSL','--retry','3','--max-time','300','-r',f'{a}-{b}','-o',tmp,url],check=True)
        d=open(tmp,'rb').read();assert d[:4]==b'PK\x03\x04'
        fl,el=struct.unpack('<HH',d[26:30]);data=d[30+fl+el:30+fl+el+e['csz']]
        raw=zlib.decompress(data,-15) if e['meth']==8 else data
        assert len(raw)==e['usz'],(n,len(raw),e['usz'])
        open(os.path.join(outdir,os.path.basename(n)),'wb').write(raw);print(os.path.basename(n),len(raw))
    os.remove(os.path.join(outdir,'part.bin'))
def do_rename(src,dst):
    M={'Chest':'LowerBack','Chest2':'Spine','Chest3':'Spine1'}
    for s in ['Left','Right']:
        M.update({s+'Collar':s+'Shoulder',s+'Shoulder':s+'Arm',s+'Elbow':s+'ForeArm',s+'Wrist':s+'Hand',s+'Hip':s+'UpLeg',s+'Knee':s+'Leg',s+'Ankle':s+'Foot',s+'Toe':s+'ToeBase'})
    os.makedirs(dst,exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith('.bvh'):continue
        t=open(os.path.join(src,f)).read()
        t=re.sub(r'^(\s*(?:ROOT|JOINT)\s+)(\S+)',lambda m:m.group(1)+M.get(m.group(2),m.group(2)),t,flags=re.M)
        open(os.path.join(dst,'S100_'+f[8:]),'w').write(t);print(f,'->','S100_'+f[8:])
if __name__=='__main__':
    c=sys.argv[1]
    if c=='list':do_list(sys.argv[2],sys.argv[3],int(sys.argv[4]))
    elif c=='get':do_get(sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5:])
    else:do_rename(sys.argv[2],sys.argv[3])
