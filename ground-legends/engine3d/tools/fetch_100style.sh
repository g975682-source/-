#!/bin/sh
# The 100STYLE dataset's Neutral style (Ian Mason, Sebastian Starke, Taku Komura, "Real-Time Style Modelling of Human
# Locomotion via Feature-Wise Transformations and Local Motion Phases", 2022; https://www.ianxmason.github.io/100style;
# CC BY 4.0), for tools/bake_mm.js: only its eight Neutral BVH files are taken out of the 1.47 GB archive on Zenodo,
# by HTTP range requests, and their joints renamed to the CMU names retarget.js knows (S100_*.bvh).
#   sh ground-legends/engine3d/tools/fetch_100style.sh <folder>        then MM_EXTRA=<folder>/cmu node .../bake_mm.js
set -e
D=${1:?folder}; mkdir -p "$D/neutral" "$D/cmu"; T=$(dirname "$0")
U="https://zenodo.org/api/records/8127870/files/100STYLE.zip/content"
curl -sSL -r -400000 -o "$D/tail.bin" "$U"
python3 -I "$T/zip_remote.py" list "$U" "$D/tail.bin" 1468515354
python3 -I "$T/zip_remote.py" get "$U" "$D/tail.bin.json" "$D/neutral" $(for k in FW FR BW BR SW SR ID TR1; do echo 100STYLE/Neutral/Neutral_$k.bvh; done)
python3 -I "$T/zip_remote.py" rename "$D/neutral" "$D/cmu"
