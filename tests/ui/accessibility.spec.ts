import { test, expect } from '@playwright/test'
import { mock, login } from './helpers'

async function fits(page: import('@playwright/test').Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
}

test('navigation heading/title, skip link and keyboard login', async ({
  page,
}) => {
  await mock(page)
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Instructor login' }),
  ).toBeFocused()
  await expect(page).toHaveTitle('Instructor login | Classroom Survey')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.getByLabel('Email', { exact: true }).focus()
  await page.keyboard.type('instructor@example.invalid')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused()
  await page.keyboard.type('correct-for-test')
  await page.keyboard.press('Enter')
  await expect(page).toHaveTitle('Dashboard | Classroom Survey')
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeFocused()
})

test('320px editor, validation focus and dialog keyboard cancel/description', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await mock(page)
  await login(page)
  await page.getByRole('link', { name: 'New Survey', exact: true }).click()
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  await expect(page.getByLabel('Survey title', { exact: true })).toBeFocused()
  await expect(
    page.getByLabel('Survey title', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Survey title').fill('Long title '.repeat(30))
  await page.getByRole('button', { name: 'Add Question', exact: true }).click()
  await fits(page)
  const remove = page.getByRole('button', {
    name: 'Delete Question',
    exact: true,
  })
  await remove.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveAccessibleDescription(
    'The question and all its choices will be removed when you save the draft.',
  )
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    dialog.getByRole('button', { name: 'Delete question', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(remove).toBeFocused()
  await fits(page)
})

test('student required-answer focus, radio keyboard operation and completion focus at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await mock(page)
  await page.route('**/rest/v1/surveys?**', (route) =>
    route.fulfill({
      json: {
        id: 'synthetic-survey',
        title: 'Unbroken'.repeat(40),
        description: 'Description',
        questions: [
          {
            id: 'q',
            question_text: 'Question'.repeat(40),
            question_type: 'multiple_choice',
            position: 1,
            choices: [
              { id: 'a', choice_text: 'Answer'.repeat(40), position: 1 },
              { id: 'b', choice_text: 'Second', position: 2 },
            ],
          },
        ],
      },
    }),
  )
  await page.route('**/rpc/submit_survey_response', (route) =>
    route.fulfill({ json: { success: true } }),
  )
  await page.goto('/s/synthetic')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  const first = page.getByRole('radio').first()
  await expect(first).toBeFocused()
  await expect(first).toHaveAccessibleDescription(
    'Choose an answer for this question.',
  )
  await expect(first).toHaveAttribute('aria-invalid', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('radio', { name: 'Second', exact: true }),
  ).toBeChecked()
  await fits(page)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Submit', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeFocused()
  await expect(page).toHaveTitle('Thank you! | Classroom Survey')
})

test('projection QR size, long-title dialog and input boundary contrast', async ({
  page,
}) => {
  await mock(page)
  await login(page)
  await page.route('**/rest/v1/surveys?**', (route) =>
    route.fulfill({
      json: {
        id: 'active',
        title: 'LongTitle'.repeat(70),
        status: 'active',
        public_slug: 'synthetic',
      },
    }),
  )
  await page.route('**/rest/v1/responses?**', (route) =>
    route.fulfill({
      status: 200,
      body: '',
      headers: {
        'Content-Range': '*/0',
        'Access-Control-Expose-Headers': 'content-range',
      },
    }),
  )
  await page.goto('/surveys/active/present')
  const qr = page.getByRole('img', {
    name: 'QR code linking to the student survey',
  })
  await expect(qr).toBeVisible()
  expect((await qr.boundingBox())!.width).toBeGreaterThanOrEqual(480)
  await page.setViewportSize({ width: 320, height: 640 })
  await fits(page)
  await page.getByRole('button', { name: 'Close Survey', exact: true }).click()
  await fits(page)
  await expect(page.getByRole('dialog')).toHaveAccessibleDescription(
    /Students will no longer/,
  )
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Close Survey', exact: true }),
  ).toBeFocused()
  await page.goto('/login')
  // Logged-in login redirects; use a new editor's input to inspect the shared style.
  await page.goto('/surveys/new')
  const ratio = await page
    .getByLabel('Survey title', { exact: true })
    .evaluate((input) => {
      const style = getComputedStyle(input)
      // Resolve CSS Color 4 / OKLCH computed colors to sRGB using canvas.
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      function luminance(color: string) {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const rgb = [...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((v) => v / 255)
        const linear = rgb.map((v) =>
          v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
      }
      const a = luminance(style.borderTopColor),
        b = luminance(style.backgroundColor)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    })
  expect(ratio).toBeGreaterThanOrEqual(3)
})
