import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

if (!supabase) console.warn('[survey] Supabase env vars missing — answers will not be saved.')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function withOneRetry(label, fn) {
  if (!supabase) return
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { error } = await fn()
      if (!error) return
      if (attempt === 2) console.error(`[survey] ${label} failed`, error)
    } catch (err) {
      if (attempt === 2) console.error(`[survey] ${label} failed`, err)
    }
    if (attempt === 1) await wait(1500)
  }
}

// Saves run one after another so a slow retry can never overwrite a newer save.
let queue = Promise.resolve()

export function saveResponse(respondentId, data) {
  queue = queue.then(() =>
    withOneRetry('save_response', () =>
      supabase.rpc('save_response', { p_respondent_id: respondentId, p_data: data }),
    ),
  )
  return queue
}

export function saveContact(email) {
  return withOneRetry('save contact', () => supabase.from('contacts').insert({ email }))
}
