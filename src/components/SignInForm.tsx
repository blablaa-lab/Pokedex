import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

// Connexion / inscription email + mot de passe (provider Password de Convex Auth).
export function SignInForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setSubmitting(true)
    try {
      await signIn('password', { email, password, flow })
    } catch {
      toast.error(
        flow === 'signIn'
          ? 'Connexion impossible — vérifie tes identifiants.'
          : "Inscription impossible — l'email est peut-être déjà utilisé.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">PokéDex Scanner</h1>
          <p className="text-sm text-muted-foreground">
            {flow === 'signIn' ? 'Connexion à ta collection' : 'Crée ton compte'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '…' : flow === 'signIn' ? 'Se connecter' : "S'inscrire"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {flow === 'signIn'
            ? 'Pas de compte ? Inscris-toi'
            : 'Déjà un compte ? Connecte-toi'}
        </button>
      </div>
    </div>
  )
}
