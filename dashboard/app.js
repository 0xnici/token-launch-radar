// Token Launch Radar — the dashboard. Static, no network: everything renders from window.RADAR
// (data.js, written by main.ts from the same model that writes board.json). The model is radar-5:
// one fitted size curve from the snapshot's clean traded comps — the median (LAD) fit, chosen
// over the least-squares fit by an out-of-time hindcast in radar-4 and re-confirmed this round
// under a two-origin hindcast gate against six challengers — with split-conformal bands. The page
// recomputes every row's implied value from the published fit and says whether it agrees.
'use strict';

const R = window.RADAR;
const BT = R.backtest;
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const commas = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const money = (n) => (n == null ? '—' : '$' + commas(n));
const moneyShort = (n) => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
};
const pct = (n, d) => (n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(d == null ? 1 : d) + '%');
const signed = (n) => (n == null ? '—' : (n < 0 ? '−$' : '+$') + commas(Math.abs(n)));
const curve = (tvl) => Math.pow(10, BT.curve_intercept + BT.curve_slope * Math.log10(tvl));
const recompute = (tvl) => Math.max(1, Math.round(curve(tvl)));
function bandFactors(tvl) {
  const e = BT.band_buckets.edges;
  return BT.band_buckets.factors[tvl <= e[0] ? 0 : tvl <= e[1] ? 1 : 2];
}
const bySlug = new Map(R.rows.map((r) => [r.slug, r]));
const catGrade = new Map(R.categories.map((c) => [c.category, c.grade]));
const logMin = Math.log10(Math.min(...R.rows.map((r) => r.implied_low_usd)));
const logMax = Math.log10(Math.max(...R.rows.map((r) => r.implied_high_usd)));
const bandPos = (v) => ((Math.log10(Math.max(1, v)) - logMin) / (logMax - logMin)) * 100;
function bandBar(r) {
  const lo = bandPos(r.implied_low_usd), hi = bandPos(r.implied_high_usd), base = bandPos(r.implied_value_usd);
  return `<div class="band" title="bear ${money(r.implied_low_usd)} · base ${money(r.implied_value_usd)} · bull ${money(r.implied_high_usd)}">
    <div class="track"></div><div class="range" style="left:${lo}%;width:${Math.max(1.5, hi - lo)}%"></div>
    <div class="base" style="left:${base}%"></div></div>`;
}
const chip = (v) => `<span class="chip ${v}">${v}</span>`;
function flags(r) {
  let s = '';
  if (r.thin_evidence) s += ' <span class="flag" title="Thin category evidence: fewer than 4 clean traded comps in this category, or a fragile jackknife">⚠</span>';
  if (r.contested) s += ` <span class="flag contested" title="Contested: the 8 nearest traded neighbours' median value is ${r.neighbour_ratio}× the curve price">◆</span>`;
  if (r.concerns.length) s += ' <span class="flag" title="Mechanical concern flag — see the row detail">⚑</span>';
  return s;
}

/* The farm plan, generated in the page from the row's own record — the same rules board.json's
   plans are built with (category action, TVL capital tier, age hold). */
function farmSteps(r) {
  const chain = r.chains.length ? r.chains[0] : 'its main chain';
  const cap = r.tvl_usd >= 5e9 ? 250 : r.tvl_usd >= 1e9 ? 150 : r.tvl_usd >= 1e8 ? 100 : 50;
  const hold = r.age_days == null ? 30 : r.age_days < 180 ? 60 : r.age_days < 365 ? 45 : 30;
  const c = (r.category || '').toLowerCase();
  const n = r.name;
  let action;
  if (/lend|cdp|collateral/.test(c)) action = `Supply $${cap} of USDC to ${n} on ${chain} and keep the position open.`;
  else if (/dex|yield|leveraged farm/.test(c)) action = `Provide $${cap} of liquidity to ${n}'s main pool on ${chain} and keep the position open.`;
  else if (/bridge/.test(c)) action = `Bridge $${cap} of USDC to ${chain} through ${n} and use the bridged funds in its app.`;
  else if (/staking|restak/.test(c)) action = `Stake $${cap} of the chain's staking asset through ${n} and keep the receipt.`;
  else if (/perpetual|derivative|option/.test(c)) action = `Deposit $${cap} of USDC as margin on ${n} and open one small hedge.`;
  else if (/prediction/.test(c)) action = `Fund $${cap} and place one market position on ${n}.`;
  else if (/curator|allocator/.test(c)) action = `Deposit $${cap} into a ${n} vault on ${chain} and keep the shares.`;
  else if (/stable/.test(c)) action = `Mint or deposit $${cap} of the stable asset through ${n} on ${chain}.`;
  else if (/rwa/.test(c)) action = `Mint $${cap} of the protocol's yield asset on ${chain} and hold it.`;
  else if (/insurance/.test(c)) action = `Buy $${cap} of cover from ${n} on ${chain} and keep the policy.`;
  else if (/payment/.test(c)) action = `Route one real payment of about $${cap} through ${n} on ${chain} and keep the receipt.`;
  else action = `Deposit $${cap} of USDC into ${n} on ${chain} and keep the position open.`;
  return [
    [`Use a fresh wallet that holds only the funds you plan to farm ${n} with, and keep its seed phrase offline.`, 'under $3 of gas · 5 minutes'],
    [`Open ${n}'s own app on ${chain} and find its points, rewards or season page; if it runs one, register this same wallet there before you deposit anything.`, 'no fee to look · 10 minutes'],
    [action, `$${cap} of capital and about $${cap >= 150 ? 8 : 4} of gas · 15 minutes to set up`],
    [`Make one qualifying action each week in ${n}, such as a deposit, a borrow, a swap or a vote, so the wallet's record is a history and not a single spike. Farm as one person with one wallet and real activity only: multi-wallet or scripted farming is the standard exclusion ground in distribution rules.`, 'about $2 of gas a week · 10 minutes a week'],
    [`Hold the position for at least ${hold} days so the activity is counted in more than one snapshot of the protocol.`, `the $${cap} stays in the position · ${hold} days`],
    [`Before you withdraw, claim only from the link ${n} itself publishes, and write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, 'no fee to check · 15 minutes'],
  ];
}

/* ---------- masthead ---------- */
function masthead(active, compact) {
  const bias = BT.residual_quantiles.p50;
  const nav = [['#/', 'Front page'], ['#/board', 'The board'], ['#/wall', 'Category wall'], ['#/audit', 'Audit & model card'], ['#/live', 'Live tokens']]
    .map(([h, t]) => `<a href="${h}" ${active === h ? 'aria-current="page"' : ''}>${t}</a>`).join('');
  const head = `<div class="shell">
  <div class="top"><div class="brand"><div class="mark"></div><div class="brand-name">Token Launch Radar</div></div>
  <div class="top-meta"><span>model ${esc(R.model_version)}</span><span>snapshot ${esc(R.as_of)}</span><span>${esc(R.source)}</span></div></div>
  <p class="tagline">Fitted on the <b>${BT.comps} that launched</b>. Honest about the <b>${R.board_size} that haven't</b>.</p>`;
  if (compact) return `${head}<nav class="nav slim">${nav}</nav>`;
  return `${head}
  <p class="thesis">${R.board_size} protocols with no token, priced by <em>one fitted size curve</em> learned from
  ${BT.comps} launched peers — and published with its own measured error: median blind miss
  <span class="amber">×${BT.candidates.find((c) => c.winner).median_error_factor}</span>, ranking validated at
  Spearman IC <em>${BT.rank_ic}</em>. No category multiples, no momentum term: the hindcast removed them.</p>
  <div class="unknowns">KNOWN UNKNOWNS — out-of-time error <b>×${BT.hindcast.mean_median_error_factor}</b> (two-origin hindcast mean) ·
  median bias <b>×${bias}</b> · thin category evidence on <b>${BT.thin_evidence_pct}%</b> of rows ·
  conformal band coverage <b>${BT.calibration[0].achieved_pct}%</b> at ${BT.calibration[0].nominal_pct}% nominal</div>
  <p class="funnel">FUNNEL — <b>${R.headline.protocol_total} protocols</b> in the snapshot →
  <b>${R.audit.pre_token_total} strictly pre-token</b> → <b>${R.board_size} ranked</b> · ${R.audit.excluded.length} excluded and audited, reasons published</p>
  <div class="facts">
    <div class="fact"><span>Σ implied, whole board</span><b>${moneyShort(R.headline.board_implied_total_usd)}</b></div>
    <div class="fact"><span>Tokenless share of snapshot TVL</span><b>${R.headline.pretoken_tvl_share_pct}%</b></div>
    <div class="fact"><span>Size-curve exponent b (95% CI)</span><b>${BT.curve_slope} [${BT.curve_slope_ci95[0]}, ${BT.curve_slope_ci95[1]}]</b></div>
    <div class="fact"><span>Categories with zero traded comps</span><b>${R.headline.zero_comp_categories}</b></div>
  </div>
  <nav class="nav">${nav}</nav>`;
}
const foot = `<p class="foot">Every figure on this page is a pure function of the sealed snapshot (${esc(R.as_of)}).
Implied values are a fitted reference class, not a forecast: half of launched peers landed inside the band shown,
and the backtest panel publishes the misses. Bands are split-conformal intervals from held-out residuals, by TVL tercile.</p></div>`;

/* ---------- front page ---------- */
function scatterSVG() {
  const pts = R.comps_scatter;
  const xs = pts.map((p) => Math.log10(p.loo_pred_usd)), ys = pts.map((p) => Math.log10(p.mcap_usd));
  const lo = Math.min(...xs, ...ys), hi = Math.max(...xs, ...ys);
  const W = 300, H = 210, px = (v) => 26 + ((v - lo) / (hi - lo)) * (W - 36), py = (v) => H - 22 - ((v - lo) / (hi - lo)) * (H - 32);
  const dots = pts.map((p) => `<circle cx="${px(Math.log10(p.loo_pred_usd)).toFixed(1)}" cy="${py(Math.log10(p.mcap_usd)).toFixed(1)}" r="2.4" fill="#3ae2c8" opacity="0.75"/>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="Held-out predicted against actual market caps">
  <line x1="${px(lo)}" y1="${py(lo)}" x2="${px(hi)}" y2="${py(hi)}" stroke="#5f7191" stroke-dasharray="3 3"/>
  ${dots}<text x="6" y="14" fill="#93a5bf" font-size="9.5">actual ↑ vs predicted → · ${pts.length} held-out comps (log)</text></svg>`;
}
function frontPage() {
  const top = R.rows.slice(0, 10);
  const rowsHtml = top.map((r) => `<tr class="clickable" data-slug="${esc(r.slug)}">
    <td class="rank">${r.rank}</td>
    <td><span class="pname">${esc(r.name)}</span>${flags(r)}<br><span class="cat">${esc(r.category || '—')} · grade ${catGrade.get(r.category || '') || 'C'}</span></td>
    <td class="r num">${moneyShort(r.tvl_usd)}</td>
    <td class="imp">${moneyShort(r.implied_value_usd)}</td>
    <td>${bandBar(r)}<div class="band-num">${moneyShort(r.implied_low_usd)} – ${moneyShort(r.implied_high_usd)}</div></td>
    <td>${chip(r.verdict)}</td></tr>`).join('');
  const cand = BT.candidates.map((c) => `<tr${c.winner ? ' style="color:var(--signal)"' : ''}>
    <td>${c.id}${c.winner ? ' ◆' : ''}</td><td class="r num">×${c.median_error_factor}</td><td class="r num">${c.within_2x_pct}%</td><td class="r num">${c.within_3x_pct}%</td></tr>`).join('');
  const calib = BT.calibration.map((c) => `<tr><td>central ${c.nominal_pct}% band</td><td class="r num">${c.achieved_pct}% achieved</td></tr>`).join('');
  const catMult = new Map(R.categories.map((c) => [c.category, c.median_multiple]));
  const mis = R.rows.map((r) => ({ r, ratio: r.implied_value_usd / r.tvl_usd / (catMult.get(r.category || '') || 1) }))
    .filter((m) => (catMult.get(m.r.category || '') || 0) > 0);
  const up = [...mis].sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const down = [...mis].sort((a, b) => a.ratio - b.ratio).slice(0, 5);
  const misRow = (m, arrow) => `<div class="bar-row"><span class="lab">${arrow} ${esc(m.r.name)}</span>
    <span class="tr"><i style="left:0;width:${Math.min(100, Math.abs(Math.log10(m.ratio)) * 90)}%"></i></span>
    <span class="val">×${m.ratio.toFixed(2)} vs category</span></div>`;
  return `${masthead('#/')}
  <div class="front"><div>
    <section class="panel"><h2>The board — top 10 of ${R.board_size} <span class="num">(full board in “The board”)</span></h2>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>Protocol</th><th class="r">TVL</th><th class="r">Implied</th><th>Conformal band (50%)</th><th>Plan</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table></div>
    <p class="sub">In the backtest, ${Math.round(BT.calibration[0].achieved_pct * BT.comps / 100)} of ${BT.comps} launched peers landed inside a band this wide.
    Bands widen where the held-out residuals say they must — by TVL tercile, not by opinion.</p></section>
    <section class="panel"><h2>Where the curve disagrees with the category</h2>
    <p class="sub" style="margin-top:0">Curve-implied multiple against the category's shrunk median peer multiple — the board's second signal, shown, never priced in.</p>
    ${up.map((m) => misRow(m, '▲')).join('')}${down.map((m) => misRow(m, '▼')).join('')}</section>
  </div>
  <div class="rail">
    <section class="panel"><h2>Calibration — priced blind, graded honestly</h2>${scatterSVG()}
    <table class="mini-table"><tbody>${calib}</tbody></table>
    <p class="sub">Split-conformal bands from leave-one-out residuals: coverage is a construction property, and the achieved column is the receipt.</p>
    <p class="sub">Proper log score of the held-out predictive distributions (higher is better): ${[...BT.log_scores].sort((a, b) => b.mean_log_score - a.mean_log_score).slice(0, 3).map((s) => `<b class="num" style="color:var(--ink)">${s.id} ${s.mean_log_score}</b>`).join(' · ')} —
    the whole distribution graded, centre and spread together, by a rule that cannot be gamed by widening a band. The shipped model is second of ${BT.log_scores.length} by it, a hair behind the hybrid.</p></section>
    <section class="panel"><h2>The backtest that chose this model</h2>
    <table class="mini-table"><thead><tr><th>Cand.</th><th class="r">Med miss</th><th class="r">≤2×</th><th class="r">≤3×</th></tr></thead><tbody>${cand}</tbody></table>
    <p class="sub">◆ ships. Leave-one-out graded all ${BT.candidates.length}; the <b>two-origin hindcast</b> (fit oldest half, grade the next sixth;
    fit oldest two-thirds, grade the newest third) then re-confirmed the median fit against six challengers — a Huber fit, an ensemble,
    fitted growth/maturity/breadth terms and the category factor at two shrinkages. None cleared the gate: the median curve's two-origin
    mean is ×${BT.hindcast.mean_median_error_factor}, and the nearest challenger finished inside the 5% tie margin. The full gate table is on the audit page.</p></section>
    <section class="panel"><h2>Rank validation</h2>
    <p class="sub" style="margin-top:0">The product is a ranking, so the ranking is what we validate: Spearman IC
    <b class="num" style="color:var(--ink)">${BT.rank_ic}</b> between held-out predicted and actual ranks of the ${BT.comps} comps.
    Median realized multiple by predicted decile:</p>
    ${BT.decile_realized_multiples.map((v, i) => `<div class="bar-row"><span class="lab">decile ${i + 1}</span><span class="tr"><i style="left:0;width:${Math.min(100, v * 45)}%"></i></span><span class="val">×${v}</span></div>`).join('')}
    </section>
  </div></div>${foot}`;
}

/* ---------- the board ---------- */
const boardState = { q: '', category: 'all', verdict: 'all', sort: 'rank', flagged: false };
/* Filters can be linked: ?verdict=CLOSE&category=Lending&sort=hurdle&flagged=1#/board seeds the
   board's state, so a filtered view is a URL, not a session. Unknown values are ignored. */
try {
  const q = new URLSearchParams(location.search);
  if (['PAYS', 'CLOSE', 'SHORT'].includes(q.get('verdict'))) boardState.verdict = q.get('verdict');
  if (q.get('category')) boardState.category = q.get('category');
  if (['rank', 'tvl', 'hurdle', 'ev', 'misprice'].includes(q.get('sort'))) boardState.sort = q.get('sort');
  if (q.get('q')) boardState.q = q.get('q').toLowerCase();
  if (q.get('flagged') === '1') boardState.flagged = true;
} catch (e) { /* no query string: the defaults stand */ }
function boardPage() {
  const cats = [...new Set(R.rows.map((r) => r.category || '—'))].sort();
  const opts = cats.map((c) => `<option value="${esc(c)}" ${boardState.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
  return `${masthead('#/board', true)}
  <div class="controls">
    <div class="field"><label for="q">Search</label><input type="search" id="q" value="${esc(boardState.q)}" placeholder="protocol name"></div>
    <div class="field"><label for="fc">Category</label><select id="fc"><option value="all">All categories</option>${opts}</select></div>
    <div class="field"><label for="fv">Plan verdict</label><select id="fv">
      ${['all', 'PAYS', 'CLOSE', 'SHORT'].map((v) => `<option value="${v}" ${boardState.verdict === v ? 'selected' : ''}>${v === 'all' ? 'All verdicts' : v}</option>`).join('')}</select></div>
    <div class="field"><label for="fs">Sort</label><select id="fs">
      ${[['rank', 'Implied rank'], ['tvl', 'TVL'], ['hurdle', 'Farmer hurdle (low first)'], ['ev', 'EV view: implied × base rate'], ['misprice', 'Curve vs category gap']]
        .map(([v, t]) => `<option value="${v}" ${boardState.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" id="ff" ${boardState.flagged ? 'checked' : ''}> flagged only</label>
    <span class="count" id="bcount"></span>
  </div>
  <section class="panel"><div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Protocol</th><th>Category</th><th class="r">TVL</th><th class="r">7d</th><th class="r">Implied</th>
    <th>Band (50% conformal)</th><th>Plan</th><th class="r">Hurdle</th><th class="r">Base rate</th></tr></thead>
    <tbody id="brows"></tbody></table></div>
  <p class="sub">Hurdle = the share of the bear value, in basis points, that must reach the farming side for a $1,000 reference plan to break even;
  typical community allocations run 500–1,500 bps. Base rate = the category's tokenization rate (shrunk), context only — it never moves a price.
  The EV sort multiplies implied by that base rate: a labelled secondary view, not the ranking. Filters are linkable — this view, for instance, is
  <span class="num">?verdict=CLOSE#/board</span>.</p></section>${foot}`;
}
function renderBoardRows() {
  const catMult = new Map(R.categories.map((c) => [c.category, c.median_multiple]));
  let rows = R.rows.filter((r) =>
    (boardState.category === 'all' || (r.category || '—') === boardState.category) &&
    (boardState.verdict === 'all' || r.verdict === boardState.verdict) &&
    (!boardState.flagged || r.thin_evidence || r.contested || r.concerns.length > 0) &&
    (boardState.q === '' || r.name.toLowerCase().includes(boardState.q) || r.slug.includes(boardState.q)));
  const sorters = {
    rank: (a, b) => a.rank - b.rank,
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    hurdle: (a, b) => a.hurdle_bps - b.hurdle_bps,
    ev: (a, b) => b.implied_value_usd * b.category_base_rate - a.implied_value_usd * a.category_base_rate,
    misprice: (a, b) => Math.abs(Math.log10(b.implied_value_usd / b.tvl_usd / (catMult.get(b.category || '') || 1))) -
      Math.abs(Math.log10(a.implied_value_usd / a.tvl_usd / (catMult.get(a.category || '') || 1))),
  };
  rows = [...rows].sort(sorters[boardState.sort]);
  $('#bcount').textContent = `${rows.length} of ${R.rows.length} rows`;
  $('#brows').innerHTML = rows.map((r) => `<tr class="clickable" data-slug="${esc(r.slug)}">
    <td class="rank">${r.rank}</td>
    <td><span class="pname">${esc(r.name)}</span>${flags(r)}<br><span class="cat">${r.chains.slice(0, 3).join(', ')}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</span></td>
    <td><span class="grade ${catGrade.get(r.category || '') || 'C'}">${catGrade.get(r.category || '') || 'C'}</span> <span class="cat">${esc(r.category || '—')}</span></td>
    <td class="r num">${moneyShort(r.tvl_usd)}</td>
    <td class="r num ${r.change_7d == null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${pct(r.change_7d)}</td>
    <td class="imp">${moneyShort(r.implied_value_usd)}</td>
    <td>${bandBar(r)}<div class="band-num">${moneyShort(r.implied_low_usd)} – ${moneyShort(r.implied_high_usd)}</div></td>
    <td>${chip(r.verdict)}</td>
    <td class="r num">${commas(r.hurdle_bps)} bps</td>
    <td class="r num">${(r.category_base_rate * 100).toFixed(1)}%</td></tr>`).join('');
  bindRowClicks();
}
function bindRowClicks() {
  document.querySelectorAll('tr.clickable').forEach((tr) => tr.addEventListener('click', () => { location.hash = '#/row/' + tr.dataset.slug; }));
}

/* ---------- detail ---------- */
function tile(label, value, note) {
  const bar = value == null ? '<div class="bar"></div>' : `<div class="bar"><i style="width:${value}%"></i><span class="dot"></span></div>`;
  return `<div class="tile"><span>${label}</span>${bar}<b>${value == null ? 'n/a' : value}</b> <span style="text-transform:none;letter-spacing:0">${note || ''}</span></div>`;
}
function detailPage(r) {
  const check = recompute(r.tvl_usd);
  const agree = check === r.implied_value_usd;
  const f = bandFactors(r.tvl_usd);
  const grade = catGrade.get(r.category || '') || 'C';
  const concerns = r.concerns.map((c) => `<div class="concern">⚑ ${esc(c)}. The flag is mechanical and never changes the ranked value.</div>`).join('');
  const contested = r.contested ? `<div class="concern">◆ Contested: the 8 nearest traded neighbours by size carry a median market cap
    ${r.neighbour_ratio}× this row's curve price. The curve price stands; the disagreement is shown, not averaged away.</div>` : '';
  const steps = farmSteps(r).map(([t, c]) => `<li>${esc(t)}<span class="cost">Cost/time: ${esc(c)}.</span></li>`).join('');
  const torn = [
    ['TVL +20%', curve(r.tvl_usd * 1.2)], ['TVL −20%', curve(r.tvl_usd * 0.8)],
    [`slope CI high (${BT.curve_slope_ci95[1]})`, Math.pow(10, BT.curve_intercept + BT.curve_slope_ci95[1] * Math.log10(r.tvl_usd))],
    [`slope CI low (${BT.curve_slope_ci95[0]})`, Math.pow(10, BT.curve_intercept + BT.curve_slope_ci95[0] * Math.log10(r.tvl_usd))],
  ].map(([label, v]) => ({ label, v, swing: Math.abs(Math.log10(v / r.implied_value_usd)) })).sort((a, b) => b.swing - a.swing);
  const maxSwing = Math.max(...torn.map((t) => t.swing));
  const tornado = torn.map((t) => `<div class="bar-row"><span class="lab">${esc(t.label)}</span>
    <span class="tr"><i style="left:${t.v >= r.implied_value_usd ? 50 : 50 - (t.swing / maxSwing) * 48}%;width:${(t.swing / maxSwing) * 48}%"></i></span>
    <span class="val">${moneyShort(t.v)}</span></div>`).join('');
  const hurdlePct = Math.min(100, (r.hurdle_bps / 3000) * 100);
  const inBand = Math.round(BT.calibration[0].achieved_pct * BT.comps / 100);
  return `${masthead('', true)}<div class="detail">
  <p class="crumb"><a href="#/board">← the board</a></p>
  <h1>${esc(r.name)} ${flags(r)}</h1>
  <p class="sub dsub">rank #${r.rank} of ${R.board_size} · ${esc(r.category || '—')} · evidence grade <span class="grade ${grade}">${grade}</span>
  · #${r.category_board_rank} in its category, ${r.category_tvl_share_pct}% of category TVL · ${r.chains.length} chain${r.chains.length === 1 ? '' : 's'}: ${esc(r.chains.join(', '))}
  · ${r.age_days == null ? 'age unknown' : commas(r.age_days) + ' days old'} · TVL rank #${r.tvl_rank} vs implied #${r.rank}</p>
  ${concerns}${contested}
  <section class="panel"><h2>Why this rank — the whole arithmetic</h2>
    <div class="wgrid"><div class="wleft">
    <div class="water">
      <div class="wstep"><span>TVL (snapshot)</span><b>${money(r.tvl_usd)}</b></div><div class="wop">→</div>
      <div class="wstep"><span>Median size curve 10^(${BT.curve_intercept} + ${BT.curve_slope}·log₁₀TVL)</span><b>${money(Math.round(curve(r.tvl_usd)))}</b></div><div class="wop">=</div>
      <div class="wstep imp"><span>Implied value</span><b>${money(r.implied_value_usd)}</b></div>
    </div>
    ${bandBar(r)}<div class="band-num">bear ${money(r.implied_low_usd)} (×${f.lo}) · base ${money(r.implied_value_usd)} · bull ${money(r.implied_high_usd)} (×${f.hi}) — split-conformal, TVL-tercile band.
    In the backtest, ${inBand} of ${BT.comps} launched peers landed inside their central band — a band this wide is a coin the model has already flipped ${BT.comps} times.</div>
    </div>
    <div class="judge">JUDGEMENT BUDGET — data terms ×1.00 · judgement terms ×1.00. No judgement terms ship: two hindcast generations struck
    radar-2's asserted growth/maturity multipliers (×0.42–×1.60 combined), then their fitted one-coefficient successors, a category factor
    at two shrinkages, a Huber fit, an ensemble and a breadth term. 100% of this price is
    the fitted reference class. Page recompute: ${money(check)} — ${agree ? 'agrees with board.json to the dollar' : 'differs from board.json; the board value stands'}.</div>
    </div>
  </section>
  <div class="dcols">
    <section class="panel"><h2>Factor tiles — context, not inputs</h2>
      <div class="tiles d2">
        ${tile('Size', r.factors.size, 'TVL percentile')}
        ${tile('Momentum', r.factors.momentum, '7d change percentile')}
        ${tile('Maturity', r.factors.maturity, 'age percentile')}
        ${tile('Breadth', r.factors.breadth, 'chain-count percentile')}
      </div>
      <p class="sub">Within-category percentiles; the dot is the category median. Context only — none move the price.</p>
      <dl class="kv">
        <dt>Capital velocity</dt><dd>${r.capital_velocity_usd_day == null ? 'n/a' : money(r.capital_velocity_usd_day) + ' / day'}</dd>
        <dt>Implied 7d inflow</dt><dd>${r.inflow_7d_usd == null ? 'n/a' : signed(r.inflow_7d_usd)}</dd>
        <dt>Category base rate</dt><dd>${(r.category_base_rate * 100).toFixed(1)}% tokenized (shrunk)</dd>
        <dt>Jackknife fragility</dt><dd>${r.fragility} IQR/base${r.thin_evidence ? ' · thin ⚠' : ''}</dd>
      </dl></section>
    <section class="panel"><h2>Sensitivity — what moves this price</h2>${tornado}
      <p class="sub">Each bar: implied value under that single change.</p>
      <h2 style="margin-top:12px">Stress this row</h2>
      <label class="sub" for="stress">TVL stress: <span id="stressVal" class="num" style="color:var(--ink)">+0%</span></label>
      <input type="range" id="stress" min="-50" max="100" value="0" step="5">
      <dl class="kv"><dt>Stressed TVL</dt><dd id="sTvl">${money(r.tvl_usd)}</dd>
      <dt>Stressed implied</dt><dd id="sImp">${money(r.implied_value_usd)}</dd>
      <dt>Stressed band</dt><dd id="sBand">${money(r.implied_low_usd)} – ${money(r.implied_high_usd)}</dd>
      <dt>Stressed hurdle</dt><dd id="sHurdle">${commas(r.hurdle_bps)} bps</dd></dl>
      <p class="sub">Live recompute from the published fit.</p></section>
    <section class="panel"><h2>The plan, graded</h2>
      <p style="margin-top:0">${chip(r.verdict)} <span class="sub">for a $1,000 reference position at a labelled 10% allocation scenario, pro-rata by TVL</span></p>
      <dl class="kv">
        <dt>Net at bear</dt><dd>${signed(r.net_bear_usd)}</dd>
        <dt>Net at base</dt><dd>${signed(r.net_base_usd)}</dd>
        <dt>Plan cost (cash + 4% risk-free)</dt><dd>${money(r.total_cost_usd)}</dd>
      </dl>
      <p class="sub" style="margin-bottom:2px">Farmer's hurdle — the share of the bear value that must reach the farming side to break even:</p>
      <div class="gauge"><div class="zone" style="left:${(500 / 3000) * 100}%;width:${(1000 / 3000) * 100}%"></div><div class="mark2" style="left:${hurdlePct}%"></div></div>
      <p class="sub" style="margin-top:0"><span class="num" style="color:var(--amber)">${commas(r.hurdle_bps)} bps</span> · green = the typical 500–1,500 bps allocation range (a labelled assumption)</p>
      <table class="mini-table"><thead><tr><th>EV per $1,000</th><th class="r">5%</th><th class="r">10%</th><th class="r">15%</th></tr></thead>
      <tbody><tr><td>gross proceeds at base</td><td class="r num">${money(r.ev_per_1k_usd[0])}</td><td class="r num">${money(r.ev_per_1k_usd[1])}</td><td class="r num">${money(r.ev_per_1k_usd[2])}</td></tr></tbody></table>
    </section>
  </div>
  <section class="panel"><h2>The farm plan — six steps</h2><ol class="steps grid3">${steps}</ol></section>
  </div>${foot}`;
}

/* ---------- category wall ---------- */
function wallPage() {
  const allT = [...R.comps_scatter.map((p) => p.tvl_usd), ...R.rows.map((r) => r.tvl_usd)];
  const allV = [...R.comps_scatter.map((p) => p.mcap_usd), ...R.rows.map((r) => r.implied_value_usd)];
  const xLo = Math.log10(Math.min(...allT)), xHi = Math.log10(Math.max(...allT));
  const yLo = Math.log10(Math.min(...allV)), yHi = Math.log10(Math.max(...allV));
  const W = 252, H = 168;
  const px = (t) => 8 + ((Math.log10(t) - xLo) / (xHi - xLo)) * (W - 16);
  const py = (v) => H - 10 - ((Math.log10(Math.max(1, v)) - yLo) / (yHi - yLo)) * (H - 20);
  const curvePath = (() => {
    let d = '';
    for (let i = 0; i <= 24; i++) {
      const t = Math.pow(10, xLo + ((xHi - xLo) * i) / 24);
      d += `${i === 0 ? 'M' : 'L'}${px(t).toFixed(1)},${py(curve(t)).toFixed(1)} `;
    }
    return d;
  })();
  const wallCats = R.categories.filter((c) => c.comps >= 4);
  const minis = wallCats.map((c) => {
    const comps = R.comps_scatter.filter((p) => (p.category || '') === c.category);
    const rows = R.rows.filter((r) => (r.category || '') === c.category);
    const dots = comps.map((p) => `<circle cx="${px(p.tvl_usd).toFixed(1)}" cy="${py(p.mcap_usd).toFixed(1)}" r="2.2" fill="#3ae2c8" opacity="0.8"/>`).join('');
    const marks = rows.map((r) => `<circle cx="${px(r.tvl_usd).toFixed(1)}" cy="${py(r.implied_value_usd).toFixed(1)}" r="2.6" fill="#ffb454"/>`).join('');
    return `<div class="mini ${c.grade === 'C' ? 'desat' : ''}"><h3>${esc(c.category)} <span class="grade ${c.grade}">${c.grade}</span></h3>
    <svg width="100%" viewBox="0 0 ${W} ${H}"><path d="${curvePath}" fill="none" stroke="#5f7191" stroke-width="1"/>${dots}${marks}</svg>
    <span class="sub">${c.comps} traded comps · ${c.board_rows} pre-token rows · median peer ×${c.median_multiple}</span></div>`;
  }).join('');
  const heat = R.categories.map((c) => `<tr class="clickable" data-cat="${esc(c.category)}">
    <td><span class="grade ${c.grade}">${c.grade}</span> ${esc(c.category)}</td><td class="r num">${c.comps}</td>
    <td class="r num">×${c.median_multiple}</td><td class="r num">${c.board_rows}</td><td class="r num">${moneyShort(c.pretoken_tvl_usd)}</td>
    <td class="r num ${c.aggregate_change_7d == null ? '' : c.aggregate_change_7d >= 0 ? 'pos' : 'neg'}">${pct(c.aggregate_change_7d)}</td>
    <td class="r num">${c.loo_median_error_factor == null ? '—' : '×' + c.loo_median_error_factor}</td><td class="r num">${c.contested_share_pct}%</td></tr>`).join('');
  return `${masthead('#/wall', true)}
  <section class="panel"><h2>Category wall — one gestalt, identical axes everywhere</h2>
  <p class="sub" style="margin-top:0">Every panel shares the same log–log axes: TVL → value. Cyan dots are the category's traded comps at their real
  market caps; amber dots are its pre-token rows at the curve's price; the line is the one fitted curve — the same line in every panel,
  because the model has no category term. Grade-C evidence is desaturated. Click a heat row to filter the board.</p>
  <div class="wall">${minis}</div></section>
  <section class="panel"><h2>Category heat — the evidence behind the context</h2>
  <div class="table-wrap"><table><thead><tr><th>Category</th><th class="r">Comps</th><th class="r">Shrunk median</th><th class="r">Board rows</th>
  <th class="r">Pre-token TVL</th><th class="r">Agg 7d</th><th class="r">Held-out miss</th><th class="r">Contested</th></tr></thead>
  <tbody>${heat}</tbody></table></div>
  <p class="sub">Grades: A = ≥8 comps and a held-out spread at or under the global median · B = ≥4 comps · C = thinner than that.
  The shrunk median is a James–Stein-flavoured pull toward the global median, (n·category + 4·global)/(n+4) — displayed as context; it prices nothing.</p></section>${foot}`;
}

/* ---------- audit & model card ---------- */
function auditPage() {
  const hind = new Map(BT.hindcast_grades.map((g) => [g.id, g]));
  const lsMap = new Map(BT.log_scores.map((s) => [s.id, s.mean_log_score]));
  const cand = BT.candidates.map((c) => { const h = hind.get(c.id); return `<tr${c.winner ? ' style="color:var(--signal)"' : ''}><td>${c.id} — ${esc(c.label)}${c.winner ? ' ◆ ships' : ''}</td>
    <td class="r num">×${c.median_error_factor}</td><td class="r num">${c.within_2x_pct}%</td><td class="r num">${c.within_3x_pct}%</td>
    <td class="r num">${h ? '×' + h.origin1_median_error_factor : '—'}</td><td class="r num">${h ? '×' + h.median_error_factor : '—'}</td><td class="r num">${h ? '×' + h.mean_median_error_factor : '—'}</td><td class="r num">${lsMap.has(c.id) ? lsMap.get(c.id) : '—'}</td></tr>`; }).join('');
  const reasons = {};
  for (const e of R.audit.excluded) reasons[e.reason] = (reasons[e.reason] || 0) + 1;
  const reasonRows = Object.entries(reasons).sort((a, b) => b[1] - a[1])
    .map(([reason, n]) => `<tr><td>${esc(reason)}</td><td class="r num">${n}</td></tr>`).join('');
  const excl = R.audit.excluded.map((e) => `<tr><td>${esc(e.name)}</td><td class="cat">${esc(e.category || '—')}</td>
    <td class="r num">${moneyShort(e.tvl_usd)}</td><td class="cat">${esc(e.reason)}</td></tr>`).join('');
  const largest = R.audit.largest_excluded;
  return `${masthead('#/audit', true)}
  <section class="panel"><h2>Model card</h2>
  <dl class="kv">
    <dt>Intended use</dt><dd style="text-align:left;font-family:var(--font)">Ranking pre-token protocols by a fitted reference class, with calibrated uncertainty, for research and farm planning.</dd>
    <dt>Out of scope</dt><dd style="text-align:left;font-family:var(--font)">Investment advice, price prediction for any named protocol, and any use of the verdict as a promise of an airdrop.</dd>
    <dt>Training data</dt><dd>${BT.comps} clean traded comps from the sealed snapshot (of ${R.headline.protocol_total} protocols)</dd>
    <dt>Method</dt><dd style="text-align:left;font-family:var(--font)">Reference-class forecasting: fit log₁₀(mcap) = ${BT.curve_intercept} + ${BT.curve_slope}·log₁₀(TVL) on the class
    ${BT.winner === 'G' ? 'by median (least-absolute-deviations) regression — the typical launch, not the average one —' : 'by least squares —'}
    ship it unadjusted, publish its record. Bands are split-conformal (finite-sample corrected) on held-out residuals, by TVL tercile — coverage holds by construction under exchangeability of the comps.</dd>
    <dt>Exponent in context</dt><dd>b = ${BT.curve_slope}, 95% CI [${BT.curve_slope_ci95[0]}, ${BT.curve_slope_ci95[1]}]${BT.winner === 'G' ? ' (jackknife)' : ''}, ${BT.winner === 'G' ? 'L1 pseudo-R²' : 'R²'} ${BT.curve_r2} — far under a pure Metcalfe exponent of 2, inside the empirical range for network-value fits</dd>
    <dt>Named failure modes</dt><dd style="text-align:left;font-family:var(--font)">${BT.thin_evidence_pct}% of rows sit in categories with thin traded evidence; TVL is a single point in time and can be rented;
    pre-token markets historically overprice launches (pre-market marks have run ≈2.4× launch FDV in known cases); the ranking's IC is ${BT.rank_ic}, a weak-to-moderate signal, and decile realized multiples are noisy — read the band, not the point.</dd>
  </dl></section>
  <section class="panel"><h2>Full backtest — every candidate, both splits</h2>
  <div class="table-wrap"><table><thead><tr><th>Candidate</th><th class="r">LOO med miss</th><th class="r">≤2×</th><th class="r">≤3×</th><th class="r">Origin 1</th><th class="r">Origin 2</th><th class="r">Mean</th><th class="r">Log score</th></tr></thead><tbody>${cand}</tbody></table></div>
  <p class="sub">Selection discipline: leave-one-out graded the field; every keep-or-drop was decided on the <b>two-origin hindcast</b>
  (origin 1: fit oldest ${BT.hindcast_origins[0].train_n} dated comps, grade the next ${BT.hindcast_origins[0].test_n}; origin 2: fit oldest ${BT.hindcast_origins[1].train_n},
  grade the newest ${BT.hindcast_origins[1].test_n}) — never on the split that calibrates the bands. A challenger ships only on a strict
  two-origin mean win of 5% or more (10% for the ensemble), losing neither origin by over 10%, with a stable coefficient sign where it
  fits one. Round 5 ran six: the Huber fit (I) and the ensemble (J) each lost origin 2 by more than 10%; the fitted growth term (M) beat
  the incumbent at both origins by under 1.2% — inside the margin, recorded as a tie, and its full-pool coefficient flips sign against both
  era fits, so the growth question is closed; the fitted maturity (N) and breadth (O) coefficients flip sign between eras outright.
  Category factors lost at both shrinkages (C, C2). The median fit ships again — the same rule, applied the same way, every round.
  The log-score column grades each candidate's whole held-out distribution under a proper scoring rule; the hybrid (H) edges it there
  by 0.002, inside any reasonable noise, and the shipped model is second of ${BT.log_scores.length}.</p></section>
  <section class="panel"><h2>Exclusion audit — all ${R.audit.excluded.length} turned away, with reasons</h2>
  <table class="mini-table"><tbody>${reasonRows}</tbody></table>
  <p class="sub">Counterfactual, stated plainly: the largest exclusion is ${esc(largest.name)} at ${money(largest.tvl_usd)} of TVL.
  Ranked, it would sit at #1 by size — and it is an exchange's own product line, so its TVL is a balance sheet, not a launch waiting to happen.
  That is why the hygiene exists, and why every exclusion is published rather than silent.</p>
  <div class="scrollbox"><div class="table-wrap"><table><thead><tr><th>Protocol</th><th>Category</th><th class="r">TVL</th><th>Reason</th></tr></thead>
  <tbody>${excl}</tbody></table></div></div></section>${foot}`;
}

/* ---------- live tokens ---------- */
function livePage() {
  const rows = R.live.map((p) => `<tr><td><span class="pname">${esc(p.name)}</span><br><span class="cat">${esc(p.category || '—')}</span></td>
    <td class="r num">${moneyShort(p.tvl_usd)}</td><td class="r num" style="color:var(--ink)">${moneyShort(p.mcap_usd)}</td>
    <td class="r num ${p.change_7d == null ? '' : p.change_7d >= 0 ? 'pos' : 'neg'}">${pct(p.change_7d)}</td>
    <td class="cat">${esc(p.chains.slice(0, 3).join(', '))}</td></tr>`).join('');
  return `${masthead('#/live', true)}
  <section class="panel"><h2>Live tokens — the evidence base, at the market's own values</h2>
  <p class="sub" style="margin-top:0">These protocols already trade; nothing here is modelled. The largest are shown; the fitted curve
  was learned from the ${BT.comps} clean comps among them.</p>
  <div class="table-wrap"><table><thead><tr><th>Protocol</th><th class="r">TVL</th><th class="r">Market cap</th><th class="r">7d</th><th>Chains</th></tr></thead>
  <tbody>${rows}</tbody></table></div></section>${foot}`;
}

/* ---------- router ---------- */
function render() {
  const main = $('#board');
  const hash = location.hash || '#/';
  let html;
  if (hash.startsWith('#/row/')) {
    const r = bySlug.get(hash.slice(6));
    html = r ? detailPage(r) : frontPage();
  } else if (hash === '#/board') html = boardPage();
  else if (hash === '#/wall') html = wallPage();
  else if (hash === '#/audit') html = auditPage();
  else if (hash === '#/live') html = livePage();
  else html = frontPage();
  main.innerHTML = html;
  main.setAttribute('aria-busy', 'false');
  window.scrollTo(0, 0);
  if (hash === '#/board') {
    renderBoardRows();
    $('#q').addEventListener('input', (e) => { boardState.q = e.target.value.toLowerCase(); renderBoardRows(); });
    $('#fc').addEventListener('change', (e) => { boardState.category = e.target.value; renderBoardRows(); });
    $('#fv').addEventListener('change', (e) => { boardState.verdict = e.target.value; renderBoardRows(); });
    $('#fs').addEventListener('change', (e) => { boardState.sort = e.target.value; renderBoardRows(); });
    $('#ff').addEventListener('change', (e) => { boardState.flagged = e.target.checked; renderBoardRows(); });
  } else if (hash === '#/wall') {
    document.querySelectorAll('tr.clickable[data-cat]').forEach((tr) => tr.addEventListener('click', () => {
      boardState.category = tr.dataset.cat; location.hash = '#/board';
    }));
  } else if (hash.startsWith('#/row/')) {
    const r = bySlug.get(hash.slice(6));
    const slider = $('#stress');
    if (r && slider) {
      const totalCost = r.total_cost_usd;
      slider.addEventListener('input', () => {
        const f = 1 + Number(slider.value) / 100;
        const tvl = r.tvl_usd * f;
        const imp = recompute(tvl);
        const bf = bandFactors(tvl);
        const low = Math.round(imp * bf.lo);
        const share = tvl > 0 ? 1000 / tvl : 0;
        const hurdle = low * share > 0 ? Math.round((totalCost / (low * share)) * 10000) : 0;
        $('#stressVal').textContent = (slider.value >= 0 ? '+' : '') + slider.value + '%';
        $('#sTvl').textContent = money(tvl);
        $('#sImp').textContent = money(imp);
        $('#sBand').textContent = `${money(low)} – ${money(Math.round(imp * bf.hi))}`;
        $('#sHurdle').textContent = `${commas(hurdle)} bps`;
      });
    }
  } else {
    bindRowClicks();
  }
}
window.addEventListener('hashchange', render);
render();
