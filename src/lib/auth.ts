import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export const AuthContext = createContext<{
  session: Session | null
  loading: boolean
  error: string | null
} | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider required')
  return value
}
