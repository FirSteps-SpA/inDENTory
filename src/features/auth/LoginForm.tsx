import { useState, type FormEvent } from 'react'
import { useLogin } from './useLogin'

/** Email/password login form. Every control meets the ≥48x48px touch-target
 * convention (Constitution III, spec FR-007) via the shared `touch-target`
 * utility. */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, error, isPending } = useLogin()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void signIn(email, password)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xs flex-col gap-3 text-left"
    >
      <label className="flex flex-col gap-1 text-sm">
        Correo
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="touch-target rounded bg-slate-900 px-4 text-white disabled:opacity-50"
      >
        {isPending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
