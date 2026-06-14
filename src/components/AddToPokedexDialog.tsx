import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

const CONDITIONS = ['NM', 'MT', 'EX', 'GD', 'LP', 'PL', 'PO'] as const
const LANGUAGES = ['fr', 'en', 'jp', 'other'] as const

type Condition = (typeof CONDITIONS)[number]
type Language = (typeof LANGUAGES)[number]

export function AddToPokedexDialog({ card }: { card: Doc<'cards'> }) {
  const pokedexes = useQuery(api.pokedexes.list)
  const add = useMutation(api.cardEntries.add)
  const [open, setOpen] = useState(false)
  const [pokedexId, setPokedexId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<Condition>('NM')
  const [language, setLanguage] = useState<Language>('fr')
  const [isHolo, setIsHolo] = useState(false)
  const [isReverse, setIsReverse] = useState(false)
  const [isFirstEdition, setIsFirstEdition] = useState(false)

  const label = card.nameFr ?? card.nameEn ?? card.tcgdexId

  async function handleAdd() {
    if (!pokedexId) {
      toast.error('Choisis un pokédex')
      return
    }
    await add({
      pokedexId: pokedexId as Doc<'pokedexes'>['_id'],
      cardId: card._id,
      quantity,
      condition,
      language,
      isHolo,
      isReverse,
      isFirstEdition,
    })
    toast.success(`« ${label} » ajoutée`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter « {label} »</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pokédex</Label>
            <Select value={pokedexId} onValueChange={setPokedexId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un pokédex" />
              </SelectTrigger>
              <SelectContent>
                {(pokedexes ?? []).map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pokedexes !== undefined && pokedexes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Crée d'abord un pokédex depuis l'accueil.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantité</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-2">
              <Label>État</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isHolo} onChange={(e) => setIsHolo(e.target.checked)} />
              Holo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isReverse} onChange={(e) => setIsReverse(e.target.checked)} />
              Reverse
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFirstEdition}
                onChange={(e) => setIsFirstEdition(e.target.checked)}
              />
              1re édition
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd}>Ajouter à la collection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
