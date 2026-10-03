import { set } from 'firebase/database'
import { appRef } from '@/lib/firebase'
import type { SauMedId } from '@/types/sau'
import type { VaerMedId } from '@/types/vaer'

type VerdiKart = Map<string, number | undefined>

function lagreKalkulertProsentVillsau(sauId: string, verdi: number) {
  set(appRef(`sauer/${sauId}/prosentVillsau`), verdi).catch((err) => {
    console.error(`Kunne ikke lagre kalkulert prosentVillsau for sau ${sauId}:`, err)
  })
}

function byggVerdiKart(alleSauer: SauMedId[], alleVaerer: VaerMedId[]) {
  const sauVerdier: VerdiKart = new Map(alleSauer.map((sau) => [sau.id, sau.prosentVillsau]))
  const vaerVerdier: VerdiKart = new Map(alleVaerer.map((vaer) => [vaer.id, vaer.prosentVillsau]))
  return { sauVerdier, vaerVerdier }
}

/**
 * Kalkulerer og lagrer prosentVillsau nedover i slektstreet, fra og med barna til
 * (id, erVaer) og videre til barnebarn osv. Forutsetter at sauVerdier/vaerVerdier
 * allerede inneholder oppdatert verdi for (id, erVaer) selv.
 */
function kaskadeTilBarn(
  id: string,
  erVaer: boolean,
  sauVerdier: VerdiKart,
  vaerVerdier: VerdiKart,
  alleSauer: SauMedId[],
) {
  const koe: { id: string; erVaer: boolean }[] = [{ id, erVaer }]
  const behandlet = new Set<string>()

  while (koe.length > 0) {
    const gjeldende = koe.shift()!
    const noekkel = `${gjeldende.erVaer ? 'v' : 's'}:${gjeldende.id}`
    if (behandlet.has(noekkel)) continue
    behandlet.add(noekkel)

    const barn = alleSauer.filter((sau) =>
      gjeldende.erVaer ? sau.farAv === gjeldende.id : sau.barnAv === gjeldende.id,
    )

    for (const barnSau of barn) {
      if (!barnSau.barnAv || !barnSau.farAv) continue

      const morVerdi = sauVerdier.get(barnSau.barnAv)
      const farVerdi = vaerVerdier.get(barnSau.farAv)
      if (morVerdi == null || farVerdi == null) continue

      const kalkulert = Math.round((morVerdi + farVerdi) / 2)
      if (sauVerdier.get(barnSau.id) === kalkulert) continue

      sauVerdier.set(barnSau.id, kalkulert)
      lagreKalkulertProsentVillsau(barnSau.id, kalkulert)
      koe.push({ id: barnSau.id, erVaer: false })
    }
  }
}

/**
 * Når prosentVillsau endres på en sau (mor) eller vær (far), kalkuleres og lagres
 * prosentVillsau automatisk for alle etterkommere (barn, barnebarn, ...) som har
 * både mor og far satt. Kalkulert verdi er gjennomsnittet av mor og far sin
 * prosentVillsau. Etterkommere kaskaderes rekursivt siden en oppdatert verdi hos
 * et barn kan påvirke barnets egne barn.
 */
export function oppdaterVillsauForEtterkommere({
  endretId,
  erVaer,
  nyVerdi,
  alleSauer,
  alleVaerer,
}: {
  endretId: string
  erVaer: boolean
  nyVerdi: number | null
  alleSauer: SauMedId[]
  alleVaerer: VaerMedId[]
}) {
  const { sauVerdier, vaerVerdier } = byggVerdiKart(alleSauer, alleVaerer)

  if (erVaer) {
    vaerVerdier.set(endretId, nyVerdi ?? undefined)
  } else {
    sauVerdier.set(endretId, nyVerdi ?? undefined)
  }

  kaskadeTilBarn(endretId, erVaer, sauVerdier, vaerVerdier, alleSauer)
}

/**
 * Når mor eller far settes på en sau, og begge nå er satt, kalkuleres og lagres
 * sauens egen prosentVillsau fra foreldrenes verdier, og kaskaderes videre til
 * sauens egne etterkommere.
 */
export function oppdaterVillsauVedForeldreSatt({
  sauId,
  morId,
  farId,
  alleSauer,
  alleVaerer,
}: {
  sauId: string
  morId: string | null | undefined
  farId: string | null | undefined
  alleSauer: SauMedId[]
  alleVaerer: VaerMedId[]
}) {
  if (!morId || !farId) return

  const { sauVerdier, vaerVerdier } = byggVerdiKart(alleSauer, alleVaerer)
  const morVerdi = sauVerdier.get(morId)
  const farVerdi = vaerVerdier.get(farId)
  if (morVerdi == null || farVerdi == null) return

  const kalkulert = Math.round((morVerdi + farVerdi) / 2)
  const gjeldendeSau = alleSauer.find((sau) => sau.id === sauId)
  if (gjeldendeSau?.prosentVillsau === kalkulert) return

  sauVerdier.set(sauId, kalkulert)
  lagreKalkulertProsentVillsau(sauId, kalkulert)
  kaskadeTilBarn(sauId, false, sauVerdier, vaerVerdier, alleSauer)
}
