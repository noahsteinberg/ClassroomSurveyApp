import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'instructor@example.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2026-11-02T12:00:00Z',
  created_at: '2026-11-02T12:00:00Z',
  app_metadata: {},
  user_metadata: {},
}
const sample = () => [
  {
    id: 'draft',
    title: 'Recursion draft',
    description: 'Prepare for next class',
    status: 'draft',
    created_at: '2026-11-02T12:00:00Z',
  },
  {
    id: 'active',
    title: 'Pointers live',
    description: null,
    status: 'active',
    created_at: '2026-11-01T12:00:00Z',
  },
  {
    id: 'closed',
    title: 'Trees closed',
    description: null,
    status: 'closed',
    created_at: '2026-10-31T12:00:00Z',
  },
  {
    id: 'archived',
    title: 'Sorting archive',
    description: null,
    status: 'archived',
    created_at: '2026-10-30T12:00:00Z',
  },
]
export async function mock(
  page: Page,
  options: { empty?: boolean; failure?: boolean } = {},
) {
  let surveys = options.empty ? [] : sample()
  const mutations: string[] = []
  let failed = options.failure ?? false
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )
  const session = {
    access_token: `${btoa('{"alg":"HS256","typ":"JWT"}')}.${payload}.testsignature`,
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  }
  await page.route(
    'https://hmrtffcpoyksnwdquyow.supabase.co/**',
    async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const json = (body: unknown, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
          },
          body: JSON.stringify(body),
        })
      if (req.method() === 'OPTIONS') return json({})
      if (url.pathname === '/auth/v1/token') {
        const body = req.postDataJSON()
        return body.password === 'correct-for-test' || body.refresh_token
          ? json(session)
          : json(
              {
                code: 'invalid_credentials',
                error_code: 'invalid_credentials',
                msg: 'Invalid login credentials',
              },
              400,
            )
      }
      if (url.pathname === '/auth/v1/user') return json(user)
      if (url.pathname === '/auth/v1/logout') return json({})
      if (url.pathname === '/rest/v1/surveys' && req.method() === 'GET')
        return failed
          ? json({ code: 'TEST_NETWORK', message: 'Synthetic error' }, 400)
          : json(surveys)
      if (url.pathname === '/rest/v1/surveys' && req.method() === 'DELETE') {
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const removed = surveys.filter((s) => s.id === id)
        surveys = surveys.filter((s) => s.id !== id)
        mutations.push(`delete:${id}`)
        return json(removed.map((s) => ({ id: s.id })))
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const action = url.pathname.endsWith('close_survey')
          ? 'closed'
          : 'archived'
        const id = req.postDataJSON().p_survey_id
        surveys = surveys.map((s) =>
          s.id === id ? { ...s, status: action } : s,
        )
        mutations.push(`${action}:${id}`)
        return json(null)
      }
      return json({ message: 'Unexpected mocked endpoint' }, 500)
    },
  )
  return {
    mutations,
    recover: () => {
      failed = false
    },
  }
}
export async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('correct-for-test')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
}
