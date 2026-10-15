import { useEffect, useState } from 'react'
import { ForecastView } from './components/ForecastView'
import { SearchBox } from './components/SearchBox'
import { WeatherIcon } from './components/WeatherIcon'
import { useWeather } from './hooks/useWeather'
import type { City } from './lib/api'
import { clearRecentCities, loadLastCity, loadRecentCities, rememberCity } from './lib/storage'

const SUGGESTIONS: City[] = [
  { id: 3448439, name: 'São Paulo', latitude: -23.5475, longitude: -46.63611, country: 'Brasil', countryCode: 'BR', admin1: 'São Paulo' },
  { id: 3451190, name: 'Rio de Janeiro', latitude: -22.90642, longitude: -43.18223, country: 'Brasil', countryCode: 'BR', admin1: 'Rio de Janeiro' },
  { id: 2267057, name: 'Lisboa', latitude: 38.71667, longitude: -9.13333, country: 'Portugal', countryCode: 'PT', admin1: 'Lisboa' },
  { id: 5128581, name: 'Nova Iorque', latitude: 40.71427, longitude: -74.00597, country: 'Estados Unidos', countryCode: 'US', admin1: 'Nova Iorque' },
]

const geolocationAvailable = typeof navigator !== 'undefined' && 'geolocation' in navigator

export default function App() {
  const { state, load } = useWeather()
  const [recent, setRecent] = useState<City[]>(loadRecentCities)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  // reabre a última cidade consultada neste navegador
  useEffect(() => {
    const last = loadLastCity()
    if (last) load(last)
  }, [load])

  const selectCity = (city: City) => {
    setGeoError('')
    setRecent((r) => rememberCity(city, r))
    load(city)
  }

  const useLocation = () => {
    if (!geolocationAvailable) return
    setGeoError('')
    setLocating(true)
    // O navegador pede a permissão explicitamente ao usuário; a localização não é armazenada.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        load({
          id: -1,
          name: 'Sua localização',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          country: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
        })
      },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada. Você pode pesquisar a cidade pelo nome.'
            : 'Não foi possível obter sua localização. Pesquise a cidade pelo nome.',
        )
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="./" aria-label="Consulta Clima — início">
            <WeatherIcon icon="partly-cloudy" size={34} />
            <span>
              Consulta <strong>Clima</strong>
            </span>
          </a>
          <SearchBox onSelect={selectCity} onUseLocation={useLocation} locating={locating} geolocationAvailable={geolocationAvailable} />
        </div>
      </header>

      <main id="conteudo" className="container">
        {geoError && (
          <p className="alert alert--warning" role="alert">
            {geoError}
          </p>
        )}

        {recent.length > 0 && (
          <nav className="recent" aria-label="Cidades recentes">
            <span className="recent__label">Recentes:</span>
            {recent.map((c) => (
              <button key={c.id} type="button" className="chip" onClick={() => selectCity(c)} aria-pressed={state.status !== 'idle' && state.place.id === c.id}>
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className="btn btn--link btn--small"
              onClick={() => {
                clearRecentCities()
                setRecent([])
              }}
            >
              Limpar histórico
            </button>
          </nav>
        )}

        {state.status === 'idle' && (
          <section className="welcome">
            <WeatherIcon icon="mostly-clear" size={96} />
            <h1>Previsão do tempo para qualquer cidade</h1>
            <p>Pesquise pelo nome da cidade para ver as condições atuais, as próximas 24 horas e os próximos 7 dias.</p>
            <div className="welcome__suggestions">
              <span>Experimente:</span>
              {SUGGESTIONS.map((c) => (
                <button key={c.id} type="button" className="chip" onClick={() => selectCity(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {state.status === 'loading' && (
          <div className="loading" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <p>Carregando a previsão para {state.place.name}…</p>
            <div className="skeleton skeleton--hero" />
            <div className="skeleton" />
          </div>
        )}

        {state.status === 'error' && (
          <section className="error-state" role="alert">
            <WeatherIcon icon="thunderstorm" size={72} />
            <h2>Não foi possível carregar a previsão</h2>
            <p>{state.message}</p>
            <p className="error-state__place">Local solicitado: {state.place.name}</p>
            <button type="button" className="btn btn--primary" onClick={() => load(state.place)}>
              Tentar novamente
            </button>
          </section>
        )}

        {state.status === 'success' && (
          <>
            {state.refreshError && (
              <p className="alert alert--warning" role="alert">
                Falha ao atualizar: {state.refreshError} Os dados exibidos são da última consulta bem-sucedida.
              </p>
            )}
            <ForecastView
              place={state.place}
              forecast={state.forecast}
              updatedAt={state.updatedAt}
              refreshing={state.refreshing}
              onRefresh={() => load(state.place, 'refresh')}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Dados meteorológicos fornecidos por{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo.com
          </a>{' '}
          sob licença{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          . Previsões são estimativas de modelos numéricos e podem divergir das condições observadas.
        </p>
        <p>
          Desenvolvido por Matheus Bonfatti ·{' '}
          <a href="https://github.com/Theusiiin/consulta-clima" target="_blank" rel="noreferrer">
            Código-fonte no GitHub
          </a>
        </p>
      </footer>
    </>
  )
}
