import type { View } from '@/components/TopMenu'
import styles from './HjemPage.module.scss'

interface HjemKort {
  view: View
  ikon: string
  tittel: string
  beskrivelse: string
}

const kort: HjemKort[] = [
  {
    view: 'statistikk',
    ikon: '📊',
    tittel: 'Statistikk',
    beskrivelse: 'Lammetall, slaktestatistikk og slektskap.',
  },
  {
    view: 'sauer',
    ikon: '🐑',
    tittel: 'Sauer',
    beskrivelse: 'Full oversikt over flokken – registrer fødsler, dødsfall og detaljer.',
  },
  {
    view: 'slakting',
    ikon: '🥩',
    tittel: 'Slakting',
    beskrivelse: 'Planlegg og registrer slaktinger av dyr.',
  },
  {
    view: 'vaer',
    ikon: '🐏',
    tittel: 'Værer',
    beskrivelse: 'Oversikt over værene og hvilke som er brukt til paring.',
  },
  {
    view: 'arshjul',
    ikon: '🗓️',
    tittel: 'Årshjul',
    beskrivelse: 'Faste oppgaver gjennom driftsåret, med avhaking og frister.',
  },
  {
    view: 'info',
    ikon: '📄',
    tittel: 'Info og dokumenter',
    beskrivelse: 'Nyttig informasjon og dokumenter om drifta.',
  },
]

const adminKort: HjemKort = {
  view: 'admin',
  ikon: '🛠️',
  tittel: 'Admin',
  beskrivelse: 'Godkjenn brukere og administrer tilganger.',
}

interface HjemPageProps {
  onNavigate: (view: View) => void
  erAdmin: boolean
}

function HjemPage({ onNavigate, erAdmin }: HjemPageProps) {
  const alleKort = erAdmin ? [...kort, adminKort] : kort

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Hjem</h1>
      <p className={styles.subtitle}>Velg hvor du vil gå.</p>

      <div className={styles.kortGrid}>
        {alleKort.map((k) => (
          <button
            key={k.view}
            type="button"
            className={styles.kort}
            onClick={() => onNavigate(k.view)}
          >
            <span className={styles.kortIkon} aria-hidden="true">
              {k.ikon}
            </span>
            <span className={styles.kortTittel}>{k.tittel}</span>
            <span className={styles.kortBeskrivelse}>{k.beskrivelse}</span>
          </button>
        ))}
      </div>
    </main>
  )
}

export default HjemPage
