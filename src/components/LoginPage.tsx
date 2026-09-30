import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { auth, googleProvider } from '@/lib/firebase'
import styles from './LoginPage.module.scss'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    switch ((error as { code: string }).code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return null
      case 'auth/popup-blocked':
        return 'Nettleseren blokkerte innloggingsvinduet. Tillat popup-vinduer og prøv igjen.'
      default:
        return 'Kunne ikke logge inn. Prøv igjen.'
    }
  }
  return 'Kunne ikke logge inn. Prøv igjen.'
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Io Kystgård" className={styles.logo} />
        <h1 className={styles.title}>Io Kystgård</h1>
        <p className={styles.subtitle}>Logg inn for å fortsette</p>

        {error && <p className={styles.error}>{error}</p>}

        <Button
          type="button"
          variant="outline"
          className={styles.submit}
          disabled={isSubmitting}
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          {isSubmitting ? 'Logger inn…' : 'Logg inn med Google'}
        </Button>
      </div>
    </main>
  )
}

export default LoginPage
