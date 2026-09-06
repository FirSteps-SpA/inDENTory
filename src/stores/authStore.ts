import { create } from 'zustand'
import { db, type UsuarioActual } from '../lib/db'

/**
 * Auth state (Constitution II: single reactive source). `hydrate` reads only
 * from Dexie — never a live Supabase call — so offline app access is never
 * gated on network (spec FR-002/FR-006, research.md's offline-durable
 * session decision).
 */
interface AuthState {
  usuario: UsuarioActual | null
  isReady: boolean
  hydrate: () => Promise<void>
  login: (usuario: UsuarioActual) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isReady: false,
  hydrate: async () => {
    try {
      const usuario = (await db.usuarioActual.toCollection().first()) ?? null
      set({ usuario, isReady: true })
    } catch {
      // IndexedDB unavailable (e.g. private browsing) — degrade to the login
      // screen rather than crashing the boot guard.
      set({ usuario: null, isReady: true })
    }
  },
  login: async (usuario) => {
    await db.usuarioActual.clear()
    await db.usuarioActual.add(usuario)
    set({ usuario, isReady: true })
  },
  logout: async () => {
    await db.usuarioActual.clear()
    set({ usuario: null, isReady: true })
  },
}))

/**
 * Stable accessor for the attributed user id — future inventory features
 * (002) MUST read this for `Movimiento.usuarioId` (spec FR-003).
 */
export function getUsuarioActualId(): string | undefined {
  return useAuthStore.getState().usuario?.id
}
