import { describe, expect, it } from 'vitest'
import { formatDayLabel, formatHour, formatPlace, formatTemp, uvLabel, windDirectionLabel } from './format'
import { describeWeather, weatherTheme } from './weatherCodes'

describe('formatação', () => {
  it('lê a hora local sem converter fuso', () => {
    expect(formatHour('2026-10-15T23:00')).toBe('23:00')
  })
  it('rotula hoje, amanhã e dias da semana', () => {
    expect(formatDayLabel('2026-10-15', '2026-10-15T10:15')).toBe('Hoje')
    expect(formatDayLabel('2026-10-16', '2026-10-15T23:59')).toBe('Amanhã')
    expect(formatDayLabel('2026-10-18', '2026-10-15T10:00')).toBe('Domingo')
    expect(formatDayLabel('2026-10-19', '2026-10-15T10:00')).toBe('Segunda')
  })
  it('arredonda temperaturas', () => {
    expect(formatTemp(23.6)).toBe('24°')
    expect(formatTemp(-0.4)).toBe('0°') // nunca exibe "-0°"
  })
  it('converte direção do vento em pontos cardeais', () => {
    expect(windDirectionLabel(0)).toBe('N')
    expect(windDirectionLabel(90)).toBe('L')
    expect(windDirectionLabel(286)).toBe('O')
    expect(windDirectionLabel(359)).toBe('N')
    expect(windDirectionLabel(-45)).toBe('NO')
  })
  it('classifica o índice UV', () => {
    expect(uvLabel(2)).toBe('Baixo')
    expect(uvLabel(9.1)).toBe('Muito alto')
    expect(uvLabel(12)).toBe('Extremo')
  })
  it('monta estado e país sem repetir o nome da cidade', () => {
    expect(formatPlace({ name: 'São Paulo', admin1: 'São Paulo', country: 'Brasil' })).toBe('Brasil')
    expect(formatPlace({ name: 'Recife', admin1: 'Pernambuco', country: 'Brasil' })).toBe('Pernambuco, Brasil')
  })
})

describe('códigos WMO', () => {
  it('descreve códigos conhecidos em português', () => {
    expect(describeWeather(0)).toEqual({ label: 'Céu limpo', icon: 'clear' })
    expect(describeWeather(63).label).toBe('Chuva moderada')
    expect(describeWeather(95).icon).toBe('thunderstorm')
  })
  it('não inventa condição para código desconhecido', () => {
    expect(describeWeather(42).label).toBe('Condição desconhecida')
  })
  it('escolhe o tema visual', () => {
    expect(weatherTheme(0, true)).toBe('sunny')
    expect(weatherTheme(0, false)).toBe('night')
    expect(weatherTheme(61, true)).toBe('rainy')
    expect(weatherTheme(99, false)).toBe('stormy')
  })
})
