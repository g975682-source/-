#!/usr/bin/env python3
"""Build the stand-alone website copy of Ground Legends.

index.html is written as a page body for the claude.ai artifact (no <!doctype>, <html> or <head>).
This wraps it into a full document at docs/index.html so GitHub Pages (or any static host) can serve it.
Run it again after changing index.html:  python3 ground-legends/build_web.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, 'docs')

src = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()

# everything before the first <style> is head material (title, meta, font links)
cut = src.find('<style>')
head, body = src[:cut], src[cut:]
assert '<title>' in head, 'expected the <title> before the first <style>'

page = (
    '<!doctype html>\n<html lang="ko">\n<head>\n'
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    '<meta name="theme-color" content="#050b17">\n'
    + head.strip() + '\n'
    + '<meta property="og:title" content="그라운드 레전드">\n'
    + '<meta property="og:description" content="브라우저에서 바로 하는 11대11 3D 축구 게임. AI 팀과 경기, 구단 운영, 개인기 49종.">\n'
    + '</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n'
)

os.makedirs(OUT_DIR, exist_ok=True)
open(os.path.join(OUT_DIR, 'index.html'), 'w', encoding='utf-8').write(page)
# GitHub Pages: serve files as they are, no Jekyll processing
open(os.path.join(OUT_DIR, '.nojekyll'), 'w').close()
print('wrote', os.path.relpath(os.path.join(OUT_DIR, 'index.html'), ROOT), len(page), 'bytes')
