#!/bin/bash
# Downloads the SkillCorner open data (github.com/SkillCorner/opendata, MIT; please credit SkillCorner) used by
# track_an.py and pose_an.py into the folder given (about 1.8 GB). Not part of this repository.
#   bash fetch_skillcorner.sh <folder>
set -e
D="${1:?folder}";mkdir -p "$D";cd "$D"
RAW=https://raw.githubusercontent.com/SkillCorner/opendata/master/data;LFS=https://media.githubusercontent.com/media/SkillCorner/opendata/master/data
curl -sSf -o matches.json $RAW/matches.json
curl -sSf -o sample_1925299_phase406.jsonl.gz $RAW/bodypose/sample_1925299_phase406.jsonl.gz
for id in $(python3 -c "import json;print(' '.join(str(m['id']) for m in json.load(open('matches.json'))))"); do
  for f in match.json phases_of_play.csv; do [ -s ${id}_$f ] || curl -sSf -o ${id}_$f $RAW/matches/$id/${id}_$f; done
  [ -s ${id}_tracking_extrapolated.jsonl ] || curl -sSf -o ${id}_tracking_extrapolated.jsonl $LFS/matches/$id/${id}_tracking_extrapolated.jsonl
  echo "match $id"
done
