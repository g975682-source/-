# D at the strike: visual check against A

Copies: `../toe_final_exp/variants/index.A_current.html` (A, = `index.html` `48b9affc…`) and
`index.D_min.html` (D). `index.html` not changed.

## How the pictures were made

* `render_kick.js`: the game's `buildRig` + `applyVisual` (A.kick through `applyPose` and `rigLife`, 60 fps easing),
  Base Striker with yellow boots (boot colour only, to see the foot), grass plane at y = 0, ball where the game holds it
  for a standing owner (0.5 m in front, y 0.11) until the strike, then a faint ball at that place (in the game it has
  left by then). The same timeline as `../measure_kick_ground.js`: 12 idle frames, the kick (visT −0.083 … 0.133, the
  strike, 0.167 … 0.45), 12 idle frames. Three cameras on the kicking leg's side: `side` (whole body), `front34`,
  `foot` (low, near the ground). Right foot (side 0) and left foot (side −1).
* `make_sheets.py`: per foot and camera a sheet, A on top, D under it, at 11 key frames; per foot a GIF of every frame
  (side camera, A left, D right, a quarter of real speed). `out/zoom_*_side0_strike.png`: t 0.133 … 0.267 at full size.

Key frames: 1 wind-up t 0, 2 back-swing 0.1, 3 before the strike 0.133, 4 first frame after the strike 0.167, 5 0.2,
6 swing bottom 0.233, 7-8 the foot at the ball's place 0.25 / 0.267, 9 past it 0.283, 10-11 follow-through 0.3 / 0.4.

## What the pictures show

| scene | A | D |
|---|---|---|
| 1 wind-up | foot flat on the grass | identical (0 pixels differ) |
| 2-3 back-swing, before the strike | foot behind the body, toe pointed | the same shape; toe a little less pointed (hard to see at game size) |
| 4 strike (t 0.167) | foot still behind and up (toe ≈ 45 cm high, ≈ 0.84 m behind the ball) | the same place within 2 cm, foot ≈ 6° flatter |
| 5 t 0.2 | toe pointing down at the grass behind the plant foot | foot flatter by ≈ 9°, toe less steep: the clearest difference |
| 6 swing bottom 0.233 | front of the sole cut by the grass | the same, a little less deep |
| 7-9 at the ball's place | foot flat, sliding at grass level about 10 cm beside the ball centre | identical within 1 cm |
| 10-11 follow-through | leg up in front, toe pointed | identical (≤ 8 pixels differ) |

Pixels that differ between A and D (360 × 360 = 129,600 per picture): largest at t 0.2, foot camera, 613 (right foot)
and 505 (left foot), under 0.5 % of the picture; all other key frames 0 … 304. Largest ankle difference over the whole
timeline at 60 fps: 0.168 rad (9.6°) at t 0.183 (A 0.470, D 0.302). A and D differ only between t 0.1 and 0.3.
The left foot pictures are the mirror of the right foot's in both A and D. Page errors 0.

## Against the questions asked

* Instep toward the kick: neither A nor D shows an instep strike. When the game strikes the ball (t 0.15) the foot is
  still behind the body; the foot reaches the ball's place about 0.1 s later (t 0.25-0.267), flat and low, beside the
  ball. This is the same in A and D, a timing gap between the gameplay strike and the pose, not caused by the toe term.
* Toe drooping or a bent ankle: D points the toe less than A between t 0.1 and 0.3 (at most 9.6°). No frame of D looks
  more bent than A's; at t 0.2 D's foot looks more natural (less of a toe stab into the grass).
* Where the foot passes the ball: the same in A and D (within 1 cm).
* A part of the kick that D makes worse: none seen. The visible change is confined to t 0.18-0.22, where D is flatter.

## Opinion

D can go into the game code as far as the look of the kick is concerned: the change is small, it is only in the frames
around the swing bottom, and where it shows, it looks better than A. The strike pose itself is not decided by the toe
term: the foot is behind the body at the gameplay strike in both A and D. If the kick should look like the foot meets
the ball, that timing (the pose's swing against the strike tick) is a separate change.
