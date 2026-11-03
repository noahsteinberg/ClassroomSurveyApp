-- Synthetic data only. Runs inside the isolated test container.
begin;
insert into public.surveys(id,title) select test_support.id(n), 'Survey ' || n from unnest(array['a','b','c','d','e','empty','bad_tf','bad_mc']) n;
insert into public.questions(id,survey_id,question_text,question_type,position)
 select test_support.id(n || '-q'),test_support.id(n),'Pick one','multiple_choice',1 from unnest(array['a','b','c','d','e']) n;
insert into public.choices(id,question_id,choice_text,position)
 select test_support.id(n || '-c' || i),test_support.id(n || '-q'),'Choice ' || i,i
 from unnest(array['a','b','c','d','e']) n cross join generate_series(1,2) i;
insert into public.questions(id,survey_id,question_text,question_type,position) values
 (test_support.id('a-tf'),test_support.id('a'),'True or false?','true_false',2),
 (test_support.id('bad_tf-q'),test_support.id('bad_tf'),'Invalid TF','true_false',1),
 (test_support.id('bad_mc-q'),test_support.id('bad_mc'),'Invalid MC','multiple_choice',1);
insert into public.choices(id,question_id,choice_text,position) values
 (test_support.id('a-true'),test_support.id('a-tf'),'True',1),
 (test_support.id('a-false'),test_support.id('a-tf'),'False',2),
 (test_support.id('bad_tf-c1'),test_support.id('bad_tf-q'),'Yes',1),
 (test_support.id('bad_tf-c2'),test_support.id('bad_tf-q'),'No',2),
 (test_support.id('bad_mc-c1'),test_support.id('bad_mc-q'),'Only one',1);
create function test_support.payload(p_name text) returns jsonb language sql as $$
 select jsonb_agg(jsonb_build_object('question_id',q.id,'choice_id',c.id) order by q.position)
 from public.questions q join public.choices c on c.question_id=q.id and c.position=1
 where q.survey_id=test_support.id(p_name);
$$;
-- Build payloads before switching role, so malformed-test construction does not depend on RLS.
select set_config('test.payload_a',test_support.payload('a')::text,false);
select set_config('test.payload_b',test_support.payload('b')::text,false);
select set_config('request.jwt.claim.sub',test_support.id('instructor')::text,false);
set local role authenticated;
select public.activate_survey(test_support.id('c'));
select public.close_survey(test_support.id('c'));
select public.activate_survey(test_support.id('d'));
select public.close_survey(test_support.id('d'));
select public.archive_survey(test_support.id('d'));
select public.activate_survey(test_support.id('a'));
commit;
