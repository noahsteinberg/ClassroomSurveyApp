import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { loadResults } from '../lib/results'
import { questionResults } from '../lib/result-summary'
import type { ResultData } from '../lib/results'
import { downloadResultsCsv } from '../lib/csv'

export default function ResultsPage() {
  const { id } = useParams()
  return <Results key={id} id={id ?? ''} />
}
function Results({ id }: { id: string }) {
  const [data, setData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [exportError, setExportError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void loadResults(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value)
          setError(false)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [id, refresh])
  return (
    <main className="page max-w-4xl">
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <Link className="button" to="/dashboard">
          Back to Dashboard
        </Link>
        <button
          className="button"
          disabled={loading}
          onClick={() => {
            setLoading(true)
            setRefresh((n) => n + 1)
          }}
        >
          Refresh Results
        </button>
        <button
          className="button primary"
          disabled={!data || loading || error}
          onClick={() => {
            try {
              downloadResultsCsv(data!)
              setExportError(false)
            } catch {
              setExportError(true)
            }
          }}
        >
          Export CSV
        </button>
      </div>
      {exportError && (
        <p role="alert" className="error mb-5">
          Unable to download the export. Try again or check your browser
          download settings.
        </p>
      )}
      {error && (
        <p role="alert" className="error mb-5">
          Unable to load complete results. The survey may be unavailable or your
          connection may have failed. Try Refresh Results. Any previous results
          shown below may be outdated.
        </p>
      )}
      {loading && (
        <p role="status" className="my-6">
          Loading results…
        </p>
      )}
      {data && (
        <>
          <header className="mb-7">
            <h1 className="break-words text-3xl font-bold">
              {data.survey.title}
            </h1>
            <p className="mt-3 text-xl font-semibold">
              {data.responses.length}{' '}
              {data.responses.length === 1 ? 'response' : 'responses'}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Status:{' '}
              {data.survey.status.charAt(0).toUpperCase() +
                data.survey.status.slice(1)}{' '}
              · Updated {new Date(data.loadedAt).toLocaleTimeString()}
            </p>
            {data.survey.status === 'active' && (
              <Link className="button mt-4" to={`/surveys/${id}/present`}>
                Present QR
              </Link>
            )}
          </header>
          {!data.responses.length && (
            <p className="panel mb-6">
              No responses yet.
              {data.survey.status === 'active'
                ? ' Display the QR code so students can join.'
                : ''}
            </p>
          )}
          <p className="mb-6 text-sm text-slate-600">
            Percentages use all submitted responses and are rounded to one
            decimal. Unanswered includes missing or unavailable choices.
          </p>
          <div className="space-y-6">
            {data.questions.map((q, qi) => {
              const result = questionResults(data, q)
              return (
                <section
                  key={q.id}
                  className="panel min-w-0"
                  aria-labelledby={`result-${q.id}`}
                >
                  <h2
                    id={`result-${q.id}`}
                    className="break-words text-xl font-bold"
                  >
                    {qi + 1}. {q.question_text}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Unanswered: {result.unanswered}
                  </p>
                  {result.choices.length ? (
                    <>
                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <caption className="sr-only">
                            Choice counts and percentages for question {qi + 1}
                          </caption>
                          <thead>
                            <tr>
                              <th className="p-2">Choice</th>
                              <th className="p-2">Count</th>
                              <th className="p-2">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.choices.map((c) => (
                              <tr
                                key={c.id}
                                className="border-t border-slate-200"
                              >
                                <th
                                  scope="row"
                                  className="max-w-xs whitespace-pre-wrap break-words p-2 font-normal"
                                >
                                  {c.choice_text}
                                </th>
                                <td className="p-2">{c.count}</td>
                                <td className="p-2">
                                  {c.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div
                        className="mt-6 min-w-0"
                        style={{
                          height: Math.max(180, result.choices.length * 48),
                        }}
                        aria-hidden="true"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={result.choices}
                            layout="vertical"
                            margin={{ left: 5, right: 20, top: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis
                              type="category"
                              dataKey="choice_text"
                              width={105}
                              tickFormatter={(v: string) =>
                                v.length > 18 ? v.slice(0, 18) + '…' : v
                              }
                            />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill="#2563eb"
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-slate-600">
                      No answer choices in this draft question.
                    </p>
                  )}
                </section>
              )
            })}
          </div>
          {!data.questions.length && (
            <p className="panel">This draft has no questions yet.</p>
          )}
        </>
      )}
    </main>
  )
}
