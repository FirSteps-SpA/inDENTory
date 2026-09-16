import type { SupabaseClient } from '@supabase/supabase-js'

export interface Perfil {
  id: string
  nombre: string
  rol: 'administrador' | 'personal'
}

/**
 * Reads the caller's own `perfiles` row (contracts/supabase-schema.md — RLS
 * restricts reads to `id = auth.uid()`). Returns `null` on any failure so
 * callers can fold it into the single generic login error (spec FR-005)
 * without distinguishing the reason.
 */
export async function fetchPerfilPropio(
  client: SupabaseClient,
  userId: string,
): Promise<Perfil | null> {
  const { data, error } = await client
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as Perfil
}
