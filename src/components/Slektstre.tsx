import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Select, Text } from '@mantine/core'
import { useSauer } from '@/hooks/useSauer'
import { useVaer } from '@/hooks/useVaer'
import type { SauDoedsAarsak, SauMedId } from '@/types/sau'
import type { VaerMedId } from '@/types/vaer'
import pageStyles from './StatistikkPage.module.scss'
import styles from './Slektstre.module.scss'

type IndividKind = 'sau' | 'vaer'

interface IndividRef {
  id: string
  kind: IndividKind
}

type IndividData = SauMedId | VaerMedId

interface ForfedreNode {
  slot: string
  ref: IndividRef
  data: IndividData
  mor?: ForfedreNode
  far?: ForfedreNode
}

interface EtterkommerNode {
  slot: string
  ref: IndividRef
  data: IndividData
  barn: EtterkommerNode[]
}

interface Linje {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Trygg øvre grense på antall generasjoner vi følger bakover, i tilfelle feilregistrerte sirkler i dataene. */
const MAKS_GENERASJONER = 10

function noekkel(ref: IndividRef): string {
  return `${ref.kind}:${ref.id}`
}

/**
 * Bygger forfedre-treet til et individ rekursivt. En sau kan ha både mor (søye) og far (vær)
 * registrert, mens en vær ikke har registrert slektskap bakover – værens boks blir da et blad.
 * `besokt` forhindrer endeløs rekursjon dersom dataene skulle inneholde en feilregistrert sirkel.
 */
function byggForfedre(
  ref: IndividRef,
  slot: string,
  sauerById: Map<string, SauMedId>,
  vaererById: Map<string, VaerMedId>,
  besokt: ReadonlySet<string>,
  dybde: number,
): ForfedreNode | null {
  const nokkelForRef = noekkel(ref)
  if (besokt.has(nokkelForRef) || dybde > MAKS_GENERASJONER) return null

  const data = ref.kind === 'sau' ? sauerById.get(ref.id) : vaererById.get(ref.id)
  if (!data) return null

  const node: ForfedreNode = { slot, ref, data }

  if (ref.kind === 'sau') {
    const sau = data as SauMedId
    const nesteBesokt = new Set(besokt)
    nesteBesokt.add(nokkelForRef)

    if (sau.barnAv) {
      node.mor =
        byggForfedre(
          { id: sau.barnAv, kind: 'sau' },
          `${slot}.mor`,
          sauerById,
          vaererById,
          nesteBesokt,
          dybde + 1,
        ) ?? undefined
    }
    if (sau.farAv) {
      node.far =
        byggForfedre(
          { id: sau.farAv, kind: 'vaer' },
          `${slot}.far`,
          sauerById,
          vaererById,
          nesteBesokt,
          dybde + 1,
        ) ?? undefined
    }
  }

  return node
}

function samleForfedreKanter(node: ForfedreNode, kanter: Array<{ oppe: string; nede: string }>) {
  if (node.mor) {
    kanter.push({ oppe: node.mor.slot, nede: node.slot })
    samleForfedreKanter(node.mor, kanter)
  }
  if (node.far) {
    kanter.push({ oppe: node.far.slot, nede: node.slot })
    samleForfedreKanter(node.far, kanter)
  }
}

/**
 * Bygger etterkommer-treet til et individ rekursivt: barn, barnebarn, oldebarn osv. Et lam
 * kan selv få lam senere (som mor), så vi følger `barnAvMor`-lista videre for hvert barn.
 * Et barn kan derimot aldri være far til nye lam her (fedre er alltid værer, ikke sauer), så
 * `barnAvFar` brukes kun for selve utgangspunktet dersom det er en vær.
 */
function byggEtterkommere(
  ref: IndividRef,
  slot: string,
  sauerById: Map<string, SauMedId>,
  vaererById: Map<string, VaerMedId>,
  barnAvMor: Map<string, SauMedId[]>,
  barnAvFar: Map<string, SauMedId[]>,
  besokt: ReadonlySet<string>,
  dybde: number,
): EtterkommerNode | null {
  const nokkelForRef = noekkel(ref)
  if (besokt.has(nokkelForRef) || dybde > MAKS_GENERASJONER) return null

  const data = ref.kind === 'sau' ? sauerById.get(ref.id) : vaererById.get(ref.id)
  if (!data) return null

  const nesteBesokt = new Set(besokt)
  nesteBesokt.add(nokkelForRef)

  const direkteBarn = ref.kind === 'sau' ? barnAvMor.get(ref.id) : barnAvFar.get(ref.id)
  const sortertBarn = direkteBarn ? [...direkteBarn].sort(sorterBarn) : []

  const barn = sortertBarn
    .map((b, i) =>
      byggEtterkommere(
        { id: b.id, kind: 'sau' },
        `${slot}.barn${i}`,
        sauerById,
        vaererById,
        barnAvMor,
        barnAvFar,
        nesteBesokt,
        dybde + 1,
      ),
    )
    .filter((barnNode): barnNode is EtterkommerNode => barnNode != null)

  return { slot, ref, data, barn }
}

function samleEtterkommerKanter(
  node: EtterkommerNode,
  overSlot: string,
  kanter: Array<{ oppe: string; nede: string }>,
) {
  kanter.push({ oppe: overSlot, nede: node.slot })
  for (const barnNode of node.barn) {
    samleEtterkommerKanter(barnNode, node.slot, kanter)
  }
}

function sorterBarn(a: SauMedId, b: SauMedId): number {
  if (a.foedselsaar != null && b.foedselsaar != null && a.foedselsaar !== b.foedselsaar) {
    return a.foedselsaar - b.foedselsaar
  }
  return (a.navn ?? a.oereNr ?? '').localeCompare(b.navn ?? b.oereNr ?? '', 'nb')
}

const doedsStatusTekst: Record<SauDoedsAarsak, string> = {
  sykdom: '† død, sykdom',
  slakt: '† slaktet',
  forsvunnet: '† forsvunnet',
  solgt: '↗ solgt',
}

function NodeKort({
  data,
  kind,
  erSenter,
  onKlikk,
  registrerRef,
}: {
  data: IndividData
  kind: IndividKind
  erSenter?: boolean
  onKlikk?: () => void
  registrerRef: (el: HTMLDivElement | null) => void
}) {
  const sau = kind === 'sau' ? (data as SauMedId) : null
  const vaer = kind === 'vaer' ? (data as VaerMedId) : null

  const kjoennKlasse =
    kind === 'vaer'
      ? styles.kjoennHann
      : sau?.kjoenn === 'HUNN'
        ? styles.kjoennHunn
        : sau?.kjoenn === 'HANN'
          ? styles.kjoennHann
          : styles.kjoennUkjent

  const symbol = kind === 'vaer' ? '♂' : sau?.kjoenn === 'HUNN' ? '♀' : sau?.kjoenn === 'HANN' ? '♂' : '?'

  const detalj = sau?.foedselsaar != null ? `f. ${sau.foedselsaar}` : vaer?.laantFra ? `Lånt fra ${vaer.laantFra}` : null
  const status = sau?.doedsAarsak ? doedsStatusTekst[sau.doedsAarsak] : null

  return (
    <div
      ref={registrerRef}
      className={`${styles.nodeKort} ${erSenter ? styles.nodeKortSenter : ''}`}
      onClick={onKlikk}
      role={onKlikk ? 'button' : undefined}
      tabIndex={onKlikk ? 0 : undefined}
      onKeyDown={(event) => {
        if (onKlikk && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onKlikk()
        }
      }}
    >
      <span className={`${styles.nodeSymbol} ${kjoennKlasse}`}>{symbol}</span>
      <span className={styles.nodeTekst}>
        <span className={styles.nodeNavn}>{data.navn || 'Uten navn'}</span>
        {data.oereNr && <span className={styles.nodeOereNr}>{data.oereNr}</span>}
        {detalj && <span className={styles.nodeDetalj}>{detalj}</span>}
        {data.prosentVillsau != null && (
          <span className={styles.nodeBadge}>{data.prosentVillsau}% villsau</span>
        )}
        {status && <span className={styles.nodeStatus}>{status}</span>}
      </span>
    </div>
  )
}

function ForfedreGren({
  node,
  erSenter,
  registrer,
  onVelg,
}: {
  node: ForfedreNode
  erSenter: boolean
  registrer: (slot: string, el: HTMLDivElement | null) => void
  onVelg: (ref: IndividRef) => void
}) {
  const harForeldre = !!(node.mor || node.far)

  return (
    <div className={styles.gren}>
      {harForeldre && (
        <div className={styles.foreldrerad}>
          {node.mor && <ForfedreGren node={node.mor} erSenter={false} registrer={registrer} onVelg={onVelg} />}
          {node.far && (
            <NodeKort
              data={node.far.data}
              kind={node.far.ref.kind}
              registrerRef={(el) => registrer(node.far!.slot, el)}
              onKlikk={() => onVelg(node.far!.ref)}
            />
          )}
        </div>
      )}
      <NodeKort
        data={node.data}
        kind={node.ref.kind}
        erSenter={erSenter}
        registrerRef={(el) => registrer(node.slot, el)}
        onKlikk={erSenter ? undefined : () => onVelg(node.ref)}
      />
    </div>
  )
}

function EtterkommerGren({
  node,
  registrer,
  onVelg,
}: {
  node: EtterkommerNode
  registrer: (slot: string, el: HTMLDivElement | null) => void
  onVelg: (ref: IndividRef) => void
}) {
  return (
    <div className={styles.gren}>
      <NodeKort
        data={node.data}
        kind={node.ref.kind}
        registrerRef={(el) => registrer(node.slot, el)}
        onKlikk={() => onVelg(node.ref)}
      />
      {node.barn.length > 0 && (
        <div className={styles.barnRadWrapper}>
          <div className={styles.barnRad}>
            {node.barn.map((barnNode) => (
              <EtterkommerGren key={barnNode.slot} node={barnNode} registrer={registrer} onVelg={onVelg} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SlektstreProps {
  sauer: SauMedId[]
  vaerer: VaerMedId[]
  senter: IndividRef
  onVelg: (ref: IndividRef) => void
}

/**
 * Ren visningskomponent: tegner slektstreet for `senter` ut fra `sauer`/`vaerer`.
 * Tar data som props (ingen egen datahenting) slik at den er lett å bruke med testdata.
 */
export function Slektstre({ sauer, vaerer, senter, onVelg }: SlektstreProps) {
  const { sauerById, vaererById, barnAvMor, barnAvFar } = useMemo(() => {
    const sauerById = new Map(sauer.map((s) => [s.id, s]))
    const vaererById = new Map(vaerer.map((v) => [v.id, v]))
    const barnAvMor = new Map<string, SauMedId[]>()
    const barnAvFar = new Map<string, SauMedId[]>()
    for (const sau of sauer) {
      if (sau.barnAv) {
        const liste = barnAvMor.get(sau.barnAv)
        if (liste) liste.push(sau)
        else barnAvMor.set(sau.barnAv, [sau])
      }
      if (sau.farAv) {
        const liste = barnAvFar.get(sau.farAv)
        if (liste) liste.push(sau)
        else barnAvFar.set(sau.farAv, [sau])
      }
    }
    return { sauerById, vaererById, barnAvMor, barnAvFar }
  }, [sauer, vaerer])

  const forfedreRoot = useMemo(
    () => byggForfedre(senter, 'self', sauerById, vaererById, new Set(), 0),
    [senter, sauerById, vaererById],
  )

  const etterkommerBarn = useMemo(() => {
    const direkteBarn = senter.kind === 'sau' ? barnAvMor.get(senter.id) : barnAvFar.get(senter.id)
    if (!direkteBarn) return []
    const besokt = new Set([noekkel(senter)])
    return [...direkteBarn]
      .sort(sorterBarn)
      .map((b, i) =>
        byggEtterkommere(
          { id: b.id, kind: 'sau' },
          `barn${i}`,
          sauerById,
          vaererById,
          barnAvMor,
          barnAvFar,
          besokt,
          1,
        ),
      )
      .filter((node): node is EtterkommerNode => node != null)
  }, [senter, sauerById, vaererById, barnAvMor, barnAvFar])

  const kanter = useMemo(() => {
    const liste: Array<{ oppe: string; nede: string }> = []
    if (forfedreRoot) samleForfedreKanter(forfedreRoot, liste)
    for (const node of etterkommerBarn) {
      samleEtterkommerKanter(node, 'self', liste)
    }
    return liste
  }, [forfedreRoot, etterkommerBarn])

  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [linjer, setLinjer] = useState<Linje[]>([])

  const registrer = useCallback((slot: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(slot, el)
    else nodeRefs.current.delete(slot)
  }, [])

  const beregnLinjer = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()

    const nyeLinjer: Linje[] = []
    for (const kant of kanter) {
      const oppeEl = nodeRefs.current.get(kant.oppe)
      const nedeEl = nodeRefs.current.get(kant.nede)
      if (!oppeEl || !nedeEl) continue
      const oppeRect = oppeEl.getBoundingClientRect()
      const nedeRect = nedeEl.getBoundingClientRect()

      nyeLinjer.push({
        key: `${kant.oppe}->${kant.nede}`,
        x1: oppeRect.left + oppeRect.width / 2 - containerRect.left,
        y1: oppeRect.bottom - containerRect.top,
        x2: nedeRect.left + nedeRect.width / 2 - containerRect.left,
        y2: nedeRect.top - containerRect.top,
      })
    }
    setLinjer(nyeLinjer)
  }, [kanter])

  useLayoutEffect(() => {
    beregnLinjer()
  }, [beregnLinjer])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => beregnLinjer())
    observer.observe(container)
    window.addEventListener('resize', beregnLinjer)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', beregnLinjer)
    }
  }, [beregnLinjer])

  /**
   * Scroller senter-boksen til midten av synlig område når man navigerer til et nytt individ.
   * Beregner måltposisjon manuelt (i stedet for scrollIntoView) siden smooth scrollIntoView
   * kan bli avbrutt/ikke fullføre i en container som også endrer størrelse rundt samme tidspunkt.
   */
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    const selvEl = nodeRefs.current.get('self')
    if (!scrollEl || !selvEl) return

    const scrollRect = scrollEl.getBoundingClientRect()
    const selvRect = selvEl.getBoundingClientRect()

    const maalVenstre =
      selvRect.left - scrollRect.left + scrollEl.scrollLeft + selvRect.width / 2 - scrollEl.clientWidth / 2
    const maalTopp =
      selvRect.top - scrollRect.top + scrollEl.scrollTop + selvRect.height / 2 - scrollEl.clientHeight / 2

    scrollEl.scrollLeft = Math.max(0, Math.min(maalVenstre, scrollEl.scrollWidth - scrollEl.clientWidth))
    scrollEl.scrollTop = Math.max(0, Math.min(maalTopp, scrollEl.scrollHeight - scrollEl.clientHeight))
  }, [senter])

  if (!forfedreRoot) {
    return (
      <Text size="sm" c="dimmed">
        Fant ikke valgt individ i registeret.
      </Text>
    )
  }

  return (
    <div className={styles.treScroll} ref={scrollRef}>
      <div className={styles.treInnhold} ref={containerRef}>
        <svg className={styles.linjeLag}>
          {linjer.map((linje) => (
            <line key={linje.key} x1={linje.x1} y1={linje.y1} x2={linje.x2} y2={linje.y2} />
          ))}
        </svg>
        <ForfedreGren node={forfedreRoot} erSenter registrer={registrer} onVelg={onVelg} />
        {etterkommerBarn.length > 0 && (
          <div className={styles.barnRadWrapper}>
            <div className={styles.barnRad}>
              {etterkommerBarn.map((node) => (
                <EtterkommerGren key={node.slot} node={node} registrer={registrer} onVelg={onVelg} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function lagValgData(sauer: SauMedId[], vaerer: VaerMedId[]) {
  return [
    {
      group: 'Sauer',
      items: sauer.map((s) => ({
        value: `sau:${s.id}`,
        label: s.navn ? `${s.navn}${s.oereNr ? ` (${s.oereNr})` : ''}` : s.oereNr || 'Uten navn',
      })),
    },
    {
      group: 'Værer',
      items: vaerer.map((v) => ({
        value: `vaer:${v.id}`,
        label: `${v.navn}${v.oereNr ? ` (${v.oereNr})` : ''}`,
      })),
    },
  ]
}

function parseValgVerdi(verdi: string): IndividRef {
  const skille = verdi.indexOf(':')
  return { kind: verdi.slice(0, skille) as IndividKind, id: verdi.slice(skille + 1) }
}

export function SlektstreSeksjon() {
  const { sauer, isLoading: sauerLaster, error: sauerFeil } = useSauer()
  const { vaerer, isLoading: vaerLaster, error: vaerFeil } = useVaer()
  const isLoading = sauerLaster || vaerLaster
  const error = sauerFeil ?? vaerFeil

  const [senter, setSenter] = useState<IndividRef | null>(null)
  const [historie, setHistorie] = useState<IndividRef[]>([])

  /**
   * Så lenge brukeren ikke selv har valgt noe, foreslår vi det nyeste individet med kjent
   * mor/far – gir et interessant tre å se på med en gang siden lastes, uten å lagre et valg
   * i state før brukeren faktisk har gjort et.
   */
  const standardSenter = useMemo<IndividRef | null>(() => {
    const nyesteMedForeldre = [...sauer].reverse().find((s) => s.barnAv || s.farAv)
    if (nyesteMedForeldre) return { id: nyesteMedForeldre.id, kind: 'sau' }
    const fallbackSau = sauer[sauer.length - 1]
    if (fallbackSau) return { id: fallbackSau.id, kind: 'sau' }
    if (vaerer[0]) return { id: vaerer[0].id, kind: 'vaer' }
    return null
  }, [sauer, vaerer])

  const effektivSenter = senter ?? standardSenter

  function naviger(nyttSenter: IndividRef) {
    if (effektivSenter) setHistorie((h) => [...h, effektivSenter])
    setSenter(nyttSenter)
  }

  function gaTilbake() {
    if (historie.length === 0) return
    setSenter(historie[historie.length - 1])
    setHistorie((h) => h.slice(0, -1))
  }

  const valgData = useMemo(() => lagValgData(sauer, vaerer), [sauer, vaerer])

  return (
    <section className={pageStyles.section}>
      <div className={pageStyles.smalInnhold}>
        <h2 className={pageStyles.sectionTitle}>Slektstre</h2>
        <Text size="sm" c="dimmed" mb="1rem">
          Velg en sau eller vær for å se slektstreet. Forfedre (mor/far og bakover) vises
          over, og alle etterkommere (barn, barnebarn osv.) vises under. Klikk på en boks
          for å utforske slekten videre fra det individet.
        </Text>

        <div className={styles.kontroller}>
          <Select
            className={styles.velger}
            label="Vis slektstre for"
            placeholder="Velg sau eller vær"
            data={valgData}
            value={effektivSenter ? `${effektivSenter.kind}:${effektivSenter.id}` : null}
            onChange={(verdi) => {
              if (verdi) naviger(parseValgVerdi(verdi))
            }}
            searchable
            allowDeselect={false}
            nothingFoundMessage="Ingen treff"
          />
          <Button
            className={styles.tilbakeKnapp}
            variant="default"
            disabled={historie.length === 0}
            onClick={gaTilbake}
          >
            ← Tilbake
          </Button>
        </div>
      </div>

      {isLoading && <p className={pageStyles.subtitle}>Laster slektstre…</p>}
      {error && <p className={pageStyles.error}>{error}</p>}

      {!isLoading && !error && !effektivSenter && (
        <p className={pageStyles.subtitle}>Ingen sauer eller værer registrert ennå.</p>
      )}

      {!isLoading && !error && effektivSenter && (
        <Slektstre sauer={sauer} vaerer={vaerer} senter={effektivSenter} onVelg={naviger} />
      )}

      <div className={pageStyles.smalInnhold}>
        <div className={styles.legende}>
          <span className={styles.legendeItem}>
            <span className={`${styles.legendeSymbol} ${styles.kjoennHunn}`}>♀</span> Søye
          </span>
          <span className={styles.legendeItem}>
            <span className={`${styles.legendeSymbol} ${styles.kjoennHann}`}>♂</span> Vær/værlam
          </span>
          <span className={styles.legendeItem}>
            <span className={`${styles.legendeSymbol} ${styles.kjoennUkjent}`}>?</span> Ukjent kjønn
          </span>
        </div>
      </div>
    </section>
  )
}
