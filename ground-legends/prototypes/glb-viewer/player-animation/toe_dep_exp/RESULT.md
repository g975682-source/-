# The toe term's dependence on the knee: analysis and comparison (experiment copies only)

Starts from `index.html` as it is (SHA-256 `48b9affc…`: toe-swing change, `hipY=0.94`, candidate C not adopted).
`index.html` is not changed by this work.

## 1. The formula (`rigLife`, `index.html:1250-1253`, per leg, before rigLife's easing)

```
s   = clamp((κ − 0.45)/0.6, 0, 1)          κ = the leg's authored knee x   (swing)
g   = −0.9·(τ + θ + κ)                      τ = pelvis x (0 in the kick), θ = authored thigh x
an  = clamp((1 − s)·g + 0.45·s + toe, −0.75, 1.0)
toe = 0.5·s   in A.kick on the kicking leg  (0.5 in A.volley, 0 on the other leg)
```

`s` does two jobs: it blends from keeping the sole level (`g`) to a fixed 0.45 rad toe-down, and it scales the toe
term. Both read the knee. Inside the 0 < s < 1 band (knee 0.45 … 1.05 rad):

```
∂an/∂κ = −0.9·(1 − s)        (sole-level term)
       + (0.45 − g)/0.6       (the blend moving toward 0.45)
       + 0.5/0.6 = 0.83       (the toe term)
```

| t (raw) | thigh θ | knee κ | s | g | toe A | ∂an/∂κ A | without the toe part |
|---|---|---|---|---|---|---|---|
| 0.033 (wind-up) | 0.226 | 0.321 | 0 | −0.493 | 0 | −0.90 | −0.90 |
| 0.100 | 0.679 | 0.964 | 0.857 | −1.479 | 0.429 | 3.92 | 3.09 |
| 0.133 (back-swing top) | 0.905 | 1.286 | 1 | −1.971 | 0.500 | 0 (s = 1) | 0 |
| **0.167 (first frame after the strike)** | 0.340 | 0.976 | 0.876 | −1.184 | 0.438 | **3.45** | 2.61 |
| **0.200 (raw swing bottom)** | −0.249 | 0.615 | 0.274 | −0.329 | 0.137 | **1.48** | 0.65 |
| 0.233 (60 fps deepest frame) | −0.670 | 0.356 | 0 | 0.283 | 0 | −0.90 | −0.90 |

The `an` these give equals the measured raw ankle at every row (`out/formula_table.txt`). At the swing bottom one
extra 0.1 rad of knee turns the toe down a further 0.148 rad, 0.083 of it through the toe term. That is why every
knee curve in `../knee_c_exp/` went deeper.

Existing values in `rigLife` that could stand for the swing apart from the knee: only the joint rotations (thigh θ,
knee κ, pelvis τ) and the arguments `aid, t, ph, spd, side`. `poseValues` computes the kick's own progress (`k`, `q`,
`e`) but keeps it local; nothing of it reaches the rig. So: the thigh (B) or a value worked out from `t` (C).

## 2. The three ways (one expression each, in `variants/`)

| | toe in A.kick (kicking leg) |
|---|---|
| A (as it is) | `0.5*swing` |
| B thigh | `0.5*clamp(L.rotation.x/0.95,0,1)`: the thigh's back-swing (0 … 0.95 rad) |
| C kick phase | `0.5*w(k)`, `k = clamp(t/0.4,0,1)`, `w = k/0.35` in the back-swing, then `1 − (k − 0.35)/0.15` down to 0 at t 0.2 |

C uses only `t` (`visT`, already synced and replayed); nothing new is stored, synced or recorded. B and C are the same
in the back-swing (θ = 0.95·q there) and differ only in the release: B lets go when the thigh passes vertical (t ≈
0.185), C by t 0.2. Toe term at the strike frame t 0.167: A 0.438, B 0.179, C 0.278; at t 0.2: A 0.137, B 0, C 0.

## 3. Results (same conditions; `../measure_kick_ground.js` unchanged through `../toe_swing_exp/run_measure.js`)

Kicking foot lowest point, cm (BS / TS / QW / BK):

| | 60 fps (t) | raw pose (t) | raw swing bottom alone (BS, t 0.2) | wind-up t ≤ 0.05, 60 fps (BS) | plant 60 fps min/max |
|---|---|---|---|---|---|
| A | −5.4 / −5.9 / −4.9 / −5.7 (0.233) | −2.9 / −3.3 / −2.6 / −3.0 (0.200) | −2.9 | −1.0 | −0.4 / −0.3 |
| B | −4.6 / −5.0 / −4.2 / −4.8 (0.233) | −1.1 / −1.2 / −0.9 / −1.1 | −0.9 | −1.3 | −0.4 / −0.3 |
| C | −4.8 / −5.3 / −4.4 / −5.1 (0.233) | −1.1 / −1.2 / −0.9 / −1.1 | −0.9 | −1.3 | −0.4 / −0.3 |

With B and C the raw lowest point is no longer the swing bottom: it is the wind-up frame before the kick (t −0.083,
−1.1 cm, the same as A's wind-up), except TS where the bottom (−1.2) and the wind-up are equal.

Strike (BS, side 0): kicking ankle at 60 fps t 0.133: 0.579 → 0.556 (B, C); t 0.167: 0.617 → 0.511 (B), 0.546 (C);
raw t 0.167: 0.686 → 0.427 (B), 0.526 (C). Toe tip at t 0.167 lower by 1.6 cm (B) and 1.1 cm (C), 0.8 / 1.2 cm
further forward; at t 0.133 0.4 cm lower.

End of the kick: kick → idle toe step 0.405 m, ankle −0.375 rad, hips 0.36 cm, the same in A, B and C (≤ 0.1 mm).
Largest in-kick steps unchanged.

Left = right: raw pose exactly equal in A, B and C; 60 fps |left − right| unchanged (0.0 … 0.4 cm, the idle sway).
Repeat: A measured twice, identical, and equal to `../hip_b_exp/out/measure_final_run1.json` (the same file);
`measure_contact_end.js` drew every build twice, identical. Page errors 0.

## 4. What is left at 60 fps

60 fps, BS, kicking foot low (cm) / ankle x:

| t | 0.183 | 0.200 | 0.217 | 0.233 | 0.250 |
|---|---|---|---|---|---|
| A 60 fps | 25.1 / 0.47 | 7.1 / 0.31 | −3.3 / 0.22 | −5.4 / 0.24 | −1.5 / 0.34 |
| B 60 fps | 24.3 / 0.31 | 7.0 / 0.16 | −2.5 / 0.11 | −4.6 / 0.17 | −0.9 / 0.29 |
| raw (all three) | 1.0 … 2.5 | −2.9 / −0.9 | 3.3 … 3.6 | **10.4** | 19.7 |

At t 0.233 the raw pose has the foot 10.4 cm above the grass and the toe term is 0 in all three ways, yet the drawn foot
is 4.6 … 5.4 cm under it. The remaining 60 fps depth comes from rigLife's easing (every joint follows its target at
k = 1 − e^(−26/60) ≈ 0.35 per frame): the drawn leg reaches the bottom about two frames late. This is an inference
from these numbers, not a separate test.

## 5. Comparison

| | A as it is | B thigh | C kick phase |
|---|---|---|---|
| swing bottom, raw | −2.9 cm | **−0.9 cm** | **−0.9 cm** |
| deepest, 60 fps | −5.4 cm | **−4.6 cm** | −4.8 cm |
| wind-up, 60 fps | **−1.0 cm** | −1.3 cm | −1.3 cm |
| toe at the strike (60 fps ankle t 0.167) | **0.617** | 0.511 | 0.546 |
| knee dependence of the toe | yes | no | no |
| what it reads | knee (authored) | the kicking thigh (authored), per leg | `t`, plus the kick's timing constants 0.4 / 0.35 / 0.15 copied from `poseValues` |
| follows a change to the kick curves | yes | yes | no: the constants must be kept in step by hand |
| left/right, end of kick, plant foot | same | same | same |
| state, sync, replay | none | none | none |

## 6. Recommendation for the next real change: B

* The largest gain in both clocks (raw −2.9 → −0.9, 60 fps −5.4 → −4.6), and it removes the toe term's knee
  dependence, the cause found in `../knee_c_exp/`.
* It reads a value already there for each leg (the authored thigh), so it is symmetric by construction and needs no
  copied timing constants as C does.
* Costs: the toe at the strike is less pointed (60 fps ankle 0.617 → 0.511 rad), and the wind-up is 0.3 cm deeper at
  60 fps (the toe starts to rise with the thigh, before the knee bends).
* Not measured, a possible refinement for that review: `toe = 0.5·min(s, θ/0.95)` would keep A's wind-up (the knee
  term is 0 there) and B's release.
* B leaves most of the 60 fps depth in place (§4). The next lever after it is the easing of the kicking leg, which no
  candidate so far has touched.
