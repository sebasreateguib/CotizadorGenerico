const AVATAR_PALETTES: [string, string][] = [
  ['#f33283', '#c21e63'],
  ['#ff7fb5', '#f33283'],
  ['#ffacd6', '#ff7fb5'],
  ['#c21e63', '#7d1240'],
]

/** Gradiente determinístico (misma persona = mismo color siempre) basado en la inicial del nombre. */
export function avatarGradient(name: string): string {
  const idx = (name.trim().charCodeAt(0) || 0) % AVATAR_PALETTES.length
  const [from, to] = AVATAR_PALETTES[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}
