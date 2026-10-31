#!/usr/bin/env python3
"""Website copy of the game: docs/index.html from ground-legends/index.html, and docs/engine3d/ from engine3d/.
Also writes engine3d/models/mh_player.glb.json (the model in base64) for hosts that do not serve .glb.

The game file is written for the claude.ai artifact, which wraps it in a document of its own. The website copy adds
that document around it: doctype, <html lang="ko">, <head> with the charset, viewport and theme colour, the game's
first lines (title, description, fonts), the og: tags, then <body> ... </body></html>.
  python3 ground-legends/build_site.py            write docs/index.html and docs/engine3d/
  python3 ground-legends/build_site.py --check SRC   print whether SRC would give the docs/index.html there now
"""
import base64, json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
DOCS = os.path.join(ROOT, 'docs')
TOP = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#050b17">\n')
HEAD_LINES = 5   # the game's own head lines (title, description, the font links) go inside <head>
OG = ('<meta property="og:title" content="그라운드 레전드">\n'
      '<meta property="og:description" content="브라우저에서 바로 하는 11대11 3D 축구 게임. AI 팀과 경기, 구단 운영, 개인기 49종.">\n'
      '</head>\n<body>\n')
END = '</body>\n</html>\n'

def site(src):
    lines = src.split('\n')
    return TOP + '\n'.join(lines[:HEAD_LINES]) + '\n' + OG + '\n'.join(lines[HEAD_LINES:]).rstrip('\n') + '\n' + END

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--check':
        same = site(open(sys.argv[2], encoding='utf-8').read()) == open(os.path.join(DOCS, 'index.html'), encoding='utf-8').read()
        print('same as docs/index.html:', same); sys.exit(0 if same else 1)
    # the model also as base64 JSON, for hosts that do not serve .glb files (claude.ai artifacts)
    glb = os.path.join(HERE, 'engine3d', 'models', 'mh_player.glb')
    with open(glb + '.json', 'w') as f: json.dump({'about': 'engine3d/models/mh_player.glb in base64 (CC0, see engine3d/LICENSES.md)', 'glb': base64.b64encode(open(glb, 'rb').read()).decode()}, f)
    out = site(open(os.path.join(HERE, 'index.html'), encoding='utf-8').read())
    open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8').write(out)
    dst = os.path.join(DOCS, 'engine3d')
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(HERE, 'engine3d'), dst)
    print('wrote docs/index.html (%d bytes) and docs/engine3d/' % len(out.encode('utf-8')))
