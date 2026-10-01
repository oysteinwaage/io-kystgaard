import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { Sau, SauMedId } from '@/types/sau'

interface UseSauerResult {
  sauer: SauMedId[]
  isLoading: boolean
  error: string | null
}

export function useSauer(): UseSauerResult {
  const [sauer, setSauer] = useState<SauMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('sauer'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, Sau> | null
        const list = value
          ? Object.entries(value).map(([id, sau]) => ({ id, ...sau }))
          : []
        list.sort((a, b) => {
          if (a.foedselsaar != null && b.foedselsaar != null) {
            return a.foedselsaar - b.foedselsaar
          }
          if (a.foedselsaar == null && b.foedselsaar == null) {
            return (a.navn ?? a.oereNr ?? '').localeCompare(b.navn ?? b.oereNr ?? '', 'nb')
          }
          return a.foedselsaar == null ? 1 : -1
        })
        setSauer(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/sauer fra Firebase:', err)
        setError(`Kunne ikke laste inn sauer (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { sauer, isLoading, error }
}
