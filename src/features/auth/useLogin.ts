import { useState } from 'react'
import { getSupabaseStatus } from '../../lib/supabase'
import { fetchPerfilPropio } from '../../lib/supabase/perfiles'
import { useAuthStore } from '../../stores/authStore'

/**
 * Single generic message for every failure branch (bad password, unknown
 * email, missing perfil row, unconfigured backend) — never reveals whether
 * an email is registered (spec FR-005).
 */
const GENERIC_ERROR = 'Correo o contraseña incorrectos.'

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function signIn(email: string, password: string) {
    setError(null)
    setIsPending(true)
    try {
      const { client, error: configError } = getSupabaseStatus()
      if (configError) {
        setError(GENERIC_ERROR)
        return
      }

      const { data, error: signInError } = await client.auth.signInWithPassword(
        {
          email,
          password,
        },
      )
      if (signInError || !data.user) {
        setError(GENERIC_ERROR)
        return
      }

      const perfil = await fetchPerfilPropio(client, data.user.id)
      if (!perfil) {
        setError(GENERIC_ERROR)
        return
      }

      await login({
        id: data.user.id,
        email: data.user.email ?? email,
        nombre: perfil.nombre,
        rol: perfil.rol,
        autenticadoEn: new Date().toISOString(),
      })
    } finally {
      setIsPending(false)
    }
  }

  return { signIn, error, isPending }
}
