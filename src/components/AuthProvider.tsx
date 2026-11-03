import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../lib/auth'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    session: Session | null
    loading: boolean
    error: string | null
  }>({ session: null, loading: true, error: null })
  useEffect(() => {
    const client = supabase
    if (!client) return
    let mounted = true
    let eventReceived = false
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      eventReceived = true
      if (mounted) setState({ session, loading: false, error: null })
    })
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (mounted && !eventReceived)
          setState({
            session: data.session,
            loading: false,
            error: error
              ? 'Unable to restore your session. Please reload and try again.'
              : null,
          })
      })
      .catch(() => {
        if (mounted && !eventReceived)
          setState({
            session: null,
            loading: false,
            error:
              'Unable to restore your session. Please reload and try again.',
          })
      })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
