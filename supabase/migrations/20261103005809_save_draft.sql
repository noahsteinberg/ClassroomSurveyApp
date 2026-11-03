begin;
-- Private receipts make a lost-response retry safe without exposing extra public tables.
create table private.draft_save_receipts (
  request_id uuid primary key,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  instructor_id uuid not null,
  payload jsonb not null,
  result jsonb not null
);
alter table private.draft_save_receipts enable row level security;
revoke all on private.draft_save_receipts from public, anon, authenticated;

-- Child-only changes must invalidate a draft loaded in another tab too.
create function private.touch_draft_version() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_survey uuid; v_question uuid;
begin
  if TG_TABLE_NAME='questions' then
    if TG_OP='DELETE' then v_survey:=OLD.survey_id; else v_survey:=NEW.survey_id; end if;
  else
    if TG_OP='DELETE' then v_question:=OLD.question_id; else v_question:=NEW.question_id; end if;
    select survey_id into v_survey from public.questions where id=v_question;
  end if;
  update public.surveys set updated_at=clock_timestamp() where id=v_survey and status='draft';
  return null;
end;
$$;
revoke all on function private.touch_draft_version() from public,anon,authenticated;
create trigger questions_touch_version after insert or update or delete on public.questions
for each row execute function private.touch_draft_version();
create trigger choices_touch_version after insert or update or delete on public.choices
for each row execute function private.touch_draft_version();

create function public.save_draft_survey(
  p_survey_id uuid, p_expected_updated_at timestamptz, p_request_id uuid,
  p_title text, p_description text, p_questions jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_survey public.surveys; v_receipt private.draft_save_receipts;
  v_payload jsonb; v_result jsonb; v_q jsonb; v_c jsonb;
  v_qid uuid; v_cid uuid; v_qids uuid[] := array[]::uuid[]; v_cids uuid[] := array[]::uuid[];
  v_all_cids uuid[] := array[]::uuid[]; v_qposition integer := 0; v_cposition integer;
  v_new boolean;
begin
  perform private.require_instructor();
  if p_survey_id is null or p_request_id is null then raise exception 'INVALID_DRAFT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_survey_id::text,4095));
  select * into v_survey from public.surveys where id=p_survey_id for update;
  v_new := not found;
  if not v_new and v_survey.status <> 'draft' then raise exception 'DRAFT_ONLY_EDITING'; end if;
  v_payload := jsonb_build_object('survey_id',p_survey_id,'expected_updated_at',p_expected_updated_at,
    'title',p_title,'description',p_description,'questions',p_questions);
  select * into v_receipt from private.draft_save_receipts where request_id=p_request_id;
  if found then
    if v_receipt.instructor_id <> auth.uid() or v_receipt.payload <> v_payload then raise exception 'SAVE_REQUEST_REUSED'; end if;
    if v_new or v_survey.updated_at is distinct from (v_receipt.result->>'updated_at')::timestamptz then raise exception 'DRAFT_CONFLICT'; end if;
    return v_receipt.result;
  end if;
  if v_new and p_expected_updated_at is not null then raise exception 'SURVEY_NOT_FOUND'; end if;
  if not v_new and (p_expected_updated_at is null or v_survey.updated_at is distinct from p_expected_updated_at) then raise exception 'DRAFT_CONFLICT'; end if;
  if p_title is null or btrim(p_title)='' or p_questions is null or jsonb_typeof(p_questions)<>'array' then raise exception 'INVALID_DRAFT'; end if;
  -- Incomplete counts are allowed in drafts. Blank records and malformed ownership are not.
  for v_q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_q)<>'object' or jsonb_typeof(v_q->'id') is distinct from 'string'
      or jsonb_typeof(v_q->'question_text') is distinct from 'string'
      or btrim(v_q->>'question_text')='' or coalesce(v_q->>'question_type','') not in ('multiple_choice','true_false')
      or jsonb_typeof(v_q->'choices') is distinct from 'array' then raise exception 'INVALID_DRAFT'; end if;
    begin v_qid := (v_q->>'id')::uuid; exception when invalid_text_representation then raise exception 'INVALID_DRAFT'; end;
    if v_qid=any(v_qids) then raise exception 'DUPLICATE_DRAFT_ID'; end if;
    if exists(select 1 from public.questions where id=v_qid and survey_id<>p_survey_id) then raise exception 'INVALID_QUESTION'; end if;
    v_qids := array_append(v_qids,v_qid);
    v_cposition := 0;
    for v_c in select value from jsonb_array_elements(v_q->'choices') loop
      v_cposition := v_cposition+1;
      if jsonb_typeof(v_c)<>'object' or jsonb_typeof(v_c->'id') is distinct from 'string'
        or jsonb_typeof(v_c->'choice_text') is distinct from 'string' or btrim(v_c->>'choice_text')='' then raise exception 'INVALID_DRAFT'; end if;
      begin v_cid := (v_c->>'id')::uuid; exception when invalid_text_representation then raise exception 'INVALID_DRAFT'; end;
      if v_cid=any(v_all_cids) then raise exception 'DUPLICATE_DRAFT_ID'; end if;
      if exists(select 1 from public.choices where id=v_cid and question_id<>v_qid) then raise exception 'INVALID_CHOICE'; end if;
      v_all_cids := array_append(v_all_cids,v_cid);
      if v_q->>'question_type'='true_false' and (v_cposition>2 or v_c->>'choice_text'<>case when v_cposition=1 then 'True' else 'False' end) then raise exception 'INVALID_TRUE_FALSE'; end if;
    end loop;
    if v_q->>'question_type'='true_false' and v_cposition<>2 then raise exception 'INVALID_TRUE_FALSE'; end if;
  end loop;
  if v_new then
    insert into public.surveys(id,title,description) values(p_survey_id,btrim(p_title),nullif(btrim(p_description),'')) returning * into v_survey;
  else
    update public.surveys set title=btrim(p_title),description=nullif(btrim(p_description),'') where id=p_survey_id returning * into v_survey;
  end if;
  set constraints public.questions_survey_id_position_key, public.choices_question_id_position_key deferred;
  delete from public.questions where survey_id=p_survey_id and not(id=any(v_qids));
  for v_q in select value from jsonb_array_elements(p_questions) loop
    v_qid := (v_q->>'id')::uuid; v_qposition := v_qposition+1;
    insert into public.questions(id,survey_id,question_text,question_type,position)
      values(v_qid,p_survey_id,btrim(v_q->>'question_text'),v_q->>'question_type',v_qposition)
      on conflict(id) do update set question_text=excluded.question_text,question_type=excluded.question_type,position=excluded.position;
    select coalesce(array_agg((x->>'id')::uuid),array[]::uuid[]) into v_cids from jsonb_array_elements(v_q->'choices') x;
    delete from public.choices where question_id=v_qid and not(id=any(v_cids));
    v_cposition := 0;
    for v_c in select value from jsonb_array_elements(v_q->'choices') loop
      v_cposition := v_cposition+1;
      insert into public.choices(id,question_id,choice_text,position)
        values((v_c->>'id')::uuid,v_qid,btrim(v_c->>'choice_text'),v_cposition)
        on conflict(id) do update set choice_text=excluded.choice_text,position=excluded.position;
    end loop;
  end loop;
  select updated_at into v_survey.updated_at from public.surveys where id=p_survey_id;
  v_result := jsonb_build_object('id',v_survey.id,'updated_at',v_survey.updated_at);
  begin
    insert into private.draft_save_receipts values(p_request_id,p_survey_id,auth.uid(),v_payload,v_result);
  exception when unique_violation then raise exception 'SAVE_REQUEST_REUSED'; end;
  return v_result;
end;
$$;
revoke all on function public.save_draft_survey(uuid,timestamptz,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_draft_survey(uuid,timestamptz,uuid,text,text,jsonb) to authenticated;
commit;
