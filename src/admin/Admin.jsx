import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CLIMATES,
  COLOURED,
  DOWNSIDES,
  EVER_USED,
  FINISHES,
  GENDERS,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HOLD_LEVELS,
  IMAGE_SETS,
  MAIN_PRODUCTS,
  MOUSSE_DURATION,
  MOUSSE_NEVER,
  MOUSSE_PROBLEMS,
  MOUSSE_USES,
  OIL_BAD,
  OIL_GOOD,
  OIL_NEVER,
  OIL_WHERE,
  POST_WORKOUT,
  PRE_WORKOUT,
  PRICE_BANDS,
  PRICE_BAND_VALUES,
  PRODUCTS,
  WASH_FREQUENCY,
  WASH_MORE,
  WEAKER_HOLD,
  WORKOUT_NON_WASH_DAY,
  WANTED_HAIR_TYPES,
  WOMENS_PRODUCT,
  WOULD_SWITCH,
  YES_NO,
  labelFor,
  priceLabel,
} from '../lib/config.js'
import {
  REAL_DOWNSIDES,
  countBy,
  distribution,
  download,
  downsideRates,
  fmtPct,
  isAnswered,
  isTopPrice,
  pct,
  skipStats,
  tickRates,
  ticks,
  toCsv,
  worstRanking,
} from './stats.js'

// Chart colours (validated categorical slots 1–2 + one-hue ordinal ramp).
const C = {
  men: '#2a78d6',
  women: '#eb6834',
  bar: '#2a78d6',
  neutral: '#b9b3ac',
  ramp: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
}
const DARK_FILLS = [C.ramp[2], C.ramp[3], C.ramp[4]] // need white labels

// Thresholds behind the hypothesis verdicts. Tweak freely.
const MIN_N = 20
const T = { premium: 30 }

const RESPONSE_COLUMNS = [
  'id', 'respondent_id', 'created_at', 'updated_at', 'completed', 'last_step', 'utm_source', 'gender', 'image_set', 'image_order',
  'q2_event_hold',
  'uses_products', 'products_used', 'main_product', 'finish_preference', 'routine', 'routine_change',
  'downsides', 'worst_downside', 'chose_weaker_hold',
  'wash_frequency', 'product_makes_wash_more', 'workout_non_wash_day', 'workout_non_wash_day_other', 'pre_workout',
  'pre_workout_other', 'post_workout_annoyance', 'post_workout_annoyance_other',
  'mousse_use', 'mousse_stop_reason', 'mousse_tried_reason', 'mousse_never_reason', 'mousse_never_reason_other',
  'mousse_brand', 'mousse_uses', 'mousse_problems', 'mousse_problems_other', 'mousse_duration', 'mousse_features',
  'oil_use', 'oil_stop_reason', 'oil_tried_reason', 'oil_never_reason', 'oil_never_reason_other', 'oil_where',
  'oil_good', 'oil_bad',
  'would_switch', 'price_band', 'price_label', 'currency', 'current_product',
  'hair_type', 'wanted_hair_type', 'hair_length', 'coloured', 'climate',
]

const PRICE_OPTIONS = PRICE_BAND_VALUES.map((v, i) => ({ value: v, label: `Band ${i + 1}` }))
// Hold levels are stored as the text '1'–'4'.
const HOLD_OPTIONS = HOLD_LEVELS.map((h) => ({ value: String(h.value), label: h.label }))

// Every question in survey order. `options` = multiple choice (charted); `other` = its "Other" text box.
const QUESTIONS = [
  { code: 'G', col: 'gender', title: 'Gender', options: GENDERS },
  { code: 'G', col: 'image_set', title: 'Hold images shown', options: IMAGE_SETS },
  { code: 'About', col: 'hair_type', title: 'Hair type', options: HAIR_TYPES },
  { code: 'About', col: 'wanted_hair_type', title: 'Hair type they’d like', options: WANTED_HAIR_TYPES },
  { code: 'About', col: 'hair_length', title: 'Length', options: HAIR_LENGTHS },
  { code: 'About', col: 'coloured', title: 'Coloured / bleached', options: COLOURED },
  { code: 'About', col: 'climate', title: 'Climate', options: CLIMATES },
  { code: 'Q2', col: 'q2_event_hold', title: 'Hold for a night out / event', options: HOLD_OPTIONS },
  { code: 'P1', col: 'uses_products', title: 'Uses products besides shampoo & conditioner', options: YES_NO },
  { code: 'P2', col: 'products_used', title: 'What they use', options: PRODUCTS, multi: true },
  { code: 'P2b', col: 'main_product', title: 'Product they use most', options: MAIN_PRODUCTS },
  { code: 'F1', col: 'finish_preference', title: 'Preferred look', options: FINISHES },
  { code: 'P3', col: 'routine', title: 'Daily routine', text: true },
  { code: 'P4', col: 'routine_change', title: 'One thing they’d change', text: true },
  { code: 'Q4', col: 'downsides', title: 'Downsides', options: DOWNSIDES, multi: true },
  { code: 'Q4b', col: 'worst_downside', title: 'Downside that bothers most', options: REAL_DOWNSIDES },
  { code: 'Q4c', col: 'chose_weaker_hold', title: 'Chose weaker hold to avoid downsides', options: WEAKER_HOLD },
  { code: 'W1', col: 'wash_frequency', title: 'How often they shampoo', options: WASH_FREQUENCY },
  { code: 'W2', col: 'product_makes_wash_more', title: 'Styling product makes them wash more', options: WASH_MORE },
  { code: 'W3', col: 'workout_non_wash_day', title: 'After a workout on a non-shampoo day', options: WORKOUT_NON_WASH_DAY, other: 'workout_non_wash_day_other' },
  { code: 'W4', col: 'pre_workout', title: 'Before a workout', options: PRE_WORKOUT, other: 'pre_workout_other' },
  { code: 'W5', col: 'post_workout_annoyance', title: 'Most annoying after a workout', options: POST_WORKOUT, other: 'post_workout_annoyance_other' },
  { code: 'M1', col: 'mousse_use', title: 'Ever used mousse', options: EVER_USED },
  { code: 'M1 box', col: 'mousse_stop_reason', title: 'Why they stopped mousse', text: true },
  { code: 'M1 box', col: 'mousse_tried_reason', title: 'Why they didn’t keep using mousse', text: true },
  { code: 'M1b', col: 'mousse_never_reason', title: 'Why never mousse', options: MOUSSE_NEVER, other: 'mousse_never_reason_other' },
  { code: 'M2', col: 'mousse_brand', title: 'Mousse brand', text: true },
  { code: 'M3', col: 'mousse_uses', title: 'What they used mousse for', options: MOUSSE_USES, multi: true },
  { code: 'M4', col: 'mousse_problems', title: 'What happened with mousse', options: MOUSSE_PROBLEMS, multi: true, other: 'mousse_problems_other' },
  { code: 'M5', col: 'mousse_duration', title: 'How long mousse lasts', options: MOUSSE_DURATION },
  { code: 'M6', col: 'mousse_features', title: 'Dream mousse features', text: true },
  { code: 'O1', col: 'oil_use', title: 'Ever used hair oil', options: EVER_USED },
  { code: 'O1 box', col: 'oil_stop_reason', title: 'Why they stopped oil', text: true },
  { code: 'O1 box', col: 'oil_tried_reason', title: 'Why they didn’t keep using oil', text: true },
  { code: 'O1b', col: 'oil_never_reason', title: 'Why never oil', options: OIL_NEVER, other: 'oil_never_reason_other' },
  { code: 'O2', col: 'oil_where', title: 'Where they put oil', options: OIL_WHERE, multi: true },
  { code: 'O3', col: 'oil_good', title: 'What’s good about oil', options: OIL_GOOD, multi: true },
  { code: 'O4', col: 'oil_bad', title: 'What’s bad about oil', options: OIL_BAD, multi: true },
  { code: 'Q6', col: 'would_switch', title: 'Would switch', options: WOULD_SWITCH },
  { code: 'Q7', col: 'price_band', title: 'Would pay', options: PRICE_OPTIONS },
  { code: 'Q7b', col: 'current_product', title: 'Current product', text: true },
]
const question = (col) => QUESTIONS.find((q) => q.col === col)

const FILTER_KEYS = ['gender', 'image_set', 'hair_type', 'climate']
const NO_FILTERS = { ...Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])), completedOnly: false }

// Free-text answers listed in the "Open answers" tab: typed questions plus every "Other" box.
const OPEN_FIELDS = QUESTIONS.flatMap((q) => [
  ...(q.text ? [[q.col, `${q.code} · ${q.title}`]] : []),
  ...(q.other ? [[q.other, `${q.code} · ${q.title} (Other)`]] : []),
])

export default function Admin() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) return setSession(null)
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Centered>Supabase env vars are missing.</Centered>
  if (session === undefined) return <Centered>Loading…</Centered>
  if (!session) return <Login />
  return <Dashboard session={session} />
}

function Centered({ children }) {
  return <div className="grid min-h-dvh place-items-center p-6 text-center text-muted">{children}</div>
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-extrabold">Survey admin</h1>
        <label className="mb-1 block text-sm font-semibold" htmlFor="ae">Email</label>
        <input id="ae" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mb-3 min-h-12 w-full rounded-xl border-2 border-line px-3 outline-none focus:border-accent" />
        <label className="mb-1 block text-sm font-semibold" htmlFor="ap">Password</label>
        <input id="ap" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="mb-4 min-h-12 w-full rounded-xl border-2 border-line px-3 outline-none focus:border-accent" />
        {error && <p className="mb-3 text-sm font-semibold text-[#b42318]">{error}</p>}
        <button disabled={busy} className="min-h-12 w-full rounded-xl bg-accent font-bold text-white disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

async function fetchAll(table, order) {
  const page = 1000
  let from = 0
  const out = []
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').order(order).range(from, from + page - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < page) return out
    from += page
  }
}

function Dashboard({ session }) {
  const [state, setState] = useState({ loading: true })
  const [filters, setFilters] = useState(NO_FILTERS)
  const [tab, setTab] = useState('charts')

  async function load() {
    setState((s) => ({ ...s, loading: true }))
    try {
      const { data: isAdmin, error } = await supabase.rpc('is_admin')
      if (error) throw error
      if (!isAdmin) return setState({ loading: false, notAdmin: true })
      const [rows, contacts] = await Promise.all([fetchAll('responses', 'created_at'), fetchAll('contacts', 'created_at')])
      setState({ loading: false, rows, contacts })
    } catch (err) {
      setState({ loading: false, error: err.message || String(err) })
    }
  }
  useEffect(() => {
    load()
  }, [])

  const all = state.rows || []
  const rows = useMemo(
    () =>
      all.filter(
        (r) =>
          (!filters.completedOnly || r.completed) &&
          FILTER_KEYS.every((k) => !filters[k] || r[k] === filters[k]),
      ),
    [all, filters],
  )
  const filtered = rows.length !== all.length

  const signOut = () => supabase.auth.signOut()

  if (state.notAdmin)
    return (
      <Centered>
        <div>
          <p className="mb-3">{session.user.email} isn't the admin account.</p>
          <button onClick={signOut} className="font-semibold text-accent underline">Sign out</button>
        </div>
      </Centered>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-extrabold">Hair hold research</h1>
        <button onClick={load} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm">↻ Refresh</button>
        <button
          onClick={() =>
            download(
              `responses-${new Date().toISOString().slice(0, 10)}.csv`,
              toCsv(all.map((r) => ({ ...r, price_label: priceLabel(r.price_band, r.currency) })), RESPONSE_COLUMNS),
            )
          }
          className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Export responses CSV
        </button>
        <button
          onClick={() => download('contacts.csv', toCsv(state.contacts || [], ['email', 'created_at']))}
          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm"
        >
          Export emails ({state.contacts?.length ?? 0})
        </button>
        <button onClick={signOut} className="text-sm font-semibold text-muted underline">Sign out</button>
      </header>

      {state.error && <p className="mb-4 rounded-xl bg-[#fde8e8] p-3 text-sm font-semibold text-[#8a1c1c]">Error: {state.error}</p>}
      {state.loading && !state.rows && <p className="text-muted">Loading responses…</p>}

      {state.rows && (
        <>
          <Filters filters={filters} setFilters={setFilters} shown={rows.length} />
          <div className="mb-4 flex gap-1 text-sm font-semibold" role="tablist">
            {[['charts', 'Charts'], ['open', 'Open answers']].map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`min-h-10 rounded-xl px-4 ${tab === k ? 'bg-ink text-white' : 'bg-white shadow-sm'}`}
              >
                {l}
              </button>
            ))}
          </div>
          {tab === 'open' ? (
            <OpenAnswers rows={rows} />
          ) : (
            <>
              <Overview rows={rows} all={all} contacts={state.contacts} filtered={filtered} />
              <Hypotheses rows={rows} />
              <SectionHeading>Your hold</SectionHeading>
              <ChoiceGrid rows={rows} cols={['q2_event_hold']} />
              <SectionHeading>Products & routine</SectionHeading>
              <ChoiceGrid rows={rows} cols={['uses_products', 'products_used', 'main_product', 'finish_preference']} />
              <SectionHeading>Downsides</SectionHeading>
              <div className="grid gap-4 lg:grid-cols-2">
                <DownsidesCard rows={rows} />
                <WorstCard rows={rows} />
              </div>
              <div className="mt-4">
                <DownsidesByProductCard rows={rows} />
              </div>
              <SectionHeading>Washing & workouts</SectionHeading>
              <ChoiceGrid
                rows={rows}
                cols={['wash_frequency', 'product_makes_wash_more', 'workout_non_wash_day', 'pre_workout', 'post_workout_annoyance']}
              />
              <SectionHeading>Mousse</SectionHeading>
              <MousseCompareCard rows={rows} />
              <div className="mt-4">
                <WomensProductCard rows={rows} col="mousse_never_reason" />
              </div>
              <ChoiceGrid rows={rows} cols={['mousse_use', 'mousse_never_reason', 'mousse_uses', 'mousse_problems', 'mousse_duration']} />
              <SectionHeading>Hair oil</SectionHeading>
              <div className="grid gap-4 lg:grid-cols-2">
                <OilHoldCard rows={rows} />
                <WomensProductCard rows={rows} col="oil_never_reason" />
              </div>
              <ChoiceGrid rows={rows} cols={['oil_use', 'oil_never_reason', 'oil_where', 'oil_good', 'oil_bad']} />
              <SectionHeading>Hair type</SectionHeading>
              <div className="grid gap-4 lg:grid-cols-2">
                <HairWishCard rows={rows} />
                <ChoiceCard rows={rows} q={question('wanted_hair_type')} />
              </div>
              <SectionHeading>Value</SectionHeading>
              <div className="grid gap-4 lg:grid-cols-2">
                <SwitchCard rows={rows} />
                <PriceCard rows={rows} />
              </div>
              <SectionHeading>Skips</SectionHeading>
              <SkipCard rows={rows} />
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ───────────── layout bits ───────────── */

function Card({ title, sub, children, className = '' }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>
      <h2 className="text-lg font-bold leading-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Legend({ items }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: color }} /> {label}
        </span>
      ))}
    </div>
  )
}

function Bar({ value, color, title }) {
  return (
    <div className="h-3 flex-1 rounded-r bg-[#f1ede8]" title={title}>
      <div className="h-full rounded-r" style={{ width: `${value ?? 0}%`, background: color }} />
    </div>
  )
}

const Empty = () => <p className="text-sm text-muted">No data yet for this selection.</p>

/* ───────────── filters & overview ───────────── */

function Filters({ filters, setFilters, shown }) {
  const defs = [
    ['gender', 'Gender', GENDERS],
    ['image_set', 'Images', IMAGE_SETS],
    ['hair_type', 'Hair type', HAIR_TYPES],
    ['climate', 'Climate', CLIMATES],
  ]
  const active = defs.some(([k]) => filters[k]) || filters.completedOnly
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-canvas/95 px-4 py-3 backdrop-blur">
      {defs.map(([key, label, opts]) => (
        <select
          key={key}
          value={filters[key]}
          onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
          className={`min-h-10 rounded-xl border-2 bg-white px-2 text-sm font-semibold ${filters[key] ? 'border-accent' : 'border-line'}`}
          aria-label={label}
        >
          <option value="">{label}: all</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      <label className="flex min-h-10 items-center gap-2 rounded-xl border-2 border-line bg-white px-3 text-sm font-semibold">
        <input type="checkbox" checked={filters.completedOnly} onChange={(e) => setFilters((f) => ({ ...f, completedOnly: e.target.checked }))} />
        Completed only
      </label>
      {active && (
        <button
          onClick={() => setFilters(NO_FILTERS)}
          className="text-sm font-semibold text-accent underline"
        >
          Clear
        </button>
      )}
      <span className="ml-auto text-sm text-muted">{shown} responses in view</span>
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function Overview({ rows, all, contacts, filtered }) {
  const completed = rows.filter((r) => r.completed).length
  const utm = [...countBy(rows, (r) => r.utm_source || '(none)').entries()].sort((a, b) => b[1] - a[1])
  const dropoff = [...countBy(rows.filter((r) => !r.completed), (r) => r.last_step || '(unknown)').entries()].sort(
    (a, b) => b[1] - a[1],
  )
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
        <Stat label="Responses" value={rows.length} sub={filtered ? `of ${all.length} total` : 'started the quiz'} />
        <Stat label="Completed" value={completed} />
        <Stat label="Completion rate" value={fmtPct(pct(completed, rows.length))} />
        <Stat label="Emails left" value={contacts.length} sub="not filterable (anonymous)" />
      </div>
      <Card title="By UTM source">
        <Table
          head={['Source', 'Started', 'Done %']}
          rows={utm.map(([src, n]) => {
            const done = rows.filter((r) => (r.utm_source || '(none)') === src && r.completed).length
            return [src, n, fmtPct(pct(done, n))]
          })}
        />
      </Card>
      <Card title="Where people drop off" sub="Last section reached, unfinished responses">
        {dropoff.length ? <Table head={['Reached', 'People']} rows={dropoff} /> : <Empty />}
      </Card>
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-muted">
          {head.map((h, i) => <th key={h} className={`pb-1 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} className="border-t border-line">
            {r.map((c, i) => <td key={i} className={`py-1.5 ${i ? 'text-right tabular-nums' : 'font-semibold'}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ───────────── downsides ───────────── */

const byGender = (rows, g) => rows.filter((r) => r.gender === g)

function DownsidesCard({ rows }) {
  const all = downsideRates(rows)
  const men = downsideRates(byGender(rows, 'man'))
  const women = downsideRates(byGender(rows, 'woman'))
  const order = [...REAL_DOWNSIDES].sort((a, b) => (all.rates[b.value] ?? 0) - (all.rates[a.value] ?? 0))
  return (
    <Card title="Downsides people experience (Q4)" sub={`% of product users who ticked each · all ${all.n}, men ${men.n}, women ${women.n}`}>
      {!all.n ? <Empty /> : (
        <>
          <Legend items={[['Men', C.men], ['Women', C.women]]} />
          <div className="space-y-3">
            {order.map((d) => (
              <div key={d.value}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{d.label}</span>
                  <span className="tabular-nums text-muted">all {fmtPct(all.rates[d.value])}</span>
                </div>
                {[['Men', men, C.men], ['Women', women, C.women]].map(([l, s, color]) => (
                  <div key={l} className="mb-[2px] flex items-center gap-2">
                    <Bar value={s.rates[d.value]} color={color} title={`${l}: ${fmtPct(s.rates[d.value], 1)} of ${s.n}`} />
                    <span className="w-10 text-right text-xs tabular-nums">{fmtPct(s.rates[d.value])}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">"None of these": {fmtPct(pct(rows.filter((r) => r.downsides?.includes('none')).length, all.n))}</p>
        </>
      )}
    </Card>
  )
}

function Ranking({ title, data, color }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{title} <span className="font-normal text-muted">(n={data.n})</span></p>
      {!data.n ? <Empty /> : (
        <ol className="space-y-1.5">
          {data.ranked.map((r, i) => (
            <li key={r.value} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-muted">{i + 1}</span>
              <span className="w-36 truncate font-semibold">{r.label}</span>
              <Bar value={r.pct} color={color} title={`${r.count} people`} />
              <span className="w-10 text-right tabular-nums">{fmtPct(r.pct)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function WorstCard({ rows }) {
  return (
    <Card title="What bothers them most (Q4b)" sub="Includes people who ticked only one downside (it's their worst by default).">
      <div className="space-y-5">
        <Ranking title="Men" data={worstRanking(byGender(rows, 'man'))} color={C.men} />
        <Ranking title="Women" data={worstRanking(byGender(rows, 'woman'))} color={C.women} />
        <Ranking title="Everyone" data={worstRanking(rows)} color={C.neutral} />
      </div>
    </Card>
  )
}

/* ───────────── value ───────────── */

function StackRow({ label, dist, colors }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-muted">n={dist.n}</span>
      </div>
      {dist.n ? (
        <div className="flex h-7 gap-[2px] overflow-hidden rounded-lg">
          {dist.parts.map((p, i) => p.count > 0 && (
            <div
              key={p.value}
              title={`${p.label}: ${p.count} (${fmtPct(p.pct, 1)})`}
              className="grid place-items-center text-[11px] font-bold"
              style={{ width: `${p.pct}%`, background: colors[i], color: DARK_FILLS.includes(colors[i]) ? '#fff' : '#1f1b17' }}
            >
              {p.pct >= 9 ? fmtPct(p.pct) : ''}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-7 rounded-lg bg-[#f1ede8]" />
      )}
    </div>
  )
}

function segments(rows) {
  return [
    ['Everyone', rows],
    ['Men', byGender(rows, 'man')],
    ['Women', byGender(rows, 'woman')],
  ]
}

function SwitchCard({ rows }) {
  const colors = [C.ramp[3], C.ramp[1], C.neutral]
  return (
    <Card title="Would they switch? (Q6)" sub="To a product with their ideal hold that leaves hair & scalp moisturised">
      <Legend items={WOULD_SWITCH.map((o, i) => [o.label, colors[i]])} />
      {segments(rows).map(([l, set]) => (
        <StackRow key={l} label={l} dist={distribution(set, 'would_switch', WOULD_SWITCH)} colors={colors} />
      ))}
    </Card>
  )
}

function PriceCard({ rows }) {
  const bands = PRICE_OPTIONS
  return (
    <Card
      title="What they'd pay (Q7)"
      sub="Bands are comparable across currencies (band 1 = lowest)."
    >
      <Legend items={bands.map((b, i) => [b.label, C.ramp[i]])} />
      {segments(rows).map(([l, set]) => (
        <StackRow key={l} label={l} dist={distribution(set, 'price_band', bands)} colors={C.ramp} />
      ))}
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer font-semibold">Band ranges by currency</summary>
        <table className="mt-2 w-full">
          <tbody>
            {Object.entries(PRICE_BANDS).map(([cur, labels]) => (
              <tr key={cur}><th className="pr-2 text-left">{cur}</th>{labels.map((l) => <td key={l} className="pr-2">{l}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  )
}

/* ───────────── every multiple-choice question ───────────── */

function SectionHeading({ children }) {
  return <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>
}

// Skipped (pressed Skip) and not shown (branch hid it, or they quit first) are kept apart.
function SkipLine({ s }) {
  return (
    <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      <span><b className="text-ink">{s.answered}</b> answered</span>
      <span><b className="text-ink">{fmtPct(s.skipRate)}</b> skipped ({s.skipped})</span>
      <span><b className="text-ink">{s.notShown}</b> not shown</span>
    </p>
  )
}

function ChoiceCard({ rows, q }) {
  const s = skipStats(rows, q.col)
  const base = rows.filter((r) => isAnswered(r[q.col]))
  const has = (r, v) => (q.multi ? r[q.col].includes(v) : r[q.col] === v)
  const parts = q.options.map((o) => {
    const count = base.filter((r) => has(r, o.value)).length
    return { ...o, count, pct: pct(count, base.length) }
  })
  const others = q.other ? rows.filter((r) => isAnswered(r[q.other])).length : 0
  return (
    <Card title={`${q.code} · ${q.title}`} sub={q.multi ? 'Tick all · % of people who answered that ticked each' : '% of people who answered'}>
      <SkipLine s={s} />
      {!base.length ? <Empty /> : (
        <div className="space-y-1.5">
          {parts.map((p) => (
            <div key={String(p.value)} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-2 text-sm">
              <span className="truncate font-semibold" title={p.label}>{p.label}</span>
              <Bar value={p.pct} color={C.bar} title={`${p.count} people (${fmtPct(p.pct, 1)})`} />
              <span className="text-right tabular-nums">{fmtPct(p.pct)}</span>
            </div>
          ))}
        </div>
      )}
      {q.other && <p className="mt-3 text-xs text-muted">{others} typed an “Other” answer. Read them in Open answers.</p>}
    </Card>
  )
}

function ChoiceGrid({ rows, cols }) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {cols.map((c) => <ChoiceCard key={c} rows={rows} q={question(c)} />)}
    </div>
  )
}

function SkipCard({ rows }) {
  return (
    <Card
      title="Skip rate per question"
      sub="Skip % = pressed Skip ÷ (answered + skipped). Not shown = a branch hid it, or they left before reaching it."
    >
      <div className="overflow-x-auto">
        <Table
          head={['Question', 'Answered', 'Skipped', 'Skip %', 'Not shown']}
          rows={QUESTIONS.map((q) => {
            const s = skipStats(rows, q.col)
            return [`${q.code} · ${q.title}`, s.answered, s.skipped, fmtPct(s.skipRate), s.notShown]
          })}
        />
      </div>
    </Card>
  )
}

// Q4 downsides per P2b main product: % of that product's users (who answered Q4) ticking each.
function DownsidesByProductCard({ rows }) {
  const groups = MAIN_PRODUCTS.map((p) => ({ ...p, rates: downsideRates(rows.filter((r) => r.main_product === p.value)) }))
    .filter((g) => g.rates.n > 0)
    .sort((a, b) => b.rates.n - a.rates.n)
  return (
    <Card
      title="Downsides by main product (Q4 × P2b)"
      sub="Each column: people whose main product is that one and who answered Q4. Cell = % who ticked the downside."
    >
      {!groups.length ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-[3px] text-center text-sm">
            <thead>
              <tr>
                <th />
                {groups.map((g) => (
                  <th key={g.value} className="px-1 pb-1 text-xs font-semibold leading-tight">
                    {g.label} <span className="block font-normal text-muted">n={g.rates.n}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REAL_DOWNSIDES.map((d) => (
                <tr key={d.value}>
                  <th className="pr-1 text-left text-xs font-semibold leading-tight">{d.label}</th>
                  {groups.map((g) => {
                    const v = g.rates.rates[d.value] ?? 0
                    return (
                      <td
                        key={g.value}
                        title={`${g.label} users: ${fmtPct(v, 1)} ticked ${d.label}`}
                        className="h-10 rounded-lg text-xs font-bold tabular-nums"
                        style={{ background: v ? `rgba(42,120,214,${0.08 + (v / 100) * 0.85})` : '#f6f3ef', color: v > 50 ? '#fff' : '#1f1b17' }}
                      >
                        {fmtPct(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// Current hair type (rows) vs. the one they'd like (columns); cells are % of the row.
function HairWishCard({ rows }) {
  const both = rows.filter((r) => isAnswered(r.hair_type) && isAnswered(r.wanted_hair_type))
  const different = both.filter((r) => r.wanted_hair_type !== 'happy' && r.wanted_hair_type !== r.hair_type).length
  return (
    <Card
      title="Hair type now vs. the one they’d like"
      sub={`${both.length} people answered both. Rows = their hair now; cells = % of that row. Outlined = wants a different type.`}
    >
      {!both.length ? <Empty /> : (
        <>
          <p className="mb-3 text-sm">
            <b className="text-2xl font-extrabold tabular-nums">{fmtPct(pct(different, both.length))}</b>{' '}
            <span className="text-muted">want a different hair type ({different} of {both.length})</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-separate border-spacing-[3px] text-center text-sm">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold uppercase leading-tight text-muted">Now ↓ · Want →</th>
                  {WANTED_HAIR_TYPES.map((w) => <th key={w.value} className="px-1 pb-1 text-xs font-semibold leading-tight">{w.value === 'happy' ? 'Happy' : w.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {HAIR_TYPES.map((h) => {
                  const row = both.filter((r) => r.hair_type === h.value)
                  return (
                    <tr key={h.value}>
                      <th className="pr-1 text-left text-xs font-semibold leading-tight">{h.label} <span className="font-normal text-muted">({row.length})</span></th>
                      {WANTED_HAIR_TYPES.map((w) => {
                        const c = row.filter((r) => r.wanted_hair_type === w.value).length
                        const v = pct(c, row.length) ?? 0
                        const changes = w.value !== 'happy' && w.value !== h.value
                        return (
                          <td
                            key={w.value}
                            title={`${h.label} now → ${w.label}: ${c} people (${fmtPct(v, 1)})`}
                            className={`h-12 rounded-lg ${changes ? 'outline-[3px] -outline-offset-[3px] outline-accent outline' : ''}`}
                            style={{ background: c ? `rgba(42,120,214,${0.08 + (v / 100) * 0.85})` : '#f6f3ef', color: v > 50 ? '#fff' : '#1f1b17' }}
                          >
                            <div className="text-sm font-bold tabular-nums">{c}</div>
                            <div className="text-[11px] tabular-nums opacity-90">{fmtPct(pct(c, row.length))}</div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}

/* ───────────── mousse & oil ───────────── */

// "Seems like a women's product" in M1b / O1b, split by gender.
function WomensProductCard({ rows, col }) {
  const q = question(col)
  const answered = rows.filter((r) => isAnswered(r[col]))
  const segs = GENDERS.map((g) => {
    const base = answered.filter((r) => r.gender === g.value)
    const count = base.filter((r) => r[col] === WOMENS_PRODUCT).length
    return { ...g, n: base.length, count, pct: pct(count, base.length) }
  })
  const total = answered.filter((r) => r[col] === WOMENS_PRODUCT).length
  const color = (g) => (g === 'man' ? C.men : g === 'woman' ? C.women : C.neutral)
  return (
    <Card
      title={`“Seems like a women's product” (${q.code})`}
      sub={`% of each gender who answered ${q.code} (${q.title.toLowerCase()}) and chose it · ${total} of ${answered.length} overall`}
    >
      {!answered.length ? <Empty /> : (
        <div className="space-y-2">
          {segs.map((s) => (
            <div key={s.value} className="grid grid-cols-[minmax(0,8rem)_1fr_5.5rem] items-center gap-2 text-sm">
              <span className="truncate font-semibold">{s.label}</span>
              <Bar value={s.pct} color={color(s.value)} title={`${s.count} of ${s.n}`} />
              <span className="text-right tabular-nums">
                {fmtPct(s.pct)} <span className="text-xs text-muted">({s.count}/{s.n})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// M4 (people who used mousse) vs. Q4 (product users who have never used mousse).
function MousseCompareCard({ rows }) {
  const realProblems = MOUSSE_PROBLEMS.filter((o) => !['none', 'other'].includes(o.value))
  const m = tickRates(rows, 'mousse_problems', realProblems)
  const q4 = downsideRates(rows.filter((r) => r.mousse_use === 'never'))
  const shared = REAL_DOWNSIDES.filter((d) => realProblems.some((p) => p.value === d.value))
  const mousseOnly = realProblems.filter((p) => !shared.some((d) => d.value === p.value))
  const q4Only = REAL_DOWNSIDES.filter((d) => !shared.includes(d))
  const MOUSSE = C.ramp[3]
  const single = (list, data, color) => (
    <div className="space-y-1.5">
      {list.map((o) => (
        <div key={o.value} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate font-semibold">{o.label}</span>
          <Bar value={data.rates[o.value]} color={color} />
          <span className="text-right text-xs tabular-nums">{fmtPct(data.rates[o.value])}</span>
        </div>
      ))}
    </div>
  )
  return (
    <Card
      title="Mousse problems (M4) vs. downsides of non-mousse users (Q4)"
      sub={`Mousse users who answered M4: n=${m.n}. Non-mousse users = M1 “Never” who answered Q4: n=${q4.n}. Q4 is only asked to people who use products.`}
    >
      {!m.n && !q4.n ? <Empty /> : (
        <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <div>
            <Legend items={[['Mousse users (M4)', MOUSSE], ['Non-mousse users (Q4)', C.neutral]]} />
            <div className="space-y-2.5">
              {shared.map((d) => {
                const a = m.rates[d.value]
                const b = q4.rates[d.value]
                const diff = a != null && b != null ? a - b : null
                return (
                  <div key={d.value} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-2 text-sm">
                    <span className="truncate font-semibold">{d.label}</span>
                    <div className="space-y-[2px]">
                      <div className="flex items-center gap-2"><Bar value={a} color={MOUSSE} title={`Mousse: ${fmtPct(a, 1)}`} /><span className="w-9 text-right text-xs tabular-nums">{fmtPct(a)}</span></div>
                      <div className="flex items-center gap-2"><Bar value={b} color={C.neutral} title={`Non-mousse: ${fmtPct(b, 1)}`} /><span className="w-9 text-right text-xs tabular-nums">{fmtPct(b)}</span></div>
                    </div>
                    <span className={`text-right text-xs font-bold tabular-nums ${diff > 0 ? 'text-accent' : 'text-muted'}`}>{diff == null ? '' : `${diff > 0 ? '+' : ''}${diff.toFixed(0)} pts`}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-bold">Only asked about mousse</p>
              {single(mousseOnly, m, MOUSSE)}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Only in Q4 (non-mousse users)</p>
              {single(q4Only, q4, C.neutral)}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function OilHoldCard({ rows }) {
  const rate = (set) => {
    const base = set.filter((r) => ticks(r.oil_bad).length)
    return { n: base.length, pct: pct(base.filter((r) => r.oil_bad.includes('kills_hold')).length, base.length) }
  }
  const all = rate(rows)
  const bySegment = EVER_USED.filter((o) => o.value !== 'never').map((o) => [o.label, rate(rows.filter((r) => r.oil_use === o.value))])
  return (
    <Card title="Does oil kill volume or hold? (O4)" sub="% of people who answered O4 that ticked “Kills volume or hold”">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-5xl font-extrabold tabular-nums text-accent">{fmtPct(all.pct)}</p>
          <p className="mt-1 text-xs text-muted">n={all.n}</p>
        </div>
        {bySegment.map(([l, s]) => (
          <div key={l}>
            <p className="text-xs font-semibold text-muted">{l}</p>
            <p className="text-2xl font-extrabold tabular-nums">{fmtPct(s.pct)}</p>
            <p className="text-xs text-muted">n={s.n}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ───────────── open answers ───────────── */

function OpenAnswers({ rows }) {
  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const items = useMemo(
    () =>
      rows.flatMap((r) =>
        OPEN_FIELDS.flatMap(([col, label]) =>
          (Array.isArray(r[col]) ? r[col] : [r[col]])
            .filter((t) => isAnswered(t))
            .map((text, i) => ({ key: `${r.id}-${col}-${i}`, col, label, text, r })),
        ),
      ),
    [rows],
  )
  const counts = countBy(items, (it) => it.col)
  const needle = search.trim().toLowerCase()
  const shown = items.filter(
    (it) => (!field || it.col === field) && (!needle || it.text.toLowerCase().includes(needle) || it.label.toLowerCase().includes(needle)),
  )
  return (
    <Card title="Open answers" sub="Every typed answer (skips left out). The filters above apply here too.">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search answers…"
          aria-label="Search answers"
          className="min-h-10 min-w-0 flex-1 rounded-xl border-2 border-line px-3 text-sm outline-none focus:border-accent"
        />
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          aria-label="Question"
          className={`min-h-10 max-w-full rounded-xl border-2 bg-white px-2 text-sm font-semibold ${field ? 'border-accent' : 'border-line'}`}
        >
          <option value="">All questions ({items.length})</option>
          {OPEN_FIELDS.map(([col, label]) => (
            <option key={col} value={col}>{label} ({counts.get(col) || 0})</option>
          ))}
        </select>
      </div>
      <p className="mb-2 text-xs text-muted">{shown.length} answers</p>
      {!shown.length ? <Empty /> : (
        <ul className="divide-y divide-line">
          {shown.map((it) => (
            <li key={it.key} className="py-3">
              <p className="text-xs font-semibold text-accent">{it.label}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug">{it.text}</p>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted">
                <span className="rounded-full bg-[#f1ede8] px-2 py-0.5">Gender: {labelFor(GENDERS, it.r.gender)}</span>
                <span className="rounded-full bg-[#f1ede8] px-2 py-0.5">Hair: {labelFor(HAIR_TYPES, it.r.hair_type)}</span>
                <span className="px-1 py-0.5 font-normal">{new Date(it.r.created_at).toLocaleDateString()}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ───────────── hypothesis checker ───────────── */

function verdict(n, ok) {
  if (n < MIN_N) return ['Need more data', 'bg-[#f1ede8] text-muted']
  return ok ? ['Supported', 'bg-[#e3f4e8] text-[#14532d]'] : ['Not supported', 'bg-[#fde8e8] text-[#8a1c1c]']
}

function topTwo(data) {
  return data.ranked.slice(0, 2).map((r) => r.value)
}

function Hypotheses({ rows }) {
  const menW = worstRanking(byGender(rows, 'man'))
  const womenW = worstRanking(byGender(rows, 'woman'))
  const menTop = topTwo(menW)
  const womenTop = topTwo(womenW)
  const listTop = (d) => d.ranked.slice(0, 3).map((r) => `${r.label} ${fmtPct(r.pct)}`).join(' · ') || '—'

  const interested = rows.filter((r) => ['yes', 'maybe'].includes(r.would_switch) && isAnswered(r.price_band))
  const premium = pct(interested.filter(isTopPrice).length, interested.length)

  const items = [
    {
      claim: 'Men care most about flakes and scalp itch',
      metric: menW.ranked[0]?.label ?? '—',
      detail: `Men's top “bothers most”: ${listTop(menW)}. Supported if flakes or itchy scalp is in the top 2.`,
      v: verdict(menW.n, menTop.includes('flakes') || menTop.includes('itchy_scalp')),
      n: menW.n,
    },
    {
      claim: 'Women care most about crunch and dryness',
      metric: womenW.ranked[0]?.label ?? '—',
      detail: `Women's top “bothers most”: ${listTop(womenW)}. Supported if crunchy/stiff or dry hair is in the top 2.`,
      v: verdict(womenW.n, womenTop.includes('crunchy') || womenTop.includes('dry_hair')),
      n: womenW.n,
    },
    {
      claim: 'People would pay a premium',
      metric: fmtPct(premium),
      detail: `of Yes/Maybe switchers (Q6) chose the top two price bands (Q7). Supported if ≥ ${T.premium}%.`,
      v: verdict(interested.length, premium >= T.premium),
      n: interested.length,
    },
  ]

  return (
    <Card
      className="mb-4"
      title="Hypothesis checker"
      sub={`Verdicts need at least ${MIN_N} answers. Thresholds are set at the top of src/admin/Admin.jsx.`}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it, i) => (
          <div key={it.claim} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold leading-snug">{i + 1}. {it.claim}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${it.v[1]}`}>{it.v[0]}</span>
            </div>
            <p className="mt-2 text-2xl font-extrabold tabular-nums">{it.metric}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{it.detail} <span className="whitespace-nowrap">(n={it.n})</span></p>
          </div>
        ))}
      </div>
    </Card>
  )
}
