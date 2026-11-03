import { test, expect } from '@playwright/test'
import { mock, login } from './helpers'
import type { DraftQuestion } from '../../src/lib/draft'
type Payload = {
  p_survey_id: string
  p_title: string
  p_description: string
  p_questions: DraftQuestion[]
  p_expected_updated_at: null
  p_request_id: string
}
type Copy = {
  id: string
  title: string
  description: string
  status: string
  updated_at: string
  public_slug: null
  questions: DraftQuestion[]
}

for (const scenario of ['copy', 'lost response', 'source changed']) {
  test(`duplication: ${scenario}`, async ({ page }) => {
    await mock(page)
    const calls: Payload[] = []
    let reads = 0
    let copy: Copy = {} as Copy
    const source = {
      title: 'Trees closed',
      description: 'Description',
      updated_at: 'v1',
    }
    const questions = [
      {
        id: 'q2',
        question_text: 'Pick a color',
        question_type: 'multiple_choice',
      },
      { id: 'q1', question_text: 'True?', question_type: 'true_false' },
    ]
    const choices = [{ choice_text: 'Blue' }, { choice_text: 'Red' }]
    const sourceBefore = JSON.stringify({ source, questions, choices })
    let responseReads = 0
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url())
      const table = url.pathname.split('/').pop()
      if (table === 'save_draft_survey') {
        const body = route.request().postDataJSON()
        calls.push(body)
        copy = {
          id: body.p_survey_id,
          title: body.p_title,
          description: body.p_description,
          status: 'draft',
          updated_at: 'v2',
          public_slug: null,
          questions: body.p_questions.map((q: DraftQuestion, i: number) => ({
            ...q,
            position: i + 1,
            choices: q.choices.map(
              (c: DraftQuestion['choices'][number], j: number) => ({
                ...c,
                position: j + 1,
              }),
            ),
          })),
        }
        return route.fulfill(
          scenario === 'lost response' && calls.length === 1
            ? { status: 400, json: { message: 'Synthetic lost response' } }
            : { json: { id: copy.id, updated_at: 'v2' } },
        )
      }
      if (table === 'surveys' && url.searchParams.has('id')) {
        if (url.searchParams.get('id') !== 'eq.closed')
          return route.fulfill({ json: copy })
        reads++
        return route.fulfill({
          json: {
            ...source,
            updated_at:
              scenario === 'source changed' && reads > 1 ? 'v2' : 'v1',
          },
        })
      }
      if (table === 'questions') return route.fulfill({ json: questions })
      if (table === 'choices')
        return route.fulfill({
          json:
            url.searchParams.get('question_id') === 'eq.q1'
              ? [{ choice_text: 'True' }, { choice_text: 'False' }]
              : choices,
        })
      if (table === 'responses' || table === 'answers') responseReads++
      return route.fallback()
    })
    await login(page)
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Trees closed' }) })
    await card.getByRole('button', { name: 'Duplicate', exact: true }).click()
    if (scenario === 'source changed') {
      await expect(page.getByRole('alert')).toContainText('source changed')
      expect(calls).toHaveLength(0)
    } else {
      if (scenario === 'lost response') {
        await expect(page.getByRole('alert')).toContainText('Retry duplication')
        await page.getByRole('button', { name: 'Retry duplication' }).click()
        await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit$/)
        expect(calls[1]).toEqual(calls[0])
      }
      await expect(
        page.getByLabel('Survey title', { exact: true }),
      ).toHaveValue('Copy of Trees closed')
      expect(copy.status).toBe('draft')
      expect(copy.public_slug).toBeNull()
      expect(copy.id).not.toBe('closed')
      expect(calls[0].p_expected_updated_at).toBeNull()
      expect(copy.questions.map((q: DraftQuestion) => q.question_text)).toEqual(
        ['Pick a color', 'True?'],
      )
      expect(
        copy.questions[0].choices.map(
          (c: DraftQuestion['choices'][number]) => c.choice_text,
        ),
      ).toEqual(['Blue', 'Red'])
      const ids = [
        copy.id,
        ...copy.questions.flatMap((q: DraftQuestion) => [
          q.id,
          ...q.choices.map((c: DraftQuestion['choices'][number]) => c.id),
        ]),
      ]
      expect(new Set(ids).size).toBe(7)
      expect(ids).not.toContain('q1')
      expect(ids).not.toContain('q2')
      expect(copy.description).toBe('Description')
    }
    expect(responseReads).toBe(0)
    expect(JSON.stringify({ source, questions, choices })).toBe(sourceBefore)
  })
}
