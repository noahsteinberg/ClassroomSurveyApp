import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mock, login } from './helpers'

const id = '00000000-0000-4000-8000-000000000100'
const slug = '00000000-0000-4000-8000-000000000101'
const q1 = '00000000-0000-4000-8000-000000000110'
const q2 = '00000000-0000-4000-8000-000000000120'
const survey = {
  id,
  title: 'Classroom concept check',
  description: 'Two quick questions',
  public_slug: slug,
  created_at: '2026-11-02T12:00:00Z',
  questions: [
    {
      id: q2,
      question_text: 'A base case stops recursion.',
      question_type: 'true_false',
      position: 2,
      choices: [
        { id: 'false', choice_text: 'False', position: 2 },
        { id: 'true', choice_text: 'True', position: 1 },
      ],
    },
    {
      id: q1,
      question_text: 'What does recursion need?',
      question_type: 'multiple_choice',
      position: 1,
      choices: [
        { id: 'loop', choice_text: 'A loop', position: 2 },
        { id: 'base', choice_text: 'A base case', position: 1 },
      ],
    },
  ],
}
async function api(
  page: Page,
  options: {
    status?: string
    activationError?: string
    lostResponse?: boolean
    submissionError?: string
    readError?: boolean
  } = {},
) {
  await mock(page, { empty: true })
  let status = options.status ?? 'active',
    count = 0,
    readError = options.readError ?? false,
    lost = options.lostResponse ?? false
  const seen = new Set<string>(),
    submissions: {
      token: string
      answers: unknown
      instructorAuth: boolean
    }[] = [],
    activations: string[] = []
  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname
    const json = (data: unknown, code = 200) =>
      route.fulfill({ status: code, json: data })
    if (path === '/rest/v1/surveys') {
      if (readError)
        return json(
          { code: 'TEST_READ', message: 'Synthetic read failure' },
          400,
        )
      if (url.searchParams.has('public_slug'))
        return json(
          url.searchParams.get('public_slug') === `eq.${slug}` &&
            status === 'active'
            ? { ...survey, status }
            : null,
        )
      if (url.searchParams.has('id')) return json({ ...survey, status })
      return json([{ ...survey, status }])
    }
    if (path === '/rest/v1/responses')
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Range': `*/${count}`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'content-range',
        },
        body: '',
      })
    const body = req.postDataJSON()
    if (path.endsWith('/activate_survey')) {
      activations.push(body.p_survey_id)
      if (options.activationError)
        return json({ code: 'P0001', message: options.activationError }, 400)
      status = 'active'
      return json({ id, status, public_slug: slug })
    }
    if (path.endsWith('/close_survey')) {
      status = 'closed'
      return json(null)
    }
    if (path.endsWith('/survey_availability'))
      return json(
        body.p_slug !== slug
          ? 'not_found'
          : status === 'active'
            ? 'active'
            : 'closed',
      )
    if (path.endsWith('/submit_survey_response')) {
      submissions.push({
        token: body.p_anonymous_token,
        answers: body.p_answers,
        instructorAuth: !!req
          .headers()
          .authorization?.includes('testsignature'),
      })
      if (status !== 'active')
        return json({ code: 'P0001', message: 'SURVEY_NOT_ACTIVE' }, 400)
      if (options.submissionError)
        return json({ code: 'P0001', message: options.submissionError }, 400)
      if (seen.has(body.p_anonymous_token))
        return json({ code: 'P0001', message: 'DUPLICATE_RESPONSE' }, 400)
      seen.add(body.p_anonymous_token)
      count++
      if (lost) {
        lost = false
        return json(
          { code: 'TEST_LOST', message: 'Synthetic uncertain response' },
          400,
        )
      }
      return json({ success: true, response_id: 'synthetic-response' })
    }
    return json({ code: 'TEST_UNEXPECTED' }, 400)
  })
  return {
    submissions,
    activations,
    setCount: (n: number) => {
      count = n
    },
    setStatus: (s: string) => {
      status = s
    },
    recover: () => {
      readError = false
    },
  }
}
async function answer(page: Page) {
  await page.getByRole('radio', { name: 'A base case', exact: true }).check()
  await page.getByRole('radio', { name: 'True', exact: true }).check()
}

test('activation confirms handoff then presents correct URL, PNG and count polling', async ({
  page,
}) => {
  const backend = await api(page, { status: 'draft' })
  await login(page)
  await page.getByRole('button', { name: 'Activate', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'currently active survey will close automatically',
  )
  await page
    .getByRole('button', { name: 'Activate survey', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/surveys/${id}/present$`))
  await expect(
    page.getByRole('img', { name: 'QR code linking to the student survey' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: `http://127.0.0.1:5174/s/${slug}`,
      exact: true,
    }),
  ).toHaveAttribute('href', `http://127.0.0.1:5174/s/${slug}`)
  await expect(page.getByText('Responses: 0', { exact: true })).toBeVisible()
  backend.setCount(3)
  await expect(page.getByText('Responses: 3', { exact: true })).toBeVisible({
    timeout: 8000,
  })
  const downloadPromise = page.waitForEvent('download')
  await page
    .getByRole('link', { name: 'Download QR Code', exact: true })
    .click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`survey-${id}-qr.png`)
  expect(backend.activations).toEqual([id])
  await page.getByRole('button', { name: 'Close Survey', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close survey', exact: true })
    .click()
  await expect(
    page.getByText(
      'This survey is not accepting responses. Its QR presentation is no longer active.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('img')).toHaveCount(0)
})

test('incomplete draft activation returns friendly validation without navigation', async ({
  page,
}) => {
  await api(page, {
    status: 'draft',
    activationError: 'MULTIPLE_CHOICE_REQUIRES_CHOICES',
  })
  await login(page)
  await page.getByRole('button', { name: 'Activate', exact: true }).click()
  await page
    .getByRole('button', { name: 'Activate survey', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('at least two choices')
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('anonymous mobile required-answer flow submits once and refresh shows duplicate', async ({
  page,
}) => {
  const backend = await api(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/s/${slug}`)
  await expect(page.getByRole('heading', { name: survey.title })).toBeVisible()
  await expect(page.getByText('Instructor login', { exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('answer every question')
  expect(backend.submissions).toHaveLength(0)
  await answer(page)
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Thank you!', exact: true }),
  ).toBeVisible()
  expect(backend.submissions).toHaveLength(1)
  expect(backend.submissions[0].instructorAuth).toBe(false)
  expect(backend.submissions[0].token).toMatch(/^[0-9a-f-]{36}$/)
  expect(backend.submissions[0].answers).toEqual([
    { question_id: q1, choice_id: 'base' },
    { question_id: q2, choice_id: 'true' },
  ])
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Already submitted', exact: true }),
  ).toBeVisible()
  expect(backend.submissions).toHaveLength(1)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('uncertain response preserves selections and same-token retry is rejected by server', async ({
  page,
}) => {
  const backend = await api(page, { lostResponse: true })
  await page.goto(`/s/${slug}`)
  await answer(page)
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to confirm')
  await expect(
    page.getByRole('radio', { name: 'True', exact: true }),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Already submitted', exact: true }),
  ).toBeVisible()
  expect(backend.submissions).toHaveLength(2)
  expect(backend.submissions[0].token).toBe(backend.submissions[1].token)
})

test('closing before submit rejects response; closed and missing links have clear states', async ({
  page,
}) => {
  const backend = await api(page)
  await page.goto(`/s/${slug}`)
  await answer(page)
  backend.setStatus('closed')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Survey closed', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Survey closed', exact: true }),
  ).toBeVisible()
  await page.goto('/s/not-a-survey')
  await expect(
    page.getByRole('heading', { name: 'Survey not found.', exact: true }),
  ).toBeVisible()
})

test('blocked storage prevents submission and network read error can retry', async ({
  page,
}) => {
  const backend = await api(page, { readError: true })
  await page.goto(`/s/${slug}`)
  await expect(
    page.getByRole('heading', { name: 'Unable to load survey', exact: true }),
  ).toBeVisible()
  backend.recover()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: survey.title })).toBeVisible()
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value() {
        throw new Error('blocked test storage')
      },
    })
  })
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Browser storage is unavailable',
  )
  await expect(
    page.getByRole('button', { name: 'Submit', exact: true }),
  ).toBeDisabled()
  expect(backend.submissions).toHaveLength(0)
})

test('student page remains anonymous when instructor is signed in; presentation is protected', async ({
  page,
}) => {
  const backend = await api(page)
  await page.goto(`/surveys/${id}/present`)
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await page.goto(`/s/${slug}`)
  await answer(page)
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Thank you!', exact: true }),
  ).toBeVisible()
  expect(backend.submissions[0].instructorAuth).toBe(false)
})
