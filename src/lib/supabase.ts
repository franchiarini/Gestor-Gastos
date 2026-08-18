import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  throw new Error('La variable de entorno VITE_SUPABASE_URL no está definida.')
}

if (!supabasePublishableKey) {
  throw new Error('La variable de entorno VITE_SUPABASE_PUBLISHABLE_KEY no está definida.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
