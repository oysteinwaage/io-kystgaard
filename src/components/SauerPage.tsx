import { useSauer } from '@/hooks/useSauer'
import type { SauMedId } from '@/types/sau'
import styles from './SauerPage.module.scss'

const kjonnLabel: Record<string, string> = {
  soye: 'Søye',
  vaer: 'Vær',
  lam: 'Lam',
}

const statusLabel: Record<string, string> = {
  aktiv: 'Aktiv',
  solgt: 'Solgt',
  slaktet: 'Slaktet',
  dod: 'Død',
}

function formatDato(dato?: string) {
  if (!dato) return null
  const parsed = new Date(dato)
  if (Number.isNaN(parsed.getTime())) return dato
  return parsed.toLocaleDateString('nb-NO')
}

function SauKort({ sau }: { sau: SauMedId }) {
  const statusClass = sau.status ? styles[`status-${sau.status}`] : undefined

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <h2 className={styles.name}>
          {sau.navn}
          {sau.oereNr && <span className={styles.oereNr}> ({sau.oereNr})</span>}
        </h2>
      </header>

      {sau.status && (
        <span className={`${styles.status} ${statusClass ?? ''}`}>
          {statusLabel[sau.status] ?? sau.status}
        </span>
      )}

      <dl className={styles.details}>
        {sau.rase && (
          <div className={styles.detail}>
            <dt>Rase</dt>
            <dd>{sau.rase}</dd>
          </div>
        )}
        {sau.kjonn && (
          <div className={styles.detail}>
            <dt>Kjønn</dt>
            <dd>{kjonnLabel[sau.kjonn] ?? sau.kjonn}</dd>
          </div>
        )}
        {sau.fodselsdato && (
          <div className={styles.detail}>
            <dt>Født</dt>
            <dd>{formatDato(sau.fodselsdato)}</dd>
          </div>
        )}
        {sau.farge && (
          <div className={styles.detail}>
            <dt>Farge</dt>
            <dd>{sau.farge}</dd>
          </div>
        )}
        {typeof sau.vekt === 'number' && (
          <div className={styles.detail}>
            <dt>Vekt</dt>
            <dd>{sau.vekt} kg</dd>
          </div>
        )}
      </dl>

      {sau.notater && <p className={styles.notater}>{sau.notater}</p>}
    </article>
  )
}

function SauerPage() {
  const { sauer, isLoading, error } = useSauer()

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Sauer</h1>

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && sauer.length === 0 && (
        <p className={styles.subtitle}>Ingen sauer er registrert ennå.</p>
      )}

      {!isLoading && sauer.length > 0 && (
        <div className={styles.grid}>
          {sauer.map((sau) => (
            <SauKort key={sau.id} sau={sau} />
          ))}
        </div>
      )}
    </main>
  )
}

export default SauerPage
