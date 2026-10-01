import { useMemo, useState } from 'react'
import { Select } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import type { SauDoedsAarsak } from '@/types/sau'
import styles from './HjemPage.module.scss'

const doedsAarsakLabel: Record<SauDoedsAarsak, string> = {
  sykdom: 'Sykdom',
  slakt: 'Slakt',
  forsvunnet: 'Forsvunnet',
}

const forsteAar = 2010
const sisteAar = new Date().getFullYear()
const aarOptions = Array.from({ length: sisteAar - forsteAar + 1 }, (_, i) =>
  String(sisteAar - i),
)

function StatCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: 'dod'
}) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${variant === 'dod' ? styles.statValueDod : ''}`}>
        {value}
      </span>
    </div>
  )
}

function HjemPage() {
  const { sauer, isLoading, error } = useSauer()
  const [valgtAar, setValgtAar] = useState<string>(String(sisteAar))

  const lam = useMemo(
    () => sauer.filter((sau) => sau.foedselsaar === Number(valgtAar)),
    [sauer, valgtAar],
  )

  const hannlam = lam.filter((sau) => sau.kjoenn === 'HANN').length
  const hunnlam = lam.filter((sau) => sau.kjoenn === 'HUNN').length
  const doede = lam.filter((sau) => !!sau.doedsAarsak)
  const levende = lam.length - doede.length

  const doedsAarsakTelling: Record<SauDoedsAarsak, number> = {
    sykdom: doede.filter((sau) => sau.doedsAarsak === 'sykdom').length,
    slakt: doede.filter((sau) => sau.doedsAarsak === 'slakt').length,
    forsvunnet: doede.filter((sau) => sau.doedsAarsak === 'forsvunnet').length,
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hjem</h1>
        <Select
          className={styles.aarVelger}
          label="Lam født i"
          data={aarOptions}
          value={valgtAar}
          onChange={(verdi) => setValgtAar(verdi ?? String(sisteAar))}
          allowDeselect={false}
          searchable
        />
      </div>

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.subtitle}>{error}</p>}

      {!isLoading && !error && lam.length === 0 && (
        <p className={styles.subtitle}>Ingen lam registrert for {valgtAar}.</p>
      )}

      {!isLoading && !error && lam.length > 0 && (
        <>
          <div className={styles.statGrid}>
            <StatCard label={`Lam i ${valgtAar}`} value={lam.length} />
            <StatCard label="Hannlam" value={hannlam} />
            <StatCard label="Hunnlam" value={hunnlam} />
            <StatCard label="Levende" value={levende} />
            <StatCard label="Døde" value={doede.length} variant={doede.length > 0 ? 'dod' : undefined} />
          </div>

          {doede.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Dødsårsak</h2>
              <dl className={styles.breakdown}>
                {(Object.keys(doedsAarsakLabel) as SauDoedsAarsak[]).map((aarsak) => (
                  <div className={styles.breakdownRow} key={aarsak}>
                    <dt className={styles.breakdownLabel}>{doedsAarsakLabel[aarsak]}</dt>
                    <dd className={styles.breakdownValue}>{doedsAarsakTelling[aarsak]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default HjemPage
