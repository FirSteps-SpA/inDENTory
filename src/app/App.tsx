import { useEffect, useState } from 'react'
import { useBackendConnection } from '../lib/supabase/useBackendConnection'
import { startBackgroundSync } from '../lib/sync'
import { useAuthStore } from '../stores/authStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useAlertasStore } from '../stores/alertasStore'
import { LoginForm } from '../features/auth/LoginForm'
import { useLogout } from '../features/auth/useLogout'
import { RegistroForm } from '../features/insumos/components/RegistroForm'
import { ConsumoForm } from '../features/insumos/components/ConsumoForm'
import { AlertasView } from '../features/alertas/components/AlertasView'

type Vista = 'registro' | 'consumo' | 'alertas'

function App() {
  useBackendConnection()
  const { signOut } = useLogout()
  const [vista, setVista] = useState<Vista>('registro')
  const subscribeInventory = useInventoryStore((s) => s.subscribe)
  const subscribeAlertas = useAlertasStore((s) => s.subscribe)

  // Boot guard: reads only the local Dexie cache (authStore.hydrate), never
  // a live Supabase call, so login-vs-app-shell is never gated on network
  // (spec FR-002/FR-006, research.md's offline-durable session decision).
  const usuario = useAuthStore((s) => s.usuario)
  const isReady = useAuthStore((s) => s.isReady)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Inventory data (insumos/lotes/movimientos) and background sync only
  // matter once a user is authenticated locally — mirrors usuario's own
  // Dexie-first hydration, never gated on network (Constitution I).
  useEffect(() => {
    if (!usuario) return
    const unsubscribeInventory = subscribeInventory()
    const unsubscribeAlertas = subscribeAlertas()
    const stopSync = startBackgroundSync()
    return () => {
      unsubscribeInventory()
      unsubscribeAlertas()
      stopSync()
    }
  }, [usuario, subscribeInventory, subscribeAlertas])

  return (
    <main className="flex min-h-dvh flex-col items-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">inDENTory</h1>
      {!isReady ? (
        <p className="text-sm text-gray-600">Cargando…</p>
      ) : !usuario ? (
        <LoginForm />
      ) : (
        <div className="flex w-full max-w-md flex-col items-stretch gap-4 text-left">
          <div className="flex items-center justify-between">
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVista('registro')}
              aria-pressed={vista === 'registro'}
              className="touch-target flex-1 rounded border border-gray-300 px-4 aria-pressed:bg-slate-900 aria-pressed:text-white"
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => setVista('consumo')}
              aria-pressed={vista === 'consumo'}
              className="touch-target flex-1 rounded border border-gray-300 px-4 aria-pressed:bg-slate-900 aria-pressed:text-white"
            >
              Consumir
            </button>
            <button
              type="button"
              onClick={() => setVista('alertas')}
              aria-pressed={vista === 'alertas'}
              className="touch-target flex-1 rounded border border-gray-300 px-4 aria-pressed:bg-slate-900 aria-pressed:text-white"
            >
              Alertas
            </button>
          </div>

          {vista === 'registro' && <RegistroForm />}
          {vista === 'consumo' && <ConsumoForm />}
          {vista === 'alertas' && <AlertasView />}
        </div>
      )}
    </main>
  )
}

export default App
