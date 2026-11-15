# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Dimzy14/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A ranked board of protocols that still record no token, priced by what their
launch would be worth if the snapshot's own market priced them the way it
prices their traded peers. Entry for the make.fun bounty
["Build the best token launch radar"](https://make.fun/bounty/token-radar-01) (token-radar-01).

## What it does

`main.ts` reads the sealed DefiLlama snapshot (`input/snapshot.json` in the
competition kit), keeps every watchlist protocol, adds pre-token protocols
below the watchlist floor that pass the same wrapped / staked / bridged
exclusions, and ranks them by implied launch value under the model in
`lib/model.ts` (version **radar-2**):

```
implied = round( TVL x peer_multiple(category) x growth_multiplier x maturity_multiplier )
```

- `peer_multiple(category)` is the median market-cap / TVL of the protocols in
  the same category whose token already trades in this snapshot, clamped to
  [0.03, 2.5]; a category with fewer than 4 traded peers is priced by the
  snapshot-wide median.
- `growth_multiplier` adjusts for 7-day TVL change, clamped to [-60, +120]%.
- `maturity_multiplier` adjusts for how long the protocol has run with no
  token.

Every row also carries a six-step farm plan derived from the protocol's own
record: its category sets the action, its first chain the venue, its TVL the
capital tier, its age the hold period.

## Outputs

Running the program writes, into the output directory:

- `board.json` — the ranked board (178 rows on the sealed snapshot), each row
  with an implied value and a farm plan.
- `dossier.json` — the competition dossier, produced through
  `vendor/makefun-board.ts`.
- `data.js` — the dashboard's whole dataset as one script.

The static dashboard in `dashboard/` renders the board, a per-protocol detail
view (which recomputes the row's implied value in the page and compares it
with `board.json`), search and category / chain filters, and the table of peer
multiples. It makes no network requests: every byte it shows is in `data.js`.

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
- `lib/model.ts` — the radar-2 model: multiples, implied value, farm plans.
- `vendor/makefun-board.ts` — the kit's dossier writer, unmodified.
- `dashboard/` — the static dashboard (`index.html`, `app.css`, `app.js`).
- `screenshots/` — the board, a protocol detail view, and a filtered view.

## License

MIT — see `LICENSE`.
