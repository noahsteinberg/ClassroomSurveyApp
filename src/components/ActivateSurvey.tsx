import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { activationError } from '../lib/activation'
import ConfirmAction from './ConfirmAction'

export default function ActivateSurvey({
  id,
  title,
  disabled = false,
}: {
  id: string
  title: string
  disabled?: boolean
}) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  async function activate() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase!.rpc('activate_survey', {
        p_survey_id: id,
      })
      if (rpcError) throw rpcError
      if (!data?.id || !data.public_slug)
        throw new Error('Invalid activation result')
      navigate(`/surveys/${id}/present`)
    } catch (reason) {
      const message =
        reason && typeof reason === 'object' && 'message' in reason
          ? String(reason.message)
          : ''
      setError(activationError(message))
    } finally {
      pending.current = false
      setBusy(false)
      setConfirm(false)
    }
  }
  return (
    <div>
      <button
        type="button"
        className="button"
        disabled={disabled || busy}
        onClick={() => {
          setError(null)
          setConfirm(true)
        }}
      >
        Activate
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-lg text-sm text-red-800">
          {error}
        </p>
      )}
      {confirm && (
        <ConfirmAction
          action="activate"
          title={title}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void activate()}
        />
      )}
    </div>
  )
}
