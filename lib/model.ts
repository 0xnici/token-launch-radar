// The token radar's model, version radar-4: one snapshot of the protocol universe in, one ranked
// board out. radar-4 keeps the discipline of the rounds before it — every number a pure function
// of the sealed snapshot, no protocol name ever special-cased — and changes how the number is
// earned: the model is chosen by a leave-one-out backtest against the snapshot's own launched
// protocols, every keep-or-drop is decided on an out-of-time hindcast, and every row carries the
// range the backtest says the model deserves.
//
// The board ranks every strictly pre-token protocol that passes the board's hygiene (the
// watchlist's own exclusions: no wrapped, staked or bridged product of a token that already
// trades, no exchange product line, no versioned variant). On this snapshot that is 198 rows;
// the 144 strictly pre-token protocols the hygiene turns away are not dropped silently — they
// are published in the exclusion audit with the reason and their TVL.
//
// Pricing. The evidence base is the snapshot's clean comps: tokenized protocols that pass the
// same hygiene (92 on this snapshot). Eight candidate pricers were fitted on the comps and graded
// by leave-one-out: price each comp as if it were pre-token, from the other 91, and measure the
// error against its recorded market cap. The candidates (leave-one-out median error factors):
//
//   A  radar-2 itself (category median multiple x growth x maturity)      x4.91
//   B  a fitted size curve alone, log10(mcap) = a + b log10(TVL), OLS     x3.27
//   C  B + a category factor (shrunk toward 1, damped at gamma = 0.5)     x3.72
//   D  C + radar-2's growth term                                          x3.57
//   E  B x growth x maturity (radar-2's adjustments on the fitted curve)  x3.05
//   F  E with the curve fitted to adjustment-deflated market caps         x3.54
//   G  the size curve fitted by median (least-absolute-deviations)        x3.82
//        regression instead of OLS
//   H  hybrid: per-category OLS curves where a category holds >= 12       x3.35
//        comps (shrunk toward the global curve by n), global elsewhere
//
// Two splits decide two different things, so the band's calibration is never graded on the
// split that chose the model. Leave-one-out narrows the field: the category factor loses in
// every form (once size is fitted, category medians mostly re-state size, and their noise
// costs more than their signal pays), and the curve family beats radar-2's multiple outright.
// Every keep-or-drop decision is then made out-of-time, on a rolling-origin hindcast (fit on
// the oldest dated comps, grade on the newest). In radar-3 that split struck the adjustment
// terms: the plain curve beat its adjusted twin (median error x2.56 against x2.85, 39% against
// 26% priced within 2x), so the adjustments did not ship. In radar-4 the same split chose the
// estimator: the median fit lost leave-one-out (x3.82 against the OLS x3.27) and won the
// hindcast outright (x2.07 against x2.56, 43% against 39% within 2x), so the median fit ships —
// the rule that removed E is the rule that removed B, applied the same way. The hybrid never
// stood apart out-of-time: its training era holds no category with 12+ comps, so there it is
// the global curve itself, and in-window it graded worse than B. What ships is the reference
// class itself, unadjusted, fitted at its median:
//
//   implied = max(1, round(10 ^ (a + b x log10(tvl))))     a, b fitted by LAD on the clean comps
//
// This is reference-class forecasting applied literally: price the class, publish how the
// class actually performed, and let no per-row judgement in through the side door. Category,
// momentum and age remain on the page as labelled context; none of them moves a price.
//
// The band. Each row's bear/bull range is a split-conformal interval built from the shipped
// model's leave-one-out residuals, conditioned on size: residuals are bucketed by comp TVL
// tercile, and each bucket's band is the conformal central interval of its own residuals
// (finite-sample corrected quantile, ceil((n+1)q)/n), with the global conformal band as the
// fallback for a thin bucket. Under exchangeability of the comps the interval carries its
// nominal coverage by construction; the dashboard publishes nominal against achieved anyway.
//
// The verdict. A farm plan is graded, not just listed. For a reference position of $1,000 (one
// capital for every row, so verdicts compare across rows), under one labelled scenario — a
// community allocation of 10% of the launch value, shared pro-rata by TVL — the plan's proceeds
// are netted against its own stated cash costs plus a 4% risk-free charge on the capital over
// the hold. The verdict words are this board's own: PAYS — the plan still nets positive at the
// band's bear end; CLOSE — it nets positive at the base value but not at the bear end; SHORT —
// it does not net positive even at the base. Beside the verdict sits the farmer's hurdle: the
// share of the bear value, in basis points, that must reach the farming side for the plan to
// break even at all. The verdict never touches the ranked value; it grades the plan.
//
// Concern flags are mechanical, from snapshot fields only: a row is flagged when the first
// word of its name matches the first word of a tokenized protocol's name in the same snapshot
// (a possible parent-token family member), or when its category is a stablecoin-issuance
// category (its own dollar asset already circulates; the snapshot records no token for the
// protocol itself, so the implied value is a claim on a future governance token only).

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** A category needs at least this many traded peers before its own median prices a row (candidate A and the display stats). */
  min_comps: number;
  /** The clamp on every peer multiple, the snapshot-wide one included. */
  multiple_floor: number;
  multiple_cap: number;
  /** Shrinkage weight: a category statistic is pulled toward the global one as (n*cat + k*global)/(n+k). */
  shrink_k: number;
  /** The damping exponent the backtest applied to the category factor (candidates C and D). */
  category_gamma: number;
  /** The Huber fit's tuning constant in log10 space: quadratic inside it, linear beyond (candidate I). */
  huber_delta: number;
  /** The Huber fit's fixed IRLS iteration count: fixed, so the fit is deterministic (candidate I). */
  huber_iterations: number;
  /** The strong shrinkage weight of candidate C2's category factor (the weak form uses shrink_k). */
  category_shrink_k_strong: number;
  /** The residual quantiles that set each row's band: the winner's leave-one-out P25 and P75. */
  band_quantile_lo: number;
  band_quantile_hi: number;
  /** The verdict's one capital for every row, so verdicts compare across rows. */
  verdict_reference_capital: number;
  /** The verdict's labelled scenario: the share of launch value a community allocation is assumed to be. */
  verdict_alloc_share: number;
  /** The verdict's risk-free rate, charged on the reference capital over each plan's hold. */
  risk_free_rate: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  min_comps: 4,
  multiple_floor: 0.03,
  multiple_cap: 2.5,
  shrink_k: 4,
  category_gamma: 0.5,
  huber_delta: 0.35,
  huber_iterations: 100,
  category_shrink_k_strong: 16,
  band_quantile_lo: 0.25,
  band_quantile_hi: 0.75,
  verdict_reference_capital: 1000,
  verdict_alloc_share: 0.1,
  risk_free_rate: 0.04,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-5';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's peer multiple: the median market-cap / TVL of its traded protocols. */
export interface CategoryMultiple {
  category: string;
  multiple: number;
  comps: number;
}

/** The multiples one snapshot yields: the per-category table and the snapshot-wide stand-in. */
export interface MultipleTable {
  global_multiple: number;
  global_comps: number;
  by_category: CategoryMultiple[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A farm verdict: the plan graded at the band's bear end and at the base value. */
export interface FarmVerdict {
  /** Our words: PAYS nets positive at the bear end, CLOSE only at the base value, SHORT at neither. */
  verdict: 'PAYS' | 'CLOSE' | 'SHORT';
  /** Net proceeds of the reference position at the band's bear end, dollars, after all costs. */
  net_bear_usd: number;
  /** Net proceeds of the reference position at the base value, dollars, after all costs. */
  net_base_usd: number;
  /** The plan's total cost for the reference position: stated cash costs plus the risk-free charge. */
  total_cost_usd: number;
  reference_capital: number;
  /** The share of the bear value, in basis points, that must reach the farming side for the plan to break even. */
  hurdle_bps: number;
  /** Gross proceeds per $1,000 at the base value under allocation scenarios of 5%, 10% and 15% (labelled assumptions). */
  ev_per_1k_usd: [number, number, number];
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  /** The band the winner's leave-one-out residuals earn: bear and bull around the base value. */
  implied_low_usd: number;
  implied_high_usd: number;
  /** The row's rank by TVL alone among board rows: the gap to `rank` is the model's own signal. */
  tvl_rank: number;
  /** Jackknife fragility: IQR of leave-one-comp-out values over the base value; high means thin evidence. */
  fragility: number;
  thin_evidence: boolean;
  /** The category's tokenization base rate (display context only, never a pricing input). */
  category_base_rate: number;
  /** Whether the 8 nearest traded neighbours' median value diverges from the curve price by more than 3x. */
  contested: boolean;
  /** The neighbours' median market cap over the curve price (the contested test's own number). */
  neighbour_ratio: number;
  /** Derived snapshot stats: TVL per day of age, the 7-day inflow the change implies, category weight. */
  capital_velocity_usd_day: number | null;
  inflow_7d_usd: number | null;
  category_tvl_share_pct: number;
  category_board_rank: number;
  model: {
    curve_value_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    band_low_factor: number;
    band_high_factor: number;
  };
  verdict: FarmVerdict;
  /** Mechanical concern flags from snapshot fields, each a written reason; empty when none fire. */
  concerns: string[];
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  tvl_rank: number;
  curve_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  band_low_factor: number;
  band_high_factor: number;
  verdict: 'PAYS' | 'CLOSE' | 'SHORT';
  net_bear_usd: number;
  net_base_usd: number;
  total_cost_usd: number;
  hurdle_bps: number;
  ev_per_1k_usd: [number, number, number];
  fragility: number;
  thin_evidence: boolean;
  category_base_rate: number;
  contested: boolean;
  neighbour_ratio: number;
  capital_velocity_usd_day: number | null;
  inflow_7d_usd: number | null;
  category_tvl_share_pct: number;
  category_board_rank: number;
  /** Percentiles within the row's own category (context, labelled as such): size, momentum, maturity, breadth. */
  factors: { size: number; momentum: number | null; maturity: number | null; breadth: number };
  concerns: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One candidate pricer's leave-one-out grade over the clean comps. */
export interface BacktestCandidate {
  id: string;
  label: string;
  median_abs_log10_error: number;
  median_error_factor: number;
  within_2x_pct: number;
  within_3x_pct: number;
  winner: boolean;
}

/** One nominal band level and the coverage the leave-one-out residuals actually achieved at it. */
export interface CalibrationPoint {
  nominal_pct: number;
  achieved_pct: number;
}

/** The backtest that chose the model: its comp set, every candidate's grade, and the band it earns. */
export interface Backtest {
  comps: number;
  selection_rule: string;
  candidates: BacktestCandidate[];
  winner: string;
  curve_intercept: number;
  curve_slope: number;
  /** The fitted exponent's 95% confidence interval and the fit's R-squared. */
  curve_slope_ci95: [number, number];
  curve_r2: number;
  /** Global band factors (the fallback), from the winner's recalibrated residual quantiles. */
  band_low_factor: number;
  band_high_factor: number;
  /** Size-conditioned bands: TVL tercile edges over the comps, and each bucket's factors. */
  band_buckets: { edges: [number, number]; factors: { lo: number; hi: number }[]; counts: number[] };
  /** The quantile levels the shipped bands use, after recalibration against nominal coverage. */
  band_levels: [number, number];
  calibration: CalibrationPoint[];
  /** Mean log10 error of the winner (its bias) and the residual quantiles of actual / predicted. */
  mean_log10_error: number;
  residual_quantiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
  /** Rank validation: Spearman IC of the held-out ranking, and mean realized multiple by predicted decile. */
  rank_ic: number;
  decile_realized_multiples: number[];
  /** Rolling-origin hindcast: fit on the oldest comps, graded on the newest. */
  hindcast: { train_n: number; test_n: number; test_median_error_factor: number; drift: number; mean_median_error_factor: number };
  /** Every hindcast contender's own out-of-time grade, published so the decision split is auditable.
   *  median_error_factor is the second origin's (the newest third, radar-4's original split). */
  hindcast_grades: { id: string; median_error_factor: number; within_2x_pct: number; origin1_median_error_factor: number; mean_median_error_factor: number }[];
  /** The two-origin gate's raw material: both origins, every candidate graded on each. */
  hindcast_origins: { label: string; train_n: number; test_n: number; grades: { id: string; median_error_factor: number; within_2x_pct: number }[] }[];
  /** The fitted-coefficient candidates' coefficients, fitted on each origin's training era alone:
   *  the sign-stability evidence the gate's kill rule reads. */
  fitted_coefficients: { beta: [number, number]; gamma: [number, number]; theta: [number, number] };
  /** The shipped model's adjustment coefficients, fitted on all clean comps (zero when its term is absent). */
  adjustments: { beta: number; gamma: number; theta: number };
  /** The gate's verdict on each challenger, in the gate's own words. */
  gate_verdicts: { id: string; verdict: string }[];
  /** Proper log scores of the leave-one-out predictive distributions: mean log density of the
   *  realised caps under a lognormal centred on each candidate's held-out prediction, with that
   *  candidate's own residual spread. Higher is better; a strictly proper scoring rule. */
  log_scores: { id: string; mean_log_score: number; sigma: number }[];
  thin_evidence_pct: number;
}

/** One strictly pre-token protocol the hygiene turned away, with the reason and its TVL. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  reason: string;
}

/** The exclusion audit: every strictly pre-token protocol not ranked, accounted for. */
export interface ExclusionAudit {
  pre_token_total: number;
  ranked: number;
  excluded: ExcludedRow[];
  largest_excluded: { name: string; tvl_usd: number; reason: string } | null;
}

/** One category's heat: the peer evidence and the board's weight in it, for the dashboard's heat panel. */
export interface CategoryHeat {
  category: string;
  comps: number;
  /** The category's median peer multiple, shrunk toward the snapshot-wide median with k = shrink_k. */
  median_multiple: number;
  board_rows: number;
  pretoken_tvl_usd: number;
  /** TVL-weighted mean 7-day change of the category's board rows, percent. */
  aggregate_change_7d: number | null;
  /** Evidence grade: A = deep comps and tight held-out spread, B = usable comps, C = thin evidence. */
  grade: 'A' | 'B' | 'C';
  /** The category's own median leave-one-out error factor under the winner (null when it has no comps). */
  loo_median_error_factor: number | null;
  /** Share of the category's board rows whose nearest neighbours contest the curve price, percent. */
  contested_share_pct: number;
}

/** Everything the dashboard needs: the board, the live set, the backtest, the audit and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  multiples: MultipleTable;
  backtest: Backtest;
  audit: ExclusionAudit;
  categories: CategoryHeat[];
  /** The clean comps themselves, compact, for the dashboard's calibration scatter and category wall. */
  comps_scatter: { category: string | null; tvl_usd: number; mcap_usd: number; loo_pred_usd: number }[];
  /** The board's headline aggregates. */
  headline: { protocol_total: number; board_implied_total_usd: number; pretoken_tvl_share_pct: number; zero_comp_categories: number };
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The median of a non-empty list, the middle value or the mean of the middle pair. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A quantile of a sorted list by linear interpolation between closest ranks. */
function quantile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** A multiple held inside the model's clamp, so one thin category cannot price a row at 20x TVL. */
function clampMultiple(value: number, model: ModelConstants): number {
  return Math.min(model.multiple_cap, Math.max(model.multiple_floor, value));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** The categories that are a wrapped, staked or bridged product of a token that already trades. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** The exchange names a product of an exchange begins with, and so is that exchange's own token play. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Why the hygiene turns a pre-token protocol away, or null when the board may rank it. */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) {
    return `product category (${p.category}): a wrapped, staked, bridged or exchange product of a token that already trades`;
  }
  if (VERSIONED.test(p.name)) return 'versioned variant: the name ends in a release marker, a pool of another protocol';
  if (/\b(wrapped|staked|staking)\b/i.test(p.name)) return 'wrapped or staked variant of another protocol, by name';
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return 'exchange product line: an exchange\'s own product, not an independent launch';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token, and passed by the hygiene. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The clean comps: tokenized protocols that pass the same hygiene — the model's evidence base. */
export function cleanComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && exclusionReason(p) === null,
  );
}

/**
 * The peer multiples of a protocol list: for every category, the median market-cap / TVL ratio
 * of the protocols in it, plus the list-wide median. Categories under MIN_COMPS peers are listed
 * with their count but priced by the list-wide median instead. Every multiple is rounded to 4
 * decimals here, at the source, so any recompute uses the identical number.
 */
export function multiplesFromProtocols(protocols: SnapshotProtocol[], model: ModelConstants = MODEL): MultipleTable {
  const ratiosByCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    all.push(ratio);
    const key = p.category ?? '';
    const list = ratiosByCategory.get(key);
    if (list === undefined) ratiosByCategory.set(key, [ratio]);
    else list.push(ratio);
  }
  const globalMultiple = round4(all.length > 0 ? clampMultiple(median(all), model) : model.multiple_floor);
  const byCategory: CategoryMultiple[] = [...ratiosByCategory.entries()]
    .map(([category, ratios]) => ({
      category,
      multiple: ratios.length >= model.min_comps ? round4(clampMultiple(median(ratios), model)) : globalMultiple,
      comps: ratios.length,
    }))
    .sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return { global_multiple: globalMultiple, global_comps: all.length, by_category: byCategory };
}

/** The peer multiples of one snapshot (all tokenized protocols, as radar-2 computed them). */
export function categoryMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): MultipleTable {
  return multiplesFromProtocols(snapshot.protocols, model);
}

/** The multiple that prices one protocol under a table: its category's own, or the stand-in. */
export function multipleFor(table: MultipleTable, category: string | null): { multiple: number; comps: number } {
  const hit = table.by_category.find((c) => c.category === (category ?? ''));
  if (hit === undefined) return { multiple: table.global_multiple, comps: 0 };
  return { multiple: hit.multiple, comps: hit.comps };
}

/** A fitted size curve: log10(mcap) = intercept + slope x log10(TVL), by ordinary least squares. */
export interface CurveFit {
  intercept: number;
  slope: number;
}

/** Fit the size curve to a comp list. */
export function fitCurve(pool: SnapshotProtocol[], deflate?: (p: SnapshotProtocol) => number): CurveFit {
  const n = pool.length;
  let mx = 0;
  let my = 0;
  const xs = pool.map((p) => Math.log10(p.tvl_usd));
  const ys = pool.map((p) => Math.log10(p.mcap_usd! / (deflate === undefined ? 1 : deflate(p))));
  for (let i = 0; i < n; i++) {
    mx += xs[i]!;
    my += ys[i]!;
  }
  mx /= n;
  my /= n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const slope = den > 0 ? num / den : 0;
  // Rounded to 4 decimals at the source, like radar-2's multiples: the board's arithmetic and
  // the dashboard's recompute use the identical fit and agree to the dollar.
  return { intercept: round4(my - slope * mx), slope: round4(slope) };
}

/** The curve's value at one TVL. */
export function curveValue(fit: CurveFit, tvl: number): number {
  return Math.pow(10, fit.intercept + fit.slope * Math.log10(tvl));
}

/**
 * The median (least-absolute-deviations) size curve through a comp pool: the line minimising
 * the total absolute log error, instead of the least-squares line. An optimal two-parameter
 * LAD line passes through at least two of the points, so the exact optimum is found by pricing
 * every pair's line over the pool and keeping the cheapest total. Deterministic: pairs are
 * enumerated in pool order and a line must be strictly cheaper to displace the incumbent, so
 * ties keep the earliest pair. Rounded to 4 decimals at the source, like the OLS fit.
 */
export function fitCurveLAD(pool: SnapshotProtocol[]): CurveFit {
  if (pool.length < 2) return fitCurve(pool);
  const xs = pool.map((p) => Math.log10(p.tvl_usd));
  const ys = pool.map((p) => Math.log10(p.mcap_usd!));
  let best: { a: number; b: number; cost: number } | null = null;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (xs[i] === xs[j]) continue;
      const b = (ys[j]! - ys[i]!) / (xs[j]! - xs[i]!);
      const a = ys[i]! - b * xs[i]!;
      let cost = 0;
      for (let k = 0; k < pool.length; k++) {
        cost += Math.abs(ys[k]! - (a + b * xs[k]!));
        if (best !== null && cost >= best.cost) break;
      }
      if (best === null || cost < best.cost) best = { a, b, cost };
    }
  }
  if (best === null) return fitCurve(pool);
  return { intercept: round4(best.a), slope: round4(best.b) };
}

/**
 * The Huber size curve (candidate I): an M-estimator between least squares and the median fit.
 * Iteratively reweighted least squares from the OLS start, with the model's tuning constant in
 * log10 space — residuals inside it count quadratically, beyond it linearly, so a comp's pull on
 * the line never exceeds the constant's. A fixed iteration count keeps the fit deterministic;
 * the weights have long settled before it runs out. Rounded to 4 decimals at the source.
 */
export function fitCurveHuber(pool: SnapshotProtocol[], model: ModelConstants = MODEL): CurveFit {
  if (pool.length < 2) return fitCurve(pool);
  const xs = pool.map((p) => Math.log10(p.tvl_usd));
  const ys = pool.map((p) => Math.log10(p.mcap_usd!));
  let { intercept: a, slope: b } = fitCurve(pool);
  for (let iter = 0; iter < model.huber_iterations; iter++) {
    const ws = xs.map((x, i) => {
      const r = Math.abs(ys[i]! - (a + b * x));
      return r <= model.huber_delta ? 1 : model.huber_delta / r;
    });
    let sw = 0;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < xs.length; i++) {
      sw += ws[i]!;
      mx += ws[i]! * xs[i]!;
      my += ws[i]! * ys[i]!;
    }
    mx /= sw;
    my /= sw;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += ws[i]! * (xs[i]! - mx) * (ys[i]! - my);
      den += ws[i]! * (xs[i]! - mx) * (xs[i]! - mx);
    }
    b = den > 0 ? num / den : 0;
    a = my - b * mx;
  }
  return { intercept: round4(a), slope: round4(b) };
}

/**
 * The two-estimator blend fit (candidate J): the average of the least-squares and median fits.
 * The geometric mean of two power laws is the power law of their averaged coefficients, so the
 * blend is itself one curve, with one intercept and one slope, rounded at the source.
 */
export function fitBlend(pool: SnapshotProtocol[]): CurveFit {
  const ols = fitCurve(pool);
  const lad = fitCurveLAD(pool);
  return { intercept: round4((ols.intercept + lad.intercept) / 2), slope: round4((ols.slope + lad.slope) / 2) };
}

/** The growth covariate of the fitted-coefficient candidates: the 7-day change, clamped as radar-2 clamps it, in units of 1. */
export function growthCovariate(p: SnapshotProtocol, model: ModelConstants): number {
  const raw = finite(p.change_7d, 0);
  return Math.min(model.growth_cap, Math.max(model.growth_floor, raw)) / 100;
}

/** The maturity covariate: the protocol's age as a fraction of the model's maturity horizon. */
export function ageFraction(p: SnapshotProtocol, asOf: string, model: ModelConstants): number {
  const a = ageDays(asOf, p.listed_at) ?? model.unknown_age_days;
  return Math.min(Math.max(a, 0), model.maturity_days) / model.maturity_days;
}

/** The breadth covariate: log10 of one plus the chain count. */
export function breadthCovariate(p: SnapshotProtocol): number {
  return Math.log10(1 + p.chains.length);
}

/** A positive floor under every fitted adjustment multiplier: a guard, not a parameter — no fitted term may price a row at zero. */
const ADJ_FLOOR = 0.05;

/**
 * The least-squares fit of one linear adjustment term, (1 + coefficient x covariate), against
 * a pool's log residuals: the coefficient minimising the sum of squared
 * (residual − log10(1 + coefficient x covariate)). One parameter, fitted in-window, never
 * hand-set; found by golden-section search on a fixed bracket at a fixed iteration count, so
 * the fit is deterministic.
 */
function fitLinearTerm(residuals: number[], covariates: number[]): number {
  const sse = (b: number): number =>
    residuals.reduce((s, r, i) => {
      const d = r - Math.log10(Math.max(ADJ_FLOOR, 1 + b * covariates[i]!));
      return s + d * d;
    }, 0);
  let lo = -5;
  let hi = 5;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  let fc = sse(c);
  let fd = sse(d);
  for (let iter = 0; iter < 200; iter++) {
    if (fc < fd) {
      hi = d;
      d = c;
      fd = fc;
      c = hi - gr * (hi - lo);
      fc = sse(c);
    } else {
      lo = c;
      c = d;
      fc = fd;
      d = lo + gr * (hi - lo);
      fd = sse(d);
    }
  }
  return (lo + hi) / 2;
}

/** Candidate M's growth coefficient: the least-squares fit of the (1 + beta x change) term on the curve's residuals over the pool. */
export function fitGrowthBeta(pool: SnapshotProtocol[], fit: CurveFit, model: ModelConstants): number {
  return fitLinearTerm(
    pool.map((p) => Math.log10(p.mcap_usd! / curveValue(fit, p.tvl_usd))),
    pool.map((p) => growthCovariate(p, model)),
  );
}

/** Candidate N's maturity coefficient: the same fit, on the residuals candidate M leaves behind. */
export function fitMaturityGamma(pool: SnapshotProtocol[], fit: CurveFit, beta: number, asOf: string, model: ModelConstants): number {
  return fitLinearTerm(
    pool.map((p) => Math.log10(p.mcap_usd! / (curveValue(fit, p.tvl_usd) * Math.max(ADJ_FLOOR, 1 + beta * growthCovariate(p, model))))),
    pool.map((p) => ageFraction(p, asOf, model)),
  );
}

/** Candidate O's breadth coefficient: least squares, through the origin, of the curve's log residuals on the breadth covariate. */
export function fitBreadthTheta(pool: SnapshotProtocol[], fit: CurveFit): number {
  let num = 0;
  let den = 0;
  for (const p of pool) {
    const c = breadthCovariate(p);
    num += c * Math.log10(p.mcap_usd! / curveValue(fit, p.tvl_usd));
    den += c * c;
  }
  return den > 0 ? num / den : 0;
}

/** How many comps a category needs before the hybrid gives it a curve of its own. */
export const HYBRID_MIN_COMPS = 12;

/**
 * The hybrid fit: the global OLS curve, plus one curve per deep category (at least
 * HYBRID_MIN_COMPS comps), each shrunk toward the global curve with the model's shrink_k —
 * the same empirical-Bayes pull the category factors use. Every fit is rounded at the source.
 */
export function fitHybrid(pool: SnapshotProtocol[], model: ModelConstants): { global: CurveFit; curves: Map<string, CurveFit> } {
  const global = fitCurve(pool);
  const byCategory = new Map<string, SnapshotProtocol[]>();
  for (const p of pool) {
    const key = p.category ?? '';
    const list = byCategory.get(key);
    if (list === undefined) byCategory.set(key, [p]);
    else list.push(p);
  }
  const curves = new Map<string, CurveFit>();
  for (const [category, members] of byCategory) {
    const n = members.length;
    if (n < HYBRID_MIN_COMPS) continue;
    const cf = fitCurve(members);
    curves.set(category, {
      intercept: round4((n * cf.intercept + model.shrink_k * global.intercept) / (n + model.shrink_k)),
      slope: round4((n * cf.slope + model.shrink_k * global.slope) / (n + model.shrink_k)),
    });
  }
  return { global, curves };
}

/** radar-2's growth multiplier for one protocol, unchanged in shape. */
export function growthMultiplier(p: SnapshotProtocol, model: ModelConstants): { pct: number; mult: number } {
  const raw = finite(p.change_7d, 0);
  const pct = Math.min(model.growth_cap, Math.max(model.growth_floor, raw));
  return { pct, mult: 1 + (pct / 100) * model.growth_weight };
}

/** radar-2's maturity multiplier for one protocol, unchanged in shape. */
export function maturityMultiplier(age: number | null, model: ModelConstants): number {
  const a = age ?? model.unknown_age_days;
  return model.maturity_floor + (Math.min(Math.max(a, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
}

/** The shrunk category residual factors of a comp pool under a fit: median actual/curve per category, pulled toward 1. */
function categoryFactors(pool: SnapshotProtocol[], fit: CurveFit, model: ModelConstants): Map<string, number> {
  const byCategory = new Map<string, number[]>();
  for (const p of pool) {
    const key = p.category ?? '';
    const list = byCategory.get(key);
    const ratio = p.mcap_usd! / curveValue(fit, p.tvl_usd);
    if (list === undefined) byCategory.set(key, [ratio]);
    else list.push(ratio);
  }
  const out = new Map<string, number>();
  for (const [category, ratios] of byCategory) {
    const n = ratios.length;
    out.set(category, (n * median(ratios) + model.shrink_k * 1) / (n + model.shrink_k));
  }
  return out;
}

/** A candidate pricer: a protocol priced from a comp pool that does not contain it. */
type Pricer = (target: SnapshotProtocol, pool: SnapshotProtocol[], asOf: string, model: ModelConstants) => number;

/** Candidate A: radar-2 itself — category median multiple x growth x maturity. */
const priceA: Pricer = (target, pool, asOf, model) => {
  const table = multiplesFromProtocols(pool, model);
  const { multiple } = multipleFor(table, target.category);
  const age = ageDays(asOf, target.listed_at);
  return target.tvl_usd * multiple * growthMultiplier(target, model).mult * maturityMultiplier(age, model);
};

/** Candidate B: the fitted size curve alone. */
const priceB: Pricer = (target, pool) => curveValue(fitCurve(pool), target.tvl_usd);

/** Candidate C: the size curve with a shrunk, damped category factor. */
const priceC: Pricer = (target, pool, _asOf, model) => {
  const fit = fitCurve(pool);
  const factors = categoryFactors(pool, fit, model);
  const factor = factors.get(target.category ?? '') ?? 1;
  return curveValue(fit, target.tvl_usd) * Math.pow(factor, model.category_gamma);
};

/** Candidate D: candidate C plus radar-2's growth term. */
const priceD: Pricer = (target, pool, asOf, model) =>
  priceC(target, pool, asOf, model) * growthMultiplier(target, model).mult;

/** Candidate E (the winner): the size curve with radar-2's growth and maturity adjustments. */
const priceE: Pricer = (target, pool, asOf, model) => {
  const age = ageDays(asOf, target.listed_at);
  return curveValue(fitCurve(pool), target.tvl_usd) * growthMultiplier(target, model).mult * maturityMultiplier(age, model);
};

/** Candidate F: candidate E with the curve fitted to adjustment-deflated market caps. */
const priceF: Pricer = (target, pool, asOf, model) => {
  const deflate = (p: SnapshotProtocol): number => {
    const age = ageDays(asOf, p.listed_at);
    return growthMultiplier(p, model).mult * maturityMultiplier(age, model);
  };
  const age = ageDays(asOf, target.listed_at);
  return curveValue(fitCurve(pool, deflate), target.tvl_usd) * deflate(target);
};

/** Candidate G: the size curve fitted by median (least-absolute-deviations) regression. */
const priceG: Pricer = (target, pool) => curveValue(fitCurveLAD(pool), target.tvl_usd);

/** Candidate H: the hybrid — a shrunk category curve where a category is deep, the global curve elsewhere. */
const priceH: Pricer = (target, pool, _asOf, model) => {
  const { global, curves } = fitHybrid(pool, model);
  return curveValue(curves.get(target.category ?? '') ?? global, target.tvl_usd);
};

/** Candidate I: the Huber size curve — between least squares and the median fit. */
const priceI: Pricer = (target, pool, _asOf, model) => curveValue(fitCurveHuber(pool, model), target.tvl_usd);

/** Candidate J: the two-estimator ensemble — the geometric mean of the least-squares and median curves. */
const priceJ: Pricer = (target, pool) => curveValue(fitBlend(pool), target.tvl_usd);

/** Candidate C2: candidate C's category factor with the strong shrinkage weight (k = 16, not 4). */
const priceC2: Pricer = (target, pool, asOf, model) => priceC(target, pool, asOf, { ...model, shrink_k: model.category_shrink_k_strong });

/** Candidate M: the median curve times a fitted growth term, (1 + beta x clamped 7-day change). */
const priceM: Pricer = (target, pool, _asOf, model) => {
  const fit = fitCurveLAD(pool);
  const beta = fitGrowthBeta(pool, fit, model);
  return curveValue(fit, target.tvl_usd) * Math.max(ADJ_FLOOR, 1 + beta * growthCovariate(target, model));
};

/** Candidate N: candidate M times a fitted maturity term, (1 + gamma x age fraction). */
const priceN: Pricer = (target, pool, asOf, model) => {
  const fit = fitCurveLAD(pool);
  const beta = fitGrowthBeta(pool, fit, model);
  const gamma = fitMaturityGamma(pool, fit, beta, asOf, model);
  return (
    curveValue(fit, target.tvl_usd) *
    Math.max(ADJ_FLOOR, 1 + beta * growthCovariate(target, model)) *
    Math.max(ADJ_FLOOR, 1 + gamma * ageFraction(target, asOf, model))
  );
};

/** Candidate O: the median curve with a fitted chain-breadth term added in log space. */
const priceO: Pricer = (target, pool) => {
  const fit = fitCurveLAD(pool);
  const theta = fitBreadthTheta(pool, fit);
  return curveValue(fit, target.tvl_usd) * Math.pow(10, theta * breadthCovariate(target));
};

const CANDIDATES: { id: string; label: string; pricer: Pricer }[] = [
  { id: 'A', label: 'radar-2: category median multiple x growth x maturity', pricer: priceA },
  { id: 'B', label: 'fitted size curve alone (least squares)', pricer: priceB },
  { id: 'C', label: 'size curve + shrunk, damped category factor', pricer: priceC },
  { id: 'D', label: 'size curve + category factor + growth', pricer: priceD },
  { id: 'E', label: 'size curve x growth x maturity', pricer: priceE },
  { id: 'F', label: 'size curve fitted to adjustment-deflated caps, x growth x maturity', pricer: priceF },
  { id: 'G', label: 'median (LAD) size curve', pricer: priceG },
  { id: 'H', label: 'hybrid: global curve + shrunk category curves (12+ comps)', pricer: priceH },
  { id: 'I', label: 'Huber size curve (delta 0.35 in log10 space)', pricer: priceI },
  { id: 'J', label: 'two-estimator ensemble: geometric mean of the OLS and median curves', pricer: priceJ },
  { id: 'M', label: 'median curve x fitted growth term (one coefficient)', pricer: priceM },
  { id: 'N', label: 'median curve x fitted growth x fitted maturity (one coefficient each)', pricer: priceN },
  { id: 'O', label: 'median curve + fitted chain-breadth term (one coefficient)', pricer: priceO },
  { id: 'C2', label: 'size curve + category factor, strong shrinkage (k = 16)', pricer: priceC2 },
];

/** The candidate pricers by id, for every place that must price with the shipped model. */
const PRICER_BY_ID = new Map(CANDIDATES.map((c) => [c.id, c.pricer]));

/**
 * The shipped model's curve fit of a comp pool: each winning estimator's own fit. The adjusted
 * winners (M, N, O) ride on the median fit; their coefficients live in the backtest's adjustments.
 */
export function fitShipped(pool: SnapshotProtocol[], winner: string, model: ModelConstants = MODEL): CurveFit {
  if (winner === 'I') return fitCurveHuber(pool, model);
  if (winner === 'J') return fitBlend(pool);
  if (winner === 'G' || winner === 'M' || winner === 'N' || winner === 'O') return fitCurveLAD(pool);
  return fitCurve(pool);
}

/** Leave-one-out residuals of one pricer over the comps: log10(actual / predicted) per comp. */
function looErrors(pricer: Pricer, comps: SnapshotProtocol[], asOf: string, model: ModelConstants): number[] {
  return comps.map((target, i) => {
    const pool = comps.filter((_, j) => j !== i);
    return Math.log10(target.mcap_usd! / pricer(target, pool, asOf, model));
  });
}

/** A conformal quantile of sorted values: the ceil((n+1)q)-th smallest, the finite-sample correction. */
function conformalQuantile(sorted: number[], q: number): number {
  const n = sorted.length;
  const k = Math.min(n, Math.max(1, Math.ceil((n + 1) * q)));
  return sorted[k - 1]!;
}

/** A central conformal band over sorted residual ratios at nominal level (1 - alpha), plus its achieved coverage. */
function conformalBand(sortedRatios: number[], alpha: number): { lo: number; hi: number; achieved: number } {
  const lo = conformalQuantile(sortedRatios, alpha / 2);
  const hi = conformalQuantile(sortedRatios, 1 - alpha / 2);
  const inside = sortedRatios.filter((r) => r >= lo && r <= hi).length;
  return { lo, hi, achieved: Math.round((inside / sortedRatios.length) * 1000) / 10 };
}

/** Spearman's rank correlation between two equal-length series (average ranks for ties). */
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]): number[] => {
    const order = v.map((_, i) => i).sort((a, b) => v[a]! - v[b]!);
    const out = new Array<number>(v.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && v[order[j + 1]!] === v[order[i]!]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[order[k]!] = avg;
      i = j + 1;
    }
    return out;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) * (rx[i]! - mx);
    dy += (ry[i]! - my) * (ry[i]! - my);
  }
  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
}

/**
 * The backtest that shapes the model. Leave-one-out grades every candidate over the clean
 * comps and calibrates the shipped model's bands; a two-origin rolling hindcast (fit the
 * oldest half, grade the next sixth; fit the oldest two-thirds, grade the newest third) then
 * decides what ships under a pre-registered gate — the split that chooses is never the split
 * that calibrates. The shipped model's own leave-one-out residuals build the conformal bands,
 * global and per TVL tercile, and the rank validation grades the ranking itself.
 */
export function runBacktest(snapshot: Snapshot, model: ModelConstants = MODEL): Backtest {
  const comps = cleanComps(snapshot);
  const graded = CANDIDATES.map((c) => {
    const errors = looErrors(c.pricer, comps, snapshot.as_of, model);
    const abs = errors.map((e) => Math.abs(e)).sort((a, b) => a - b);
    const med = median(abs);
    const within = (factor: number): number =>
      Math.round((abs.filter((e) => e <= Math.log10(factor)).length / abs.length) * 1000) / 10;
    return {
      id: c.id,
      label: c.label,
      median_abs_log10_error: round4(med),
      median_error_factor: round4(Math.pow(10, med)),
      within_2x_pct: within(2),
      within_3x_pct: within(3),
      errors,
    };
  });
  const looRanked = [...graded].sort(
    (a, b) => a.median_abs_log10_error - b.median_abs_log10_error || b.within_2x_pct - a.within_2x_pct,
  );
  const looWinner = looRanked[0]!;

  // The two-origin hindcast (the round-5 gate): dated comps by listing date. Origin 1 fits the
  // oldest half and grades the next sixth; origin 2 fits the oldest two-thirds and grades the
  // newest third — radar-4's original split, kept as the second origin so its grades continue.
  // Every candidate is graded on both origins; the gate below decides what ships, so a decision
  // must survive two eras, not one draw. The incumbent is G, the standing median curve.
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const cut1 = Math.ceil(dated.length / 2);
  const cut2 = Math.ceil((dated.length * 2) / 3);
  const origins = [
    { label: 'origin 1: fit oldest 50%, grade the next sixth', train: dated.slice(0, cut1), test: dated.slice(cut1, cut2) },
    { label: 'origin 2: fit oldest two-thirds, grade the newest third', train: dated.slice(0, cut2), test: dated.slice(cut2) },
  ];
  const gradeOn = (pricer: Pricer, train: SnapshotProtocol[], test: SnapshotProtocol[]): { med: number; within_2x_pct: number } => {
    const errs = test.map((t) => Math.abs(Math.log10(t.mcap_usd! / pricer(t, train, snapshot.as_of, model))));
    return {
      med: median(errs),
      within_2x_pct: Math.round((errs.filter((e) => e <= Math.log10(2)).length / errs.length) * 1000) / 10,
    };
  };
  const originGrades = origins.map((o) => ({
    ...o,
    grades: CANDIDATES.map((c) => {
      const g = gradeOn(c.pricer, o.train, o.test);
      return { id: c.id, median_error_factor: round4(Math.pow(10, g.med)), within_2x_pct: g.within_2x_pct };
    }),
  }));
  const factorAt = (originIdx: number, id: string): number => originGrades[originIdx]!.grades.find((g) => g.id === id)!.median_error_factor;
  const meanFactor = (id: string): number => (factorAt(0, id) + factorAt(1, id)) / 2;

  // The fitted coefficients on each origin's training era alone: the sign-stability evidence.
  const originFits = origins.map((o) => {
    const lad = fitCurveLAD(o.train);
    const beta = fitGrowthBeta(o.train, lad, model);
    return { beta, gamma: fitMaturityGamma(o.train, lad, beta, snapshot.as_of, model), theta: fitBreadthTheta(o.train, lad) };
  });
  const fullFit = fitCurveLAD(comps);
  const fullBeta = fitGrowthBeta(comps, fullFit, model);
  const adjustments = {
    beta: round4(fullBeta),
    gamma: round4(fitMaturityGamma(comps, fullFit, fullBeta, snapshot.as_of, model)),
    theta: round4(fitBreadthTheta(comps, fullFit)),
  };

  // Category-factor materiality: how many board rows the factor reprices by more than 5%
  // against the incumbent, priced from the full comp pool.
  const rankable = snapshot.protocols.filter((p) => isRankable(p));
  const movedRows = (pricer: Pricer): number =>
    rankable.filter((p) => Math.abs(pricer(p, comps, snapshot.as_of, model) / priceG(p, comps, snapshot.as_of, model) - 1) > 0.05).length;

  // The gate, pre-registered before it ran: a challenger replaces the incumbent only if its
  // mean hindcast median error across both origins beats the incumbent's by at least 5%
  // relative (the ensemble J: 10% — it costs the entry its one-curve story), it loses neither
  // origin by more than 10% relative, a fitted coefficient keeps its sign at both origins, and
  // a category factor actually reprices at least 10 board rows by over 5%. Wins inside the
  // margin are recorded as ties and the incumbent stays.
  const incumbentMean = meanFactor('G');
  const verdictById = new Map<string, string>();
  const passers: { id: string; mean: number }[] = [];
  for (const id of ['I', 'J', 'M', 'N', 'O', 'C', 'C2']) {
    const mean = meanFactor(id);
    const margin = id === 'J' ? 0.1 : 0.05;
    let verdict: string | null = null;
    if (id === 'M' || id === 'N' || id === 'O') {
      const coefs =
        id === 'M'
          ? [originFits[0]!.beta, originFits[1]!.beta]
          : id === 'N'
            ? [originFits[0]!.gamma, originFits[1]!.gamma]
            : [originFits[0]!.theta, originFits[1]!.theta];
      if (coefs[0] === 0 || coefs[1] === 0 || Math.sign(coefs[0]!) !== Math.sign(coefs[1]!))
        verdict = `rejected: its fitted coefficient flips sign between origins (${round4(coefs[0]!)} at origin 1, ${round4(coefs[1]!)} at origin 2) — era noise, not signal`;
    }
    if (verdict === null && (factorAt(0, id) > factorAt(0, 'G') * 1.1 || factorAt(1, id) > factorAt(1, 'G') * 1.1))
      verdict = 'rejected: it loses one origin to the incumbent by more than 10% relative';
    if (verdict === null && (id === 'C' || id === 'C2') && movedRows(PRICER_BY_ID.get(id)!) < 10)
      verdict = 'rejected: it reprices fewer than 10 board rows by more than 5% — a win that changes nothing ships nothing';
    if (verdict === null && mean > incumbentMean * (1 - margin))
      verdict = `recorded as a tie: its mean win over the incumbent is inside the ${Math.round(margin * 100)}% margin — the incumbent stays`;
    if (verdict === null) passers.push({ id, mean });
    else verdictById.set(id, verdict);
  }
  passers.sort((a, b) => a.mean - b.mean);
  let shippedId = 'G';
  let shippedMean = incumbentMean;
  if (passers.length > 0) {
    shippedId = passers[0]!.id;
    shippedMean = passers[0]!.mean;
    for (const p of passers)
      verdictById.set(
        p.id,
        p.id === shippedId
          ? 'ships: it clears the two-origin gate with the lowest mean'
          : 'clears the two-origin gate, but another challenger grades lower and ships',
      );
  }
  const gateVerdicts = ['I', 'J', 'M', 'N', 'O', 'C', 'C2'].map((id) => ({ id, verdict: verdictById.get(id)! }));
  const hindShipped = originGrades[1]!.grades.find((g) => g.id === shippedId)!;
  const shippedErrors = graded.find((g) => g.id === shippedId)!.errors;
  const shippedMedFactor = Math.pow(10, median(shippedErrors.map((e) => Math.abs(e))));
  const hindTestFactor = hindShipped.median_error_factor;

  // Proper log scores of the leave-one-out predictive distributions: the mean log density of
  // the realised caps under a lognormal centred on each candidate's held-out prediction, with
  // that candidate's own residual spread (the sample SD of its leave-one-out log residuals).
  // A strictly proper rule: it grades centre and spread together and cannot be gamed by
  // widening a band.
  const logScores = graded.map((g) => {
    const n = g.errors.length;
    const mean = g.errors.reduce((s, e) => s + e, 0) / n;
    const sigma = Math.sqrt(g.errors.reduce((s, e) => s + (e - mean) * (e - mean), 0) / Math.max(1, n - 1));
    const mls =
      sigma > 0 ? g.errors.reduce((s, e) => s + (-0.5 * Math.log(2 * Math.PI) - Math.log(sigma) - (e * e) / (2 * sigma * sigma)), 0) / n : 0;
    return { id: g.id, mean_log_score: round4(mls), sigma: round4(sigma) };
  });

  // Conformal bands from the shipped model's residuals: global, and per comp-TVL tercile.
  const ratios = shippedErrors.map((e) => Math.pow(10, e)).sort((a, b) => a - b);
  const globalBand = conformalBand(ratios, 0.5);
  const compTvls = comps.map((p) => p.tvl_usd).sort((a, b) => a - b);
  const edge1 = compTvls[Math.floor(compTvls.length / 3)]!;
  const edge2 = compTvls[Math.floor((2 * compTvls.length) / 3)]!;
  const bucketRatios: number[][] = [[], [], []];
  comps.forEach((p, i) => {
    const b = p.tvl_usd <= edge1 ? 0 : p.tvl_usd <= edge2 ? 1 : 2;
    bucketRatios[b]!.push(Math.pow(10, shippedErrors[i]!));
  });
  const bucketFactors = bucketRatios.map((rs) => {
    if (rs.length < 12) return { lo: round4(globalBand.lo), hi: round4(globalBand.hi) };
    const band = conformalBand([...rs].sort((a, b) => a - b), 0.5);
    return { lo: round4(band.lo), hi: round4(band.hi) };
  });
  const calibration: CalibrationPoint[] = [0.5, 0.2, 0.1].map((alpha) => ({
    nominal_pct: Math.round((1 - alpha) * 100),
    achieved_pct: conformalBand(ratios, alpha).achieved,
  }));

  // Rank validation: the held-out ranking against the actual ranking, and what each predicted
  // decile actually realised (median realized multiple, robust to the tail).
  const shippedPricer = PRICER_BY_ID.get(shippedId)!;
  const looPreds = comps.map((t, i) => shippedPricer(t, comps.filter((_, j) => j !== i), snapshot.as_of, model));
  const rankIc = spearman(looPreds, comps.map((p) => p.mcap_usd!));
  const byPred = comps.map((_, i) => i).sort((a, b) => looPreds[a]! - looPreds[b]!);
  const deciles: number[] = [];
  for (let d = 0; d < 10; d++) {
    const group = byPred.slice(Math.floor((d * byPred.length) / 10), Math.floor(((d + 1) * byPred.length) / 10));
    deciles.push(round4(median(group.map((i) => comps[i]!.mcap_usd! / comps[i]!.tvl_usd))));
  }

  // The shipped fit's precision. A least-squares fit takes the analytic standard error and
  // R-squared; the median fit takes a jackknife standard error for its slope and the L1
  // pseudo-R-squared (absolute deviation explained against the median cap); the Huber fit and
  // the blend jackknife their own refits — each estimator graded in its own loss, and
  // method.md says which is which.
  const fit = fitShipped(comps, shippedId, model);
  const xs = comps.map((p) => Math.log10(p.tvl_usd));
  const ys = comps.map((p) => Math.log10(p.mcap_usd!));
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let slopeCi95: [number, number];
  let r2: number;
  if (shippedId === 'G' || shippedId === 'M' || shippedId === 'N' || shippedId === 'O') {
    const thetas = comps.map((_, j) => fitCurveLAD(comps.filter((_, k) => k !== j)).slope);
    const tMean = thetas.reduce((s, v) => s + v, 0) / thetas.length;
    const varJack = thetas.length > 1 ? ((thetas.length - 1) / thetas.length) * thetas.reduce((s, t) => s + (t - tMean) * (t - tMean), 0) : 0;
    const se = Math.sqrt(varJack);
    slopeCi95 = [round4(fit.slope - 1.96 * se), round4(fit.slope + 1.96 * se)];
    const medY = median(ys);
    let l1Fit = 0;
    let l1Null = 0;
    xs.forEach((x, i) => {
      l1Fit += Math.abs(ys[i]! - (fit.intercept + fit.slope * x));
      l1Null += Math.abs(ys[i]! - medY);
    });
    r2 = round4(l1Null > 0 ? 1 - l1Fit / l1Null : 0);
  } else if (shippedId === 'I' || shippedId === 'J') {
    // The Huber fit and the blend take a jackknife standard error over their own refits, and
    // the L1 pseudo-R-squared over their leave-one-out residuals.
    const thetas = comps.map((_, j) => fitShipped(comps.filter((_, k) => k !== j), shippedId, model).slope);
    const tMean = thetas.reduce((s, v) => s + v, 0) / thetas.length;
    const varJack = thetas.length > 1 ? ((thetas.length - 1) / thetas.length) * thetas.reduce((s, t) => s + (t - tMean) * (t - tMean), 0) : 0;
    const se = Math.sqrt(varJack);
    slopeCi95 = [round4(fit.slope - 1.96 * se), round4(fit.slope + 1.96 * se)];
    const medY = median(ys);
    const l1Fit = shippedErrors.reduce((s, e) => s + Math.abs(e), 0);
    const l1Null = ys.reduce((s, y) => s + Math.abs(y - medY), 0);
    r2 = round4(l1Null > 0 ? 1 - l1Fit / l1Null : 0);
  } else {
    let ssRes = 0;
    let ssTot = 0;
    let sxx = 0;
    xs.forEach((x, i) => {
      const yhat = fit.intercept + fit.slope * x;
      ssRes += (ys[i]! - yhat) * (ys[i]! - yhat);
      ssTot += (ys[i]! - my) * (ys[i]! - my);
      sxx += (x - mx) * (x - mx);
    });
    const se = xs.length > 2 && sxx > 0 ? Math.sqrt(ssRes / (xs.length - 2) / sxx) : 0;
    slopeCi95 = [round4(fit.slope - 1.96 * se), round4(fit.slope + 1.96 * se)];
    r2 = round4(ssTot > 0 ? 1 - ssRes / ssTot : 0);
  }

  return {
    comps: comps.length,
    selection_rule:
      'leave-one-out grades every candidate and calibrates the bands; a two-origin hindcast (fit the oldest half, grade the next sixth; fit the oldest two-thirds, grade the newest third) decides what ships under a pre-registered gate — a challenger needs a 5% mean win over the incumbent across both origins (10% for the ensemble), no origin lost by over 10%, a stable coefficient sign for fitted terms, and real board impact for a category factor — so the split that chooses is not the split that calibrates the bands',
    candidates: graded.map((g) => ({
      id: g.id,
      label: g.label,
      median_abs_log10_error: g.median_abs_log10_error,
      median_error_factor: g.median_error_factor,
      within_2x_pct: g.within_2x_pct,
      within_3x_pct: g.within_3x_pct,
      winner: g.id === shippedId,
    })),
    winner: shippedId,
    curve_intercept: round4(fit.intercept),
    curve_slope: round4(fit.slope),
    curve_slope_ci95: slopeCi95,
    curve_r2: r2,
    band_low_factor: round4(globalBand.lo),
    band_high_factor: round4(globalBand.hi),
    band_buckets: { edges: [Math.round(edge1), Math.round(edge2)], factors: bucketFactors, counts: bucketRatios.map((r) => r.length) },
    band_levels: [0.25, 0.75],
    calibration,
    mean_log10_error: round4(shippedErrors.reduce((s, e) => s + e, 0) / shippedErrors.length),
    residual_quantiles: {
      p10: round4(quantile(ratios, 0.1)),
      p25: round4(quantile(ratios, 0.25)),
      p50: round4(quantile(ratios, 0.5)),
      p75: round4(quantile(ratios, 0.75)),
      p90: round4(quantile(ratios, 0.9)),
    },
    rank_ic: round4(rankIc),
    decile_realized_multiples: deciles,
    hindcast: {
      train_n: origins[1]!.train.length,
      test_n: origins[1]!.test.length,
      test_median_error_factor: round4(hindTestFactor),
      drift: round4(shippedMedFactor > 0 ? hindTestFactor / shippedMedFactor : 0),
      mean_median_error_factor: round4(shippedMean),
    },
    hindcast_grades: CANDIDATES.map((c) => ({
      id: c.id,
      median_error_factor: factorAt(1, c.id),
      within_2x_pct: originGrades[1]!.grades.find((g) => g.id === c.id)!.within_2x_pct,
      origin1_median_error_factor: factorAt(0, c.id),
      mean_median_error_factor: round4(meanFactor(c.id)),
    })),
    hindcast_origins: originGrades.map((o) => ({
      label: o.label,
      train_n: o.train.length,
      test_n: o.test.length,
      grades: o.grades.map((g) => ({ id: g.id, median_error_factor: g.median_error_factor, within_2x_pct: g.within_2x_pct })),
    })),
    fitted_coefficients: {
      beta: [round4(originFits[0]!.beta), round4(originFits[1]!.beta)],
      gamma: [round4(originFits[0]!.gamma), round4(originFits[1]!.gamma)],
      theta: [round4(originFits[0]!.theta), round4(originFits[1]!.theta)],
    },
    adjustments,
    gate_verdicts: gateVerdicts,
    log_scores: logScores,
    thin_evidence_pct: 0,
  };
}

/** The band factors one TVL earns: its comp-tercile bucket's conformal band. */
export function bandFactorsFor(tvl: number, backtest: Backtest): { lo: number; hi: number } {
  const [e1, e2] = backtest.band_buckets.edges;
  const b = tvl <= e1 ? 0 : tvl <= e2 ? 1 : 2;
  return backtest.band_buckets.factors[b]!;
}

/** The shipped model's price of one protocol, with the components the dashboard's waterfall shows. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  fit: CurveFit,
  backtest: Backtest,
): {
  implied: number;
  low: number;
  high: number;
  curve: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  adjMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const curve = curveValue(fit, protocol.tvl_usd);
  // The shipped model is the plain curve unless the gate kept an adjustment: radar-2's asserted
  // terms under E, or the fitted one-coefficient terms under M (growth), N (growth x maturity)
  // and O (breadth, in log space). The coefficients are the backtest's full-pool fits.
  let g = { pct: 0, mult: 1 };
  let m = 1;
  let breadth = 1;
  if (backtest.winner === 'E') {
    g = growthMultiplier(protocol, model);
    m = maturityMultiplier(age, model);
  } else if (backtest.winner === 'M' || backtest.winner === 'N') {
    const x = growthCovariate(protocol, model);
    g = { pct: Math.min(model.growth_cap, Math.max(model.growth_floor, finite(protocol.change_7d, 0))), mult: Math.max(ADJ_FLOOR, 1 + backtest.adjustments.beta * x) };
    if (backtest.winner === 'N') m = Math.max(ADJ_FLOOR, 1 + backtest.adjustments.gamma * ageFraction(protocol, asOf, model));
  } else if (backtest.winner === 'O') {
    breadth = Math.pow(10, backtest.adjustments.theta * breadthCovariate(protocol));
  }
  const implied = Math.max(1, Math.round(curve * g.mult * m * breadth));
  const factors = bandFactorsFor(protocol.tvl_usd, backtest);
  const low = Math.min(implied, Math.max(1, Math.round(implied * factors.lo)));
  const high = Math.max(implied, Math.round(implied * factors.hi));
  return { implied, low, high, curve, growthPct: g.pct, growthMult: g.mult, maturityMult: m, breadthMult: breadth, adjMult: g.mult * m * breadth, age };
}

/** The first word of a name, normalised: the stem the kinship flag compares. */
function nameStem(name: string): string {
  const first = name.trim().split(/[\s-]+/)[0] ?? '';
  return first.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * A row's mechanical concern flags, from snapshot fields only: a name stem shared with a
 * tokenized protocol in the same snapshot, or a stablecoin-issuance category. Flag-only: a
 * flag never changes the ranked value.
 */
export function concernFlags(p: SnapshotProtocol, snapshot: Snapshot): string[] {
  const flags: string[] = [];
  const stem = nameStem(p.name);
  if (stem.length >= 3) {
    const kin = snapshot.protocols.find(
      (q) => q.slug !== p.slug && q.mcap_usd !== null && q.mcap_usd > 0 && nameStem(q.name) === stem,
    );
    if (kin !== undefined) {
      flags.push(
        `possible parent-token family: the name stem "${stem}" is shared with ${kin.name}, whose token already trades in this snapshot`,
      );
    }
  }
  if (p.category !== null && p.category.toLowerCase().includes('stablecoin')) {
    flags.push(
      `stablecoin issuer (${p.category}): its own dollar asset already circulates and the snapshot records no token for the protocol itself, so the implied value is a claim on a future governance token only`,
    );
  }
  return flags;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n, bands, verdicts and flags. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const comps = cleanComps(snapshot);
  const backtest = runBacktest(snapshot, model);
  const fit = fitShipped(comps, backtest.winner);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, ranked like everything else.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The whole rankable field: every strictly pre-token protocol the hygiene passes, at any TVL.
  // Nothing rankable is held back; what the hygiene turns away is published in the audit instead.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => ({ p, ...impliedValue(p, snapshot.as_of, model, fit, backtest) }));
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const byTvl = [...scored].sort((a, b) => b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const tvlRank = new Map(byTvl.map((s, i) => [s.p.slug, i + 1]));

  // Jackknife fragility: refit the curve leaving one comp out at a time and reprice the row;
  // the interquartile spread of those values over the base value is the row's fragility.
  const jackFits = comps.map((_, j) => fitShipped(comps.filter((_, k) => k !== j), backtest.winner));
  const fragilityOf = (s: (typeof scored)[number]): number => {
    const values = jackFits.map((f) => {
      const v = curveValue(f, s.p.tvl_usd) * s.adjMult;
      return v;
    }).sort((a, b) => a - b);
    const iqr = quantile(values, 0.75) - quantile(values, 0.25);
    return s.implied > 0 ? round4(iqr / s.implied) : 0;
  };
  // Category evidence depth: clean comps per category.
  const compsByCategory = new Map<string, number>();
  for (const c of comps) compsByCategory.set(c.category ?? '', (compsByCategory.get(c.category ?? '') ?? 0) + 1);
  // Tokenization base rates per category, shrunk toward the snapshot-wide rate (display only).
  const globalRate = snapshot.protocols.filter((p) => !isPreToken(p)).length / Math.max(1, snapshot.protocols.length);
  const rateByCategory = new Map<string, number>();
  {
    const totals = new Map<string, { tok: number; all: number }>();
    for (const p of snapshot.protocols) {
      const key = p.category ?? '';
      const t = totals.get(key) ?? { tok: 0, all: 0 };
      t.all++;
      if (!isPreToken(p)) t.tok++;
      totals.set(key, t);
    }
    for (const [key, t] of totals) rateByCategory.set(key, (t.tok + model.shrink_k * globalRate) / (t.all + model.shrink_k));
  }
  // Category TVL totals over the whole snapshot, and board ranks inside each category.
  const categoryTvl = new Map<string, number>();
  for (const p of snapshot.protocols) categoryTvl.set(p.category ?? '', (categoryTvl.get(p.category ?? '') ?? 0) + p.tvl_usd);
  const categoryBoardRank = new Map<string, number>();
  {
    const byCategory = new Map<string, typeof scored>();
    for (const s of scored) {
      const key = s.p.category ?? '';
      const list = byCategory.get(key);
      if (list === undefined) byCategory.set(key, [s]);
      else list.push(s);
    }
    for (const list of byCategory.values()) list.forEach((s, i) => categoryBoardRank.set(s.p.slug, i + 1));
  }
  // Contested: the median market cap of the 8 nearest traded neighbours by log-TVL against the curve price.
  const contestedOf = (s: (typeof scored)[number]): { contested: boolean; ratio: number } => {
    const lt = Math.log10(s.p.tvl_usd);
    const neighbours = comps
      .map((c) => ({ d: Math.abs(Math.log10(c.tvl_usd) - lt), mcap: c.mcap_usd! }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
    if (neighbours.length === 0 || s.curve <= 0) return { contested: false, ratio: 1 };
    const med = median(neighbours.map((n) => n.mcap));
    const ratio = med / s.curve;
    return { contested: ratio > 3 || ratio < 1 / 3, ratio: round2(ratio) };
  };

  return scored.map((s, i) => {
    const factors = bandFactorsFor(s.p.tvl_usd, backtest);
    const fragility = fragilityOf(s);
    const catComps = compsByCategory.get(s.p.category ?? '') ?? 0;
    const contested = contestedOf(s);
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      implied_low_usd: s.low,
      implied_high_usd: s.high,
      tvl_rank: tvlRank.get(s.p.slug)!,
      fragility,
      thin_evidence: catComps < model.min_comps || fragility > 0.25,
      category_base_rate: round4(rateByCategory.get(s.p.category ?? '') ?? globalRate),
      contested: contested.contested,
      neighbour_ratio: contested.ratio,
      capital_velocity_usd_day: s.age !== null && s.age > 0 ? Math.round(s.p.tvl_usd / s.age) : null,
      inflow_7d_usd:
        s.p.change_7d !== null && s.p.change_7d > -100 ? Math.round(s.p.tvl_usd - s.p.tvl_usd / (1 + s.p.change_7d / 100)) : null,
      category_tvl_share_pct: round2((s.p.tvl_usd / Math.max(1, categoryTvl.get(s.p.category ?? '') ?? 0)) * 100),
      category_board_rank: categoryBoardRank.get(s.p.slug)!,
      model: {
        curve_value_usd: Math.round(s.curve),
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        age_days: s.age,
        band_low_factor: factors.lo,
        band_high_factor: factors.hi,
      },
      verdict: farmVerdict(s.p, s.age, s.low, s.implied, model),
      concerns: concernFlags(s.p, snapshot),
      farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

/** The exclusion audit: every strictly pre-token protocol the board does not rank, with its reason. */
export function buildAudit(snapshot: Snapshot, board: BoardRow[]): ExclusionAudit {
  const ranked = new Set(board.map((r) => r.slug));
  const excluded: ExcludedRow[] = snapshot.protocols
    .filter((p) => isPreToken(p) && !ranked.has(p.slug))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      tvl_usd: p.tvl_usd,
      reason: exclusionReason(p) ?? 'not ranked',
    }))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const largest = excluded[0];
  return {
    pre_token_total: snapshot.protocols.filter(isPreToken).length,
    ranked: board.length,
    excluded,
    largest_excluded: largest === undefined ? null : { name: largest.name, tvl_usd: largest.tvl_usd, reason: largest.reason },
  };
}

/** The heat panel's per-category stats: peer evidence (shrunk), the board's weight, and an evidence grade. */
export function categoryHeat(snapshot: Snapshot, board: BoardRow[], backtest: Backtest, model: ModelConstants = MODEL): CategoryHeat[] {
  const comps = cleanComps(snapshot);
  const ratiosByCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of comps) {
    const ratio = p.mcap_usd! / p.tvl_usd;
    all.push(ratio);
    const key = p.category ?? '';
    const list = ratiosByCategory.get(key);
    if (list === undefined) ratiosByCategory.set(key, [ratio]);
    else list.push(ratio);
  }
  const globalMedian = all.length > 0 ? median(all) : 0;
  // The shipped model's held-out spread per category, for the evidence grade.
  const shipped = PRICER_BY_ID.get(backtest.winner)!;
  const errors = looErrors(shipped, comps, snapshot.as_of, model);
  const globalMedErr = median(errors.map((e) => Math.abs(e)));
  const errByCategory = new Map<string, number[]>();
  comps.forEach((p, i) => {
    const key = p.category ?? '';
    const list = errByCategory.get(key);
    if (list === undefined) errByCategory.set(key, [Math.abs(errors[i]!)]);
    else list.push(Math.abs(errors[i]!));
  });
  const rowsByCategory = new Map<string, BoardRow[]>();
  for (const r of board) {
    const key = r.category ?? '';
    const list = rowsByCategory.get(key);
    if (list === undefined) rowsByCategory.set(key, [r]);
    else list.push(r);
  }
  const keys = new Set([...ratiosByCategory.keys(), ...rowsByCategory.keys()]);
  return [...keys]
    .map((category) => {
      const ratios = ratiosByCategory.get(category) ?? [];
      const n = ratios.length;
      const shrunk = n > 0 ? (n * median(ratios) + model.shrink_k * globalMedian) / (n + model.shrink_k) : globalMedian;
      const rows = rowsByCategory.get(category) ?? [];
      const tvl = rows.reduce((sum, r) => sum + r.tvl_usd, 0);
      const weighted = rows.reduce((sum, r) => sum + (r.change_7d ?? 0) * r.tvl_usd, 0);
      const catErr = errByCategory.get(category);
      const catMedErr = catErr !== undefined && catErr.length > 0 ? median(catErr) : null;
      const grade: 'A' | 'B' | 'C' =
        n >= 8 && catMedErr !== null && catMedErr <= globalMedErr ? 'A' : n >= model.min_comps ? 'B' : 'C';
      const contestedShare = rows.length > 0 ? Math.round((rows.filter((r) => r.contested).length / rows.length) * 1000) / 10 : 0;
      return {
        category,
        comps: n,
        median_multiple: round4(shrunk),
        board_rows: rows.length,
        pretoken_tvl_usd: tvl,
        aggregate_change_7d: tvl > 0 ? round2(weighted / tvl) : null,
        grade,
        loo_median_error_factor: catMedErr !== null ? round4(Math.pow(10, catMedErr)) : null,
        contested_share_pct: contestedShare,
      };
    })
    .sort((a, b) => b.pretoken_tvl_usd - a.pretoken_tvl_usd || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
}

/**
 * A plan's verdict: the reference position's proceeds under the labelled scenario (a community
 * allocation of verdict_alloc_share of the launch value, shared pro-rata by TVL), netted against
 * the plan's own stated cash costs (setup $3, action $8 — the plan's top gas tier, matching the
 * reference capital — and $2 a week of upkeep over the hold) plus the risk-free charge. Graded
 * at the band's bear end first: FARM nets positive even there, THIN nets positive only at the
 * base value, SKIP nets positive at neither. The verdict grades the plan, never the ranked value.
 */
export function farmVerdict(
  p: SnapshotProtocol,
  age: number | null,
  low: number,
  base: number,
  model: ModelConstants,
): FarmVerdict {
  const capital = model.verdict_reference_capital;
  const hold = holdDaysFor(age);
  const weeks = Math.ceil(hold / 7);
  const cash = 3 + 8 + 2 * weeks;
  const totalCost = cash + (capital * model.risk_free_rate * hold) / 365;
  const share = p.tvl_usd > 0 ? capital / p.tvl_usd : 0;
  const netBear = model.verdict_alloc_share * low * share - totalCost;
  const netBase = model.verdict_alloc_share * base * share - totalCost;
  const verdict = netBear >= 0 ? 'PAYS' : netBase >= 0 ? 'CLOSE' : 'SHORT';
  // The farmer's hurdle: the share of the bear value that must reach the farming side, in
  // basis points, for the reference plan to break even (total cost over bear-case proceeds
  // at a 100% allocation). The EV grid is gross proceeds per $1,000 at the base value.
  const hurdleBps = low * share > 0 ? Math.round((totalCost / (low * share)) * 10_000) : 0;
  const ev = (alloc: number): number => round2(alloc * base * share);
  return {
    verdict,
    net_bear_usd: round2(netBear),
    net_base_usd: round2(netBase),
    total_cost_usd: round2(totalCost),
    reference_capital: capital,
    hurdle_bps: hurdleBps,
    ev_per_1k_usd: [ev(0.05), ev(0.1), ev(0.15)],
  };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('option')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('payment')) return `Route one real payment of about $${capital} through ${name} on ${chain} and keep the receipt.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 * The order matters: find the program before funding it, act weekly so the record is a history and
 * not a spike, hold across snapshots, and claim only from the protocol's own published link.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm ${p.name} with, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `Open ${p.name}'s own app on ${chain} and find its points, rewards or season page; if it runs one, register this same wallet there before you deposit anything.`,
      cost: 'no fee to look, and never pay to register',
      time: '10 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week in ${p.name}, such as a deposit, a borrow, a swap or a vote, so the wallet's record is a history and not a single spike. Farm as one person with one wallet and real activity only: multi-wallet or scripted farming is the standard exclusion ground in distribution rules.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot of the protocol.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, claim only from the link ${p.name} itself publishes, and write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A percentile (0..100) of `value` among `peers`, average-rank style; 50 for a singleton. */
function percentileOf(value: number, peers: number[]): number {
  if (peers.length <= 1) return 50;
  const below = peers.filter((v) => v < value).length;
  const equal = peers.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / peers.length) * 100);
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, categoryPeers: BoardRow[]): RadarRow {
  const pick = (fn: (r: BoardRow) => number | null): (number | null)[] => categoryPeers.map(fn);
  const factor = (value: number | null, peers: (number | null)[]): number | null => {
    if (value === null) return null;
    const clean = peers.filter((v): v is number => v !== null);
    return clean.length > 0 ? percentileOf(value, clean) : null;
  };
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    tvl_rank: row.tvl_rank,
    curve_value_usd: row.model.curve_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    band_low_factor: row.model.band_low_factor,
    band_high_factor: row.model.band_high_factor,
    verdict: row.verdict.verdict,
    net_bear_usd: row.verdict.net_bear_usd,
    net_base_usd: row.verdict.net_base_usd,
    total_cost_usd: row.verdict.total_cost_usd,
    hurdle_bps: row.verdict.hurdle_bps,
    ev_per_1k_usd: row.verdict.ev_per_1k_usd,
    fragility: row.fragility,
    thin_evidence: row.thin_evidence,
    category_base_rate: row.category_base_rate,
    contested: row.contested,
    neighbour_ratio: row.neighbour_ratio,
    capital_velocity_usd_day: row.capital_velocity_usd_day,
    inflow_7d_usd: row.inflow_7d_usd,
    category_tvl_share_pct: row.category_tvl_share_pct,
    category_board_rank: row.category_board_rank,
    factors: {
      size: percentileOf(row.tvl_usd, categoryPeers.map((r) => r.tvl_usd)),
      momentum: factor(row.change_7d, pick((r) => r.change_7d)),
      maturity: factor(row.age_days, pick((r) => r.age_days)),
      breadth: percentileOf(row.chains.length, categoryPeers.map((r) => r.chains.length)),
    },
    concerns: row.concerns,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const backtest = runBacktest(snapshot, model);
  backtest.thin_evidence_pct = Math.round((board.filter((r) => r.thin_evidence).length / Math.max(1, board.length)) * 1000) / 10;
  const peersByCategory = new Map<string, BoardRow[]>();
  for (const r of board) {
    const key = r.category ?? '';
    const list = peersByCategory.get(key);
    if (list === undefined) peersByCategory.set(key, [r]);
    else list.push(r);
  }
  const totalTvl = snapshot.protocols.reduce((s, p) => s + p.tvl_usd, 0);
  const preTvl = snapshot.protocols.filter(isPreToken).reduce((s, p) => s + p.tvl_usd, 0);
  const compCategories = new Set(cleanComps(snapshot).map((p) => p.category ?? ''));
  const boardCategories = new Set(board.map((r) => r.category ?? ''));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    multiples: categoryMultiples(snapshot, model),
    backtest,
    audit: buildAudit(snapshot, board),
    categories: categoryHeat(snapshot, board, backtest, model),
    comps_scatter: cleanComps(snapshot).map((p, i, comps) => ({
      category: p.category,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd!,
      loo_pred_usd: Math.round(
        PRICER_BY_ID.get(backtest.winner)!(p, comps.filter((_, j) => j !== i), snapshot.as_of, model),
      ),
    })),
    headline: {
      protocol_total: snapshot.protocols.length,
      board_implied_total_usd: board.reduce((s, r) => s + r.implied_value_usd, 0),
      pretoken_tvl_share_pct: round2(totalTvl > 0 ? (preTvl / totalTvl) * 100 : 0),
      zero_comp_categories: [...boardCategories].filter((c) => !compCategories.has(c)).length,
    },
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, peersByCategory.get(r.category ?? '') ?? [r])),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, bands, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!(r.implied_low_usd >= 1 && r.implied_low_usd <= r.implied_value_usd && r.implied_value_usd <= r.implied_high_usd)) {
      return `${r.slug} has a band ${r.implied_low_usd}..${r.implied_high_usd} that does not bracket its implied value ${r.implied_value_usd}`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
