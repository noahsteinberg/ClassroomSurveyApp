import { useEffect, useRef, useState } from 'react'

export default function EditorDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [returnFocus] = useState(
    () => document.activeElement as HTMLElement | null,
  )
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (returnFocus?.isConnected) returnFocus.focus()
      else document.getElementById('main-content')?.focus()
    }
  }, [returnFocus])
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="editor-dialog-title"
      aria-describedby="editor-dialog-description"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
    >
      <h2 className="text-xl font-bold" id="editor-dialog-title">
        {title}
      </h2>
      <p id="editor-dialog-description" className="mt-3 text-slate-600">
        {message}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="button danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
