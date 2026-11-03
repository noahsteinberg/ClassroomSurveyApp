import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { publicSupabase } from '../lib/supabase'
import {
  browserToken,
  markSubmitted,
  submissionMarker,
} from '../lib/student-storage'

type Question = {
  id: string
  question_text: string
  question_type: string
  position: number
  choices: { id: string; choice_text: string; position: number }[]
}
type PublicSurvey = {
  id: string
  title: string
  description: string | null
  questions: Question[]
}
type State =
  'loading' | 'form' | 'success' | 'duplicate' | 'closed' | 'missing' | 'error'
export default function StudentSurveyPage() {
  const { slug } = useParams()
  return <StudentSurvey key={slug} slug={slug ?? ''} />
}
function StudentSurvey({ slug }: { slug: string }) {
  const [state, setState] = useState<State>('loading')
  const [survey, setSurvey] = useState<PublicSurvey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const token = useRef<string | null>(null)
  const pending = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const { data, error: readError } = await publicSupabase!
          .from('surveys')
          .select(
            'id,title,description,questions(id,question_text,question_type,position,choices(id,choice_text,position))',
          )
          .eq('public_slug', slug)
          .eq('status', 'active')
          .abortSignal(controller.signal)
          .maybeSingle()
        if (controller.signal.aborted) return
        if (readError) throw readError
        if (!data) {
          const { data: available, error: availabilityError } =
            await publicSupabase!
              .rpc('survey_availability', { p_slug: slug })
              .abortSignal(controller.signal)
          if (controller.signal.aborted) return
          if (availabilityError) throw availabilityError
          setState(available === 'closed' ? 'closed' : 'missing')
          return
        }
        const ordered: PublicSurvey = {
          ...data,
          questions: [...data.questions]
            .sort((a, b) => a.position - b.position)
            .map((q) => ({
              ...q,
              choices: [...q.choices].sort((a, b) => a.position - b.position),
            })),
        }
        setSurvey(ordered)
        try {
          if (submissionMarker(data.id)) {
            setState('duplicate')
            return
          }
          token.current = browserToken(data.id)
        } catch {
          setStorageError(true)
        }
        setState('form')
      } catch {
        if (!controller.signal.aborted) setState('error')
      }
    }
    void load()
    return () => controller.abort()
  }, [slug, reload])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!survey || pending.current || storageError || !token.current) return
    const absent = survey.questions
      .filter((q) => !answers[q.id])
      .map((q) => q.id)
    setMissing(absent)
    setError(null)
    if (absent.length) {
      setError('Please answer every question before submitting.')
      return
    }
    try {
      if (submissionMarker(survey.id)) {
        setState('duplicate')
        return
      }
      token.current = browserToken(survey.id)
    } catch {
      setStorageError(true)
      return
    }
    pending.current = true
    setBusy(true)
    try {
      const { data, error: saveError } = await publicSupabase!.rpc(
        'submit_survey_response',
        {
          p_survey_id: survey.id,
          p_anonymous_token: token.current,
          p_answers: survey.questions.map((q) => ({
            question_id: q.id,
            choice_id: answers[q.id],
          })),
        },
      )
      if (saveError) throw saveError
      if (!data?.success) throw new Error('Submission failed')
      markSubmitted(survey.id)
      setState('success')
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : ''
      if (message.includes('DUPLICATE_RESPONSE')) {
        markSubmitted(survey.id)
        setState('duplicate')
      } else if (message.includes('SURVEY_NOT_ACTIVE')) setState('closed')
      else if (
        [
          'INVALID_QUESTION',
          'INVALID_CHOICE',
          'MISSING_REQUIRED_ANSWER',
          'INVALID_PAYLOAD',
        ].some((code) => message.includes(code))
      )
        setError(
          'The survey could not accept these answers. Reload the survey and try again.',
        )
      else
        setError(
          'Unable to confirm your submission. Your selections are still here. Check your connection and try Submit again.',
        )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8">
      {state === 'loading' ? (
        <p role="status">Loading survey…</p>
      ) : state === 'success' ? (
        <section className="panel">
          <h1 className="text-3xl font-bold">Thank you!</h1>
          <p role="status" className="mt-4 text-lg">
            Your response has been recorded.
          </p>
        </section>
      ) : state === 'duplicate' ? (
        <section className="panel">
          <h1 className="text-2xl font-bold">Already submitted</h1>
          <p role="status" className="mt-4">
            You have already submitted a response to this survey.
          </p>
        </section>
      ) : state === 'closed' ? (
        <section className="panel">
          <h1 className="text-2xl font-bold">Survey closed</h1>
          <p className="mt-4">This survey is no longer accepting responses.</p>
        </section>
      ) : state === 'missing' ? (
        <h1 className="text-2xl font-bold">Survey not found.</h1>
      ) : state === 'error' ? (
        <section className="panel">
          <h1 className="text-2xl font-bold">Unable to load survey</h1>
          <p role="alert" className="my-4">
            Check your connection and try again.
          </p>
          <button
            className="button"
            onClick={() => {
              setState('loading')
              setReload((n) => n + 1)
            }}
          >
            Try again
          </button>
        </section>
      ) : (
        survey && (
          <>
            <h1 className="break-words text-3xl font-bold">{survey.title}</h1>
            {survey.description && (
              <p className="mt-4 whitespace-pre-wrap break-words text-lg text-slate-600">
                {survey.description}
              </p>
            )}
            {storageError && (
              <p role="alert" className="error mt-5">
                Browser storage is unavailable for this site. Enable site
                storage, then reload before submitting.
              </p>
            )}
            {error && (
              <p role="alert" className="error mt-5">
                {error}
              </p>
            )}
            <form className="mt-7 space-y-6" onSubmit={submit} noValidate>
              <fieldset disabled={busy || storageError} className="space-y-6">
                {survey.questions.map((q, qi) => (
                  <div className="panel min-w-0" key={q.id}>
                    <fieldset
                      className="min-w-0"
                      aria-describedby={
                        missing.includes(q.id) ? `missing-${q.id}` : undefined
                      }
                    >
                      <legend className="mb-4 max-w-full break-words p-0 text-lg font-bold">
                        {qi + 1}. {q.question_text}
                      </legend>
                      <div className="space-y-3">
                        {q.choices.map((c) => (
                          <label
                            key={c.id}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 p-3 has-checked:border-blue-700 has-checked:bg-blue-50"
                          >
                            <input
                              type="radio"
                              className="h-5 w-5 shrink-0"
                              name={q.id}
                              value={c.id}
                              checked={answers[q.id] === c.id}
                              onChange={() => {
                                setAnswers((old) => ({ ...old, [q.id]: c.id }))
                                setMissing((old) =>
                                  old.filter((id) => id !== q.id),
                                )
                              }}
                              required
                            />
                            <span className="min-w-0 break-words">
                              {c.choice_text}
                            </span>
                          </label>
                        ))}
                      </div>
                      {missing.includes(q.id) && (
                        <p
                          id={`missing-${q.id}`}
                          className="mt-3 text-sm text-red-800"
                        >
                          Choose an answer for this question.
                        </p>
                      )}
                    </fieldset>
                  </div>
                ))}
                <button
                  className="button primary min-h-12 w-full text-base"
                  type="submit"
                  disabled={survey.questions.length === 0}
                >
                  {busy ? 'Submitting…' : 'Submit'}
                </button>
              </fieldset>
            </form>
          </>
        )
      )}
    </main>
  )
}
