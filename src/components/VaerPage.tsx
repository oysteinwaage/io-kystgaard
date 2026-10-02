import { useState } from 'react'
import { push, remove, set, update } from 'firebase/database'
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useVaer } from '@/hooks/useVaer'
import { useParring } from '@/hooks/useParring'
import { appRef } from '@/lib/firebase'
import type { Vaer, VaerMedId } from '@/types/vaer'
import type { Parring, ParringMedId } from '@/types/parring'
import styles from './VaerPage.module.scss'

const forsteAarParring = 2016
const sisteAarParring = new Date().getFullYear()
const parringAarOptions = Array.from(
  { length: sisteAarParring - forsteAarParring + 1 },
  (_, i) => String(sisteAarParring - i),
)
const aarLamFoedesOptions = Array.from(
  { length: sisteAarParring - forsteAarParring + 2 },
  (_, i) => String(sisteAarParring + 1 - i),
)

function leggTilAar(eksisterende: number[] | undefined, aar: number) {
  return Array.from(new Set([...(eksisterende ?? []), aar])).sort((a, b) => a - b)
}

function fjernAar(eksisterende: number[] | undefined, aar: number) {
  const neste = (eksisterende ?? []).filter((a) => a !== aar)
  return neste.length > 0 ? neste : null
}

function lagreVaerFelt(vaerId: string, felt: string, verdi: string | number | null) {
  set(appRef(`vaerer/${vaerId}/${felt}`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre ${felt} for vær ${vaerId}:`, err)
  })
}

function lagreParringFelt(aar: number, felt: string, verdi: string | number | null) {
  set(appRef(`parringer/${aar}/${felt}`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre ${felt} for parring ${aar}:`, err)
  })
}

function opprettParring(parring: Parring, vaerer: VaerMedId[]) {
  const vaer = vaerer.find((v) => v.id === parring.vaerId)
  return update(appRef(), {
    [`parringer/${parring.aar}`]: parring,
    [`vaerer/${parring.vaerId}/aarstallLaant`]: leggTilAar(vaer?.aarstallLaant, parring.aar),
  })
}

function slettParring(parring: ParringMedId, vaerer: VaerMedId[]) {
  const vaer = vaerer.find((v) => v.id === parring.vaerId)
  return update(appRef(), {
    [`parringer/${parring.aar}`]: null,
    [`vaerer/${parring.vaerId}/aarstallLaant`]: fjernAar(vaer?.aarstallLaant, parring.aar),
  })
}

function endreParringVaer(parring: ParringMedId, nyVaerId: string, vaerer: VaerMedId[]) {
  const gammelVaer = vaerer.find((v) => v.id === parring.vaerId)
  const nyVaer = vaerer.find((v) => v.id === nyVaerId)
  return update(appRef(), {
    [`parringer/${parring.aar}/vaerId`]: nyVaerId,
    [`vaerer/${parring.vaerId}/aarstallLaant`]: fjernAar(gammelVaer?.aarstallLaant, parring.aar),
    [`vaerer/${nyVaerId}/aarstallLaant`]: leggTilAar(nyVaer?.aarstallLaant, parring.aar),
  })
}

function VaerRad({ vaer }: { vaer: VaerMedId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [navn, setNavn] = useState(vaer.navn)
  const [oereNr, setOereNr] = useState(vaer.oereNr ?? '')
  const [laantFra, setLaantFra] = useState(vaer.laantFra ?? '')
  const [prosentVillsau, setProsentVillsau] = useState<number | string>(
    vaer.prosentVillsau ?? '',
  )
  const [kommentar, setKommentar] = useState(vaer.kommentar ?? '')
  const [laastOpp, setLaastOpp] = useState(false)
  const [sletteModalOpen, setSletteModalOpen] = useState(false)

  const navnLaast = !laastOpp && !!vaer.navn
  const oereNrLaast = !laastOpp && !!vaer.oereNr
  const laantFraLaast = !laastOpp && !!vaer.laantFra
  const prosentVillsauLaast = !laastOpp && vaer.prosentVillsau != null

  function slettVaer() {
    remove(appRef(`vaerer/${vaer.id}`)).catch((err) => {
      console.error(`Kunne ikke slette vær ${vaer.id}:`, err)
    })
    setSletteModalOpen(false)
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.itemHeader}
        onClick={() =>
          setIsOpen((open) => {
            const nesteOpen = !open
            if (!nesteOpen) setLaastOpp(false)
            return nesteOpen
          })
        }
        aria-expanded={isOpen}
      >
        <span className={styles.itemName}>
          {vaer.navn}
          {vaer.oereNr && <span className={styles.oereNr}> ({vaer.oereNr})</span>}
        </span>

        {vaer.laantFra && <span className={styles.aarListe}>Lånt fra {vaer.laantFra}</span>}

        {vaer.aarstallLaant && vaer.aarstallLaant.length > 0 && (
          <span className={styles.aarListe}>{vaer.aarstallLaant.join(', ')}</span>
        )}

        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={styles.itemBody}>
          <div className={styles.itemBodyHeader}>
            <span />
            <Group gap="0.25rem">
              {laastOpp && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Slett vær"
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

          <Modal
            opened={sletteModalOpen}
            onClose={() => setSletteModalOpen(false)}
            title="Slett vær"
          >
            <Text size="sm">
              Er du sikker på at du vil slette {vaer.navn}? Dette kan ikke angres.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setSletteModalOpen(false)}>
                Avbryt
              </Button>
              <Button color="red" onClick={slettVaer}>
                Slett
              </Button>
            </Group>
          </Modal>

          <div className={styles.form}>
            <TextInput
              className={styles.laastFelt}
              label="Navn"
              value={navn}
              disabled={navnLaast}
              onChange={(event) => setNavn(event.currentTarget.value)}
              onBlur={() => {
                if (navn.trim() && navn !== vaer.navn) lagreVaerFelt(vaer.id, 'navn', navn.trim())
              }}
            />
            <TextInput
              className={styles.laastFelt}
              label="Ørenummer"
              value={oereNr}
              disabled={oereNrLaast}
              onChange={(event) => setOereNr(event.currentTarget.value)}
              onBlur={() => {
                if (oereNr !== (vaer.oereNr ?? '')) lagreVaerFelt(vaer.id, 'oereNr', oereNr || null)
              }}
            />
            <TextInput
              className={styles.laastFelt}
              label="Lånt fra"
              value={laantFra}
              disabled={laantFraLaast}
              onChange={(event) => setLaantFra(event.currentTarget.value)}
              onBlur={() => {
                if (laantFra !== (vaer.laantFra ?? ''))
                  lagreVaerFelt(vaer.id, 'laantFra', laantFra || null)
              }}
            />
            <NumberInput
              className={styles.laastFelt}
              label="Andel villsau"
              placeholder="0"
              suffix=" %"
              min={0}
              max={100}
              allowNegative={false}
              hideControls
              value={prosentVillsau}
              disabled={prosentVillsauLaast}
              onChange={setProsentVillsau}
              onBlur={() => {
                const verdi = prosentVillsau === '' ? null : Number(prosentVillsau)
                if (verdi !== (vaer.prosentVillsau ?? null))
                  lagreVaerFelt(vaer.id, 'prosentVillsau', verdi)
              }}
            />
            <div className={styles.lesefelt}>
              <span className={styles.lesefeltLabel}>Årstall lånt</span>
              <span className={styles.lesefeltVerdi}>
                {vaer.aarstallLaant && vaer.aarstallLaant.length > 0
                  ? vaer.aarstallLaant.join(', ')
                  : '–'}
              </span>
            </div>
          </div>

          <Textarea
            className={styles.kommentar}
            label="Kommentar"
            autosize
            minRows={2}
            value={kommentar}
            onChange={(event) => setKommentar(event.currentTarget.value)}
            onBlur={() => {
              if (kommentar !== (vaer.kommentar ?? '')) lagreVaerFelt(vaer.id, 'kommentar', kommentar || null)
            }}
          />
        </div>
      )}
    </li>
  )
}

function tomtNyttVaerSkjema() {
  return {
    navn: '',
    oereNr: '',
    laantFra: '',
    prosentVillsau: '' as number | string,
    kommentar: '',
  }
}

function LeggTilVaerModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [skjema, setSkjema] = useState(tomtNyttVaerSkjema)
  const [lagrer, setLagrer] = useState(false)

  const kanLagre = skjema.navn.trim() !== ''

  function lukkOgNullstill() {
    setSkjema(tomtNyttVaerSkjema())
    onClose()
  }

  function lagreNyVaer() {
    if (!kanLagre) return

    const nyVaer: Vaer = { navn: skjema.navn.trim() }
    if (skjema.oereNr.trim()) nyVaer.oereNr = skjema.oereNr.trim()
    if (skjema.laantFra.trim()) nyVaer.laantFra = skjema.laantFra.trim()
    if (skjema.prosentVillsau !== '') nyVaer.prosentVillsau = Number(skjema.prosentVillsau)
    if (skjema.kommentar.trim()) nyVaer.kommentar = skjema.kommentar.trim()

    setLagrer(true)
    set(push(appRef('vaerer')), nyVaer)
      .then(() => lukkOgNullstill())
      .catch((err) => {
        console.error('Kunne ikke opprette ny vær:', err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <Modal opened={opened} onClose={lukkOgNullstill} title="Legg til vær">
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
        <TextInput
          label="Ørenummer"
          value={skjema.oereNr}
          onChange={(event) => {
            const verdi = event.currentTarget.value
            setSkjema((s) => ({ ...s, oereNr: verdi }))
          }}
        />
        <TextInput
          label="Lånt fra"
          value={skjema.laantFra}
          onChange={(event) => {
            const verdi = event.currentTarget.value
            setSkjema((s) => ({ ...s, laantFra: verdi }))
          }}
        />
        <NumberInput
          label="Andel villsau"
          placeholder="0"
          suffix=" %"
          min={0}
          max={100}
          allowNegative={false}
          hideControls
          value={skjema.prosentVillsau}
          onChange={(verdi) => setSkjema((s) => ({ ...s, prosentVillsau: verdi }))}
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
        <Button disabled={!kanLagre} loading={lagrer} onClick={lagreNyVaer}>
          Lagre
        </Button>
      </Group>
    </Modal>
  )
}

function ParringRad({ parring, vaerer }: { parring: ParringMedId; vaerer: VaerMedId[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pris, setPris] = useState<number | string>(parring.pris ?? '')
  const [aarLamFoedes, setAarLamFoedes] = useState<string | null>(
    parring.aarLamFoedes ? String(parring.aarLamFoedes) : null,
  )
  const [kommentar, setKommentar] = useState(parring.kommentar ?? '')
  const [lagrerVaer, setLagrerVaer] = useState(false)
  const [laastOpp, setLaastOpp] = useState(false)
  const [sletteModalOpen, setSletteModalOpen] = useState(false)

  const vaerOptions = vaerer.map((v) => ({ value: v.id, label: v.navn }))
  const valgtVaer = vaerer.find((v) => v.id === parring.vaerId)

  const vaerLaast = !laastOpp
  const prisLaast = !laastOpp && parring.pris != null
  const aarLamFoedesLaast = !laastOpp && parring.aarLamFoedes != null

  function endreVaer(verdi: string | null) {
    if (!verdi || verdi === parring.vaerId) return
    setLagrerVaer(true)
    endreParringVaer(parring, verdi, vaerer)
      .catch((err) => {
        console.error(`Kunne ikke endre vær for parring ${parring.aar}:`, err)
      })
      .finally(() => setLagrerVaer(false))
  }

  function slett() {
    slettParring(parring, vaerer).catch((err) => {
      console.error(`Kunne ikke slette parring ${parring.aar}:`, err)
    })
    setSletteModalOpen(false)
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.itemHeader}
        onClick={() =>
          setIsOpen((open) => {
            const nesteOpen = !open
            if (!nesteOpen) setLaastOpp(false)
            return nesteOpen
          })
        }
        aria-expanded={isOpen}
      >
        <span className={styles.itemName}>
          Parring {parring.aar}
          {parring.aarLamFoedes && (
            <span className={styles.lamFoedt}> (lam {parring.aarLamFoedes})</span>
          )}
        </span>

        {valgtVaer && <span className={styles.aarListe}>{valgtVaer.navn}</span>}

        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={styles.itemBody}>
          <div className={styles.itemBodyHeader}>
            <span />
            <Group gap="0.25rem">
              {laastOpp && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Slett parring"
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

          <Modal
            opened={sletteModalOpen}
            onClose={() => setSletteModalOpen(false)}
            title="Slett parring"
          >
            <Text size="sm">
              Er du sikker på at du vil slette parringen fra {parring.aar}? Dette kan ikke angres.
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
            <Select
              className={styles.laastFelt}
              label="Vær"
              data={vaerOptions}
              value={parring.vaerId}
              disabled={lagrerVaer || vaerLaast}
              allowDeselect={false}
              searchable
              onChange={endreVaer}
            />
            <NumberInput
              className={styles.laastFelt}
              label="Pris"
              placeholder="0"
              suffix=" kr"
              thousandSeparator=" "
              allowNegative={false}
              allowDecimal={false}
              hideControls
              value={pris}
              disabled={prisLaast}
              onChange={setPris}
              onBlur={() => {
                const verdi = pris === '' ? null : Number(pris)
                if (verdi !== (parring.pris ?? null)) lagreParringFelt(parring.aar, 'pris', verdi)
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Årstall lam født"
              placeholder="Velg årstall"
              data={aarLamFoedesOptions}
              value={aarLamFoedes}
              disabled={aarLamFoedesLaast}
              searchable
              clearable
              onChange={(verdi) => {
                setAarLamFoedes(verdi)
                lagreParringFelt(parring.aar, 'aarLamFoedes', verdi ? Number(verdi) : null)
              }}
            />
          </div>

          {valgtVaer?.oereNr && (
            <Text size="xs" c="dimmed">
              Ørenummer: {valgtVaer.oereNr}
            </Text>
          )}

          <Textarea
            className={styles.kommentar}
            label="Kommentar"
            autosize
            minRows={2}
            value={kommentar}
            onChange={(event) => setKommentar(event.currentTarget.value)}
            onBlur={() => {
              if (kommentar !== (parring.kommentar ?? ''))
                lagreParringFelt(parring.aar, 'kommentar', kommentar || null)
            }}
          />
        </div>
      )}
    </li>
  )
}

function tomtNyttParringSkjema() {
  return {
    aar: null as string | null,
    vaerId: null as string | null,
    pris: '' as number | string,
    aarLamFoedes: null as string | null,
    kommentar: '',
  }
}

function LeggTilParringModal({
  opened,
  onClose,
  vaerer,
  parringer,
}: {
  opened: boolean
  onClose: () => void
  vaerer: VaerMedId[]
  parringer: ParringMedId[]
}) {
  const [skjema, setSkjema] = useState(tomtNyttParringSkjema)
  const [lagrer, setLagrer] = useState(false)

  const brukteAar = new Set(parringer.map((p) => String(p.aar)))
  const ledigeAarOptions = parringAarOptions.filter((aar) => !brukteAar.has(aar))
  const vaerOptions = vaerer.map((v) => ({ value: v.id, label: v.navn }))

  const kanLagre = !!skjema.aar && !!skjema.vaerId

  function lukkOgNullstill() {
    setSkjema(tomtNyttParringSkjema())
    onClose()
  }

  function velgAar(verdi: string | null) {
    setSkjema((s) => ({
      ...s,
      aar: verdi,
      aarLamFoedes: verdi ? String(Number(verdi) + 1) : s.aarLamFoedes,
    }))
  }

  function lagre() {
    if (!skjema.aar || !skjema.vaerId) return

    const parring: Parring = { vaerId: skjema.vaerId, aar: Number(skjema.aar) }
    if (skjema.pris !== '') parring.pris = Number(skjema.pris)
    if (skjema.aarLamFoedes) parring.aarLamFoedes = Number(skjema.aarLamFoedes)
    if (skjema.kommentar.trim()) parring.kommentar = skjema.kommentar.trim()

    setLagrer(true)
    opprettParring(parring, vaerer)
      .then(() => lukkOgNullstill())
      .catch((err) => {
        console.error('Kunne ikke opprette ny parring:', err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <Modal opened={opened} onClose={lukkOgNullstill} title="Legg til parring">
      <div className={styles.form}>
        <Select
          label="Årstall"
          required
          placeholder="Velg årstall"
          data={ledigeAarOptions}
          value={skjema.aar}
          onChange={velgAar}
          searchable
        />
        <Select
          label="Vær"
          required
          placeholder="Velg vær"
          data={vaerOptions}
          value={skjema.vaerId}
          onChange={(verdi) => setSkjema((s) => ({ ...s, vaerId: verdi }))}
          searchable
        />
        <NumberInput
          label="Pris"
          placeholder="0"
          suffix=" kr"
          thousandSeparator=" "
          allowNegative={false}
          allowDecimal={false}
          hideControls
          value={skjema.pris}
          onChange={(verdi) => setSkjema((s) => ({ ...s, pris: verdi }))}
        />
        <Select
          label="Årstall lam født"
          placeholder="Velg årstall"
          data={aarLamFoedesOptions}
          value={skjema.aarLamFoedes}
          searchable
          clearable
          onChange={(verdi) => setSkjema((s) => ({ ...s, aarLamFoedes: verdi }))}
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

function VaerPage() {
  const { vaerer, isLoading, error } = useVaer()
  const { parringer, isLoading: parringerLaster, error: parringerFeil } = useParring()
  const [leggTilVaerModalOpen, setLeggTilVaerModalOpen] = useState(false)
  const [leggTilParringModalOpen, setLeggTilParringModalOpen] = useState(false)

  return (
    <main className={styles.page}>
      <Group justify="space-between" align="center" mb="1.5rem">
        <h1 className={styles.title} style={{ margin: 0 }}>
          Værer
        </h1>
        <Button onClick={() => setLeggTilVaerModalOpen(true)}>Legg til vær</Button>
      </Group>

      <LeggTilVaerModal
        opened={leggTilVaerModalOpen}
        onClose={() => setLeggTilVaerModalOpen(false)}
      />

      {isLoading && <p className={styles.subtitle}>Laster værer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && vaerer.length === 0 && (
        <p className={styles.subtitle}>Ingen værer er registrert ennå.</p>
      )}

      {!isLoading && vaerer.length > 0 && (
        <ul className={styles.list}>
          {vaerer.map((vaer) => (
            <VaerRad key={vaer.id} vaer={vaer} />
          ))}
        </ul>
      )}

      <section className={styles.parringSeksjon}>
        <Group justify="space-between" align="center" mb="1rem">
          <h2 className={styles.undertittel}>Parringer</h2>
          <Button
            variant="outline"
            disabled={vaerer.length === 0}
            onClick={() => setLeggTilParringModalOpen(true)}
          >
            Legg til parring
          </Button>
        </Group>

        <LeggTilParringModal
          opened={leggTilParringModalOpen}
          onClose={() => setLeggTilParringModalOpen(false)}
          vaerer={vaerer}
          parringer={parringer}
        />

        {parringerLaster && <p className={styles.subtitle}>Laster parringer…</p>}
        {parringerFeil && <p className={styles.error}>{parringerFeil}</p>}

        {!parringerLaster && !parringerFeil && parringer.length === 0 && (
          <p className={styles.subtitle}>Ingen parringer er registrert ennå.</p>
        )}

        {!parringerLaster && parringer.length > 0 && (
          <ul className={styles.list}>
            {parringer.map((parring) => (
              <ParringRad key={parring.id} parring={parring} vaerer={vaerer} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default VaerPage
