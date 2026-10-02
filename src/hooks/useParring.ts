import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { Parring, ParringMedId } from '@/types/parring'

interface UseParringResult {
  parringer: ParringMedId[]
  isLoading: boolean
  error: string | null
}

export function useParring(): UseParringResult {
  const [parringer, setParringer] = useState<ParringMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('parringer'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, Parring> | null
        const list = value
          ? Object.entries(value).map(([id, parring]) => ({ id, ...parring }))
          : []
        list.sort((a, b) => b.aar - a.aar)
        setParringer(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/parringer fra Firebase:', err)
        setError(`Kunne ikke laste inn parringer (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { parringer, isLoading, error }
}
