import styles from './Sider.module.scss'

interface Saueskinn {
  id: string
  navn: string
  farge: string
  storrelse: string
  pris: number
  solgt?: boolean
}

// Midlertidige eksempeldata – skal på sikt hentes fra databasen med bilde.
const saueskinn: Saueskinn[] = [
  { id: '1', navn: 'Saueskinn, lys', farge: 'Hvit/kremfarget', storrelse: 'ca. 100 × 70 cm', pris: 1200 },
  { id: '2', navn: 'Saueskinn, mørk', farge: 'Sort/brun', storrelse: 'ca. 95 × 65 cm', pris: 1100 },
  { id: '3', navn: 'Saueskinn, grå', farge: 'Grå', storrelse: 'ca. 110 × 75 cm', pris: 1350 },
  { id: '4', navn: 'Saueskinn, flekket', farge: 'Hvit med brune flekker', storrelse: 'ca. 90 × 60 cm', pris: 1000, solgt: true },
]

const kr = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 })

function SaueskinnPage() {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Fra våre egne sauer</p>
          <h1 className={styles.heroTittel}>Saueskinn</h1>
          <p className={styles.ingress}>
            Hvert skinn er unikt i farge, størrelse og ullstruktur. Skinnene er garvet på
            tradisjonelt vis og egner seg like godt i sofaen, på stolen eller i barnevogna.
          </p>
        </div>
        <div className={styles.bilde}>
          <div>
            🐑<span className={styles.bildeTekst}>Bilde kommer</span>
          </div>
        </div>
      </section>

      <section className={styles.seksjon}>
        <h2 className={styles.seksjonTittel}>Til salgs nå</h2>
        <div className={styles.grid}>
          {saueskinn.map((s) => (
            <article key={s.id} className={styles.kort}>
              <div className={styles.bilde}>🐑</div>
              <div className={styles.kortInnhold}>
                <h3 className={styles.kortTittel}>{s.navn}</h3>
                <p className={styles.kortMeta}>Farge: {s.farge}</p>
                <p className={styles.kortMeta}>Størrelse: {s.storrelse}</p>
                {s.solgt ? (
                  <span className={styles.merkelapp}>Solgt</span>
                ) : (
                  <span className={styles.pris}>{kr.format(s.pris)}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.seksjon}>
        <div className={styles.info}>
          <strong>Interessert i et skinn?</strong>
          <p>Ta kontakt på e-post eller telefon, så avtaler vi henting eller sending.</p>
        </div>
      </section>
    </>
  )
}

export default SaueskinnPage
