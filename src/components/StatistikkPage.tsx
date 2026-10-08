import { useMemo, useState } from 'react'
import {
  Checkbox,
  Divider,
  Group,
  List,
  SegmentedControl,
  Select,
  Table,
  Tabs,
  Text,
} from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { useVaer } from '@/hooks/useVaer'
import { europKodeForTallverdi, europSnittverdi } from '@/lib/europ'
import type { SauDoedsAarsak, SauMedId } from '@/types/sau'
import type { VaerMedId } from '@/types/vaer'
import { SlektstreSeksjon } from './Slektstre'
import styles from './StatistikkPage.module.scss'

/** Felles minimumsform for den "forelderen" (søye eller vær) statistikken grupperes på. */
interface StatistikkForelder {
  id: string
  navn?: string
  oereNr?: string
}

type StatistikkModus = 'sau' | 'vaer'

const statistikkModusOptions = [
  { label: 'Pr søye', value: 'sau' },
  { label: 'Pr vær', value: 'vaer' },
]

/**
 * Finner alle "foreldre" (søyer eller værer) som har minst ett registrert lam, sammen med
 * lammene deres – gruppert på `barnAv` (mor) eller `farAv` (vær), avhengig av `modus`.
 */
function finnForeldreMedBarn(
  sauer: SauMedId[],
  vaerer: VaerMedId[],
  modus: StatistikkModus,
): Array<{ forelder: StatistikkForelder; barn: SauMedId[] }> {
  if (modus === 'vaer') {
    const vaerIder = new Set(sauer.map((sau) => sau.farAv).filter((id): id is string => !!id))
    return Array.from(vaerIder)
      .map((vaerId): { forelder: StatistikkForelder; barn: SauMedId[] } | null => {
        const vaer = vaerer.find((v) => v.id === vaerId)
        if (!vaer) return null
        return { forelder: vaer, barn: sauer.filter((sau) => sau.farAv === vaerId) }
      })
      .filter((rad): rad is { forelder: StatistikkForelder; barn: SauMedId[] } => rad != null)
  }

  const morIder = new Set(sauer.map((sau) => sau.barnAv).filter((id): id is string => !!id))
  return Array.from(morIder)
    .map((morId) => {
      const mor = sauer.find((sau) => sau.id === morId)
      if (!mor) return null
      return { forelder: mor, barn: sauer.filter((sau) => sau.barnAv === morId) }
    })
    .filter((rad): rad is { forelder: StatistikkForelder; barn: SauMedId[] } => rad != null)
}

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

/** Alle slakt-parametrene er "høyere er bedre" – ingen av dem skal inverteres. */
const slaktParamLavestErBest: Record<SlaktParam, boolean> = {
  slaktKategori: false,
  slaktPris: false,
  slaktevekt: false,
  slaktevektTotal: false,
}

interface ParamStat {
  snitt: number | null
  antall: number
}

interface MorSlaktStatistikk {
  mor: StatistikkForelder
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

/**
 * Generisk rangeringsberegning, brukt av Lamming-, Slakting- og Beste søye-tabellene:
 * for hver avhuket parameter normaliseres snittverdien til en skala fra 0 til 1 (ut fra
 * laveste/høyeste verdi blant alle rader), eventuelt invertert for parametre der lavest
 * er best. Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene. Rader uten
 * noen gyldig verdi for de avhukede parametrene utelates.
 */
function beregnRangering<
  P extends string,
  T extends { mor: StatistikkForelder } & Record<P, { snitt: number | null }>,
>(
  statistikker: T[],
  aktiveParametre: P[],
  lavestErBest: Record<P, boolean>,
): Array<T & { poengsum: number; antallGrunnlag: number }> {
  if (aktiveParametre.length === 0) return []

  const minMaxPerParam = new Map<P, { min: number; max: number }>()
  for (const param of aktiveParametre) {
    const verdier = statistikker
      .map((rad) => rad[param].snitt)
      .filter((verdi): verdi is number => verdi != null)
    if (verdier.length > 0) {
      minMaxPerParam.set(param, { min: Math.min(...verdier), max: Math.max(...verdier) })
    }
  }

  return statistikker
    .map((rad) => {
      let antallGrunnlag = 0
      const normaliserteVerdier: number[] = []

      for (const param of aktiveParametre) {
        const snitt = rad[param].snitt
        const grenser = minMaxPerParam.get(param)
        if (snitt == null || !grenser) continue

        antallGrunnlag += 1
        const rawNormalisert =
          grenser.max === grenser.min ? 1 : (snitt - grenser.min) / (grenser.max - grenser.min)
        normaliserteVerdier.push(lavestErBest[param] ? 1 - rawNormalisert : rawNormalisert)
      }

      if (normaliserteVerdier.length === 0) return null

      const poengsum =
        (normaliserteVerdier.reduce((sum, verdi) => sum + verdi, 0) / normaliserteVerdier.length) *
        100

      return { ...rad, poengsum, antallGrunnlag }
    })
    .filter((rad): rad is T & { poengsum: number; antallGrunnlag: number } => rad != null)
    .sort((a, b) => b.poengsum - a.poengsum)
}

function beregnMorStatistikk(mor: StatistikkForelder, barn: SauMedId[]): MorSlaktStatistikk {
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
  | 'fellerEgenUllProsent'

const lamParametre: LamParam[] = [
  'lamPerAar',
  'foedselsvekt',
  'foedselsvektTotal',
  'hoestvekt',
  'hoestvektTotal',
  'sykdomProsent',
  'fellerEgenUllProsent',
]

const lamParamLabel: Record<LamParam, string> = {
  lamPerAar: 'Lam pr år i snitt',
  foedselsvekt: 'Sommervekt',
  foedselsvektTotal: 'Totalvekt (sommer)',
  hoestvekt: 'Høstvekt',
  hoestvektTotal: 'Totalvekt (høst)',
  sykdomProsent: 'Dødd av sykdom',
  fellerEgenUllProsent: 'Feller egen ull',
}

/** For disse parametrene er en lavere verdi det beste (f.eks. lavere dødelighet). */
const lamParamLavestErBest: Record<LamParam, boolean> = {
  lamPerAar: false,
  foedselsvekt: false,
  foedselsvektTotal: false,
  hoestvekt: false,
  hoestvektTotal: false,
  sykdomProsent: true,
  fellerEgenUllProsent: false,
}

const lamParamAntallLabel: Record<LamParam, (antall: number) => string> = {
  lamPerAar: (antall) => `${antall} år med lam`,
  foedselsvekt: (antall) => `${antall} lam`,
  foedselsvektTotal: (antall) => `${antall} lam`,
  hoestvekt: (antall) => `${antall} lam`,
  hoestvektTotal: (antall) => `${antall} lam`,
  sykdomProsent: (antall) => `${antall} lam totalt`,
  fellerEgenUllProsent: (antall) => `${antall} lam med registrert ulltype`,
}

interface LamParamStat {
  snitt: number | null
  antall: number
}

interface MorLamStatistikk {
  mor: StatistikkForelder
  lamPerAar: LamParamStat
  foedselsvekt: LamParamStat
  foedselsvektTotal: LamParamStat
  hoestvekt: LamParamStat
  hoestvektTotal: LamParamStat
  sykdomProsent: LamParamStat
  fellerEgenUllProsent: LamParamStat
  kjonnsfordeling: { hann: number; hunn: number; ukjent: number }
}

interface RangertMorLam extends MorLamStatistikk {
  poengsum: number
}

function beregnMorLamStatistikk(mor: StatistikkForelder, barn: SauMedId[]): MorLamStatistikk {
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
  const medFellerEgenUll = barn.filter((b) => b.fellerEgenUll != null)
  const fellerEgenUllAntall = medFellerEgenUll.filter((b) => b.fellerEgenUll === true).length

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
    fellerEgenUllProsent: {
      snitt:
        medFellerEgenUll.length > 0
          ? (fellerEgenUllAntall / medFellerEgenUll.length) * 100
          : null,
      antall: medFellerEgenUll.length,
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
    case 'fellerEgenUllProsent':
      return `${snitt.toFixed(0)} %`
  }
}

function LamPrSoyeTabell({
  sauer,
  vaerer,
  isLoading,
  error,
}: {
  sauer: SauMedId[]
  vaerer: VaerMedId[]
  isLoading: boolean
  error: string | null
}) {
  const [modus, setModus] = useState<StatistikkModus>('sau')
  const [valgteParametre, setValgteParametre] = useState<Record<LamParam, boolean>>({
    lamPerAar: true,
    foedselsvekt: true,
    foedselsvektTotal: true,
    hoestvekt: true,
    hoestvektTotal: true,
    sykdomProsent: true,
    fellerEgenUllProsent: true,
  })

  const erVaer = modus === 'vaer'
  const forelderEntall = erVaer ? 'vær' : 'søye'
  const forelderFlertall = erVaer ? 'værer' : 'søyer'
  const forelderFlertallStor = erVaer ? 'Værer' : 'Søyer'
  const forelderPossessiv = erVaer ? 'hans' : 'hennes'
  const forelderSubjekt = erVaer ? 'han' : 'hun'
  const forelderKolonne = erVaer ? 'Vær' : 'Søye'

  const aktiveParametre = lamParametre.filter((param) => valgteParametre[param])

  const alleMorStatistikker = useMemo<MorLamStatistikk[]>(
    () =>
      finnForeldreMedBarn(sauer, vaerer, modus).map(({ forelder, barn }) =>
        beregnMorLamStatistikk(forelder, barn),
      ),
    [sauer, vaerer, modus],
  )

  const rangerteMoedre = useMemo<RangertMorLam[]>(
    () => beregnRangering(alleMorStatistikker, aktiveParametre, lamParamLavestErBest),
    [alleMorStatistikker, aktiveParametre],
  )

  function vekslParam(param: LamParam) {
    setValgteParametre((forrige) => ({ ...forrige, [param]: !forrige[param] }))
  }

  return (
    <>
      <div className={styles.smalInnhold}>
        <h3 className={styles.undertabellTitel}>Lam pr {forelderEntall}</h3>

        <div className={styles.modusVelger}>
          <Text size="sm" fw={500}>
            Vis statistikk for
          </Text>
          <SegmentedControl
            size="xs"
            data={statistikkModusOptions}
            value={modus}
            onChange={(verdi) => setModus(verdi as StatistikkModus)}
          />
        </div>

        <Text size="sm" c="dimmed" mb="1rem">
          {forelderFlertallStor} rangert etter snitt for sine registrerte lam, basert på
          parametrene valgt under, fra best til verst. Kjønnsfordeling vises kun som
          informasjon og påvirker ikke rangeringen.
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
          Ingen {forelderFlertall} har registrerte lam med data for valgte parametre ennå.
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
              <Table.Th>{forelderKolonne}</Table.Th>
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
              For lam pr år, sommervekt, høstvekt og dødd av sykdom beregnes et snitt per{' '}
              {forelderEntall}, basert på lammene {forelderPossessiv} som har en registrert
              verdi for den parameteren: lam pr år er antall lam delt på antall år{' '}
              {forelderSubjekt} faktisk har hatt lam, sommervekt og høstvekt er snittvekt i
              kg, og dødd av sykdom er hvor stor andel av alle lammene {forelderPossessiv}{' '}
              som har dødd av sykdom.
            </List.Item>
            <List.Item>
              For totalvekt (sommer) og totalvekt (høst) summeres i stedet vektene til alle
              lammene {forelderPossessiv}, siden det sier noe om samlet produksjon og ikke
              bare gjennomsnittlig vekt pr lam.
            </List.Item>
            <List.Item>
              Feller egen ull er hvor stor andel av lammene {forelderPossessiv} med
              registrert ulltype som feller ull selv, altså ikke behøver klipping.
            </List.Item>
            <List.Item>
              Verdiene normaliseres deretter hver for seg til en skala fra 0 til 1, ut fra
              laveste og høyeste verdi blant alle {forelderFlertall} – slik at lam pr år,
              vekt(er), sykdomsandel og ull-andel kan vektes likt selv om de har helt
              forskjellige enheter. For dødd av sykdom er det en lavere andel som gir best
              score, mens for feller egen ull er det en høyere andel som gir best score.
            </List.Item>
            <List.Item>
              Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene for de
              avhukede parametrene. {forelderFlertallStor} rangeres fra høyest til lavest
              poengsum, altså fra best til verst.
            </List.Item>
            <List.Item>
              Kjønnsfordeling vises bare som informasjon og påvirker ikke poengsummen eller
              rangeringen.
            </List.Item>
            <List.Item>
              Kun {forelderFlertall} med minst ett lam som har en registrert verdi for
              minst én av de valgte parametrene vises i tabellen.
            </List.Item>
          </List>
        </div>
      </div>
    </>
  )
}

function LammingSeksjon() {
  const { sauer, isLoading, error } = useSauer()
  const { vaerer, isLoading: vaerLaster, error: vaerFeil } = useVaer()
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

      <LamPrSoyeTabell
        sauer={sauer}
        vaerer={vaerer}
        isLoading={isLoading || vaerLaster}
        error={error ?? vaerFeil}
      />
    </section>
  )
}

function SlaktingSeksjon() {
  const { sauer, isLoading: sauerLaster, error: sauerFeil } = useSauer()
  const { vaerer, isLoading: vaerLaster, error: vaerFeil } = useVaer()
  const isLoading = sauerLaster || vaerLaster
  const error = sauerFeil ?? vaerFeil
  const [modus, setModus] = useState<StatistikkModus>('sau')
  const [valgteParametre, setValgteParametre] = useState<Record<SlaktParam, boolean>>({
    slaktKategori: true,
    slaktPris: true,
    slaktevekt: true,
    slaktevektTotal: true,
  })

  const erVaer = modus === 'vaer'
  const forelderFlertall = erVaer ? 'værer' : 'sauer'
  const forelderFlertallStor = erVaer ? 'Værer' : 'Sauer'
  const forelderPossessiv = erVaer ? 'hans' : 'hennes'
  const forelderKolonne = erVaer ? 'Vær' : 'Sau'

  const aktiveParametre = slaktParametre.filter((param) => valgteParametre[param])

  const alleMorStatistikker = useMemo<MorSlaktStatistikk[]>(
    () =>
      finnForeldreMedBarn(sauer, vaerer, modus).map(({ forelder, barn }) =>
        beregnMorStatistikk(forelder, barn),
      ),
    [sauer, vaerer, modus],
  )

  const rangerteMoedre = useMemo<RangertMor[]>(
    () => beregnRangering(alleMorStatistikker, aktiveParametre, slaktParamLavestErBest),
    [alleMorStatistikker, aktiveParametre],
  )

  function vekslParam(param: SlaktParam) {
    setValgteParametre((forrige) => ({ ...forrige, [param]: !forrige[param] }))
  }

  return (
    <section className={styles.section}>
      <div className={styles.smalInnhold}>
        <h2 className={styles.sectionTitle}>Snitt slaktestatistikk per {erVaer ? 'vær' : 'sau'}</h2>

        <div className={styles.modusVelger}>
          <Text size="sm" fw={500}>
            Vis statistikk for
          </Text>
          <SegmentedControl
            size="xs"
            data={statistikkModusOptions}
            value={modus}
            onChange={(verdi) => setModus(verdi as StatistikkModus)}
          />
        </div>

        <Text size="sm" c="dimmed" mb="1rem">
          {forelderFlertallStor} rangert etter snitt for sine registrerte lam, basert på
          parametrene valgt under, fra best til verst.
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
          Ingen {forelderFlertall} har registrerte lam med data for valgte parametre ennå.
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
              <Table.Th>{forelderKolonne}</Table.Th>
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
              For slaktekategori, slaktpris og slaktevekt snitt beregnes et snitt per{' '}
              {erVaer ? 'vær' : 'sau'}, basert på lammene {forelderPossessiv} som har en
              registrert verdi for den parameteren (slaktekategori gjøres om til en
              tallverdi fra 1 for P− til 15 for E+, slik at den kan regnes på som et tall).
              For slaktevekt totalt summeres slaktevekten til alle lammene{' '}
              {forelderPossessiv} i stedet, siden det sier noe om samlet kjøttproduksjon og
              ikke bare kvaliteten pr lam.
            </List.Item>
            <List.Item>
              Verdiene normaliseres deretter hver for seg til en skala fra 0 til 1, ut fra
              laveste og høyeste verdi blant alle {forelderFlertall} – slik at kategori,
              pris og de to vektmålene kan vektes likt selv om de har helt forskjellige
              enheter.
            </List.Item>
            <List.Item>
              Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene for de
              avhukede parametrene. {forelderFlertallStor} rangeres fra høyest til lavest
              poengsum, altså fra best til verst.
            </List.Item>
            <List.Item>
              Kun {forelderFlertall} med minst ett lam som har en registrert verdi for
              minst én av de valgte parametrene vises i tabellen.
            </List.Item>
          </List>
        </div>
      </div>
    </section>
  )
}

type BestSoyeParam = 'lamming' | 'slakting'

const bestSoyeParametre: BestSoyeParam[] = ['lamming', 'slakting']

const bestSoyeParamLabel: Record<BestSoyeParam, string> = {
  lamming: 'Lamming',
  slakting: 'Slakting',
}

/** Begge delscorene er "høyere er bedre" – ingen av dem skal inverteres. */
const bestSoyeLavestErBest: Record<BestSoyeParam, boolean> = {
  lamming: false,
  slakting: false,
}

const bestSoyeAntallLabel: Record<BestSoyeParam, (antall: number) => string> = {
  lamming: (antall) => `${antall}/${lamParametre.length} parametre`,
  slakting: (antall) => `${antall}/${slaktParametre.length} parametre`,
}

interface BestSoyeParamStat {
  snitt: number | null
  antall: number
}

interface MorBestSoyeStatistikk {
  mor: StatistikkForelder
  lamming: BestSoyeParamStat
  slakting: BestSoyeParamStat
}

interface RangertMorBestSoye extends MorBestSoyeStatistikk {
  poengsum: number
}

function formatterBestSoyeParamverdi(snitt: number): string {
  return `${snitt.toFixed(0)}/100`
}

function BestSoyeSeksjon() {
  const { sauer, isLoading: sauerLaster, error: sauerFeil } = useSauer()
  const { vaerer, isLoading: vaerLaster, error: vaerFeil } = useVaer()
  const isLoading = sauerLaster || vaerLaster
  const error = sauerFeil ?? vaerFeil
  const [modus, setModus] = useState<StatistikkModus>('sau')
  const [valgteParametre, setValgteParametre] = useState<Record<BestSoyeParam, boolean>>({
    lamming: true,
    slakting: true,
  })

  const erVaer = modus === 'vaer'
  const forelderEntall = erVaer ? 'vær' : 'søye'
  const forelderFlertall = erVaer ? 'værer' : 'søyer'
  const forelderFlertallStor = erVaer ? 'Værer' : 'Søyer'
  const forelderKolonne = erVaer ? 'Vær' : 'Søye'

  const aktiveParametre = bestSoyeParametre.filter((param) => valgteParametre[param])

  const alleMorStatistikker = useMemo<MorBestSoyeStatistikk[]>(() => {
    const foreldreMedBarn = finnForeldreMedBarn(sauer, vaerer, modus)

    const lamStatistikker = foreldreMedBarn.map(({ forelder, barn }) =>
      beregnMorLamStatistikk(forelder, barn),
    )
    const lammingResultater = beregnRangering(lamStatistikker, lamParametre, lamParamLavestErBest)
    const lammingMap = new Map(
      lammingResultater.map((rad) => [
        rad.mor.id,
        { snitt: rad.poengsum, antall: rad.antallGrunnlag },
      ]),
    )

    const slaktStatistikker = foreldreMedBarn.map(({ forelder, barn }) =>
      beregnMorStatistikk(forelder, barn),
    )
    const slaktingResultater = beregnRangering(
      slaktStatistikker,
      slaktParametre,
      slaktParamLavestErBest,
    )
    const slaktingMap = new Map(
      slaktingResultater.map((rad) => [
        rad.mor.id,
        { snitt: rad.poengsum, antall: rad.antallGrunnlag },
      ]),
    )

    return foreldreMedBarn.map(({ forelder }) => ({
      mor: forelder,
      lamming: lammingMap.get(forelder.id) ?? { snitt: null, antall: 0 },
      slakting: slaktingMap.get(forelder.id) ?? { snitt: null, antall: 0 },
    }))
  }, [sauer, vaerer, modus])

  const rangerteMoedre = useMemo<RangertMorBestSoye[]>(
    () => beregnRangering(alleMorStatistikker, aktiveParametre, bestSoyeLavestErBest),
    [alleMorStatistikker, aktiveParametre],
  )

  function vekslParam(param: BestSoyeParam) {
    setValgteParametre((forrige) => ({ ...forrige, [param]: !forrige[param] }))
  }

  return (
    <section className={styles.section}>
      <div className={styles.smalInnhold}>
        <h2 className={styles.sectionTitle}>Beste {forelderEntall}</h2>

        <div className={styles.modusVelger}>
          <Text size="sm" fw={500}>
            Vis statistikk for
          </Text>
          <SegmentedControl
            size="xs"
            data={statistikkModusOptions}
            value={modus}
            onChange={(verdi) => setModus(verdi as StatistikkModus)}
          />
        </div>

        <Text size="sm" c="dimmed" mb="1rem">
          {forelderFlertallStor} rangert etter en samlet poengsum fra Lamming- og
          Slakting-beregningene, basert på parametrene valgt under, fra best til verst.
        </Text>

        <Group mb="1.25rem" gap="1.25rem">
          {bestSoyeParametre.map((param) => (
            <Checkbox
              key={param}
              label={bestSoyeParamLabel[param]}
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
          Ingen {forelderFlertall} har en beregnet poengsum for valgte parametre ennå.
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
                <Table.Th>{forelderKolonne}</Table.Th>
                {aktiveParametre.map((param) => (
                  <Table.Th key={param}>{bestSoyeParamLabel[param]}</Table.Th>
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
                    {rad.mor.oereNr && (
                      <span className={styles.oereNr}> ({rad.mor.oereNr})</span>
                    )}
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
                              {formatterBestSoyeParamverdi(stat.snitt)}
                            </span>
                            <span className={styles.paramUndertekst}>
                              {bestSoyeAntallLabel[param](stat.antall)}
                            </span>
                          </div>
                        )}
                      </Table.Td>
                    )
                  })}
                  {aktiveParametre.length > 1 && (
                    <Table.Td>{rad.poengsum.toFixed(0)}</Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      <div className={styles.smalInnhold}>
        <div className={styles.forklaring}>
          <Text size="sm" fw={600} mb="0.5rem">
            Hvordan regnes "beste {forelderEntall}" ut?
          </Text>
          <List size="sm" c="dimmed" spacing="0.25rem">
            <List.Item>
              Grupperingen følger valget "Vis statistikk for" over – pr søye (basert på
              lammenes mor) eller pr vær (basert på lammenes far).
            </List.Item>
            <List.Item>
              Lamming-poengsummen hentes fra samme beregning som på Lamming-siden (lam pr
              år, sommer- og høstvekt – både snitt og totalt – andel dødd av sykdom, og
              andel som feller egen ull), men alltid med alle disse parametrene slått på,
              uavhengig av hva som er valgt på Lamming-siden.
            </List.Item>
            <List.Item>
              Slakting-poengsummen hentes på samme måte fra beregningen på Slakting-siden
              (slaktekategori, slaktpris, og slaktevekt snitt og totalt), også alltid med
              alle parametrene slått på der.
            </List.Item>
            <List.Item>
              De to poengsummene (0–100) normaliseres på nytt mot hverandre, hver for seg,
              til en skala fra 0 til 1 ut fra laveste og høyeste poengsum blant alle{' '}
              {forelderFlertall} – akkurat som på de to andre sidene.
            </List.Item>
            <List.Item>
              Den endelige poengsummen (0–100) her er gjennomsnittet av de normaliserte
              verdiene for de avhukede parametrene (Lamming og/eller Slakting).{' '}
              {forelderFlertallStor} rangeres fra høyest til lavest poengsum, altså fra
              best til verst.
            </List.Item>
            <List.Item>
              Kun {forelderFlertall} med en beregnet poengsum for minst én av de valgte
              parametrene vises i tabellen.
            </List.Item>
          </List>
        </div>
      </div>
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
          <Tabs.Tab value="beste-soye">Beste søye</Tabs.Tab>
          <Tabs.Tab value="slektstre">Slektstre</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="lamming">
          <LammingSeksjon />
        </Tabs.Panel>
        <Tabs.Panel value="slakting">
          <SlaktingSeksjon />
        </Tabs.Panel>
        <Tabs.Panel value="beste-soye">
          <BestSoyeSeksjon />
        </Tabs.Panel>
        <Tabs.Panel value="slektstre">
          <SlektstreSeksjon />
        </Tabs.Panel>
      </Tabs>
    </main>
  )
}

export default StatistikkPage
