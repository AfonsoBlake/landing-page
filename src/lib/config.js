// Single source of truth for answer values and labels.
// The database stores the `value`; the survey and dashboard show the `label`.

export const HOLD_LEVELS = [
  { value: 1, label: 'Moves freely' },
  { value: 2, label: 'Holds but moves' },
  { value: 3, label: 'Stays put' },
  { value: 4, label: 'Locked in place all day' },
]

// Stored as the answer when someone presses Skip (['skip'] for tick-all questions).
// A question someone never saw because of branching stays NULL.
export const SKIP = 'skip'

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const PRODUCTS = [
  { value: 'gel', label: 'Gel' },
  { value: 'wax', label: 'Wax' },
  { value: 'paste', label: 'Paste' },
  { value: 'clay', label: 'Clay' },
  { value: 'pomade', label: 'Pomade' },
  { value: 'cream', label: 'Cream' },
  { value: 'spray', label: 'Spray' },
  { value: 'mousse', label: 'Mousse' },
  { value: 'sea_salt', label: 'Sea salt spray' },
  { value: 'leave_in', label: 'Leave-in conditioner' },
  { value: 'oil', label: 'Oil' },
  { value: 'volume_powder', label: 'Volume powder' },
  { value: 'heat_tools', label: 'Heat tools' },
  { value: 'nothing', label: 'Nothing' },
]
// P2b choices: real products only.
export const MAIN_PRODUCTS = PRODUCTS.filter((p) => p.value !== 'nothing')

export const FINISHES = [
  { value: 'matte', label: 'Matte' },
  { value: 'natural', label: 'Natural' },
  { value: 'shiny', label: 'Shiny' },
  { value: 'no_preference', label: 'No preference' },
]

// Offered in both "Why not?" questions (M1b, O1b); the dashboard splits it by gender.
export const WOMENS_PRODUCT = 'womens_product'

export const DOWNSIDES = [
  { value: 'crunchy', label: 'Crunchy / stiff', emoji: '🥨' },
  { value: 'flakes', label: 'Flakes', emoji: '❄️' },
  { value: 'dry_hair', label: 'Dry hair', emoji: '🌵' },
  { value: 'itchy_scalp', label: 'Itchy or dry scalp', emoji: '😣' },
  { value: 'greasy', label: 'Greasy or heavy', emoji: '🛢️' },
  { value: 'hard_wash', label: 'Hard to wash out', emoji: '🚿' },
  { value: 'buildup', label: 'Build-up', emoji: '🧱' },
  { value: 'wears_off', label: 'Wears off by afternoon', emoji: '⏳' },
  { value: 'none', label: 'None of these', emoji: '✨' },
]

export const WEAKER_HOLD = [
  { value: 'yes', label: 'Yes' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'no', label: 'No' },
]

export const WASH_FREQUENCY = [
  { value: 'daily', label: 'Every day' },
  { value: 'every_2_3_days', label: 'Every 2–3 days' },
  { value: 'weekly', label: 'Once or twice a week' },
  { value: 'less', label: 'Less often' },
]

export const WASH_MORE = [
  { value: 'yes_lot', label: 'Yes, a lot' },
  { value: 'bit', label: 'A bit' },
  { value: 'no', label: 'No' },
]

export const WORKOUT_NON_WASH_DAY = [
  { value: 'shampoo', label: 'Shampoo anyway' },
  { value: 'water', label: 'Rinse with water only' },
  { value: 'conditioner', label: 'Conditioner only' },
  { value: 'dry_shampoo', label: 'Dry shampoo' },
  { value: 'other', label: 'Other' },
]

export const PRE_WORKOUT = [
  { value: 'wash_out', label: 'Wash product out' },
  { value: 'leave_in', label: 'Leave product in' },
  { value: 'oil_leave_in', label: 'Put in hair oil or leave-in conditioner' },
  { value: 'other', label: 'Other' },
]

export const POST_WORKOUT = [
  { value: 'greasy', label: 'Greasy' },
  { value: 'smells', label: 'Smells' },
  { value: 'itchy_scalp', label: 'Itchy scalp' },
  { value: 'sticky_crunchy', label: 'Product goes sticky or crunchy' },
  { value: 'nothing', label: 'Nothing' },
  { value: 'other', label: 'Other' },
]

// Shared by mousse (M1) and oil (O1). 'stopped' and 'tried' open a "why" box.
export const EVER_USED = [
  { value: 'now', label: 'I use it now' },
  { value: 'stopped', label: 'I used to, but stopped' },
  { value: 'tried', label: 'Tried it once or twice' },
  { value: 'never', label: 'Never' },
]
export const USED_IT = ['now', 'stopped', 'tried']

export const MOUSSE_NEVER = [
  { value: 'dont_know', label: "Didn't know what it does" },
  { value: 'crunchy_sticky', label: "Heard it's crunchy or sticky" },
  { value: 'no_volume', label: "Don't need volume" },
  { value: 'old_fashioned', label: 'Seems old-fashioned' },
  { value: WOMENS_PRODUCT, label: "Seems like a women's product" },
  { value: 'other', label: 'Other' },
]

export const MOUSSE_USES = [
  { value: 'volume', label: 'Volume' },
  { value: 'hold', label: 'Hold' },
  { value: 'definition', label: 'Curl or wave definition' },
  { value: 'frizz', label: 'Less frizz' },
  { value: 'texture', label: 'Texture' },
]

// Codes shared with DOWNSIDES are the same problem, so the dashboard can compare them.
export const MOUSSE_PROBLEMS = [
  { value: 'crunchy', label: 'Crunchy or stiff' },
  { value: 'sticky', label: 'Sticky or tacky' },
  { value: 'flakes', label: 'White flakes or residue' },
  { value: 'dry_hair', label: 'Dry hair' },
  { value: 'itchy_scalp', label: 'Itchy or dry scalp' },
  { value: 'wears_off', label: 'Flattens by afternoon' },
  { value: 'humidity_frizz', label: 'Frizz in humidity' },
  { value: 'amount', label: 'Hard to get the amount right' },
  { value: 'sticky_hands', label: 'Sticky hands' },
  { value: 'buildup', label: 'Build-up' },
  { value: 'smell', label: 'Smell' },
  { value: 'none', label: 'None' },
  { value: 'other', label: 'Other' },
]

export const MOUSSE_DURATION = [
  { value: 'under_2h', label: 'Under 2 hours' },
  { value: 'half_day', label: 'Half a day' },
  { value: 'all_day', label: 'All day' },
  { value: 'several_days', label: 'Several days' },
]

export const OIL_NEVER = [
  { value: 'dont_need', label: "Don't need it" },
  { value: 'greasy', label: "Worried it's greasy" },
  { value: 'dont_know_how', label: "Don't know how" },
  { value: WOMENS_PRODUCT, label: "Seems like a women's product" },
  { value: 'other', label: 'Other' },
]

export const OIL_WHERE = [
  { value: 'scalp', label: 'Scalp' },
  { value: 'lengths', label: 'Lengths' },
  { value: 'ends', label: 'Ends' },
  { value: 'pre_wash', label: 'Before washing' },
]

export const OIL_GOOD = [
  { value: 'shine', label: 'Shine' },
  { value: 'softness', label: 'Softness' },
  { value: 'frizz', label: 'Less frizz' },
  { value: 'scalp', label: 'Scalp feels better' },
  { value: 'smell', label: 'Smells nice' },
  { value: 'growth', label: 'I think it helps growth' },
]

export const OIL_BAD = [
  { value: 'greasy', label: 'Greasy or heavy' },
  { value: 'kills_hold', label: 'Kills volume or hold' },
  { value: 'hard_wash', label: 'Hard to wash out' },
  { value: 'smell', label: 'Smell' },
  { value: 'spots', label: 'Spots on forehead' },
  { value: 'stains', label: 'Stains pillows or clothes' },
  { value: 'scalp_worse', label: 'Made my scalp worse' },
]

export const WOULD_SWITCH = [
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
]

// Price bands are stored as band1..band5 (+ currency) so they compare across currencies.
export const PRICE_BANDS = {
  GBP: ['Under £8', '£8–12', '£12–18', '£18–25', '£25+'],
  AED: ['Under 35 AED', '35–55 AED', '55–80 AED', '80–110 AED', '110+ AED'],
  USD: ['Under $10', '$10–15', '$15–22', '$22–30', '$30+'],
}
export const PRICE_BAND_VALUES = ['band1', 'band2', 'band3', 'band4', 'band5']
export const currencyForCountry = (code) => (code === 'GB' ? 'GBP' : code === 'AE' ? 'AED' : 'USD')
export const priceLabel = (band, currency) =>
  PRICE_BANDS[currency]?.[PRICE_BAND_VALUES.indexOf(band)] ?? band ?? ''

// Asked first (Male / Female / "Prefer not to say"); it picks the hold image set.
export const GENDERS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]

// Which hold set was shown: male (short hair) or female (long hair) photos in Q2.
export const IMAGE_SETS = [
  { value: 'male', label: 'Male images' },
  { value: 'female', label: 'Female images' },
]
export const imageSetFor = (gender) => (gender === 'man' ? 'male' : gender === 'woman' ? 'female' : null)


export const HAIR_TYPES = [
  { value: 'straight', label: 'Straight' },
  { value: 'wavy', label: 'Wavy' },
  { value: 'curly', label: 'Curly' },
  { value: 'coily', label: 'Coily' },
]

export const WANTED_HAIR_TYPES = [...HAIR_TYPES, { value: 'happy', label: "I'm happy with mine" }]

export const HAIR_LENGTHS = [
  { value: 'very_short', label: 'Very short' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

export const COLOURED = YES_NO

export const CLIMATES = [
  { value: 'hot_humid', label: 'Hot & humid', emoji: '🌴' },
  { value: 'hot_dry', label: 'Hot & dry', emoji: '🏜️' },
  { value: 'mild', label: 'Mild', emoji: '🌤️' },
  { value: 'cold', label: 'Cold', emoji: '❄️' },
  { value: 'changes', label: 'It changes a lot', emoji: '🔄' },
]

// Countries stored as ISO 3166 alpha-2 codes. Most likely audience first.
export const COUNTRY_CODES = [
  'GB', 'US', 'AE', 'IE', 'CA', 'AU', 'NZ', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'IN', 'PK',
  'ZA', 'NG', 'KE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL',
  'CH', 'AT', 'GR', 'TR', 'BR', 'MX', 'AR', 'CO', 'JP', 'KR', 'CN', 'SG', 'MY', 'PH', 'ID',
  'TH', 'VN', 'HK',
]
export const OTHER_COUNTRY = 'XX'

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    return null
  }
})()
export const countryName = (code) =>
  code === OTHER_COUNTRY ? 'Other' : code === SKIP ? 'Skipped' : (code && regionNames?.of(code)) || code || '—'

export const COUNTRIES = [
  ...COUNTRY_CODES.map((c) => ({ value: c, label: countryName(c) })).sort((a, b) =>
    a.label.localeCompare(b.label),
  ),
  { value: OTHER_COUNTRY, label: 'Other' },
]

// Best guess from the browser; the respondent can change it.
export function guessCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz === 'Asia/Dubai') return 'AE'
    if (tz === 'Europe/London') return 'GB'
    for (const lang of navigator.languages || [navigator.language]) {
      const region = lang?.split('-')[1]?.toUpperCase()
      if (region && COUNTRY_CODES.includes(region)) return region
    }
  } catch {
    /* fall through */
  }
  return 'US'
}

export const labelFor = (list, value) =>
  value === SKIP ? 'Skipped' : (list.find((o) => o.value === value)?.label ?? value ?? '—')
