import type { City } from './api'

const LAST_KEY = 'clima:last-city'
const RECENT_KEY = 'clima:recent-cities'
const MAX_RECENT = 6

function isCity(v: unknown): v is City {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return typeof c.id === 'number' && typeof c.name === 'string' && typeof c.latitude === 'number' && typeof c.longitude === 'number'
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* armazenamento indisponível (modo privado, cota): ignora */
  }
}

export function loadLastCity(): City | null {
  const v = read(LAST_KEY)
  return isCity(v) ? v : null
}

export function loadRecentCities(): City[] {
  const v = read(RECENT_KEY)
  return Array.isArray(v) ? v.filter(isCity).slice(0, MAX_RECENT) : []
}

/** Salva o local como último consultado e o coloca no topo dos recentes. */
export function rememberCity(city: City, recent: City[]): City[] {
  write(LAST_KEY, city)
  const next = [city, ...recent.filter((c) => c.id !== city.id)].slice(0, MAX_RECENT)
  write(RECENT_KEY, next)
  return next
}

export function clearRecentCities() {
  write(RECENT_KEY, [])
}
