-- LOCAL TEST ONLY: models the minimum Supabase roles/auth.uid interface.
-- Never put this file in migrations or apply it to a Supabase project.
\set ON_ERROR_STOP on
DO $$ begin
  if current_database() <> 'classroom_survey_test' then raise exception 'LOCAL_TEST_DATABASE_REQUIRED'; end if;
end $$;
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema test_support;
grant usage on schema test_support to anon, authenticated;
create function test_support.id(p_name text) returns uuid language sql immutable as $$ select md5(p_name)::uuid $$;
create function test_support.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
 if p_ok is distinct from true then raise exception 'FAIL: %', p_label; end if;
 raise notice 'PASS: %', p_label;
end $$;
create function test_support.throws(p_sql text, p_code text, p_message text) returns void language plpgsql as $$
begin
 begin
  execute p_sql;
 exception when others then
  if SQLSTATE <> p_code or position(p_message in SQLERRM) = 0 then
   raise exception 'Wrong error for %: [%] %', p_sql, SQLSTATE, SQLERRM;
  end if;
  raise notice 'PASS: rejected %', p_message;
  return;
 end;
 raise exception 'Expected [%] % for %', p_code, p_message, p_sql;
end $$;
grant execute on all functions in schema test_support to anon, authenticated;
