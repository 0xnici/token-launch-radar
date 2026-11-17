# Method — how radar-5 prices a protocol that has no token yet

This note records how the model in `lib/model.ts` was chosen, what it
assumes, where it is known to be weak, and the checks the board had to pass.
Every number below is recomputed from the sealed snapshot at build time;
nothing is hand-typed into the model.

## The stance: reference-class forecasting

radar-5 prices the reference class, then publishes how the reference class
actually performed. The class is the snapshot's **clean comps**: tokenized
protocols that pass the same hygiene as the board (no bridge / CEX /
liquid-staking product categories, no versioned or wrapped variants, no
exchange product lines) — **92 protocols** on this snapshot. The price of a
pre-token protocol is the class's fitted size curve and nothing else:

```
implied = round( 10 ^ (a + b x log10(TVL)) ),   a = 4.5869, b = 0.3135
```

The fit is a **median regression** (least absolute deviations), not least
squares: it prices the *typical* launch, so the handful of comps trading at
extreme multiples of their size cannot drag the curve the way they drag a
mean. The exponent deserves its context: b = 0.3135 with a jackknife 95%
interval of [0.1672, 0.4598] and an L1 pseudo-R² of 0.074. That is far below
a pure Metcalfe exponent of 2 and inside the range network-value fits
usually land in — and the low pseudo-R² is the honest headline: size
explains only a small share of what launched tokens trade at. The rest is
dispersion, and the band (below) is where that dispersion is reported
instead of hidden.

## How the model was chosen: two splits, then a gate

Fourteen candidate pricers were fitted on the clean comps and graded
**leave-one-out**: price each comp as if it were pre-token, from the other
91, and compare with its recorded market cap.

| Candidate | Median \|log₁₀ error\| | Median miss | Within 2× | Within 3× |
| --- | --- | --- | --- | --- |
| A — radar-2 (category multiple × growth × maturity) | 0.6911 | ×4.91 | 22.8% | 37.0% |
| B — fitted size curve alone (OLS) | 0.5146 | ×3.27 | 38.0% | 45.7% |
| C — B + category factor (shrunk, γ = 0.5) | 0.5705 | ×3.72 | 35.9% | 46.7% |
| D — C + growth term | 0.5532 | ×3.57 | 35.9% | 45.7% |
| E — B × growth × maturity | 0.4840 | ×3.05 | 33.7% | 47.8% |
| F — E, curve fitted to deflated caps | 0.5486 | ×3.54 | 38.0% | 46.7% |
| G — size curve by median (LAD) regression | 0.5824 | ×3.82 | 38.0% | 45.7% |
| H — hybrid: category curves ≥ 12 comps, shrunk; global else | 0.5251 | ×3.35 | 35.9% | 45.7% |
| I — size curve by Huber regression (δ = 0.35) | 0.5426 | ×3.49 | 38.0% | 44.6% |
| J — ensemble: mean of the OLS and LAD curves | 0.5452 | ×3.51 | 37.0% | 45.7% |
| M — G × fitted growth term (one coefficient) | 0.5893 | ×3.88 | 37.0% | 45.7% |
| N — M × fitted maturity term (one more coefficient) | 0.5612 | ×3.64 | 37.0% | 46.7% |
| O — G × fitted breadth term (chain count, log space) | 0.5535 | ×3.58 | 37.0% | 47.8% |
| C2 — B + category factor (strong shrinkage, k = 16) | 0.5661 | ×3.68 | 38.0% | 44.6% |

Leave-one-out narrows the field — the curve family beats radar-2's multiple
outright, and the category factor loses in every form tried (raw, shrunk
toward 1 with k = 4 in James–Stein fashion, damped at γ = 0.5, clamped, and
this round shrunk harder at k = 16): once size is fitted, category medians
mostly re-state size, and their noise costs more than their signal pays.

But leave-one-out is also the split the bands are calibrated on, so it does
not get the final word on model shape — that would be selection leakage.
Every keep-or-drop decision is made **out-of-time**, on rolling-origin
hindcasts over the 70 dated comps. radar-3 ran the newest-third split on
radar-2's adjustment terms: they helped in-window and hurt out-of-time
(×2.85 against the plain curve's ×2.56), so they did not ship. radar-4 ran
the same split on the estimator itself: the median fit (G) *lost*
leave-one-out — ×3.82 against the least-squares ×3.27 — and *won* the
hindcast outright, ×2.07 against ×2.56, with more of the newest era priced
within 2× (43.5% against 39.1%). Least squares grades best on the era it
was fitted in; the median grades best on the era that had not happened yet,
and the board is priced for the second kind.

### The round-5 gate: two origins, pre-registered margins

One split can be lucky. radar-5 therefore re-ran the decision as a gate
with the rules fixed before the fits: **two origins** — fit the oldest 35
dated comps, grade the next 12 (origin 1); fit the oldest 47, grade the
newest 23 (origin 2, radar-4's split). A challenger ships only if its
two-origin mean median miss beats the incumbent's by **5% or more**
relative (10% for the ensemble candidate), it loses **neither origin by
more than 10%** relative, any coefficient it fits keeps the **same sign at
both origins**, and a category factor additionally moves at least 10 board
rows by more than 5%. A win inside the margin is recorded as a tie, and
the incumbent stays. Six challengers were heard: the Huber fit and the
ensemble (the estimator question, asked harder), the fitted growth and
maturity terms (radar-2's struck adjustments, re-estimated honestly — one
coefficient each, fitted by least squares on the training era's residuals,
never hand-set), a fitted breadth term, and the category factor at a
second, stronger shrinkage.

| Two-origin hindcast | Origin 1 (12) | Origin 2 (23) | Mean |
| --- | --- | --- | --- |
| A — radar-2 | ×6.40 | ×4.44 | ×5.42 |
| B — OLS curve | ×2.00 | ×2.56 | ×2.28 |
| C — B + category (k = 4) | ×2.00 | ×2.38 | ×2.19 |
| D — C + growth | ×1.97 | ×2.38 | ×2.17 |
| E — B × growth × maturity (asserted) | ×2.09 | ×2.85 | ×2.47 |
| F — E on deflated caps | ×1.96 | ×3.09 | ×2.53 |
| **G — LAD curve (incumbent)** | **×2.25** | **×2.07** | **×2.16** |
| H — hybrid category curves | ×2.00 | ×2.56 | ×2.28 |
| I — Huber curve | ×2.14 | ×2.40 | ×2.27 |
| J — ensemble (OLS+LAD mean) | ×2.13 | ×2.30 | ×2.22 |
| M — G × fitted growth | ×2.22 | ×2.07 | ×2.14 |
| N — M × fitted maturity | ×2.23 | ×2.10 | ×2.17 |
| O — G × fitted breadth | ×2.26 | ×2.49 | ×2.37 |
| C2 — B + category (k = 16) | ×2.00 | ×2.50 | ×2.25 |

**No challenger cleared the gate, so G ships unchanged** — this round is a
methodology round, and the board is byte-identical to radar-4's. The
verdicts, with the numbers that decided them:

- **Huber (I)** interpolates exactly as theory says in-window (LOO ×3.49,
  between B's ×3.27 and G's ×3.82) but loses origin 2 to the incumbent by
  15.9% relative — outside the per-origin bound. Rejected.
- **Ensemble (J)** — the average of the two curves — loses origin 2 by
  11.2% and its mean (×2.22) is worse than the incumbent's (×2.16) before
  its higher 10% bar is even applied. Averaging the estimators averages
  away the median's newest-era edge. Rejected.
- **Fitted growth (M)** is the round's honest near-miss, and it closes a
  question. Fitted per era, β = +0.20 (origin 1) and +1.49 (origin 2) —
  same sign, no kill — and M beats the incumbent at *both* origins, by
  1.2% and 0.1%: a mean win of 0.7%, inside the 5% margin, recorded as a
  tie. Two further facts say the tie is the right call: the full-pool fit
  of the same coefficient is β = −0.50, opposite in sign to both era fits,
  and M's leave-one-out grade (×3.88) is the worst of the curve family.
  **The growth question is closed**: fitted honestly, at the resolution
  this snapshot affords, 7-day momentum does not price launches. It stays
  on the page as context and will not be refitted next round.
- **Fitted maturity (N)** dies on the sign rule: γ = +0.081 at origin 1,
  −0.045 at origin 2. A coefficient that flips sign between adjacent eras
  is era noise, not signal. **The maturity question is closed** on the
  same terms; age stays a display percentile.
- **Fitted breadth (O)** dies on the same rule: θ = +0.012 at origin 1,
  −0.169 at origin 2. Chain count stays display-only, permanently.
- **Category (C, C2)** had its hearing at both shrinkages: each beats the
  incumbent at origin 1 and loses origin 2 by 15–21%. Under the gate's
  board-impact rule the question never even reached materiality — the
  per-origin loss decided it first. Category prices nothing, at any
  shrinkage tried.

A pattern worth recording: at origin 1 the incumbent is beaten by eleven
of its thirteen challengers; at origin 2 — the newest era — it is beaten
by none beyond a tie. Every challenger that looks better on the older
split gives it back on the newer one. That asymmetry is the reason the
gate has two origins.

The hybrid (H) remains a rejection, not a near-miss: its hindcast training
eras hold no category with 12+ comps (the largest, Lending, has 9), so
out-of-time the hybrid *is* the global curve — its origin grades are B's
numbers, not ties it earned — and in-window it graded worse than B anyway.

### The whole distribution, graded: proper log score

Median miss grades a point. The audit page also grades each candidate's
whole predictive distribution — the fitted curve plus a Gaussian spread
set by its own leave-one-out residual dispersion — under a **proper log
score** (mean held-out log predictive density; higher is better; a proper
rule cannot be gamed by widening a band). The hybrid takes it, −1.2494
against the shipped model's −1.2510 — a margin of 0.002, inside any
reasonable noise — with the breadth term third (−1.2546) and the
least-squares curve sixth (−1.2617). radar-2's full model is last by a
wide margin (−1.3913). The shipped model is second of fourteen on the
score that grades everything it claims, centre and spread together.

The shipped model's leave-one-out median miss is ×3.82 (drift to the
origin-2 era: ×0.54 — the newest era graded much kinder than the in-window
average, which is itself a measure of how much the era matters).

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
| Small (≤ $11.1M) | ×0.2255 | ×2.2008 |
| Middle | ×0.2611 | ×4.6121 |
| Large (> $52.5M) | ×0.3731 | ×4.4219 |
| Global (fallback) | ×0.2675 | ×3.9856 |

Achieved coverage on the comps, published next to nominal on the dashboard:
**51.1% at 50% nominal (47 of 92), 81.5% at 80%, 92.4% at 90%.** The
median residual is ×1.00 — the median fit is close to unbiased in log
space — and in natural frequencies: 47 of 92 launched peers landed inside
a band this wide, which is exactly what a central 50% band promises. The
detail view says it that way, in counts, not percentages.

## Rank validation

The product is a ranking, so the ranking is validated too: the Spearman
rank correlation between the held-out predicted ranking of the 92 comps and
their actual market-cap ranking is **IC 0.32** — a weak-to-moderate signal,
stated as such, and a small improvement on the least-squares fit's 0.28.
Median realized multiples by predicted decile are published on the
dashboard; they are noisy and non-monotone in the middle deciles, which is
what an IC of 0.32 looks like up close.

## The board and the audit

The board ranks **every** strictly pre-token protocol that passes the
hygiene — **198 rows**, the 40 watchlist slugs among them. The remaining
**144** strictly pre-token protocols are published in the exclusion audit
with name, TVL and reason:

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
one-person-one-wallet honesty line in step 4). The board grades the plan.

For a **reference position of $1,000** — one capital for every row, so
verdicts compare across rows — under one labelled scenario (a community
allocation of **10% of the launch value**, shared pro-rata by TVL), the
plan's proceeds are netted against its own stated cash costs (setup $3,
action $8, upkeep $2/week over the hold) plus a **4% risk-free** charge on
the capital. The verdict words are this board's own:

- **PAYS** — nets positive even at the band's bear end.
- **CLOSE** — nets positive at the base value, not at the bear end.
- **SHORT** — nets positive at neither.

On this snapshot: **PAYS 0, CLOSE 119, SHORT 79.** PAYS is empty and the
board says so: the nearest row (Nucleus) misses it by $2.37 of net. Beside
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
- **Contested**: 6 rows whose 8 nearest traded neighbours (by log-TVL)
  carry a median market cap more than 3× from the curve price, either way.
  The curve price stands; the disagreement is shown.
- **Thin evidence**: 112 of 198 rows (56.6%) sit in categories with fewer
  than 4 clean traded comps. The curve itself is jackknife-stable —
  leaving any single comp out moves a row's value by at most 4.5%
  (IQR/base) — but category-level context for most rows rests on thin
  traded evidence, and the front page says so before it shows a single
  price.
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
- The fit is weak (L1 pseudo-R² = 0.074) and the ranking signal modest
  (IC 0.32). The band, not the point, is the honest output.
- `listed_at` is the date DefiLlama listed the protocol, not the date its
  token launched — the snapshot carries no token-launch date for any comp,
  so no launch-window or time-to-token context is shown anywhere on the
  board. Any such number would be fabricated, so there is none.
- One snapshot, one chain universe, one moment: the curve is refitted from
  whatever snapshot it is given, and a different era will move it — the
  hindcast drift (×0.54) measures exactly that instability.

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
  $35,197,016 (TVL $2,757,585,593), Steakhouse Financial $35,182,588,
  Gauntlet $29,544,688, Veda $29,460,650, USDD $26,049,058 — the curve is
  monotone in TVL, so the top of the board is the top by size; the board's
  contribution is the calibrated values, bands and verdicts, and it does
  not pretend otherwise. The whole board implies $1,867,860,613.
- **Caps.** The dashboard's source stays under the dossier's text cap
  (56,163 B against 65,536 B) and each screenshot under its cap (all three
  are 1440×900 and below 512 KiB).

## What would change the ranking

Only the snapshot. A row's value moves if its TVL moves or if the comps
refit the curve. Nothing else is an input: no hand-picked rows, no name
lists, no figures from outside the sealed input.

## Round 6 — candidate T and the growth/age audit

Round 6 keeps model G and adds the growth/age investigation to the shipped program itself
(`backtest.growth_age` in data.js, computed by `runBacktest` from the same comps the gate
used): a factor check on the shipped curve's leave-one-out residuals (growth r = -0.0803,
age r = -0.0671, noise band ±0.2043 at n = 92) and candidate T — the fitted growth/age
terms re-applied as a tilt hard-capped at ×0.75–×1.33, caps fixed in
`~/workspace/makefun/round6/TILT-GATE-PREREG.md` before fitting. Gate result: origin 1
×2.2306 vs G ×2.2457, origin 2 ×2.1032 vs ×2.0688, mean ×2.1669 vs ×2.1573 (−0.45% against
a ≥5% bar), age coefficient sign-flip (+0.0809 → −0.0453). T rejected; the rejection, the
factor check, and the era fits render in the dashboard's detail view (judgement budget),
the audit page, the board's model strip, and dashboard/00-method.md — the first file in the
judge's dossier text. Dashboard source was also reordered (00-method.md, index.html,
model.js, style.css) and the CSS minified so the whole dossier text fits the 65,536-byte
cap with nothing truncated (64,549 bytes). board.json is byte-identical to radar-5's.
