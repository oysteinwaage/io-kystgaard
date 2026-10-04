import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface SlaktOppgjorFunn {
  /** Ørenummer – matches Sau.oereNr */
  oereNr: string
  slaktevekt: number
  slaktPris: number
  slaktKategori: string
}

type Kolonne = 'varenr' | 'oereNr' | 'tekst' | 'usr' | 'antall' | 'vekt' | 'pris' | 'belop'

/**
 * Horisontale x-posisjoner (PDF-punkter) for hver kolonne i Fatlands
 * slakteoppgjørsseddel. Funnet ved å lese transform[4] for tekstelementene i
 * overskriftsraden og datarader – stabilt for alle oppgjørssedler med samme
 * mal. Verdier utenfor noen av disse båndene (f.eks. løse sidetall-merker
 * trykket midt i tabellen) ignoreres bevisst.
 */
const KOLONNE_BAND: Record<Kolonne, [number, number]> = {
  varenr: [15, 45],
  oereNr: [55, 85],
  tekst: [135, 280],
  usr: [300, 335],
  antall: [355, 380],
  vekt: [395, 430],
  pris: [448, 478],
  belop: [510, 552],
}

function finnKolonne(x: number): Kolonne | null {
  for (const navn of Object.keys(KOLONNE_BAND) as Kolonne[]) {
    const [min, max] = KOLONNE_BAND[navn]
    if (x >= min && x <= max) return navn
  }
  return null
}

function tilTall(verdi: string | undefined): number | null {
  if (!verdi) return null
  const tall = Number(verdi.replace(',', '.'))
  return Number.isNaN(tall) ? null : tall
}

/**
 * Leser en Fatland-slakteoppgjørsseddel (PDF) og henter ut, per dyr som faktisk
 * ble slaktet (ikke RETUR-korrigeringslinjer, som har negativt antall):
 * ørenummer, slaktevekt (kolonne "Vekt"), slaktpris (kolonne "Beløp") og
 * slaktkategori (siste ord i kolonnen "Tekst", f.eks. "O-"/"P+").
 *
 * Tekstelementene plasseres i kolonner basert på x-posisjon (ikke
 * leserekkefølgen i PDF-innholdsstrømmen, som ikke følger visuell
 * venstre-til-høyre rekkefølge i denne malen).
 */
export async function parseSlaktOppgjorPdf(fil: File): Promise<SlaktOppgjorFunn[]> {
  const data = new Uint8Array(await fil.arrayBuffer())
  const dokument = await getDocument({ data }).promise

  const funnPerOereNr = new Map<string, SlaktOppgjorFunn>()

  for (let sideNr = 1; sideNr <= dokument.numPages; sideNr++) {
    const side = await dokument.getPage(sideNr)
    const innhold = await side.getTextContent()

    const rader = new Map<number, Partial<Record<Kolonne, string>>>()
    for (const item of innhold.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const kolonne = finnKolonne(item.transform[4])
      if (!kolonne) continue
      const y = Math.round(item.transform[5] * 10) / 10
      const rad = rader.get(y) ?? {}
      rad[kolonne] = (rad[kolonne] ?? '') + item.str
      rader.set(y, rad)
    }

    for (const rad of rader.values()) {
      if (!/^\d{5}$/.test(rad.oereNr ?? '')) continue
      if (!/^\d{6}$/.test(rad.varenr ?? '')) continue

      const antall = tilTall(rad.antall)
      if (antall == null || antall <= 0) continue

      const slaktevekt = tilTall(rad.vekt)
      const slaktPris = tilTall(rad.belop)
      if (slaktevekt == null || slaktPris == null) continue

      const ord = (rad.tekst ?? '').trim().split(/\s+/).filter(Boolean)
      const slaktKategori = ord[ord.length - 1] ?? ''

      funnPerOereNr.set(rad.oereNr!, { oereNr: rad.oereNr!, slaktevekt, slaktPris, slaktKategori })
    }
  }

  return Array.from(funnPerOereNr.values())
}
