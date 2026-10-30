import { useMemo, useRef, useState } from 'react'
import {
  CLIMATES,
  COLOURED,
  COUNTRIES,
  DOWNSIDES,
  EVER_USED,
  FINISHES,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HOLD_LEVELS,
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
  SKIP,
  USED_IT,
  WASH_FREQUENCY,
  WASH_MORE,
  WEAKER_HOLD,
  WORKOUT_NON_WASH_DAY,
  WANTED_HAIR_TYPES,
  WOULD_SWITCH,
  YES_NO,
  currencyForCountry,
  guessCountry,
  imageSetFor,
} from '../lib/config.js'
import { saveContact, saveResponse } from '../lib/supabase.js'
import { Choices, HairIcon, HoldGrid, HoldImage, PrimaryButton, SkipButton, TextField } from './ui.jsx'

const ADVANCE_DELAY = 260

const SECTIONS = {
  start: 'First up',
  hold: 'Your hold',
  products: 'Products & routine',
  downsides: 'The downsides',
  washing: 'Washing & workouts',
  mousse: 'Mousse',
  oil: 'Hair oil',
  value: 'Worth it?',
  about: 'About you',
}

// Screen order. `when` hides a screen based on earlier answers; `fields` are the
// database columns the screen fills. A field can carry its own `when`
// (e.g. an "Other" box that only counts while "Other" is picked) and a function
// that derives its value from the answers.
// Only a real answer opens a branch: skipping a gate question hides its follow-ups.
const STEPS = [
  { id: 'intro' },
  // No Skip here: gender picks the hold image set. "Prefer not to say" asks for the set instead.
  { id: 'gender', section: 'start', fields: ['gender', ['image_set', null, imageSet]] },
  { id: 'image_set', section: 'start', when: (a) => a.gender === 'prefer_not' },
  { id: 'hair_type', section: 'about', fields: ['hair_type'] },
  { id: 'wanted_hair_type', section: 'about', fields: ['wanted_hair_type'] },
  { id: 'hair_length', section: 'about', fields: ['hair_length'] },
  { id: 'coloured', section: 'about', fields: ['coloured'] },
  { id: 'climate', section: 'about', fields: ['climate'] },
  // Only the event hold is asked now; q1_normal_hold / q3_ideal_hold (and hold_gap) stay NULL.
  { id: 'q2', section: 'hold', fields: ['q2_event_hold'] },
  { id: 'p1', section: 'products', fields: ['uses_products'] },
  { id: 'p2', section: 'products', when: usesProducts, fields: ['products_used', ['main_product', (a) => realProducts(a).length, mainProduct]] },
  { id: 'p2b', section: 'products', when: (a) => usesProducts(a) && realProducts(a).length >= 2 },
  { id: 'f1', section: 'products', fields: ['finish_preference'] },
  { id: 'p3', section: 'products', when: usesProducts, fields: ['routine'] },
  { id: 'p4', section: 'products', fields: ['routine_change'] },
  { id: 'q4', section: 'downsides', when: usesProducts, fields: ['downsides'] },
  { id: 'q4b', section: 'downsides', when: (a) => usesProducts(a) && realDownsides(a).length >= 2, fields: ['worst_downside'] },
  { id: 'q4c', section: 'downsides', when: usesProducts, fields: ['chose_weaker_hold'] },
  { id: 'w1', section: 'washing', fields: ['wash_frequency'] },
  { id: 'w2', section: 'washing', when: usesProducts, fields: ['product_makes_wash_more'] },
  { id: 'w3', section: 'washing', fields: ['workout_non_wash_day', other('workout_non_wash_day')] },
  { id: 'w4', section: 'washing', fields: ['pre_workout', other('pre_workout')] },
  { id: 'w5', section: 'washing', fields: ['post_workout_annoyance', other('post_workout_annoyance')] },
  { id: 'm1', section: 'mousse', fields: ['mousse_use', ...whyFields('mousse')] },
  { id: 'm1b', section: 'mousse', when: (a) => a.mousse_use === 'never', fields: ['mousse_never_reason', other('mousse_never_reason')] },
  { id: 'm2', section: 'mousse', when: usedMousse, fields: ['mousse_brand'] },
  { id: 'm3', section: 'mousse', when: usedMousse, fields: ['mousse_uses'] },
  { id: 'm4', section: 'mousse', when: usedMousse, fields: ['mousse_problems', otherTicked('mousse_problems')] },
  { id: 'm5', section: 'mousse', when: usedMousse, fields: ['mousse_duration'] },
  { id: 'm6', section: 'mousse', when: usedMousse, fields: ['mousse_features'] },
  { id: 'o1', section: 'oil', fields: ['oil_use', ...whyFields('oil')] },
  { id: 'o1b', section: 'oil', when: (a) => a.oil_use === 'never', fields: ['oil_never_reason', other('oil_never_reason')] },
  { id: 'o2', section: 'oil', when: usedOil, fields: ['oil_where'] },
  { id: 'o3', section: 'oil', when: usedOil, fields: ['oil_good'] },
  { id: 'o4', section: 'oil', when: usedOil, fields: ['oil_bad'] },
  { id: 'q6', section: 'value', fields: ['would_switch'] },
  { id: 'q7', section: 'value', fields: ['price_band', ['currency', (a) => a.price_band && a.price_band !== SKIP]] },
  { id: 'q7b', section: 'value', fields: ['current_product'] },
  { id: 'outro' },
]

function usesProducts(a) {
  return a.uses_products === 'yes'
}
function imageSet(a) {
  return imageSetFor(a.gender) ?? a.image_set
}
function realProducts(a) {
  return asList(a.products_used).filter((p) => p !== 'nothing')
}
// P2b is only asked with 2+ products; with exactly one, that one is the main product.
function mainProduct(a) {
  const list = realProducts(a)
  return list.length === 1 ? list[0] : a.main_product
}
function usedMousse(a) {
  return USED_IT.includes(a.mousse_use)
}
function usedOil(a) {
  return USED_IT.includes(a.oil_use)
}
function realDownsides(a) {
  return asList(a.downsides).filter((d) => d !== 'none')
}
function other(field) {
  return [`${field}_other`, (a) => a[field] === 'other']
}
function otherTicked(field) {
  return [`${field}_other`, (a) => asList(a[field]).includes('other')]
}
function whyFields(prefix) {
  return [
    [`${prefix}_stop_reason`, (a) => a[`${prefix}_use`] === 'stopped'],
    [`${prefix}_tried_reason`, (a) => a[`${prefix}_use`] === 'tried'],
  ]
}

const isVisible = (step, a) => !step.when || step.when(a)
const stepById = (id) => STEPS.find((s) => s.id === id)

// Ticked options, ignoring a previous Skip.
const asList = (v) => (Array.isArray(v) && !v.includes(SKIP) ? v : [])
// Text box contents, ignoring a previous Skip.
const txt = (v) => (typeof v === 'string' && v !== SKIP ? v : '')

function shuffled(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function newRespondentId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Everything is stored as text / text[]: hold levels become '1'–'4', empty boxes NULL.
function clean(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) {
    const list = v.map((x) => String(x).trim()).filter(Boolean)
    return list.length ? list : null
  }
  return String(v)
}

// Every column on every save. Anything this respondent can't see on their current
// path is sent as NULL, so going back and changing an answer never leaves stale data.
function buildPayload(a, meta) {
  const out = { utm_source: meta.utmSource, image_order: meta.imageOrder }
  for (const step of STEPS) {
    for (const f of step.fields || []) {
      const [col, when, value = (x) => x[col]] = Array.isArray(f) ? f : [f]
      out[col] = isVisible(step, a) && (!when || when(a)) ? clean(value(a)) : null
    }
  }
  return out
}

export default function Survey() {
  const meta = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      respondentId: newRespondentId(),
      imageOrder: shuffled([1, 2, 3, 4]),
      utmSource: params.get('utm_source')?.slice(0, 100) || null,
      // Only pre-selects the country picker and the price currency; never saved as an answer.
      countryGuess: guessCountry(),
    }
  }, [])

  const [answers, setAnswers] = useState(() => ({ currency: currencyForCountry(meta.countryGuess) }))
  const [history, setHistory] = useState(['intro'])
  const advancing = useRef(false)

  const stepId = history[history.length - 1]
  const step = stepById(stepId)

  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }))

  function go(nextAnswers = answers) {
    const from = STEPS.findIndex((s) => s.id === stepId)
    const next = STEPS.slice(from + 1).find((s) => isVisible(s, nextAnswers))
    if (!next) return

    // Save at the start and at every section boundary (not every tap).
    if (stepId === 'intro' || next.section !== step.section) {
      const done = next.id === 'outro'
      saveResponse(meta.respondentId, {
        ...buildPayload(nextAnswers, meta),
        last_step: next.id,
        ...(done ? { completed: true } : {}),
      })
    }
    setHistory((h) => [...h, next.id])
    window.scrollTo({ top: 0 })
  }

  // Single-choice and Skip: record, show the selection briefly, then move on.
  function pick(patch) {
    if (advancing.current) return
    advancing.current = true
    const nextAnswers = { ...answers, ...patch }
    setAnswers(nextAnswers)
    setTimeout(() => {
      advancing.current = false
      go(nextAnswers)
    }, ADVANCE_DELAY)
  }

  function back() {
    if (history.length > 1) setHistory((h) => h.slice(0, -1))
  }

  // Progress counts only the question screens currently on this respondent's path.
  const path = STEPS.filter((s) => s.section && isVisible(s, answers))
  const position = path.findIndex((s) => s.id === stepId)
  const progress = stepId === 'outro' ? 1 : position < 0 ? 0 : position / path.length

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      {step.section && (
        <header className="sticky top-0 z-10 -mx-4 bg-canvas/95 px-4 pb-3 pt-2 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={back}
              aria-label="Back"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow-sm transition active:scale-90"
            >
              <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12.5 4.5L7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>{SECTIONS[step.section]}</span>
                <span>
                  {position + 1}/{path.length}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max(4, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </header>
      )}

      <main key={stepId} className="screen-in flex flex-1 flex-col">
        <Screen
          id={stepId}
          answers={answers}
          meta={meta}
          set={set}
          pick={pick}
          next={() => go()}
        />
      </main>
    </div>
  )
}

function Title({ kicker, children, hint }) {
  return (
    <div className="mb-5 mt-3">
      {kicker && <p className="mb-1 text-sm font-semibold text-accent">{kicker}</p>}
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{children}</h1>
      {hint && <p className="mt-2 text-[15px] text-muted">{hint}</p>}
    </div>
  )
}

function Footer({ children }) {
  return <div className="sticky bottom-0 -mx-4 mt-auto bg-gradient-to-t from-canvas from-70% px-4 pb-1 pt-6">{children}</div>
}

/* ───────────── question types ───────────── */

// Pick one and move on. With `otherField`, "Other" opens a text box and waits for Next.
function Single({ a, field, options, otherField, set, pick, next, ...choiceProps }) {
  const v = a[field]
  const otherOpen = otherField && v === 'other'
  return (
    <>
      <Choices
        {...choiceProps}
        options={options}
        value={v}
        onPick={(x) => (otherField && x === 'other' ? set({ [field]: x }) : pick({ [field]: x }))}
        renderBelow={
          otherField &&
          ((o, on) => on && o.value === 'other' && <OtherBox a={a} field={otherField} set={set} onEnter={next} />)
        }
      />
      <Footer>
        {otherOpen && <PrimaryButton onClick={next}>Next</PrimaryButton>}
        <SkipButton skipped={v === SKIP} onClick={() => pick({ [field]: SKIP })} />
      </Footer>
    </>
  )
}

// Tick all that apply. `exclusive` (e.g. "None") clears the others.
function Multi({ a, field, options, exclusive, otherField, extra, set, pick, next }) {
  const sel = asList(a[field])
  function onPick(x) {
    const nextSel = x === exclusive ? (sel.includes(x) ? [] : [x]) : toggle(sel.filter((y) => y !== exclusive), x)
    set({ [field]: nextSel, ...extra?.(nextSel) })
  }
  return (
    <>
      <Choices
        multi
        options={options}
        value={sel}
        onPick={onPick}
        renderBelow={otherField && ((o, on) => on && o.value === 'other' && <OtherBox a={a} field={otherField} set={set} />)}
      />
      <Footer>
        <PrimaryButton disabled={!sel.length} onClick={next}>
          Next
        </PrimaryButton>
        <SkipButton skipped={a[field]?.[0] === SKIP} onClick={() => pick({ [field]: [SKIP] })} />
      </Footer>
    </>
  )
}

function Text({ a, field, set, pick, next, multiline, placeholder, maxLength }) {
  const v = txt(a[field])
  return (
    <>
      <TextField
        multiline={multiline}
        value={v}
        onChange={(t) => set({ [field]: t })}
        onEnter={() => v.trim() && next()}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label="Your answer"
      />
      <Footer>
        <PrimaryButton disabled={!v.trim()} onClick={next}>
          Next
        </PrimaryButton>
        <SkipButton skipped={a[field] === SKIP} onClick={() => pick({ [field]: SKIP })} />
      </Footer>
    </>
  )
}

function OtherBox({ a, field, set, onEnter }) {
  return (
    <TextField
      value={txt(a[field])}
      onChange={(t) => set({ [field]: t })}
      onEnter={onEnter}
      placeholder="Tell us (optional)"
      aria-label="Other"
      autoFocus
    />
  )
}

// M1 / O1: "used to" and "tried" slide open a "why" box with its own Skip; Next waits for it.
function EverUsed({ a, prefix, set, pick, next }) {
  const useField = `${prefix}_use`
  const why = {
    stopped: [`${prefix}_stop_reason`, 'Why did you stop?'],
    tried: [`${prefix}_tried_reason`, "Why didn't you keep using it?"],
  }
  const v = a[useField]
  const open = why[v]
  const ready = open && (a[open[0]] === SKIP || txt(a[open[0]]).trim())
  return (
    <>
      <Choices
        options={EVER_USED}
        value={v}
        onPick={(x) => (why[x] ? set({ [useField]: x }) : pick({ [useField]: x }))}
        renderBelow={(o, on) => {
          if (!on || !why[o.value]) return null
          const [field, label] = why[o.value]
          return (
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <label className="mb-2 block text-[15px] font-bold" htmlFor={field}>
                {label}
              </label>
              <TextField
                id={field}
                value={txt(a[field])}
                onChange={(t) => set({ [field]: t })}
                onEnter={() => ready && next()}
                maxLength={500}
                autoFocus
              />
              <SkipButton small skipped={a[field] === SKIP} onClick={() => set({ [field]: SKIP })} />
            </div>
          )
        }}
      />
      <Footer>
        {open && (
          <PrimaryButton disabled={!ready} onClick={next}>
            Next
          </PrimaryButton>
        )}
        <SkipButton skipped={v === SKIP} onClick={() => pick({ [useField]: SKIP })} />
      </Footer>
    </>
  )
}

/* ───────────── screens ───────────── */

function Screen({ id, answers: a, meta, set, pick, next }) {
  const q = { a, set, pick, next }
  const images = imageSet(a) ?? 'male'
  const hold = (field) => (
    <>
      <HoldGrid set={images} order={meta.imageOrder} levels={HOLD_LEVELS} value={a[field]} onPick={(v) => pick({ [field]: v })} />
      <Footer>
        <SkipButton skipped={a[field] === SKIP} onClick={() => pick({ [field]: SKIP })} />
      </Footer>
    </>
  )
  const country = a.country && a.country !== SKIP ? a.country : meta.countryGuess

  switch (id) {
    case 'intro':
      return (
        <div className="flex flex-1 flex-col justify-center py-8 text-center">
          <div className="mx-auto mb-6 grid grid-cols-2 gap-2" aria-hidden>
            {[1, 2, 3, 4].map((l) => (
              <div key={l} className="size-24 overflow-hidden rounded-2xl shadow-sm" style={{ rotate: `${[-4, 3, 2, -3][l - 1]}deg` }}>
                <HoldImage set={l === 1 || l === 4 ? 'male' : 'female'} level={l} />
              </div>
            ))}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Quick hair quiz 💇</h1>
          <p className="mx-auto mt-3 max-w-xs text-lg text-muted">Help us build a better styling product.</p>
          <p className="mt-4 flex justify-center gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">⏱ 5 minutes</span>
            <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">🔒 Anonymous</span>
          </p>
          <p className="mx-auto mt-6 max-w-xs rounded-2xl bg-accent-soft px-4 py-3 text-[15px] font-semibold leading-snug">
            Any question that you feel doesn't relate to you, press the 'skip' button.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={next}>Let's go →</PrimaryButton>
          </div>
        </div>
      )

    case 'gender':
      return (
        <div className="flex flex-1 flex-col justify-center pb-10">
          <Title hint="So we can show you pictures that match.">Are you…</Title>
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {[
              ['man', 'Male', '🙋‍♂️'],
              ['woman', 'Female', '🙋‍♀️'],
            ].map(([value, label, emoji]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={a.gender === value}
                onClick={() => pick({ gender: value })}
                className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl border-2 bg-white text-2xl font-extrabold shadow-sm transition active:scale-[0.97] ${
                  a.gender === value ? 'pop border-accent bg-accent-soft' : 'border-transparent'
                }`}
              >
                <span className="text-4xl" aria-hidden>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => pick({ gender: 'prefer_not' })}
            className={`mx-auto mt-6 min-h-11 px-4 text-[15px] font-semibold underline underline-offset-4 ${
              a.gender === 'prefer_not' ? 'text-accent' : 'text-muted'
            }`}
          >
            Prefer not to say
          </button>
        </div>
      )
    case 'image_set':
      return (
        <>
          <Title>Which set of images looks more like your hair?</Title>
          <div className="grid gap-3" role="radiogroup">
            {[
              ['male', 'Set A'],
              ['female', 'Set B'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={a.image_set === value}
                aria-label={label}
                onClick={() => pick({ image_set: value })}
                className={`rounded-3xl border-2 bg-white p-3 text-left shadow-sm transition active:scale-[0.97] ${
                  a.image_set === value ? 'pop border-accent bg-accent-soft' : 'border-transparent'
                }`}
              >
                <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl" aria-hidden>
                  {[1, 2, 3, 4].map((l) => (
                    <HoldImage key={l} set={value} level={l} className="rounded-xl" />
                  ))}
                </div>
                <p className="mt-2 px-1 text-[17px] font-semibold">{label}</p>
              </button>
            ))}
          </div>
        </>
      )

    case 'q2':
      return (
        <>
          <Title kicker="Your hold">Which do you go for on a night out or at an event?</Title>
          {hold('q2_event_hold')}
        </>
      )

    case 'p1':
      return (
        <>
          <Title>Do you currently use hair care products besides shampoo and conditioner?</Title>
          <Single {...q} field="uses_products" options={YES_NO} />
        </>
      )
    case 'p2':
      return (
        <>
          <Title hint="Tick all that apply.">What do you use?</Title>
          <Multi
            {...q}
            field="products_used"
            options={PRODUCTS}
            exclusive="nothing"
            extra={(sel) => ({ main_product: sel.includes(a.main_product) ? a.main_product : undefined })}
          />
        </>
      )
    case 'p2b':
      return (
        <>
          <Title>Which ONE do you use most?</Title>
          <Single {...q} field="main_product" options={MAIN_PRODUCTS.filter((p) => realProducts(a).includes(p.value))} />
        </>
      )
    case 'f1':
      return (
        <>
          <Title>What look do you prefer?</Title>
          <Single {...q} field="finish_preference" options={FINISHES} />
        </>
      )
    case 'p3':
      return (
        <>
          <Title hint="In your own words.">Describe your daily hair care routine and what makes each product useful for your hair.</Title>
          <Text {...q} field="routine" multiline maxLength={2000} placeholder="e.g. A bit of cream after the shower so it isn't frizzy, then…" />
        </>
      )
    case 'p4':
      return (
        <>
          <Title>If you could change one thing about your hair routine, what would it be?</Title>
          <Text {...q} field="routine_change" multiline maxLength={1000} />
        </>
      )

    case 'q4':
      return (
        <>
          <Title kicker="Be honest 👀" hint="Tick all that apply.">
            With the product you use, which of these happen?
          </Title>
          <Multi
            {...q}
            field="downsides"
            options={DOWNSIDES}
            exclusive="none"
            extra={(sel) => ({ worst_downside: sel.includes(a.worst_downside) ? a.worst_downside : undefined })}
          />
        </>
      )
    case 'q4b':
      return (
        <>
          <Title>Which ONE bothers you the most?</Title>
          <Single {...q} field="worst_downside" options={DOWNSIDES.filter((d) => realDownsides(a).includes(d.value))} />
        </>
      )
    case 'q4c':
      return (
        <>
          <Title>Have you ever chosen a weaker hold than you wanted, just to avoid these downsides?</Title>
          <Single {...q} field="chose_weaker_hold" options={WEAKER_HOLD} />
        </>
      )

    case 'w1':
      return (
        <>
          <Title>How often do you shampoo?</Title>
          <Single {...q} field="wash_frequency" options={WASH_FREQUENCY} />
        </>
      )
    case 'w2':
      return (
        <>
          <Title>Does using styling product make you wash it more often?</Title>
          <Single {...q} field="product_makes_wash_more" options={WASH_MORE} />
        </>
      )
    case 'w3':
      return (
        <>
          <Title>If you work out or sweat on a non-shampoo day, what do you do?</Title>
          <Single {...q} field="workout_non_wash_day" options={WORKOUT_NON_WASH_DAY} otherField="workout_non_wash_day_other" />
        </>
      )
    case 'w4':
      return (
        <>
          <Title>What do you do to your hair before a workout?</Title>
          <Single {...q} field="pre_workout" options={PRE_WORKOUT} otherField="pre_workout_other" />
        </>
      )
    case 'w5':
      return (
        <>
          <Title>What annoys you most about your hair after a workout?</Title>
          <Single {...q} field="post_workout_annoyance" options={POST_WORKOUT} otherField="post_workout_annoyance_other" />
        </>
      )

    case 'm1':
      return (
        <>
          <Title kicker="Mousse 🫧">Have you ever used hair mousse?</Title>
          <EverUsed {...q} prefix="mousse" />
        </>
      )
    case 'm1b':
      return (
        <>
          <Title>Why not?</Title>
          <Single {...q} field="mousse_never_reason" options={MOUSSE_NEVER} otherField="mousse_never_reason_other" />
        </>
      )
    case 'm2':
      return (
        <>
          <Title>What's the name of the brand?</Title>
          <Text {...q} field="mousse_brand" placeholder="e.g. Schwarzkopf Got2b" />
        </>
      )
    case 'm3':
      return (
        <>
          <Title hint="Tick all that apply.">What did you use it for?</Title>
          <Multi {...q} field="mousse_uses" options={MOUSSE_USES} />
        </>
      )
    case 'm4':
      return (
        <>
          <Title hint="Tick all that apply.">Which of these happened?</Title>
          <Multi {...q} field="mousse_problems" options={MOUSSE_PROBLEMS} exclusive="none" otherField="mousse_problems_other" />
        </>
      )
    case 'm5':
      return (
        <>
          <Title>How long does it last?</Title>
          <Single {...q} field="mousse_duration" options={MOUSSE_DURATION} />
        </>
      )
    case 'm6':
      return <MousseFeatures {...q} />

    case 'o1':
      return (
        <>
          <Title kicker="Hair oil 💧">Have you ever used hair oil?</Title>
          <EverUsed {...q} prefix="oil" />
        </>
      )
    case 'o1b':
      return (
        <>
          <Title>Why not?</Title>
          <Single {...q} field="oil_never_reason" options={OIL_NEVER} otherField="oil_never_reason_other" />
        </>
      )
    case 'o2':
      return (
        <>
          <Title hint="Tick all that apply.">Where do you put it?</Title>
          <Multi {...q} field="oil_where" options={OIL_WHERE} />
        </>
      )
    case 'o3':
      return (
        <>
          <Title hint="Tick all that apply.">What's good about it?</Title>
          <Multi {...q} field="oil_good" options={OIL_GOOD} />
        </>
      )
    case 'o4':
      return (
        <>
          <Title hint="Tick all that apply.">What's bad about it?</Title>
          <Multi {...q} field="oil_bad" options={OIL_BAD} />
        </>
      )

    case 'q6':
      return (
        <>
          <Title kicker="Almost there ✨">Would you switch to a product that gave you this…</Title>
          <div className="mb-5 rounded-3xl bg-white px-5 py-4 shadow-sm">
            <p className="text-lg font-bold leading-tight">The hold you want</p>
            <p className="mt-1.5 text-[15px] font-semibold text-accent">…AND left your hair and scalp moisturised? 💧</p>
          </div>
          <Single {...q} field="would_switch" options={WOULD_SWITCH} />
        </>
      )
    case 'q7': {
      const bands = PRICE_BANDS[a.currency]
      return (
        <>
          <Title>What would you pay for it?</Title>
          <label className="mb-4 flex items-center gap-2 text-sm text-muted">
            <span>Prices for</span>
            <select
              value={country}
              onChange={(e) => set({ country: e.target.value, currency: currencyForCountry(e.target.value), price_band: undefined })}
              className="min-h-10 rounded-xl border border-line bg-white px-2 font-semibold text-ink"
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <Single {...q} field="price_band" options={bands.map((label, i) => ({ value: PRICE_BAND_VALUES[i], label }))} />
        </>
      )
    }
    case 'q7b':
      return (
        <>
          <Title hint="Brand or product name.">What do you currently use?</Title>
          <Text {...q} field="current_product" placeholder={a.uses_products === 'no' ? 'e.g. nothing!' : 'e.g. American Crew Fiber'} />
        </>
      )

    case 'hair_type':
      return (
        <>
          <Title>Hair type</Title>
          <Single {...q} field="hair_type" options={HAIR_TYPES} columns={2} renderIcon={(o) => <HairIcon type={o.value} />} />
        </>
      )
    case 'wanted_hair_type':
      return (
        <>
          <Title>What hair type would you like to have?</Title>
          <Single {...q} field="wanted_hair_type" options={WANTED_HAIR_TYPES} />
        </>
      )
    case 'hair_length':
      return (
        <>
          <Title>Length</Title>
          <Single {...q} field="hair_length" options={HAIR_LENGTHS} />
        </>
      )
    case 'coloured':
      return (
        <>
          <Title>Is your hair coloured or bleached?</Title>
          <Single {...q} field="coloured" options={COLOURED} columns={2} />
        </>
      )
    case 'climate':
      return (
        <>
          <Title hint="In your country, or wherever you are most of the year.">
            What's the climate like where you live?
          </Title>
          <Single {...q} field="climate" options={CLIMATES} />
        </>
      )

    case 'outro':
      return <Outro />
    default:
      return null
  }
}

// M6: up to four short boxes, stored together as one list.
function MousseFeatures({ a, set, pick, next }) {
  const values = Array.from({ length: 4 }, (_, i) => asList(a.mousse_features)[i] ?? '')
  const any = values.some((v) => v.trim())
  return (
    <>
      <Title hint="Even if it sounds unrealistic or isn't available yet. Fill as many as you like.">
        Imagine the best mousse ever. What 4 features would you include?
      </Title>
      <div className="space-y-3">
        {values.map((v, i) => (
          <label key={i} className="block">
            <span className="mb-1 block text-sm font-bold">Feature {i + 1}</span>
            <TextField
              value={v}
              onChange={(t) => set({ mousse_features: values.map((x, j) => (j === i ? t : x)) })}
              maxLength={200}
            />
          </label>
        ))}
      </div>
      <Footer>
        <PrimaryButton disabled={!any} onClick={next}>
          Next
        </PrimaryButton>
        <SkipButton skipped={a.mousse_features?.[0] === SKIP} onClick={() => pick({ mousse_features: [SKIP] })} />
      </Footer>
    </>
  )
}

function toggle(list, v) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function Outro() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [shared, setShared] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())

  function submit(e) {
    e.preventDefault()
    if (!valid) return
    saveContact(email.trim())
    setSent(true)
  }

  async function share() {
    const url = `${window.location.origin}/?utm_source=share`
    const data = { title: 'Quick hair quiz 💇', text: 'Takes 5 minutes — which hold are you?', url }
    try {
      if (navigator.share) {
        await navigator.share(data)
        return
      }
      await navigator.clipboard.writeText(url)
      setShared('Link copied!')
    } catch (err) {
      if (err?.name !== 'AbortError') setShared(url)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <div className="text-center">
        <div className="text-6xl" aria-hidden>
          🙌
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Done! Thank you</h1>
        <p className="mt-2 text-lg text-muted">Your answers are in. You're helping shape something new.</p>
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
        {sent ? (
          <p className="text-center text-lg font-semibold">Got it 💌 We'll be in touch.</p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email" className="block text-[17px] font-bold leading-snug">
              Want to test the product early or do a 10-min chat?
            </label>
            <p className="mb-3 mt-1 text-sm text-muted">Leave your email. It's stored separately from your answers.</p>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-3 min-h-14 w-full rounded-2xl border-2 border-line bg-canvas px-4 text-[17px] outline-none focus:border-accent"
            />
            <PrimaryButton type="submit" disabled={!valid}>
              Count me in
            </PrimaryButton>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={share}
        className="mt-4 min-h-14 w-full rounded-2xl border-2 border-accent bg-transparent text-lg font-bold text-accent transition active:scale-[0.98]"
      >
        Share the quiz ↗
      </button>
      {shared && <p className="mt-2 break-all text-center text-sm text-muted">{shared}</p>}
    </div>
  )
}
