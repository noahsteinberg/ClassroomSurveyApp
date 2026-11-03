import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SurveyEditorPage from './pages/SurveyEditorPage'
import PresentSurveyPage from './pages/PresentSurveyPage'
import StudentSurveyPage from './pages/StudentSurveyPage'
import AuthProvider from './components/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import { supabase } from './lib/supabase'

const ResultsPage = lazy(() => import('./pages/ResultsPage'))

export default function App() {
  if (!supabase)
    return (
      <main className="page">
        <h1 className="text-2xl font-bold">Connection setup required</h1>
        <p className="mt-4">
          Configure the Supabase project URL and publishable key, then restart
          the app. See README for setup instructions.
        </p>
      </main>
    )
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/s/:slug" element={<StudentSurveyPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/surveys/new" element={<SurveyEditorPage key="new" />} />
          <Route path="/surveys/:id/edit" element={<SurveyEditorPage />} />
          <Route path="/surveys/:id/present" element={<PresentSurveyPage />} />
          <Route
            path="/surveys/:id/results"
            element={
              <Suspense
                fallback={
                  <main className="page">
                    <p role="status">Loading results?</p>
                  </main>
                }
              >
                <ResultsPage />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <main className="page">
              <h1 className="text-2xl font-bold">Page unavailable</h1>
              <p className="my-4">
                This page does not exist or is not available yet.
              </p>
              <Link className="button" to="/">
                Back to home
              </Link>
            </main>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
