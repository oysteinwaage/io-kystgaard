import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { Slakting, SlaktingMedId } from '@/types/slakting'

interface UseSlaktingerResult {
  slaktinger: SlaktingMedId[]
  isLoading: boolean
  error: string | null
}

export function useSlaktinger(): UseSlaktingerResult {
  const [slaktinger, setSlaktinger] = useState<SlaktingMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('slaktinger'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, Slakting> | null
        const list = value
          ? Object.entries(value).map(([id, slakting]) => ({ id, ...slakting }))
          : []
        list.sort((a, b) => {
          if (a.aar !== b.aar) return b.aar - a.aar
          return (b.dato ?? '').localeCompare(a.dato ?? '')
        })
        setSlaktinger(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/slaktinger fra Firebase:', err)
        setError(`Kunne ikke laste inn slaktinger (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { slaktinger, isLoading, error }
}
