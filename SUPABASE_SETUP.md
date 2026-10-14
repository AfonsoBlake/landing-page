# Supabase setup

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run the SQL below.
3. Go to **Project Settings → API** and copy the Project URL and the `anon` public key.
4. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev`.

## SQL

```sql
-- Table
create table public.feedback_responses (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  q1_goal       text,
  q2_letdown    text,
  q3_comparison text,
  q4_wishlist   text
);

-- Row-level security: anonymous visitors can insert, but nobody can read via the public API
alter table public.feedback_responses enable row level security;

create policy "Anyone can submit feedback"
  on public.feedback_responses
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT / UPDATE / DELETE policies are created, so with RLS enabled those
-- operations are denied for the anon key. Read responses in the Supabase
-- dashboard (Table Editor) or with the service_role key, which bypasses RLS.

-- Make sure the anon role has the table-level privilege to insert (Supabase grants
-- this by default for tables in `public`, but being explicit doesn't hurt):
grant insert on public.feedback_responses to anon, authenticated;
```

## Notes

- The app inserts without asking for the row back, so no SELECT policy is needed.
  If you ever add `.select()` after `.insert()` in `src/main.js`, it will fail by design.
- Optional: cap answer length to deter abuse, e.g.
  ```sql
  alter table public.feedback_responses
    add constraint answers_length check (
      coalesce(length(q1_goal), 0) <= 5000 and
      coalesce(length(q2_letdown), 0) <= 5000 and
      coalesce(length(q3_comparison), 0) <= 5000 and
      coalesce(length(q4_wishlist), 0) <= 5000
    );
  ```

## Niche column

The form also saves the niche picked from the dropdown (null if none was picked).
Run this after the table SQL above:

```sql
alter table public.feedback_responses add column niche text;
```
