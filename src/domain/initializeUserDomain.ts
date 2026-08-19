import { supabase } from '../lib/supabase'

export async function initializeUserDomain() {
  const { error } = await supabase.rpc('initialize_user_domain')

  if (error) {
    throw new Error(`No se pudo preparar tu espacio: ${error.message}`)
  }
}
