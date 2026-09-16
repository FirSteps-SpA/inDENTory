import { useState, type FormEvent } from 'react'
import { useLogin } from './useLogin'
import { Mail, Lock, Tooth } from '../../components/icons'
import { IconField } from '../../components/ui/IconField'
import { TouchButton } from '../../components/ui/TouchButton'

/** Email/password login form. Every control meets the ≥48x48px touch-target
 * convention (Constitution III, spec FR-007) via `IconField`/`TouchButton`. */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, error, isPending } = useLogin()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void signIn(email, password)
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark">
          <Tooth size={30} className="text-white" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-text">
          inDENTory
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 text-left">
      <IconField label="Correo" icon={<Mail size={18} />} htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>
      <IconField
        label="Contraseña"
        icon={<Lock size={18} />}
        htmlFor="login-password"
      >
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>
      {error && (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        </div>
      )}
      <TouchButton type="submit" disabled={isPending}>
        {isPending ? 'Ingresando…' : 'Ingresar'}
      </TouchButton>
      </form>
    </div>
  )
}
