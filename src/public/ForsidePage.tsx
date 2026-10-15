import { SideLenke, type PublicSide } from './PublicSite'
import styles from './Sider.module.scss'

interface ForsidePageProps {
  onNavigate: (side: PublicSide) => void
}

const produkter: { side: PublicSide; tittel: string; tekst: string; ikon: string; bildeKlasse?: string }[] = [
  {
    side: 'saueskinn',
    tittel: 'Saueskinn',
    tekst: 'Myke, naturlige skinn fra våre egne sauer – garvet og klare for stua.',
    ikon: '🐑',
  },
  {
    side: 'honning',
    tittel: 'Honning',
    tekst: 'Lokal honning fra bikubene våre, slynget og tappet på gården.',
    ikon: '🍯',
    bildeKlasse: styles.bildeHonning,
  },
  {
    side: 'lammekjott',
    tittel: 'Lammekjøtt',
    tekst: 'Bestill lammekjøtt fra dyr som har beitet fritt i kystlandskapet.',
    ikon: '🌿',
    bildeKlasse: styles.bildeGress,
  },
]

function ForsidePage({ onNavigate }: ForsidePageProps) {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Velkommen til</p>
          <h1 className={styles.heroTittel}>Lynghaugen Gard</h1>
          <p className={styles.ingress}>
            Vi er en liten gård ved kysten som driver med sau og birøkt. Her finner du produktene
            våre – laget med omtanke for dyra, naturen og deg som kunde.
          </p>
          <SideLenke side="lammekjott" onNavigate={onNavigate} className={styles.knapp}>
            Bestill lammekjøtt
          </SideLenke>
        </div>
        <div className={`${styles.bilde} ${styles.bildeGress}`}>
          <div>
            🏡<span className={styles.bildeTekst}>Bilde fra gården kommer</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.seksjonTittel}>Våre produkter</h2>
        <div className={styles.grid}>
          {produkter.map((p) => (
            <SideLenke key={p.side} side={p.side} onNavigate={onNavigate} className={styles.kort}>
              <div className={`${styles.bilde} ${p.bildeKlasse ?? ''}`}>{p.ikon}</div>
              <div className={styles.kortInnhold}>
                <h3 className={styles.kortTittel}>{p.tittel}</h3>
                <p className={styles.kortMeta}>{p.tekst}</p>
              </div>
            </SideLenke>
          ))}
        </div>
      </section>
    </>
  )
}

export default ForsidePage
