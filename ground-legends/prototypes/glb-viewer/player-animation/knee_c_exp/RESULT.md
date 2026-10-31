# Candidate C: keeping the kicking knee bent to the swing bottom, experiment record

Starts from the toe-swing change and `hipY=0.94` (`index.html` SHA-256 `48b9affc…`, kept in `backup/`). Result:
**not adopted**, nothing applied to `index.html`.

## What was varied (`poseValues`, `case A.kick`, forward swing only; one value per copy in `variants/`)

```js
// as it is: the knee straightens on the same cubic ease as the thigh
const q=(k-0.35)/0.65,e=1-Math.pow(1-q,3);rT=0.95-2.2*e;rK=1.35*(1-e);
// n: rK=1.35*Math.pow(1-q,n)                                 n 2.5, 2.0, 1.5 (as it is: 3)
// d: rK=1.35*Math.pow(1-clamp((q-d)/(1-d),0,1),3)            d 0.05, 0.10 (as it is: 0)
```

The thigh, the back-swing, the plant leg, `hipY`, the ankle and toe formulas in `rigLife`, arms, trunk and pelvis
are as they were. The knee is 0 at t 0.4 in every copy, so the end of the kick is the same.

| knee (rad) at t | 0.167 (strike) | 0.200 | 0.233 |
|---|---|---|---|
| as it is | 0.975 | 0.614 | 0.358 |
| n 2.5 | 1.030 | 0.701 | 0.446 |
| n 2.0 | 1.087 | 0.799 | 0.557 |
| n 1.5 | 1.147 | 0.911 | 0.693 |
| d 0.05 | 1.138 | 0.717 | 0.417 |
| d 0.10 | 1.338 | 0.843 | 0.491 |


## Results (kicking foot lowest point, cm; ground y = 0; same conditions, `../measure_kick_ground.js` unchanged)

| copy | 60 fps BS / TS / QW / BK (t) | raw pose BS / TS / QW / BK (t) | plant 60 fps min/max (BS) |
|---|---|---|---|
| as it is | −5.4 / −5.9 / −4.9 / −5.7 (0.233) | −2.9 / −3.3 / −2.6 / −3.0 (0.200) | −0.4 / −0.3 |
| n 2.5 | −5.5 / −6.1 / −5.0 / −5.8 (0.233) | −4.1 / −4.6 / −3.7 / −4.3 (0.200) | −0.4 / −0.3 |
| n 2.0 | −5.4 / −6.0 / −5.0 / −5.7 (0.233) | −4.2 / −4.8 / −3.9 / −4.4 (0.200) | −0.4 / −0.3 |
| n 1.5 | −4.6 / −5.2 / −4.2 / −4.8 (0.250) | −3.9 / −4.5 / −3.6 / −4.1 (0.217) | −0.4 / −0.3 |
| d 0.05 | −5.8 / −6.4 / −5.3 / −6.1 (0.233) | −4.2 / −4.7 / −3.8 / −4.4 (0.200) | −0.4 / −0.3 |
| d 0.10 | −5.5 / −6.1 / −5.0 / −5.8 (0.233) | −3.7 / −4.3 / −3.4 / −3.9 (0.200) | −0.4 / −0.3 |

Plant foot, hips and the idle after the kick are the same in every copy. Raw pose left = right exactly in every copy;
the 60 fps |left − right| unchanged (0.0 … 0.4 cm, the idle sway before the kick).

Strike (Base Striker, side 0): at t 0.133 nothing changes (still the back-swing). At t 0.167 the toe tip rises
+2.2 (n 2.5), +3.9 (n 2.0), +5.2 (n 1.5), +5.0 (d 0.05), +9.3 cm (d 0.10), and the kicking ankle goes 0.617 → 0.684
(n 2.5) or 0.710 (the others, the 1.0 clamp side of the formula).

End of the kick: kick → idle toe step 0.405 → 0.402 … 0.405 m, ankle −0.375 → −0.373 … −0.375 rad, hips 0.36 cm in
every copy; largest in-kick steps the same or smaller. Each build drawn twice: identical.

## Why it does not help

At the deepest raw frame (Base Striker):

| copy | ankle y | knee | ankle x | sole pitch | ankle → lowest point | lowest |
|---|---|---|---|---|---|---|
| as it is | 10.7 cm | 0.61 | 0.02 | −22° | 13.6 cm | −2.9 |
| n 2.5 | 12.2 | 0.70 | 0.16 | −35° | 16.3 | −4.1 |
| n 2.0 | 14.3 | 0.80 | 0.34 | −51° | 18.5 | −4.2 |
| n 1.5 (t 0.217) | 13.6 | 0.80 | 0.43 | −43° | 17.5 | −3.9 |
| d 0.10 | 15.3 | 0.84 | 0.44 | −59° | 19.0 | −3.7 |

A more bent knee lifts the ankle 1.5 … 4.6 cm, but `rigLife` reads the same knee: its swing factor
`clamp((knee − 0.45)/0.6)` rises, so the base ankle term (`swing*0.45`) and the toe term (`0.5*swing`) point the toe
further down. The sole (its front reaches 0.1725 m past the ankle) pitches 13 … 37° more and its front corner goes
deeper than the ankle rose. With the ankle and toe formulas fixed, as this experiment requires, holding the knee
bent makes the raw pose worse in every copy. Only n 1.5 is shallower at 60 fps (−5.4 → −4.6), while its raw pose is
deeper (−2.9 → −3.9) and its toe at the strike 5.2 cm higher, so it does not meet the adoption rules.

## Tests (on `index.html` as it is, unchanged by this experiment)

* `anim_baseline.js compare`: FAIL, `A|kick` 2496, `C|kick` 6 (the earlier toe-swing and `hipY` changes, as before).
* `anim_kick_sides.js`: S1, S2 pass; T 384; records 2160 different (as before).
* `anim_kick_toe_swing.js` (REF = before hip B): S1, S2, T pass; R 2160 elsewhere (hips height); records 2160 (as before).
* `legacy/t80.js`: 100 `ok:true`, 0 `ok:false`, no errors.

## Files

`backup/` (index.html and hashes before), `variants/` (5 copies), `summarise.js` (copy of `../hip_b_exp/summarise.js`
writing to this folder's `out/`), `out/` (measure_*.json/log per copy, contact_end_*.json/log, summary.txt/json).
