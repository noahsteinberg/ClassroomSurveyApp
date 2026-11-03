import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mock, login } from './helpers'
import { resultsCsv, csvCell } from '../../src/lib/csv'
import { questionResults } from '../../src/lib/result-summary'
import type { ResultData } from '../../src/lib/results'

test.use({ timezoneId: 'America/New_York' })
const id = '00000000-0000-4000-8000-000000000200'
function dataset(total = 3, questionCount = 2): ResultData {
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    id: `q${i + 1}`,
    question_text: `Question ${i + 1}, "quoted"?`,
    question_type: 'multiple_choice',
    position: i + 1,
  }))
  const choices = questions.flatMap((q) => [
    {
      id: q.id + 'a',
      question_id: q.id,
      choice_text: 'Alpha, "quoted"',
      position: 1,
    },
    {
      id: q.id + 'b',
      question_id: q.id,
      choice_text: 'Beta\nline',
      position: 2,
    },
  ])
  const responses = Array.from({ length: total }, (_, i) => ({
    id: `response-${String(i).padStart(5, '0')}`,
    submitted_at: '2026-11-02T15:00:00Z',
  }))
  const answers = responses.flatMap((r, i) =>
    questions
      .filter((_, qi) => total !== 3 || qi !== 1 || i !== 2)
      .map((q, qi) => ({
        id: r.id + '-' + q.id,
        response_id: r.id,
        question_id: q.id,
        choice_id: q.id + (total === 3 && i === 2 && qi === 0 ? 'b' : 'a'),
      })),
  )
  return {
    survey: {
      id,
      title: '=Synthetic survey',
      description: 'Unicode café, "quoted"\nsecond line',
      status: 'closed',
      created_at: '2026-11-02T02:30:00Z',
      updated_at: '2026-11-02T02:30:00Z',
    },
    questions,
    choices,
    responses,
    answers,
    loadedAt: '2026-11-02T18:00:00Z',
  }
}
async function resultsApi(page: Page, initial = dataset(), failure = false) {
  await mock(page)
  let data = initial,
    fail = failure
  const responseOffsets: number[] = [],
    answerOffsets: number[] = []
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url()),
      table = url.pathname.split('/').pop()
    if (table === 'surveys')
      return route.fulfill({
        json: url.searchParams.has('id')
          ? data.survey
          : [
              data.survey,
              {
                ...data.survey,
                id: 'newer',
                title: 'Newer survey',
                status: 'archived',
                created_at: '2026-11-02T15:00:00Z',
              },
            ],
      })
    if (fail)
      return route.fulfill({
        status: 400,
        json: { code: 'TEST_LOAD', message: 'Synthetic page failure' },
      })
    const from = Number(url.searchParams.get('offset') ?? 0),
      limit = Number(url.searchParams.get('limit') ?? 500)
    let rows: unknown[] = []
    if (table === 'questions') rows = data.questions
    if (table === 'responses') {
      rows = data.responses
      responseOffsets.push(from)
    }
    const parseIn = (name: string) =>
      (url.searchParams.get(name) ?? '')
        .replace(/^in\.\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map((x) => x.replace(/^"|"$/g, ''))
    if (table === 'choices') {
      const ids = parseIn('question_id')
      rows = data.choices.filter((c) => ids.includes(c.question_id))
    }
    if (table === 'answers') {
      const ids = parseIn('response_id')
      rows = data.answers.filter((a) => ids.includes(a.response_id))
      answerOffsets.push(from)
    }
    return route.fulfill({ json: rows.slice(from, from + limit) })
  })
  return {
    responseOffsets,
    answerOffsets,
    setData: (value: ResultData) => {
      data = value
    },
    setFailure: (value: boolean) => {
      fail = value
    },
  }
}

test('known counts, percentages, unanswered and refresh; closed/archived results remain readable', async ({
  page,
}) => {
  const api = await resultsApi(page)
  await login(page)
  await page
    .getByRole('link', { name: 'View Results', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Refresh Results', exact: true }),
  ).toBeVisible({ timeout: 12000 })
  await expect(page.getByText('3 responses', { exact: true })).toBeVisible()
  const first = page.getByRole('region').filter({
    has: page.getByRole('heading', { name: '1. Question 1, "quoted"?' }),
  })
  await expect(first.getByRole('table')).toContainText('66.7%')
  await expect(first.getByRole('table')).toContainText('33.3%')
  await expect(page.getByText('Unanswered: 1', { exact: true })).toBeVisible()
  await expect(page.locator('.recharts-bar')).toHaveCount(2)
  api.setData({
    ...dataset(4),
    survey: { ...dataset().survey, status: 'archived' },
  })
  await page
    .getByRole('button', { name: 'Refresh Results', exact: true })
    .click()
  await expect(page.getByText('4 responses', { exact: true })).toBeVisible()
  await expect(page.getByText(/Status: Archived/)).toBeVisible()
})

test('zero responses export headers; partial load failure disables CSV until successful refresh', async ({
  page,
}) => {
  const api = await resultsApi(page, dataset(0), true)
  await login(page)
  await page.goto(`/surveys/${id}/results`)
  await expect(
    page.getByRole('button', { name: 'Refresh Results', exact: true }),
  ).toBeVisible({ timeout: 12000 })
  await expect(page.getByRole('alert')).toContainText(
    'Unable to load complete results',
  )
  await expect(
    page.getByRole('button', { name: 'Export CSV', exact: true }),
  ).toBeDisabled()
  api.setFailure(false)
  await page
    .getByRole('button', { name: 'Refresh Results', exact: true })
    .click()
  await expect(page.getByText('0 responses', { exact: true })).toBeVisible()
  await expect(
    page.getByText('No responses yet.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('0.0%', { exact: true }).first()).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const stream = await (await downloaded).createReadStream()
  let text = ''
  for await (const chunk of stream!) text += chunk.toString('utf8')
  expect(text).toContain('survey_title')
  expect(text).not.toContain('response-00000')
  expect(text.startsWith('\uFEFF')).toBe(true)
})

test('pagination beyond 1000 responses includes complete answer pages', async ({
  page,
}) => {
  const api = await resultsApi(page, dataset(1205, 6))
  await login(page)
  await page.goto(`/surveys/${id}/results`)
  await expect(
    page.getByRole('button', { name: 'Refresh Results', exact: true }),
  ).toBeVisible({ timeout: 12000 })
  await expect(page.getByText('1205 responses', { exact: true })).toBeVisible({
    timeout: 12000,
  })
  expect(api.responseOffsets).toEqual([0, 500, 1000])
  expect(api.answerOffsets).toContain(500)
  await expect(
    page.getByRole('cell', { name: '1205', exact: true }).first(),
  ).toBeVisible()
})

test('history creation-date filters are inclusive local dates and combine with title/status', async ({
  page,
}) => {
  await resultsApi(page)
  await login(page)
  await page.getByLabel('Created on or after').fill('2026-11-01')
  await page.getByLabel('Created on or before').fill('2026-11-01')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: '=Synthetic survey', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Search by title').fill('SYNTHETIC')
  await page.getByLabel('Status', { exact: true }).selectOption('closed')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByLabel('Created on or after').fill('2026-11-03')
  await expect(page.getByRole('alert')).toContainText('start date')
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('CSV download matches displayed response set and excludes anonymous browser tokens', async ({
  page,
}) => {
  await resultsApi(page)
  await login(page)
  await page.goto(`/surveys/${id}/results`)
  await expect(
    page.getByRole('button', { name: 'Refresh Results', exact: true }),
  ).toBeVisible({ timeout: 12000 })
  await expect(page.getByText('3 responses', { exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const download = await downloaded
  expect(download.suggestedFilename()).toBe(`survey-${id}-results.csv`)
  let text = ''
  const stream = await download.createReadStream()
  for await (const chunk of stream!) text += chunk.toString('utf8')
  expect(text).toContain('"\'=Synthetic survey"')
  expect(text).toContain('Unicode café, ""quoted""\nsecond line')
  expect(text).toContain('Alpha, ""quoted""')
  expect(text).toContain('Beta\nline')
  expect(text).toContain('2026-11-02T15:00:00.000Z')
  expect((text.match(/response-\d+/g) || []).length).toBe(3)
  expect(text).not.toContain('anonymous_token')
})

test('CSV escaping/formula protection and denominator/zero behavior are explicit', () => {
  expect(csvCell('comma, "quote"\nnewline')).toBe('"comma, ""quote""\nnewline"')
  for (const value of [
    '=SUM(A1)',
    '+1',
    '-1',
    '@cmd',
    ' \t=1',
    '\ttext',
    '\rtext',
  ])
    expect(csvCell(value).startsWith('"\'')).toBe(true)
  const data = dataset()
  expect(
    questionResults(data, data.questions[0]).choices.map((c) => [
      c.count,
      c.percentage,
    ]),
  ).toEqual([
    [2, 66.7],
    [1, 33.3],
  ])
  expect(questionResults(data, data.questions[1]).unanswered).toBe(1)
  expect(
    questionResults(dataset(0), data.questions[0]).choices.every(
      (c) => c.count === 0 && c.percentage === 0,
    ),
  ).toBe(true)
  const csv = resultsCsv(data)
  expect(csv).toContain('Question 1: Question 1, ""quoted""?')
  expect(csv).toContain('"survey_status"')
  expect(csv).toContain('"closed"')
})

test('results route stays protected without instructor session', async ({
  page,
}) => {
  await resultsApi(page)
  await page.goto(`/surveys/${id}/results`)
  await expect(page).toHaveURL(/\/login$/)
})
