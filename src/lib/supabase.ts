import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase =
  url?.startsWith('https://') && key?.startsWith('sb_publishable_')
    ? createClient(url, key)
    : null

// Student pages must never inherit an instructor session from this browser.
export const publicSupabase =
  url?.startsWith('https://') && key?.startsWith('sb_publishable_')
    ? createClient(url, key, {
        auth: {
          storageKey: 'classroom-survey-public',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null
