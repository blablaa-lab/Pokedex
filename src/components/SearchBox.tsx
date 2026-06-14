import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Search, Camera, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useScan } from '../lib/scan-context'

/** Champ de recherche avec autocomplétion (suggestions de cartes pendant la
 *  frappe) ; valider ouvre la page de résultats /search?q=… */
export function SearchBox() {
  const navigate = useNavigate()
  const { openScan } = useScan()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  const trimmed = term.trim()
  const suggestions = useQuery(
    api.cards.search,
    open && trimmed.length >= 2 ? { text: trimmed, limit: 8 } : 'skip',
  )

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function go(q: string) {
    const v = q.trim()
    if (!v) return
    setOpen(false)
    void navigate({ to: '/search', search: { q: v } })
  }

  return (
    <div ref={boxRef} className="relative flex-1">
      <div className="flex h-11 items-center rounded-full bg-secondary pl-4 pr-1 transition focus-within:bg-white focus-within:shadow-sm focus-within:ring-2 focus-within:ring-ink/10">
        <Search className="size-5 shrink-0 text-gray" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go(term)
            else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Rechercher une carte"
          className="min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-gray"
        />
        {term && (
          <button
            onClick={() => {
              setTerm('')
              setOpen(false)
            }}
            aria-label="Effacer"
            className="grid size-8 shrink-0 place-items-center rounded-full text-gray transition hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          onClick={openScan}
          aria-label="Scanner une carte"
          className="grid size-9 shrink-0 place-items-center rounded-full text-ink transition hover:bg-white"
        >
          <Camera className="size-5" />
        </button>
      </div>

      {open && trimmed.length >= 2 && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-white py-2 shadow-2xl">
          {suggestions === undefined ? (
            <div className="px-4 py-3 text-sm text-gray">Recherche…</div>
          ) : suggestions.length === 0 ? (
            <button
              onClick={() => go(term)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-secondary"
            >
              <Search className="size-4 text-gray" />
              <span className="text-sm">Rechercher « {trimmed} »</span>
            </button>
          ) : (
            <ul>
              {suggestions.map((c) => (
                <li key={c._id}>
                  <button
                    onClick={() => go(c.nameFr ?? c.nameEn ?? trimmed)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-secondary"
                  >
                    {c.imageUrl && (
                      <img src={c.imageUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {c.nameFr ?? c.nameEn}
                      </span>
                      <span className="block truncate text-xs text-gray">
                        {c.setName ?? c.setId} · #{c.localId}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
