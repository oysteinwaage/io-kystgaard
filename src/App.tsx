import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { runTransaction } from 'firebase/database'
import HjemPage from '@/components/HjemPage'
import LoginPage from '@/components/LoginPage'
import SauerPage from '@/components/SauerPage'
import TopMenu, { type View } from '@/components/TopMenu'
import { appRef, auth } from '@/lib/firebase'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>('hjem')

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const { uid, displayName, photoURL } = user
    const lastLogin = Date.now()
    runTransaction(appRef(`users/${uid}`), (current) => ({
      ...(current ?? { roles: ['BONDE'] }),
      displayName,
      photoURL,
      lastLogin,
    }))
  }, [user])

  if (isLoading) {
    return null
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div>
      <TopMenu activeView={view} onNavigate={setView} />
      {view === 'sauer' ? <SauerPage /> : <HjemPage />}
    </div>
  )
}

export default App
