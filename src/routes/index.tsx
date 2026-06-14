import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
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
    toast.success(`Pokédex « ${trimmed} » créé`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes pokédex</h1>
        <p className="text-sm text-muted-foreground">
          Catalogue partagé de 23 409 cartes — organise ta collection.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom d'un nouveau pokédex"
          className="max-w-xs"
        />
        <Button type="submit">Créer</Button>
      </form>

      {pokedexes === undefined ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : pokedexes.length === 0 ? (
        <p className="text-muted-foreground">
          Aucun pokédex. Crées-en un, puis ajoute des cartes via la{' '}
          <Link to="/search" className="underline">
            recherche
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pokedexes.map((p) => (
            <li
              key={p._id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <Link
                to="/pokedex/$pokedexId"
                params={{ pokedexId: p._id }}
                className="font-medium hover:underline"
              >
                {p.name}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await remove({ pokedexId: p._id })
                  toast.success('Pokédex supprimé')
                }}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
