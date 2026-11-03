import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { session, loading, error: sessionError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !supabase) return
    setBusy(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(
          authError.code === 'invalid_credentials'
            ? 'Email or password is incorrect.'
            : authError.code === 'email_not_confirmed'
              ? 'Confirm your instructor email before signing in.'
              : 'Unable to sign in. Check your connection and try again.',
        )
      } else setPassword('')
    } catch {
      setError('Unable to sign in. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <main className="page">
        <p role="status">Checking your session…</p>
      </main>
    )
  if (session) return <Navigate to="/dashboard" replace />
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="panel w-full max-w-md" aria-labelledby="login-title">
        <Link className="text-sm font-semibold text-slate-600 underline" to="/">
          Classroom Survey
        </Link>
        <h1 id="login-title" className="mt-6 text-3xl font-bold">
          Instructor login
        </h1>
        <p className="mt-2 text-slate-600">
          Sign in to manage your classroom surveys.
        </p>
        {(error || sessionError) && (
          <p role="alert" className="error mt-5">
            {error || sessionError}
          </p>
        )}
        <form onSubmit={login} className="mt-6 space-y-5">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <button className="button primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          Instructor accounts are provided privately. Students use their survey
          link without logging in.
        </p>
      </section>
    </main>
  )
}
