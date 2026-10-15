import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError, fetchForecast, type City, type Forecast } from '../lib/api'

export type WeatherState =
  | { status: 'idle' }
  | { status: 'loading'; place: City }
  | { status: 'success'; place: City; forecast: Forecast; updatedAt: Date; refreshing: boolean; refreshError?: string }
  | { status: 'error'; place: City; message: string }

/** Carrega a previsão do local selecionado, cancelando requisições obsoletas. */
export function useWeather() {
  const [state, setState] = useState<WeatherState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (place: City, mode: 'fresh' | 'refresh' = 'fresh') => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState((prev) =>
      mode === 'refresh' && prev.status === 'success' && prev.place.id === place.id
        ? { ...prev, refreshing: true, refreshError: undefined }
        : { status: 'loading', place },
    )
    try {
      const forecast = await fetchForecast(place.latitude, place.longitude, controller.signal)
      if (controller.signal.aborted) return
      setState({ status: 'success', place, forecast, updatedAt: new Date(), refreshing: false })
    } catch (err) {
      if (controller.signal.aborted) return
      const message = describeError(err)
      setState((prev) =>
        // numa atualização que falha, mantém os dados anteriores (com horário) e avisa o erro
        mode === 'refresh' && prev.status === 'success' && prev.place.id === place.id
          ? { ...prev, refreshing: false, refreshError: message }
          : { status: 'error', place, message },
      )
    }
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { state, load }
}
