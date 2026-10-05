import { useMemo, useState } from 'react'
import { Checkbox, Divider, Group, List, Select, Table, Tabs, Text } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { europKodeForTallverdi, europSnittverdi } from '@/lib/europ'
import type { SauDoedsAarsak, SauMedId } from '@/types/sau'
import styles from './StatistikkPage.module.scss'

const doedsAarsakLabel: Record<Exclude<SauDoedsAarsak, 'solgt'>, string> = {
  sykdom: 'Sykdom',
  slakt: 'Slakt',
  forsvunnet: 'Forsvunnet',
}

const forsteLammeAar = 2010
const sisteLammeAar = new Date().getFullYear()
const lammeAarOptions = Array.from(
  { length: sisteLammeAar - forsteLammeAar + 1 },
  (_, i) => String(sisteLammeAar - i),
)

type SlaktParam = 'slaktKategori' | 'slaktPris' | 'slaktevekt' | 'slaktevektTotal'

const slaktParametre: SlaktParam[] = [
  'slaktKategori',
  'slaktPris',
  'slaktevekt',
  'slaktevektTotal',
]

const slaktParamLabel: Record<SlaktParam, string> = {
  slaktKategori: 'Slaktekategori',
  slaktPris: 'Slaktpris',
  slaktevekt: 'Slaktevekt snitt',
  slaktevektTotal: 'Slaktevekt totalt',
}

interface ParamStat {
  snitt: number | null
  antall: number
}

interface MorSlaktStatistikk {
  mor: SauMedId
  slaktKategori: ParamStat
  slaktPris: ParamStat
  slaktevekt: ParamStat
  slaktevektTotal: ParamStat
}

interface RangertMor extends MorSlaktStatistikk {
  poengsum: number
}

function gjennomsnitt(verdier: number[]): number | null {
  if (verdier.length === 0) return null
  return verdier.reduce((sum, verdi) => sum + verdi, 0) / verdier.length
}

function sum(verdier: number[]): number | null {
  if (verdier.length === 0) return null
  return verdier.reduce((sum, verdi) => sum + verdi, 0)
}

function beregnMorStatistikk(mor: SauMedId, barn: SauMedId[]): MorSlaktStatistikk {
  const medSlaktKategori = barn.filter((b) => b.slaktKategori)
  const medSlaktPris = barn.filter((b) => b.slaktPris != null)
  const medSlaktevekt = barn.filter((b) => b.slaktevekt != null)
  const slaktevektVerdier = medSlaktevekt.map((b) => b.slaktevekt as number)

  return {
    mor,
    slaktKategori: {
      snitt: europSnittverdi(medSlaktKategori.map((b) => b.slaktKategori)),
      antall: medSlaktKategori.length,
    },
    slaktPris: {
      snitt: gjennomsnitt(medSlaktPris.map((b) => b.slaktPris as number)),
      antall: medSlaktPris.length,
    },
    slaktevekt: {
      snitt: gjennomsnitt(slaktevektVerdier),
      antall: medSlaktevekt.length,
    },
    slaktevektTotal: {
      snitt: sum(slaktevektVerdier),
      antall: medSlaktevekt.length,
    },
  }
}

function formatterParamverdi(param: SlaktParam, snitt: number): string {
  switch (param) {
    case 'slaktKategori':
      return `${europKodeForTallverdi(snitt)} (${snitt.toFixed(1)})`
    case 'slaktPris':
      return `${Math.round(snitt).toLocaleString('nb-NO')} kr`
    case 'slaktevekt':
    case 'slaktevektTotal':
      return `${snitt.toFixed(1)} kg`
  }
}

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

type LamParam =
  | 'lamPerAar'
  | 'foedselsvekt'
  | 'foedselsvektTotal'
  | 'hoestvekt'
  | 'hoestvektTotal'
  | 'sykdomProsent'

const lamParametre: LamParam[] = [
  'lamPerAar',
  'foedselsvekt',
  'foedselsvektTotal',
  'hoestvekt',
  'hoestvektTotal',
  'sykdomProsent',
]

const lamParamLabel: Record<LamParam, string> = {
  lamPerAar: 'Lam pr år i snitt',
  foedselsvekt: 'Fødselsvekt',
  foedselsvektTotal: 'Totalvekt (fødsel)',
  hoestvekt: 'Høstvekt',
  hoestvektTotal: 'Totalvekt (høst)',
  sykdomProsent: 'Dødd av sykdom',
}

/** For disse parametrene er en lavere verdi det beste (f.eks. lavere dødelighet). */
const lamParamLavestErBest: Record<LamParam, boolean> = {
  lamPerAar: false,
  foedselsvekt: false,
  foedselsvektTotal: false,
  hoestvekt: false,
  hoestvektTotal: false,
  sykdomProsent: true,
}

const lamParamAntallLabel: Record<LamParam, (antall: number) => string> = {
  lamPerAar: (antall) => `${antall} år med lam`,
  foedselsvekt: (antall) => `${antall} lam`,
  foedselsvektTotal: (antall) => `${antall} lam`,
  hoestvekt: (antall) => `${antall} lam`,
  hoestvektTotal: (antall) => `${antall} lam`,
  sykdomProsent: (antall) => `${antall} lam totalt`,
}

interface LamParamStat {
  snitt: number | null
  antall: number
}

interface MorLamStatistikk {
  mor: SauMedId
  lamPerAar: LamParamStat
  foedselsvekt: LamParamStat
  foedselsvektTotal: LamParamStat
  hoestvekt: LamParamStat
  hoestvektTotal: LamParamStat
  sykdomProsent: LamParamStat
  kjonnsfordeling: { hann: number; hunn: number; ukjent: number }
}

interface RangertMorLam extends MorLamStatistikk {
  poengsum: number
}

function beregnMorLamStatistikk(mor: SauMedId, barn: SauMedId[]): MorLamStatistikk {
  const aarTelling = new Map<number, number>()
  for (const b of barn) {
    if (b.foedselsaar != null) {
      aarTelling.set(b.foedselsaar, (aarTelling.get(b.foedselsaar) ?? 0) + 1)
    }
  }
  const antallAarMedLam = aarTelling.size
  const lamPerAarSnitt =
    antallAarMedLam > 0
      ? Array.from(aarTelling.values()).reduce((sum, verdi) => sum + verdi, 0) /
        antallAarMedLam
      : null

  const medFoedselsvekt = barn.filter((b) => b.foedselsvekt != null)
  const medHoestvekt = barn.filter((b) => b.hoestvekt != null)
  const dodeAvSykdom = barn.filter((b) => b.doedsAarsak === 'sykdom').length

  const foedselsvektVerdier = medFoedselsvekt.map((b) => b.foedselsvekt as number)
  const hoestvektVerdier = medHoestvekt.map((b) => b.hoestvekt as number)

  return {
    mor,
    lamPerAar: { snitt: lamPerAarSnitt, antall: antallAarMedLam },
    foedselsvekt: {
      snitt: gjennomsnitt(foedselsvektVerdier),
      antall: medFoedselsvekt.length,
    },
    foedselsvektTotal: {
      snitt: sum(foedselsvektVerdier),
      antall: medFoedselsvekt.length,
    },
    hoestvekt: {
      snitt: gjennomsnitt(hoestvektVerdier),
      antall: medHoestvekt.length,
    },
    hoestvektTotal: {
      snitt: sum(hoestvektVerdier),
      antall: medHoestvekt.length,
    },
    sykdomProsent: {
      snitt: barn.length > 0 ? (dodeAvSykdom / barn.length) * 100 : null,
      antall: barn.length,
    },
    kjonnsfordeling: {
      hann: barn.filter((b) => b.kjoenn === 'HANN').length,
      hunn: barn.filter((b) => b.kjoenn === 'HUNN').length,
      ukjent: barn.filter((b) => b.kjoenn !== 'HANN' && b.kjoenn !== 'HUNN').length,
    },
  }
}

function formatterLamParamverdi(param: LamParam, snitt: number): string {
  switch (param) {
    case 'lamPerAar':
      return `${snitt.toFixed(1)} lam/år`
    case 'foedselsvekt':
    case 'foedselsvektTotal':
    case 'hoestvekt':
    case 'hoestvektTotal':
      return `${snitt.toFixed(1)} kg`
    case 'sykdomProsent':
      return `${snitt.toFixed(0)} %`
  }
}

function LamPrSoyeTabell({
  sauer,
  isLoading,
  error,
}: {
  sauer: SauMedId[]
  isLoading: boolean
  error: string | null
}) {
  const [valgteParametre, setValgteParametre] = useState<Record<LamParam, boolean>>({
    lamPerAar: true,
    foedselsvekt: true,
    foedselsvektTotal: true,
    hoestvekt: true,
    hoestvektTotal: true,
    sykdomProsent: true,
  })

  const aktiveParametre = lamParametre.filter((param) => valgteParametre[param])

  const alleMorStatistikker = useMemo<MorLamStatistikk[]>(() => {
    const morIder = new Set(sauer.map((sau) => sau.barnAv).filter((id): id is string => !!id))

    return Array.from(morIder)
      .map((morId) => {
        const mor = sauer.find((sau) => sau.id === morId)
        if (!mor) return null
        const barn = sauer.filter((sau) => sau.barnAv === morId)
        return beregnMorLamStatistikk(mor, barn)
      })
      .filter((rad): rad is MorLamStatistikk => rad != null)
  }, [sauer])

  const rangerteMoedre = useMemo<RangertMorLam[]>(() => {
    if (aktiveParametre.length === 0) return []

    const minMaxPerParam: Partial<Record<LamParam, { min: number; max: number }>> = {}
    for (const param of aktiveParametre) {
      const verdier = alleMorStatistikker
        .map((rad) => rad[param].snitt)
        .filter((verdi): verdi is number => verdi != null)
      if (verdier.length > 0) {
        minMaxPerParam[param] = { min: Math.min(...verdier), max: Math.max(...verdier) }
      }
    }

    return alleMorStatistikker
      .map((rad) => {
        const normaliserteVerdier = aktiveParametre
          .map((param) => {
            const snitt = rad[param].snitt
            const grenser = minMaxPerParam[param]
            if (snitt == null || !grenser) return null
            const rawNormalisert =
              grenser.max === grenser.min
                ? 1
                : (snitt - grenser.min) / (grenser.max - grenser.min)
            return lamParamLavestErBest[param] ? 1 - rawNormalisert : rawNormalisert
          })
          .filter((verdi): verdi is number => verdi != null)

        if (normaliserteVerdier.length === 0) return null

        const poengsum =
          (normaliserteVerdier.reduce((sum, verdi) => sum + verdi, 0) /
            normaliserteVerdier.length) *
          100

        return { ...rad, poengsum }
      })
      .filter((rad): rad is RangertMorLam => rad != null)
      .sort((a, b) => b.poengsum - a.poengsum)
  }, [alleMorStatistikker, aktiveParametre])

  function vekslParam(param: LamParam) {
    setValgteParametre((forrige) => ({ ...forrige, [param]: !forrige[param] }))
  }

  return (
    <>
      <div className={styles.smalInnhold}>
        <h3 className={styles.undertabellTitel}>Lam pr søye</h3>
        <Text size="sm" c="dimmed" mb="1rem">
          Søyer rangert etter snitt for sine registrerte lam, basert på parametrene valgt
          under, fra best til verst. Kjønnsfordeling vises kun som informasjon og påvirker
          ikke rangeringen.
        </Text>

        <Group mb="1.25rem" gap="1.25rem">
          {lamParametre.map((param) => (
            <Checkbox
              key={param}
              label={lamParamLabel[param]}
              checked={valgteParametre[param]}
              onChange={() => vekslParam(param)}
            />
          ))}
        </Group>
      </div>

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && aktiveParametre.length === 0 && (
        <p className={styles.subtitle}>Velg minst én parameter for å se rangering.</p>
      )}

      {!isLoading && !error && aktiveParametre.length > 0 && rangerteMoedre.length === 0 && (
        <p className={styles.subtitle}>
          Ingen søyer har registrerte lam med data for valgte parametre ennå.
        </p>
      )}

      {!isLoading && !error && rangerteMoedre.length > 0 && (
        <div className={styles.tabellWrapperSentrert}>
        <Table
          className={styles.tabellAuto}
          verticalSpacing="0.5rem"
          withTableBorder
          withColumnBorders
          highlightOnHover
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Søye</Table.Th>
              {aktiveParametre.map((param) => (
                <Table.Th key={param}>{lamParamLabel[param]}</Table.Th>
              ))}
              <Table.Th>Kjønnsfordeling</Table.Th>
              {aktiveParametre.length > 1 && <Table.Th>Poengsum</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rangerteMoedre.map((rad, index) => (
              <Table.Tr key={rad.mor.id}>
                <Table.Td>{index + 1}</Table.Td>
                <Table.Td>
                  {rad.mor.navn}
                  {rad.mor.oereNr && <span className={styles.oereNr}> ({rad.mor.oereNr})</span>}
                </Table.Td>
                {aktiveParametre.map((param) => {
                  const stat = rad[param]
                  return (
                    <Table.Td key={param}>
                      {stat.snitt == null ? (
                        '–'
                      ) : (
                        <div className={styles.paramCelle}>
                          <span className={styles.paramVerdi}>
                            {formatterLamParamverdi(param, stat.snitt)}
                          </span>
                          <span className={styles.paramUndertekst}>
                            {lamParamAntallLabel[param](stat.antall)}
                          </span>
                        </div>
                      )}
                    </Table.Td>
                  )
                })}
                <Table.Td>
                  {rad.kjonnsfordeling.hann} ♂ / {rad.kjonnsfordeling.hunn} ♀
                  {rad.kjonnsfordeling.ukjent > 0 && (
                    <span className={styles.paramUndertekst}>
                      {' '}
                      (+{rad.kjonnsfordeling.ukjent} ukjent)
                    </span>
                  )}
                </Table.Td>
                {aktiveParametre.length > 1 && <Table.Td>{rad.poengsum.toFixed(0)}</Table.Td>}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </div>
      )}

      <div className={styles.smalInnhold}>
        <div className={styles.forklaring}>
          <Text size="sm" fw={600} mb="0.5rem">
            Hvordan regnes rangeringen ut?
          </Text>
          <List size="sm" c="dimmed" spacing="0.25rem">
            <List.Item>
              For lam pr år, fødselsvekt, høstvekt og dødd av sykdom beregnes et snitt per
              søye, basert på lammene hennes som har en registrert verdi for den
              parameteren: lam pr år er antall lam delt på antall år hun faktisk har hatt
              lam, fødselsvekt og høstvekt er snittvekt i kg, og dødd av sykdom er hvor stor
              andel av alle lammene hennes som har dødd av sykdom.
            </List.Item>
            <List.Item>
              For totalvekt (fødsel) og totalvekt (høst) summeres i stedet vektene til alle
              lammene hennes, siden det sier noe om samlet produksjon og ikke bare
              gjennomsnittlig vekt pr lam.
            </List.Item>
            <List.Item>
              Verdiene normaliseres deretter hver for seg til en skala fra 0 til 1, ut fra
              laveste og høyeste verdi blant alle søyer – slik at lam pr år, vekt(er) og
              sykdomsandel kan vektes likt selv om de har helt forskjellige enheter. For
              dødd av sykdom er det en lavere andel som gir best score.
            </List.Item>
            <List.Item>
              Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene for de
              avhukede parametrene. Søyene rangeres fra høyest til lavest poengsum, altså
              fra best til verst.
            </List.Item>
            <List.Item>
              Kjønnsfordeling vises bare som informasjon og påvirker ikke poengsummen eller
              rangeringen.
            </List.Item>
            <List.Item>
              Kun søyer med minst ett lam som har en registrert verdi for minst én av de
              valgte parametrene vises i tabellen.
            </List.Item>
          </List>
        </div>
      </div>
    </>
  )
}

function LammingSeksjon() {
  const { sauer, isLoading, error } = useSauer()
  const [valgtAar, setValgtAar] = useState<string>(String(sisteLammeAar))

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
    <section className={styles.section}>
      <div className={styles.smalInnhold}>
        <div className={styles.lammingHeader}>
          <h2 className={styles.sectionTitle}>Lamming</h2>
          <Select
            className={styles.aarVelger}
            label="Lam født i"
            data={lammeAarOptions}
            value={valgtAar}
            onChange={(verdi) => setValgtAar(verdi ?? String(sisteLammeAar))}
            allowDeselect={false}
            searchable
          />
        </div>

        {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
        {error && <p className={styles.error}>{error}</p>}

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
      </div>

      <Divider my="2rem" />

      <LamPrSoyeTabell sauer={sauer} isLoading={isLoading} error={error} />
    </section>
  )
}

function SlaktingSeksjon() {
  const { sauer, isLoading, error } = useSauer()
  const [valgteParametre, setValgteParametre] = useState<Record<SlaktParam, boolean>>({
    slaktKategori: true,
    slaktPris: true,
    slaktevekt: true,
    slaktevektTotal: true,
  })

  const aktiveParametre = slaktParametre.filter((param) => valgteParametre[param])

  const alleMorStatistikker = useMemo<MorSlaktStatistikk[]>(() => {
    const morIder = new Set(sauer.map((sau) => sau.barnAv).filter((id): id is string => !!id))

    return Array.from(morIder)
      .map((morId) => {
        const mor = sauer.find((sau) => sau.id === morId)
        if (!mor) return null
        const barn = sauer.filter((sau) => sau.barnAv === morId)
        return beregnMorStatistikk(mor, barn)
      })
      .filter((rad): rad is MorSlaktStatistikk => rad != null)
  }, [sauer])

  const rangerteMoedre = useMemo<RangertMor[]>(() => {
    if (aktiveParametre.length === 0) return []

    const minMaxPerParam: Partial<Record<SlaktParam, { min: number; max: number }>> = {}
    for (const param of aktiveParametre) {
      const verdier = alleMorStatistikker
        .map((rad) => rad[param].snitt)
        .filter((verdi): verdi is number => verdi != null)
      if (verdier.length > 0) {
        minMaxPerParam[param] = { min: Math.min(...verdier), max: Math.max(...verdier) }
      }
    }

    return alleMorStatistikker
      .map((rad) => {
        const normaliserteVerdier = aktiveParametre
          .map((param) => {
            const snitt = rad[param].snitt
            const grenser = minMaxPerParam[param]
            if (snitt == null || !grenser) return null
            if (grenser.max === grenser.min) return 1
            return (snitt - grenser.min) / (grenser.max - grenser.min)
          })
          .filter((verdi): verdi is number => verdi != null)

        if (normaliserteVerdier.length === 0) return null

        const poengsum =
          (normaliserteVerdier.reduce((sum, verdi) => sum + verdi, 0) /
            normaliserteVerdier.length) *
          100

        return { ...rad, poengsum }
      })
      .filter((rad): rad is RangertMor => rad != null)
      .sort((a, b) => b.poengsum - a.poengsum)
  }, [alleMorStatistikker, aktiveParametre])

  function vekslParam(param: SlaktParam) {
    setValgteParametre((forrige) => ({ ...forrige, [param]: !forrige[param] }))
  }

  return (
    <section className={styles.section}>
      <div className={styles.smalInnhold}>
        <h2 className={styles.sectionTitle}>Snitt slaktestatistikk per sau</h2>
        <Text size="sm" c="dimmed" mb="1rem">
          Sauer rangert etter snitt for sine registrerte lam, basert på parametrene valgt
          under, fra best til verst.
        </Text>

        <Group mb="1.25rem" gap="1.25rem">
          {slaktParametre.map((param) => (
            <Checkbox
              key={param}
              label={slaktParamLabel[param]}
              checked={valgteParametre[param]}
              onChange={() => vekslParam(param)}
            />
          ))}
        </Group>
      </div>

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && aktiveParametre.length === 0 && (
        <p className={styles.subtitle}>Velg minst én parameter for å se rangering.</p>
      )}

      {!isLoading && !error && aktiveParametre.length > 0 && rangerteMoedre.length === 0 && (
        <p className={styles.subtitle}>
          Ingen sauer har registrerte lam med data for valgte parametre ennå.
        </p>
      )}

      {!isLoading && !error && rangerteMoedre.length > 0 && (
        <div className={styles.tabellWrapperSentrert}>
        <Table
          className={styles.tabellAuto}
          verticalSpacing="0.5rem"
          withTableBorder
          withColumnBorders
          highlightOnHover
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Sau</Table.Th>
              {aktiveParametre.map((param) => (
                <Table.Th key={param}>{slaktParamLabel[param]}</Table.Th>
              ))}
              {aktiveParametre.length > 1 && <Table.Th>Poengsum</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rangerteMoedre.map((rad, index) => (
              <Table.Tr key={rad.mor.id}>
                <Table.Td>{index + 1}</Table.Td>
                <Table.Td>
                  {rad.mor.navn}
                  {rad.mor.oereNr && <span className={styles.oereNr}> ({rad.mor.oereNr})</span>}
                </Table.Td>
                {aktiveParametre.map((param) => {
                  const stat = rad[param]
                  return (
                    <Table.Td key={param}>
                      {stat.snitt == null ? (
                        '–'
                      ) : (
                        <div className={styles.paramCelle}>
                          <span className={styles.paramVerdi}>
                            {formatterParamverdi(param, stat.snitt)}
                          </span>
                          <span className={styles.paramUndertekst}>{stat.antall} lam</span>
                        </div>
                      )}
                    </Table.Td>
                  )
                })}
                {aktiveParametre.length > 1 && <Table.Td>{rad.poengsum.toFixed(0)}</Table.Td>}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </div>
      )}

      <div className={styles.smalInnhold}>
        <div className={styles.forklaring}>
          <Text size="sm" fw={600} mb="0.5rem">
            Hvordan regnes "beste lam" ut?
          </Text>
          <List size="sm" c="dimmed" spacing="0.25rem">
            <List.Item>
              For slaktekategori, slaktpris og slaktevekt snitt beregnes et snitt per sau,
              basert på lammene hennes som har en registrert verdi for den parameteren
              (slaktekategori gjøres om til en tallverdi fra 1 for P− til 15 for E+, slik at
              den kan regnes på som et tall). For slaktevekt totalt summeres slaktevekten
              til alle lammene hennes i stedet, siden det sier noe om samlet kjøttproduksjon
              og ikke bare kvaliteten pr lam.
            </List.Item>
            <List.Item>
              Verdiene normaliseres deretter hver for seg til en skala fra 0 til 1, ut fra
              laveste og høyeste verdi blant alle sauer – slik at kategori, pris og de to
              vektmålene kan vektes likt selv om de har helt forskjellige enheter.
            </List.Item>
            <List.Item>
              Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene for de
              avhukede parametrene. Sauene rangeres fra høyest til lavest poengsum, altså
              fra best til verst.
            </List.Item>
            <List.Item>
              Kun sauer med minst ett lam som har en registrert verdi for minst én av de
              valgte parametrene vises i tabellen.
            </List.Item>
          </List>
        </div>
      </div>
    </section>
  )
}

function SlektstreSeksjon() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Slektstre</h2>
      <Text size="sm" c="dimmed">
        Visning av slektstre kommer her.
      </Text>
    </section>
  )
}

function StatistikkPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Statistikk</h1>

      <Tabs defaultValue="lamming" keepMounted={false}>
        <Tabs.List mb="1.5rem">
          <Tabs.Tab value="lamming">Lamming</Tabs.Tab>
          <Tabs.Tab value="slakting">Slakting</Tabs.Tab>
          <Tabs.Tab value="slektstre">Slektstre</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="lamming">
          <LammingSeksjon />
        </Tabs.Panel>
        <Tabs.Panel value="slakting">
          <SlaktingSeksjon />
        </Tabs.Panel>
        <Tabs.Panel value="slektstre">
          <SlektstreSeksjon />
        </Tabs.Panel>
      </Tabs>
    </main>
  )
}

export default StatistikkPage
