import { useState } from 'react'
import dayjs from 'dayjs'
import { remove, set } from 'firebase/database'
import { Avatar, Badge, Button, Group, Modal, Text } from '@mantine/core'
import { useBrukere } from '@/hooks/useBrukere'
import { appRef } from '@/lib/firebase'
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

function AdminPage() {
  const { brukere, isLoading, error } = useBrukere()

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
        </>
      )}
    </main>
  )
}

export default AdminPage
