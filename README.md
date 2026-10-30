# Hair hold quiz

Mobile-first quiz (React + Tailwind + Supabase). Survey at `/`, dashboard at `/admin`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Env

`.env` (see `.env.example`):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key>
```

## Database

Schema, RLS and the `save_response()` function live in `supabase/migrations/`.
Paste each file into the Supabase SQL Editor once per project, in order:

1. `20261025000000_hair_hold_survey.sql`: contacts, admin check, first version of responses.
2. `20261027000000_survey_v2_skip_and_new_sections.sql`: drops and recreates `responses` +
   `save_response()` for the v2 questions. **Deletes all existing responses.**
3. `20261029000000_survey_v2_1_main_product_finish.sql`: adds `main_product` (P2b) and
   `finish_preference` (F1) and updates `save_response()`. Keeps existing rows.
4. `20261030000000_survey_v2_2_image_set_wanted_hair.sql`: adds `image_set` and
   `wanted_hair_type` and updates `save_response()`. Keeps existing rows.

- The browser can only call `save_response()` and insert into `contacts`. No reads, updates or deletes.
- A completed response can't be changed.
- Emails sit in `contacts` with no link to answers.

## Admin login

1. Supabase → Authentication → Users → **Add user**: `self.improvment.afonso@gmail.com` + a password (tick auto-confirm).
2. Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
3. Sign in at `/admin`.

To change the admin email, edit `public.is_admin()` in the migration and re-run that function's SQL.

## Hold images

Gender is asked first and picks the hold set: `male` (short hair) or `female` (long hair).
The one hold question (Q2, night out / event) shows photos from `public/`: `hold-male-1.jpg` …
`hold-male-4.jpg` and `hold-female-1.jpg` … `hold-female-4.jpg` (1 = Moves freely … 4 = Locked in
place all day). The intro screen and the "Prefer not to say" set picker use drawn icons
(`HoldImage` in `src/survey/ui.jsx`). Q1 (normal day) and Q3 (no downsides) are no longer asked,
so `q1_normal_hold`, `q3_ideal_hold` and `hold_gap` stay `NULL` on new rows.

## Tracking links

Add `?utm_source=tiktok` (or `instagram`, etc.) to the links you post; the dashboard splits by it.
The in-quiz share button uses `utm_source=share`.

## Stored values

Answers are stored as short codes (e.g. `itchy_scalp`, `hot_humid`) defined in `src/lib/config.js`.
Hold answers are the text `'1'`–`'4'`. Price is `band1`–`band5` + `currency`, so bands compare
across currencies. Age and country are no longer asked: `age_range` and `country` stay `NULL` on
new rows (older rows keep their answers).

- `'skip'` (or `{skip}` for tick-all questions) = the person pressed Skip.
- `NULL` = the question was never shown to them (branching), or they left before reaching it.
- Skipping a question that opens a branch (P1, M1, O1) hides its follow-ups, so those stay `NULL`.

## Remove test data before launch

```sql
delete from public.responses where utm_source like 'test%';
```
