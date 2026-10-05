import { useEffect, useState } from 'react'
import { onValue } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { ArshjulOppgave, ArshjulOppgaveMedId } from '@/types/arshjul'

interface UseArshjulResult {
  oppgaver: ArshjulOppgaveMedId[]
  isLoading: boolean
  error: string | null
}

export function useArshjul(): UseArshjulResult {
  const [oppgaver, setOppgaver] = useState<ArshjulOppgaveMedId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onValue(
      appRef('arshjul/oppgaver'),
      (snapshot) => {
        const value = snapshot.val() as Record<string, ArshjulOppgave> | null
        const list = value
          ? Object.entries(value).map(([id, oppgave]) => ({ id, ...oppgave }))
          : []
        list.sort((a, b) => a.maaned - b.maaned || (a.dag ?? 0) - (b.dag ?? 0))
        setOppgaver(list)
        setIsLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Kunne ikke lese ioKystgaard/arshjul/oppgaver fra Firebase:', err)
        setError(`Kunne ikke laste inn årshjulet (${err.code ?? err.message}).`)
        setIsLoading(false)
      },
    )
  }, [])

  return { oppgaver, isLoading, error }
}
