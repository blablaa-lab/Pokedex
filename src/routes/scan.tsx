import { createFileRoute } from '@tanstack/react-router'
import { useConvex } from 'convex/react'
import { useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { scanCard } from '../scan/scanCard'
import type { ScanResult } from '../scan/scanCard'
import { tesseractOcr } from '../scan/ocr'
import { CardThumb } from '../components/CardThumb'
import { AddToPokedexDialog } from '../components/AddToPokedexDialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export const Route = createFileRoute('/scan')({ component: ScanPage })

// ⚠️ HARNAIS DE TEST MANUEL (Phase B). L'accuracy OCR dépend de vraies cartes,
// reflets holo et éclairage → se valide À LA MAIN, pas par des tests auto.

function ScanPage() {
  const convex = useConvex()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [setId, setSetId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function usePreview(blob: Blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(blob))
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    usePreview(f)
    setResult(null)
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      setFile(new File([blob], 'capture.png', { type: 'image/png' }))
      usePreview(blob)
      setResult(null)
    }, 'image/png')
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  async function runScan() {
    if (!file) return
    setScanning(true)
    setResult(null)
    try {
      const res = await scanCard(file, {
        ocr: tesseractOcr,
        setId: setId.trim() || undefined,
        // Va chercher dans l'API (action Convex) : candidats + prix automatique.
        lookup: ({ localId, total, setId: sid }) =>
          convex.action(api.scan.scanLookup, {
            localId,
            total: total ?? undefined,
            setId: sid,
          }),
      })
      setResult(res)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scan (harnais de test)</h1>
        <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          ⚠️ <strong>Phase B — à valider manuellement.</strong> L'OCR vise le
          numéro de collecteur. La précision dépend de vraies cartes (reflets
          holo, éclairage) : ce module n'est pas validé par des tests
          automatiques. Renseigne le set pour de meilleurs candidats.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="file">Image de la carte</Label>
            <Input id="file" type="file" accept="image/*" onChange={onPick} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void startCamera()}>
              Caméra
            </Button>
            <Button type="button" variant="outline" onClick={capture}>
              Capturer
            </Button>
          </div>
          <video ref={videoRef} className="w-full rounded-md border" muted playsInline />
          <div className="space-y-2">
            <Label htmlFor="setId">Set (id, recommandé)</Label>
            <Input
              id="setId"
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              placeholder="base1, sv03…"
            />
          </div>
          <Button onClick={() => void runScan()} disabled={!file || scanning}>
            {scanning ? 'Analyse OCR…' : 'Scanner le numéro'}
          </Button>
        </div>

        <div className="space-y-3">
          {previewUrl && (
            <img src={previewUrl} alt="aperçu" className="max-h-64 rounded-md border" />
          )}
          {result && (
            <div className="rounded-md border p-3 text-sm">
              <div>
                Numéro détecté : <strong>{result.detected.localId ?? '—'}</strong>
                {result.detected.total && ` / ${result.detected.total}`}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">
                  Texte OCR brut
                </summary>
                <pre className="mt-1 whitespace-pre-wrap text-xs">{result.detected.raw}</pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div>
          <h2 className="mb-2 font-semibold">
            Candidats ({result.candidates.length}) — confirme avant d'ajouter
          </h2>
          {result.candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun candidat. Vérifie le numéro détecté et précise le set.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {result.candidates.map((card) => (
                <div key={card._id} className="space-y-2">
                  <CardThumb card={card} />
                  <AddToPokedexDialog card={card} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
