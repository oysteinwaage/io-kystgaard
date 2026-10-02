import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { onValue, runTransaction } from 'firebase/database'
import AdminPage from '@/components/AdminPage'
import HjemPage from '@/components/HjemPage'
import LoginPage from '@/components/LoginPage'
import PendingApprovalPage from '@/components/PendingApprovalPage'
import SauerPage from '@/components/SauerPage'
import SlaktingPage from '@/components/SlaktingPage'
import TopMenu, { type View } from '@/components/TopMenu'
import VaerPage from '@/components/VaerPage'
import { appRef, auth } from '@/lib/firebase'
import type { AppUser } from '@/types/user'

/**
 * Oppretter/oppdaterer egen brukerpost ved innlogging. Nye brukere settes til
 * 'pending' og må godkjennes av en administrator. Eksisterende brukere (fra
 * før godkjenning ble innført) blir automatisk godkjent ("grandfathered in")
 * så ingen mister tilgangen de allerede hadde.
 */
async function synkroniserBruker(user: User) {
  const { uid, displayName, photoURL } = user
  const lastLogin = Date.now()

  await runTransaction(appRef(`users/${uid}`), (current: AppUser | null) => {
    if (current) {
      return { ...current, displayName, photoURL, lastLogin, status: current.status ?? 'approved' }
    }
    return { roles: ['BONDE'], status: 'pending', displayName, photoURL, lastLogin }
  })
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [egenBruker, setEgenBruker] = useState<AppUser | null>(null)
  const [view, setView] = useState<View>('hjem')

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
      if (!nextUser) setEgenBruker(null)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    synkroniserBruker(user).catch((err) => {
      console.error(`Kunne ikke synkronisere bruker ${user.uid}:`, err)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    return onValue(appRef(`users/${user.uid}`), (snapshot) => {
      setEgenBruker(snapshot.val() as AppUser | null)
    })
  }, [user])

  if (isLoading) {
    return null
  }

  if (!user) {
    return <LoginPage />
  }

  if (!egenBruker || egenBruker.status === 'pending') {
    return <PendingApprovalPage />
  }

  const erAdmin = egenBruker.roles?.includes('ADMIN') ?? false

  return (
    <div>
      <TopMenu activeView={view} onNavigate={setView} erAdmin={erAdmin} />
      {view === 'sauer' && <SauerPage />}
      {view === 'slakting' && <SlaktingPage />}
      {view === 'vaer' && <VaerPage />}
      {view === 'hjem' && <HjemPage />}
      {view === 'admin' && erAdmin && <AdminPage />}
    </div>
  )
}

export default App
