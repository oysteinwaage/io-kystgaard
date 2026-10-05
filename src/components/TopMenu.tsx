import { signOut } from 'firebase/auth'
import { Burger, Button, Drawer } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { auth } from '@/lib/firebase'
import styles from './TopMenu.module.scss'

export type View = 'hjem' | 'sauer' | 'slakting' | 'vaer' | 'info' | 'statistikk' | 'admin'

interface TopMenuProps {
  activeView: View
  onNavigate: (view: View) => void
  erAdmin?: boolean
}

const navItems: { view: View; label: string }[] = [
  { view: 'hjem', label: 'Hjem' },
  { view: 'statistikk', label: 'Statistikk' },
  { view: 'sauer', label: 'Sauer' },
  { view: 'slakting', label: 'Slakting' },
  { view: 'vaer', label: 'Værer' },
  { view: 'info', label: 'Info og dokumenter' },
]

function TopMenu({ activeView, onNavigate, erAdmin }: TopMenuProps) {
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] = useDisclosure(false)
  const items = erAdmin ? [...navItems, { view: 'admin' as View, label: 'Admin' }] : navItems

  const handleNavigate = (view: View) => {
    onNavigate(view)
    closeMenu()
  }

  const handleLogout = () => {
    closeMenu()
    signOut(auth)
  }

  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.brand}
        onClick={() => handleNavigate('hjem')}
      >
        <img src="/logo.png" alt="Lynghaugen Gard" className={styles.logo} />
        <span className={styles.name}>Lynghaugen Gard</span>
      </button>

      <nav className={styles.nav}>
        {items.map((item) => (
          <button
            key={item.view}
            type="button"
            className={`${styles.navItem} ${
              activeView === item.view ? styles.navItemActive : ''
            }`}
            onClick={() => handleNavigate(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <Button
        variant="outline"
        className={styles.logout}
        onClick={handleLogout}
      >
        Logg ut
      </Button>

      <Burger
        opened={menuOpened}
        onClick={toggleMenu}
        className={styles.burger}
        aria-label="Åpne meny"
      />

      <Drawer
        opened={menuOpened}
        onClose={closeMenu}
        title="Meny"
        position="right"
        size="16rem"
        className={styles.drawer}
        classNames={{ content: styles.drawerContent, body: styles.drawerBody }}
      >
        <nav className={styles.drawerNav}>
          {items.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`${styles.drawerNavItem} ${
                activeView === item.view ? styles.navItemActive : ''
              }`}
              onClick={() => handleNavigate(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.drawerFooter}>
          <Button variant="outline" fullWidth onClick={handleLogout}>
            Logg ut
          </Button>
        </div>
      </Drawer>
    </header>
  )
}

export default TopMenu
