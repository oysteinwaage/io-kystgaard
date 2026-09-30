import { signOut } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebase'
import styles from './TopMenu.module.scss'

function TopMenu() {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Io Kystgård" className={styles.logo} />
        <span className={styles.name}>Io Kystgård</span>
      </div>
      <Button variant="outline" onClick={() => signOut(auth)}>
        Logg ut
      </Button>
    </header>
  )
}

export default TopMenu
