import { create } from 'zustand'

/**
 * Base app-shell store. Constitution II mandates Zustand as the single
 * reactive state source — domain stores (inventory, batches, alerts) added by
 * future features should follow this same pattern rather than introducing
 * Redux/nested Context state.
 */
interface AppState {
  isBackendConnected: boolean
  setBackendConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isBackendConnected: false,
  setBackendConnected: (connected) => set({ isBackendConnected: connected }),
}))
