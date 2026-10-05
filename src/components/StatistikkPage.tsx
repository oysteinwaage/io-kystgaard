import { useMemo, useState } from 'react'
import { Checkbox, Group, List, Table, Tabs, Text } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { europKodeForTallverdi, europSnittverdi } from '@/lib/europ'
import type { SauMedId } from '@/types/sau'
import styles from './StatistikkPage.module.scss'

type SlaktParam = 'slaktKategori' | 'slaktPris' | 'slaktevekt'

const slaktParametre: SlaktParam[] = ['slaktKategori', 'slaktPris', 'slaktevekt']

const slaktParamLabel: Record<SlaktParam, string> = {
  slaktKategori: 'Slaktekategori',
  slaktPris: 'Slaktpris',
  slaktevekt: 'Slaktevekt',
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
}

interface RangertMor extends MorSlaktStatistikk {
  poengsum: number
}

function gjennomsnitt(verdier: number[]): number | null {
  if (verdier.length === 0) return null
  return verdier.reduce((sum, verdi) => sum + verdi, 0) / verdier.length
}

function beregnMorStatistikk(mor: SauMedId, barn: SauMedId[]): MorSlaktStatistikk {
  const medSlaktKategori = barn.filter((b) => b.slaktKategori)
  const medSlaktPris = barn.filter((b) => b.slaktPris != null)
  const medSlaktevekt = barn.filter((b) => b.slaktevekt != null)

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
      snitt: gjennomsnitt(medSlaktevekt.map((b) => b.slaktevekt as number)),
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
      return `${snitt.toFixed(1)} kg`
  }
}

function LammingSeksjon() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Lamming</h2>
      <Text size="sm" c="dimmed">
        Statistikk om lamming kommer her.
      </Text>
    </section>
  )
}

function SlaktingSeksjon() {
  const { sauer, isLoading, error } = useSauer()
  const [valgteParametre, setValgteParametre] = useState<Record<SlaktParam, boolean>>({
    slaktKategori: true,
    slaktPris: true,
    slaktevekt: true,
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
      <h2 className={styles.sectionTitle}>Snitt slaktestatistikk per sau</h2>
      <Text size="sm" c="dimmed" mb="1rem">
        Sauer rangert etter snitt for sine registrerte barn, basert på parametrene valgt
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

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && aktiveParametre.length === 0 && (
        <p className={styles.subtitle}>Velg minst én parameter for å se rangering.</p>
      )}

      {!isLoading && !error && aktiveParametre.length > 0 && rangerteMoedre.length === 0 && (
        <p className={styles.subtitle}>
          Ingen sauer har registrerte barn med data for valgte parametre ennå.
        </p>
      )}

      {!isLoading && !error && rangerteMoedre.length > 0 && (
        <Table verticalSpacing="0.5rem" withTableBorder withColumnBorders highlightOnHover>
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
                          <span className={styles.paramUndertekst}>{stat.antall} barn</span>
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
      )}

      <div className={styles.forklaring}>
        <Text size="sm" fw={600} mb="0.5rem">
          Hvordan regnes "beste barn" ut?
        </Text>
        <List size="sm" c="dimmed" spacing="0.25rem">
          <List.Item>
            For hver avhuket parameter beregnes et snitt per sau, basert på barna hennes som
            har en registrert verdi for den parameteren (slaktekategori gjøres om til en
            tallverdi fra 1 for P− til 15 for E+, slik at den kan regnes på som et tall).
          </List.Item>
          <List.Item>
            Snittene normaliseres deretter hver for seg til en skala fra 0 til 1, ut fra
            laveste og høyeste snitt blant alle sauer – slik at kategori, pris og vekt kan
            vektes likt selv om de har helt forskjellige enheter.
          </List.Item>
          <List.Item>
            Poengsummen (0–100) er gjennomsnittet av de normaliserte verdiene for de
            avhukede parametrene. Sauene rangeres fra høyest til lavest poengsum, altså fra
            best til verst.
          </List.Item>
          <List.Item>
            Kun sauer med minst ett barn som har en registrert verdi for minst én av de
            valgte parametrene vises i tabellen.
          </List.Item>
        </List>
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
