import { useEffect, useRef, useState } from 'react'
import { get, push, remove, set, update } from 'firebase/database'
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useArshjul } from '@/hooks/useArshjul'
import { appRef } from '@/lib/firebase'
import { MAANED_NAVN, formatDag, standardOppgaver } from '@/lib/arshjul'
import type { ArshjulOppgave, ArshjulOppgaveMedId } from '@/types/arshjul'
import styles from './ArshjulPage.module.scss'

const maanedOptions = MAANED_NAVN.map((navn, i) => ({ value: String(i + 1), label: navn }))
const dagOptions = Array.from({ length: 31 }, (_, i) => i + 1)

let seedSjekket = false

function iDag() {
  const naa = new Date()
  return { maaned: naa.getMonth() + 1, dag: naa.getDate(), aar: naa.getFullYear() }
}

/**
 * Oppgaver uten dag (kun måned) regnes som forfalt så snart måneden har startet,
 * siden de ikke har en spesifikk dato å vente til.
 */
function erForfalt(oppgave: { maaned: number; dag?: number }, idag: { maaned: number; dag: number }) {
  if (oppgave.dag == null) return oppgave.maaned <= idag.maaned
  return oppgave.maaned !== idag.maaned ? oppgave.maaned < idag.maaned : oppgave.dag < idag.dag
}

function isoDatoIDag() {
  return new Date().toISOString().slice(0, 10)
}

function merkFullfort(oppgaveId: string, aar: number) {
  set(appRef(`arshjul/oppgaver/${oppgaveId}/fullforinger/${aar}`), isoDatoIDag()).catch((err) => {
    console.error(`Kunne ikke markere oppgave ${oppgaveId} som gjennomført:`, err)
  })
}

function fjernFullforing(oppgaveId: string, aar: number) {
  remove(appRef(`arshjul/oppgaver/${oppgaveId}/fullforinger/${aar}`)).catch((err) => {
    console.error(`Kunne ikke fjerne fullføring for oppgave ${oppgaveId}:`, err)
  })
}

function lagreOppgaveFelt(oppgaveId: string, felt: string, verdi: string | number | null) {
  set(appRef(`arshjul/oppgaver/${oppgaveId}/${felt}`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre ${felt} for oppgave ${oppgaveId}:`, err)
  })
}

function OppgaveRad({ oppgave }: { oppgave: ArshjulOppgaveMedId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [navn, setNavn] = useState(oppgave.navn)
  const [kommentar, setKommentar] = useState(oppgave.kommentar ?? '')
  const [periodeSluttMaaned, setPeriodeSluttMaaned] = useState<string | null>(
    oppgave.periodeSluttMaaned ? String(oppgave.periodeSluttMaaned) : null,
  )
  const [periodeSluttDag, setPeriodeSluttDag] = useState<number | string>(
    oppgave.periodeSluttDag ?? '',
  )
  const [laastOpp, setLaastOpp] = useState(false)
  const [sletteModalOpen, setSletteModalOpen] = useState(false)

  const { maaned, dag, aar } = iDag()
  const fullfortDato = oppgave.fullforinger?.[String(aar)]
  const erFullfort = !!fullfortDato
  const forfalt = !erFullfort && erForfalt(oppgave, { maaned, dag })

  const statusClass = erFullfort ? styles.itemDone : forfalt ? styles.itemOverdue : ''

  function slett() {
    remove(appRef(`arshjul/oppgaver/${oppgave.id}`)).catch((err) => {
      console.error(`Kunne ikke slette oppgave ${oppgave.id}:`, err)
    })
    setSletteModalOpen(false)
  }

  return (
    <li className={`${styles.item} ${statusClass}`}>
      <div className={styles.itemHeader}>
        <Checkbox
          checked={erFullfort}
          onChange={(event) =>
            event.currentTarget.checked ? merkFullfort(oppgave.id, aar) : fjernFullforing(oppgave.id, aar)
          }
          aria-label={erFullfort ? 'Merk som ikke gjennomført' : 'Merk som gjennomført'}
          onClick={(event) => event.stopPropagation()}
        />

        <button
          type="button"
          className={styles.itemHeaderKnapp}
          onClick={() =>
            setIsOpen((open) => {
              const nesteOpen = !open
              if (!nesteOpen) setLaastOpp(false)
              return nesteOpen
            })
          }
          aria-expanded={isOpen}
        >
          <span className={styles.dato}>{formatDag(oppgave.maaned, oppgave.dag)}</span>
          <span className={styles.itemName}>
            {oppgave.navn}
            {oppgave.periodeSluttMaaned && oppgave.periodeSluttDag && (
              <span className={styles.periode}>
                {' '}
                (til ca. {formatDag(oppgave.periodeSluttMaaned, oppgave.periodeSluttDag)})
              </span>
            )}
          </span>

          {erFullfort && (
            <span className={styles.statusTekst}>Gjennomført {fullfortDato}</span>
          )}
          {forfalt && <span className={styles.statusTekst}>Forfalt</span>}

          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>
      </div>

      {isOpen && (
        <div className={styles.itemBody}>
          <div className={styles.itemBodyHeader}>
            <span />
            <Group gap="0.25rem">
              {laastOpp && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Slett oppgave"
                  onClick={() => setSletteModalOpen(true)}
                >
                  🗑️
                </ActionIcon>
              )}

              <ActionIcon
                variant="subtle"
                aria-label={laastOpp ? 'Lås redigering' : 'Lås opp redigering'}
                onClick={() => setLaastOpp((verdi) => !verdi)}
              >
                {laastOpp ? '🔓' : '🔒'}
              </ActionIcon>
            </Group>
          </div>

          <Modal opened={sletteModalOpen} onClose={() => setSletteModalOpen(false)} title="Slett oppgave">
            <Text size="sm">
              Er du sikker på at du vil slette {oppgave.navn}? Dette kan ikke angres.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setSletteModalOpen(false)}>
                Avbryt
              </Button>
              <Button color="red" onClick={slett}>
                Slett
              </Button>
            </Group>
          </Modal>

          <div className={styles.form}>
            <TextInput
              className={styles.laastFelt}
              label="Navn"
              value={navn}
              disabled={!laastOpp}
              onChange={(event) => setNavn(event.currentTarget.value)}
              onBlur={() => {
                if (navn.trim() && navn !== oppgave.navn) lagreOppgaveFelt(oppgave.id, 'navn', navn.trim())
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Måned"
              data={maanedOptions}
              value={String(oppgave.maaned)}
              disabled={!laastOpp}
              allowDeselect={false}
              onChange={(verdi) => {
                if (verdi) lagreOppgaveFelt(oppgave.id, 'maaned', Number(verdi))
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Dag"
              placeholder="Hele måneden"
              data={dagOptions.map((d) => String(d))}
              value={oppgave.dag != null ? String(oppgave.dag) : null}
              disabled={!laastOpp}
              clearable
              searchable
              onChange={(verdi) => {
                lagreOppgaveFelt(oppgave.id, 'dag', verdi ? Number(verdi) : null)
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Periode slutt – måned"
              placeholder="Ingen"
              data={maanedOptions}
              value={periodeSluttMaaned}
              disabled={!laastOpp}
              clearable
              onChange={(verdi) => {
                setPeriodeSluttMaaned(verdi)
                lagreOppgaveFelt(oppgave.id, 'periodeSluttMaaned', verdi ? Number(verdi) : null)
                if (!verdi) {
                  setPeriodeSluttDag('')
                  lagreOppgaveFelt(oppgave.id, 'periodeSluttDag', null)
                }
              }}
            />
            <NumberInput
              className={styles.laastFelt}
              label="Periode slutt – dag"
              placeholder="–"
              min={1}
              max={31}
              hideControls
              value={periodeSluttDag}
              disabled={!laastOpp || !periodeSluttMaaned}
              onChange={setPeriodeSluttDag}
              onBlur={() => {
                const verdi = periodeSluttDag === '' ? null : Number(periodeSluttDag)
                if (verdi !== (oppgave.periodeSluttDag ?? null))
                  lagreOppgaveFelt(oppgave.id, 'periodeSluttDag', verdi)
              }}
            />
          </div>

          <Textarea
            className={styles.kommentar}
            label="Kommentar"
            autosize
            minRows={2}
            value={kommentar}
            disabled={!laastOpp}
            onChange={(event) => setKommentar(event.currentTarget.value)}
            onBlur={() => {
              if (kommentar !== (oppgave.kommentar ?? ''))
                lagreOppgaveFelt(oppgave.id, 'kommentar', kommentar || null)
            }}
          />
        </div>
      )}
    </li>
  )
}

function tomtNyttOppgaveSkjema() {
  return {
    navn: '',
    maaned: null as string | null,
    dag: null as string | null,
    kommentar: '',
  }
}

function LeggTilOppgaveModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [skjema, setSkjema] = useState(tomtNyttOppgaveSkjema)
  const [lagrer, setLagrer] = useState(false)

  const kanLagre = skjema.navn.trim() !== '' && !!skjema.maaned

  function lukkOgNullstill() {
    setSkjema(tomtNyttOppgaveSkjema())
    onClose()
  }

  function lagre() {
    if (!kanLagre || !skjema.maaned) return

    const nyOppgave: ArshjulOppgave = {
      navn: skjema.navn.trim(),
      maaned: Number(skjema.maaned),
    }
    if (skjema.dag) nyOppgave.dag = Number(skjema.dag)
    if (skjema.kommentar.trim()) nyOppgave.kommentar = skjema.kommentar.trim()

    setLagrer(true)
    set(push(appRef('arshjul/oppgaver')), nyOppgave)
      .then(() => lukkOgNullstill())
      .catch((err) => {
        console.error('Kunne ikke opprette ny oppgave:', err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <Modal opened={opened} onClose={lukkOgNullstill} title="Legg til oppgave">
      <div className={styles.form}>
        <TextInput
          label="Navn"
          required
          value={skjema.navn}
          onChange={(event) => {
            const verdi = event.currentTarget.value
            setSkjema((s) => ({ ...s, navn: verdi }))
          }}
        />
        <Select
          label="Måned"
          required
          placeholder="Velg måned"
          data={maanedOptions}
          value={skjema.maaned}
          onChange={(verdi) => setSkjema((s) => ({ ...s, maaned: verdi }))}
        />
        <Select
          label="Dag"
          placeholder="Hele måneden"
          data={dagOptions.map((d) => String(d))}
          value={skjema.dag}
          clearable
          searchable
          onChange={(verdi) => setSkjema((s) => ({ ...s, dag: verdi }))}
        />
      </div>

      <Textarea
        mt="sm"
        label="Kommentar"
        placeholder="Valgfri kommentar"
        autosize
        minRows={2}
        value={skjema.kommentar}
        onChange={(event) => {
          const verdi = event.currentTarget.value
          setSkjema((s) => ({ ...s, kommentar: verdi }))
        }}
      />

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={lukkOgNullstill}>
          Avbryt
        </Button>
        <Button disabled={!kanLagre} loading={lagrer} onClick={lagre}>
          Lagre
        </Button>
      </Group>
    </Modal>
  )
}

function ArshjulPage() {
  const { oppgaver, isLoading, error } = useArshjul()
  const [leggTilModalOpen, setLeggTilModalOpen] = useState(false)
  const seedForsokt = useRef(false)

  useEffect(() => {
    if (seedSjekket || seedForsokt.current) return
    seedForsokt.current = true
    seedSjekket = true

    get(appRef('arshjul/initiert')).then((snapshot) => {
      if (snapshot.exists()) return

      const updates: Record<string, unknown> = { 'arshjul/initiert': true }
      standardOppgaver.forEach((o) => {
        const key = push(appRef('arshjul/oppgaver')).key
        updates[`arshjul/oppgaver/${key}`] = o
      })
      update(appRef(), updates).catch((err) => {
        console.error('Kunne ikke forhåndsutfylle årshjulet:', err)
      })
    })
  }, [])

  return (
    <main className={styles.page}>
      <Group justify="space-between" align="center" mb="0.5rem">
        <h1 className={styles.title} style={{ margin: 0 }}>
          Årshjul
        </h1>
        <Button onClick={() => setLeggTilModalOpen(true)}>Legg til oppgave</Button>
      </Group>
      <p className={styles.subtitle}>
        Faste oppgaver gjennom driftsåret. Oppgavene gjentar seg automatisk hvert år.
      </p>

      <LeggTilOppgaveModal opened={leggTilModalOpen} onClose={() => setLeggTilModalOpen(false)} />

      {isLoading && <p className={styles.subtitle}>Laster årshjul…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && oppgaver.length === 0 && (
        <p className={styles.subtitle}>Ingen oppgaver er registrert ennå.</p>
      )}

      {!isLoading && oppgaver.length > 0 && (
        <ul className={styles.list}>
          {oppgaver.map((oppgave) => (
            <OppgaveRad key={oppgave.id} oppgave={oppgave} />
          ))}
        </ul>
      )}
    </main>
  )
}

export default ArshjulPage
