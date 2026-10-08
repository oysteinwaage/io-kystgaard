import type { Sau, SauKjoenn, SauMedId } from '@/types/sau'
import type { ParringMedId } from '@/types/parring'
import type { VaerMedId } from '@/types/vaer'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

type Kolonne =
  | 'oereNr'
  | 'navn'
  | 'foedselsdato'
  | 'kjoenn'
  | 'morOereNr'
  | 'morNavn'
  | 'far'
  | 'prosentVillsau'
  | 'sommervekt'
  | 'hoestvekt'
  | 'fellerEgenUll'
  | 'kommentar'

/** Normaliserte overskrifter i Lamming-malen → kolonne. "Mor" alene er eldre versjon av malen. */
const OVERSKRIFTER: Record<string, Kolonne> = {
  ørenr: 'oereNr',
  navn: 'navn',
  fødselsdato: 'foedselsdato',
  kjønn: 'kjoenn',
  mor: 'morOereNr',
  morørenr: 'morOereNr',
  mornavn: 'morNavn',
  far: 'far',
  andelvillsau: 'prosentVillsau',
  sommervekt: 'sommervekt',
  høstvekt: 'hoestvekt',
  felleregenull: 'fellerEgenUll',
  kommentar: 'kommentar',
}

export type LammingRaaRad = Partial<Record<Kolonne, string>> & { radNr: number }

export interface LammingDokument {
  /** Årstall fra overskriften "Lamming 20xx", om det finnes */
  aar: number | null
  rader: LammingRaaRad[]
}

// ---------- Minimal ZIP-leser (en .docx er et ZIP-arkiv) ----------

async function lesZipFil(buffer: ArrayBuffer, filnavn: string): Promise<string> {
  const data = new DataView(buffer)
  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (data.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('Filen er ikke et gyldig Word-dokument (.docx).')

  const antall = data.getUint16(eocd + 10, true)
  let pos = data.getUint32(eocd + 16, true)
  const dekoder = new TextDecoder()

  for (let n = 0; n < antall; n++) {
    const metode = data.getUint16(pos + 10, true)
    const komprimertStr = data.getUint32(pos + 20, true)
    const navnLengde = data.getUint16(pos + 28, true)
    const ekstraLengde = data.getUint16(pos + 30, true)
    const kommentarLengde = data.getUint16(pos + 32, true)
    const lokalOffset = data.getUint32(pos + 42, true)
    const navn = dekoder.decode(new Uint8Array(buffer, pos + 46, navnLengde))
    pos += 46 + navnLengde + ekstraLengde + kommentarLengde

    if (navn !== filnavn) continue

    const start =
      lokalOffset + 30 + data.getUint16(lokalOffset + 26, true) + data.getUint16(lokalOffset + 28, true)
    const bytes = new Uint8Array(buffer, start, komprimertStr)
    if (metode === 0) return dekoder.decode(bytes)
    if (metode === 8) {
      const stroem = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return new Response(stroem).text()
    }
    throw new Error(`Ukjent komprimering (${metode}) i dokumentet.`)
  }
  throw new Error(`Fant ikke ${filnavn} i dokumentet.`)
}

// ---------- Tolking av Word-tabellen ----------

function barn(el: Element, navn: string) {
  return Array.from(el.children).filter((c) => c.namespaceURI === W_NS && c.localName === navn)
}

function avsnittstekster(el: Element) {
  return Array.from(el.getElementsByTagNameNS(W_NS, 'p')).map((p) =>
    Array.from(p.getElementsByTagNameNS(W_NS, 't'))
      .map((t) => t.textContent ?? '')
      .join(''),
  )
}

function normaliserOverskrift(tekst: string) {
  return tekst.toLowerCase().replace(/[\s\-­]/g, '')
}

interface Celle {
  linjer: string[]
  /** 'start' = første celle i en vertikal sammenslåing, 'fortsett' = sammenslått med cellen over */
  merge: 'start' | 'fortsett' | null
}

function lesRad(tr: Element): Celle[] {
  const celler: Celle[] = []
  for (const tc of barn(tr, 'tc')) {
    const tcPr = barn(tc, 'tcPr')[0]
    const vMerge = tcPr ? barn(tcPr, 'vMerge')[0] : undefined
    const gridSpan = tcPr ? barn(tcPr, 'gridSpan')[0] : undefined
    const span = Number(gridSpan?.getAttributeNS(W_NS, 'val') ?? 1) || 1
    const mergeVal = vMerge?.getAttributeNS(W_NS, 'val')
    const celle: Celle = {
      linjer: avsnittstekster(tc).map((l) => l.trim()),
      merge: vMerge ? (mergeVal === 'restart' ? 'start' : 'fortsett') : null,
    }
    for (let i = 0; i < span; i++) celler.push(i === 0 ? celle : { linjer: [], merge: null })
  }
  return celler
}

/**
 * Fyller inn vertikalt sammenslåtte celler. For de fleste kolonner (f.eks. mor til
 * tvillinger) arver hver rad verdien fra den sammenslåtte cellen. For Kommentar
 * fordeles linjene én per rad når antall linjer stemmer med antall rader – ellers
 * havner hele kommentaren på første rad.
 */
function løsOppSammenslåing(grid: Celle[][], kolonner: (Kolonne | null)[]) {
  const resultat: string[][] = grid.map((rad) => rad.map((c) => c.linjer.filter(Boolean).join(' ')))

  for (let k = 0; k < kolonner.length; k++) {
    for (let r = 0; r < grid.length; r++) {
      if (grid[r][k]?.merge !== 'start') continue
      let slutt = r + 1
      while (slutt < grid.length && grid[slutt][k]?.merge === 'fortsett') slutt++
      const linjer = grid[r][k].linjer.filter(Boolean)
      const antallRader = slutt - r

      for (let i = r; i < slutt; i++) {
        if (kolonner[k] === 'kommentar') {
          resultat[i][k] =
            linjer.length === antallRader ? linjer[i - r] : i === r ? linjer.join(' ') : ''
        } else {
          resultat[i][k] = resultat[r][k]
        }
      }
    }
  }
  return resultat
}

export async function parseLammingDocx(fil: File): Promise<LammingDokument> {
  const xml = await lesZipFil(await fil.arrayBuffer(), 'word/document.xml')
  const dok = new DOMParser().parseFromString(xml, 'application/xml')

  const tabell = Array.from(dok.getElementsByTagNameNS(W_NS, 'tbl')).find((tbl) => {
    const foersteRad = barn(tbl, 'tr')[0]
    return foersteRad && lesRad(foersteRad).some((c) => normaliserOverskrift(c.linjer.join('')) === 'ørenr')
  })
  if (!tabell) throw new Error('Fant ingen tabell med kolonnen «Ørenr» i dokumentet.')

  const [overskriftRad, ...dataRader] = barn(tabell, 'tr').map(lesRad)
  const kolonner = overskriftRad.map((c) => OVERSKRIFTER[normaliserOverskrift(c.linjer.join(''))] ?? null)
  const verdier = løsOppSammenslåing(dataRader, kolonner)

  const rader: LammingRaaRad[] = []
  verdier.forEach((radVerdier, i) => {
    const rad: LammingRaaRad = { radNr: i + 1 }
    kolonner.forEach((kolonne, k) => {
      if (kolonne && radVerdier[k]) rad[kolonne] = radVerdier[k]
    })
    if (Object.keys(rad).length > 1) rader.push(rad)
  })

  const aarTreff = avsnittstekster(dok.documentElement)
    .map((t) => t.match(/lamming\s+(\d{4})/i))
    .find(Boolean)

  return { aar: aarTreff ? Number(aarTreff[1]) : null, rader }
}

// ---------- Fra rå rad til Sau ----------

export interface LammingRad {
  radNr: number
  sau: Sau
  mor: SauMedId | null
  far: VaerMedId | null
  /** Rå tekst for mor/far slik den stod i dokumentet */
  morTekst: string
  farTekst: string
  villsauBeregnet: boolean
  /** Sau med samme ørenr og fødselsår som allerede finnes – oppdateres i stedet for å opprettes */
  eksisterende: SauMedId | null
  /** Felter som endres på den eksisterende sauen (tom for nye sauer) */
  endringer: LammingEndring[]
  feil: string[]
  advarsler: string[]
}

export interface LammingEndring {
  felt: keyof Sau
  fra: Sau[keyof Sau]
  til: Sau[keyof Sau]
}

export function kanImporteres(rad: LammingRad) {
  return rad.feil.length === 0 && (!rad.eksisterende || rad.endringer.length > 0)
}

/**
 * Felter fra dokumentet som avviker fra den eksisterende sauen. Tomme celler i
 * dokumentet (felt som ikke er satt på `sau`) endrer aldri eksisterende verdier.
 */
function finnEndringer(sau: Sau, eksisterende: SauMedId): LammingEndring[] {
  return (Object.keys(sau) as (keyof Sau)[])
    .filter((felt) => sau[felt] !== eksisterende[felt])
    .map((felt) => ({ felt, fra: eksisterende[felt], til: sau[felt] }))
}

function likTekst(a: string | undefined, b: string | undefined) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
}

function tolkTall(tekst: string | undefined): number | null | undefined {
  if (!tekst) return undefined
  const tall = Number(tekst.replace(/[^\d,.-]/g, '').replace(',', '.'))
  return Number.isFinite(tall) && /\d/.test(tekst) ? tall : null
}

/** "20.05", "20.5", "20/05" eller "20.05.2027" → "05-20" */
function tolkDato(tekst: string): string | null {
  const treff = tekst.match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})/)
  if (!treff) return null
  const dag = Number(treff[1])
  const maaned = Number(treff[2])
  if (maaned < 1 || maaned > 12 || dag < 1 || dag > 31) return null
  return `${String(maaned).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
}

function tolkKjoenn(tekst: string): SauKjoenn | null {
  const t = tekst.trim().toLowerCase()
  if (['v', 'vær', 'h', 'hann'].includes(t)) return 'HANN'
  if (['s', 'søye', 'sau', 'hunn'].includes(t)) return 'HUNN'
  return null
}

function tolkJaNei(tekst: string): boolean | null {
  const t = tekst.trim().toLowerCase()
  if (['ja', 'j', 'x'].includes(t)) return true
  if (['nei', 'n'].includes(t)) return false
  return null
}

function finnMor(rad: LammingRaaRad, aar: number | null, alleSauer: SauMedId[]) {
  const advarsler: string[] = []
  const { morOereNr, morNavn } = rad
  if (!morOereNr && !morNavn) return { mor: null, advarsler }

  // Mor må være født før lammet – skiller f.eks. 2017-søye fra et 2027-lam med samme ørenr
  const muligeMødre = alleSauer.filter(
    (s) => s.kjoenn !== 'HANN' && (aar == null || s.foedselsaar == null || s.foedselsaar < aar),
  )
  const paaOereNr = morOereNr ? muligeMødre.filter((s) => likTekst(s.oereNr, morOereNr)) : []
  const paaBegge = morNavn ? paaOereNr.filter((s) => likTekst(s.navn, morNavn)) : []

  if (paaBegge.length === 1) return { mor: paaBegge[0], advarsler }
  if (paaOereNr.length === 1) {
    if (morNavn) advarsler.push(`Mor-navn «${morNavn}» stemmer ikke med ${paaOereNr[0].navn ?? 'navnløs sau'} (${morOereNr}).`)
    return { mor: paaOereNr[0], advarsler }
  }
  if (paaOereNr.length > 1) {
    advarsler.push(`Flere mulige mødre med ørenr ${morOereNr} – fyll inn mor-navn eller sett mor manuelt.`)
    return { mor: null, advarsler }
  }

  const paaNavn = morNavn ? muligeMødre.filter((s) => likTekst(s.navn, morNavn)) : []
  if (paaNavn.length === 1) {
    if (morOereNr) advarsler.push(`Fant ikke ørenr ${morOereNr} – mor matchet på navn (${paaNavn[0].oereNr}).`)
    return { mor: paaNavn[0], advarsler }
  }

  advarsler.push(`Fant ikke mor (${[morOereNr, morNavn].filter(Boolean).join(' / ')}) – lagres uten mor.`)
  return { mor: null, advarsler }
}

/** Værene som har en parring der lammene fødes i `aar` (Parring.aarLamFoedes). */
export function finnParringsVaerer(
  aar: number | null,
  parringer: ParringMedId[],
  alleVaerer: VaerMedId[],
): VaerMedId[] {
  if (aar == null) return []
  const vaerIder = new Set(parringer.filter((p) => p.aarLamFoedes === aar).map((p) => p.vaerId))
  return alleVaerer.filter((v) => vaerIder.has(v.id))
}

/**
 * Far er væren fra parringen med aarLamFoedes lik lammenes fødselsår. Er det flere
 * slike værer, brukes en eventuell Far-kolonne i dokumentet til å velge mellom dem.
 */
function finnFar(tekst: string | undefined, parringsVaerer: VaerMedId[]) {
  if (parringsVaerer.length === 1) return { far: parringsVaerer[0], advarsel: null }
  if (parringsVaerer.length === 0) return { far: null, advarsel: null }

  const treff = tekst
    ? parringsVaerer.filter((v) => likTekst(v.navn, tekst) || likTekst(v.oereNr, tekst))
    : []
  if (treff.length === 1) return { far: treff[0], advarsel: null }
  return {
    far: null,
    advarsel: tekst
      ? `«${tekst}» er ikke en av værene parret dette året – lagres uten far.`
      : 'Flere værer er parret dette året og Far er ikke fylt inn – lagres uten far.',
  }
}

export function byggLammingRader(
  dokument: LammingDokument,
  aar: number | null,
  alleSauer: SauMedId[],
  alleVaerer: VaerMedId[],
  parringer: ParringMedId[],
): LammingRad[] {
  const sett = new Set<string>()
  const parringsVaerer = finnParringsVaerer(aar, parringer, alleVaerer)

  return dokument.rader.map((raa) => {
    const feil: string[] = []
    const advarsler: string[] = []
    const sau: Sau = {}
    if (aar != null) sau.foedselsaar = aar

    const oereNr = raa.oereNr?.trim()
    if (oereNr) sau.oereNr = oereNr
    else feil.push('Mangler ørenr.')

    const eksisterende =
      (oereNr &&
        aar != null &&
        alleSauer.find((s) => likTekst(s.oereNr, oereNr) && s.foedselsaar === aar)) ||
      null

    if (raa.navn) sau.navn = raa.navn.trim()

    if (raa.kjoenn) {
      const kjoenn = tolkKjoenn(raa.kjoenn)
      if (kjoenn) sau.kjoenn = kjoenn
      else feil.push(`Ukjent kjønn «${raa.kjoenn}» (bruk V eller S).`)
    } else if (!eksisterende) {
      feil.push('Mangler kjønn.')
    }

    if (raa.foedselsdato) {
      const dato = tolkDato(raa.foedselsdato)
      if (dato) sau.foedselsdato = dato
      else advarsler.push(`Kunne ikke tolke fødselsdato «${raa.foedselsdato}».`)
    }

    const { mor, advarsler: morAdvarsler } = finnMor(raa, aar, alleSauer)
    advarsler.push(...morAdvarsler)
    if (mor) sau.barnAv = mor.id

    const { far, advarsel: farAdvarsel } = finnFar(raa.far, parringsVaerer)
    if (farAdvarsel) advarsler.push(farAdvarsel)
    if (far) sau.farAv = far.id

    let villsauBeregnet = false
    const villsau = tolkTall(raa.prosentVillsau)
    if (villsau === null || (villsau != null && (villsau < 0 || villsau > 100))) {
      advarsler.push(`Ugyldig andel villsau «${raa.prosentVillsau}».`)
    } else if (villsau != null) {
      sau.prosentVillsau = villsau
    } else if (mor?.prosentVillsau != null && far?.prosentVillsau != null) {
      sau.prosentVillsau = Math.round((mor.prosentVillsau + far.prosentVillsau) / 2)
      villsauBeregnet = true
    }

    const sommervekt = tolkTall(raa.sommervekt)
    if (sommervekt === null) advarsler.push(`Ugyldig sommervekt «${raa.sommervekt}».`)
    else if (sommervekt != null) sau.foedselsvekt = sommervekt

    const hoestvekt = tolkTall(raa.hoestvekt)
    if (hoestvekt === null) advarsler.push(`Ugyldig høstvekt «${raa.hoestvekt}».`)
    else if (hoestvekt != null) sau.hoestvekt = hoestvekt

    if (raa.fellerEgenUll) {
      const ull = tolkJaNei(raa.fellerEgenUll)
      if (ull != null) sau.fellerEgenUll = ull
      else advarsler.push(`Kunne ikke tolke «Feller egen ull»: «${raa.fellerEgenUll}» (bruk Ja/Nei).`)
    }

    if (raa.kommentar) sau.kommentar = raa.kommentar.trim()

    if (oereNr) {
      const noekkel = oereNr.toLowerCase()
      if (sett.has(noekkel)) feil.push(`Ørenr ${oereNr} står flere ganger i dokumentet.`)
      sett.add(noekkel)
    }

    return {
      radNr: raa.radNr,
      sau,
      mor,
      far,
      morTekst: [raa.morOereNr, raa.morNavn].filter(Boolean).join(' / '),
      farTekst: raa.far ?? '',
      villsauBeregnet,
      eksisterende,
      endringer: eksisterende ? finnEndringer(sau, eksisterende) : [],
      feil,
      advarsler,
    }
  })
}
