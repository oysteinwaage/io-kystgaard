import type { SauMedId } from '@/types/sau'

export const europBeskrivelser: Record<string, string> = {
  E: 'Utmerket',
  U: 'Meget god',
  R: 'God',
  O: 'Mindre god',
  P: 'Dårlig',
}

const europBokstaverFraDaarligstTilBest = ['P', 'O', 'R', 'U', 'E'] as const
const europModifikatorer = ['-', '', '+'] as const

export interface EuropKategori {
  /** F.eks. "O-", "P+", "E" */
  kode: string
  bokstav: (typeof europBokstaverFraDaarligstTilBest)[number]
  modifikator: (typeof europModifikatorer)[number]
  beskrivelse: string
  /** Lineær tallverdi fra 1 (P-) til 15 (E+), for å kunne regne snitt på tvers av kategorier */
  verdi: number
}

/** Alle 15 EUROP-kategorier (bokstav + modifikator), sortert fra dårligst (P-, verdi 1) til best (E+, verdi 15) */
export const europKategorier: EuropKategori[] = europBokstaverFraDaarligstTilBest.flatMap(
  (bokstav, bokstavIndex) =>
    europModifikatorer.map((modifikator, modifikatorIndex) => ({
      kode: `${bokstav}${modifikator}`,
      bokstav,
      modifikator,
      beskrivelse: europBeskrivelser[bokstav],
      verdi: bokstavIndex * europModifikatorer.length + modifikatorIndex + 1,
    })),
)

function normaliserKode(kategori: string) {
  return kategori.trim().toUpperCase().replace('−', '-')
}

/** Slår opp tallverdien (1-15) for en EUROP-kode, f.eks. "O-" -> 4. Returnerer null hvis koden ikke finnes. */
export function europTallverdi(kategori: string | undefined | null): number | null {
  if (!kategori) return null
  const kode = normaliserKode(kategori)
  return europKategorier.find((k) => k.kode === kode)?.verdi ?? null
}

/** Finner den EUROP-koden som ligger nærmest en gitt tallverdi, f.eks. 4 -> "O-". */
export function europKodeForTallverdi(verdi: number): string {
  const naermeste = Math.min(Math.max(Math.round(verdi), 1), europKategorier.length)
  return europKategorier[naermeste - 1].kode
}

/** Regner ut gjennomsnittlig tallverdi for en liste med EUROP-koder. Ukjente/manglende koder ignoreres. */
export function europSnittverdi(kategorier: Array<string | undefined | null>): number | null {
  const verdier = kategorier
    .map((kategori) => europTallverdi(kategori))
    .filter((verdi): verdi is number => verdi != null)

  if (verdier.length === 0) return null
  return verdier.reduce((sum, verdi) => sum + verdi, 0) / verdier.length
}

/**
 * Regner ut snitt-slaktekategori for alle lam født av en gitt sau (morId), basert på
 * slaktKategori til sauer/lam som har `barnAv === morId` og er slaktet. Returnerer både
 * tallverdien og nærmeste EUROP-kode, eller null hvis ingen av lamma har en registrert
 * slaktkategori.
 */
export function europSnittForLamAvSau(
  morId: string,
  alleSauer: SauMedId[],
): { snittverdi: number; naermesteKode: string; antallLam: number } | null {
  const lam = alleSauer.filter((sau) => sau.barnAv === morId && sau.slaktKategori)
  const snittverdi = europSnittverdi(lam.map((sau) => sau.slaktKategori))
  if (snittverdi == null) return null

  return {
    snittverdi,
    naermesteKode: europKodeForTallverdi(snittverdi),
    antallLam: lam.length,
  }
}
