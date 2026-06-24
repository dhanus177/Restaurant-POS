'use client'

import { useEffect } from 'react'
import { usePOSStore } from '@/lib/store'

export function DBProvider({ children }: { children: React.ReactNode }) {
  const loadFromDB = usePOSStore((s) => s.loadFromDB)

  useEffect(() => {
    loadFromDB()
  }, [loadFromDB])

  return <>{children}</>
}
