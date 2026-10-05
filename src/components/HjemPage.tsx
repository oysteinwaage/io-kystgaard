import { useMemo, useState } from 'react'
import { Select } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { europKodeForTallverdi, europSnittverdi } from '@/lib/europ'
import type { SauDoedsAarsak } from '@/types/sau'
import styles from './HjemPage.module.scss'

const doedsAarsakLabel: Record<Exclude<SauDoedsAarsak, 'solgt'>, string> = {
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
  variant?: 'dod' | 'solgt'
}) {
  const variantClass =
    variant === 'dod' ? styles.statValueDod : variant === 'solgt' ? styles.statValueSolgt : ''
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${variantClass}`}>{value}</span>
    </div>
  )
}

function SlaktStatCard({
  antall,
  snittverdi,
}: {
  antall: number
  snittverdi: number | null
}) {
  return (
    <div className={`${styles.statCard} ${styles.slaktCard}`}>
      <div className={styles.slaktCardHalf}>
        <span className={styles.slaktLabel}>Slakt</span>
        <span className={`${styles.slaktValue} ${styles.statValueDod}`}>{antall}</span>
      </div>
      <div className={styles.slaktCardDivider} />
      <div className={styles.slaktCardHalf}>
        <span className={styles.slaktLabel}>Snittkategori</span>
        <span className={styles.slaktValue}>
          {snittverdi != null ? europKodeForTallverdi(snittverdi) : '–'}
        </span>
        {snittverdi != null && (
          <span className={styles.slaktSubvalue}>{snittverdi.toFixed(1)}</span>
        )}
      </div>
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
  const solgte = lam.filter((sau) => sau.doedsAarsak === 'solgt')
  const doede = lam.filter((sau) => !!sau.doedsAarsak && sau.doedsAarsak !== 'solgt')
  const levende = lam.length - doede.length - solgte.length

  const doedsAarsakTelling: Record<Exclude<SauDoedsAarsak, 'solgt'>, number> = {
    sykdom: doede.filter((sau) => sau.doedsAarsak === 'sykdom').length,
    slakt: doede.filter((sau) => sau.doedsAarsak === 'slakt').length,
    forsvunnet: doede.filter((sau) => sau.doedsAarsak === 'forsvunnet').length,
  }

  const slaktet = doede.filter((sau) => sau.doedsAarsak === 'slakt')
  const slaktSnittverdi = europSnittverdi(slaktet.map((sau) => sau.slaktKategori))

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
        <div className={styles.statGrid}>
          <StatCard label={`Lam i ${valgtAar}`} value={lam.length} />
          <StatCard label="♂ Værlam" value={hannlam} />
          <StatCard label="♀ Søye" value={hunnlam} />
          <StatCard label="Levende" value={levende} />
          <StatCard
            label="Solgt"
            value={solgte.length}
            variant={solgte.length > 0 ? 'solgt' : undefined}
          />
          {(Object.keys(doedsAarsakLabel) as Exclude<SauDoedsAarsak, 'solgt'>[])
            .filter((aarsak) => doedsAarsakTelling[aarsak] > 0)
            .map((aarsak) =>
              aarsak === 'slakt' ? (
                <SlaktStatCard
                  key={aarsak}
                  antall={doedsAarsakTelling.slakt}
                  snittverdi={slaktSnittverdi}
                />
              ) : (
                <StatCard
                  key={aarsak}
                  label={doedsAarsakLabel[aarsak]}
                  value={doedsAarsakTelling[aarsak]}
                  variant="dod"
                />
              ),
            )}
        </div>
      )}
    </main>
  )
}

export default HjemPage
