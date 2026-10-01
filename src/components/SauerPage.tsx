import { useState } from 'react'
import { push, remove, set } from 'firebase/database'
import { ActionIcon, Button, Group, Modal, Select, Text, Textarea, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useSauer } from '@/hooks/useSauer'
import { appRef } from '@/lib/firebase'
import type { Sau, SauDoedsAarsak, SauKjoenn, SauMedId } from '@/types/sau'
import styles from './SauerPage.module.scss'

const statusLabel: Record<string, string> = {
  aktiv: 'Aktiv',
  solgt: 'Solgt',
  slaktet: 'Slaktet',
  dod: 'Død',
}

const doedsAarsakLabel: Record<SauDoedsAarsak, string> = {
  sykdom: 'Sykdom',
  slakt: 'Slakt',
  forsvunnet: 'Forsvunnet',
}

const doedsAarsakOptions = [
  { value: 'sykdom', label: doedsAarsakLabel.sykdom },
  { value: 'slakt', label: doedsAarsakLabel.slakt },
  { value: 'forsvunnet', label: doedsAarsakLabel.forsvunnet },
]

const kjoennLabel: Record<SauKjoenn, string> = {
  HANN: 'Hann',
  HUNN: 'Hunn',
}

const kjoennOptions = [
  { value: 'HANN', label: kjoennLabel.HANN },
  { value: 'HUNN', label: kjoennLabel.HUNN },
]

const forsteAar = 2010
const sisteAar = new Date().getFullYear()
const aarOptions = Array.from({ length: sisteAar - forsteAar + 1 }, (_, i) =>
  String(sisteAar - i),
)

/** Plassholderår for Fødselsdato-feltet (kun måned/dag lagres, se foedselsdato). */
const PLASSHOLDER_AAR = '2000'

function lagreFelt(sauId: string, felt: string, verdi: string | number | null) {
  set(appRef(`sauer/${sauId}/${felt}`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre ${felt} for sau ${sauId}:`, err)
  })
}

function visningsNavn(sau: Sau) {
  return sau.navn || sau.oereNr || 'Uten navn'
}

/** Avgjør om en sau er over ett år gammel. Ukjent fødselsår regnes som over ett år. */
function erOverEttAar(sau: Sau) {
  if (sau.foedselsaar == null) return true

  const iDag = new Date()

  if (sau.foedselsdato) {
    const [maaned, dag] = sau.foedselsdato.split('-').map(Number)
    const foedselsDato = new Date(sau.foedselsaar, maaned - 1, dag)
    const enAarSiden = new Date(iDag.getFullYear() - 1, iDag.getMonth(), iDag.getDate())
    return foedselsDato <= enAarSiden
  }

  return sau.foedselsaar !== iDag.getFullYear()
}

function morAlternativerFra(
  alleSauer: SauMedId[],
  ekskluderId?: string,
  referanseFoedselsaar?: number | null,
) {
  const morKandidater = alleSauer.filter(
    (kandidat) =>
      kandidat.id !== ekskluderId &&
      kandidat.kjoenn === 'HUNN' &&
      kandidat.oereNr &&
      erOverEttAar(kandidat) &&
      (referanseFoedselsaar == null ||
        kandidat.foedselsaar == null ||
        kandidat.foedselsaar < referanseFoedselsaar),
  )
  return Array.from(
    new Map(
      morKandidater.map((mor) => [
        mor.oereNr as string,
        { value: mor.oereNr as string, label: `${visningsNavn(mor)} (${mor.oereNr})` },
      ]),
    ).values(),
  )
}

function KjoennIkon({ kjoenn, size = 18 }: { kjoenn: SauKjoenn; size?: number }) {
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

function SauRad({ sau, alleSauer }: { sau: SauMedId; alleSauer: SauMedId[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [navn, setNavn] = useState(sau.navn ?? '')
  const [foedselsaar, setFoedselsaar] = useState<string | null>(
    sau.foedselsaar ? String(sau.foedselsaar) : null,
  )
  const [kjoenn, setKjoenn] = useState<string | null>(sau.kjoenn ?? null)
  const [kommentar, setKommentar] = useState(sau.kommentar ?? '')
  const [oereNr, setOereNr] = useState(sau.oereNr ?? '')
  const [barnAv, setBarnAv] = useState<string | null>(sau.barnAv ?? null)
  const [foedselsdato, setFoedselsdato] = useState<string | null>(sau.foedselsdato ?? null)
  const [laastOpp, setLaastOpp] = useState(false)
  const [doedModalOpen, setDoedModalOpen] = useState(false)
  const [modalAarsak, setModalAarsak] = useState<string | null>(sau.doedsAarsak ?? null)
  const [modalKommentar, setModalKommentar] = useState(sau.doedKommentar ?? '')
  const [sletteModalOpen, setSletteModalOpen] = useState(false)

  const erDod = !!sau.doedsAarsak

  const navnLaast = erDod || (!laastOpp && !!sau.navn)
  const oereNrLaast = erDod || (!laastOpp && !!sau.oereNr)
  const foedselsaarLaast = erDod || (!laastOpp && !!sau.foedselsaar)
  const foedselsdatoLaast = erDod || (!laastOpp && !!sau.foedselsdato)
  const kjoennLaast = erDod || (!laastOpp && !!sau.kjoenn)
  const morLaast = erDod || (!laastOpp && !!sau.barnAv)

  function aapneDoedModal() {
    setModalAarsak(sau.doedsAarsak ?? null)
    setModalKommentar(sau.doedKommentar ?? '')
    setDoedModalOpen(true)
  }

  function lagreDoedsAarsak() {
    lagreFelt(sau.id, 'doedsAarsak', modalAarsak)
    lagreFelt(sau.id, 'doedKommentar', modalKommentar.trim() ? modalKommentar.trim() : null)
    setDoedModalOpen(false)
  }

  function angreDoed() {
    lagreFelt(sau.id, 'doedsAarsak', null)
    lagreFelt(sau.id, 'doedKommentar', null)
    setDoedModalOpen(false)
  }

  function slettSau() {
    remove(appRef(`sauer/${sau.id}`)).catch((err) => {
      console.error(`Kunne ikke slette sau ${sau.id}:`, err)
    })
    setSletteModalOpen(false)
  }

  const barn = sau.oereNr
    ? alleSauer.filter((kandidat) => kandidat.id !== sau.id && kandidat.barnAv === sau.oereNr)
    : []
  const morAlternativer = morAlternativerFra(
    alleSauer,
    sau.id,
    foedselsaar ? Number(foedselsaar) : null,
  )

  const statusClass = sau.status ? styles[`status-${sau.status}`] : undefined

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
        {sau.kjoenn && <KjoennIkon kjoenn={sau.kjoenn} />}

        <span className={styles.itemName}>
          {sau.navn ? (
            <>
              {sau.navn}
              {sau.oereNr && <span className={styles.oereNr}> ({sau.oereNr})</span>}
            </>
          ) : (
            visningsNavn(sau)
          )}
        </span>

        {erDod && (
          <span className={`${styles.status} ${styles['status-dod']}`}>
            ☠ Død
          </span>
        )}

        {sau.foedselsaar && <span className={styles.foedselsaar}>{sau.foedselsaar}</span>}

        {!erDod && sau.status && (
          <span className={`${styles.status} ${statusClass ?? ''}`}>
            {statusLabel[sau.status] ?? sau.status}
          </span>
        )}

        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className={styles.itemBody}>
          <div className={styles.itemBodyHeader}>
            <ActionIcon
              variant={erDod ? 'filled' : 'subtle'}
              color={erDod ? 'red' : undefined}
              aria-label={erDod ? 'Dødsårsak' : 'Marker som død'}
              onClick={aapneDoedModal}
            >
              💀
            </ActionIcon>

            <Group gap="0.25rem">
              {laastOpp && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Slett sau"
                  onClick={() => setSletteModalOpen(true)}
                >
                  🗑️
                </ActionIcon>
              )}

              <ActionIcon
                variant="subtle"
                aria-label={laastOpp ? 'Lås redigering' : 'Lås opp redigering'}
                disabled={erDod}
                onClick={() => setLaastOpp((verdi) => !verdi)}
              >
                {laastOpp ? '🔓' : '🔒'}
              </ActionIcon>
            </Group>
          </div>

          <Modal
            opened={sletteModalOpen}
            onClose={() => setSletteModalOpen(false)}
            title="Slett sau"
          >
            {barn.length > 0 ? (
              <>
                <Text size="sm">
                  Det er ikke mulig å slette en sau som er registrert i systemet med barn.
                  Enten kan sauen registreres som død, eller så må du inn på de aktuelle barna
                  og fjerne denne sauen som mor før den kan slettes.
                </Text>
                <Group justify="flex-end" mt="md">
                  <Button variant="outline" onClick={() => setSletteModalOpen(false)}>
                    Lukk
                  </Button>
                </Group>
              </>
            ) : (
              <>
                <Text size="sm">
                  Er du sikker på at du vil slette {visningsNavn(sau)}
                  {sau.navn && sau.oereNr && ` (${sau.oereNr})`}? Dette kan ikke angres.
                </Text>
                <Group justify="flex-end" mt="md">
                  <Button variant="outline" onClick={() => setSletteModalOpen(false)}>
                    Avbryt
                  </Button>
                  <Button color="red" onClick={slettSau}>
                    Slett
                  </Button>
                </Group>
              </>
            )}
          </Modal>

          {erDod && (
            <p className={styles.doedInfo}>
              ☠ Død — {doedsAarsakLabel[sau.doedsAarsak as SauDoedsAarsak]}
              {sau.doedKommentar && `: ${sau.doedKommentar}`}
            </p>
          )}

          <Modal
            opened={doedModalOpen}
            onClose={() => setDoedModalOpen(false)}
            title={erDod ? 'Dødsårsak' : 'Marker sau som død'}
          >
            <Select
              label="Dødsårsak"
              placeholder="Velg årsak"
              required
              data={doedsAarsakOptions}
              value={modalAarsak}
              onChange={setModalAarsak}
            />
            <Textarea
              mt="sm"
              label="Kommentar"
              placeholder="Valgfri kommentar"
              autosize
              minRows={2}
              value={modalKommentar}
              onChange={(event) => setModalKommentar(event.currentTarget.value)}
            />
            <Group justify="space-between" mt="md">
              {erDod ? (
                <Button variant="outline" color="red" onClick={angreDoed}>
                  Angre
                </Button>
              ) : (
                <span />
              )}
              <Button disabled={!modalAarsak} onClick={lagreDoedsAarsak}>
                Lagre
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
                if (navn !== (sau.navn ?? '')) lagreFelt(sau.id, 'navn', navn.trim() ? navn : null)
              }}
            />
            <TextInput
              className={styles.laastFelt}
              label="Ørenummer"
              value={oereNr}
              disabled={oereNrLaast}
              onChange={(event) => setOereNr(event.currentTarget.value)}
              onBlur={() => {
                if (oereNr !== (sau.oereNr ?? '')) lagreFelt(sau.id, 'oereNr', oereNr)
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Fødselsår"
              placeholder="Velg årstall"
              data={aarOptions}
              value={foedselsaar}
              disabled={foedselsaarLaast}
              onChange={(verdi) => {
                setFoedselsaar(verdi)
                lagreFelt(sau.id, 'foedselsaar', verdi ? Number(verdi) : null)
              }}
              searchable
            />
            <DateInput
              className={styles.laastFelt}
              label="Fødselsdato"
              placeholder="Velg dato"
              valueFormat="D.MMMM"
              value={foedselsdato ? `${PLASSHOLDER_AAR}-${foedselsdato}` : null}
              disabled={foedselsdatoLaast}
              clearable
              onChange={(verdi) => {
                const maanedDag = verdi ? verdi.slice(5) : null
                setFoedselsdato(maanedDag)
                lagreFelt(sau.id, 'foedselsdato', maanedDag)
              }}
            />
            <Select
              className={styles.laastFelt}
              label="Kjønn"
              placeholder="Velg kjønn"
              data={kjoennOptions}
              value={kjoenn}
              disabled={kjoennLaast}
              onChange={(verdi) => {
                setKjoenn(verdi)
                lagreFelt(sau.id, 'kjoenn', verdi)
              }}
              leftSection={
                kjoenn ? <KjoennIkon kjoenn={kjoenn as SauKjoenn} size={16} /> : undefined
              }
              renderOption={({ option }) => (
                <span className={styles.kjoennOption}>
                  <KjoennIkon kjoenn={option.value as SauKjoenn} size={16} />
                  {option.label}
                </span>
              )}
            />
            <Select
              className={styles.laastFelt}
              label="Mor"
              placeholder="Velg mor"
              data={morAlternativer}
              value={barnAv}
              disabled={morLaast}
              onChange={(verdi) => {
                setBarnAv(verdi)
                lagreFelt(sau.id, 'barnAv', verdi)
              }}
              searchable
              clearable
            />
          </div>

          {(sau.rase || sau.farge || typeof sau.vekt === 'number') && (
            <dl className={styles.details}>
              {sau.rase && (
                <div className={styles.detail}>
                  <dt>Rase</dt>
                  <dd>{sau.rase}</dd>
                </div>
              )}
              {sau.farge && (
                <div className={styles.detail}>
                  <dt>Farge</dt>
                  <dd>{sau.farge}</dd>
                </div>
              )}
              {typeof sau.vekt === 'number' && (
                <div className={styles.detail}>
                  <dt>Vekt</dt>
                  <dd>{sau.vekt} kg</dd>
                </div>
              )}
            </dl>
          )}

          <Textarea
            className={styles.kommentar}
            label="Kommentar"
            autosize
            minRows={2}
            disabled={erDod}
            value={kommentar}
            onChange={(event) => setKommentar(event.currentTarget.value)}
            onBlur={() => {
              if (kommentar !== (sau.kommentar ?? '')) {
                lagreFelt(sau.id, 'kommentar', kommentar)
              }
            }}
          />

          {barn.length > 0 && (
            <div className={styles.barn}>
              <span className={styles.barnTittel}>Barn</span>
              <ul className={styles.barnListe}>
                {barn.map((b) => (
                  <li key={b.id}>
                    {b.navn ? (
                      <>
                        {b.navn}
                        {b.oereNr && <span className={styles.oereNr}> ({b.oereNr})</span>}
                      </>
                    ) : (
                      visningsNavn(b)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function tomtNyttSkjema() {
  return {
    navn: '',
    oereNr: '',
    kjoenn: null as string | null,
    foedselsaar: null as string | null,
    foedselsdato: null as string | null,
    barnAv: null as string | null,
    kommentar: '',
  }
}

function LeggTilSauModal({
  opened,
  onClose,
  alleSauer,
}: {
  opened: boolean
  onClose: () => void
  alleSauer: SauMedId[]
}) {
  const [skjema, setSkjema] = useState(tomtNyttSkjema)
  const [lagrer, setLagrer] = useState(false)

  const morAlternativer = morAlternativerFra(
    alleSauer,
    undefined,
    skjema.foedselsaar ? Number(skjema.foedselsaar) : null,
  )

  const kanLagre = skjema.oereNr.trim() !== '' && !!skjema.kjoenn

  function lukkOgNullstill() {
    setSkjema(tomtNyttSkjema())
    onClose()
  }

  function lagreNySau() {
    if (!kanLagre) return

    const nySau: Sau = {
      oereNr: skjema.oereNr.trim(),
      kjoenn: skjema.kjoenn as SauKjoenn,
    }
    if (skjema.navn.trim()) nySau.navn = skjema.navn.trim()
    if (skjema.foedselsaar) nySau.foedselsaar = Number(skjema.foedselsaar)
    if (skjema.foedselsdato) nySau.foedselsdato = skjema.foedselsdato
    if (skjema.barnAv) nySau.barnAv = skjema.barnAv
    if (skjema.kommentar.trim()) nySau.kommentar = skjema.kommentar.trim()

    setLagrer(true)
    set(push(appRef('sauer')), nySau)
      .then(() => lukkOgNullstill())
      .catch((err) => {
        console.error('Kunne ikke opprette ny sau:', err)
      })
      .finally(() => setLagrer(false))
  }

  return (
    <Modal opened={opened} onClose={lukkOgNullstill} title="Legg til sau">
      <div className={styles.form}>
        <TextInput
          label="Navn"
          value={skjema.navn}
          onChange={(event) => {
            const verdi = event.currentTarget.value
            setSkjema((s) => ({ ...s, navn: verdi }))
          }}
        />
        <TextInput
          label="Ørenummer"
          required
          value={skjema.oereNr}
          onChange={(event) => {
            const verdi = event.currentTarget.value
            setSkjema((s) => ({ ...s, oereNr: verdi }))
          }}
        />
        <Select
          label="Fødselsår"
          placeholder="Velg årstall"
          data={aarOptions}
          value={skjema.foedselsaar}
          onChange={(verdi) => setSkjema((s) => ({ ...s, foedselsaar: verdi }))}
          searchable
        />
        <DateInput
          label="Fødselsdato"
          placeholder="Velg dato"
          valueFormat="D.MMMM"
          value={skjema.foedselsdato ? `${PLASSHOLDER_AAR}-${skjema.foedselsdato}` : null}
          clearable
          onChange={(verdi) =>
            setSkjema((s) => ({ ...s, foedselsdato: verdi ? verdi.slice(5) : null }))
          }
        />
        <Select
          label="Kjønn"
          placeholder="Velg kjønn"
          required
          data={kjoennOptions}
          value={skjema.kjoenn}
          onChange={(verdi) => setSkjema((s) => ({ ...s, kjoenn: verdi }))}
          leftSection={
            skjema.kjoenn ? <KjoennIkon kjoenn={skjema.kjoenn as SauKjoenn} size={16} /> : undefined
          }
          renderOption={({ option }) => (
            <span className={styles.kjoennOption}>
              <KjoennIkon kjoenn={option.value as SauKjoenn} size={16} />
              {option.label}
            </span>
          )}
        />
        <Select
          label="Mor"
          placeholder="Velg mor"
          data={morAlternativer}
          value={skjema.barnAv}
          onChange={(verdi) => setSkjema((s) => ({ ...s, barnAv: verdi }))}
          searchable
          clearable
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
        <Button disabled={!kanLagre} loading={lagrer} onClick={lagreNySau}>
          Lagre
        </Button>
      </Group>
    </Modal>
  )
}

function SauerPage() {
  const { sauer, isLoading, error } = useSauer()
  const [leggTilModalOpen, setLeggTilModalOpen] = useState(false)

  return (
    <main className={styles.page}>
      <Group justify="space-between" align="center" mb="1.5rem">
        <h1 className={styles.title} style={{ margin: 0 }}>
          Sauer
        </h1>
        <Button onClick={() => setLeggTilModalOpen(true)}>Legg til sau</Button>
      </Group>

      <LeggTilSauModal
        opened={leggTilModalOpen}
        onClose={() => setLeggTilModalOpen(false)}
        alleSauer={sauer}
      />

      {isLoading && <p className={styles.subtitle}>Laster sauer…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && sauer.length === 0 && (
        <p className={styles.subtitle}>Ingen sauer er registrert ennå.</p>
      )}

      {!isLoading && sauer.length > 0 && (
        <ul className={styles.list}>
          {sauer.map((sau) => (
            <SauRad key={sau.id} sau={sau} alleSauer={sauer} />
          ))}
        </ul>
      )}
    </main>
  )
}

export default SauerPage
