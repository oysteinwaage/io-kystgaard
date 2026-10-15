import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import ForsidePage from './ForsidePage'
import HonningPage from './HonningPage'
import LammekjottPage from './LammekjottPage'
import SaueskinnPage from './SaueskinnPage'
import styles from './PublicSite.module.scss'
import { PUBLIC_BASE } from './sti'

export type PublicSide = 'forside' | 'saueskinn' | 'honning' | 'lammekjott'

const sider: { side: PublicSide; label: string; tittel: string }[] = [
  { side: 'saueskinn', label: 'Saueskinn', tittel: 'Saueskinn' },
  { side: 'honning', label: 'Honning', tittel: 'Honning' },
  { side: 'lammekjott', label: 'Lammekjøtt', tittel: 'Lammekjøtt' },
]

function sideFraSti(pathname: string): PublicSide {
  const del = pathname.slice(PUBLIC_BASE.length).replace(/^\/|\/$/g, '')
  return sider.find((s) => s.side === del)?.side ?? 'forside'
}

function stiForSide(side: PublicSide) {
  return side === 'forside' ? PUBLIC_BASE : `${PUBLIC_BASE}/${side}`
}

interface LenkeProps {
  side: PublicSide
  onNavigate: (side: PublicSide) => void
  className?: string
  children: ReactNode
}

/** Vanlig <a>-lenke (så den kan deles/åpnes i ny fane) med klientside-navigering. */
export function SideLenke({ side, onNavigate, className, children }: LenkeProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onNavigate(side)
  }
  return (
    <a href={stiForSide(side)} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}

function PublicSite() {
  const [side, setSide] = useState<PublicSide>(() => sideFraSti(window.location.pathname))
  const [erInnlogget, setErInnlogget] = useState(false)

  useEffect(() => {
    const onPop = () => setSide(sideFraSti(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Viser lenke tilbake til appen hvis brukeren allerede er innlogget.
  // Auth lastes dynamisk så den offentlige siden vises uten å vente på Firebase.
  useEffect(() => {
    let avmeld: (() => void) | undefined
    let avbrutt = false
    Promise.all([import('@/lib/firebaseApp'), import('firebase/auth')]).then(([{ auth }, { onAuthStateChanged }]) => {
      if (avbrutt) return
      avmeld = onAuthStateChanged(auth, (user) => setErInnlogget(user !== null))
    })
    return () => {
      avbrutt = true
      avmeld?.()
    }
  }, [])

  useEffect(() => {
    const tittel = sider.find((s) => s.side === side)?.tittel
    document.title = tittel ? `${tittel} – Lynghaugen Gard` : 'Lynghaugen Gard'
  }, [side])

  const navigate = (neste: PublicSide) => {
    if (neste !== side) window.history.pushState(null, '', stiForSide(neste))
    setSide(neste)
    window.scrollTo(0, 0)
  }

  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <SideLenke side="forside" onNavigate={navigate} className={styles.brand}>
            <img src="/logo.png" alt="" className={styles.logo} />
            <span>Lynghaugen Gard</span>
          </SideLenke>
          <nav className={styles.nav}>
            {sider.map((s) => (
              <SideLenke
                key={s.side}
                side={s.side}
                onNavigate={navigate}
                className={s.side === side ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
              >
                {s.label}
              </SideLenke>
            ))}
          </nav>
          {erInnlogget && (
            <a href="/" className={styles.appLenke}>
              ← Til gårdsappen
            </a>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {side === 'forside' && <ForsidePage onNavigate={navigate} />}
        {side === 'saueskinn' && <SaueskinnPage />}
        {side === 'honning' && <HonningPage />}
        {side === 'lammekjott' && <LammekjottPage />}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <strong>Lynghaugen Gard</strong>
            <p>Lokale produkter fra gården – saueskinn, honning og lammekjøtt.</p>
          </div>
          <div>
            <strong>Kontakt</strong>
            <p>
              E-post: post@lynghaugen.no
              <br />
              Telefon: 000 00 000
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicSite
