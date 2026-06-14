import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { CardImage } from './CardImage'
import { cardEstimate } from './CardTile'
import {
  Dialog,
  DialogContent,
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

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const CONDITIONS = ['NM', 'MT', 'EX', 'GD', 'LP', 'PL', 'PO'] as const
const LANGUAGES = ['fr', 'en', 'jp', 'other'] as const
type Condition = (typeof CONDITIONS)[number]
type Language = (typeof LANGUAGES)[number]

/** Dialogue d'ajout contrôlé (ouvert quand `card` ≠ null) : carte à gauche,
 *  infos + estimation de prix à droite. */
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
  const price = cardEstimate(card)

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
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{label}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 sm:grid-cols-[430px_1fr]">
          {/* Carte à gauche — au moins 600px de haut sur desktop */}
          <div>
            <div className="holo mx-auto aspect-[63/88] w-56 overflow-hidden rounded-xl bg-surface-2 shadow-md sm:aspect-auto sm:h-[600px] sm:w-full">
              <CardImage src={card.imageUrl} alt={label} />
            </div>
          </div>

          {/* Infos + estimation à droite */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">
                {card.setName ?? card.setId} · #{card.localId}
              </span>
              <span className="text-right">
                <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                  Estimation
                </span>
                <span className="font-display text-2xl font-extrabold">
                  {price !== null ? eur(price) : '—'}
                </span>
              </span>
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

            <Button
              onClick={handleAdd}
              className="w-full rounded-full bg-rouge py-5 text-base hover:bg-rouge-deep sm:w-auto sm:px-8"
            >
              Ajouter à la collection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
