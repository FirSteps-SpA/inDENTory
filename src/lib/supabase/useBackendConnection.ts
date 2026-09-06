import { useEffect } from 'react'
import { getSupabaseStatus } from './index'
import { useAppStore } from '../../stores/appStore'

/**
 * Dev-visible connection confirmation for User Story 2: on mount, attempts a
 * lightweight Supabase call and logs the outcome to the browser console
 * (success or the specific config/network error) and mirrors it into the
 * Zustand store. Intentionally console-only, not a UI element — this feature
 * doesn't add new domain UI, only the connectivity wiring.
 */
export function useBackendConnection() {
  const setBackendConnected = useAppStore((s) => s.setBackendConnected)

  useEffect(() => {
    const { client, error } = getSupabaseStatus()

    if (error) {
      console.warn(`[inDENTory] Backend no configurado: ${error.message}`)
      setBackendConnected(false)
      return
    }

    client.auth
      .getSession()
      .then(({ error: sessionError }) => {
        if (sessionError) {
          console.error(
            `[inDENTory] No se pudo conectar a Supabase: ${sessionError.message}`,
          )
          setBackendConnected(false)
          return
        }
        console.info('[inDENTory] Conectado a Supabase.')
        setBackendConnected(true)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[inDENTory] No se pudo conectar a Supabase: ${message}`)
        setBackendConnected(false)
      })
  }, [setBackendConnected])
}
