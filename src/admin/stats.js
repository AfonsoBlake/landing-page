import { DOWNSIDES, PRICE_BAND_VALUES, SKIP, labelFor } from '../lib/config.js'

export const pct = (n, d) => (d ? (n / d) * 100 : null)
export const fmtPct = (v, digits = 0) => (v == null ? '—' : `${v.toFixed(digits)}%`)

export const REAL_DOWNSIDES = DOWNSIDES.filter((d) => d.value !== 'none')

// 'skip' = pressed Skip; NULL = never shown (branching) or not reached.
export const isSkipped = (v) => v === SKIP || (Array.isArray(v) && v[0] === SKIP)
export const isAnswered = (v) => v != null && !isSkipped(v) && !(Array.isArray(v) && !v.length)
// Ticked options of a real answer (skips and NULLs give []).
export const ticks = (v) => (isAnswered(v) && Array.isArray(v) ? v : [])

export function skipStats(rows, field) {
  let answered = 0
  let skipped = 0
  for (const r of rows) {
    if (isSkipped(r[field])) skipped++
    else if (isAnswered(r[field])) answered++
  }
  return { answered, skipped, notShown: rows.length - answered - skipped, skipRate: pct(skipped, answered + skipped) }
}

// Q4b is only asked with 2+ downsides; with exactly one, that one is the worst by definition.
export function effectiveWorst(r) {
  if (isAnswered(r.worst_downside)) return r.worst_downside
  if (isSkipped(r.worst_downside)) return null
  const real = ticks(r.downsides).filter((d) => d !== 'none')
  return real.length === 1 ? real[0] : null
}

export function countBy(rows, fn) {
  const m = new Map()
  for (const r of rows) {
    const k = fn(r)
    if (k == null) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return m
}

// For each option: share of people who answered a tick-all question (not skipped) that ticked it.
export function tickRates(rows, field, options) {
  const base = rows.filter((r) => ticks(r[field]).length)
  return {
    n: base.length,
    rates: Object.fromEntries(
      options.map((o) => [o.value, pct(base.filter((r) => r[field].includes(o.value)).length, base.length)]),
    ),
  }
}

// For each downside: share of product users (who answered Q4) that ticked it.
export const downsideRates = (rows) => tickRates(rows, 'downsides', REAL_DOWNSIDES)

export function worstRanking(rows) {
  const counts = countBy(rows, effectiveWorst)
  const n = [...counts.values()].reduce((a, b) => a + b, 0)
  return {
    n,
    ranked: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: labelFor(DOWNSIDES, value), count, pct: pct(count, n) })),
  }
}

// Single-choice split among people who answered (skips are reported separately).
export function distribution(rows, field, values) {
  const base = rows.filter((r) => isAnswered(r[field]))
  return {
    n: base.length,
    parts: values.map((v) => {
      const count = base.filter((r) => r[field] === v.value).length
      return { ...v, count, pct: pct(count, base.length) }
    }),
  }
}

export const isTopPrice = (r) => r.price_band === PRICE_BAND_VALUES[3] || r.price_band === PRICE_BAND_VALUES[4]

export function toCsv(rows, columns) {
  const esc = (v) => {
    if (v == null) return ''
    const s = Array.isArray(v) ? v.join('|') : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\r\n')
}

export function download(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
