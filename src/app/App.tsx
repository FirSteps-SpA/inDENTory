import { useEffect } from 'react'
import { useBackendConnection } from '../lib/supabase/useBackendConnection'
import { useAuthStore } from '../stores/authStore'
import { LoginForm } from '../features/auth/LoginForm'
import { useLogout } from '../features/auth/useLogout'

function App() {
  useBackendConnection()
  const { signOut } = useLogout()

  // Boot guard: reads only the local Dexie cache (authStore.hydrate), never
  // a live Supabase call, so login-vs-app-shell is never gated on network
  // (spec FR-002/FR-006, research.md's offline-durable session decision).
  const usuario = useAuthStore((s) => s.usuario)
  const isReady = useAuthStore((s) => s.isReady)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">inDENTory</h1>
      {!isReady ? (
        <p className="text-sm text-gray-600">Cargando…</p>
      ) : !usuario ? (
        <LoginForm />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-600">
            Sesión iniciada como {usuario.nombre}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="touch-target rounded border border-gray-300 px-4"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </main>
  )
}

export default App
