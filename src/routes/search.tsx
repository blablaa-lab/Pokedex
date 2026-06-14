import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { CardThumb } from '../components/CardThumb'
import { AddToPokedexDialog } from '../components/AddToPokedexDialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export const Route = createFileRoute('/search')({ component: SearchPage })

function SearchPage() {
  const [text, setText] = useState('')
  const [setId, setSetId] = useState('')
  const [localId, setLocalId] = useState('')

  const hasCriteria = text.trim() !== '' || setId.trim() !== '' || localId.trim() !== ''
  const results = useQuery(
    api.cards.search,
    hasCriteria
      ? {
          text: text.trim() || undefined,
          setId: setId.trim() || undefined,
          localId: localId.trim() || undefined,
        }
      : 'skip',
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recherche</h1>
        <p className="text-sm text-muted-foreground">
          Nom FR ou EN (« Dracaufeu » ou « Charizard »), filtre par set et numéro.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="text">Nom (FR ou EN)</Label>
          <Input
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dracaufeu, Charizard…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="set">Set (id)</Label>
          <Input
            id="set"
            value={setId}
            onChange={(e) => setSetId(e.target.value)}
            placeholder="base1, sv03…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="num">Numéro de collecteur</Label>
          <Input
            id="num"
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            placeholder="4, 125…"
          />
        </div>
      </div>

      {!hasCriteria ? (
        <p className="text-muted-foreground">Saisis un critère pour lancer la recherche.</p>
      ) : results === undefined ? (
        <p className="text-muted-foreground">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground">Aucun résultat.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((card) => (
            <div key={card._id} className="space-y-2">
              <CardThumb card={card} />
              <AddToPokedexDialog card={card} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
