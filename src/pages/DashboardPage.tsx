import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { readPages } from '../lib/results'
import { localDateKey } from '../lib/history'
import ConfirmAction from '../components/ConfirmAction'
import ActivateSurvey from '../components/ActivateSurvey'
import DuplicateSurvey from '../components/DuplicateSurvey'
import type { SurveyAction } from '../components/ConfirmAction'

type Status = 'draft' | 'active' | 'closed' | 'archived'
type Survey = {
  id: string
  title: string
  description: string | null
  status: Status
  created_at: string
}
const labels: Record<Status, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
}
export default function DashboardPage() {
  const { session } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [confirm, setConfirm] = useState<{
    survey: Survey
    action: SurveyAction
  } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const client = supabase!
    void readPages<Survey>(
      (from, to) =>
        client
          .from('surveys')
          .select('id,title,description,status,created_at')
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to)
          .abortSignal(controller.signal),
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setSurveys(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(
            'Unable to load surveys. Check your connection and try Refresh.',
          )
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [reload])
  function refresh() {
    setLoading(true)
    setReload((n) => n + 1)
  }
  async function logout() {
    setLogoutBusy(true)
    setError(null)
    try {
      const { error: logoutError } = await supabase!.auth.signOut({
        scope: 'local',
      })
      if (logoutError) throw logoutError
    } catch {
      setError('Unable to log out. Check your connection and try again.')
    } finally {
      setLogoutBusy(false)
    }
  }
  async function performAction() {
    if (!confirm || busy) return
    const { action, survey } = confirm
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (action === 'delete') {
        const { data, error: mutationError } = await supabase!
          .from('surveys')
          .delete()
          .eq('id', survey.id)
          .select('id')
        if (mutationError || !data?.length)
          throw mutationError ?? new Error('Survey no longer available')
      } else {
        const { error: mutationError } = await supabase!.rpc(
          action === 'close' ? 'close_survey' : 'archive_survey',
          { p_survey_id: survey.id },
        )
        if (mutationError) throw mutationError
      }
      setNotice(
        action === 'delete'
          ? 'Survey permanently deleted.'
          : action === 'close'
            ? 'Survey closed.'
            : 'Survey archived. Results are preserved.',
      )
      refresh()
    } catch {
      setError(
        'The survey could not be updated. Its status may have changed. Refresh and try again.',
      )
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }
  const dateError = Boolean(fromDate && toDate && fromDate > toDate)
  const visible = surveys.filter(
    (s) =>
      !dateError &&
      (status === 'all' || s.status === status) &&
      (!fromDate || localDateKey(s.created_at) >= fromDate) &&
      (!toDate || localDateKey(s.created_at) <= toDate) &&
      s.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  return (
    <main id="main-content" tabIndex={-1} className="page">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Classroom Survey
          </p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 break-all text-sm text-slate-600">
            Signed in as {session?.user.email}
          </p>
        </div>
        <button
          className="button"
          onClick={() => void logout()}
          disabled={logoutBusy || busy}
        >
          {logoutBusy ? 'Logging out…' : 'Log out'}
        </button>
      </header>
      <section className="mt-7" aria-labelledby="surveys-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="surveys-title" className="text-xl font-bold">
            Your surveys
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="button"
              onClick={refresh}
              disabled={loading || busy}
            >
              Refresh
            </button>
            <Link className="button primary" to="/surveys/new">
              New Survey
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="label" htmlFor="search">
              Search by title
            </label>
            <input
              className="input"
              id="search"
              type="search"
              placeholder="Search surveys…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              className="input"
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="from-date">
              Created on or after
            </label>
            <input
              className="input"
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="to-date">
              Created on or before
            </label>
            <input
              className="input"
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            className="button"
            onClick={() => {
              setSearch('')
              setStatus('all')
              setFromDate('')
              setToDate('')
            }}
          >
            Clear filters
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Creation dates use your local timezone. Closed and archived surveys
          retain their results.
        </p>
        {dateError && (
          <p role="alert" className="error mt-4">
            The start date must be on or before the end date.
          </p>
        )}
        {error && (
          <p role="alert" className="error mt-5">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-emerald-50 p-4 text-emerald-900"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-12 text-slate-600">
            Loading surveys…
          </p>
        ) : error && !surveys.length ? null : !surveys.length ? (
          <div className="panel mt-6 text-center">
            <h3 className="text-lg font-semibold">No surveys yet</h3>
            <p className="mt-2 text-slate-600">
              Create your first survey using New Survey above.
            </p>
          </div>
        ) : !visible.length ? (
          <p className="panel mt-6">No surveys match these filters.</p>
        ) : (
          <ul className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Surveys">
            {visible.map((survey) => (
              <li className="panel flex flex-col" key={survey.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-xl font-bold">
                    {survey.title}
                  </h3>
                  <span className={`badge ${survey.status}`}>
                    {labels[survey.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Created{' '}
                  <time dateTime={survey.created_at}>
                    {new Date(survey.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </p>
                {survey.description && (
                  <p className="mt-3 break-words text-slate-600">
                    {survey.description}
                  </p>
                )}
                <div
                  className="mt-6 flex flex-wrap gap-2"
                  aria-label={`Actions for ${survey.title}`}
                >
                  {survey.status === 'draft' && (
                    <>
                      <Link
                        className="button"
                        to={`/surveys/${survey.id}/edit`}
                      >
                        Edit
                      </Link>
                      <ActivateSurvey
                        id={survey.id}
                        title={survey.title}
                        disabled={busy || loading || logoutBusy}
                      />
                    </>
                  )}
                  <DuplicateSurvey
                    id={survey.id}
                    disabled={busy || loading || logoutBusy}
                  />
                  <Link className="button" to={`/surveys/${survey.id}/results`}>
                    View Results
                  </Link>
                  {survey.status === 'active' && (
                    <Link
                      className="button"
                      to={`/surveys/${survey.id}/present`}
                    >
                      Present QR
                    </Link>
                  )}
                  {survey.status === 'active' && (
                    <button
                      className="button"
                      disabled={busy || loading || logoutBusy}
                      onClick={() => setConfirm({ survey, action: 'close' })}
                    >
                      Close
                    </button>
                  )}
                  {survey.status === 'closed' && (
                    <button
                      className="button"
                      disabled={busy || loading || logoutBusy}
                      onClick={() => setConfirm({ survey, action: 'archive' })}
                    >
                      Archive
                    </button>
                  )}
                  {survey.status !== 'active' && (
                    <button
                      className="button text-red-800"
                      disabled={busy || loading || logoutBusy}
                      onClick={() => setConfirm({ survey, action: 'delete' })}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {confirm && (
        <ConfirmAction
          action={confirm.action}
          title={confirm.survey.title}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void performAction()}
        />
      )}
    </main>
  )
}
