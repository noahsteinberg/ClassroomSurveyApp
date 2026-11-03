import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mock, login } from './helpers'

async function editorApi(
  page: Page,
  options: { conflict?: boolean; lostResponse?: boolean; status?: string } = {},
) {
  await mock(page, { empty: true })
  const calls: Record<string, unknown>[] = []
  let stored: Record<string, unknown> | null = null
  const receipts = new Map<string, { id: string; updated_at: string }>()
  let lost = options.lostResponse ?? false
  await page.route('**/rest/v1/surveys?**', async (route) => {
    const url = new URL(route.request().url())
    const record = stored ?? {
      id: '00000000-0000-4000-8000-000000000010',
      title: 'Existing draft',
      description: '',
      updated_at: '2026-11-02T12:00:00.000001Z',
      questions: [],
    }
    await route.fulfill({
      json: url.searchParams.has('id')
        ? { ...record, status: options.status ?? 'draft' }
        : [],
    })
  })
  await page.route('**/rest/v1/rpc/save_draft_survey', async (route) => {
    const body = route.request().postDataJSON()
    calls.push(body)
    if (options.conflict) {
      await route.fulfill({
        status: 400,
        json: { code: 'P0001', message: 'DRAFT_CONFLICT' },
      })
      return
    }
    let result = receipts.get(body.p_request_id)
    if (!result) {
      result = {
        id: body.p_survey_id,
        updated_at: `2026-11-02T12:00:00.${String(receipts.size + 1).padStart(6, '0')}Z`,
      }
      receipts.set(body.p_request_id, result)
      stored = {
        id: result.id,
        updated_at: result.updated_at,
        title: body.p_title,
        description: body.p_description,
        questions: body.p_questions.map(
          (q: { choices: object[] }, i: number) => ({
            ...q,
            position: i + 1,
            choices: q.choices.map((c, j) => ({ ...c, position: j + 1 })),
          }),
        ),
      }
    }
    if (lost) {
      lost = false
      await route.fulfill({
        status: 400,
        json: {
          code: 'TEST_LOST_RESPONSE',
          message: 'Synthetic lost response',
        },
      })
      return
    }
    await route.fulfill({ json: result })
  })
  return { calls }
}
const question = (page: Page, n: number) =>
  page.getByRole('region', { name: `Question ${n}`, exact: true })
async function addMC(
  page: Page,
  text: string,
  a: string,
  b: string,
  n: number,
) {
  await page.getByRole('button', { name: 'Add Question', exact: true }).click()
  const q = question(page, n)
  await q.getByLabel('Question text', { exact: true }).fill(text)
  await q.getByLabel('Choice 1', { exact: true }).fill(a)
  await q.getByLabel('Choice 2', { exact: true }).fill(b)
}

test('create, reorder questions/choices, save and reload without losing IDs or text', async ({
  page,
}) => {
  const api = await editorApi(page)
  await login(page)
  await page.getByRole('link', { name: 'New Survey', exact: true }).click()
  await page.getByLabel('Survey title').fill('Editor smoke draft')
  await addMC(page, 'First question', 'Alpha', 'Beta', 1)
  await addMC(page, 'Second question', 'Gamma', 'Delta', 2)
  await page
    .getByRole('button', { name: 'Move question 2 up', exact: true })
    .click()
  await expect(
    question(page, 1).getByLabel('Question text', { exact: true }),
  ).toHaveValue('Second question')
  await page
    .getByRole('button', {
      name: 'Move choice 2 up in question 1',
      exact: true,
    })
    .click()
  await expect(
    question(page, 1).getByLabel('Choice 1', { exact: true }),
  ).toHaveValue('Delta')
  await expect(
    page.getByRole('button', { name: 'Activate', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page).toHaveURL(/\/surveys\/[0-9a-f-]+\/edit$/)
  await expect(page.getByRole('status')).toHaveText('Draft saved.')
  expect(api.calls).toHaveLength(1)
  const payload = api.calls[0].p_questions as {
    id: string
    question_text: string
    choices: { id: string; choice_text: string }[]
  }[]
  expect(payload.map((q) => q.question_text)).toEqual([
    'Second question',
    'First question',
  ])
  expect(payload[0].choices.map((c) => c.choice_text)).toEqual([
    'Delta',
    'Gamma',
  ])
  await page.reload()
  await expect(
    question(page, 1).getByLabel('Question text', { exact: true }),
  ).toHaveValue('Second question')
  await expect(
    question(page, 1).getByLabel('Choice 1', { exact: true }),
  ).toHaveValue('Delta')
  await page.getByLabel('Description (optional)').fill('Updated description')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Draft saved.')
  expect(api.calls[1].p_questions).toEqual(api.calls[0].p_questions)
  expect(api.calls[1].p_expected_updated_at).toBeTruthy()
})

test('field validation, fixed TF choices and confirmed deletions', async ({
  page,
}) => {
  const api = await editorApi(page)
  await login(page)
  await page.goto('/surveys/new')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(
    page.getByText('Enter a survey title.', { exact: true }),
  ).toBeVisible()
  expect(api.calls).toHaveLength(0)
  await page.getByLabel('Survey title').fill('TF draft')
  await page.getByRole('button', { name: 'Add Question', exact: true }).click()
  await question(page, 1)
    .getByLabel('Question text', { exact: true })
    .fill('True statement?')
  await question(page, 1)
    .getByLabel('Question type', { exact: true })
    .selectOption('true_false')
  await page
    .getByRole('button', { name: 'Replace choices', exact: true })
    .click()
  await expect(
    question(page, 1).getByLabel('Choice 1', { exact: true }),
  ).toHaveValue('True')
  await expect(
    question(page, 1).getByLabel('Choice 1', { exact: true }),
  ).not.toBeEditable()
  await expect(
    question(page, 1).getByRole('button', {
      name: 'Delete choice',
      exact: true,
    }),
  ).toHaveCount(0)
  await question(page, 1)
    .getByRole('button', { name: 'Delete Question', exact: true })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(question(page, 1)).toBeVisible()
  await question(page, 1)
    .getByRole('button', { name: 'Delete Question', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete question', exact: true })
    .click()
  await expect(question(page, 1)).toHaveCount(0)
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Draft saved.')
  expect(api.calls[0].p_questions).toEqual([])
})

test('uncertain save retries reuse request/survey IDs and stale-tab conflicts retain text', async ({
  page,
}) => {
  const api = await editorApi(page, { lostResponse: true })
  await login(page)
  await page.goto('/surveys/new')
  await page.getByLabel('Survey title').fill('Retry draft')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to save')
  await expect(page.getByLabel('Survey title')).toHaveValue('Retry draft')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Draft saved.')
  expect(api.calls).toHaveLength(2)
  expect(api.calls[0]).toEqual(api.calls[1])
})

test('conflicts preserve edits, unsaved navigation warns, and non-draft editor is blocked', async ({
  page,
}) => {
  await editorApi(page, { conflict: true })
  await login(page)
  await page.goto('/surveys/00000000-0000-4000-8000-000000000010/edit')
  await page.getByLabel('Survey title').fill('Keep my changes')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  await expect(page.getByLabel('Survey title')).toHaveValue('Keep my changes')
  await page
    .getByRole('link', { name: 'Back to Dashboard', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText(
    'Discard unsaved changes?',
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByLabel('Survey title')).toHaveValue('Keep my changes')
  await page
    .getByRole('link', { name: 'Back to Dashboard', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Discard changes', exact: true })
    .click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.route('**/rest/v1/surveys?**', (route) =>
    route.fulfill({ json: { id: 'closed', status: 'closed' } }),
  )
  await page.goto('/surveys/00000000-0000-4000-8000-000000000010/edit')
  await expect(
    page.getByRole('heading', { name: 'Draft editing only', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Save Draft', exact: true }),
  ).toHaveCount(0)
})
