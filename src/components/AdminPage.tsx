import { useState } from 'react'
import dayjs from 'dayjs'
import { remove, set, update } from 'firebase/database'
import { Avatar, Badge, Button, FileInput, Group, Modal, Table, Text } from '@mantine/core'
import { useBrukere } from '@/hooks/useBrukere'
import { useSauer } from '@/hooks/useSauer'
import { appRef } from '@/lib/firebase'
import type { SlaktOppgjorFunn } from '@/lib/slaktOppgjor'
import type { SauMedId } from '@/types/sau'
import type { AppUserMedId, UserRole } from '@/types/user'
import styles from './AdminPage.module.scss'

const rolleLabel: Record<UserRole, string> = {
  ADMIN: 'Admin',
  BONDE: 'Bonde',
}

function formatertLastLogin(lastLogin: number) {
  return dayjs(lastLogin).locale('nb').format('D. MMMM YYYY [kl.] HH:mm')
}

function godkjennBruker(id: string) {
  set(appRef(`users/${id}/status`), 'approved').catch((err) => {
    console.error(`Kunne ikke godkjenne bruker ${id}:`, err)
  })
}

function avvisBruker(id: string) {
  return remove(appRef(`users/${id}`)).catch((err) => {
    console.error(`Kunne ikke avvise bruker ${id}:`, err)
  })
}

function VentendeBrukerRad({ bruker }: { bruker: AppUserMedId }) {
  const [avvisModalOpen, setAvvisModalOpen] = useState(false)
  const [lagrer, setLagrer] = useState(false)

  function bekreftAvvis() {
    setLagrer(true)
    avvisBruker(bruker.id).finally(() => {
      setLagrer(false)
      setAvvisModalOpen(false)
    })
  }

  return (
    <li className={styles.item}>
      <Group justify="space-between" align="center">
        <Group gap="0.75rem">
          <Avatar src={bruker.photoURL} radius="xl" />
          <div>
            <Text fw={600}>{bruker.displayName ?? 'Ukjent bruker'}</Text>
            <Text size="sm" c="dimmed">
              Siste innlogging: {formatertLastLogin(bruker.lastLogin)}
            </Text>
          </div>
        </Group>
        <Group gap="0.5rem">
          <Button color="red" variant="outline" onClick={() => setAvvisModalOpen(true)}>
            Avvis
          </Button>
          <Button onClick={() => godkjennBruker(bruker.id)}>Godkjenn</Button>
        </Group>
      </Group>

      <Modal
        opened={avvisModalOpen}
        onClose={() => setAvvisModalOpen(false)}
        title="Avvis bruker"
      >
        <Text size="sm">
          Er du sikker på at du vil avvise {bruker.displayName ?? 'denne brukeren'}? Brukeren
          slettes fra databasen og må logge inn på nytt for å be om tilgang igjen.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => setAvvisModalOpen(false)} disabled={lagrer}>
            Avbryt
          </Button>
          <Button color="red" loading={lagrer} onClick={bekreftAvvis}>
            Avvis
          </Button>
        </Group>
      </Modal>
    </li>
  )
}

function BrukerRad({ bruker }: { bruker: AppUserMedId }) {
  return (
    <li className={styles.item}>
      <Group justify="space-between" align="center">
        <Group gap="0.75rem">
          <Avatar src={bruker.photoURL} radius="xl" />
          <div>
            <Text fw={600}>{bruker.displayName ?? 'Ukjent bruker'}</Text>
            <Text size="sm" c="dimmed">
              Siste innlogging: {formatertLastLogin(bruker.lastLogin)}
            </Text>
          </div>
        </Group>
        <Group gap="0.5rem">
          {bruker.roles.map((rolle) => (
            <Badge key={rolle} variant="light">
              {rolleLabel[rolle]}
            </Badge>
          ))}
        </Group>
      </Group>
    </li>
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
      <h2 className={styles.sectionTitle}>Importer slakt-informasjon fra dokument</h2>
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

function AdminPage() {
  const { brukere, isLoading, error } = useBrukere()
  const { sauer } = useSauer()

  const ventende = brukere.filter((bruker) => bruker.status === 'pending')
  const godkjente = brukere.filter((bruker) => bruker.status !== 'pending')

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Admin</h1>

      {isLoading && <p className={styles.subtitle}>Laster brukere…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && (
        <>
          {ventende.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Venter på godkjenning ({ventende.length})</h2>
              <ul className={styles.list}>
                {ventende.map((bruker) => (
                  <VentendeBrukerRad key={bruker.id} bruker={bruker} />
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Alle brukere ({godkjente.length})</h2>
            {godkjente.length === 0 ? (
              <p className={styles.subtitle}>Ingen godkjente brukere ennå.</p>
            ) : (
              <ul className={styles.list}>
                {godkjente.map((bruker) => (
                  <BrukerRad key={bruker.id} bruker={bruker} />
                ))}
              </ul>
            )}
          </section>

          <SlaktOppgjorImportSeksjon alleSauer={sauer} />
        </>
      )}
    </main>
  )
}

export default AdminPage
