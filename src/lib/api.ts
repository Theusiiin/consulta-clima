/**
 * Acesso à API pública Open-Meteo (sem chave), conforme a documentação oficial:
 * - Geocodificação: https://open-meteo.com/en/docs/geocoding-api
 * - Previsão:       https://open-meteo.com/en/docs
 * Uso gratuito apenas não comercial (limites: 10.000 chamadas/dia), dados sob licença CC BY 4.0.
 */

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const TIMEOUT_MS = 12_000

export interface City {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  countryCode?: string
  admin1?: string
  timezone?: string
}

export interface CurrentWeather {
  time: string
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  windDirection: number
  precipitation: number
  weatherCode: number
  isDay: boolean
}

export interface HourlyPoint {
  time: string
  temperature: number
  precipitationProbability: number | null
  weatherCode: number
  isDay: boolean
}

export interface DailyPoint {
  date: string
  weatherCode: number
  max: number
  min: number
  precipitationProbability: number | null
  sunrise: string
  sunset: string
  uvIndexMax: number | null
}

export interface Forecast {
  timezone: string
  timezoneAbbreviation: string
  current: CurrentWeather
  hourly: HourlyPoint[]
  daily: DailyPoint[]
}

export type WeatherErrorKind = 'network' | 'timeout' | 'service' | 'invalid-response'

export class WeatherError extends Error {
  readonly kind: WeatherErrorKind
  readonly status?: number
  constructor(kind: WeatherErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'WeatherError'
    this.kind = kind
    this.status = status
  }
}

/** Mensagem amigável para exibir ao usuário. */
export function describeError(error: unknown): string {
  if (error instanceof WeatherError) {
    switch (error.kind) {
      case 'network':
        return 'Não foi possível conectar ao serviço de meteorologia. Verifique sua conexão com a internet e tente novamente.'
      case 'timeout':
        return 'O serviço de meteorologia demorou demais para responder. Tente novamente em instantes.'
      case 'service':
        return `O serviço Open-Meteo está indisponível ou recusou a solicitação${error.status ? ` (código ${error.status})` : ''}. Tente novamente mais tarde.`
      case 'invalid-response':
        return 'O serviço de meteorologia retornou dados inesperados. Tente novamente mais tarde.'
    }
  }
  return 'Ocorreu um erro inesperado ao consultar o clima.'
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS)
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort)
  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch (err) {
    if (signal?.aborted) throw err // cancelado pelo chamador: repassa o AbortError
    if (controller.signal.aborted) throw new WeatherError('timeout', 'Tempo de resposta esgotado')
    throw new WeatherError('network', 'Falha de rede')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new WeatherError(response.ok ? 'invalid-response' : 'service', 'Resposta não é JSON', response.status)
  }
  if (!response.ok || (isRecord(body) && body.error === true)) {
    const reason = isRecord(body) && typeof body.reason === 'string' ? body.reason : 'Erro do serviço'
    throw new WeatherError('service', reason, response.status)
  }
  return body
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const name = query.trim()
  if (name.length < 2) return []
  const params = new URLSearchParams({ name, count: '8', language: 'pt', format: 'json' })
  const body = await getJson(`${GEOCODING_URL}?${params}`, signal)
  return parseCities(body)
}

export function parseCities(body: unknown): City[] {
  if (!isRecord(body)) throw new WeatherError('invalid-response', 'Resposta inválida')
  // A API omite "results" quando nada é encontrado.
  if (!Array.isArray(body.results)) return []
  return body.results.filter(isRecord).flatMap((r) => {
    if (typeof r.name !== 'string' || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return []
    return [
      {
        id: typeof r.id === 'number' ? r.id : Math.round(r.latitude * 1e4) * 1e5 + Math.round(r.longitude * 1e4),
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        country: typeof r.country === 'string' ? r.country : undefined,
        countryCode: typeof r.country_code === 'string' ? r.country_code : undefined,
        admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
        timezone: typeof r.timezone === 'string' ? r.timezone : undefined,
      },
    ]
  })
}

export async function fetchForecast(latitude: number, longitude: number, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '24',
    wind_speed_unit: 'kmh',
  })
  const body = await getJson(`${FORECAST_URL}?${params}`, signal)
  return parseForecast(body)
}

export function parseForecast(body: unknown): Forecast {
  try {
    if (!isRecord(body)) throw new Error()
    const c = body.current as Record<string, unknown>
    const h = body.hourly as Record<string, unknown[]>
    const d = body.daily as Record<string, unknown[]>
    const num = (v: unknown) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('campo numérico ausente')
      return v
    }
    const optNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    const str = (v: unknown) => {
      if (typeof v !== 'string') throw new Error('campo de texto ausente')
      return v
    }

    const current: CurrentWeather = {
      time: str(c.time),
      temperature: num(c.temperature_2m),
      apparentTemperature: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      windSpeed: num(c.wind_speed_10m),
      windDirection: num(c.wind_direction_10m),
      precipitation: optNum(c.precipitation) ?? 0,
      weatherCode: num(c.weather_code),
      isDay: c.is_day === 1,
    }
    const hourly: HourlyPoint[] = (h.time ?? []).map((t, i) => ({
      time: str(t),
      temperature: num(h.temperature_2m[i]),
      precipitationProbability: optNum(h.precipitation_probability?.[i]),
      weatherCode: num(h.weather_code[i]),
      isDay: h.is_day?.[i] === 1,
    }))
    const daily: DailyPoint[] = (d.time ?? []).map((t, i) => ({
      date: str(t),
      weatherCode: num(d.weather_code[i]),
      max: num(d.temperature_2m_max[i]),
      min: num(d.temperature_2m_min[i]),
      precipitationProbability: optNum(d.precipitation_probability_max?.[i]),
      sunrise: str(d.sunrise[i]),
      sunset: str(d.sunset[i]),
      uvIndexMax: optNum(d.uv_index_max?.[i]),
    }))
    if (!hourly.length || !daily.length) throw new Error('previsão vazia')
    return {
      timezone: typeof body.timezone === 'string' ? body.timezone : 'GMT',
      timezoneAbbreviation: typeof body.timezone_abbreviation === 'string' ? body.timezone_abbreviation : '',
      current,
      hourly,
      daily,
    }
  } catch {
    throw new WeatherError('invalid-response', 'Formato de previsão inesperado')
  }
}
