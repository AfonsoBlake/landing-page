-- Survey v2.1: P2b "Which ONE do you use most?" and F1 "What look do you prefer?".
--
-- Not destructive: adds two columns and replaces save_response() so it writes them.
-- Existing rows keep their data (the new columns start as NULL). Same conventions as v2:
-- 'skip' = pressed Skip, NULL = never shown or not reached.
-- New answer codes that need no schema change: P2 'clay' / 'pomade',
-- M1b and O1b 'womens_product'.

alter table public.responses
  add column if not exists main_product      text,   -- P2b (or the only product ticked in P2)
  add column if not exists finish_preference text;   -- F1

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
    main_product                 = case when p_data ? 'main_product'                 then left(d.main_product, 40)                         else r.main_product end,
    finish_preference            = case when p_data ? 'finish_preference'            then left(d.finish_preference, 40)                    else r.finish_preference end,
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
