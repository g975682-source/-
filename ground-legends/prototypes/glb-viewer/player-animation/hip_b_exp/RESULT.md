# Candidate B: the kick's hip height, experiment record

Follows `../toe_swing_exp/RESULT.md` (the toe-swing change stays as it is). Only the kick pose's hip height changes.
Not committed.

## Change (`ground-legends/index.html:1793`, `poseValues`, `case A.kick`)

```js
// before
...toX=-0.06;hipY=0.92;
// after
...toX=-0.06;hipY=0.94;   // hips as low as the bent plant leg lets its sole touch
```

Idle stands at `hipY` 0.95. The plant leg (thigh −0.15, knee 0.3) shortens the leg by about 1 cm; at 0.92 the hips came
down about 3 cm, so the plant sole sank about 2.4 cm and the kicking leg's whole arc came down with it.

## Steps tried (each a copy in `variants/`, measured with `../measure_kick_ground.js` unchanged through `../toe_swing_exp/run_measure.js`)

| hipY | kicking foot 60 fps (BS / TS / QW / BK, cm) | raw pose | plant foot 60 fps min / max (BS) | plant raw (BS) |
|---|---|---|---|---|
| 0.92 (before) | −7.5 / −8.0 / −6.7 / −7.8 | −5.0 / −5.3 / −4.5 / −5.2 | −2.4 / −1.0 | −2.4 |
| 0.925 | −7.0 / −7.5 / −6.3 / −7.3 | −4.5 / −4.8 / −4.0 / −4.7 | −1.9 / −0.8 | −1.9 |
| 0.93 | −6.5 / −6.9 / −5.8 / −6.8 | −3.9 / −4.3 / −3.6 / −4.1 | −1.4 / −0.6 | −1.4 |
| 0.935 | −5.9 / −6.4 / −5.3 / −6.2 | −3.4 / −3.8 / −3.1 / −3.6 | −0.9 / −0.4 | −0.9 |
| **0.94 (kept)** | **−5.4 / −5.9 / −4.9 / −5.7** | **−2.9 / −3.3 / −2.6 / −3.0** | **−0.4 / −0.3** | **−0.3** |
| 0.945 | −4.9 / −5.4 / −4.4 / −5.1 | −2.4 / −2.7 / −2.2 / −2.5 | −0.1 / +0.2 | +0.2 (sole off the ground) |

0.945 lifts the plant sole off the grass, so 0.94 is the highest step that keeps it on the ground. At 0.94 the plant sole
sits at −0.1 … −0.4 cm, the same as the standing rest pose (−0.3 … +0.15 cm).

## 0.94 against 0.92 (same conditions)

* Deepest frame stays t = 0.233 (60 fps) and t = 0.200 (raw), the swing bottom.
* Wind-up (t ≤ 0.05), kicking foot: −2.9 → −1.0 cm (BS), all bodies −0.9 … −1.1.
* Hips: idle → lowest in the kick 98.7 → 95.6 cm before, 98.7 → 97.7 cm after (BS).
* Strike (t 0.133 / 0.167): the foot is 2.1 cm higher (BS toe y 0.555 → 0.576, 0.447 → 0.467); x, z and the ankle
  angle unchanged.
* Body jump: hips step idle → kick −1.10 → −0.37 cm, kick → idle +1.10 → +0.36 cm; hips range over the 24 idle frames
  after the kick 2.0 → 0.7 cm. Toe step at the kick → idle switch 0.399 → 0.405 m; ankle step unchanged (−0.375 rad).
* Left = right: the raw pose exactly equal; at 60 fps the largest |left − right| is unchanged (0.0 … 0.4 cm, from the
  idle sway before the kick, the same before).
* Repeat: `measure_contact_end.js` draws each build twice, identical; the final `index.html` measured twice, identical,
  and equal to the 0.94 variant.

## What else changed

`check_only_hips.js` over every state (21 states × 4 bodies × sides −1/0/+1 × 2 speeds × 2 clocks × 45 frames,
2,630,880 values): 2160 values differ, all in `kick`, all at index 0 (hips height). No joint rotation changes, the
toe formula included.

## Tests

* `anim_baseline.js compare`: FAIL, `A|kick` 2496 and `C|kick` 6, first index 0, max |Δ| 0.0203 (= 0.02 × hipK).
* `anim_kick_sides.js`: S1, S2 pass; T 384 (the earlier toe rule, as before this experiment); records 2160 different.
* `anim_kick_toe_swing.js`: S1, S2, T pass; R reports 2160 "elsewhere" (index 0, hips height); records 2160 different.
* `legacy/t80.js`: 100 `ok:true`, 0 `ok:false`, no errors.

None of the stored records were re-recorded.
