import { createContext, useContext, useMemo, useState } from 'react'

interface ScanContextValue {
  open: boolean
  openScan: () => void
  closeScan: () => void
}

const ScanContext = createContext<ScanContextValue>({
  open: false,
  openScan: () => {},
  closeScan: () => {},
})

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const value = useMemo(
    () => ({ open, openScan: () => setOpen(true), closeScan: () => setOpen(false) }),
    [open],
  )
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>
}

export const useScan = () => useContext(ScanContext)
