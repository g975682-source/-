# Kick toe scaled by the leg's swing: experiment record

Follows `../KICK_GROUND_PENETRATION_REVIEW.md` (candidate A). Not committed.

## Change (`ground-legends/index.html`, `rigLife`)

```js
// before
...+swing*0.45+(kick&&w===(side<0?0:1)?0.5:0);
// after
...+swing*0.45+(kick&&w===(side<0?0:1)?0.5*(aid===A.kick?swing:1):0);
```

* `swing = clamp((knee x - 0.45)/0.6, 0, 1)` is the existing per-leg value in the same loop, taken from the authored
  knee before easing. No new state, nothing synced or replayed changes.
* `A.volley` keeps the flat 0.5. Its kicking knee is fixed at 0.15, so `swing` is 0 there and scaling would take the
  pointed toe away from a foot that is in the air (no penetration there).
* In the kick, the toe term is 0 while the kicking knee is below 0.45 rad, rises to 0.5 over the back-swing
  (t ≈ 0.047 … 0.109 s), stays 0.5 until the forward swing straightens the knee below 1.05 (t ≈ 0.16), and is 0 again
  from t ≈ 0.22. At the strike frame (t 0.167) it is ≈ 0.43. In the follow-through the base formula already reaches
  the 1.0 clamp, so the toe still ends pointed.

## Files

| File | What |
|---|---|
| `backup/index.before_toe_swing.html` | `index.html` before this change (SHA-256 `32fb0378…`, with the left-kick fix) |
| `backup/measure_before.json` | copy of `../out/kick_ground/measure.json` before this stage |
| `backup/hashes_before.txt` | hashes before the change |
| `run_measure.js` | runs `../measure_kick_ground.js` unchanged on a given copy, writing elsewhere |
| `measure_contact_end.js` | foot at the strike, frame-to-frame steps, kick → idle switch; each build drawn twice |
| `out/measure_before.json`, `out/measure_after.json`, `out/measure_after_run2.json` (+ `.log`) | ground measurement |
| `out/contact_end.json`, `out/contact_end.log` | strike and end measurement |

## Results (cm, kicking foot lowest point; ground y = 0)

| Body | 60 fps before → after | wind-up (t ≤ 0.05) | raw pose before → after | plant foot |
|---|---|---|---|---|
| Base Striker | −10.6 → **−7.5** (t 0.233) | −10.1 → −2.9 | −10.7 → −5.0 | −2.4 → −2.4 |
| Tall Stopper | −11.3 → −8.0 | −10.6 → −3.0 | −11.2 → −5.3 | −2.5 → −2.5 |
| Quick Winger | −9.5 → −6.7 | −9.0 → −2.5 | −9.5 → −4.5 | −2.1 → −2.1 |
| Base Keeper | −11.1 → −7.8 | −10.5 → −3.0 | −11.1 → −5.2 | −2.5 → −2.5 |

Left and right equal in every row. The worst frame stays t = 0.233 (swing bottom) at 60 fps; in the raw pose it moves
from the wind-up (t −0.083) to the swing bottom (t 0.200). At 60 fps the swing bottom keeps more depth than the raw pose
(−7.5 against −5.0) because rigLife's easing lets the ankle follow the toe term's drop late.

Strike (Base Striker, side 0): kicking ankle x 0.685 → 0.579 (t 0.133) and 0.707 → 0.617 (t 0.167); toe tip moves
≤ 2 cm (y 0.573 → 0.555, z −0.895 → −0.887). Ball contact itself is game logic and does not read the rig.

Kick → idle switch: toe step 0.399 → 0.399 m, ankle step −0.377 → −0.375 rad, hips +1.1 cm, the same before and after.
Inside the kick the largest ankle step grew from 0.221 to 0.310 rad per frame (t 0.117, back-swing, foot in the air).

Repeat: both builds drawn twice by `measure_contact_end.js`, identical; `measure_kick_ground.js` on the change twice,
identical; the before run equals the earlier `../out/kick_ground/measure.json`.

## Tests

* `anim_baseline.js compare`: FAIL, 6 records `C|kick|{0,3}|{10,25,44}`, all at index 55 (`ankleR.x`), the intended change.
* `anim_kick_sides.js`: S1, S2 pass; T 384 of 2160 different (it expects the flat +0.5); records 1464 different. FAIL.
* `anim_kick_toe_swing.js` (new): PASS twice; on the build before the change its T fails (384).
* `legacy/t80.js`: 100 skill runs `ok:true`, 0 `ok:false`, no page errors.
