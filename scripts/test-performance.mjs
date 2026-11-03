// Explicit isolated performance test. Uses a loopback-only, temporary login form.
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'

const variables = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() && !line.trim().startsWith('#') && line.includes('='),
    )
    .map((line) => {
      const index = line.indexOf('=')
      return [
        line.slice(0, index).trim(),
        line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ''),
      ]
    }),
)
const config = {
  url: variables.VITE_SUPABASE_URL,
  key: variables.VITE_SUPABASE_PUBLISHABLE_KEY,
}

if (
  config.url !== 'https://hmrtffcpoyksnwdquyow.supabase.co' ||
  !config.key.startsWith('sb_publishable_')
)
  throw new Error('Verified project and publishable key required')
const nonce = randomUUID()
const client = createClient(config.url, config.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
let busy = false
let origin
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  )
  if (req.url !== `/${nonce}` || req.headers.host !== new URL(origin).host) {
    res.writeHead(404).end()
    return
  }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Temporary performance verification</title><main><h1>Verify ClassroomSurveyApp instructor access</h1><p>Project: hmrtffcpoyksnwdquyow. Enter the app-specific password you created in Supabase. Credentials stay in memory and are sent only to Supabase over HTTPS. No credentials or sessions are written to files or chat.</p><form method="post"><label>Email <input name="email" type="email" autocomplete="username" required></label><br><label>App password <input name="password" type="password" autocomplete="current-password" required></label><br><input type="hidden" name="nonce" value="${nonce}"><button>Sign in and run isolated performance checks</button></form><p>This is a temporary test helper, not the application login page.</p></main></html>`,
    )
    return
  }
  if (req.method !== 'POST' || req.headers.origin !== origin || busy) {
    res.writeHead(403).end()
    return
  }
  let body = ''
  try {
    for await (const chunk of req) {
      body += chunk
      if (body.length > 8192) throw new Error('Request too large')
    }
    const form = new URLSearchParams(body)
    body = ''
    if (form.get('nonce') !== nonce) throw new Error('Invalid form')
    busy = true
    const { data, error } = await client.auth.signInWithPassword({
      email: form.get('email'),
      password: form.get('password'),
    })
    form.delete('password')
    form.delete('email')
    if (
      error ||
      !data.session ||
      !data.user.email_confirmed_at ||
      data.user.is_anonymous
    ) {
      busy = false
      res
        .writeHead(400, { 'Content-Type': 'text/plain' })
        .end(
          'Instructor login unsuccessful. Return to the form and check the email/app password and confirmation status.',
        )
      return
    }
    res
      .writeHead(200, { 'Content-Type': 'text/plain' })
      .end(
        'Instructor login verified. Isolated performance checks are running; results will appear in Codex. You can close this tab.',
      )
    console.log(
      'PASS: real instructor password login; confirmed, nonanonymous account; session held only in memory',
    )
    server.close()
    for (
      let i = 0;
      !existsSync(new URL('./performance-checks.mjs', import.meta.url)) &&
      i < 180;
      i++
    )
      await delay(1000)
    const { runPerformanceChecks } = await import('./performance-checks.mjs')
    await runPerformanceChecks({
      config,
      token: data.session.access_token,
      session: data.session,
    })
    await client.auth.signOut({ scope: 'local' })
    console.log('Temporary instructor session signed out; helper stopped.')
    server.closeAllConnections()
    process.exit(0)
  } catch (error) {
    if (!res.headersSent)
      res
        .writeHead(500)
        .end('Test helper failed; see sanitized results in Codex.')
    console.error('Hosted checks failed:', error.message)
    await client.auth.signOut({ scope: 'local' })
    server.close()
    server.closeAllConnections()
    process.exit(1)
  }
})
server.requestTimeout = 15000
server.listen(0, '127.0.0.1', () => {
  origin = `http://127.0.0.1:${server.address().port}`
  console.log(`Open instructor verification locally: ${origin}/${nonce}`)
})
