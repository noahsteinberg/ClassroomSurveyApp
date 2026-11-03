import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import ConfirmAction from '../components/ConfirmAction'

type PresentedSurvey = {
  id: string
  title: string
  status: string
  public_slug: string | null
}
export default function PresentSurveyPage() {
  const { id } = useParams()
  return <Presentation key={id} id={id ?? ''} />
}
function Presentation({ id }: { id: string }) {
  const [survey, setSurvey] = useState<PresentedSurvey | null>(null)
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [qrError, setQrError] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const pending = useRef(false)
  const url = survey?.public_slug
    ? new URL(`/s/${survey.public_slug}`, window.location.origin).href
    : ''
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let inFlight = false
    async function poll() {
      if (controller.signal.aborted || document.hidden || inFlight) return
      inFlight = true
      try {
        const { data, error: loadError } = await supabase!
          .from('surveys')
          .select('id,title,status,public_slug')
          .eq('id', id)
          .abortSignal(controller.signal)
          .maybeSingle()
        if (controller.signal.aborted) return
        if (loadError || !data) throw new Error('Survey unavailable')
        setSurvey(data)
        if (data.status === 'active') {
          const { count: total, error: countError } = await supabase!
            .from('responses')
            .select('id', { count: 'exact', head: true })
            .eq('survey_id', id)
            .abortSignal(controller.signal)
          if (controller.signal.aborted) return
          if (countError) throw countError
          setCount(total ?? 0)
        }
        setError(null)
        if (data.status === 'active')
          timer = setTimeout(() => void poll(), 5000)
      } catch {
        if (!controller.signal.aborted) {
          setError(
            'Unable to refresh the presentation. Check your connection and try Refresh.',
          )
          timer = setTimeout(() => void poll(), 5000)
        }
      } finally {
        inFlight = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    function visibility() {
      if (timer) clearTimeout(timer)
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', visibility)
    void poll()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [id, refresh])
  useEffect(() => {
    if (!url) return
    let active = true
    void QRCode.toDataURL(url, {
      width: 640,
      margin: 4,
      errorCorrectionLevel: 'M',
    })
      .then((value) => {
        if (active) {
          setQr(value)
          setQrError(false)
        }
      })
      .catch(() => {
        if (active) setQrError(true)
      })
    return () => {
      active = false
    }
  }, [url])
  async function close() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      const { error: closeError } = await supabase!.rpc('close_survey', {
        p_survey_id: id,
      })
      if (closeError) throw closeError
      setSurvey((current) =>
        current ? { ...current, status: 'closed' } : null,
      )
      setError(null)
      setRefresh((n) => n + 1)
    } catch {
      setError(
        'Unable to close the survey. Refresh to check its current status and try again.',
      )
    } finally {
      pending.current = false
      setBusy(false)
      setConfirm(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setError(
        'Copy is unavailable in this browser. Select and copy the survey URL below.',
      )
    }
  }
  if (loading)
    return (
      <main className="page">
        <p role="status">Loading presentation…</p>
      </main>
    )
  return (
    <main className="page text-center">
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <Link className="button" to="/dashboard">
          Back to Dashboard
        </Link>
        <button
          className="button"
          onClick={() => setRefresh((n) => n + 1)}
          disabled={busy}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="error mb-5">
          {error}
        </p>
      )}
      {!survey ? (
        <h1 className="text-2xl font-bold">Survey unavailable</h1>
      ) : (
        <>
          <h1 className="break-words text-3xl font-bold sm:text-5xl">
            {survey.title}
          </h1>
          {survey.status !== 'active' ? (
            <p role="status" className="mt-8 text-xl">
              This survey is not accepting responses. Its QR presentation is no
              longer active.
            </p>
          ) : (
            <>
              {qr && !qrError ? (
                <img
                  className="mx-auto mt-6 w-full max-w-[480px] rounded-xl bg-white"
                  src={qr}
                  alt="QR code linking to the student survey"
                  width={640}
                  height={640}
                />
              ) : (
                <p role="status" className="my-8">
                  {qrError
                    ? 'QR code could not be generated. Use the survey URL below.'
                    : 'Generating QR code…'}
                </p>
              )}
              <a
                className="mt-4 block break-all text-xl font-semibold text-blue-800 underline sm:text-2xl"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {url}
              </a>
              {['localhost', '127.0.0.1', '[::1]'].includes(
                window.location.hostname,
              ) && (
                <p className="mx-auto mt-3 max-w-xl text-sm text-amber-900">
                  This local link works on this computer. Phone scanning needs a
                  reachable shared or deployed address.
                </p>
              )}
              <p className="my-6 text-3xl font-bold" aria-live="polite">
                Responses: {count ?? '—'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button className="button" onClick={() => void copy()}>
                  {copied ? 'URL copied' : 'Copy URL'}
                </button>
                {qr && !qrError && (
                  <a
                    className="button"
                    href={qr}
                    download={`survey-${id}-qr.png`}
                  >
                    Download QR Code
                  </a>
                )}
                <Link className="button" to={`/surveys/${id}/results`}>
                  View Results
                </Link>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  Close Survey
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Response count refreshes every five seconds while this page is
                visible.
              </p>
            </>
          )}
        </>
      )}
      {confirm && survey && (
        <ConfirmAction
          action="close"
          title={survey.title}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void close()}
        />
      )}
    </main>
  )
}
