import { create } from 'zustand'
import { liveQuery } from 'dexie'
import { db } from '../lib/db'

/**
 * Reactive clinic-name configuration (Constitution II), kept in sync with
 * Dexie via `liveQuery` — same pattern as `alertasStore` (spec 004). `null`
 * (no row yet, or the configured name was empty) means the header falls
 * back to the default label "Gabinete" (spec 010 FR-020/021).
 */
interface ClinicaState {
  nombreClinica: string | null
  isReady: boolean
  subscribe: () => () => void
}

export const useClinicaStore = create<ClinicaState>((set) => ({
  nombreClinica: null,
  isReady: false,
  subscribe: () => {
    const sub = liveQuery(() => db.configuracionClinica.get('global')).subscribe({
      next: (config) =>
        set({ nombreClinica: config?.nombre ?? null, isReady: true }),
    })
    return () => sub.unsubscribe()
  },
}))
