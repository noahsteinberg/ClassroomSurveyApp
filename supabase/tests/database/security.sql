-- SQL regression suite. Every assertion raises on failure; the runner uses ON_ERROR_STOP.
-- The transaction rolls back all test mutations. Not a pgTAP file.
begin;
select test_support.check((select count(*)=5 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relrowsecurity),'RLS enabled on all five tables');
select test_support.check((select bool_and(p.proconfig @> array['search_path=""']) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and p.prosecdef),'all privileged functions have an empty search_path');
select test_support.check(not has_schema_privilege('anon','private','USAGE') and not has_schema_privilege('authenticated','private','USAGE'),'private helpers inaccessible');
select set_config('test.payload_a',test_support.payload('a')::text,true);
select set_config('test.payload_b',test_support.payload('b')::text,true);
select set_config('test.slug_a',(select public_slug from public.surveys where id=test_support.id('a')),true);
select set_config('test.slug_c',(select public_slug from public.surveys where id=test_support.id('c')),true);
select set_config('test.slug_d',(select public_slug from public.surveys where id=test_support.id('d')),true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select test_support.check(not has_table_privilege('anon','public.surveys','INSERT')
 and not has_table_privilege('anon','public.surveys','UPDATE') and not has_table_privilege('anon','public.surveys','DELETE')
 and not has_table_privilege('anon','public.questions','INSERT') and not has_table_privilege('anon','public.questions','UPDATE') and not has_table_privilege('anon','public.questions','DELETE')
 and not has_table_privilege('anon','public.choices','INSERT') and not has_table_privilege('anon','public.choices','UPDATE') and not has_table_privilege('anon','public.choices','DELETE')
 and not has_table_privilege('anon','public.responses','UPDATE') and not has_table_privilege('anon','public.responses','DELETE')
 and not has_table_privilege('anon','public.answers','UPDATE') and not has_table_privilege('anon','public.answers','DELETE'),'anonymous has no table mutation grants');
select test_support.check((select count(*)=1 from public.surveys),'anonymous sees only active survey');
select test_support.check((select count(*)=2 from public.questions),'anonymous sees only active questions');
select test_support.check((select count(*)=4 from public.choices),'anonymous sees only active choices');
select test_support.check(public.survey_availability(current_setting('test.slug_a'))='active','availability active');
select test_support.check(public.survey_availability(current_setting('test.slug_c'))='closed','availability closed without content');
select test_support.check(public.survey_availability(current_setting('test.slug_d'))='closed','availability archived without content');
select test_support.check(public.survey_availability('missing')='not_found','availability unknown');
select test_support.throws('select * from public.responses','42501','permission denied');
select test_support.throws('select * from public.answers','42501','permission denied');
select test_support.throws($q$insert into public.surveys(title) values('tampered')$q$,'42501','permission denied');
select test_support.throws($q$update public.questions set question_text='tampered'$q$,'42501','permission denied');
select test_support.throws('delete from public.choices','42501','permission denied');
select test_support.throws('insert into public.responses default values','42501','permission denied');
select test_support.throws('insert into public.answers default values','42501','permission denied');
select test_support.throws($q$select public.activate_survey(test_support.id('b'))$q$,'42501','permission denied');
select test_support.throws($q$select public.close_survey(test_support.id('a'))$q$,'42501','permission denied');
select test_support.throws($q$select public.archive_survey(test_support.id('c'))$q$,'42501','permission denied');
select test_support.throws('select private.require_instructor()','42501','permission denied');
select test_support.throws($q$select public.submit_survey_response(test_support.id('c'),test_support.id('token')::text,'[]')$q$,'P0001','SURVEY_NOT_ACTIVE');
select test_support.throws($q$select public.submit_survey_response(test_support.id('b'),test_support.id('token')::text,'[]')$q$,'P0001','SURVEY_NOT_ACTIVE');
select test_support.throws($q$select public.submit_survey_response(test_support.id('missing'),test_support.id('token')::text,'[]')$q$,'P0001','SURVEY_NOT_ACTIVE');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),null,current_setting('test.payload_a')::jsonb)$q$,'P0001','INVALID_TOKEN');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),'bad-token',current_setting('test.payload_a')::jsonb)$q$,'P0001','INVALID_TOKEN');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,'{}')$q$,'P0001','INVALID_PAYLOAD');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,null)$q$,'P0001','INVALID_PAYLOAD');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,'[]')$q$,'P0001','MISSING_REQUIRED_ANSWER');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,'[{},{}]')$q$,'P0001','INVALID_PAYLOAD');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,'[null,null]')$q$,'P0001','INVALID_PAYLOAD');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,'[{"question_id":"bad","choice_id":"bad"},{"question_id":"bad","choice_id":"bad"}]')$q$,'P0001','INVALID_PAYLOAD');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,current_setting('test.payload_b')::jsonb || current_setting('test.payload_b')::jsonb)$q$,'P0001','INVALID_QUESTION');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,jsonb_build_array((current_setting('test.payload_a')::jsonb)->0,(current_setting('test.payload_a')::jsonb)->0))$q$,'P0001','DUPLICATE_QUESTION');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,jsonb_set(current_setting('test.payload_a')::jsonb,'{1,choice_id}',to_jsonb(test_support.id('a-c1')::text)))$q$,'P0001','INVALID_CHOICE');
reset role;
select test_support.check((select count(*)=0 from public.responses) and (select count(*)=0 from public.answers),'validation failures leave no partial records');
-- Simulate failure during the answer insert, after response insertion succeeded.
create function test_support.reject_answer() returns trigger language plpgsql as $$ begin raise exception 'TEST_STORAGE_FAILURE'; end $$;
create trigger test_storage_failure before insert on public.answers for each row execute function test_support.reject_answer();
set local role anon;
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,current_setting('test.payload_a')::jsonb)$q$,'P0001','TEST_STORAGE_FAILURE');
reset role;
drop trigger test_storage_failure on public.answers;
select test_support.check((select count(*)=0 from public.responses) and (select count(*)=0 from public.answers),'answer storage failure rolls back response');
set local role anon;
select test_support.check((public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,current_setting('test.payload_a')::jsonb)->>'success')::boolean,'valid anonymous submission succeeds');
select test_support.throws($q$select public.submit_survey_response(test_support.id('a'),test_support.id('token')::text,current_setting('test.payload_a')::jsonb)$q$,'P0001','DUPLICATE_RESPONSE');
reset role;
select test_support.check((select count(*)=1 from public.responses) and (select count(*)=2 from public.answers),'one persisted response and two answers');
set local role authenticated;
select test_support.check((select count(*)=0 from public.surveys),'authenticated without user ID sees no instructor data');
select test_support.throws($q$select public.close_survey(test_support.id('a'))$q$,'42501','AUTHENTICATION_REQUIRED');
select set_config('request.jwt.claim.sub',test_support.id('instructor')::text,true);
select test_support.check((select count(*)=8 from public.surveys),'instructor reads every survey status');
select test_support.check((select count(*)=1 from public.responses) and (select count(*)=2 from public.answers),'instructor reads results data');
insert into public.questions(survey_id,question_text,question_type,position) values(test_support.id('b'),'New draft question','multiple_choice',2);
insert into public.choices(question_id,choice_text,position) values(test_support.id('b-q'),'Third choice',3);
update public.questions set question_text='Edited draft question' where survey_id=test_support.id('b') and position=2;
update public.choices set choice_text='Edited draft choice' where question_id=test_support.id('b-q') and position=3;
select test_support.check(exists(select 1 from public.questions where question_text='Edited draft question') and exists(select 1 from public.choices where choice_text='Edited draft choice'),'instructor creates and edits draft questions and choices');
delete from public.questions where survey_id=test_support.id('b') and position=2;
delete from public.choices where question_id=test_support.id('b-q') and position=3;
select test_support.throws($q$insert into public.questions(survey_id,question_text,question_type,position) values(test_support.id('a'),'Injected','multiple_choice',3)$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$insert into public.choices(question_id,choice_text,position) values(test_support.id('a-q'),'Injected',3)$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$update public.questions set survey_id=test_support.id('b') where id=test_support.id('a-q')$q$,'42501','permission denied');
insert into public.surveys(title,description) values('Instructor draft','Created by instructor');
update public.surveys set title='Edited draft' where title='Instructor draft';
select test_support.check(exists(select 1 from public.surveys where title='Edited draft'),'instructor creates and edits a draft');
select test_support.throws($q$insert into public.surveys(title) values('  ')$q$,'23514','check constraint');
select test_support.throws($q$update public.surveys set status='closed' where id=test_support.id('a')$q$,'42501','permission denied');
select test_support.throws($q$update public.surveys set public_slug='forged' where id=test_support.id('a')$q$,'42501','permission denied');
select test_support.throws($q$update public.surveys set title='tampered' where id=test_support.id('a')$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$update public.questions set question_text='tampered' where id=test_support.id('a-q')$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$delete from public.choices where id=test_support.id('a-c1')$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$delete from public.surveys where id=test_support.id('a')$q$,'P0001','CLOSE_BEFORE_DELETE');
select test_support.throws('delete from public.responses','42501','permission denied');
select test_support.throws('update public.answers set choice_id=null','42501','permission denied');
select test_support.throws($q$select public.activate_survey(test_support.id('empty'))$q$,'P0001','SURVEY_REQUIRES_QUESTIONS');
select test_support.throws($q$select public.activate_survey(test_support.id('bad_tf'))$q$,'P0001','TRUE_FALSE_REQUIRES_FIXED_CHOICES');
select test_support.throws($q$select public.activate_survey(test_support.id('bad_mc'))$q$,'P0001','MULTIPLE_CHOICE_REQUIRES_CHOICES');
select public.close_survey(test_support.id('a'));
select test_support.throws($q$update public.surveys set title='tampered' where id=test_support.id('a')$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$update public.choices set choice_text='tampered' where id=test_support.id('a-c1')$q$,'P0001','DRAFT_ONLY_EDITING');
select test_support.throws($q$select public.activate_survey(test_support.id('a'))$q$,'P0001','DRAFT_REQUIRED');
select public.archive_survey(test_support.id('a'));
select test_support.check((select count(*)=1 from public.responses) and (select count(*)=2 from public.answers),'close/archive preserves collected results');
select test_support.throws($q$delete from public.questions where id=test_support.id('a-q')$q$,'P0001','DRAFT_ONLY_EDITING');
select public.activate_survey(test_support.id('b'));
select public.activate_survey(test_support.id('e'));
select test_support.check((select count(*)=1 from public.surveys where status='active') and (select status='closed' from public.surveys where id=test_support.id('b')),'activation closes previous survey');
delete from public.surveys where id=test_support.id('a');
select test_support.check((select count(*)=0 from public.responses) and (select count(*)=0 from public.answers),'explicit deletion cascades responses and answers');
select test_support.check(not exists(select 1 from public.questions where survey_id=test_support.id('a')),'explicit deletion cascades content');
reset role;
-- Verify the partial unique index independently of RPC logic.
select test_support.throws($q$update public.surveys set status='active',public_slug=gen_random_uuid()::text where id=test_support.id('c')$q$,'P0001','INVALID_TRANSITION');
select test_support.throws($q$update public.surveys set status='active',public_slug=gen_random_uuid()::text where id=test_support.id('empty')$q$,'23505','only_one_active_survey');
rollback;
