export interface Slakting {
  aar: number
  /** Fullt datoformat "YYYY-MM-DD" */
  dato?: string
  /** Id-ene (fra sauer/) til dyrene som skal/ble sendt til slakt */
  dyrTilSlakt?: string[]
  gjennomfort?: boolean
  gjennomfortTidspunkt?: number
}

export interface SlaktingMedId extends Slakting {
  id: string
}
