/**
 * A Open-Meteo devolve horários locais da cidade (timezone=auto) no formato ISO sem fuso,
 * ex.: "2026-10-15T14:00". Por isso os horários são lidos como texto — convertê-los com
 * `new Date()` os interpretaria no fuso do navegador e poderia exibir horas erradas.
 */

export function formatHour(isoLocal: string): string {
  return isoLocal.slice(11, 16)
}

function partsOf(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })
const shortWeekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const dayMonthFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const longDateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Hoje", "Amanhã" ou o dia da semana, relativo à data local da cidade (`todayIso`). */
export function formatDayLabel(isoDate: string, todayIso: string): string {
  const diff = Math.round((partsOf(isoDate).getTime() - partsOf(todayIso).getTime()) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return cap(weekdayFmt.format(partsOf(isoDate)).replace('-feira', ''))
}

export function formatShortWeekday(isoDate: string): string {
  return cap(shortWeekdayFmt.format(partsOf(isoDate)).replace('.', ''))
}

export function formatDayMonth(isoDate: string): string {
  return dayMonthFmt.format(partsOf(isoDate))
}

export function formatLongDate(isoDate: string): string {
  return cap(longDateFmt.format(partsOf(isoDate)))
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`
}

const DIRECTIONS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
/** Direção de onde o vento sopra, em pontos cardeais (português: L = leste, O = oeste). */
export function windDirectionLabel(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return DIRECTIONS[index]
}

export function uvLabel(uv: number): string {
  if (uv < 3) return 'Baixo'
  if (uv < 6) return 'Moderado'
  if (uv < 8) return 'Alto'
  if (uv < 11) return 'Muito alto'
  return 'Extremo'
}

export function formatPlace(city: { name: string; admin1?: string; country?: string }): string {
  return [city.admin1 && city.admin1 !== city.name ? city.admin1 : null, city.country].filter(Boolean).join(', ')
}
