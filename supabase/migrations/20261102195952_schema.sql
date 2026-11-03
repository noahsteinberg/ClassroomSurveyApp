-- Phase 2: five-table schema. Apply only after review; no hosted database was used.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  description text,
  status text not null default 'draft' check (status in ('draft','active','closed','archived')),
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and public_slug is null) or (status <> 'draft' and public_slug is not null))
);
create unique index only_one_active_survey on public.surveys(status) where status = 'active';
create index surveys_status_idx on public.surveys(status);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null check (btrim(question_text) <> ''),
  question_type text not null check (question_type in ('multiple_choice','true_false')),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique(survey_id, position) deferrable initially deferred
);
create index questions_survey_id_idx on public.questions(survey_id);
create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null check (btrim(choice_text) <> ''),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique(question_id, position) deferrable initially deferred
);
create index choices_question_id_idx on public.choices(question_id);
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  anonymous_token text not null check (anonymous_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  submitted_at timestamptz not null default now(),
  unique(survey_id, anonymous_token)
);
create index responses_survey_id_idx on public.responses(survey_id);
create index responses_submitted_at_idx on public.responses(submitted_at);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_id uuid references public.choices(id) on delete set null,
  text_answer text check (text_answer is null),
  created_at timestamptz not null default now(),
  unique(response_id, question_id)
);
create index answers_response_id_idx on public.answers(response_id);
create index answers_question_id_idx on public.answers(question_id);
create index answers_choice_id_idx on public.answers(choice_id);

-- Trigger functions run with owner rights so RLS cannot hide parent rows.
create function private.guard_survey() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.status = 'active' then raise exception 'CLOSE_BEFORE_DELETE'; end if;
    return OLD;
  elsif TG_OP = 'INSERT' then
    if NEW.status <> 'draft' or NEW.public_slug is not null then raise exception 'DRAFT_REQUIRED'; end if;
    return NEW;
  end if;
  if NEW.id is distinct from OLD.id or NEW.created_at is distinct from OLD.created_at then
    raise exception 'IMMUTABLE_FIELD';
  end if;
  if OLD.status <> 'draft' and (NEW.title is distinct from OLD.title or NEW.description is distinct from OLD.description) then
    raise exception 'DRAFT_ONLY_EDITING';
  end if;
  if NEW.status is distinct from OLD.status and not (
    (OLD.status = 'draft' and NEW.status = 'active') or
    (OLD.status = 'active' and NEW.status = 'closed') or
    (OLD.status = 'closed' and NEW.status = 'archived')
  ) then raise exception 'INVALID_TRANSITION'; end if;
  if NEW.public_slug is distinct from OLD.public_slug and not (
    OLD.status = 'draft' and NEW.status = 'active' and OLD.public_slug is null and NEW.public_slug is not null
  ) then raise exception 'IMMUTABLE_FIELD'; end if;
  NEW.updated_at := clock_timestamp();
  return NEW;
end;
$$;
create trigger surveys_guard before insert or update or delete on public.surveys
for each row execute function private.guard_survey();

create function private.guard_question() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_status text; v_survey uuid;
begin
  if TG_OP = 'UPDATE' and (NEW.id is distinct from OLD.id or NEW.survey_id is distinct from OLD.survey_id
    or NEW.created_at is distinct from OLD.created_at) then raise exception 'IMMUTABLE_FIELD'; end if;
  if TG_OP = 'DELETE' then v_survey := OLD.survey_id; else v_survey := NEW.survey_id; end if;
  select status into v_status from public.surveys where id = v_survey for update;
  -- Parent is already gone when ON DELETE CASCADE removes its children.
  if not found and TG_OP = 'DELETE' then return OLD; end if;
  if v_status is distinct from 'draft' then raise exception 'DRAFT_ONLY_EDITING'; end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
create trigger questions_guard before insert or update or delete on public.questions
for each row execute function private.guard_question();

create function private.guard_choice() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_survey uuid; v_question uuid; v_status text;
begin
  if TG_OP = 'UPDATE' and (NEW.id is distinct from OLD.id or NEW.question_id is distinct from OLD.question_id
    or NEW.created_at is distinct from OLD.created_at) then raise exception 'IMMUTABLE_FIELD'; end if;
  if TG_OP = 'DELETE' then v_question := OLD.question_id; else v_question := NEW.question_id; end if;
  select survey_id into v_survey from public.questions where id = v_question;
  if not found and TG_OP = 'DELETE' then return OLD; end if;
  select status into v_status from public.surveys where id = v_survey for update;
  if not found and TG_OP = 'DELETE' then return OLD; end if;
  if v_status is distinct from 'draft' then raise exception 'DRAFT_ONLY_EDITING'; end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
create trigger choices_guard before insert or update or delete on public.choices
for each row execute function private.guard_choice();

create function private.guard_answer_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.responses r join public.questions q on q.survey_id = r.survey_id
    join public.choices c on c.question_id = q.id
    where r.id = NEW.response_id and q.id = NEW.question_id and c.id = NEW.choice_id
  ) then raise exception 'INVALID_ANSWER_MEMBERSHIP'; end if;
  return NEW;
end;
$$;
create trigger answers_membership before insert on public.answers
for each row execute function private.guard_answer_membership();
revoke all on all functions in schema private from public, anon, authenticated;
commit;
