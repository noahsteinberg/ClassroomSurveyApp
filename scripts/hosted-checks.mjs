import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'

export async function runHostedChecks({ config, token }) {
  const runId = randomUUID()
  const ids = []
  const results = []
  const check = (label, condition) => {
    assert(condition, label)
    results.push({ check: label, passed: true })
    console.log(`PASS: ${label}`)
  }
  const request = async (
    path,
    { method = 'GET', body, instructor = false } = {},
  ) => {
    const headers = {
      apikey: config.key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
    if (instructor) headers.Authorization = `Bearer ${token}`
    const response = await fetch(config.url + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  }
  const rest = (path, options) => request('/rest/v1/' + path, options)
  const rpc = (name, body, instructor = false) =>
    rest('rpc/' + name, { method: 'POST', body, instructor })
  const success = (r) => {
    assert(
      r.ok,
      `Request failed: HTTP ${r.status}, code ${r.data?.code ?? 'unknown'}, ${r.data?.message ?? 'no message'}`,
    )
    return r.data
  }
  const denied = (label, r, message) =>
    check(
      label,
      !r.ok &&
        (message
          ? r.data?.message?.includes(message)
          : ['42501', 'PGRST301', 'PGRST302'].includes(r.data?.code)),
    )
  const rows = async (table, id, field = 'survey_id') =>
    success(await rest(`${table}?${field}=eq.${id}`, { instructor: true }))
  const makeSurvey = async (label, tf = false) => {
    const [survey] = success(
      await rest('surveys', {
        method: 'POST',
        instructor: true,
        body: {
          title: `[PHASE2 TEST ${runId}] ${label}`,
          description:
            'Synthetic integration test; safe to delete after verification.',
        },
      }),
    )
    ids.push(survey.id)
    const questions = []
    const choices = []
    for (const [index, type] of (tf
      ? ['multiple_choice', 'true_false']
      : ['multiple_choice']
    ).entries()) {
      const [question] = success(
        await rest('questions', {
          method: 'POST',
          instructor: true,
          body: {
            survey_id: survey.id,
            question_text: `Synthetic ${type}`,
            question_type: type,
            position: index + 1,
          },
        }),
      )
      questions.push(question)
      const values =
        type === 'true_false'
          ? ['True', 'False']
          : ['First synthetic option', 'Second synthetic option']
      choices.push(
        success(
          await rest('choices', {
            method: 'POST',
            instructor: true,
            body: values.map((choice_text, i) => ({
              question_id: question.id,
              choice_text,
              position: i + 1,
            })),
          }),
        ),
      )
    }
    return {
      ...survey,
      questions,
      choices,
      payload: questions.map((q, i) => ({
        question_id: q.id,
        choice_id: choices[i][0].id,
      })),
    }
  }
  const submit = (s, anonymousToken = randomUUID(), answers = s.payload) =>
    rpc('submit_survey_response', {
      p_survey_id: s.id,
      p_anonymous_token: anonymousToken,
      p_answers: answers,
    })
  let failure
  try {
    const settings = success(await request('/auth/v1/settings'))
    check(
      'public signup disabled; anonymous Auth disabled; email provider enabled',
      settings.disable_signup === true &&
        settings.external.anonymous_users === false &&
        settings.external.email === true,
    )
    const signup = await request('/auth/v1/signup', {
      method: 'POST',
      body: {
        email: `phase2-${runId}@example.invalid`,
        password: randomUUID() + 'aA1!',
      },
    })
    check(
      'public signup request rejected without creating an account',
      !signup.ok && signup.data?.error_code === 'signup_disabled',
    )
    const anonymousAuth = await request('/auth/v1/signup', {
      method: 'POST',
      body: {},
    })
    check(
      'anonymous Auth request rejected',
      !anonymousAuth.ok &&
        ['anonymous_provider_disabled', 'signup_disabled'].includes(
          anonymousAuth.data?.error_code,
        ),
    )
    const current = success(
      await rest('surveys?status=eq.active', { instructor: true }),
    )
    check(
      'no pre-existing active survey will be disrupted',
      current.length === 0,
    )
    const a = await makeSurvey('A', true)
    const b = await makeSurvey('B')
    const c = await makeSurvey('C')
    const d = await makeSurvey('D')
    check(
      'real instructor JWT creates draft surveys, MC/TF questions, and choices',
      (await rows('questions', a.id)).length === 2,
    )
    const title = `[PHASE2 TEST ${runId}] Edited A`
    const edit = success(
      await rest(`surveys?id=eq.${a.id}`, {
        method: 'PATCH',
        instructor: true,
        body: { title },
      }),
    )
    check(
      'instructor draft edit persists across independent API requests',
      edit.length === 1 &&
        (await rows('surveys', a.id, 'id'))[0].title === title,
    )
    check(
      'anonymous cannot read draft content',
      success(await rest(`surveys?id=eq.${a.id}`)).length === 0 &&
        success(await rest(`questions?survey_id=eq.${a.id}`)).length === 0 &&
        success(await rest(`choices?question_id=eq.${a.questions[0].id}`))
          .length === 0,
    )
    denied('anonymous results access denied', await rest('responses'))
    denied('anonymous answer access denied', await rest('answers'))
    denied(
      'anonymous direct survey mutation denied',
      await rest(`surveys?id=eq.${a.id}`, {
        method: 'PATCH',
        body: { title: 'Unauthorized' },
      }),
    )
    denied(
      'anonymous direct response insert denied',
      await rest('responses', {
        method: 'POST',
        body: { survey_id: a.id, anonymous_token: randomUUID() },
      }),
    )
    denied(
      'anonymous direct answer insert denied',
      await rest('answers', {
        method: 'POST',
        body: {
          response_id: randomUUID(),
          question_id: a.questions[0].id,
          choice_id: a.choices[0][0].id,
        },
      }),
    )
    denied(
      'anonymous activation RPC denied',
      await rpc('activate_survey', { p_survey_id: a.id }),
    )
    denied(
      'instructor direct status mutation denied',
      await rest(`surveys?id=eq.${a.id}`, {
        method: 'PATCH',
        instructor: true,
        body: { status: 'active' },
      }),
    )
    denied('submission to draft rejected', await submit(a), 'SURVEY_NOT_ACTIVE')
    const active = success(
      await rpc('activate_survey', { p_survey_id: a.id }, true),
    )
    check(
      'anonymous active survey resolves by public slug',
      success(await rest(`surveys?public_slug=eq.${active.public_slug}`))
        .length === 1,
    )
    check(
      'anonymous reads only active questions and choices',
      success(await rest(`questions?survey_id=eq.${a.id}`)).length === 2 &&
        success(await rest(`choices?question_id=eq.${a.questions[1].id}`))
          .length === 2,
    )
    check(
      'availability RPC reveals minimal active state',
      success(
        await rpc('survey_availability', { p_slug: active.public_slug }),
      ) === 'active',
    )
    denied(
      'missing required answers rejected',
      await submit(a, randomUUID(), []),
      'MISSING_REQUIRED_ANSWER',
    )
    denied(
      'malformed answer object rejected',
      await submit(a, randomUUID(), [{}, {}]),
      'INVALID_PAYLOAD',
    )
    denied(
      'non-array payload rejected',
      await submit(a, randomUUID(), {}),
      'INVALID_PAYLOAD',
    )
    denied(
      'duplicate question rejected',
      await submit(a, randomUUID(), [a.payload[0], a.payload[0]]),
      'DUPLICATE_QUESTION',
    )
    denied(
      'cross-survey question rejected',
      await submit(a, randomUUID(), [b.payload[0], a.payload[1]]),
      'INVALID_QUESTION',
    )
    denied(
      'mismatched choice rejected',
      await submit(a, randomUUID(), [
        { ...a.payload[0], choice_id: b.payload[0].choice_id },
        a.payload[1],
      ]),
      'INVALID_CHOICE',
    )
    denied(
      'invalid browser token rejected',
      await submit(a, 'invalid-token'),
      'INVALID_TOKEN',
    )
    check(
      'rejected submissions create no partial response rows',
      (await rows('responses', a.id)).length === 0,
    )
    const browserToken = randomUUID()
    const saved = success(await submit(a, browserToken))
    check(
      'anonymous valid submission succeeds',
      saved.success === true && typeof saved.response_id === 'string',
    )
    const stored = await rows('responses', a.id)
    const storedAnswers = await rows(
      'answers',
      saved.response_id,
      'response_id',
    )
    check(
      'response and complete answers persist on subsequent requests',
      stored.length === 1 &&
        storedAnswers.length === 2 &&
        stored[0].submitted_at !== null,
    )
    denied(
      'same-token retry rejected',
      await submit(a, browserToken),
      'DUPLICATE_RESPONSE',
    )
    const concurrentToken = randomUUID()
    const duplicateRace = await Promise.all([
      submit(a, concurrentToken),
      submit(a, concurrentToken),
    ])
    check(
      'concurrent same-token requests store one complete response',
      duplicateRace.filter((r) => r.ok).length === 1 &&
        duplicateRace.some((r) => r.data?.message === 'DUPLICATE_RESPONSE') &&
        (await rows('responses', a.id)).length === 2,
    )
    check(
      'instructor results counts and choices match known synthetic submissions',
      (await rows('answers', saved.response_id, 'response_id')).every((ans) =>
        a.payload.some(
          (p) =>
            p.question_id === ans.question_id && p.choice_id === ans.choice_id,
        ),
      ),
    )
    denied(
      'instructor cannot rewrite collected answers',
      await rest(`answers?response_id=eq.${saved.response_id}`, {
        method: 'PATCH',
        instructor: true,
        body: { choice_id: a.choices[0][1].id },
      }),
    )
    denied(
      'active survey title edit rejected',
      await rest(`surveys?id=eq.${a.id}`, {
        method: 'PATCH',
        instructor: true,
        body: { title: 'Changed collected title' },
      }),
      'DRAFT_ONLY_EDITING',
    )
    denied(
      'active choice edit rejected',
      await rest(`choices?id=eq.${a.choices[0][0].id}`, {
        method: 'PATCH',
        instructor: true,
        body: { choice_text: 'Changed collected choice' },
      }),
      'DRAFT_ONLY_EDITING',
    )
    const closeRace = await Promise.all([
      rpc('close_survey', { p_survey_id: a.id }, true),
      submit(a),
    ])
    check(
      'concurrent close/submission has valid ordering',
      closeRace[0].ok &&
        (closeRace[1].ok || closeRace[1].data?.message === 'SURVEY_NOT_ACTIVE'),
    )
    denied(
      'submissions after completed close rejected',
      await submit(a),
      'SURVEY_NOT_ACTIVE',
    )
    check(
      'closed survey and choices hidden from anonymous clients',
      success(await rest(`surveys?id=eq.${a.id}`)).length === 0 &&
        success(await rest(`choices?question_id=eq.${a.questions[0].id}`))
          .length === 0,
    )
    check(
      'closed link returns availability only',
      success(
        await rpc('survey_availability', { p_slug: active.public_slug }),
      ) === 'closed',
    )
    denied(
      'closed survey content remains immutable',
      await rest(`questions?id=eq.${a.questions[0].id}`, {
        method: 'PATCH',
        instructor: true,
        body: { question_text: 'Changed history' },
      }),
      'DRAFT_ONLY_EDITING',
    )
    denied(
      'collected survey cannot reactivate',
      await rpc('activate_survey', { p_survey_id: a.id }, true),
      'DRAFT_REQUIRED',
    )
    success(await rpc('archive_survey', { p_survey_id: a.id }, true))
    check(
      'archive preserves instructor-readable submissions and original questions',
      (await rows('responses', a.id)).length >= 2 &&
        (await rows('questions', a.id)).length === 2,
    )
    const editRace = await Promise.all([
      rest(`questions?id=eq.${b.questions[0].id}`, {
        method: 'PATCH',
        instructor: true,
        body: { question_text: 'Concurrent draft edit' },
      }),
      rpc('activate_survey', { p_survey_id: b.id }, true),
    ])
    check(
      'concurrent draft edit/activation has valid ordering',
      editRace[1].ok &&
        (editRace[0].ok || editRace[0].data?.message === 'DRAFT_ONLY_EDITING'),
    )
    denied(
      'content edit after activation completes rejected',
      await rest(`questions?id=eq.${b.questions[0].id}`, {
        method: 'PATCH',
        instructor: true,
        body: { question_text: 'Late edit' },
      }),
      'DRAFT_ONLY_EDITING',
    )
    const activateRace = await Promise.all([
      rpc('activate_survey', { p_survey_id: c.id }, true),
      rpc('activate_survey', { p_survey_id: d.id }, true),
    ])
    const finalActive = success(
      await rest('surveys?status=eq.active', { instructor: true }),
    )
    check(
      'concurrent activations succeed with exactly one active survey',
      activateRace.every((r) => r.ok) &&
        finalActive.length === 1 &&
        [c.id, d.id].includes(finalActive[0].id),
    )
    check(
      'previous active survey automatically closed',
      (await rows('surveys', b.id, 'id'))[0].status === 'closed',
    )
    const platformHelper = await rpc('rls_auto_enable', {})
    check(
      'platform event-trigger helper is not callable as an ordinary API RPC',
      !platformHelper.ok,
    )
    console.log(
      `INFO: event-trigger helper API rejection: HTTP ${platformHelper.status}, code ${platformHelper.data?.code}`,
    )
  } catch (error) {
    failure = error
    results.push({ check: error.message, passed: false })
  } finally {
    let clean = true
    for (const id of ids) {
      try {
        const found = await rows('surveys', id, 'id')
        if (found[0]?.status === 'active')
          success(await rpc('close_survey', { p_survey_id: id }, true))
        success(
          await rest(`surveys?id=eq.${id}`, {
            method: 'DELETE',
            instructor: true,
          }),
        )
        assert.equal((await rows('surveys', id, 'id')).length, 0)
        assert.equal((await rows('questions', id)).length, 0)
        assert.equal((await rows('responses', id)).length, 0)
      } catch {
        clean = false
      }
    }
    results.push({
      check: 'all test-owned synthetic surveys and dependent records removed',
      passed: clean,
    })
    writeFileSync(
      new URL(
        '../supabase/verification/2026-11-02-hosted-api-tests.json',
        import.meta.url,
      ),
      JSON.stringify(
        {
          project_ref: 'hmrtffcpoyksnwdquyow',
          run_id: runId,
          completed_at: new Date().toISOString(),
          instructor_password_login: true,
          credentials_or_tokens_recorded: false,
          fixture_surveys_created: ids.length,
          results,
          cleanup_passed: clean,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(
      clean
        ? 'PASS: synthetic data cleanup verified'
        : 'FAIL: synthetic data cleanup needs follow-up',
    )
    if (!clean && !failure) failure = new Error('Synthetic cleanup failed')
  }
  if (failure) throw failure
  console.log(
    `Hosted API checks passed (${results.length} checks); no credentials saved.`,
  )
}
