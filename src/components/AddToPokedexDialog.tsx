import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

/** Dialogue d'ajout contrôlé : ouvert quand `card` n'est pas null. */
export function AddToPokedexDialog({
  card,
  onClose,
}: {
  card: Doc<'cards'> | null
  onClose: () => void
}) {
  const pokedexes = useQuery(api.pokedexes.list)
  const add = useMutation(api.cardEntries.add)
  const [pokedexId, setPokedexId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<Condition>('NM')
  const [language, setLanguage] = useState<Language>('fr')
  const [isHolo, setIsHolo] = useState(false)
  const [isReverse, setIsReverse] = useState(false)
  const [isFirstEdition, setIsFirstEdition] = useState(false)

  useEffect(() => {
    if (pokedexes && pokedexes.length > 0 && !pokedexId) setPokedexId(pokedexes[0]._id)
  }, [pokedexes, pokedexId])

  if (!card) return null
  const label = card.nameFr ?? card.nameEn ?? card.tcgdexId

  async function handleAdd() {
    if (!pokedexId) {
      toast.error('Choisis un classeur')
      return
    }
    await add({
      pokedexId: pokedexId as Id<'pokedexes'>,
      cardId: card!._id,
      quantity,
      condition,
      language,
      isHolo,
      isReverse,
      isFirstEdition,
    })
    toast.success(`« ${label} » ajoutée`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter « {label} »</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            {card.imageUrl && (
              <img src={card.imageUrl} alt="" className="h-24 w-[68px] rounded-lg object-cover" />
            )}
            <div className="text-sm text-muted-foreground">
              {card.setName ?? card.setId} · #{card.localId}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Classeur</Label>
            <Select value={pokedexId} onValueChange={setPokedexId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un classeur" />
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
              <p className="text-xs text-muted-foreground">Crée d'abord un classeur.</p>
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
          <Button onClick={handleAdd} className="rounded-full bg-rouge hover:bg-rouge-deep">
            Ajouter à la collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
