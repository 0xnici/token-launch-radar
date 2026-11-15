# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

198 protocols with no token, priced by **one fitted size curve** learned from
92 launched peers — and published with its own measured error: median blind
miss ×3.27, ranking validated at Spearman IC 0.28. Entry for the make.fun
bounty ["Build the best token launch radar"](https://make.fun/bounty/token-radar-01) (token-radar-01).

## The model (radar-3)

```
implied = round( 10 ^ (3.9578 + 0.394 x log10(TVL)) )
```

One OLS fit on the snapshot's clean traded comps (tokenized protocols that
pass the board's own hygiene). Nothing else moves a price — and that is a
measured result, not a preference:

- Six candidate pricers were graded **leave-one-out** over the 92 comps
  (price each as if pre-token, from the other 91). radar-2's category
  multiple scored a median miss of ×4.91; the plain curve ×3.27; the curve
  with radar-2's growth/maturity adjustments ×3.05.
- The keep-or-drop call on those adjustments was made **out-of-time**: a
  rolling-origin hindcast (fit the oldest 47 dated comps, grade the newest
  23) scored the plain curve ×2.56 against the adjusted twin ×2.85 — so the
  adjustments do not ship. Category factors lost in every form tried.
- Every row carries a **split-conformal band** (central 50%) built from the
  shipped model's held-out residuals, conditioned on TVL tercile. Achieved
  coverage: 51.1% at 50% nominal, 81.5% at 80%, 92.4% at 90%.
- The board ranks **all 198** strictly pre-token protocols that pass the
  hygiene; the 144 it turns away are published in an exclusion audit with
  reasons (the largest is an exchange's own product line at $13.8B TVL).
- Each farm plan is graded, in this board's own words — **PAYS** (nets
  positive at the band's bear end), **CLOSE** (only at base), **SHORT** (at
  neither) — for a $1,000 reference position under a labelled 10%
  community-allocation scenario, with the farmer's hurdle in basis points
  beside it. On this snapshot: PAYS 0, CLOSE 116, SHORT 82. The nearest row
  misses PAYS by $2.43; the hurdle column shows the distance honestly.

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
filters and verdict sorts, a per-protocol detail view (waterfall, factor
tiles, sensitivity, a live stress slider — and a page recompute that agrees
with `board.json` to the dollar), a category wall of small multiples on
identical axes, the exclusion audit and model card, and the live-token
evidence base. It makes no network requests.

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
- `lib/model.ts` — the radar-3 model: comp hygiene, the candidate backtest,
  the hindcast, conformal bands, verdicts, farm plans, the exclusion audit.
- `vendor/makefun-board.ts` — the kit's dossier writer, unmodified.
- `dashboard/` — the static dashboard (`index.html`, `app.css`, `app.js`).
- `screenshots/` — the front page, a protocol detail view, the category wall.
- `docs/method.md` — the full method, with the real backtest numbers.

## License

MIT — see `LICENSE`.
