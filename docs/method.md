# Method — how radar-2 prices a protocol that has no token yet

This note records the reasoning behind the model in `lib/model.ts`, the
evidence it draws on, and the checks the board had to pass before it was
handed in. It is written for the reader who wants to know why a row carries
the implied value it carries, and what would have to change in the snapshot
for that value to move.

## The question

The snapshot lists every protocol DefiLlama tracks: its total value locked
(TVL), its seven-day TVL change, when it was first listed, and — for the
protocols whose token already trades — a market capitalisation. The board's
job is to rank the protocols with **no** token by what their launch would be
worth. Any such ranking is a model, not a measurement; the discipline is to
build it only from figures the snapshot itself contains, so a reader can
recompute every row from the same page the judge sees.

## Why a category multiple, and not one flat multiple

A flat rule — say, implied value = TVL × 0.2 for everything — prices a lending
market and a bridge as if they were the same business. The snapshot's own
traded protocols say they are not. In this snapshot, the median traded lending
protocol changes hands at about 0.13× its TVL, while canonical bridges sit
near 0.75× and DEXes near 0.34×. radar-2 therefore prices each pre-token
protocol with the **median market-cap / TVL of the traded protocols in its own
DefiLlama category**, computed from this snapshot on every run:

- a category needs at least 4 traded peers before its own median is trusted;
  below that, the snapshot-wide median stands in (0.2138 over 128 traded
  protocols in this snapshot);
- every multiple is clamped to [0.03, 2.5], so one thin or exuberant category
  cannot price a row at twenty times its TVL;
- multiples are rounded to 4 decimal places at the source, so the board's
  arithmetic and the dashboard's in-page recompute use the identical number
  and agree to the dollar.

The multiple is the model's central claim: a launch is worth roughly what the
market already pays for the same kind of protocol, per dollar locked.

## The two adjustments

**Growth.** A protocol growing into its TVL is not the same prospect as one
shrinking out of it. The seven-day change is clamped to [-60, +120] percent —
beyond that, a week is noise, not signal — and applied at half weight:
`growth_multiplier = 1 + clamped_change / 100 × 0.5`. A protocol up 120% in a
week is priced 1.6× its static value; one down 60% is priced 0.7×.

**Maturity.** A protocol that has run for years with no token has a product
the market has already tested; one listed last month is a promise. Age is the
days since first listing (365 when the snapshot records none), and the
multiplier runs from 0.6 for a brand-new protocol to 1.0 at three years:
`maturity_multiplier = 0.6 + min(age_days, 1095) / 1095 × 0.4`.

## Who is on the board, and who is not

The watchlist is the floor: every slug it names is on the board, ranked by the
same function as everything else. Below the floor, the early radar adds
pre-token protocols by TVL — the rows a launch radar exists to surface early.
Three kinds of protocol are excluded below the floor, by the same rule the
watchlist itself applies:

- products of a token that already trades: bridges, canonical bridges, liquid
  staking and restaking categories;
- versioned or wrapped / staked variants of another protocol, by name;
- an exchange's own product lines, which are that exchange's token play, not
  an independent launch.

Protocols whose token already trades are never mixed into the ranking. The
largest of them are shown separately, at the market's own values, in the
dashboard's Live view — they are the evidence base for the multiples, not
competitors in the ranking.

On the sealed snapshot this yields a board of **178 rows**: the 40 watchlist
protocols plus 138 early rows, with 24 live-token protocols set aside.

## The top of the board, and why

The three highest implied values on the sealed snapshot:

| Rank | Protocol | Implied value |
| --- | --- | --- |
| 1 | Steakhouse Financial | $464,917,576 |
| 2 | Gauntlet | $276,893,631 |
| 3 | Veda | $266,212,931 |

Each is a large, long-running curator / allocator protocol whose category
peers trade at solid multiples of TVL; none of the three is there because a
name was favoured — the same function scores every row, and no protocol name
appears anywhere in the model.

## The farm plan

Every row carries six steps: use a fresh wallet, find the protocol's own
points or season page before depositing, take the category's one qualifying
action, act weekly so the record is a history and not a spike, hold across
more than one snapshot, and claim only from the link the protocol itself
publishes. The plan is derived per row — category sets the action, first
chain the venue, TVL the capital tier ($50 / $100 / $150 / $250), age the hold
(30 / 45 / 60 days) — never written by hand for a named protocol, in
`board.json` and in the dashboard alike.

## Verification

- **Determinism.** Two runs over the sealed snapshot, to different output
  directories, produce byte-identical `board.json`, `data.js` and
  `dossier.json`. On the submitted commit, `board.json` is 295,131 bytes with
  SHA-256 `d506afea50d0987202759fbfd9f803e0f2e696d4c6389e54c4f7e3ed4aa3b0ac`
  and `dossier.json` is 861,007 bytes with SHA-256
  `1caccb6148ed5493762f678d5f2a1b4f1d68b38c58ec560f523c6e0b5fb1d212`.
- **Board shape.** Ranks run exactly 1..178 with no gaps, implied values are
  positive integers in non-increasing order, all 178 values are distinct, and
  every row carries exactly six farm steps of 20–600 characters.
- **Agreement.** The dashboard recomputes each row's implied value in the
  page from the snapshot figures and the stated model, and shows whether it
  matches the number `board.json` carries; on the sealed snapshot they agree.
- **Caps.** The dashboard's source stays under the dossier's text cap
  (34 KB against a 65,536-byte cap) and each screenshot under its cap
  (all three are 1440×900 and below 512 KiB).

## What would change the ranking

Only the snapshot. A protocol's implied value moves if its TVL moves, if its
category's traded peers reprice, if its seven-day change swings, or as it
ages. Nothing else is an input: no hand-picked rows, no name lists, no
figures from outside the sealed input.
