# Ground Legends tests

Headless browser tests for `ground-legends/index.html`. They are not needed to play the game.
Every test opens the game page in Chromium (Playwright), drives it through `window.__game` and real key
events, and prints what happened.

## Layout

| Path | What it is |
|---|---|
| `anim_baseline.js` | Animation baseline: joint values of every animation state and skill move, compared exactly. |
| `anim_baseline.json` | The recorded baseline (digests only), taken from commit `04d0cd0`. Changes since `a73268a`, each re-recorded on purpose: the left-foot kick (side −1, `d1f5d54`) and the stagger state (`A.stagger`, 21st state). |
| `legacy/` | The earlier tests, copied from the working session that wrote them. |
| `legacy/paths.js` | Where the legacy tests find Playwright, three.js, the game page, the mock room and the output folder. |
| `legacy/harness.js` | Opens the game page for a test (shared by most legacy tests). |
| `legacy/mockroom.js` | In-page stand-in for the room capability, used by the online friendly tests (`t51*`). |
| `legacy/_orig/` | The five legacy files as they were before their paths were made portable (kept for reference). |
| `legacy/out/` | Screenshots and logs written by test runs (ignored by git). |
| `package.json` | Versions of the two test dependencies, for `npm install`. |

### What is in `legacy/`

* `t1.js` … `t200.js` (100 files): the numbered tests. Most print results and do not assert. The exit
  code shows only that the run finished without an exception; read the printed output to judge it.
* `tdef.js`, `thd.js`, `tob.js`, `tpk.js`, `tpk2.js`, `troom.js`: measurement scripts (AI-vs-AI statistics).
  They run for many minutes (`MIN` sets the game minutes). `tpk.js` and `tpk2.js` need a page that exposes
  `__game.lastPass`, which `index.html` does not have; they were run against a patched copy.
* `tutorial.js`: not a test. It is the tutorial source as it was before it went into `index.html`.

When copied in, only the path lines of `harness.js`, `t51.js`, `t51b.js`, `t51d.js` and `t103.js` were changed
from the session copies (compare with `legacy/_orig/`). Changed since, with git history: `t115.js` (checks its
result, see below), `t24.js` (starts a fresh match before its throw-in check: by then the half is over, and a
half that is over now ends at a throw-in before it is taken), and `t83.js` and `t200.js` (shots held a firm 250 ms:
past 90% of the gauge a shot now over-hits, which would hide what they measure).

## Requirements

* Node.js (written with v22).
* Playwright 1.56.1 with its Chromium. Software WebGL (SwiftShader) is used, so no GPU is needed.
* three.js r128 (`three@0.128.0`, file `build/three.min.js`). The game loads it from cdnjs, but the tests
  run offline: the harness answers the page's request for it with a local copy.
* Python 3 with Pillow, only for `t87.js` and `t111.js` (they join screenshots into one sheet).

`legacy/paths.js` and `anim_baseline.js` look for the tools in this order:

| Tool | Order |
|---|---|
| Playwright | `PLAYWRIGHT` env, `/opt/node22/lib/node_modules/playwright`, then `node_modules` next to the tests |
| three r128 | `THREE_JS` env, `ground-legends/tests/node_modules/three/build/three.min.js`, then the original session folder |
| game page | `GAME` env (harness tests only), else `ground-legends/index.html` |
| screenshots | `TEST_OUT` env, else `legacy/out` (`TEST_OUT/shots`) |

`t51.js`, `t51b.js` and `t51d.js` always play `ground-legends/index.html`: they ignore `GAME`, as they did
before. `t103.js` plays the built website copy `docs/index.html`.

## Setting up on another machine

```sh
cd ground-legends/tests
npm install                       # playwright 1.56.1 and three 0.128.0 into tests/node_modules
npx playwright install chromium   # the browser Playwright drives
```

Or point at copies you already have:

```sh
export THREE_JS=/path/to/three/build/three.min.js
export PLAYWRIGHT=/path/to/node_modules/playwright
```

## Running

From the repository root:

```sh
# animation baseline: working index.html against the committed one (git HEAD) and anim_baseline.json
node ground-legends/tests/anim_baseline.js compare
# record a new baseline from a commit (default HEAD)
BASE_REF=HEAD node ground-legends/tests/anim_baseline.js record
# compare another file instead of the working index.html
CANDIDATE=/path/to/other.html node ground-legends/tests/anim_baseline.js compare
```

`anim_baseline.js` exits 0 and prints `RESULT: PASS` when every value matches.

Legacy tests run from their folder (they load `./harness.js` and `./paths.js`):

```sh
cd ground-legends/tests/legacy
node t80.js                        # all skill moves
GAME=/path/to/other.html node t83.js   # a harness test against another build of the game
TEST_OUT=/tmp/gl-out node t115.js  # screenshots somewhere else
```

The regression set used while developing the game:

```sh
for t in t80 t83 t85 t21 t24 t130 t115 t112 t31 t102 t180 t192 t193 t200 t51 t20 t30 t104; do
  node $t.js > out/$t.log 2>&1; echo "$t exit $?"
done
```

Run at most two or three at a time. Under heavy load, page loads and screenshots can hit Playwright's
30-second timeout.

## The mock room (online friendly tests)

`t51.js`, `t51b.js` and `t51d.js` play a host and a guest in two pages of one browser. On claude.ai the game
talks through the artifact's room capability (`window.claude.use('room')`). These tests inject
`mockroom.js` into both pages instead. It provides the same calls (`join`, `presence`, `emit`, `on`, `peers`,
`onPeers`, `leave`). Each page hands its messages to Node (`__relaySend`), and Node passes them to the other
page (`__relayRecv`). No server or network is involved.

## Known issues

### `t104.js`: cups flow, fails (existed before the animation work)

* The run stops at `page.click('#btnRematch')` with a 30-second timeout, because the button is not visible.
* It fails in the same place on commit `a73268a`, so it existed before the animation refactor.
* The cause has not been investigated.
* It happens after a forced knockout result and the result screen. Possibly the shoot-out or result flow no
  longer shows that button where the test expects it. This is unconfirmed.

### `t115.js`: tutorial, asserts its result

* Unlike most legacy tests, `t115.js` checks its own result. It prints `T115 PASS`, or `T115 FAIL: ...` on
  stderr with exit code 1, when a step fails, the done screen does not show, or the page throws.
* Key holds are set exactly (`downAt` before the release), not left to `await wait(ms)`. The game measures a
  hold by the wall clock, and on a busy machine a 250 ms wait could pass 0.3 s, which is a full-power shot.
* In the shooting steps (5 to 7b) it presses 다시 하기 when the ball is loose, as a player would. A shot off
  the bar or a keeper's parry leaves the ball loose, and the step does not reset itself then. Before this,
  one such shot failed every later step.
* In the defending steps 10 (shield) and 12 (standing tackle) every try starts from the step's setup. Before a
  try, if the state is not the one the step started in, it presses 다시 하기 and checks what that restored:
  same step, ball owned, everyone where the step started, and exactly the same as the first restore. If not,
  the step fails with `다시 하기 did not restore ...` instead of trying on. Each try is printed as a
  `defence try` line: step number (as the tutorial box shows it), start state, input, result, end state.
* `SEED=<positive integer> node t115.js` replays a run: the game loop stops as soon as the page is up and
  `Math.random` in the page draws from a fixed sequence. Two runs with the same seed print the same output,
  also with other tests running. Without `SEED` the test runs with the browser's own random numbers.
* Still open: the standing tackle wins the ball cleanly only about one try in three (9 of 26 tries over 10
  runs). With 8 fresh tries a run can still lose all of them: 1 of 10 runs did, and `SEED=10` does every
  time. This is the game's tackle chance, not a broken reset.

### `t31.js`: club management, intermittent

* It once stopped at `page.click('[data-trait=acrobatic]')` (30-second timeout). Six later runs, three on the
  old build and three on the new, all passed. One more run from `legacy/` also passed.
* Possible cause, unconfirmed:
  * The test picks the last player in the squad list. That is the lowest-rated one and can be a goalkeeper.
  * Goalkeepers are offered only keeper traits, so the acrobatic option is not in the list.
  * This matches `traitOk()` in `index.html`.

### `t51.js`: online friendly, intermittent

* In one run from `legacy/`, the guest's power shot did not show up as a host shot (`host shots 0 -> 0`).
* Four later runs passed: two from `legacy/` and two from the session folder.
* The guest page renders slowly under SwiftShader with two pages open. Timing-dependent steps can miss.
* Earlier comparisons of `t51.js` with `GAME=` set were not comparisons: this test ignores `GAME`.

### `t103.js`, `t51b.js`, `t87.js`: fail in the session folder too (existed before the copy)

* `t103.js` waits for `#btnPlay` to be visible on the website copy `docs/index.html`, and times out.
* `t51b.js` waits for `#btnOnline`, and times out.
  * Both were written for the earlier title screen. The lobby that replaced it keeps these buttons in a
    different place.
  * This is a likely cause, but nobody has checked how these two tests reach them.
* `t87.js` fails in its Pillow step (`cannot write empty image`) while joining skill screenshots into one
  sheet. Its other steps did not raise an error.
* In each case, the copy in `legacy/` failed at the same point as the original in the session folder.

### Load

Running three legacy tests at once, `t84.js` once hit Playwright's 30-second `page.goto` timeout. Run on its
own, it passed twice, and its output matched the original run. Keep parallel runs to two or three.

### Results that vary between runs

Many legacy tests hold keys for real milliseconds (`await wait(350)` and similar) while the game is driven
by `__game.sim()`. Shot power, heights and speeds therefore vary from run to run. For example, the first
shot in `t83.js` measured 1.59 m and 24 m/s in one run and 2.22 m and 30.5 m/s in the next, both from
`legacy/`. Compare such output for its pattern, not its digits. `anim_baseline.js` is exact and does not
have this problem.

### Screenshots in the current folder

Eleven legacy tests save some screenshots to a bare file name, such as `lobby1.png`, in the folder they are
run from. They do not use `TEST_OUT` for these. The tests are `t131`, `t141`, `t160`, `t173`, `t180`,
`t181`, `t182`, `t190`, `t191`, `t192` and `t193`. `.gitignore` ignores `legacy/*.png` so these files are not
committed by accident.
