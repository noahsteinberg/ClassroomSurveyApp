import { useEffect, useRef } from 'react'

export type SurveyAction = 'close' | 'archive' | 'delete' | 'activate'
export default function ConfirmAction({
  action,
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  action: SurveyAction
  title: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  const verb = action[0].toUpperCase() + action.slice(1)
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <h2 id="confirm-title" className="text-xl font-bold">
        {verb} “{title}”?
      </h2>
      <p id="confirm-description" className="mt-3 text-slate-600">
        {action === 'activate'
          ? 'Students will be able to submit to this survey. Any currently active survey will close automatically. Collected content cannot be edited after activation.'
          : action === 'delete'
            ? 'This permanently deletes the survey, its questions, and all student responses. This cannot be undone. Archive a closed survey instead to preserve its results.'
            : action === 'close'
              ? 'Students will no longer be able to submit. Collected questions and responses stay available.'
              : 'The survey will move to Archived. Its questions and responses will be preserved.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus className="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={`button ${action === 'delete' ? 'danger' : 'primary'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Working…' : `${verb} survey`}
        </button>
      </div>
    </dialog>
  )
}
