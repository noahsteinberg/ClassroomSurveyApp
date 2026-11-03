import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ProtectedRoute() {
  const { session, loading, error } = useAuth()
  if (loading)
    return (
      <main className="page">
        <p role="status">Checking your session…</p>
      </main>
    )
  if (error)
    return (
      <main className="page">
        <p role="alert">{error}</p>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    )
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
