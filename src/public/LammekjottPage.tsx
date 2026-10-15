import styles from './Sider.module.scss'

const kasser: { navn: string; innhold: string; pris: string }[] = [
  { navn: 'Halvt lam', innhold: 'Ca. 8–10 kg, stykket og vakuumpakket', pris: 'kr 1 700' },
  { navn: 'Helt lam', innhold: 'Ca. 16–20 kg, stykket og vakuumpakket', pris: 'kr 3 300' },
  { navn: 'Fårikålkasse', innhold: 'Ca. 4 kg fårikålkjøtt', pris: 'kr 900' },
]

function LammekjottPage() {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Rett fra gården</p>
          <h1 className={styles.heroTittel}>Lammekjøtt</h1>
          <p className={styles.ingress}>
            Lammene våre går ute på beite hele sommeren og vokser opp i sitt eget tempo. Det gir
            et mørt og smaksrikt kjøtt. Vi selger lammekjøtt direkte til deg hver høst.
          </p>
          {/* Bestilling er ikke åpnet ennå */}
          <button type="button" className={styles.knapp} disabled>
            Send bestilling
          </button>
        </div>
        <div className={`${styles.bilde} ${styles.bildeGress}`}>
          <div>
            🐑<span className={styles.bildeTekst}>Bilde kommer</span>
          </div>
        </div>
      </section>

      <section className={styles.seksjon}>
        <h2 className={styles.seksjonTittel}>Slik bestiller du</h2>
        <ol className={styles.steg}>
          <li>
            <h3>Send oss en forespørsel</h3>
            <p>Send e-post eller ring oss med ønsket mengde, navn og telefonnummer.</p>
          </li>
          <li>
            <h3>Vi bekrefter</h3>
            <p>Du får bekreftelse når vi vet slaktedato, og endelig pris basert på vekt.</p>
          </li>
          <li>
            <h3>Henting</h3>
            <p>Kjøttet hentes på gården, ferdig stykket, pakket og merket.</p>
          </li>
        </ol>
      </section>

      <section className={styles.seksjon}>
        <h2 className={styles.seksjonTittel}>Hva kan du bestille?</h2>
        <table className={styles.tabell}>
          <thead>
            <tr>
              <th>Produkt</th>
              <th>Innhold</th>
              <th>Pris (veiledende)</th>
            </tr>
          </thead>
          <tbody>
            {kasser.map((k) => (
              <tr key={k.navn}>
                <td>
                  <strong>{k.navn}</strong>
                </td>
                <td>{k.innhold}</td>
                <td>{k.pris}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.seksjon}>
        <div className={styles.info}>
          <strong>Begrenset antall</strong>
          <p>
            Slakting skjer på høsten, og vi har et begrenset antall lam hvert år. Bestill gjerne i
            god tid – førstemann til mølla.
          </p>
        </div>
      </section>
    </>
  )
}

export default LammekjottPage
