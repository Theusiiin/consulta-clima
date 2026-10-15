/**
 * Códigos de tempo da OMM (WMO 4677) usados pela Open-Meteo em `weather_code`.
 * Tabela documentada em https://open-meteo.com/en/docs (seção "WMO Weather interpretation codes").
 */
export type IconName =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezing-rain'
  | 'snow'
  | 'showers'
  | 'thunderstorm'

export interface WeatherDescription {
  label: string
  icon: IconName
}

const CODES: Record<number, WeatherDescription> = {
  0: { label: 'Céu limpo', icon: 'clear' },
  1: { label: 'Predominantemente limpo', icon: 'mostly-clear' },
  2: { label: 'Parcialmente nublado', icon: 'partly-cloudy' },
  3: { label: 'Nublado', icon: 'cloudy' },
  45: { label: 'Nevoeiro', icon: 'fog' },
  48: { label: 'Nevoeiro com geada', icon: 'fog' },
  51: { label: 'Garoa fraca', icon: 'drizzle' },
  53: { label: 'Garoa moderada', icon: 'drizzle' },
  55: { label: 'Garoa intensa', icon: 'drizzle' },
  56: { label: 'Garoa congelante fraca', icon: 'freezing-rain' },
  57: { label: 'Garoa congelante intensa', icon: 'freezing-rain' },
  61: { label: 'Chuva fraca', icon: 'rain' },
  63: { label: 'Chuva moderada', icon: 'rain' },
  65: { label: 'Chuva forte', icon: 'rain' },
  66: { label: 'Chuva congelante fraca', icon: 'freezing-rain' },
  67: { label: 'Chuva congelante forte', icon: 'freezing-rain' },
  71: { label: 'Neve fraca', icon: 'snow' },
  73: { label: 'Neve moderada', icon: 'snow' },
  75: { label: 'Neve forte', icon: 'snow' },
  77: { label: 'Grãos de neve', icon: 'snow' },
  80: { label: 'Pancadas de chuva fracas', icon: 'showers' },
  81: { label: 'Pancadas de chuva moderadas', icon: 'showers' },
  82: { label: 'Pancadas de chuva violentas', icon: 'showers' },
  85: { label: 'Pancadas de neve fracas', icon: 'snow' },
  86: { label: 'Pancadas de neve fortes', icon: 'snow' },
  95: { label: 'Trovoada', icon: 'thunderstorm' },
  96: { label: 'Trovoada com granizo fraco', icon: 'thunderstorm' },
  99: { label: 'Trovoada com granizo forte', icon: 'thunderstorm' },
}

export function describeWeather(code: number): WeatherDescription {
  return CODES[code] ?? { label: 'Condição desconhecida', icon: 'cloudy' }
}

/** Tema visual do cartão principal, derivado da condição e do período do dia. */
export function weatherTheme(code: number, isDay: boolean): 'sunny' | 'night' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' {
  const icon = describeWeather(code).icon
  if (icon === 'thunderstorm') return 'stormy'
  if (icon === 'snow') return 'snowy'
  if (['rain', 'showers', 'drizzle', 'freezing-rain'].includes(icon)) return 'rainy'
  if (!isDay) return 'night'
  if (icon === 'cloudy' || icon === 'fog') return 'cloudy'
  return 'sunny'
}
