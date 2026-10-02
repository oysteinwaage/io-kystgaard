export type SauKjoenn = 'HANN' | 'HUNN'
export type SauStatus = 'aktiv' | 'solgt' | 'slaktet' | 'dod'
export type SauDoedsAarsak = 'sykdom' | 'slakt' | 'forsvunnet' | 'solgt'

export interface Sau {
  navn?: string
  oereNr?: string
  rase?: string
  kjoenn?: SauKjoenn
  foedselsaar?: number
  /** Måned og dag, format "MM-DD" (uten år – se foedselsaar) */
  foedselsdato?: string
  farge?: string
  vekt?: number
  status?: SauStatus
  kommentar?: string
  barnAv?: string
  doedsAarsak?: SauDoedsAarsak
  doedsAar?: number
  doedKommentar?: string
  kjoeptAv?: string
  solgtPris?: number
}

export interface SauMedId extends Sau {
  id: string
}
