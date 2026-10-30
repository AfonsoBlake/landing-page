-- Hair hold quiz: responses + contacts, anonymous write path via save_response().
--
-- Admin access: change the email in public.is_admin() below if needed, then
-- create that user in Supabase → Authentication → Users (and turn off public sign-ups).

-- ───────────────────────── tables ─────────────────────────

create table public.responses (
  id                       uuid primary key default gen_random_uuid(),
  respondent_id            text unique not null check (char_length(respondent_id) between 8 and 64),
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  completed                boolean default false,
  last_step                text,
  utm_source               text,
  image_order              int[],
  q1_normal_hold           int check (q1_normal_hold between 1 and 4),
  q2_event_hold            int check (q2_event_hold between 1 and 4),
  q3_ideal_hold            int check (q3_ideal_hold between 1 and 4),
  hold_gap                 int generated always as (q3_ideal_hold - q1_normal_hold) stored,
  product_use              text,
  no_product_reasons       text[],
  downsides                text[],
  worst_downside           text,
  chose_weaker_hold        text,
  wash_frequency           text,
  product_makes_wash_more  text,
  would_switch             text,
  price_band               text,
  currency                 text,
  current_product          text,
  gender                   text,
  age_range                text,
  hair_type                text,
  hair_length              text,
  coloured                 boolean,
  country                  text,
  climate                  text
);

create index responses_created_at_idx on public.responses (created_at);

create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  created_at  timestamptz default now()
);

-- ───────────────────────── security ─────────────────────────

alter table public.responses enable row level security;
alter table public.contacts  enable row level security;

-- Start from zero privileges, then grant only what is needed.
revoke all on public.responses from anon, authenticated;
revoke all on public.contacts  from anon, authenticated;

grant select on public.responses to authenticated;              -- filtered to the admin by RLS
grant select, insert on public.contacts to authenticated;        -- insert: admin testing the survey while logged in
grant insert on public.contacts to anon;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'self.improvment.afonso@gmail.com';
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admin reads responses" on public.responses
  for select to authenticated using (public.is_admin());

create policy "admin reads contacts" on public.contacts
  for select to authenticated using (public.is_admin());

create policy "anyone can leave an email" on public.contacts
  for insert to anon, authenticated with check (true);

-- ───────────────────────── save_response ─────────────────────────
-- Upserts one respondent's row. Only keys present in p_data are written, so the
-- client can send whatever it has; a completed row can never be changed again.

create or replace function public.save_response(p_respondent_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.responses;
begin
  if p_respondent_id is null or char_length(p_respondent_id) not between 8 and 64 then
    raise exception 'invalid respondent_id';
  end if;

  -- Typed view of the payload (unknown keys are ignored; id/created_at/hold_gap are never read from it).
  d := jsonb_populate_record(null::public.responses, p_data);

  insert into public.responses (respondent_id)
  values (p_respondent_id)
  on conflict (respondent_id) do nothing;

  update public.responses r set
    updated_at              = now(),
    completed               = case when p_data ? 'completed'               then coalesce(d.completed, false)     else r.completed end,
    last_step               = case when p_data ? 'last_step'               then left(d.last_step, 40)            else r.last_step end,
    utm_source              = case when p_data ? 'utm_source'              then left(d.utm_source, 100)          else r.utm_source end,
    image_order             = case when p_data ? 'image_order'             then d.image_order[1:4]               else r.image_order end,
    q1_normal_hold          = case when p_data ? 'q1_normal_hold'          then d.q1_normal_hold                 else r.q1_normal_hold end,
    q2_event_hold           = case when p_data ? 'q2_event_hold'           then d.q2_event_hold                  else r.q2_event_hold end,
    q3_ideal_hold           = case when p_data ? 'q3_ideal_hold'           then d.q3_ideal_hold                  else r.q3_ideal_hold end,
    product_use             = case when p_data ? 'product_use'             then left(d.product_use, 40)          else r.product_use end,
    no_product_reasons      = case when p_data ? 'no_product_reasons'      then d.no_product_reasons[1:10]       else r.no_product_reasons end,
    downsides               = case when p_data ? 'downsides'               then d.downsides[1:12]                else r.downsides end,
    worst_downside          = case when p_data ? 'worst_downside'          then left(d.worst_downside, 40)       else r.worst_downside end,
    chose_weaker_hold       = case when p_data ? 'chose_weaker_hold'       then left(d.chose_weaker_hold, 40)    else r.chose_weaker_hold end,
    wash_frequency          = case when p_data ? 'wash_frequency'          then left(d.wash_frequency, 40)       else r.wash_frequency end,
    product_makes_wash_more = case when p_data ? 'product_makes_wash_more' then left(d.product_makes_wash_more, 40) else r.product_makes_wash_more end,
    would_switch            = case when p_data ? 'would_switch'            then left(d.would_switch, 40)         else r.would_switch end,
    price_band              = case when p_data ? 'price_band'              then left(d.price_band, 40)           else r.price_band end,
    currency                = case when p_data ? 'currency'                then left(d.currency, 8)              else r.currency end,
    current_product         = case when p_data ? 'current_product'         then left(d.current_product, 200)     else r.current_product end,
    gender                  = case when p_data ? 'gender'                  then left(d.gender, 40)               else r.gender end,
    age_range               = case when p_data ? 'age_range'               then left(d.age_range, 40)            else r.age_range end,
    hair_type               = case when p_data ? 'hair_type'               then left(d.hair_type, 40)            else r.hair_type end,
    hair_length             = case when p_data ? 'hair_length'             then left(d.hair_length, 40)          else r.hair_length end,
    coloured                = case when p_data ? 'coloured'                then d.coloured                       else r.coloured end,
    country                 = case when p_data ? 'country'                 then left(d.country, 8)               else r.country end,
    climate                 = case when p_data ? 'climate'                 then left(d.climate, 40)              else r.climate end
  where r.respondent_id = p_respondent_id
    and r.completed = false;
end;
$$;

revoke execute on function public.save_response(text, jsonb) from public;
grant execute on function public.save_response(text, jsonb) to anon, authenticated;
