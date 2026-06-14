import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/pokedexes')({ component: Pokedexes })

function Pokedexes() {
  const pokedexes = useQuery(api.pokedexes.list)
  const create = useMutation(api.pokedexes.create)
  const remove = useMutation(api.pokedexes.remove)
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await create({ name: trimmed })
    setName('')
    toast.success(`Classeur « ${trimmed} » créé`)
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Mes classeurs</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du classeur"
          className="h-12 rounded-xl"
        />
        <Button type="submit" className="h-12 shrink-0 rounded-full bg-rouge px-5 hover:bg-rouge-deep">
          <Plus className="size-4" /> Créer
        </Button>
      </form>

      {pokedexes === undefined ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : pokedexes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun classeur pour l'instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {pokedexes.map((p) => (
            <li
              key={p._id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5"
            >
              <span className="font-display font-bold">{p.name}</span>
              <button
                onClick={async () => {
                  await remove({ pokedexId: p._id })
                  toast.success('Classeur supprimé')
                }}
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-rouge/10 hover:text-rouge"
                aria-label="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
