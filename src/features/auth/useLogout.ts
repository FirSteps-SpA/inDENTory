import { getSupabaseStatus } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)

  async function signOut() {
    try {
      const { client, error } = getSupabaseStatus()
      if (!error) {
        // Local-scope sign-out never requires network (research.md); still
        // guarded so any failure never blocks the local logout below
        // (spec FR-004 — logout must work offline).
        await client.auth.signOut({ scope: 'local' })
      }
    } catch {
      // Ignored — logout must succeed locally regardless of this outcome.
    }
    await logout()
  }

  return { signOut }
}
