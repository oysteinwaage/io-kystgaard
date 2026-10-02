import { signOut } from 'firebase/auth'
import { Button } from '@mantine/core'
import { auth } from '@/lib/firebase'
import styles from './PendingApprovalPage.module.scss'

function PendingApprovalPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <img src="/logo.png" alt="Lynghaugen Gard" className={styles.logo} />
        <h1 className={styles.title}>Venter på godkjenning</h1>
        <p className={styles.subtitle}>
          Kontoen din er registrert, men må godkjennes av en administrator før du får tilgang.
          Prøv igjen senere.
        </p>

        <Button variant="outline" className={styles.submit} onClick={() => signOut(auth)}>
          Logg ut
        </Button>
      </div>
    </main>
  )
}

export default PendingApprovalPage
