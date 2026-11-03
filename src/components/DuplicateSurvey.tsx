import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadDuplicate } from '../lib/duplication'
import { supabase } from '../lib/supabase'
import type { Draft } from '../lib/draft'

export default function DuplicateSurvey({
  id,
  disabled,
}: {
  id: string
  disabled: boolean
}) {
  const navigate = useNavigate()
  const pending = useRef(false)
  const attempt = useRef<{ draft: Draft; requestId: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(false)
  async function duplicate() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (!attempt.current)
        attempt.current = {
          draft: await loadDuplicate(id, new AbortController().signal),
          requestId: crypto.randomUUID(),
        }
      const { draft, requestId } = attempt.current
      const { data, error: saveError } = await supabase!.rpc(
        'save_draft_survey',
        {
          p_survey_id: draft.id,
          p_expected_updated_at: null,
          p_request_id: requestId,
          p_title: draft.title,
          p_description: draft.description,
          p_questions: draft.questions,
        },
      )
      if (saveError || data?.id !== draft.id)
        throw new Error(
          'Unable to confirm the copy was saved. Retry duplication to safely recover the same copy.',
        )
      navigate(`/surveys/${draft.id}/edit`)
    } catch (cause) {
      setRetry(Boolean(attempt.current))
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to duplicate survey. Try again.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        className="button"
        disabled={disabled || busy}
        onClick={() => void duplicate()}
      >
        {busy
          ? 'Duplicating…'
          : error && retry
            ? 'Retry duplication'
            : 'Duplicate'}
      </button>
      {error && (
        <p className="error mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
