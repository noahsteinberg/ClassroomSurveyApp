import { test, expect } from '@playwright/test'
import { mock, login, user } from './helpers'

test('protected route, invalid login, login persistence and logout', async ({
  page,
}) => {
  await mock(page)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('incorrect-for-test')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect.',
  )
  await page.getByLabel('Password', { exact: true }).fill('correct-for-test')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('survey list, search/status filters and unavailable later features', async ({
  page,
}) => {
  await mock(page)
  await login(page)
  await expect(
    page
      .getByRole('list', { name: 'Surveys', exact: true })
      .getByRole('listitem'),
  ).toHaveCount(4)
  await expect(
    page.getByRole('link', { name: 'New Survey', exact: true }),
  ).toHaveAttribute('href', '/surveys/new')
  for (const name of ['Duplicate'])
    await expect(
      page.getByRole('button', { name, exact: true }).first(),
    ).toBeDisabled()
  await page.getByLabel('Search by title').fill('RECURSION')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByLabel('Status', { exact: true }).selectOption('closed')
  await expect(page.getByText('No surveys match these filters.')).toBeVisible()
  await page.getByLabel('Search by title').clear()
  await expect(
    page.getByRole('heading', { name: 'Trees closed' }),
  ).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('cancel, close, archive and delete use the right operations and update list', async ({
  page,
}) => {
  const api = await mock(page)
  await login(page)
  const active = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Pointers live' }) })
  await expect(
    active.getByRole('button', { name: 'Delete', exact: true }),
  ).toHaveCount(0)
  await active.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(api.mutations).toHaveLength(0)
  await active.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Close survey', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /^Survey closed\.$/ }),
  ).toHaveText('Survey closed.')
  await expect(
    active.getByRole('button', { name: 'Archive', exact: true }),
  ).toBeEnabled()
  await active.getByRole('button', { name: 'Archive', exact: true }).click()
  await page
    .getByRole('button', { name: 'Archive survey', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: /^Survey archived/ }),
  ).toHaveText('Survey archived. Results are preserved.')
  await active.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('all student responses')
  await page.getByRole('button', { name: 'Delete survey', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Pointers live' }),
  ).toHaveCount(0)
  expect(api.mutations).toEqual([
    'closed:active',
    'archived:active',
    'delete:active',
  ])
})

test('empty dashboard and unavailable routes are clear', async ({ page }) => {
  await mock(page, { empty: true })
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'No surveys yet' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'New Survey', exact: true }),
  ).toHaveAttribute('href', '/surveys/new')
  await page.goto('/surveys/not-a-real-route')
  await expect(
    page.getByRole('heading', { name: 'Page unavailable' }),
  ).toBeVisible()
})

test('load errors have a working refresh and mobile layout fits', async ({
  page,
}) => {
  const api = await mock(page, { failure: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('Unable to load surveys')
  api.recover()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(4)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
