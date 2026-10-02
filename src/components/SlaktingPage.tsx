import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { push, set, update } from 'firebase/database'
import { Button, Checkbox, Group, Modal, Select, Text } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useSauer } from '@/hooks/useSauer'
import { useSlaktinger } from '@/hooks/useSlaktinger'
import { appRef } from '@/lib/firebase'
import type { Slakting, SlaktingMedId } from '@/types/slakting'
import type { SauKjoenn, SauMedId } from '@/types/sau'
import styles from './SlaktingPage.module.scss'

const forsteAar = 2017
const sisteAar = new Date().getFullYear()
const aarOptions = Array.from({ length: sisteAar - forsteAar + 1 }, (_, i) =>
  String(sisteAar - i),
)

function KjoennIkon({ kjoenn, size = 16 }: { kjoenn: SauKjoenn; size?: number }) {
  const erHann = kjoenn === 'HANN'
  return (
    <span
      className={`${styles.kjoennIkon} ${erHann ? styles.kjoennIkonHann : styles.kjoennIkonHunn}`}
      style={{ width: size, height: size, fontSize: size * 0.7 }}
      aria-hidden="true"
    >
      {erHann ? '♂' : '♀'}
    </span>
  )
}

function sauTekst(sau: SauMedId) {
  const deler: string[] = []
  if (sau.navn) deler.push(sau.navn)
  if (sau.oereNr) deler.push(sau.navn ? `(${sau.oereNr})` : sau.oereNr)
  if (sau.foedselsaar) deler.push(`– ${sau.foedselsaar}`)
  return deler.join(' ')
}

function SauCheckboxLabel({ sau }: { sau: SauMedId }) {
  return (
    <span className={styles.sauLabel}>
      {sau.kjoenn && <KjoennIkon kjoenn={sau.kjoenn} />}
      <span>{sauTekst(sau)}</span>
    </span>
  )
}

function sorterEtterFoedselsaar(sauer: SauMedId[]) {
  return [...sauer].sort((a, b) => (b.foedselsaar ?? 0) - (a.foedselsaar ?? 0))
}

function defaultDyrForAar(alleSauer: SauMedId[], aar: number) {
  return alleSauer
    .filter((sau) => !sau.doedsAarsak && sau.kjoenn === 'HANN' && sau.foedselsaar === aar)
    .map((sau) => sau.id)
}

function lagreSlaktingFelt(slaktingId: string, felt: string, verdi: unknown) {
  set(appRef(`slaktinger/${slaktingId}/${felt}`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre ${felt} for slakting ${slaktingId}:`, err)
  })
}

function gjennomforSlakting(slakting: SlaktingMedId) {
  const dyrIder = slakting.dyrTilSlakt ?? []
  const dato = slakting.dato ?? dayjs().format('YYYY-MM-DD')
  const formatertDato = dayjs(dato).locale('nb').format('D. MMMM YYYY')

  const oppdateringer: Record<string, unknown> = {
    [`slaktinger/${slakting.id}/gjennomfort`]: true,
    [`slaktinger/${slakting.id}/gjennomfortTidspunkt`]: Date.now(),
  }
  dyrIder.forEach((dyrId) => {
    oppdateringer[`sauer/${dyrId}/doedsAarsak`] = 'slakt'
    oppdateringer[`sauer/${dyrId}/doedKommentar`] = `Sendt med slaktebilen ${formatertDato}`
  })

  return update(appRef(), oppdateringer)
}

function DyrTilSlaktListe({
  kandidater,
  valgte,
  disabled,
  onToggle,
  tokolonner,
}: {
  kandidater: SauMedId[]
  valgte: string[]
  disabled?: boolean
  onToggle: (id: string, haket: boolean) => void
  tokolonner?: boolean
}) {
  if (tokolonner) {
    const valgteSet = new Set(valgte)
    const ikkeValgteSauer = kandidater.filter((sau) => !valgteSet.has(sau.id))
    const valgteSauer = kandidater.filter((sau) => valgteSet.has(sau.id))

    return (
      <div className={styles.dyrListe}>
        <span className={styles.dyrListeTittel}>Dyr til slakt ({valgte.length})</span>
        <div className={styles.dyrKolonner}>
          <div className={styles.dyrKolonne}>
            <span className={styles.dyrKolonneTittel}>Velg dyr til slakt</span>
            <div className={styles.dyrKolonneListe}>
              {ikkeValgteSauer.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Ingen flere sauer å velge mellom.
                </Text>
              ) : (
                ikkeValgteSauer.map((sau) => (
                  <Checkbox
                    key={sau.id}
                    label={<SauCheckboxLabel sau={sau} />}
                    checked={false}
                    disabled={disabled}
                    onChange={(event) => onToggle(sau.id, event.currentTarget.checked)}
                  />
                ))
              )}
            </div>
          </div>
          <div className={styles.dyrKolonne}>
            <span className={styles.dyrKolonneTittel}>Valgte dyr</span>
            <div className={styles.dyrKolonneListe}>
              {valgteSauer.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Ingen valgt ennå.
                </Text>
              ) : (
                valgteSauer.map((sau) => (
                  <Checkbox
                    key={sau.id}
                    label={<SauCheckboxLabel sau={sau} />}
                    checked
                    disabled={disabled}
                    onChange={(event) => onToggle(sau.id, event.currentTarget.checked)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dyrListe}>
      <span className={styles.dyrListeTittel}>Dyr til slakt ({valgte.length})</span>
      {kandidater.length === 0 ? (
        <Text size="sm" c="dimmed">
          Ingen sauer å velge mellom.
        </Text>
      ) : (
        <div className={styles.dyrGrid}>
          {kandidater.map((sau) => (
            <Checkbox
              key={sau.id}
              label={<SauCheckboxLabel sau={sau} />}
              checked={valgte.includes(sau.id)}
              disabled={disabled}
              onChange={(event) => onToggle(sau.id, event.currentTarget.checked)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function nyttSkjema(alleSauer: SauMedId[]) {
  const aar = String(sisteAar)
  return {
    aar,
    dato: null as string | null,
    dyrTilSlakt: defaultDyrForAar(alleSauer, Number(aar)),
  }
}

function OpprettSlaktingModal({
  opened,
  onClose,
  alleSauer,
}: {
  opened: boolean
  onClose: () => void
  alleSauer: SauMedId[]
}) {
  const [skjema, setSkjema] = useState(() => nyttSkjema(alleSauer))
  const [lagrer, setLagrer] = useState(false)

  useEffect(() => {
    if (opened) setSkjema(nyttSkjema(alleSauer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  const kandidater = useMemo(
    () => sorterEtterFoedselsaar(alleSauer.filter((sau) => !sau.doedsAarsak)),
    [alleSauer],
  )

  function lukkOgNullstill() {
    setSkjema(nyttSkjema(alleSauer))
    onClose()
  }

  function endreAar(verdi: string | null) {
    if (!verdi) return
    setSkjema((s) => ({ ...s, aar: verdi, dyrTilSlakt: defaultDyrForAar(alleSauer, Number(verdi)) }))
  }

  function endreDyr(id: string, haket: boolean) {
    setSkjema((s) => ({
      ...s,
      dyrTilSlakt: haket ? [...s.dyrTilSlakt, id] : s.dyrTilSlakt.filter((d) => d !== id),
    }))
  }

  function lagre() {
    const nySlakting: Slakting = { aar: Number(skjema.aar) }
    if (skjema.dato) nySlakting.dato = skjema.dato
    if (skjema.dyrTilSlakt.length > 0) nySlakting.dyrTilSlakt = skjema.dyrTilSlakt

    setLagrer(true)
    set(push(appRef('slaktinger')), nySlakting)
      .then(() => lukkOgNullstill())
      .catch((err) => {
        console.error('Kunne ikke opprette ny slakting:', err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <Modal opened={opened} onClose={lukkOgNullstill} title="Opprett slakting">
      <div className={styles.form}>
        <Select
          label="År"
          required
          data={aarOptions}
          value={skjema.aar}
          allowDeselect={false}
          onChange={endreAar}
        />
        <DateInput
          label="Dato"
          placeholder="Velg dato"
          valueFormat="D. MMMM YYYY"
          value={skjema.dato}
          clearable
          onChange={(verdi) => setSkjema((s) => ({ ...s, dato: verdi }))}
        />
      </div>

      <DyrTilSlaktListe
        kandidater={kandidater}
        valgte={skjema.dyrTilSlakt}
        onToggle={endreDyr}
      />

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={lukkOgNullstill}>
          Avbryt
        </Button>
        <Button loading={lagrer} onClick={lagre}>
          Lagre
        </Button>
      </Group>
    </Modal>
  )
}

function SlaktingKort({ slakting, alleSauer }: { slakting: SlaktingMedId; alleSauer: SauMedId[] }) {
  const [dato, setDato] = useState<string | null>(slakting.dato ?? null)
  const [dyrTilSlakt, setDyrTilSlakt] = useState<string[]>(slakting.dyrTilSlakt ?? [])
  const [verifiserModalOpen, setVerifiserModalOpen] = useState(false)
  const [lagrer, setLagrer] = useState(false)

  const erLaast = !!slakting.gjennomfort

  const kandidater = useMemo(() => {
    if (erLaast) {
      const idSet = new Set(dyrTilSlakt)
      return sorterEtterFoedselsaar(alleSauer.filter((sau) => idSet.has(sau.id)))
    }
    return sorterEtterFoedselsaar(alleSauer.filter((sau) => !sau.doedsAarsak))
  }, [erLaast, alleSauer, dyrTilSlakt])

  function endreAar(verdi: string | null) {
    if (!verdi) return
    lagreSlaktingFelt(slakting.id, 'aar', Number(verdi))
  }

  function endreDato(verdi: string | null) {
    setDato(verdi)
    lagreSlaktingFelt(slakting.id, 'dato', verdi)
  }

  function endreDyr(id: string, haket: boolean) {
    const nesteListe = haket ? [...dyrTilSlakt, id] : dyrTilSlakt.filter((d) => d !== id)
    setDyrTilSlakt(nesteListe)
    lagreSlaktingFelt(slakting.id, 'dyrTilSlakt', nesteListe.length > 0 ? nesteListe : null)
  }

  function bekreftGjennomfoering() {
    setLagrer(true)
    gjennomforSlakting(slakting)
      .then(() => setVerifiserModalOpen(false))
      .catch((err) => {
        console.error(`Kunne ikke gjennomføre slakting ${slakting.id}:`, err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.itemTittel}>Slakting {slakting.aar}</span>
        {erLaast ? (
          <span className={styles.status}>
            ✅ Gjennomført{' '}
            {dayjs(slakting.gjennomfortTidspunkt).locale('nb').format('D. MMMM YYYY [kl.] HH:mm')}
          </span>
        ) : (
          <span className={styles.statusApen}>Pågår</span>
        )}
      </div>

      <div className={styles.form}>
        <Select
          label="År"
          data={aarOptions}
          value={String(slakting.aar)}
          disabled={erLaast}
          allowDeselect={false}
          onChange={endreAar}
        />
        <DateInput
          label="Dato"
          placeholder="Velg dato"
          valueFormat="D. MMMM YYYY"
          value={dato}
          disabled={erLaast}
          clearable
          onChange={endreDato}
        />
      </div>

      <DyrTilSlaktListe
        kandidater={kandidater}
        valgte={dyrTilSlakt}
        disabled={erLaast}
        onToggle={endreDyr}
        tokolonner={!erLaast}
      />

      {!erLaast && (
        <Group justify="flex-end" mt="sm">
          <Button color="red" variant="outline" onClick={() => setVerifiserModalOpen(true)}>
            Sendt til slakt
          </Button>
        </Group>
      )}

      <Modal
        opened={verifiserModalOpen}
        onClose={() => setVerifiserModalOpen(false)}
        title="Bekreft slakting"
      >
        <Text size="sm">
          Har du lagt inn alle dyrene som er sendt til slakt, og vil du gjennomføre denne
          slaktingen? Når du bekrefter låses kortet, og de {dyrTilSlakt.length} valgte dyrene
          markeres som døde med dødsårsak slakt.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button
            variant="outline"
            onClick={() => setVerifiserModalOpen(false)}
            disabled={lagrer}
          >
            Nei
          </Button>
          <Button color="red" loading={lagrer} onClick={bekreftGjennomfoering}>
            Ja, gjennomfør
          </Button>
        </Group>
      </Modal>
    </li>
  )
}

function SlaktingPage() {
  const { sauer } = useSauer()
  const { slaktinger, isLoading, error } = useSlaktinger()
  const [opprettModalOpen, setOpprettModalOpen] = useState(false)

  return (
    <main className={styles.page}>
      <Group justify="space-between" align="center" mb="1.5rem">
        <h1 className={styles.title} style={{ margin: 0 }}>
          Slakting
        </h1>
        <Button onClick={() => setOpprettModalOpen(true)}>Opprett slakting</Button>
      </Group>

      <OpprettSlaktingModal
        opened={opprettModalOpen}
        onClose={() => setOpprettModalOpen(false)}
        alleSauer={sauer}
      />

      {isLoading && <p className={styles.subtitle}>Laster slaktinger…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && slaktinger.length === 0 && (
        <p className={styles.subtitle}>Ingen slaktinger er registrert ennå.</p>
      )}

      {!isLoading && slaktinger.length > 0 && (
        <ul className={styles.list}>
          {slaktinger.map((slakting) => (
            <SlaktingKort key={slakting.id} slakting={slakting} alleSauer={sauer} />
          ))}
        </ul>
      )}
    </main>
  )
}

export default SlaktingPage
