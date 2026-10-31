# Toe term, last comparison before a real change: A, B, D (experiment copies only)

From `index.html` as it is (SHA-256 `48b9affc…`). `index.html` not changed. C from `../toe_dep_exp/` is reference only.

| | toe in A.kick, kicking leg (`rigLife`, `index.html:1253`) |
|---|---|
| A as it is | `0.5*swing` |
| B thigh | `0.5*clamp(L.rotation.x/0.95,0,1)` (the same copy as `../toe_dep_exp/variants/index.B_thigh.html`) |
| D min | `0.5*Math.min(swing,clamp(L.rotation.x/0.95,0,1))` |

Same conditions for all three: `../measure_kick_ground.js` unchanged through `../toe_swing_exp/run_measure.js`, each
copy measured twice; `../toe_swing_exp/measure_contact_end.js` for A against B and A against D.

## Results

Kicking foot lowest point, cm (BS / TS / QW / BK):

| | wind-up t ≤ 0.05, 60 fps | wind-up, raw | back-swing lowest, 60 fps (BS) | swing bottom 60 fps (t 0.233) | swing bottom raw (t 0.200) |
|---|---|---|---|---|---|
| A | **−1.0 / −1.0 / −0.9 / −1.1** | −1.1 / −1.1 / −0.9 / −1.1 | 5.5 | −5.4 / −5.9 / −4.9 / −5.7 | −2.9 / −3.3 / −2.6 / −3.0 |
| B | −1.3 / −1.4 / −1.1 / −1.4 | −1.1 / −1.1 / −0.9 / −1.1 | 4.3 | **−4.6 / −5.0 / −4.2 / −4.8** | **−0.9 / −1.2 / −0.9 / −1.0** |
| D | **−1.0 / −1.0 / −0.9 / −1.1** | −1.1 / −1.1 / −0.9 / −1.1 | 5.5 | **−4.6 / −5.0 / −4.1 / −4.8** | **−0.9 / −1.2 / −0.9 / −1.0** |

The kicking ankle in D equals A's frame for frame up to t 0.083 (60 fps and raw), and equals B's in the raw pose from
t 0.1 on.

Strike (BS side 0; the other bodies within 0.2 cm of these):

| | 60 fps ankle x t 0.133 / 0.167 | raw ankle x t 0.167 | toe tip vs A at t 0.133 (Δy / Δz) | at t 0.167 |
|---|---|---|---|---|
| A | 0.579 / 0.617 | 0.686 | — | — |
| B | 0.556 / 0.511 | 0.427 | −0.4 / +0.2 cm | −1.6 / +1.2 cm |
| D | 0.541 / 0.501 | 0.427 | −0.6 / +0.4 cm | −1.7 / +1.3 cm |

Plant foot (60 fps min/max, BS): −0.4 / −0.3 cm in A, B and D. End of the kick: toe step 0.405 m, ankle −0.375 rad,
hips 0.36 cm in all three (≤ 0.1 mm apart); largest in-kick ankle step 0.375 rad in all three. Left = right: raw pose
exactly equal in A, B and D; 60 fps |left − right| 0.0 … 0.4 cm in all three (idle sway, as before). Each copy measured
twice: identical. A and B equal the earlier `../toe_dep_exp/` results. Page errors 0.

## Judgement

* D keeps A's wind-up (identical frames) and gets B's swing bottom (identical in the raw pose, within 0.1 cm at 60 fps).
* At the strike D is as far from A as B is: ankle 0.617 → 0.501 (B 0.511), toe tip 1.7 cm lower and 1.3 cm further
  forward (B 1.6 / 1.2). Against B, D differs by 0.01 rad and 0.1 … 0.2 cm at the strike frame.
* No regression found: plant foot, end of the kick, symmetry and repeatability are the same as A's.

Recommended for the real change: **D**. It is the only one of the three that is not worse than A in the wind-up and
not worse than B at the swing bottom. It costs the same at the strike as B. If that strike change (≈ 0.1 rad less
toe point, ≤ 2 cm) counts as a worse contact pose, none of B and D qualifies and A stays.
