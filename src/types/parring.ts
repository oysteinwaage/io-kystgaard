export interface Parring {
  vaerId: string
  aar: number
  aarLamFoedes?: number
  pris?: number
  kommentar?: string
}

export interface ParringMedId extends Parring {
  id: string
}
