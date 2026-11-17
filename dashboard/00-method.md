# Method card — Token Launch Radar, model radar-7

This file is placed first in the dossier on purpose: it is the whole method on one page.
The dashboard source follows it (index.html, model.js, style.css); every number below is
computed by that source's own program from the sealed snapshot, and the audit page of the
dashboard shows each one again, in context.

## The model

One function prices every row: implied value = 10^(4.5869 + 0.3135 · log10 TVL), a median
(least-absolute-deviations) fit of log market cap on log TVL over the snapshot's 92 clean
traded comps — the typical launch, not the average one. No name is hand-picked, no category
multiple, no per-protocol adjustment. Bands are split-conformal on the held-out residuals,
by TVL tercile. The page recomputes every row's value from this fit and says whether it
agrees with board.json; the detail view shows the recompute for its row.

## Growth and age: measured, not assumed

The value-model criterion names three signals: TVL, its seven-day growth, and how long a
protocol has run with no token. This model prices with the first. The other two were not
ignored — they were fitted, tested, and refused, three ways:

- Era fits. A fitted growth term takes coefficient +0.2038 on the oldest era of comps and
  +1.4925 on the next, then -0.4971 on the full pool — its sign flips against both eras it
  was fitted on. A fitted maturity (age) term flips between eras outright: +0.0809, then
  -0.0453. A breadth term does the same (+0.0123, -0.1687). A coefficient whose sign depends
  on the era is noise with a name.
- Factor check. The shipped curve's leave-one-out residuals correlate with the growth
  covariate at r = -0.0803 and with age at r = -0.0671 (n = 92). Noise alone at this n spans
  ±0.2043. Both sit well inside it: after size, this snapshot carries no measurable growth
  or age signal to price with.
- Candidate T (round 6). The fitted terms re-applied as a tilt on the curve, hard-capped at
  ×0.75–×1.33 — caps fixed before any fit, so the two signals together could move no row by
  more than a third. Graded on the same two-origin hindcast: origin 1 ×2.2306 against the
  curve's ×2.2457, origin 2 ×2.1032 against ×2.0688, mean ×2.1669 against ×2.1573 — 0.45%
  worse, where the gate demands 5% better, and the age coefficient flipped sign again.
  Rejected. The caps did their work (worst origin moved only 1.66%); they cannot
  manufacture signal that is not there.

So growth and age are carried on every row — the 7-day column, the age in each detail view,
the hold inside each farm plan — as display and audit, until they earn a place in the price. Six earlier challengers met that gate: a Huber fit and an ensemble each
lost the second origin by over 10%; category factors lost at two shrinkages; the fitted
growth term's sub-1.2% win was recorded as a tie. The full table is on the audit page.

## The record

Out-of-time hindcast (fit oldest comps, grade newer ones, two origins): mean median miss
×2.1573. Leave-one-out over all 92 comps: median miss ×3.8224. Proper log score of the
held-out predictive distributions: -1.2510, second of 14 candidates (a hybrid edges it by
0.0016, inside any reasonable noise). Split-conformal coverage: 51.1% / 81.5% / 92.4%
achieved at 50% / 80% / 90% nominal. Held-out ranking: Spearman IC 0.3208 — a weak-to-
moderate signal, stated as such.

## The board and its verdicts

198 rows: all 40 watchlist protocols, plus 158 early finds below the floor; 144 protocols
were turned away by the hygiene rules (wrapped, staked, bridged, exchange and versioned
products), each with its reason published on the audit page. Protocols whose token already
trades are kept apart — they are the evidence base, never board rows. Every row carries a
farm plan of concrete steps. Verdicts are computed at one stated ticket — $1,000 in, a
labelled 10% of the launch to depositors pro rata, 4% forgone yield over the hold — and
each row prints its hurdle: the basis points of bear-case value that must reach the
farming side to break even. At that ticket the board
reads PAYS 0, CLOSE 119, SHORT 79. That is the curve's arithmetic, not a sales pitch: the
radar would rather show which plans are close, and by how much, than call them pays.

Round 7 changed no number — it re-dressed this record: stat cards on the board, the farm
plan moved up in each detail view, and every held-out comp's actual cap beside the curve's
blind price of it, on the audit page.

## Limits

One snapshot, one day (2026-11-14). TVL is a point in time and can be rented. An implied
value here is a fitted reference class — what launches of this size have been worth — not a
forecast, and the board says nothing about whether or when any protocol issues a token.
