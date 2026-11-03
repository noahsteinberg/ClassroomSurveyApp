import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { blankDraft, draftErrors, moveItem, newChoices } from '../lib/draft'
import type { Draft, DraftQuestion } from '../lib/draft'
import EditorDialog from '../components/EditorDialog'
import ActivateSurvey from '../components/ActivateSurvey'

export default function SurveyEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [baseline, setBaseline] = useState(() => '')
  const [loading, setLoading] = useState(Boolean(id))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [readonly, setReadonly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(Boolean(location.state?.draftSaved))
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    action: () => void
  } | null>(null)
  const retry = useRef<{ signature: string; requestId: string } | null>(null)
  const allowNavigation = useRef(false)
  const busyRef = useRef(false)
  const dirty =
    !loading &&
    !loadError &&
    !readonly &&
    (baseline
      ? JSON.stringify(draft) !== baseline
      : Boolean(draft.title || draft.description || draft.questions.length))
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigation.current &&
      (dirty || busy) &&
      currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    void supabase!
      .from('surveys')
      .select(
        'id,title,description,status,updated_at,questions(id,question_text,question_type,position,choices(id,choice_text,position))',
      )
      .eq('id', id)
      .abortSignal(controller.signal)
      .maybeSingle()
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        if (error || !data)
          setLoadError(
            'This survey could not be loaded. It may no longer exist. Return to the dashboard and try again.',
          )
        else if (data.status !== 'draft') setReadonly(true)
        else {
          const value: Draft = {
            id: data.id,
            title: data.title,
            description: data.description ?? '',
            updated_at: data.updated_at,
            questions: [...data.questions]
              .sort((a, b) => a.position - b.position)
              .map((q) => ({
                id: q.id,
                question_text: q.question_text,
                question_type:
                  q.question_type as DraftQuestion['question_type'],
                choices: [...q.choices]
                  .sort((a, b) => a.position - b.position)
                  .map((c) => ({ id: c.id, choice_text: c.choice_text })),
              })),
          }
          setDraft(value)
          setBaseline(JSON.stringify(value))
        }
        setLoading(false)
      })
    return () => controller.abort()
  }, [id])
  useEffect(() => {
    if (!dirty && !busy) return
    function warn(event: BeforeUnloadEvent) {
      if (allowNavigation.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  function change(value: Draft) {
    allowNavigation.current = false
    setDraft(value)
    setSaved(false)
    setSaveError(null)
  }
  function updateQuestion(question: DraftQuestion) {
    change({
      ...draft,
      questions: draft.questions.map((q) =>
        q.id === question.id ? question : q,
      ),
    })
  }
  function ask(
    title: string,
    message: string,
    confirmLabel: string,
    action: () => void,
  ) {
    setDialog({ title, message, confirmLabel, action })
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busyRef.current) return
    const invalid = draftErrors(draft)
    setErrors(invalid)
    setSaveError(null)
    setSaved(false)
    if (Object.keys(invalid).length) {
      const first = Object.keys(invalid)[0]
      const field =
        first === 'title'
          ? document.getElementById('survey-title')
          : (document.getElementById(`q-${first}`) ??
            document.getElementById(`c-${first}`))
      field?.focus()
      setSaveError(
        'Check the highlighted fields. Your changes have not been saved.',
      )
      return
    }
    const normalized = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      questions: draft.questions.map((q) => ({
        ...q,
        question_text: q.question_text.trim(),
        choices: q.choices.map((c) => ({
          ...c,
          choice_text: c.choice_text.trim(),
        })),
      })),
    }
    const signature = JSON.stringify(normalized)
    if (retry.current?.signature !== signature)
      retry.current = { signature, requestId: crypto.randomUUID() }
    busyRef.current = true
    setBusy(true)
    try {
      const { data, error } = await supabase!.rpc('save_draft_survey', {
        p_survey_id: normalized.id,
        p_expected_updated_at: normalized.updated_at,
        p_request_id: retry.current.requestId,
        p_title: normalized.title,
        p_description: normalized.description,
        p_questions: normalized.questions,
      })
      if (error) throw error
      const value = { ...normalized, updated_at: data.updated_at as string }
      setDraft(value)
      setBaseline(JSON.stringify(value))
      retry.current = null
      setSaved(true)
      if (!id) {
        allowNavigation.current = true
        navigate(`/surveys/${value.id}/edit`, {
          replace: true,
          state: { draftSaved: true },
        })
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : ''
      setSaveError(
        message.includes('DRAFT_CONFLICT')
          ? 'This draft changed in another tab. Your edits are still here. Reload the saved draft before making further changes; reloading will discard these unsaved edits.'
          : message.includes('DRAFT_ONLY_EDITING')
            ? 'This survey is no longer a draft and cannot be edited. Your unsaved text is still here.'
            : message.includes('SURVEY_NOT_FOUND')
              ? 'This survey was deleted. Your unsaved text is still here.'
              : 'Unable to save. Your changes are still here. Check your connection and retry Save Draft.',
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  if (loading)
    return (
      <main id="main-content" tabIndex={-1} className="page">
        <p role="status">Loading draft…</p>
      </main>
    )
  if (loadError || readonly)
    return (
      <main id="main-content" tabIndex={-1} className="page">
        <h1 className="text-2xl font-bold">
          {readonly ? 'Draft editing only' : 'Survey unavailable'}
        </h1>
        <p role="alert" className="my-4">
          {loadError ??
            'Active, closed, and archived surveys cannot be edited. Their collected content is preserved.'}
        </p>
        <Link className="button" to="/dashboard">
          Back to Dashboard
        </Link>
      </main>
    )
  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">
          {id ? 'Edit draft survey' : 'New survey'}
        </h1>
        <Link className="button" to="/dashboard">
          Back to Dashboard
        </Link>
      </header>
      <p className="mb-5 text-slate-600">
        Save your work as a draft. Drafts can have no questions or fewer than
        two multiple-choice options. Fill in or remove blank fields before
        saving. Activation will require at least one complete question.
      </p>
      {saveError && (
        <div className="error mb-5">
          <p role="alert">{saveError}</p>
          {saveError.startsWith('This draft changed') && (
            <button
              type="button"
              className="button mt-3"
              disabled={busy}
              onClick={() =>
                ask(
                  'Reload saved draft?',
                  'Your unsaved changes will be discarded.',
                  'Reload draft',
                  () => {
                    allowNavigation.current = true
                    window.location.reload()
                  },
                )
              }
            >
              Reload saved draft
            </button>
          )}
        </div>
      )}
      {saved && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-emerald-50 p-4 text-emerald-900"
        >
          Draft saved.
        </p>
      )}
      <form onSubmit={save} noValidate>
        <fieldset disabled={busy} className="space-y-6">
          <section className="panel space-y-5">
            <div>
              <label className="label" htmlFor="survey-title">
                Survey title
              </label>
              <input
                id="survey-title"
                className="input"
                value={draft.title}
                onChange={(e) => change({ ...draft, title: e.target.value })}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" className="mt-2 text-sm text-red-800">
                  {errors.title}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="description">
                Description (optional)
              </label>
              <textarea
                id="description"
                className="input"
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  change({ ...draft, description: e.target.value })
                }
              />
            </div>
          </section>
          {draft.questions.map((q, qi) => (
            <section
              className="panel space-y-4"
              key={q.id}
              aria-label={`Question ${qi + 1}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Question {qi + 1}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button"
                    disabled={qi === 0}
                    aria-label={`Move question ${qi + 1} up`}
                    onClick={() =>
                      change({
                        ...draft,
                        questions: moveItem(draft.questions, qi, -1),
                      })
                    }
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={qi === draft.questions.length - 1}
                    aria-label={`Move question ${qi + 1} down`}
                    onClick={() =>
                      change({
                        ...draft,
                        questions: moveItem(draft.questions, qi, 1),
                      })
                    }
                  >
                    Move down
                  </button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor={`q-${q.id}`}>
                  Question text
                </label>
                <textarea
                  id={`q-${q.id}`}
                  className="input"
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion({ ...q, question_text: e.target.value })
                  }
                  aria-invalid={Boolean(errors[q.id])}
                  aria-describedby={errors[q.id] ? `error-${q.id}` : undefined}
                />
                {errors[q.id] && (
                  <p id={`error-${q.id}`} className="text-sm text-red-800">
                    {errors[q.id]}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor={`type-${q.id}`}>
                  Question type
                </label>
                <select
                  id={`type-${q.id}`}
                  className="input"
                  value={q.question_type}
                  onChange={(e) => {
                    const type = e.target
                      .value as DraftQuestion['question_type']
                    if (type !== q.question_type)
                      ask(
                        'Change question type?',
                        'Changing the type replaces this question’s answer choices.',
                        'Replace choices',
                        () =>
                          updateQuestion({
                            ...q,
                            question_type: type,
                            choices: newChoices(type),
                          }),
                      )
                  }}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Answer choices</h3>
                {q.choices.map((c, ci) => (
                  <div
                    className="rounded-lg border border-slate-200 p-3"
                    key={c.id}
                  >
                    <label className="label" htmlFor={`c-${c.id}`}>
                      Choice {ci + 1}
                    </label>
                    <input
                      className="input"
                      id={`c-${c.id}`}
                      readOnly={q.question_type === 'true_false'}
                      value={c.choice_text}
                      onChange={(e) =>
                        updateQuestion({
                          ...q,
                          choices: q.choices.map((choice) =>
                            choice.id === c.id
                              ? { ...choice, choice_text: e.target.value }
                              : choice,
                          ),
                        })
                      }
                      aria-invalid={Boolean(errors[c.id])}
                      aria-describedby={
                        errors[c.id] ? `error-${c.id}` : undefined
                      }
                    />
                    {errors[c.id] && (
                      <p id={`error-${c.id}`} className="text-sm text-red-800">
                        {errors[c.id]}
                      </p>
                    )}
                    {q.question_type === 'multiple_choice' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="button"
                          aria-label={`Move choice ${ci + 1} up in question ${qi + 1}`}
                          disabled={ci === 0}
                          onClick={() =>
                            updateQuestion({
                              ...q,
                              choices: moveItem(q.choices, ci, -1),
                            })
                          }
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className="button"
                          aria-label={`Move choice ${ci + 1} down in question ${qi + 1}`}
                          disabled={ci === q.choices.length - 1}
                          onClick={() =>
                            updateQuestion({
                              ...q,
                              choices: moveItem(q.choices, ci, 1),
                            })
                          }
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          className="button"
                          onClick={() =>
                            ask(
                              'Delete choice?',
                              'This answer choice will be removed when you save the draft.',
                              'Delete choice',
                              () =>
                                updateQuestion({
                                  ...q,
                                  choices: q.choices.filter(
                                    (choice) => choice.id !== c.id,
                                  ),
                                }),
                            )
                          }
                        >
                          Delete choice
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {q.question_type === 'multiple_choice' && (
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      updateQuestion({
                        ...q,
                        choices: [
                          ...q.choices,
                          { id: crypto.randomUUID(), choice_text: '' },
                        ],
                      })
                    }
                  >
                    Add Choice
                  </button>
                )}
              </div>
              <button
                type="button"
                className="button text-red-800"
                onClick={() =>
                  ask(
                    'Delete question?',
                    'The question and all its choices will be removed when you save the draft.',
                    'Delete question',
                    () =>
                      change({
                        ...draft,
                        questions: draft.questions.filter(
                          (question) => question.id !== q.id,
                        ),
                      }),
                  )
                }
              >
                Delete Question
              </button>
            </section>
          ))}
          <button
            type="button"
            className="button"
            onClick={() =>
              change({
                ...draft,
                questions: [
                  ...draft.questions,
                  {
                    id: crypto.randomUUID(),
                    question_text: '',
                    question_type: 'multiple_choice',
                    choices: newChoices('multiple_choice'),
                  },
                ],
              })
            }
          >
            Add Question
          </button>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
            <button className="button primary" type="submit">
              {busy ? 'Saving…' : 'Save Draft'}
            </button>
            <ActivateSurvey
              id={draft.id}
              title={draft.title}
              disabled={!id || dirty || busy}
            />
            <span className="text-sm text-slate-600">
              {dirty ? 'Unsaved changes' : 'No unsaved changes'}
            </span>
          </div>
          <p id="activation-later" className="text-sm text-slate-600">
            Save the draft before activating. Activation requires complete
            questions and choices.
          </p>
        </fieldset>
      </form>
      {dialog && (
        <EditorDialog
          {...dialog}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dialog.action()
            setDialog(null)
          }}
        />
      )}
      {blocker.state === 'blocked' && (
        <EditorDialog
          title={busy ? 'Save in progress' : 'Discard unsaved changes?'}
          message={
            busy
              ? 'Wait for the save to finish before leaving this page.'
              : 'Your changes have not been saved.'
          }
          confirmLabel={busy ? 'Stay here' : 'Discard changes'}
          onCancel={() => blocker.reset()}
          onConfirm={() => {
            if (busy) blocker.reset()
            else blocker.proceed()
          }}
        />
      )}
    </main>
  )
}
