import { useMemo, useState, type ReactNode } from 'react'
import { push, update } from 'firebase/database'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import {
  Accordion,
  Badge,
  Button,
  FileInput,
  Group,
  NumberInput,
  Table,
  Tabs,
  Text,
} from '@mantine/core'
import { useParring } from '@/hooks/useParring'
import { useSauer } from '@/hooks/useSauer'
import { useVaer } from '@/hooks/useVaer'
import { europKategorier } from '@/lib/europ'
import {
  byggLammingRader,
  finnParringsVaerer,
  kanImporteres,
  type LammingDokument,
  type LammingEndring,
  type LammingRad,
  parseLammingDocx,
} from '@/lib/lammingImport'
import { appRef, storage } from '@/lib/firebase'
import type { SlaktOppgjorFunn } from '@/lib/slaktOppgjor'
import type { ParringMedId } from '@/types/parring'
import type { Sau, SauMedId } from '@/types/sau'
import type { VaerMedId } from '@/types/vaer'
import styles from './InfoPage.module.scss'

const europKategorierBestTilDaarligst = [...europKategorier].reverse()

interface InfoModul {
  id: string
  tittel: string
  kortInfo: string
  innhold: ReactNode
}

const infoModuler: InfoModul[] = [
  {
    id: 'europ',
    tittel: 'EUROP-klassifisering av kjøtt',
    kortInfo: 'Kvalitetsklassene for slakt, fra best til dårligst.',
    innhold: (
      <>
        <Text size="sm" c="dimmed" mb="0.75rem">
          EUROP er det europeiske systemet for å klassifisere slakt etter kjøttfylde
          (konformasjon). Bokstaven viser hvor mye kjøtt dyret har i forhold til skjelett,
          fra best til dårligst. Hver klasse deles videre inn med + eller − for finere
          gradering. For å kunne regne snitt-kategori (f.eks. for alle lam født av en gitt
          sau) er hver kombinasjon gitt en tallverdi fra 1 (dårligst) til 15 (best):
        </Text>

        <Table verticalSpacing="0.3rem" withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Kategori</Table.Th>
              <Table.Th>Beskrivelse</Table.Th>
              <Table.Th>Tallverdi</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {europKategorierBestTilDaarligst.map((kategori) => (
              <Table.Tr key={kategori.kode}>
                <Table.Td>{kategori.kode}</Table.Td>
                <Table.Td>{kategori.beskrivelse}</Table.Td>
                <Table.Td>{kategori.verdi}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Text size="sm" c="dimmed" mt="0.75rem">
          I tillegg vurderes fettgruppe på en skala fra 1 (mager) til 5 (fet), uavhengig av
          EUROP-bokstaven.
        </Text>
      </>
    ),
  },
]

function InfoOgHjelpSeksjon() {
  return (
    <Accordion variant="separated" radius="md" multiple>
      {infoModuler.map((modul) => (
        <Accordion.Item key={modul.id} value={modul.id}>
          <Accordion.Control>
            <Text fw={600}>{modul.tittel}</Text>
            <Text size="sm" c="dimmed">
              {modul.kortInfo}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>{modul.innhold}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

interface Dokumentmal {
  id: string
  tittel: string
  beskrivelse: string
  /** Sti i Firebase Storage */
  sti: string
}

const dokumentmaler: Dokumentmal[] = [
  {
    id: 'lamming',
    tittel: 'Lamming 20xx',
    beskrivelse:
      'Skjema for å registrere nye lam under lamming: ørenr, navn, fødselsdato, kjønn, mor, far, andel villsau, vekter, ull og kommentar.',
    sti: 'lynghaugenGard/Lamming 20xx.docx',
  },
]

async function lastNedFraStorage(mal: Dokumentmal) {
  // Navigerer til nedlastingslenken i stedet for å hente filen med getBlob, som krever
  // CORS-oppsett på bucketen. Firebase sender Content-Disposition med filnavnet.
  window.location.href = await getDownloadURL(storageRef(storage, mal.sti))
}

function DokumentmalRad({ mal }: { mal: Dokumentmal }) {
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState(false)

  function lastNed() {
    setLaster(true)
    setFeil(false)
    lastNedFraStorage(mal)
      .catch((err) => {
        console.error(`Kunne ikke laste ned ${mal.sti}:`, err)
        setFeil(true)
      })
      .finally(() => setLaster(false))
  }

  return (
    <Group justify="space-between" wrap="nowrap" gap="1rem" className={styles.malRad}>
      <div>
        <Text fw={600}>{mal.tittel}</Text>
        <Text size="sm" c="dimmed">
          {mal.beskrivelse}
        </Text>
        {feil && (
          <Text size="sm" c="red" mt="0.25rem">
            Kunne ikke laste ned dokumentet. Se konsollen for detaljer.
          </Text>
        )}
      </div>
      <Button variant="light" loading={laster} onClick={lastNed} className={styles.lastNedKnapp}>
        Last ned
      </Button>
    </Group>
  )
}

function DokumentmalerSeksjon() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Dokumentmaler</h2>
      <Text size="sm" c="dimmed" mb="0.75rem">
        Maler for manuell utfylling.
      </Text>
      {dokumentmaler.map((mal) => (
        <DokumentmalRad key={mal.id} mal={mal} />
      ))}
    </section>
  )
}

function visSau(sau: SauMedId | VaerMedId) {
  return sau.oereNr ? `${sau.navn ?? 'Uten navn'} (${sau.oereNr})` : (sau.navn ?? '–')
}

function visDato(maanedDag: string | undefined) {
  if (!maanedDag) return '–'
  const [maaned, dag] = maanedDag.split('-')
  return `${dag}.${maaned}`
}

const feltNavn: Partial<Record<keyof Sau, string>> = {
  oereNr: 'Ørenr',
  navn: 'Navn',
  foedselsdato: 'Fødselsdato',
  kjoenn: 'Kjønn',
  barnAv: 'Mor',
  farAv: 'Far',
  prosentVillsau: 'Andel villsau',
  foedselsvekt: 'Sommervekt',
  hoestvekt: 'Høstvekt',
  fellerEgenUll: 'Feller egen ull',
  kommentar: 'Kommentar',
}

function visFeltverdi(
  felt: keyof Sau,
  verdi: Sau[keyof Sau],
  alleSauer: SauMedId[],
  alleVaerer: VaerMedId[],
) {
  if (verdi == null || verdi === '') return 'tomt'
  switch (felt) {
    case 'foedselsdato':
      return visDato(verdi as string)
    case 'kjoenn':
      return verdi === 'HANN' ? 'Vær' : 'Søye'
    case 'barnAv': {
      const mor = alleSauer.find((s) => s.id === verdi)
      return mor ? visSau(mor) : 'ukjent sau'
    }
    case 'farAv': {
      const far = alleVaerer.find((v) => v.id === verdi)
      return far ? visSau(far) : 'ukjent vær'
    }
    case 'prosentVillsau':
      return `${verdi} %`
    case 'foedselsvekt':
    case 'hoestvekt':
      return `${verdi} kg`
    case 'fellerEgenUll':
      return verdi ? 'Ja' : 'Nei'
    default:
      return `«${verdi}»`
  }
}

function beskrivEndring(endring: LammingEndring, alleSauer: SauMedId[], alleVaerer: VaerMedId[]) {
  const navn = feltNavn[endring.felt] ?? endring.felt
  return `${navn}: ${visFeltverdi(endring.felt, endring.fra, alleSauer, alleVaerer)} → ${visFeltverdi(endring.felt, endring.til, alleSauer, alleVaerer)}`
}

function lagringsmelding(nye: number, oppdaterte: number) {
  if (nye > 0 && oppdaterte > 0) return `Opprettet ${nye} nye lam og oppdaterte ${oppdaterte} eksisterende.`
  if (oppdaterte > 0) return `Oppdaterte ${oppdaterte} eksisterende lam.`
  return `Opprettet ${nye} nye lam.`
}

function knappetekst(nye: number, oppdateres: number) {
  if (nye > 0 && oppdateres > 0) return `Lagre ${nye} nye og oppdater ${oppdateres}`
  if (oppdateres > 0) return `Oppdater ${oppdateres} lam`
  return `Lagre ${nye} lam`
}

function LammingStatus({ rad }: { rad: LammingRad }) {
  if (rad.feil.length > 0) {
    return (
      <Badge color="red" variant="light">
        Feil
      </Badge>
    )
  }
  if (rad.eksisterende) {
    return rad.endringer.length > 0 ? (
      <Badge color="blue" variant="light">
        Oppdateres
      </Badge>
    ) : (
      <Badge color="gray" variant="light">
        Ingen endringer
      </Badge>
    )
  }
  if (rad.advarsler.length > 0) {
    return (
      <Badge color="orange" variant="light">
        Klar, med merknad
      </Badge>
    )
  }
  return (
    <Badge color="green" variant="light">
      Klar
    </Badge>
  )
}

function LammingImportSeksjon({
  alleSauer,
  alleVaerer,
  parringer,
}: {
  alleSauer: SauMedId[]
  alleVaerer: VaerMedId[]
  parringer: ParringMedId[]
}) {
  const [dokument, setDokument] = useState<LammingDokument | null>(null)
  const [aar, setAar] = useState<number | string>('')
  const [laster, setLaster] = useState(false)
  const [feilmelding, setFeilmelding] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const [lagret, setLagret] = useState<{ nye: number; oppdaterte: number } | null>(null)

  const gyldigAar = typeof aar === 'number' ? aar : null
  const rader = useMemo(
    () =>
      dokument ? byggLammingRader(dokument, gyldigAar, alleSauer, alleVaerer, parringer) : null,
    [dokument, gyldigAar, alleSauer, alleVaerer, parringer],
  )
  const parringsVaerer = useMemo(
    () => finnParringsVaerer(gyldigAar, parringer, alleVaerer),
    [gyldigAar, parringer, alleVaerer],
  )
  const klare = rader?.filter(kanImporteres) ?? []
  const antallNye = klare.filter((r) => !r.eksisterende).length
  const antallOppdateres = klare.length - antallNye
  const merknader =
    rader?.filter((r) => r.feil.length > 0 || r.advarsler.length > 0 || r.eksisterende) ?? []

  function velgFil(fil: File | null) {
    setLagret(null)
    setFeilmelding(null)
    setDokument(null)
    if (!fil) return

    if (fil.name.toLowerCase().endsWith('.pages')) {
      setFeilmelding(
        'Pages-filer kan ikke leses direkte. Åpne dokumentet i Pages og velg Arkiv → Eksporter til → Word, og last opp .docx-filen.',
      )
      return
    }

    setLaster(true)
    parseLammingDocx(fil)
      .then((dok) => {
        if (dok.rader.length === 0) {
          setFeilmelding('Fant ingen utfylte rader i tabellen.')
          return
        }
        setDokument(dok)
        setAar(dok.aar ?? '')
      })
      .catch((err) => {
        console.error('Kunne ikke lese lammingsdokument:', err)
        setFeilmelding(err instanceof Error ? err.message : 'Kunne ikke lese dokumentet.')
      })
      .finally(() => setLaster(false))
  }

  function importer() {
    if (klare.length === 0) return
    setLagrer(true)
    const oppdateringer: Record<string, unknown> = {}
    klare.forEach((rad) => {
      if (rad.eksisterende) {
        // Oppdaterer kun feltene som er endret – øvrige felter på sauen beholdes
        rad.endringer.forEach((endring) => {
          oppdateringer[`sauer/${rad.eksisterende!.id}/${endring.felt}`] = endring.til
        })
      } else {
        oppdateringer[`sauer/${push(appRef('sauer')).key}`] = rad.sau
      }
    })
    const resultat = { nye: antallNye, oppdaterte: antallOppdateres }
    update(appRef(), oppdateringer)
      .then(() => setLagret(resultat))
      .catch((err) => {
        console.error('Kunne ikke lagre lam:', err)
        setFeilmelding('Kunne ikke lagre til databasen. Se konsollen for detaljer.')
      })
      .finally(() => setLagrer(false))
  }

  return (
    <section className={styles.importModul}>
      <h2 className={styles.sectionTitle}>Importer lam fra lammingsskjema</h2>
      <Text size="sm" c="dimmed" mb="0.75rem">
        Last opp et utfylt «Lamming 20xx»-skjema (Word, .docx) for å opprette nye sauer. Finnes det
        allerede en sau med samme ørenr og fødselsår, oppdateres den i stedet. Mor
        matches mot eksisterende sauer på ørenr og navn. Fødselsår hentes fra overskriften, og
        far er væren fra parringen der lammene fødes det året. Du
        ser alle lammene før noe lagres.
      </Text>

      <FileInput
        placeholder="Velg lammingsskjema (.docx)…"
        accept=".docx,.pages,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={velgFil}
        disabled={laster}
        clearable
      />

      {laster && (
        <Text size="sm" c="dimmed" mt="0.75rem">
          Leser dokumentet…
        </Text>
      )}

      {feilmelding && (
        <Text size="sm" c="red" mt="0.75rem">
          {feilmelding}
        </Text>
      )}

      {rader && (
        <>
          <NumberInput
            label="Fødselsår"
            description={dokument?.aar ? 'Hentet fra overskriften i dokumentet' : 'Fant ikke årstall i overskriften – fyll inn'}
            value={aar}
            onChange={setAar}
            min={1990}
            max={2100}
            allowDecimal={false}
            hideControls
            mt="1rem"
            w="12rem"
            error={gyldigAar == null ? 'Påkrevd' : undefined}
          />

          {gyldigAar != null && (
            <Text size="sm" mt="1rem" c={parringsVaerer.length === 1 ? undefined : 'orange'}>
              {parringsVaerer.length === 0
                ? `Fant ingen parring med lam født ${gyldigAar} – lammene lagres uten far.`
                : parringsVaerer.length === 1
                  ? `Far: ${visSau(parringsVaerer[0])}, fra parringen med lam født ${gyldigAar}.`
                  : `Flere værer er parret med lam født ${gyldigAar} (${parringsVaerer.map(visSau).join(', ')}) – far settes bare der Far-kolonnen i dokumentet angir hvilken.`}
            </Text>
          )}

          <Text size="sm" mt="0.5rem" mb="0.5rem">
            {antallNye} nye lam opprettes og {antallOppdateres} eksisterende oppdateres (av{' '}
            {rader.length} rader).
          </Text>

          <div style={{ overflowX: 'auto' }}>
            <Table verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ørenr</Table.Th>
                  <Table.Th>Navn</Table.Th>
                  <Table.Th>Født</Table.Th>
                  <Table.Th>Kjønn</Table.Th>
                  <Table.Th>Mor</Table.Th>
                  <Table.Th>Far</Table.Th>
                  <Table.Th>Villsau</Table.Th>
                  <Table.Th>Sommervekt</Table.Th>
                  <Table.Th>Høstvekt</Table.Th>
                  <Table.Th>Egen ull</Table.Th>
                  <Table.Th>Kommentar</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rader.map((rad) => (
                  <Table.Tr key={rad.radNr}>
                    <Table.Td>{rad.sau.oereNr ?? '–'}</Table.Td>
                    <Table.Td>{rad.sau.navn ?? '–'}</Table.Td>
                    <Table.Td>{visDato(rad.sau.foedselsdato)}</Table.Td>
                    <Table.Td>
                      {rad.sau.kjoenn === 'HANN' ? 'Vær' : rad.sau.kjoenn === 'HUNN' ? 'Søye' : '–'}
                    </Table.Td>
                    <Table.Td>
                      {rad.mor ? (
                        visSau(rad.mor)
                      ) : rad.morTekst ? (
                        <Text span size="sm" c="orange">
                          {rad.morTekst}
                        </Text>
                      ) : (
                        '–'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {rad.far ? (
                        visSau(rad.far)
                      ) : rad.farTekst ? (
                        <Text span size="sm" c="orange">
                          {rad.farTekst}
                        </Text>
                      ) : (
                        '–'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {rad.sau.prosentVillsau != null
                        ? `${rad.sau.prosentVillsau} %${rad.villsauBeregnet ? ' (beregnet)' : ''}`
                        : '–'}
                    </Table.Td>
                    <Table.Td>{rad.sau.foedselsvekt != null ? `${rad.sau.foedselsvekt} kg` : '–'}</Table.Td>
                    <Table.Td>{rad.sau.hoestvekt != null ? `${rad.sau.hoestvekt} kg` : '–'}</Table.Td>
                    <Table.Td>
                      {rad.sau.fellerEgenUll == null ? '–' : rad.sau.fellerEgenUll ? 'Ja' : 'Nei'}
                    </Table.Td>
                    <Table.Td>{rad.sau.kommentar ?? '–'}</Table.Td>
                    <Table.Td>
                      <LammingStatus rad={rad} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          {merknader.length > 0 && (
            <div className={styles.merknader}>
              {merknader.map((rad) => (
                <div key={rad.radNr} className={styles.merknad}>
                  <Text size="sm" fw={600}>
                    {rad.sau.oereNr ?? `Rad ${rad.radNr}`}
                    {rad.eksisterende &&
                      ` – finnes allerede som ${visSau(rad.eksisterende)} født ${gyldigAar}`}
                  </Text>
                  {rad.eksisterende && rad.endringer.length === 0 && rad.feil.length === 0 && (
                    <Text size="sm" c="dimmed">
                      Ingen endringer – hoppes over.
                    </Text>
                  )}
                  {rad.eksisterende && rad.endringer.length > 0 && (
                    <ul className={styles.endringsliste}>
                      {rad.endringer.map((endring) => (
                        <li key={endring.felt}>
                          <Text size="sm" c="blue">
                            {beskrivEndring(endring, alleSauer, alleVaerer)}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rad.feil.map((f) => (
                    <Text key={f} size="sm" c="red">
                      {f}
                    </Text>
                  ))}
                  {rad.advarsler.map((a) => (
                    <Text key={a} size="sm" c="orange">
                      {a}
                    </Text>
                  ))}
                </div>
              ))}
            </div>
          )}

          {lagret ? (
            <Text size="sm" c="green" mt="1rem">
              {lagringsmelding(lagret.nye, lagret.oppdaterte)}
            </Text>
          ) : (
            <Group justify="flex-end" mt="1rem">
              <Button
                loading={lagrer}
                disabled={klare.length === 0 || gyldigAar == null}
                onClick={importer}
              >
                {knappetekst(antallNye, antallOppdateres)}
              </Button>
            </Group>
          )}
        </>
      )}
    </section>
  )
}

interface SlaktOppgjorRad extends SlaktOppgjorFunn {
  sau: SauMedId | null
  gammelSlaktevekt?: number
  gammelSlaktPris?: number
  gammelSlaktKategori?: string
}

function byggSlaktOppgjorRader(funn: SlaktOppgjorFunn[], alleSauer: SauMedId[]): SlaktOppgjorRad[] {
  return funn.map((f) => {
    const sau = alleSauer.find((s) => s.oereNr?.trim() === f.oereNr.trim()) ?? null
    return {
      ...f,
      sau,
      gammelSlaktevekt: sau?.slaktevekt,
      gammelSlaktPris: sau?.slaktPris,
      gammelSlaktKategori: sau?.slaktKategori,
    }
  })
}

function SlaktOppgjorImportSeksjon({ alleSauer }: { alleSauer: SauMedId[] }) {
  const [rader, setRader] = useState<SlaktOppgjorRad[] | null>(null)
  const [laster, setLaster] = useState(false)
  const [feilmelding, setFeilmelding] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const [lagret, setLagret] = useState(false)

  const funnet = rader?.filter((r) => r.sau) ?? []
  const ikkeFunnet = rader?.filter((r) => !r.sau) ?? []

  function velgFil(fil: File | null) {
    setLagret(false)
    setFeilmelding(null)
    setRader(null)
    if (!fil) return

    setLaster(true)
    import('@/lib/slaktOppgjor')
      .then(({ parseSlaktOppgjorPdf }) => parseSlaktOppgjorPdf(fil))
      .then((funn) => {
        if (funn.length === 0) {
          setFeilmelding(
            'Fant ingen dyr i dokumentet. Sjekk at det er en slakteoppgjørsseddel av samme type som tidligere.',
          )
          return
        }
        setRader(byggSlaktOppgjorRader(funn, alleSauer))
      })
      .catch((err) => {
        console.error('Kunne ikke lese slakteoppgjørsseddel:', err)
        setFeilmelding('Kunne ikke lese PDF-en. Se konsollen for detaljer.')
      })
      .finally(() => setLaster(false))
  }

  function importer() {
    if (funnet.length === 0) return
    setLagrer(true)
    const oppdateringer: Record<string, unknown> = {}
    funnet.forEach((rad) => {
      oppdateringer[`sauer/${rad.sau!.id}/slaktevekt`] = rad.slaktevekt
      oppdateringer[`sauer/${rad.sau!.id}/slaktPris`] = rad.slaktPris
      oppdateringer[`sauer/${rad.sau!.id}/slaktKategori`] = rad.slaktKategori
    })
    update(appRef(), oppdateringer)
      .then(() => setLagret(true))
      .catch((err) => {
        console.error('Kunne ikke lagre slakt-informasjon:', err)
        setFeilmelding('Kunne ikke lagre til databasen. Se konsollen for detaljer.')
      })
      .finally(() => setLagrer(false))
  }

  return (
    <section className={styles.importModul}>
      <h2 className={styles.sectionTitle}>Importer slakt-informasjon fra dokument fra Flatland</h2>
      <Text size="sm" c="dimmed" mb="0.75rem">
        Last opp en slakteoppgjørsseddel (PDF) for å hente ut slaktevekt, slaktpris og
        slaktkategori per dyr. Dyrene matches mot eksisterende sauer på ørenummer – det opprettes
        aldri nye sauer herfra.
      </Text>

      <FileInput
        placeholder="Velg oppgjørsseddel (PDF)…"
        accept="application/pdf"
        onChange={velgFil}
        disabled={laster}
        clearable
      />

      {laster && (
        <Text size="sm" c="dimmed" mt="0.75rem">
          Leser dokumentet…
        </Text>
      )}

      {feilmelding && (
        <Text size="sm" c="red" mt="0.75rem">
          {feilmelding}
        </Text>
      )}

      {rader && (
        <>
          <Text size="sm" mt="1rem" mb="0.5rem">
            {funnet.length} av {rader.length} dyr ble matchet mot en eksisterende sau på
            ørenummer.
          </Text>

          <div style={{ overflowX: 'auto' }}>
            <Table verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ørenr</Table.Th>
                  <Table.Th>Sau</Table.Th>
                  <Table.Th>Slaktevekt</Table.Th>
                  <Table.Th>Slaktpris</Table.Th>
                  <Table.Th>Slakt kategori</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rader.map((rad) => (
                  <Table.Tr key={rad.oereNr}>
                    <Table.Td>{rad.oereNr}</Table.Td>
                    <Table.Td>{rad.sau?.navn ? `${rad.sau.navn} (${rad.oereNr})` : '–'}</Table.Td>
                    <Table.Td>
                      {rad.gammelSlaktevekt != null && rad.gammelSlaktevekt !== rad.slaktevekt && (
                        <Text span td="line-through" c="dimmed" mr="0.4rem">
                          {rad.gammelSlaktevekt} kg
                        </Text>
                      )}
                      {rad.slaktevekt} kg
                    </Table.Td>
                    <Table.Td>
                      {rad.gammelSlaktPris != null && rad.gammelSlaktPris !== rad.slaktPris && (
                        <Text span td="line-through" c="dimmed" mr="0.4rem">
                          {rad.gammelSlaktPris.toLocaleString('nb-NO')} kr
                        </Text>
                      )}
                      {rad.slaktPris.toLocaleString('nb-NO')} kr
                    </Table.Td>
                    <Table.Td>
                      {rad.gammelSlaktKategori != null &&
                        rad.gammelSlaktKategori !== rad.slaktKategori && (
                          <Text span td="line-through" c="dimmed" mr="0.4rem">
                            {rad.gammelSlaktKategori}
                          </Text>
                        )}
                      {rad.slaktKategori}
                    </Table.Td>
                    <Table.Td>
                      {rad.sau ? (
                        <Badge color="green" variant="light">
                          Funnet
                        </Badge>
                      ) : (
                        <Badge color="red" variant="light">
                          Ikke funnet
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          {ikkeFunnet.length > 0 && (
            <Text size="sm" c="orange" mt="0.75rem">
              {ikkeFunnet.length} ørenummer ble ikke funnet blant eksisterende sauer og vil bli
              hoppet over (det opprettes ikke nye sauer herfra): {ikkeFunnet.map((r) => r.oereNr).join(', ')}
            </Text>
          )}

          {lagret ? (
            <Text size="sm" c="green" mt="1rem">
              Importert slaktevekt, slaktpris og slaktkategori for {funnet.length} dyr.
            </Text>
          ) : (
            <Group justify="flex-end" mt="1rem">
              <Button loading={lagrer} disabled={funnet.length === 0} onClick={importer}>
                Importer slakt-informasjon
              </Button>
            </Group>
          )}
        </>
      )}
    </section>
  )
}

function InfoPage() {
  const { sauer } = useSauer()
  const { vaerer } = useVaer()
  const { parringer } = useParring()

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Info og dokumenter</h1>

      <Tabs defaultValue="maler" keepMounted={false}>
        <Tabs.List mb="1.5rem">
          <Tabs.Tab value="maler">Dokumentmaler</Tabs.Tab>
          <Tabs.Tab value="info">Info og hjelp</Tabs.Tab>
          <Tabs.Tab value="opplasting">Last opp dokumenter</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="maler">
          <DokumentmalerSeksjon />
        </Tabs.Panel>

        <Tabs.Panel value="info">
          <InfoOgHjelpSeksjon />
        </Tabs.Panel>

        <Tabs.Panel value="opplasting">
          <LammingImportSeksjon alleSauer={sauer} alleVaerer={vaerer} parringer={parringer} />
          <SlaktOppgjorImportSeksjon alleSauer={sauer} />
        </Tabs.Panel>
      </Tabs>
    </main>
  )
}

export default InfoPage
