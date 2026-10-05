export interface ArshjulOppgave {
  navn: string
  /** Startmåned for oppgaven, 1–12. Oppgaven gjentar seg hvert år på denne datoen. */
  maaned: number
  /** Startdag i måneden, 1–31. Utelatt betyr "hele måneden" (vises kun med månedsnavn). */
  dag?: number
  /** For periodiske oppgaver (f.eks. lamming): ca. sluttmåned. */
  periodeSluttMaaned?: number
  /** For periodiske oppgaver (f.eks. lamming): ca. sluttdag. */
  periodeSluttDag?: number
  kommentar?: string
  /** Årstall (som nøkkel) -> ISO-dato for når oppgaven ble markert gjennomført det året. */
  fullforinger?: Record<string, string>
}

export interface ArshjulOppgaveMedId extends ArshjulOppgave {
  id: string
}
