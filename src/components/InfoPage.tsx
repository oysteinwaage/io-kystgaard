import { useState, type ReactNode } from 'react'
import { update } from 'firebase/database'
import { Accordion, Badge, Button, FileInput, Group, Table, Tabs, Text } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { europKategorier } from '@/lib/europ'
import { appRef } from '@/lib/firebase'
import type { SlaktOppgjorFunn } from '@/lib/slaktOppgjor'
import type { SauMedId } from '@/types/sau'
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

function DokumentmalerSeksjon() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Dokumentmaler</h2>
      <Text size="sm" c="dimmed">
        Her vil du kunne laste ned maler for manuell utfylling. Ingen maler er lagt inn
        ennå.
      </Text>
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
    <section className={styles.section}>
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

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Info og dokumenter</h1>

      <Tabs defaultValue="info" keepMounted={false}>
        <Tabs.List mb="1.5rem">
          <Tabs.Tab value="info">Info og hjelp</Tabs.Tab>
          <Tabs.Tab value="maler">Dokumentmaler</Tabs.Tab>
          <Tabs.Tab value="opplasting">Last opp dokumenter</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info">
          <InfoOgHjelpSeksjon />
        </Tabs.Panel>

        <Tabs.Panel value="maler">
          <DokumentmalerSeksjon />
        </Tabs.Panel>

        <Tabs.Panel value="opplasting">
          <SlaktOppgjorImportSeksjon alleSauer={sauer} />
        </Tabs.Panel>
      </Tabs>
    </main>
  )
}

export default InfoPage
