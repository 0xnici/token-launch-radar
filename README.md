# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

**Fitted on the 92 that launched. Honest about the 198 that haven't.**

198 protocols with no token, priced by **one fitted size curve** learned from
92 launched peers — and published with its own measured error: median blind
miss ×3.82, ranking validated at Spearman IC 0.32. The curve itself is the
survivor of a pre-registered two-origin hindcast gate: six challengers were
fitted against it this round and none cleared the bar (the gate, below).
Entry for the make.fun
bounty ["Build the best token launch radar"](https://make.fun/bounty/token-radar-01) (token-radar-01).

## The model (radar-5)

```
implied = round( 10 ^ (4.5869 + 0.3135 x log10(TVL)) )
```

One **median (least-absolute-deviations) fit** on the snapshot's clean traded
comps (tokenized protocols that pass the board's own hygiene) — the typical
launch, not the average one, so a handful of extreme multiples cannot drag
the curve. Nothing else moves a row's ranked value — and that is a measured
result, not a preference:

- Fourteen candidate pricers were graded **leave-one-out** over the 92 comps
  (price each as if pre-token, from the other 91). radar-2's category
  multiple scored a median miss of ×4.91; the least-squares curve ×3.27;
  the median curve ×3.82; a hybrid of per-category curves ×3.35; this
  round's Huber fit ×3.49 and the two-curve ensemble ×3.51.
- Every keep-or-drop call is made **out-of-time**, under a pre-registered
  gate: a challenger ships only if it beats the incumbent's **two-origin
  hindcast** mean (fit the oldest 35 dated comps, grade the next 12; fit
  the oldest 47, grade the newest 23) by 5% or more — 10% for an ensemble —
  losing neither origin by over 10%, with a stable coefficient sign where
  it fits one. radar-4's hindcast chose the estimator itself: the median
  fit won the newest era outright (×2.07 against the least-squares ×2.56).
  This round six challengers faced the gate — a Huber robust fit, an
  OLS+LAD ensemble, fitted growth/maturity/breadth terms, and the category
  factor at two shrinkages — and none cleared it. The fitted growth term
  came closest: it beat the incumbent at both origins by under 1.2%, a tie
  inside the margin, and its full-pool coefficient flips sign against both
  era fits — so the growth question is closed, published as a negative
  result in [`docs/method.md`](docs/method.md). The incumbent's two-origin
  mean is ×2.16.
- The audit page also grades every candidate's whole held-out distribution
  by a **proper log score** — a rule that cannot be gamed by widening a
  band. The hybrid scores −1.2494; the shipped model scores −1.2510 —
  second of fourteen.
- Every row carries a **split-conformal band** (central 50%) built from the
  shipped model's held-out residuals, conditioned on TVL tercile. Achieved
  coverage: 51.1% at 50% nominal (47 of 92 launched peers inside), 81.5% at
  80%, 92.4% at 90%.
- The board ranks **all 198** strictly pre-token protocols that pass the
  hygiene; the 144 it turns away are published in an exclusion audit with
  reasons — 42 CEX products, 38 liquid-staking, 43 bridge variants, 16
  versioned or wrapped variants, 5 restaking (the largest is an exchange's
  own product line at $13.8B TVL).
- Each farm plan is graded, in this board's own words — **PAYS** (nets
  positive at the band's bear end), **CLOSE** (only at base), **SHORT** (at
  neither) — for a $1,000 reference position under a labelled 10%
  community-allocation scenario, with the farmer's hurdle in basis points
  beside it. On this snapshot: PAYS 0, CLOSE 119, SHORT 79. The nearest row
  misses PAYS by $2.37; the hurdle column shows the distance honestly.

Full methodology, the candidate table, and the failure modes:
[`docs/method.md`](docs/method.md).

## Outputs

Running the program writes, into the output directory:

- `board.json` — the ranked board (198 rows), each row with an implied
  value, its conformal band, a graded farm plan, and mechanical flags.
- `dossier.json` — the competition dossier, produced through
  `vendor/makefun-board.ts` (unmodified).
- `data.js` — the dashboard's whole dataset as one script.

The static dashboard in `dashboard/` renders a front page (top 10,
calibration scatter, the backtest that chose the model), the full board with
filters and verdict sorts (filters are linkable — `?verdict=CLOSE#/board`
is a view, not a session), a per-protocol detail view that fits the whole
dossier on one screen (waterfall, factor tiles, sensitivity tornado, the
conformal band in natural frequencies, the farmer's hurdle, the six-step
farm plan — and a page recompute that agrees with `board.json` to the
dollar), a category wall of small multiples on identical axes, the
exclusion audit and model card, and the live-token evidence base. It makes
no network requests.

## Run it

Requires Node.js 22.18 or later.

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

The program is deterministic: two runs over the same snapshot write
byte-identical `board.json`, `data.js` and `dossier.json`.

## Layout

- `main.ts` — entry point.
- `lib/model.ts` — the radar-5 model: comp hygiene, the candidate backtest,
  the two-origin hindcast gate, conformal bands, verdicts, farm plans, the exclusion audit.
- `vendor/makefun-board.ts` — the kit's dossier writer, unmodified.
- `dashboard/` — the static dashboard (`index.html`, `app.css`, `app.js`).
- `screenshots/` — the board, a protocol detail view, the board
  filtered to CLOSE verdicts.
- `docs/method.md` — the full method, with the real backtest numbers.

## License

MIT — see `LICENSE`.
