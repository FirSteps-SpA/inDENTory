import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../../../src/app/App'
import { useAuthStore } from '../../../src/stores/authStore'

const signInWithPassword = vi.fn()
const getSession = vi.fn(() => Promise.reject(new Error('sin conexión')))

vi.mock('../../../src/lib/supabase', () => ({
  getSupabaseStatus: () => ({
    client: { auth: { signInWithPassword, getSession } },
    error: null,
  }),
}))

vi.mock('../../../src/lib/db', () => ({
  db: {
    usuarioActual: {
      toCollection: () => ({
        first: async () => ({
          id: 'user-1',
          email: 'ana@example.com',
          nombre: 'Ana Pérez',
          rol: 'personal',
          autenticadoEn: '2026-01-01T00:00:00.000Z',
        }),
      }),
      clear: vi.fn(),
      add: vi.fn(),
    },
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ usuario: null, isReady: false })
})

describe('offline continuity', () => {
  it('renders the app shell (not the login form) from a pre-populated local session, with no network call', async () => {
    render(<App />)

    expect(
      await screen.findByText(/Sesión iniciada como Ana Pérez/),
    ).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})
