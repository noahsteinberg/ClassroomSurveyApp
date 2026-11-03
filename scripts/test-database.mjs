// Isolated PostgreSQL tests only: no Supabase CLI, URLs, keys, or host ports.
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../', import.meta.url))
const container = `classroom-survey-test-${process.pid}-${Date.now()}`
const database = 'classroom_survey_test'
const image = 'postgres:17-alpine'
const command = (args, input) => {
  const result = spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    cwd: root,
    timeout: 120_000,
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.stdout || `docker exited ${result.status}`,
    )
  return result
}
const args = [
  'exec',
  '-i',
  container,
  'psql',
  '-X',
  '-v',
  'ON_ERROR_STOP=1',
  '-U',
  'postgres',
  '-d',
  database,
  '-At',
]
const sql = (text) => command(args, text).stdout.trim()
const file = (path) =>
  command(
    args,
    readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(
      /^\uFEFF/,
      '',
    ),
  )
const instructor = (text) =>
  `begin; set local role authenticated; select set_config('request.jwt.claim.sub',test_support.id('instructor')::text,true); ${text}; commit;`
const student = (text) => `begin; set local role anon; ${text}; commit;`
const submit = (name, token) =>
  `select public.submit_survey_response(test_support.id('${name}'),test_support.id('${token}')::text,${name === 'a' ? `(select jsonb_agg(jsonb_build_object('question_id',q.id,'choice_id',c.id)) from public.questions q join public.choices c on c.question_id=q.id and c.position=1 where q.survey_id=test_support.id('a'))` : `jsonb_build_array(jsonb_build_object('question_id',test_support.id('${name}-q'),'choice_id',test_support.id('${name}-c1')))`})`
const asyncSql = (text) =>
  new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = '',
      stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Concurrent SQL timed out'))
    }, 15_000)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
    child.stdin.end(text)
  })
const holder = async (text) => {
  const child = spawn('docker', args, {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stderr = ''
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Lock holder timed out'))
    }, 10_000)
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('LOCK_READY')) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.on('error', reject)
    child.on('close', () => {
      clearTimeout(timer)
      reject(new Error(`Lock holder closed early: ${stderr}`))
    })
  })
  child.stdin.write(`${text}; select 'LOCK_READY';\n`)
  await ready
  return async () => {
    const done = new Promise((resolve, reject) =>
      child.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(stderr)),
      ),
    )
    child.stdin.end('commit;\n')
    await done
  }
}
const waitForLock = async (name) => {
  for (let i = 0; i < 50; i++) {
    if (
      sql(
        `select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`,
      ) === '1'
    )
      return
    await delay(50)
  }
  throw new Error(`Expected ${name} to wait on the survey row lock`)
}

let started = false
try {
  command(['info', '--format', '{{.ServerVersion}}'])
  command([
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '-e',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '-e',
    `POSTGRES_DB=${database}`,
    image,
  ])
  started = true
  let ready = false
  for (let i = 0; i < 100; i++) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        container,
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-U',
        'postgres',
        '-d',
        database,
      ],
      { encoding: 'utf8' },
    )
    if (result.status === 0) {
      ready = true
      break
    }
    await delay(100)
  }
  assert(ready, 'PostgreSQL became ready')
  file('supabase/tests/local/bootstrap.sql')
  const migrations = readdirSync(
    new URL('../supabase/migrations/', import.meta.url),
  )
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (const name of migrations) file(`supabase/migrations/${name}`)
  console.log(
    `PASS: ${migrations.length} migrations applied to a fresh isolated PostgreSQL database`,
  )
  file('supabase/tests/local/fixtures.sql')
  const checks = file('supabase/tests/database/security.sql')
  console.log(
    `PASS: SQL security suite (${(checks.stderr.match(/NOTICE:\s+PASS:/g) || []).length} assertions)`,
  )

  const duplicates = await Promise.all([
    asyncSql(student(submit('a', 'race-token'))),
    asyncSql(student(submit('a', 'race-token'))),
  ])
  assert.equal(duplicates.filter((r) => r.code === 0).length, 1)
  assert(
    duplicates.find((r) => r.code !== 0).stderr.includes('DUPLICATE_RESPONSE'),
  )
  assert.equal(
    sql(
      "select count(*) from public.responses where anonymous_token=test_support.id('race-token')::text",
    ),
    '1',
  )
  assert.equal(sql('select count(*) from public.answers'), '2')
  console.log(
    'PASS: concurrent duplicate requests store exactly one complete response',
  )

  const releaseClose = await holder(
    "begin; set local role authenticated; select set_config('request.jwt.claim.sub',test_support.id('instructor')::text,true); select public.close_survey(test_support.id('a'))",
  )
  const afterClose = asyncSql(
    "set application_name='test_after_close';" +
      student(submit('a', 'after-close')),
  )
  try {
    await waitForLock('test_after_close')
  } finally {
    await releaseClose()
  }
  const closedResult = await afterClose
  assert.notEqual(closedResult.code, 0)
  assert(closedResult.stderr.includes('SURVEY_NOT_ACTIVE'))
  assert.equal(
    sql(
      "select count(*) from public.responses where anonymous_token=test_support.id('after-close')::text",
    ),
    '0',
  )
  console.log(
    'PASS: a submission waiting behind close fails without inserting data',
  )

  sql(instructor("select public.activate_survey(test_support.id('b'))"))
  const releaseSubmit = await holder(
    'begin; set local role anon;' + submit('b', 'before-close'),
  )
  const pendingClose = asyncSql(
    "set application_name='test_close_waiter';" +
      instructor("select public.close_survey(test_support.id('b'))"),
  )
  try {
    await waitForLock('test_close_waiter')
  } finally {
    await releaseSubmit()
  }
  assert.equal((await pendingClose).code, 0)
  assert.equal(
    sql("select status from public.surveys where id=test_support.id('b')"),
    'closed',
  )
  assert.equal(
    sql(
      "select count(*) from public.responses where anonymous_token=test_support.id('before-close')::text",
    ),
    '1',
  )
  console.log('PASS: close waits for an accepted submission to commit')

  sql(
    "insert into public.questions(id,survey_id,question_text,question_type,position) values(test_support.id('empty-q'),test_support.id('empty'),'Concurrent activation','multiple_choice',1); insert into public.choices(id,question_id,choice_text,position) select test_support.id('empty-c'||i),test_support.id('empty-q'),'Choice '||i,i from generate_series(1,2) i",
  )
  sql(
    "insert into public.choices(question_id,choice_text,position) values(test_support.id('bad_mc-q'),'Second choice',2)",
  )
  const releaseEdit = await holder(
    "begin; set local role authenticated; select set_config('request.jwt.claim.sub',test_support.id('instructor')::text,true); update public.questions set question_text='Committed draft edit' where id=test_support.id('bad_mc-q')",
  )
  const pendingActivation = asyncSql(
    "set application_name='test_activate_waiter';" +
      instructor("select public.activate_survey(test_support.id('bad_mc'))"),
  )
  try {
    await waitForLock('test_activate_waiter')
  } finally {
    await releaseEdit()
  }
  assert.equal((await pendingActivation).code, 0)
  assert.equal(
    sql(
      "select question_text from public.questions where id=test_support.id('bad_mc-q')",
    ),
    'Committed draft edit',
  )
  const lateEdit = await asyncSql(
    instructor(
      "update public.questions set question_text='Late edit' where id=test_support.id('bad_mc-q')",
    ),
  )
  assert.notEqual(lateEdit.code, 0)
  assert(lateEdit.stderr.includes('DRAFT_ONLY_EDITING'))
  console.log(
    'PASS: activation waits for draft edits and rejects later content changes',
  )

  const activations = await Promise.all(
    ['e', 'empty'].map((name) =>
      asyncSql(
        instructor(`select public.activate_survey(test_support.id('${name}'))`),
      ),
    ),
  )
  assert(
    activations.every((r) => r.code === 0),
    JSON.stringify(activations),
  )
  assert.equal(
    sql("select count(*) from public.surveys where status='active'"),
    '1',
  )
  assert.equal(
    sql(
      "select count(*) from public.surveys where id in (test_support.id('e'),test_support.id('empty')) and status in ('active','closed')",
    ),
    '2',
  )
  console.log(
    'PASS: concurrent activations both complete and leave exactly one active survey',
  )
  console.log(
    'All local database checks passed. No Supabase project was contacted.',
  )
} finally {
  if (started) command(['rm', '--force', container])
}
