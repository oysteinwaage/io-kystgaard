export type SauKjonn = 'soye' | 'vaer' | 'lam'
export type SauStatus = 'aktiv' | 'solgt' | 'slaktet' | 'dod'

export interface Sau {
  navn: string
  oereNr?: string
  rase?: string
  kjonn?: SauKjonn
  fodselsdato?: string
  farge?: string
  vekt?: number
  status?: SauStatus
  notater?: string
}

export interface SauMedId extends Sau {
  id: string
}
