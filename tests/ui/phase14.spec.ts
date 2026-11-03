import { test, expect } from '@playwright/test'
import { mock, login } from './helpers'

for (const refreshWorks of [true, false]) {
  test(`expired session: refresh ${refreshWorks ? 'restores access' : 'rejects revoked session'}`, async ({
    page,
  }) => {
    await mock(page)
    await login(page)
    let refreshCalls = 0
    await page.route(
      '**/auth/v1/token?grant_type=refresh_token',
      async (route) => {
        refreshCalls++
        if (!refreshWorks)
          return route.fulfill({
            status: 400,
            json: {
              code: 'refresh_token_not_found',
              msg: 'Synthetic revoked refresh token',
            },
          })
        return route.fallback()
      },
    )
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.endsWith('-auth-token'),
      )!
      const session = JSON.parse(localStorage.getItem(key)!)
      session.expires_at = Math.floor(Date.now() / 1000) - 600
      const jwt = session.access_token.split('.')
      const claims = JSON.parse(atob(jwt[1]))
      claims.exp = session.expires_at
      jwt[1] = btoa(JSON.stringify(claims))
      session.access_token = jwt.join('.')
      localStorage.setItem(key, JSON.stringify(session))
    })
    await page.reload()
    await expect(page).toHaveURL(refreshWorks ? /\/dashboard$/ : /\/login$/)
    await expect(
      page.getByRole('heading', {
        name: refreshWorks ? 'Dashboard' : 'Instructor login',
        exact: true,
      }),
    ).toBeVisible()
    expect(refreshCalls).toBeGreaterThan(0)
    if (!refreshWorks) {
      await expect(
        page.getByRole('link', { name: 'New Survey', exact: true }),
      ).toHaveCount(0)
      await page.goto('/surveys/private/results')
      await expect(page).toHaveURL(/\/login$/)
    }
  })
}

test('rapid repeated Submit events send one RPC; tablet student targets fit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await mock(page)
  await page.route('**/rest/v1/surveys?**', (route) =>
    route.fulfill({
      json: {
        id: 'phase14-synthetic',
        title: 'Tablet check',
        description: null,
        questions: [
          {
            id: 'q',
            question_text: 'Choose one',
            question_type: 'multiple_choice',
            position: 1,
            choices: [
              { id: 'a', choice_text: 'First', position: 1 },
              { id: 'b', choice_text: 'Second', position: 2 },
            ],
          },
        ],
      },
    }),
  )
  let calls = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/rpc/submit_survey_response', async (route) => {
    calls++
    await gate
    await route.fulfill({ json: { success: true } })
  })
  await page.goto('/s/phase14-synthetic')
  await page.getByRole('radio', { name: 'First', exact: true }).check()
  for (const label of await page.locator('label').all())
    expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.locator('form').evaluate((form) => {
    form.requestSubmit()
    form.requestSubmit()
  })
  await expect(
    page.getByRole('button', { name: 'Submitting…', exact: true }),
  ).toBeDisabled()
  await expect.poll(() => calls).toBe(1)
  release()
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible()
  expect(calls).toBe(1)
})

test('tablet dashboard and editor fit portrait and landscape', async ({
  page,
}) => {
  await mock(page)
  await login(page)
  for (const [width, height] of [
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.getByRole('link', { name: 'New Survey', exact: true }).click()
  await page.getByRole('button', { name: 'Add Question', exact: true }).click()
  for (const [width, height] of [
    [768, 1024],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
})
