import { useEffect, useRef, useState } from 'react'
import { useAction, useConvex, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { X, ScanLine, Sparkles, Camera, RotateCcw, Loader2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { useScan } from '../lib/scan-context'
import {
  ensureIndex,
  findNearest,
  hashImageElement,
  hashVideoFrame,
  indexSize,
} from '../scan/visualMatch'
import { CardImage } from './CardImage'

type Phase = 'init' | 'scanning' | 'detected' | 'results' | 'denied'

const THRESHOLD = 18 // distance de Hamming max pour une capture automatique
const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

function estimate(card: Doc<'cards'>): number | null {
  const p = card.prices
  return p?.eurAvg30 ?? p?.eurTrend ?? p?.eurLow ?? null
}

export function ScanModal() {
  const { open, closeScan } = useScan()
  if (!open) return null
  return <ScanExperience onClose={closeScan} />
}

function ScanExperience({ onClose }: { onClose: () => void }) {
  const convex = useConvex()
  const ensurePrices = useAction(api.prices.ensurePrices)
  const pokedexes = useQuery(api.pokedexes.list)
  const addEntry = useMutation(api.cardEntries.add)

  const [phase, setPhase] = useState<Phase>('init')
  const [indexReady, setIndexReady] = useState(false)
  const [detectedIds, setDetectedIds] = useState<Array<Id<'cards'>>>([])
  const [frozenUrl, setFrozenUrl] = useState<string | null>(null)
  const [session, setSession] = useState(0)
  const [pokedexId, setPokedexId] = useState<string>('')

  const candidates =
    useQuery(api.cards.byIds, detectedIds.length > 0 ? { ids: detectedIds } : 'skip') ?? []

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const busyRef = useRef(false)
  const lastBestRef = useRef<{ id: string | null; count: number }>({ id: null, count: 0 })
  const cancelRef = useRef(false)
  const phaseRef = useRef<Phase>('init')
  phaseRef.current = phase

  useEffect(() => {
    if (pokedexes && pokedexes.length > 0 && !pokedexId) setPokedexId(pokedexes[0]._id)
  }, [pokedexes, pokedexId])

  useEffect(() => {
    cancelRef.current = false

    function stopCamera() {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    function stopAll() {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      stopCamera()
    }

    function detect(ids: Array<Id<'cards'>>) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      const v = videoRef.current
      if (v && v.videoWidth > 0) {
        const cap = document.createElement('canvas')
        cap.width = v.videoWidth
        cap.height = v.videoHeight
        cap.getContext('2d')?.drawImage(v, 0, 0)
        setFrozenUrl(cap.toDataURL('image/jpeg', 0.8))
      }
      stopCamera()
      setDetectedIds(ids)
      void ensurePrices({ cardIds: ids })
      setPhase('results')
    }

    function tick() {
      if (busyRef.current || phaseRef.current !== 'scanning') return
      const v = videoRef.current
      if (!v || v.videoWidth === 0) return
      busyRef.current = true
      try {
        const hash = hashVideoFrame(v)
        if (!hash) return
        const near = findNearest(hash, 4)
        if (near.length > 0 && near[0].dist <= THRESHOLD) {
          const bestId = near[0].id
          if (lastBestRef.current.id === bestId) lastBestRef.current.count += 1
          else lastBestRef.current = { id: bestId, count: 1 }
          // 2 lectures concordantes → capture automatique.
          if (lastBestRef.current.count >= 2) detect(near.map((n) => n.id))
        } else {
          lastBestRef.current = { id: null, count: 0 }
        }
      } finally {
        busyRef.current = false
      }
    }

    async function init() {
      setPhase('init')
      setDetectedIds([])
      setFrozenUrl(null)
      lastBestRef.current = { id: null, count: 0 }
      void ensureIndex(convex).then(() => {
        if (!cancelRef.current) setIndexReady(true)
      })
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setPhase('scanning')
        intervalRef.current = setInterval(tick, 600)
      } catch {
        if (!cancelRef.current) setPhase('denied')
      }
    }

    void init()
    return () => {
      cancelRef.current = true
      stopAll()
    }
  }, [session, convex, ensurePrices])

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setFrozenUrl(url)
    setPhase('detected')
    await ensureIndex(convex)
    const img = new Image()
    img.onload = () => {
      const hash = hashImageElement(img)
      const near = hash ? findNearest(hash, 4) : []
      setDetectedIds(near.map((n) => n.id))
      if (near.length > 0) void ensurePrices({ cardIds: near.map((n) => n.id) })
      setPhase('results')
    }
    img.src = url
  }

  async function add(card: Doc<'cards'>) {
    if (!pokedexId) {
      toast.error('Crée un classeur d’abord.')
      return
    }
    await addEntry({ pokedexId: pokedexId as Id<'pokedexes'>, cardId: card._id, quantity: 1 })
    toast.success(`« ${card.nameFr ?? card.nameEn} » ajoutée`)
  }

  const scanning = phase === 'scanning' || phase === 'init'

  return (
    <div className="scan-overlay fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="scan-card relative flex max-h-[94vh] min-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0b] text-white shadow-2xl ring-1 ring-white/10">
        <div className="flex shrink-0 items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <ScanLine className="size-5 text-rouge" />
            <span className="font-display text-lg font-extrabold">Scanner une carte</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Cadre carte (ratio Pokémon 63/88) */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-4">
          <div className="relative aspect-[63/88] h-full max-w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/15">
            {phase === 'denied' ? (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-white/80">
                <div className="space-y-3">
                  <Camera className="mx-auto size-8 opacity-70" />
                  <p>Caméra indisponible. Importe une photo de la carte.</p>
                </div>
              </div>
            ) : frozenUrl ? (
              <img src={frozenUrl} alt="carte scannée" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            )}

            {scanning && (
              <>
                <div className="scan-grid" />
                <div className="scan-line" />
                <Corners />
                <div className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white drop-shadow">
                  {!indexReady
                    ? 'Préparation du scanner…'
                    : phase === 'init'
                      ? 'Activation de la caméra…'
                      : 'Cadre la carte · reconnaissance auto'}
                </div>
              </>
            )}
            {phase === 'detected' && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="size-8 animate-spin text-rouge" />
              </div>
            )}
          </div>
        </div>

        {/* Pied : résultats / repli / aide */}
        <div className="max-h-[42vh] shrink-0 space-y-3 overflow-y-auto border-t border-white/10 bg-white/[0.03] px-5 py-4">
          {phase === 'denied' && (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-rouge px-4 py-2.5 text-sm font-semibold text-white">
              <Camera className="size-4" /> Importer une photo
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          )}

          {phase === 'results' && (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-rouge" /> Carte reconnue ?
              </div>
              {pokedexes && pokedexes.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/60">Ajouter à</span>
                  <select
                    value={pokedexId}
                    onChange={(e) => setPokedexId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-white"
                  >
                    {pokedexes.map((p) => (
                      <option key={p._id} value={p._id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {candidates.length === 0 ? (
                <p className="text-center text-sm text-white/70">
                  Aucune correspondance. Recadre bien la carte, bon éclairage.
                </p>
              ) : (
                <ul className="space-y-2">
                  {candidates.map((c) => {
                    const est = estimate(c)
                    return (
                      <li key={c._id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                        <span className="h-16 w-11 shrink-0 overflow-hidden rounded bg-white/10">
                          <CardImage src={c.imageUrl} alt="" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{c.nameFr ?? c.nameEn}</div>
                          <div className="text-xs text-white/60">
                            {c.setName ?? c.setId} · #{c.localId}
                            {est !== null && (
                              <span className="ml-1 font-semibold text-white/90">{eur(est)}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => void add(c)}
                          className="shrink-0 rounded-full bg-rouge px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                        >
                          Ajouter
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button
                onClick={() => setSession((s) => s + 1)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
              >
                <RotateCcw className="size-4" /> Scanner à nouveau
              </button>
            </>
          )}

          {(scanning || phase === 'detected') && (
            <p className="text-center text-xs text-white/50">
              {indexReady
                ? `Reconnaissance visuelle sur ${indexSize().toLocaleString('fr-FR')} cartes — capture automatique.`
                : 'Chargement de la base de reconnaissance…'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Corners() {
  return (
    <>
      <span className="scan-corner left-3 top-3 rounded-tl-lg border-b-0 border-r-0" />
      <span className="scan-corner right-3 top-3 rounded-tr-lg border-b-0 border-l-0" />
      <span className="scan-corner bottom-3 left-3 rounded-bl-lg border-r-0 border-t-0" />
      <span className="scan-corner bottom-3 right-3 rounded-br-lg border-l-0 border-t-0" />
    </>
  )
}
