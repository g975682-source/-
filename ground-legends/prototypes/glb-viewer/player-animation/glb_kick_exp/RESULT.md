# A and D on the GLB player

The game's procedural kick (A as it is, D the toe-term candidate) put on the 3D model `../out/mh_player.glb` (MakeHuman
CC0 body, Mixamo bone names, 1.80 m). `index.html` not changed; the copies are
`../toe_final_exp/variants/index.A_current.html` and `index.D_min.html`.

## How

* `inspect_glb.js`: the GLB's bones (read only). No rotation at rest, faces +z, y up, left on +x, as the game rig.
  Rest shape differs: legs a little apart (foot 0.20 m off centre against 0.11 m at the hip), arms in an A pose.
* `render_glb_kick.js`: per frame the game's own rig is driven with `applyVisual` (60 fps, rigLife easing), and its
  joint rotations are copied to the GLB: hips, spine (torso → Spine, chest → Spine1), neck, head, clavicles, arms,
  forearms, hands, thighs, shins, feet. Each limb bone gets a fixed rest correction so that the game's angles act on the
  game's straight-down rest directions; the foot keeps the GLB's own shape. Hips height = hipN/0.95 of the standing
  height, set so that the game's idle pose puts the GLB's lowest foot vertex on the ground. Foot depth is measured on
  the skinned vertices (the 1,037 / 1,038 vertices whose strongest bone is a foot or toe). Same cameras, ball and
  timeline as `../toe_visual_exp/`. D was drawn twice: identical. Page errors 0.
* `make_sheets.py` (copy of `../toe_visual_exp/make_sheets.py`, title changed): sheets and GIFs.

This is a pose transfer written for this check, not the game's or the prototype's animation path (the prototype plays
CMU clips on this model). Its numbers describe the GLB's foot under the game's angles.

## Results (60 fps, cm, ground y = 0; right and left foot equal)

| | kicking foot lowest (t) | wind-up t ≤ 0.05 | swing bottom | plant foot min/max | after the kick (idle) |
|---|---|---|---|---|---|
| A | −6.1 (0.233) | −1.0 | −6.1 | −0.3 / −0.2 | ≥ −0.1 |
| D | **−5.1** (0.233) | −1.0 | **−5.1** | −0.3 / −0.2 | ≥ −0.1 |

Per frame (right foot) A / D: t 0.217 −4.3 / −3.4, 0.233 −6.1 / −5.1, 0.250 −1.7 / −1.0; every frame up to t 0.1 and
from t 0.317 on equal. The GLB's longer foot goes a little deeper than the game's own boot (A −5.4, D −4.6 there).

Strike: lowest foot point at t 0.133 within 0.7 cm of A's; at t 0.167 1.8 cm lower and 1.3 cm further forward (and
2.7 cm nearer the middle: the lowest point moves to another part of the foot). Kick → idle switch: the foot's lowest
point jumps 40.6 cm in one frame in both A and D (the end of the kick snapping back to idle, as on the game's rig).

## Looking at the pictures

`out/sheet_*`, `out/zoom_*_side0_strike.png`, `out/kick_A_vs_D_side*.gif`.

* The kick reads the same on the GLB as on the game rig: back-swing, the leg coming through, follow-through.
* A and D look the same except around t 0.2-0.25, where D's toe dips into the grass less.
* No frame where D's foot or ankle looks bent more than A's.
* Seen in both, not caused by D: at the gameplay strike (t ≈ 0.15) the foot is still behind the body, and it passes the
  ball's place about 0.1 s later, flat and beside the ball; the end of the kick snaps back to the idle pose.

On the GLB, D keeps A's wind-up and cuts the swing-bottom depth by 1 cm, with no visible downside.
