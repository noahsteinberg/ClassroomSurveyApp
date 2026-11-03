import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const origin = 'https://classroomsurveyapp.pages.dev'
const summary = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    samples_ms: samples.map((n) => Math.round(n)),
    mean_ms: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
    p95_ms: Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1]),
    max_ms: Math.round(sorted.at(-1)),
  }
}

export async function runPerformanceChecks({ config, token, session }) {
  const id = randomUUID()
  const label = `Synthetic capacity ${randomUUID()}`
  const questions = ['multiple_choice', 'true_false'].map((type, index) => ({
    id: randomUUID(),
    question_text: `Synthetic question ${index + 1}`,
    question_type: type,
    choices: (type === 'true_false'
      ? ['True', 'False']
      : ['First', 'Second']
    ).map((choice_text) => ({ id: randomUUID(), choice_text })),
  }))
  const report = {
    date: new Date().toISOString(),
    origin,
    project_ref: 'hmrtffcpoyksnwdquyow',
    fixture_survey_id: id,
    synthetic_only: true,
    capacity: null,
    page_load: [],
    environment: {
      platform: process.platform,
      node: process.version,
      cpu_throttling: 'none',
      network:
        'Actual laptop internet; unthrottled, connection type not inferred',
      viewport: '1280x800 desktop',
      browser: null,
    },
    limitations: [
      '200 overlapping anonymous API submissions, not 200 full browser instances or physical devices',
      'Single laptop/network and one two-question test survey on the existing free project',
      'Cold browser contexts isolate HTTP cache/storage, but DNS/TLS/OS and Cloudflare edge caches may remain warm',
      'Desktop unthrottled timings do not establish every mobile/network condition',
    ],
    cleanup: { passed: false },
    failures: [],
  }
  let created = false,
    browser,
    responseIds = [],
    before
  const request = async (
    path,
    { instructor = false, method = 'GET', body } = {},
  ) => {
    const headers = {
      apikey: config.key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
    if (instructor) headers.Authorization = `Bearer ${token}`
    const response = await fetch(config.url + '/rest/v1/' + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    const data = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, data }
  }
  const requireOk = (response) => {
    if (!response.ok)
      throw new Error(
        `API HTTP ${response.status}: ${response.data?.code ?? 'unknown'} ${response.data?.message ?? ''}`,
      )
    return response.data
  }
  const rpc = async (name, body, instructor = false) =>
    requireOk(
      await request('rpc/' + name, { method: 'POST', body, instructor }),
    )
  const snapshot = async () =>
    requireOk(
      await request(
        `surveys?select=id,status,updated_at&id=neq.${id}&order=id`,
        { instructor: true },
      ),
    )
  const fingerprint = (value) =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const answerRows = async (ids) => {
    const answers = []
    for (let start = 0; start < ids.length; start += 50) {
      answers.push(
        ...requireOk(
          await request(
            `answers?select=id,response_id,question_id,choice_id&response_id=in.(${ids.slice(start, start + 50).join(',')})`,
            { instructor: true },
          ),
        ),
      )
    }
    return answers
  }
  try {
    before = await snapshot()
    assert(
      !before.some((s) => s.status === 'active'),
      'An existing active survey would be disrupted; stop before creating fixtures',
    )
    await rpc(
      'save_draft_survey',
      {
        p_survey_id: id,
        p_expected_updated_at: null,
        p_request_id: randomUUID(),
        p_title: label,
        p_description: 'Disposable synthetic performance fixture',
        p_questions: questions,
      },
      true,
    )
    created = true
    assert(
      !(await snapshot()).some((s) => s.status === 'active'),
      'An active survey appeared; do not activate the fixture',
    )
    const active = await rpc('activate_survey', { p_survey_id: id }, true)
    assert(active.public_slug, 'Activation must return the public slug')
    const payload = questions.map((q) => ({
      question_id: q.id,
      choice_id: q.choices[0].id,
    }))
    const tokens = Array.from({ length: 200 }, () => randomUUID())
    let release,
      inFlight = 0,
      peak = 0
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const starts = []
    const jobs = tokens.map(async (anonymousToken) => {
      await gate
      const started = performance.now()
      starts.push(started)
      peak = Math.max(peak, ++inFlight)
      try {
        const result = await request('rpc/submit_survey_response', {
          method: 'POST',
          body: {
            p_survey_id: id,
            p_anonymous_token: anonymousToken,
            p_answers: payload,
          },
        })
        return {
          ok: result.ok && result.data?.success === true,
          status: result.status,
          code: result.data?.code ?? null,
          ms: performance.now() - started,
        }
      } catch (error) {
        return {
          ok: false,
          status: 0,
          code: error.name,
          ms: performance.now() - started,
        }
      } finally {
        inFlight--
      }
    })
    const wallStart = performance.now()
    release()
    const outcomes = await Promise.all(jobs)
    const responses = requireOk(
      await request(`responses?select=id,anonymous_token&survey_id=eq.${id}`, {
        instructor: true,
      }),
    )
    responseIds = responses.map((r) => r.id)
    const answers = await answerRows(responseIds)
    const complete = responses.every((r) => {
      const rows = answers.filter((a) => a.response_id === r.id)
      return (
        rows.length === 2 &&
        questions.every((q) =>
          rows.some(
            (a) => a.question_id === q.id && a.choice_id === q.choices[0].id,
          ),
        )
      )
    })
    report.capacity = {
      clients: 200,
      peak_requests_in_flight: peak,
      release_spread_ms: Math.round(Math.max(...starts) - Math.min(...starts)),
      elapsed_ms: Math.round(performance.now() - wallStart),
      success: outcomes.filter((r) => r.ok).length,
      failures: outcomes
        .filter((r) => !r.ok)
        .map(({ status, code }) => ({ status, code })),
      latency: summary(outcomes.map((r) => r.ms)),
      durable_responses: responses.length,
      durable_answers: answers.length,
      unique_tokens: new Set(responses.map((r) => r.anonymous_token)).size,
      complete_membership_correct: complete,
      resource_observations:
        'HTTP outcomes and durable rows measured; no direct CPU/memory/quota telemetry available',
    }
    report.capacity.passed =
      outcomes.every((r) => r.ok) &&
      responses.length === 200 &&
      answers.length === 400 &&
      complete &&
      peak === 200 &&
      report.capacity.unique_tokens === 200
    console.log(
      `Capacity: ${report.capacity.success}/200 API successes, ${responses.length} responses/${answers.length} answers, p95 ${report.capacity.latency.p95_ms}ms, peak ${peak}`,
    )

    browser = await chromium.launch({ channel: 'chrome', headless: true })
    report.environment.browser = await browser.version()
    const storageKey = 'sb-hmrtffcpoyksnwdquyow-auth-token'
    async function context(authenticated) {
      const result = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      })
      if (authenticated)
        await result.addInitScript(
          ({ key, value, site }) => {
            if (globalThis.location.origin === site)
              localStorage.setItem(key, JSON.stringify(value))
          },
          { key: storageKey, value: session, site: origin },
        )
      return result
    }
    const routes = [
      { name: 'student', path: `/s/${active.public_slug}`, auth: false },
      { name: 'dashboard', path: '/dashboard', auth: true },
      { name: 'results', path: `/surveys/${id}/results`, auth: true },
    ]
    async function navigate(page, route) {
      const response = await page.goto(origin + route.path, {
        waitUntil: 'commit',
        timeout: 30000,
      })
      assert.equal(response.status(), 200)
      if (route.name === 'student') {
        await page.getByRole('heading', { name: label, exact: true }).waitFor()
        await page.getByRole('radio').first().waitFor()
        await page
          .getByRole('button', { name: 'Submit', exact: true })
          .waitFor()
      } else if (route.name === 'dashboard') {
        await page.getByRole('list', { name: 'Surveys', exact: true }).waitFor()
        await page.getByRole('heading', { name: label, exact: true }).waitFor()
      } else {
        await page.getByText('200 responses', { exact: true }).waitFor()
        await page.getByRole('table').first().waitFor()
      }
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            globalThis.requestAnimationFrame(() =>
              globalThis.requestAnimationFrame(resolve),
            ),
          ),
      )
      return page.evaluate(() => performance.now())
    }
    for (const route of routes) {
      const cold = [],
        warm = []
      for (let i = 0; i < 10; i++) {
        const fresh = await context(route.auth)
        try {
          cold.push(await navigate(await fresh.newPage(), route))
        } finally {
          await fresh.close()
        }
      }
      const cached = await context(route.auth)
      try {
        const page = await cached.newPage()
        await navigate(page, route)
        for (let i = 0; i < 10; i++) warm.push(await navigate(page, route))
      } finally {
        await cached.close()
      }
      const measurement = {
        route: route.name,
        cold: summary(cold),
        warm: summary(warm),
        cold_mean_under_2000ms:
          cold.reduce((a, b) => a + b, 0) / cold.length < 2000,
      }
      measurement.warm_mean_under_2000ms =
        warm.reduce((a, b) => a + b, 0) / warm.length < 2000
      report.page_load.push(measurement)
      console.log(
        `Page ${route.name}: cold mean ${measurement.cold.mean_ms}ms/p95 ${measurement.cold.p95_ms}ms; warm mean ${measurement.warm.mean_ms}ms`,
      )
    }
  } catch (error) {
    report.failures.push(error.message)
    console.log('Performance check stopped:', error.message)
  } finally {
    await browser?.close()
    if (created) {
      try {
        const owned = requireOk(
          await request(`surveys?select=id,title,status&id=eq.${id}`, {
            instructor: true,
          }),
        )
        assert(
          owned.length === 1 && owned[0].title === label,
          'Fixture ownership changed; do not delete unrelated data',
        )
        if (owned[0].status === 'active')
          await rpc('close_survey', { p_survey_id: id }, true)
        const removed = requireOk(
          await request(
            `surveys?id=eq.${id}&title=eq.${encodeURIComponent(label)}`,
            { instructor: true, method: 'DELETE' },
          ),
        )
        assert.equal(removed.length, 1)
        for (const [table, field] of [
          ['surveys', 'id'],
          ['questions', 'survey_id'],
          ['responses', 'survey_id'],
        ]) {
          assert.equal(
            requireOk(
              await request(`${table}?select=id&${field}=eq.${id}`, {
                instructor: true,
              }),
            ).length,
            0,
          )
        }
        assert.equal((await answerRows(responseIds)).length, 0)
        const choiceIds = questions.flatMap((q) => q.choices.map((c) => c.id))
        assert.equal(
          requireOk(
            await request(`choices?select=id&id=in.(${choiceIds.join(',')})`, {
              instructor: true,
            }),
          ).length,
          0,
        )
        report.cleanup = {
          passed: true,
          owned_fixture_removed: true,
          dependent_content_responses_answers_removed: true,
          other_survey_metadata_unchanged:
            fingerprint(before) === fingerprint(await snapshot()),
        }
        console.log(
          'Synthetic fixture cleanup passed; unrelated survey metadata unchanged:',
          report.cleanup.other_survey_metadata_unchanged,
        )
      } catch (error) {
        report.cleanup = { passed: false, error: error.message }
        console.log('Cleanup needs attention:', error.message)
      }
    }
    report.page_load_target_met =
      report.page_load.length === 3 &&
      report.page_load.every(
        (value) => value.cold_mean_under_2000ms && value.warm_mean_under_2000ms,
      )
    writeFileSync(
      new URL('../tests/deployment/phase15-performance.json', import.meta.url),
      JSON.stringify(report, null, 2) + '\n',
    )
  }
}
