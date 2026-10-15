/** Rot-stien for den offentlige nettsiden. Alt under denne krever ikke innlogging. */
export const PUBLIC_BASE = '/gardsbutikk'

export function erPublicSti(pathname: string) {
  return pathname === PUBLIC_BASE || pathname.startsWith(`${PUBLIC_BASE}/`)
}
