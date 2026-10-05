import type { ArshjulOppgave } from '@/types/arshjul'

export const MAANED_NAVN = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
]

export function formatDag(maaned: number, dag?: number | null) {
  const navn = MAANED_NAVN[maaned - 1]
  if (dag == null) return navn.charAt(0).toUpperCase() + navn.slice(1)
  return `${dag}. ${navn}`
}

/** Startoppgaver generert fra årshjulet i boka (oversatt fra nynorsk til bokmål). */
export const standardOppgaver: ArshjulOppgave[] = [
  { navn: 'Værer til eget beite', maaned: 1, dag: 10 },
  { navn: 'Snylterkur søyer', maaned: 3, dag: 15 },
  {
    navn: 'Lamming',
    maaned: 4,
    dag: 20,
    periodeSluttMaaned: 5,
    periodeSluttDag: 20,
    kommentar: 'Periodisk hendelse, varer ca. én måned.',
  },
  { navn: 'Snylterkur gimrer og værer', maaned: 4, dag: 25 },
  { navn: 'Ruing/klipping', maaned: 6, dag: 5 },
  { navn: 'Snylterkur lam', maaned: 6, dag: 20 },
  { navn: 'Slakting av utrangerte dyr', maaned: 8, dag: 15 },
  { navn: 'Snylterkur fôringslam', maaned: 9, dag: 15 },
  { navn: 'Tar værlamma fra søyene', maaned: 9, dag: 25 },
  { navn: 'Snylterkur sauelam og søyer', maaned: 10, dag: 10 },
  { navn: 'Slaktelamma blir sendt', maaned: 10, dag: 20 },
  { navn: 'Sauelam på eget beite / utrangering av gamle søyer', maaned: 11, dag: 5 },
  { navn: 'Høstferie', maaned: 11, dag: 10 },
  { navn: 'Værslepp / paring', maaned: 12, dag: 1 },
]
