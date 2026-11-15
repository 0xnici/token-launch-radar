# Method — how radar-3 prices a protocol that has no token yet

This note records how the model in `lib/model.ts` was chosen, what it
assumes, where it is known to be weak, and the checks the board had to pass.
Every number below is recomputed from the sealed snapshot at build time;
nothing is hand-typed into the model.

## The stance: reference-class forecasting

radar-3 prices the reference class, then publishes how the reference class
actually performed. The class is the snapshot's **clean comps**: tokenized
protocols that pass the same hygiene as the board (no bridge / CEX /
liquid-staking product categories, no versioned or wrapped variants, no
exchange product lines) — **92 protocols** on this snapshot. The price of a
pre-token protocol is the class's fitted size curve and nothing else:

```
implied = round( 10 ^ (a + b x log10(TVL)) ),   a = 3.9578, b = 0.394
```

The exponent deserves its context: b = 0.394 with a 95% confidence interval
of [0.155, 0.633] and R² = 0.104. That is far below a pure Metcalfe exponent
of 2 and inside the range network-value fits usually land in — and the low
R² is the honest headline: size explains about a tenth of the variance in
what launched tokens trade at. The rest is dispersion, and the band (below)
is where that dispersion is reported instead of hidden.

## How the model was chosen: two splits, two decisions

Six candidate pricers were fitted on the clean comps and graded
**leave-one-out**: price each comp as if it were pre-token, from the other
91, and compare with its recorded market cap.

| Candidate | Median \|log₁₀ error\| | Median miss | Within 2× | Within 3× |
| --- | --- | --- | --- | --- |
| A — radar-2 (category multiple × growth × maturity) | 0.6911 | ×4.91 | 22.8% | 37.0% |
| B — fitted size curve alone | 0.5146 | ×3.27 | 38.0% | 45.7% |
| C — B + category factor (shrunk, γ = 0.5) | 0.5705 | ×3.72 | 35.9% | 46.7% |
| D — C + growth term | 0.5532 | ×3.57 | 35.9% | 45.7% |
| E — B × growth × maturity | 0.4840 | ×3.05 | 33.7% | 47.8% |
| F — E, curve fitted to deflated caps | 0.5486 | ×3.54 | 38.0% | 46.7% |

Leave-one-out narrows the field — the curve family beats radar-2's multiple
outright, and the category factor loses in every form tried (raw, shrunk
toward 1 with k = 4 in James–Stein fashion, damped at γ = 0.5, clamped):
once size is fitted, category medians mostly re-state size, and their noise
costs more than their signal pays.

But leave-one-out is also the split the bands are calibrated on, so it does
not get the final word on model shape — that would be selection leakage.
The keep-or-drop decision on the adjustment terms was made **out-of-time**,
on a rolling-origin hindcast: fit on the oldest 47 dated comps, grade on
the newest 23.

| Hindcast (newest third) | Median miss | Within 2× |
| --- | --- | --- |
| B — plain curve | ×2.56 | 39.1% |
| E — curve × growth × maturity | ×2.85 | 26.1% |

The adjustments that helped in-window hurt out-of-time, so **candidate B
ships**: the plain curve, no growth term, no maturity term, no category
term. The shipped model's leave-one-out median miss is ×3.27 (drift to the
hindcast era: ×0.78 — the newest era graded slightly kinder than the
in-window average).

## The band: split-conformal, conditioned on size

Each row's bear/bull range is a **split-conformal interval** built from the
shipped model's leave-one-out residuals (actual / predicted over the 92
comps), with the finite-sample correction — the ⌈(n+1)q⌉/n quantile — so
coverage holds by construction under exchangeability of the comps.
Residuals are heteroskedastic in size, so the interval is computed per
**TVL tercile** of the comps (edges $11,075,107 and $52,470,276), with the
global interval as fallback for a thin bucket:

| TVL tercile | Bear factor | Bull factor |
| --- | --- | --- |
| Small (≤ $11.1M) | ×0.2766 | ×2.6228 |
| Middle | ×0.2991 | ×5.3070 |
| Large (> $52.5M) | ×0.3578 | ×4.2387 |
| Global (fallback) | ×0.3166 | ×4.2387 |

Achieved coverage on the comps, published next to nominal on the dashboard:
**51.1% at 50% nominal (47 of 92), 81.5% at 80%, 92.4% at 90%.** The
median residual is ×1.05 — the curve is close to unbiased in log space —
and in natural frequencies: about half of launched peers landed inside a
band this wide, which is exactly what a central 50% band promises.

## Rank validation

The product is a ranking, so the ranking is validated too: the Spearman
rank correlation between the held-out predicted ranking of the 92 comps and
their actual market-cap ranking is **IC 0.28** — a weak-to-moderate signal,
stated as such. Median realized multiples by predicted decile are published
on the dashboard; they are noisy and non-monotone in the middle deciles,
which is what an IC of 0.28 looks like up close.

## The board and the audit

The board ranks **every** strictly pre-token protocol that passes the
hygiene — **198 rows**, the 40 watchlist slugs among them. (radar-2 capped
its early radar below the $50M floor and ranked 178; radar-3 holds nothing
rankable back.) The remaining **144** strictly pre-token protocols are
published in the exclusion audit with name, TVL and reason:

| Reason | Count |
| --- | --- |
| Product category — CEX | 42 |
| Product category — Liquid Staking | 38 |
| Product category — Bridge | 28 |
| Product category — Canonical Bridge | 15 |
| Versioned variant name | 11 |
| Wrapped / staked variant name | 5 |
| Product category — Liquid Restaking | 3 |
| Product category — Restaked BTC | 2 |

The counterfactual, stated plainly: the largest exclusion is an exchange's
own product line carrying $13,824,458,555 of TVL. Ranked, it would sit at
#1 by size — and its TVL is a balance sheet, not a launch waiting to
happen. That is why the hygiene exists, and why exclusions are published
rather than silent.

## The farm layer: verdicts and the farmer's hurdle

Every row carries the same six-step farm plan shape as radar-2 (category
action, first-chain venue, TVL capital tier, age hold — plus an explicit
one-person-one-wallet honesty line in step 4). radar-3 grades the plan.

For a **reference position of $1,000** — one capital for every row, so
verdicts compare across rows — under one labelled scenario (a community
allocation of **10% of the launch value**, shared pro-rata by TVL), the
plan's proceeds are netted against its own stated cash costs (setup $3,
action $8, upkeep $2/week over the hold) plus a **4% risk-free** charge on
the capital. The verdict words are this board's own:

- **PAYS** — nets positive even at the band's bear end.
- **CLOSE** — nets positive at the base value, not at the bear end.
- **SHORT** — nets positive at neither.

On this snapshot: **PAYS 0, CLOSE 116, SHORT 82.** PAYS is empty and the
board says so: the nearest row (Nucleus) misses it by $2.43 of net. Beside
each verdict sits the **farmer's hurdle** — the share of the bear value, in
basis points, that must reach the farming side for the plan to break even —
and an EV-per-$1,000 grid at allocation scenarios of 5% / 10% / 15%. The
allocation percentages are scenario assumptions, labelled as such wherever
they appear; they never touch the ranked value.

## Flags, grades and context (display only)

- **Concern flags** are mechanical, from snapshot fields only: a name stem
  shared with a tokenized protocol in the same snapshot (4 rows — a
  possible parent-token family), or a stablecoin-issuance category (4
  rows — the protocol's own dollar asset already circulates, so the
  implied value is a claim on a future governance token only). Flags never
  change a price.
- **Contested**: 7 rows whose 8 nearest traded neighbours (by log-TVL)
  carry a median market cap more than 3× from the curve price, either way.
  The curve price stands; the disagreement is shown.
- **Thin evidence**: 112 of 198 rows (56.6%) sit in categories with fewer
  than 4 clean traded comps. The curve itself is jackknife-stable — leaving
  any single comp out moves a row's value by at most 3.2% (IQR/base) — but
  category-level context for most rows rests on thin traded evidence, and
  the front page says so before it shows a single price.
- **Category evidence grades** (A/B/C) combine comp depth with the
  category's own held-out spread; grade-C categories render desaturated on
  the category wall. The shrunk category medians shown there use
  empirical-Bayes shrinkage, (n·category + 4·global)/(n + 4) — context
  only; category prices nothing on this board.
- **Launch-likelihood context**: each category's tokenization base rate
  (tokenized / all protocols in the category, shrunk toward the snapshot's
  global 17%) is shown per row, and the board offers an EV sort (implied ×
  base rate) as a labelled secondary view. It is a base rate, not a fitted
  launch model, and it is never in the ranked value.

## Known failure modes

- TVL is a single point in time; it can be rented, incentivised, or
  double-counted upstream, and the snapshot cannot tell.
- Pre-token markets historically overprice launches (pre-market marks have
  run ≈2.4× launch FDV in known cases); a curve fitted on post-launch
  market caps inherits whatever the market believed later, not at launch.
- The fit is weak (R² = 0.104) and the ranking signal modest (IC 0.28).
  The band, not the point, is the honest output.
- One snapshot, one chain universe, one moment: the curve is refitted from
  whatever snapshot it is given, and a different era will move it — the
  hindcast drift (×0.78) measures exactly that instability.

## Verification

- **Determinism.** Two runs over the sealed snapshot, to different output
  directories, produce byte-identical `board.json`, `data.js` and
  `dossier.json`. The fit is rounded to 4 decimals at the source so the
  dashboard's in-page recompute uses the identical numbers and agrees with
  `board.json` to the dollar (verified in the detail view of the top row).
- **Board shape.** Ranks run exactly 1..198 with no gaps; implied values
  are positive integers in non-increasing order; every row's band brackets
  its base value; every row carries exactly six farm steps of 20–600
  characters; the watchlist is covered 40/40.
- **Top of the board** on the sealed snapshot: Sentora Curator
  $47,573,864 (TVL $2,757,585,593), Steakhouse Financial $47,549,356,
  Gauntlet $38,178,604 — the curve is monotone in TVL, so the top of the
  board is the top by size; the board's contribution is the calibrated
  values, bands and verdicts, and it does not pretend otherwise.
- **Caps.** The dashboard's source stays under the dossier's text cap
  (50,500 B against 65,536 B) and each screenshot under its cap (all three
  are 1440×900 and below 512 KiB).

## What would change the ranking

Only the snapshot. A row's value moves if its TVL moves or if the comps
refit the curve. Nothing else is an input: no hand-picked rows, no name
lists, no figures from outside the sealed input.
