import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { Vaer, VaerMedId } from '@/types/vaer'

interface UseVaerResult {
  vaerer: VaerMedId[]
  isLoading: boolean
  error: string | null
}

export function useVaer(): UseVaerResult {
  const [vaerer, setVaerer] = useState<VaerMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('vaerer'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, Vaer> | null
        const list = value
          ? Object.entries(value).map(([id, vaer]) => ({ id, ...vaer }))
          : []
        list.sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
        setVaerer(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/vaerer fra Firebase:', err)
        setError(`Kunne ikke laste inn værer (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { vaerer, isLoading, error }
}
