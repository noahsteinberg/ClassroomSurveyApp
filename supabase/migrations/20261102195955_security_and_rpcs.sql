begin;
alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;
revoke all on public.surveys, public.questions, public.choices, public.responses, public.answers from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.surveys, public.questions, public.choices to anon, authenticated;
grant select on public.responses, public.answers to authenticated;
grant insert(title, description), update(title, description), delete on public.surveys to authenticated;
grant insert(survey_id, question_text, question_type, position), update(question_text, question_type, position), delete on public.questions to authenticated;
grant insert(question_id, choice_text, position), update(choice_text, position), delete on public.choices to authenticated;

create policy students_read_active_surveys on public.surveys for select to anon using (status = 'active');
create policy students_read_active_questions on public.questions for select to anon using (
  exists (select 1 from public.surveys s where s.id = survey_id and s.status = 'active')
);
create policy students_read_active_choices on public.choices for select to anon using (
  exists (select 1 from public.questions q join public.surveys s on s.id = q.survey_id
    where q.id = question_id and s.status = 'active')
);
-- Every provisioned Auth account is a trusted instructor. Disable all public signup
-- and anonymous Auth sign-ins in the project; no student Auth accounts are created.
create policy instructors_manage_surveys on public.surveys for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy instructors_manage_questions on public.questions for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy instructors_manage_choices on public.choices for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy instructors_read_responses on public.responses for select to authenticated using ((select auth.uid()) is not null);
create policy instructors_read_answers on public.answers for select to authenticated using ((select auth.uid()) is not null);

create function private.require_instructor() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501'; end if;
end;
$$;

create function public.activate_survey(p_survey_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_survey public.surveys; v_question public.questions; v_count integer;
begin
  perform private.require_instructor();
  -- Serializes activation/closing/archive in a fixed order before row locking.
  perform pg_catalog.pg_advisory_xact_lock(4095, 1);
  select * into v_survey from public.surveys where id = p_survey_id for update;
  if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
  if v_survey.status <> 'draft' then raise exception 'DRAFT_REQUIRED'; end if;
  if not exists (select 1 from public.questions where survey_id = p_survey_id) then raise exception 'SURVEY_REQUIRES_QUESTIONS'; end if;
  for v_question in select * from public.questions where survey_id = p_survey_id loop
    select count(*) into v_count from public.choices where question_id = v_question.id;
    if v_question.question_type = 'multiple_choice' and v_count < 2 then raise exception 'MULTIPLE_CHOICE_REQUIRES_CHOICES'; end if;
    if v_question.question_type = 'true_false' and (
      v_count <> 2 or not exists (select 1 from public.choices where question_id = v_question.id and choice_text = 'True' and position = 1)
      or not exists (select 1 from public.choices where question_id = v_question.id and choice_text = 'False' and position = 2)
    ) then raise exception 'TRUE_FALSE_REQUIRES_FIXED_CHOICES'; end if;
  end loop;
  update public.surveys set status = 'closed' where status = 'active';
  update public.surveys set status = 'active', public_slug = gen_random_uuid()::text
    where id = p_survey_id returning * into v_survey;
  return jsonb_build_object('id', v_survey.id, 'status', v_survey.status, 'public_slug', v_survey.public_slug);
end;
$$;
create function public.close_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_instructor();
  perform pg_catalog.pg_advisory_xact_lock(4095, 1);
  update public.surveys set status = 'closed' where id = p_survey_id and status = 'active';
  if not found then raise exception 'SURVEY_NOT_ACTIVE'; end if;
end;
$$;
create function public.archive_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_instructor();
  perform pg_catalog.pg_advisory_xact_lock(4095, 1);
  update public.surveys set status = 'archived' where id = p_survey_id and status = 'closed';
  if not found then raise exception 'SURVEY_NOT_CLOSED'; end if;
end;
$$;

-- Reveals only availability, never inactive survey content or response data.
create function public.survey_availability(p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when status = 'active' then 'active' else 'closed' end
    from public.surveys where public_slug = p_slug and status <> 'draft'), 'not_found');
$$;

create function public.submit_survey_response(p_survey_id uuid, p_anonymous_token text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_status text; v_answer jsonb; v_question uuid; v_choice uuid; v_response uuid;
  v_questions uuid[] := array[]::uuid[]; v_required integer;
begin
  -- Shared row lock allows concurrent submissions, but conflicts with close/delete.
  select status into v_status from public.surveys where id = p_survey_id for share;
  if v_status is distinct from 'active' then raise exception 'SURVEY_NOT_ACTIVE'; end if;
  if p_anonymous_token is null or p_anonymous_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'INVALID_TOKEN';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_PAYLOAD'; end if;
  select count(*) into v_required from public.questions where survey_id = p_survey_id;
  if jsonb_array_length(p_answers) <> v_required then raise exception 'MISSING_REQUIRED_ANSWER'; end if;
  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
    if (select count(*) from jsonb_object_keys(v_answer)) <> 2
      or jsonb_typeof(v_answer->'question_id') is distinct from 'string'
      or jsonb_typeof(v_answer->'choice_id') is distinct from 'string' then raise exception 'INVALID_PAYLOAD'; end if;
    begin
      v_question := (v_answer->>'question_id')::uuid;
      v_choice := (v_answer->>'choice_id')::uuid;
    exception when invalid_text_representation then raise exception 'INVALID_PAYLOAD'; end;
    if v_question = any(v_questions) then raise exception 'DUPLICATE_QUESTION'; end if;
    if not exists (select 1 from public.questions where id = v_question and survey_id = p_survey_id) then raise exception 'INVALID_QUESTION'; end if;
    if not exists (select 1 from public.choices where id = v_choice and question_id = v_question) then raise exception 'INVALID_CHOICE'; end if;
    v_questions := array_append(v_questions, v_question);
  end loop;
  begin
    insert into public.responses(survey_id, anonymous_token) values(p_survey_id, p_anonymous_token) returning id into v_response;
  exception when unique_violation then raise exception 'DUPLICATE_RESPONSE'; end;
  insert into public.answers(response_id, question_id, choice_id)
    select v_response, (a->>'question_id')::uuid, (a->>'choice_id')::uuid from jsonb_array_elements(p_answers) a;
  return jsonb_build_object('success', true, 'response_id', v_response);
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.activate_survey(uuid), public.close_survey(uuid), public.archive_survey(uuid),
  public.survey_availability(text), public.submit_survey_response(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.activate_survey(uuid), public.close_survey(uuid), public.archive_survey(uuid) to authenticated;
grant execute on function public.survey_availability(text), public.submit_survey_response(uuid,text,jsonb) to anon, authenticated;
commit;
