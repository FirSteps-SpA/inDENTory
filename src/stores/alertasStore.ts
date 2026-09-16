import { create } from 'zustand'
import { liveQuery } from 'dexie'
import { db } from '../lib/db'

/** data-model.md's default when no administrador has ever saved a value (FR-005). */
export const NIVELES_AVISO_POR_DEFECTO: number[] = [30, 7, 1]

/**
 * Reactive global caducidad-warning configuration (Constitution II), kept in
 * sync with Dexie via `liveQuery`. Falls back to
 * `NIVELES_AVISO_POR_DEFECTO` when no `configuracionAlertas` row exists yet
 * (data-model.md's Bootstrapping) — no row is written until an
 * administrador explicitly saves a change.
 */
interface AlertasState {
  nivelesAvisoDias: number[]
  isReady: boolean
  subscribe: () => () => void
}

export const useAlertasStore = create<AlertasState>((set) => ({
  nivelesAvisoDias: NIVELES_AVISO_POR_DEFECTO,
  isReady: false,
  subscribe: () => {
    const sub = liveQuery(() =>
      db.configuracionAlertas.get('global'),
    ).subscribe({
      next: (config) =>
        set({
          nivelesAvisoDias: config?.nivelesAvisoDias ?? NIVELES_AVISO_POR_DEFECTO,
          isReady: true,
        }),
    })
    return () => sub.unsubscribe()
  },
}))
