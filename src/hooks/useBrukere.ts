import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { AppUser, AppUserMedId } from '@/types/user'

interface UseBrukereResult {
  brukere: AppUserMedId[]
  isLoading: boolean
  error: string | null
}

export function useBrukere(): UseBrukereResult {
  const [brukere, setBrukere] = useState<AppUserMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('users'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, AppUser> | null
        const list = value
          ? Object.entries(value).map(([id, bruker]) => ({ id, ...bruker }))
          : []
        list.sort((a, b) => (b.lastLogin ?? 0) - (a.lastLogin ?? 0))
        setBrukere(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/users fra Firebase:', err)
        setError(`Kunne ikke laste inn brukere (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { brukere, isLoading, error }
}
