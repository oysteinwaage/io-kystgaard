import { signOut } from 'firebase/auth'
import { Button } from '@mantine/core'
import { auth } from '@/lib/firebase'
import styles from './TopMenu.module.scss'

export type View = 'hjem' | 'sauer'

interface TopMenuProps {
  activeView: View
  onNavigate: (view: View) => void
}

const navItems: { view: View; label: string }[] = [
  { view: 'hjem', label: 'Hjem' },
  { view: 'sauer', label: 'Sauer' },
]

function TopMenu({ activeView, onNavigate }: TopMenuProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="Lynghaugen Gard" className={styles.logo} />
        <span className={styles.name}>Lynghaugen Gard</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.view}
            type="button"
            className={`${styles.navItem} ${
              activeView === item.view ? styles.navItemActive : ''
            }`}
            onClick={() => onNavigate(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <Button
        variant="outline"
        className={styles.logout}
        onClick={() => signOut(auth)}
      >
        Logg ut
      </Button>
    </header>
  )
}

export default TopMenu
