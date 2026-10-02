export interface Vaer {
  navn: string
  oereNr?: string
  laantFra?: string
  prosentVillsau?: number
  /** Årstall væren har vært brukt til parring. Avledet fra parringer/ – redigeres ikke direkte. */
  aarstallLaant?: number[]
  kommentar?: string
}

export interface VaerMedId extends Vaer {
  id: string
}
