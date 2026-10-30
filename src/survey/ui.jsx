import { Fragment } from 'react'

// Hold icons, drawn like HairIcon. `set` is 'male' (short hair) or 'female' (long hair).
// Shared cues so a level reads the same in both sets: 1 = flyaways + two motion marks,
// 2 = one motion mark, 3 = tidy with no marks, 4 = rigid straight strands + padlock.
const FACE = 'M22 30c0 9 4 15 10 15s10-6 10-15'
const BODY = ['M28 44v6', 'M36 44v6', 'M14 62c1-7 7-11 14-12', 'M50 62c-1-7-7-11-14-12']
const MOVE_2 = ['M8 14c-3 3-3 9 0 12', 'M56 14c3 3 3 9 0 12']
const MOVE_1 = ['M56 14c3 3 3 9 0 12']
const LOCK = ['M49 8h11v8h-11z', 'M51.5 8V5.5a3 3 0 0 1 6 0V8']
const CROWN = 'M20 30c-2-11 4-17 12-17s14 6 12 17'
const HAIRLINE = 'M22 29c1-5 5-8 10-8s9 3 10 8'
const HOLD_HAIR = {
  male: {
    1: [
      'M21 31c-3-7-1-15 5-18 2-3 6-4 8-2 3-2 7-1 8 2 4 2 5 8 3 18',
      'M25 19l-1 11', 'M30 18c1 5-1 9-3 12', 'M35 18c1 4 1 8-1 11', 'M40 20c1 3 1 6 0 8',
      'M24 15c-3-2-5-5-4-8', 'M42 16c3-2 6-2 8 0',
      ...MOVE_2,
    ],
    2: [
      'M22 31c-2-10 2-18 10-18 7 0 11 5 10 18',
      'M22 28c4-6 12-8 20-4', 'M27 17c4-2 9-1 12 3', 'M35 25c1 3 0 6-2 8',
      ...MOVE_1,
    ],
    3: [
      'M22 31c-2-9 0-16 6-19 6-3 14-2 15 4 1 4 0 9-1 15',
      'M22 29c3-6 12-8 20-6', 'M25 22c3-6 9-8 16-6', 'M29 14c4-2 9-2 12 1',
    ],
    4: [
      'M22 31V19c0-9 5-15 13-15 6 0 9 3 8 8l-1 19',
      'M22 29c4-5 13-7 20-5', 'M24 23l15-14', 'M25 28l17-15', 'M27 10l-3 3',
      ...LOCK,
    ],
  },
  female: {
    1: [
      CROWN, HAIRLINE,
      'M20 30c-4 6-3 13-8 19', 'M23 36c-2 5-2 10-5 15', 'M44 30c4 6 3 13 8 19', 'M41 36c2 5 2 10 5 15',
      'M12 49c-3 0-5-1-6-3', 'M52 49c3 0 5-1 6-3', 'M16 37c-3 0-6-2-7-4', 'M48 37c3 0 6-2 7-4',
      'M27 14c-2-3-5-4-8-3', 'M37 14c2-3 5-4 8-3',
      ...MOVE_2,
    ],
    2: [
      CROWN, HAIRLINE,
      'M20 30c-5 4-2 9-6 13s-1 9-4 13', 'M44 30c5 4 2 9 6 13s1 9 4 13',
      'M23 35c-3 4 0 8-3 12s0 5-2 8', 'M41 35c3 4 0 8 3 12s0 5 2 8',
      'M52 42c3 0 5-2 5-5',
      ...MOVE_1,
    ],
    3: [
      CROWN, HAIRLINE,
      'M20 30c-5 6-6 15-4 22 1 3 4 4 6 2', 'M44 30c5 6 6 15 4 22-1 3-4 4-6 2',
      'M23 34c-3 5-3 11-1 16', 'M41 34c3 5 3 11 1 16',
    ],
    4: [
      'M20 30c-1-11 4-18 12-18s13 7 12 18', 'M22 29c2-5 6-8 10-8s8 3 10 8', 'M32 12v9',
      'M20 28l-2 22h9', 'M44 28l2 22h-9', 'M23 31l-1 17', 'M41 31l1 17',
      ...LOCK,
    ],
  },
}

export function HoldImage({ set, level, className = '' }) {
  return (
    <div className={`grid aspect-square w-full place-items-center bg-accent-soft ${className}`}>
      <svg viewBox="0 0 64 64" className="size-4/5 text-accent" aria-hidden>
        {[...BODY, FACE, ...HOLD_HAIR[set][level]].map((d) => (
          <path key={d} d={d} className={strand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  )
}

function Check() {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white">
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// Q2's photos: public/hold-male-1.jpg … public/hold-female-4.jpg (1 = Moves freely … 4 = Locked in place).
function HoldPhoto({ set, level }) {
  return <img src={`/hold-${set}-${level}.jpg`} alt="" draggable={false} className="aspect-square w-full object-cover" />
}

export function HoldGrid({ set, order, levels, value, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup">
      {order.map((level) => {
        const selected = value === level
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(level)}
            className={`group relative overflow-hidden rounded-3xl border-2 bg-white text-left shadow-sm transition active:scale-[0.97] ${
              selected ? 'pop border-accent ring-4 ring-accent/20' : 'border-transparent'
            }`}
          >
            <HoldPhoto set={set} level={level} />
            <div className="flex min-h-14 items-center justify-between gap-2 px-3 py-2.5">
              <span className="text-[15px] font-semibold leading-tight">{levels.find((l) => l.value === level).label}</span>
              {selected && <Check />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// `renderBelow(option, selected)` can slide open extra content directly under an option.
export function Choices({ options, value, onPick, multi = false, columns = 1, renderIcon, renderBelow }) {
  const isOn = (v) => (multi ? (value || []).includes(v) : value === v)
  return (
    <div
      className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
      role={multi ? 'group' : 'radiogroup'}
    >
      {options.map((o) => {
        const on = isOn(o.value)
        const below = renderBelow?.(o, on)
        return (
          <Fragment key={String(o.value)}>
            <button
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={() => onPick(o.value)}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left text-[17px] font-semibold shadow-sm transition active:scale-[0.97] ${
                on ? 'pop border-accent bg-accent-soft' : 'border-transparent'
              } ${columns === 2 && renderIcon ? 'flex-col justify-center py-4 text-center' : ''}`}
            >
              {renderIcon?.(o)}
              {o.emoji && !renderIcon && <span className="text-2xl" aria-hidden>{o.emoji}</span>}
              <span className="flex-1">{o.label}</span>
              {multi && (
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-md border-2 ${
                    on ? 'border-accent bg-accent text-white' : 'border-line'
                  }`}
                  aria-hidden
                >
                  {on && (
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              )}
              {!multi && on && !(columns === 2 && renderIcon) && <Check />}
            </button>
            {below && <div className="slide-open -mt-1">{below}</div>}
          </Fragment>
        )
      })}
    </div>
  )
}

export function PrimaryButton({ children, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="min-h-14 w-full rounded-2xl bg-accent px-6 text-lg font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong active:scale-[0.98] disabled:bg-[#c9c2bb] disabled:shadow-none"
    >
      {children}
    </button>
  )
}

export function SkipButton({ onClick, skipped, small = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={skipped}
      className={`w-full rounded-2xl font-semibold transition active:scale-[0.98] ${
        small ? 'min-h-11 text-[15px]' : 'mt-1 min-h-12 text-[17px]'
      } ${skipped ? 'text-accent' : 'text-muted'}`}
    >
      {skipped ? 'Skipped ✓' : 'Skip'}
    </button>
  )
}

const fieldClass =
  'w-full rounded-2xl border-2 border-line bg-white px-4 text-[17px] outline-none focus:border-accent'

export function TextField({ value, onChange, onEnter, multiline = false, maxLength = 200, ...rest }) {
  if (multiline)
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={5}
        className={`${fieldClass} min-h-36 resize-none py-3 leading-snug`}
        {...rest}
      />
    )
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      maxLength={maxLength}
      className={`${fieldClass} min-h-14`}
      {...rest}
    />
  )
}

const strand = 'fill-none stroke-current'
export function HairIcon({ type }) {
  const paths = {
    straight: ['M8 4v24', 'M16 4v24', 'M24 4v24'],
    wavy: ['M8 4c4 4-4 8 0 12s-4 8 0 12', 'M16 4c4 4-4 8 0 12s-4 8 0 12', 'M24 4c4 4-4 8 0 12s-4 8 0 12'],
    curly: [
      'M10 4c5 0 5 6 0 6s-5 6 0 6 5 6 0 6-5 6 0 6',
      'M22 4c5 0 5 6 0 6s-5 6 0 6 5 6 0 6-5 6 0 6',
    ],
    coily: ['M6 4l6 3-6 3 6 3-6 3 6 3-6 3 6 3', 'M16 4l6 3-6 3 6 3-6 3 6 3-6 3 6 3'],
  }
  return (
    <svg viewBox="0 0 32 32" className="size-10 text-accent" aria-hidden>
      {paths[type].map((d) => (
        <path key={d} d={d} className={strand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
