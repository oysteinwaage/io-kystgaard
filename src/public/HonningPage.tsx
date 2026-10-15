import styles from './Sider.module.scss'

interface Honningprodukt {
  id: string
  navn: string
  beskrivelse: string
  storrelse: string
  pris: number
}

// Midlertidige eksempeldata – skal på sikt hentes fra databasen med bilde.
const honning: Honningprodukt[] = [
  { id: '1', navn: 'Sommerhonning', beskrivelse: 'Mild og lys honning fra sommerblomstene.', storrelse: '350 g', pris: 120 },
  { id: '2', navn: 'Sommerhonning', beskrivelse: 'Mild og lys honning fra sommerblomstene.', storrelse: '500 g', pris: 160 },
  { id: '3', navn: 'Lynghonning', beskrivelse: 'Kraftig og aromatisk honning fra røsslyngen.', storrelse: '350 g', pris: 150 },
]

const produksjonsbilder = ['Bikubene på gården', 'Innhøsting av tavler', 'Slynging og tapping']

const kr = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 })

function HonningPage() {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Fra bikubene våre</p>
          <h1 className={styles.heroTittel}>Honning</h1>
          <p className={styles.ingress}>
            Biene våre henter nektar fra blomsterengene og lyngheiene rundt gården. Honningen
            slynges og tappes for hånd, uten oppvarming eller tilsetninger.
          </p>
        </div>
        <div className={`${styles.bilde} ${styles.bildeHonning}`}>
          <div>
            🐝<span className={styles.bildeTekst}>Bilde kommer</span>
          </div>
        </div>
      </section>

      <section className={styles.seksjon}>
        <h2 className={styles.seksjonTittel}>Om produksjonen</h2>
        <div className={styles.tekst}>
          <p>
            Vi har bikuber plassert på ulike steder rundt gården, slik at biene får variert
            beitetilgang gjennom sesongen. Tidlig på sommeren gir det en mild og lys honning,
            mens lyngtrekket på sensommeren gir en mørkere og mer smaksrik honning.
          </p>
          <p>
            All honning er naturlig og kan krystallisere over tid – det er et tegn på kvalitet.
            Sett glasset i lunkent vann om du ønsker den flytende igjen.
          </p>
        </div>
        <div className={styles.grid}>
          {produksjonsbilder.map((tekst) => (
            <figure key={tekst} className={styles.kort} style={{ margin: 0 }}>
              <div className={`${styles.bilde} ${styles.bildeGress}`}>📷</div>
              <figcaption className={styles.kortInnhold}>
                <span className={styles.kortMeta}>{tekst}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.seksjon}>
        <h2 className={styles.seksjonTittel}>Kjøp honning</h2>
        <div className={styles.grid}>
          {honning.map((h) => (
            <article key={h.id} className={styles.kort}>
              <div className={`${styles.bilde} ${styles.bildeHonning}`}>🍯</div>
              <div className={styles.kortInnhold}>
                <h3 className={styles.kortTittel}>
                  {h.navn} <span className={styles.kortMeta}>· {h.storrelse}</span>
                </h3>
                <p className={styles.kortMeta}>{h.beskrivelse}</p>
                <span className={styles.pris}>{kr.format(h.pris)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export default HonningPage
