import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeError, fetchForecast, parseCities, parseForecast, searchCities, WeatherError } from './api'

const forecastBody = {
  timezone: 'America/Sao_Paulo',
  timezone_abbreviation: 'GMT-3',
  current: {
    time: '2026-10-15T10:15',
    temperature_2m: 23.6,
    relative_humidity_2m: 62,
    apparent_temperature: 25.2,
    is_day: 1,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 8.3,
    wind_direction_10m: 286,
  },
  hourly: {
    time: ['2026-10-15T10:00', '2026-10-15T11:00'],
    temperature_2m: [23.3, 24.7],
    precipitation_probability: [37, null],
    weather_code: [2, 3],
    is_day: [1, 1],
  },
  daily: {
    time: ['2026-10-15'],
    weather_code: [80],
    temperature_2m_max: [25.7],
    temperature_2m_min: [17.6],
    precipitation_probability_max: [96],
    sunrise: ['2026-10-15T05:31'],
    sunset: ['2026-10-15T18:11'],
    uv_index_max: [9.1],
  },
}

function mockFetch(impl: () => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(impl)
}

afterEach(() => vi.restoreAllMocks())

describe('parseCities', () => {
  it('converte o formato da API de geocodificação', () => {
    const cities = parseCities({
      results: [
        { id: 1, name: 'Recife', latitude: -8.05, longitude: -34.9, country: 'Brasil', country_code: 'BR', admin1: 'Pernambuco' },
        { name: 'sem coordenadas' },
      ],
    })
    expect(cities).toEqual([
      { id: 1, name: 'Recife', latitude: -8.05, longitude: -34.9, country: 'Brasil', countryCode: 'BR', admin1: 'Pernambuco', timezone: undefined },
    ])
  })
  it('retorna lista vazia quando a API omite "results" (nenhuma cidade encontrada)', () => {
    expect(parseCities({ generationtime_ms: 0.1 })).toEqual([])
  })
  it('rejeita respostas que não são objetos', () => {
    expect(() => parseCities('x')).toThrow(WeatherError)
  })
})

describe('parseForecast', () => {
  it('converte atual, horária e diária', () => {
    const f = parseForecast(forecastBody)
    expect(f.current.temperature).toBe(23.6)
    expect(f.current.isDay).toBe(true)
    expect(f.hourly).toHaveLength(2)
    expect(f.hourly[1].precipitationProbability).toBeNull()
    expect(f.daily[0]).toMatchObject({ max: 25.7, min: 17.6, precipitationProbability: 96, uvIndexMax: 9.1 })
  })
  it('falha com erro claro quando faltam dados obrigatórios', () => {
    const broken = { ...forecastBody, current: { ...forecastBody.current, temperature_2m: null } }
    expect(() => parseForecast(broken)).toThrow(WeatherError)
    try {
      parseForecast(broken)
    } catch (e) {
      expect((e as WeatherError).kind).toBe('invalid-response')
    }
  })
})

describe('requisições', () => {
  it('não consulta a API com menos de 2 caracteres', async () => {
    const spy = mockFetch(async () => new Response('{}'))
    expect(await searchCities(' a ')).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('monta a URL de busca com idioma português', async () => {
    const spy = mockFetch(async () => new Response(JSON.stringify({ results: [] })))
    await searchCities('São Paulo')
    const url = new URL(String(spy.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search')
    expect(url.searchParams.get('name')).toBe('São Paulo')
    expect(url.searchParams.get('language')).toBe('pt')
  })

  it('pede previsão com fuso automático e as variáveis necessárias', async () => {
    const spy = mockFetch(async () => new Response(JSON.stringify(forecastBody)))
    const f = await fetchForecast(-23.5475, -46.63611)
    const url = new URL(String(spy.mock.calls[0][0]))
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('current')).toContain('apparent_temperature')
    expect(url.searchParams.get('hourly')).toContain('precipitation_probability')
    expect(url.searchParams.get('daily')).toContain('temperature_2m_min')
    expect(f.timezone).toBe('America/Sao_Paulo')
  })

  it('traduz falha de rede em WeatherError("network")', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(fetchForecast(0, 0)).rejects.toMatchObject({ kind: 'network' })
  })

  it('traduz erro HTTP / indisponibilidade em WeatherError("service")', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: true, reason: 'Service unavailable' }), { status: 503 }))
    await expect(fetchForecast(0, 0)).rejects.toMatchObject({ kind: 'service', status: 503 })
  })

  it('trata resposta não-JSON de um servidor indisponível', async () => {
    mockFetch(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(searchCities('Recife')).rejects.toMatchObject({ kind: 'service', status: 502 })
  })

  it('repassa o cancelamento feito pelo chamador sem convertê-lo em erro de rede', async () => {
    mockFetch(() => Promise.reject(new DOMException('aborted', 'AbortError')))
    const controller = new AbortController()
    controller.abort()
    await expect(searchCities('Recife', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('describeError', () => {
  it('gera mensagens compreensíveis', () => {
    expect(describeError(new WeatherError('network', ''))).toMatch(/conexão/)
    expect(describeError(new WeatherError('service', '', 503))).toMatch(/503/)
    expect(describeError(new Error('x'))).toMatch(/inesperado/)
  })
})
