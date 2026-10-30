-- Survey v2: products & routine, washing & workouts, mousse, hair oil, and a Skip on every question.
--
-- ⚠ DESTRUCTIVE: drops and recreates public.responses, which DELETES EVERY EXISTING RESPONSE ROW.
--   Run it only while the table holds test data. public.contacts, public.is_admin() and the
--   contacts policies from the first migration are not touched.
--
-- Answer conventions:
--   'skip'   / ['skip']  the respondent pressed Skip on that question
--   NULL                 the question was never shown (branching) or not reached yet
--   Every answer is text / text[]; hold levels are '1'–'4' or 'skip'.

drop function if exists public.save_response(text, jsonb);
drop table if exists public.responses;

-- ───────────────────────── table ─────────────────────────

create table public.responses (
  id                            uuid primary key default gen_random_uuid(),
  respondent_id                 text unique not null check (char_length(respondent_id) between 8 and 64),
  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now(),
  completed                     boolean default false,
  last_step                     text,
  utm_source                    text,
  image_order                   int[],

  -- 1. Your hold
  q1_normal_hold                text check (q1_normal_hold in ('1', '2', '3', '4', 'skip')),
  q2_event_hold                 text check (q2_event_hold  in ('1', '2', '3', '4', 'skip')),
  q3_ideal_hold                 text check (q3_ideal_hold  in ('1', '2', '3', '4', 'skip')),
  hold_gap                      int generated always as (
                                  case when q1_normal_hold ~ '^[1-4]$' and q3_ideal_hold ~ '^[1-4]$'
                                       then q3_ideal_hold::int - q1_normal_hold::int end
                                ) stored,

  -- 2. Products & routine
  uses_products                 text,      -- P1
  products_used                 text[],    -- P2
  routine                       text,      -- P3
  routine_change                text,      -- P4

  -- 3. Downsides
  downsides                     text[],    -- Q4
  worst_downside                text,      -- Q4b
  chose_weaker_hold             text,      -- Q4c

  -- 4. Washing & workouts
  wash_frequency                text,      -- W1
  product_makes_wash_more       text,      -- W2
  workout_non_wash_day          text,      -- W3
  workout_non_wash_day_other    text,
  pre_workout                   text,      -- W4
  pre_workout_other             text,
  post_workout_annoyance        text,      -- W5
  post_workout_annoyance_other  text,

  -- 5. Mousse
  mousse_use                    text,      -- M1
  mousse_stop_reason            text,      -- M1 "used to, but stopped" box
  mousse_tried_reason           text,      -- M1 "tried it once or twice" box
  mousse_never_reason           text,      -- M1b
  mousse_never_reason_other     text,
  mousse_brand                  text,      -- M2
  mousse_uses                   text[],    -- M3
  mousse_problems               text[],    -- M4
  mousse_problems_other         text,
  mousse_duration               text,      -- M5
  mousse_features               text[],    -- M6

  -- 6. Hair oil
  oil_use                       text,      -- O1
  oil_stop_reason               text,
  oil_tried_reason              text,
  oil_never_reason              text,      -- O1b
  oil_never_reason_other        text,
  oil_where                     text[],    -- O2
  oil_good                      text[],    -- O3
  oil_bad                       text[],    -- O4

  -- 7. Value
  would_switch                  text,      -- Q6
  price_band                    text,      -- Q7
  currency                      text,
  current_product               text,      -- Q7b

  -- 8. About you
  gender                        text,
  age_range                     text,
  hair_type                     text,
  hair_length                   text,
  coloured                      text,      -- 'yes' / 'no' / 'skip'
  country                       text,
  climate                       text
);

create index responses_created_at_idx on public.responses (created_at);

-- ───────────────────────── security (same rules as before) ─────────────────────────

alter table public.responses enable row level security;

revoke all on public.responses from anon, authenticated;
grant select on public.responses to authenticated;              -- filtered to the admin by RLS

create policy "admin reads responses" on public.responses
  for select to authenticated using (public.is_admin());

-- ───────────────────────── save_response ─────────────────────────

-- Trims a free-text list: at most max_items entries, each at most max_len characters.
create or replace function public.clip_list(p_list text[], max_items int, max_len int)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array_agg(left(x, max_len) order by i)
  from unnest(p_list[1:max_items]) with ordinality as t(x, i);
$$;

revoke execute on function public.clip_list(text[], int, int) from public, anon, authenticated;

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
    updated_at                   = now(),
    completed                    = case when p_data ? 'completed'                    then coalesce(d.completed, false)                     else r.completed end,
    last_step                    = case when p_data ? 'last_step'                    then left(d.last_step, 40)                            else r.last_step end,
    utm_source                   = case when p_data ? 'utm_source'                   then left(d.utm_source, 100)                          else r.utm_source end,
    image_order                  = case when p_data ? 'image_order'                  then d.image_order[1:4]                               else r.image_order end,
    q1_normal_hold               = case when p_data ? 'q1_normal_hold'               then d.q1_normal_hold                                 else r.q1_normal_hold end,
    q2_event_hold                = case when p_data ? 'q2_event_hold'                then d.q2_event_hold                                  else r.q2_event_hold end,
    q3_ideal_hold                = case when p_data ? 'q3_ideal_hold'                then d.q3_ideal_hold                                  else r.q3_ideal_hold end,
    uses_products                = case when p_data ? 'uses_products'                then left(d.uses_products, 40)                        else r.uses_products end,
    products_used                = case when p_data ? 'products_used'                then public.clip_list(d.products_used, 15, 40)        else r.products_used end,
    routine                      = case when p_data ? 'routine'                      then left(d.routine, 2000)                            else r.routine end,
    routine_change               = case when p_data ? 'routine_change'               then left(d.routine_change, 1000)                     else r.routine_change end,
    downsides                    = case when p_data ? 'downsides'                    then public.clip_list(d.downsides, 12, 40)            else r.downsides end,
    worst_downside               = case when p_data ? 'worst_downside'               then left(d.worst_downside, 40)                       else r.worst_downside end,
    chose_weaker_hold            = case when p_data ? 'chose_weaker_hold'            then left(d.chose_weaker_hold, 40)                    else r.chose_weaker_hold end,
    wash_frequency               = case when p_data ? 'wash_frequency'               then left(d.wash_frequency, 40)                       else r.wash_frequency end,
    product_makes_wash_more      = case when p_data ? 'product_makes_wash_more'      then left(d.product_makes_wash_more, 40)              else r.product_makes_wash_more end,
    workout_non_wash_day         = case when p_data ? 'workout_non_wash_day'         then left(d.workout_non_wash_day, 40)                 else r.workout_non_wash_day end,
    workout_non_wash_day_other   = case when p_data ? 'workout_non_wash_day_other'   then left(d.workout_non_wash_day_other, 200)          else r.workout_non_wash_day_other end,
    pre_workout                  = case when p_data ? 'pre_workout'                  then left(d.pre_workout, 40)                          else r.pre_workout end,
    pre_workout_other            = case when p_data ? 'pre_workout_other'            then left(d.pre_workout_other, 200)                   else r.pre_workout_other end,
    post_workout_annoyance       = case when p_data ? 'post_workout_annoyance'       then left(d.post_workout_annoyance, 40)               else r.post_workout_annoyance end,
    post_workout_annoyance_other = case when p_data ? 'post_workout_annoyance_other' then left(d.post_workout_annoyance_other, 200)        else r.post_workout_annoyance_other end,
    mousse_use                   = case when p_data ? 'mousse_use'                   then left(d.mousse_use, 40)                           else r.mousse_use end,
    mousse_stop_reason           = case when p_data ? 'mousse_stop_reason'           then left(d.mousse_stop_reason, 500)                  else r.mousse_stop_reason end,
    mousse_tried_reason          = case when p_data ? 'mousse_tried_reason'          then left(d.mousse_tried_reason, 500)                 else r.mousse_tried_reason end,
    mousse_never_reason          = case when p_data ? 'mousse_never_reason'          then left(d.mousse_never_reason, 40)                  else r.mousse_never_reason end,
    mousse_never_reason_other    = case when p_data ? 'mousse_never_reason_other'    then left(d.mousse_never_reason_other, 200)           else r.mousse_never_reason_other end,
    mousse_brand                 = case when p_data ? 'mousse_brand'                 then left(d.mousse_brand, 200)                        else r.mousse_brand end,
    mousse_uses                  = case when p_data ? 'mousse_uses'                  then public.clip_list(d.mousse_uses, 10, 40)          else r.mousse_uses end,
    mousse_problems              = case when p_data ? 'mousse_problems'              then public.clip_list(d.mousse_problems, 15, 40)      else r.mousse_problems end,
    mousse_problems_other        = case when p_data ? 'mousse_problems_other'        then left(d.mousse_problems_other, 200)               else r.mousse_problems_other end,
    mousse_duration              = case when p_data ? 'mousse_duration'              then left(d.mousse_duration, 40)                      else r.mousse_duration end,
    mousse_features              = case when p_data ? 'mousse_features'              then public.clip_list(d.mousse_features, 4, 200)      else r.mousse_features end,
    oil_use                      = case when p_data ? 'oil_use'                      then left(d.oil_use, 40)                              else r.oil_use end,
    oil_stop_reason              = case when p_data ? 'oil_stop_reason'              then left(d.oil_stop_reason, 500)                     else r.oil_stop_reason end,
    oil_tried_reason             = case when p_data ? 'oil_tried_reason'             then left(d.oil_tried_reason, 500)                    else r.oil_tried_reason end,
    oil_never_reason             = case when p_data ? 'oil_never_reason'             then left(d.oil_never_reason, 40)                     else r.oil_never_reason end,
    oil_never_reason_other       = case when p_data ? 'oil_never_reason_other'       then left(d.oil_never_reason_other, 200)              else r.oil_never_reason_other end,
    oil_where                    = case when p_data ? 'oil_where'                    then public.clip_list(d.oil_where, 10, 40)            else r.oil_where end,
    oil_good                     = case when p_data ? 'oil_good'                     then public.clip_list(d.oil_good, 10, 40)             else r.oil_good end,
    oil_bad                      = case when p_data ? 'oil_bad'                      then public.clip_list(d.oil_bad, 10, 40)              else r.oil_bad end,
    would_switch                 = case when p_data ? 'would_switch'                 then left(d.would_switch, 40)                         else r.would_switch end,
    price_band                   = case when p_data ? 'price_band'                   then left(d.price_band, 40)                           else r.price_band end,
    currency                     = case when p_data ? 'currency'                     then left(d.currency, 8)                              else r.currency end,
    current_product              = case when p_data ? 'current_product'              then left(d.current_product, 200)                     else r.current_product end,
    gender                       = case when p_data ? 'gender'                       then left(d.gender, 40)                               else r.gender end,
    age_range                    = case when p_data ? 'age_range'                    then left(d.age_range, 40)                            else r.age_range end,
    hair_type                    = case when p_data ? 'hair_type'                    then left(d.hair_type, 40)                            else r.hair_type end,
    hair_length                  = case when p_data ? 'hair_length'                  then left(d.hair_length, 40)                          else r.hair_length end,
    coloured                     = case when p_data ? 'coloured'                     then left(d.coloured, 8)                              else r.coloured end,
    country                      = case when p_data ? 'country'                      then left(d.country, 8)                               else r.country end,
    climate                      = case when p_data ? 'climate'                      then left(d.climate, 40)                              else r.climate end
  where r.respondent_id = p_respondent_id
    and r.completed = false;
end;
$$;

revoke execute on function public.save_response(text, jsonb) from public;
grant execute on function public.save_response(text, jsonb) to anon, authenticated;
