import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { runTransaction } from 'firebase/database'
import LoginPage from '@/components/LoginPage'
import TopMenu from '@/components/TopMenu'
import { appRef, auth } from '@/lib/firebase'
import styles from './App.module.scss'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      <TopMenu />
      <main className={styles.page}>
        <h1 className="text-5xl font-semibold">Hello World</h1>
        <p className={styles.subtitle}>Io Kystgaard</p>
      </main>
    </div>
  )
}

export default App
