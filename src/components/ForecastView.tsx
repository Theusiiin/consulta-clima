import type { City, Forecast } from '../lib/api'
import {
  formatDayLabel,
  formatDayMonth,
  formatHour,
  formatLongDate,
  formatPlace,
  formatTemp,
  uvLabel,
  windDirectionLabel,
} from '../lib/format'
import { describeWeather, weatherTheme } from '../lib/weatherCodes'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  place: City
  forecast: Forecast
  updatedAt: Date
  refreshing: boolean
  onRefresh: () => void
}

export function ForecastView({ place, forecast, updatedAt, refreshing, onRefresh }: Props) {
  const { current, hourly, daily } = forecast
  const today = daily[0]
  const condition = describeWeather(current.weatherCode)
  // probabilidade de precipitação da hora corrente (a API não fornece esse dado em "current")
  const precipitationNow = hourly[0]?.precipitationProbability
  const placeLine = formatPlace(place)

  return (
    <div className="forecast">
      <section className={`hero hero--${weatherTheme(current.weatherCode, current.isDay)}`} aria-labelledby="hero-city">
        <div className="hero__top">
          <div>
            <h2 id="hero-city" className="hero__city">
              {place.name}
            </h2>
            {placeLine && <p className="hero__place">{placeLine}</p>}
            <p className="hero__date">
              {formatLongDate(current.time)} · {formatHour(current.time)} (horário local{forecast.timezoneAbbreviation ? `, ${forecast.timezoneAbbreviation}` : ''})
            </p>
          </div>
          <button type="button" className="btn btn--glass" onClick={onRefresh} disabled={refreshing} aria-label="Atualizar previsão">
            <svg className={refreshing ? 'spin' : undefined} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{refreshing ? 'Atualizando…' : 'Atualizar'}</span>
          </button>
        </div>

        <div className="hero__main">
          <WeatherIcon icon={condition.icon} isDay={current.isDay} size={112} />
          <div>
            <p className="hero__temp" aria-label={`Temperatura atual: ${Math.round(current.temperature)} graus Celsius`}>
              {formatTemp(current.temperature)}
              <span>C</span>
            </p>
            <p className="hero__condition">{condition.label}</p>
            <p className="hero__range">
              Máx. {formatTemp(today.max)} · Mín. {formatTemp(today.min)}
            </p>
          </div>
        </div>
        <p className="hero__updated">
          Dados atualizados às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (seu horário)
        </p>
      </section>

      <section aria-labelledby="details-title" className="card">
        <h3 id="details-title" className="card__title">
          Condições atuais
        </h3>
        <dl className="details">
          <Detail label="Sensação térmica" value={formatTemp(current.apparentTemperature)} hint={feelsLikeHint(current.temperature, current.apparentTemperature)} />
          <Detail label="Umidade relativa" value={`${Math.round(current.humidity)}%`} />
          <Detail
            label="Vento"
            value={`${Math.round(current.windSpeed)} km/h`}
            hint={`Vindo de ${windDirectionLabel(current.windDirection)} (${Math.round(current.windDirection)}°)`}
          />
          <Detail
            label="Chance de chuva"
            value={precipitationNow == null ? 'Indisponível' : `${precipitationNow}%`}
            hint={precipitationNow == null ? 'Sem dado para esta região' : 'Na hora atual'}
          />
          <Detail label="Precipitação" value={`${current.precipitation.toLocaleString('pt-BR')} mm`} hint="Últimos 15 min" />
          <Detail label="Índice UV máx." value={today.uvIndexMax == null ? 'Indisponível' : String(Math.round(today.uvIndexMax))} hint={today.uvIndexMax == null ? undefined : uvLabel(today.uvIndexMax)} />
          <Detail label="Nascer do sol" value={formatHour(today.sunrise)} />
          <Detail label="Pôr do sol" value={formatHour(today.sunset)} />
        </dl>
      </section>

      <section aria-labelledby="hourly-title" className="card">
        <h3 id="hourly-title" className="card__title">
          Próximas 24 horas
        </h3>
        <ol className="hourly" tabIndex={0} aria-label="Previsão por hora (role horizontalmente)">
          {hourly.map((h, i) => {
            const d = describeWeather(h.weatherCode)
            return (
              <li key={h.time} className="hourly__item">
                <span className="hourly__time">{i === 0 ? 'Agora' : formatHour(h.time)}</span>
                <WeatherIcon icon={d.icon} isDay={h.isDay} size={36} title={d.label} />
                <span className="hourly__temp">{formatTemp(h.temperature)}</span>
                <span className="hourly__rain" title="Probabilidade de precipitação">
                  <Drop /> {h.precipitationProbability == null ? '–' : `${h.precipitationProbability}%`}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="daily-title" className="card">
        <h3 id="daily-title" className="card__title">
          Próximos 7 dias
        </h3>
        <DailyList forecast={forecast} />
      </section>
    </div>
  )
}

function DailyList({ forecast }: { forecast: Forecast }) {
  const { daily, current } = forecast
  const lo = Math.min(...daily.map((d) => d.min))
  const hi = Math.max(...daily.map((d) => d.max))
  const span = Math.max(hi - lo, 1)
  return (
    <ul className="daily">
      {daily.map((d) => {
        const desc = describeWeather(d.weatherCode)
        return (
          <li key={d.date} className="daily__row">
            <span className="daily__day">
              <strong>{formatDayLabel(d.date, current.time)}</strong>
              <small>{formatDayMonth(d.date)}</small>
            </span>
            <span className="daily__cond">
              <WeatherIcon icon={desc.icon} size={34} />
              <span className="daily__label">{desc.label}</span>
            </span>
            <span className="daily__rain" title="Probabilidade máxima de precipitação">
              <Drop /> {d.precipitationProbability == null ? '–' : `${d.precipitationProbability}%`}
            </span>
            <span className="daily__temps">
              <span className="daily__min" aria-label={`Mínima ${Math.round(d.min)} graus`}>
                {formatTemp(d.min)}
              </span>
              <span className="daily__bar" aria-hidden="true">
                <span style={{ left: `${((d.min - lo) / span) * 100}%`, right: `${((hi - d.max) / span) * 100}%` }} />
              </span>
              <span className="daily__max" aria-label={`Máxima ${Math.round(d.max)} graus`}>
                {formatTemp(d.max)}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Detail({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="details__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <p className="details__hint">{hint}</p>}
    </div>
  )
}

function Drop() {
  return (
    <svg viewBox="0 0 12 16" width="9" height="12" aria-hidden="true">
      <path d="M6 0C6 0 0 7 0 10.5a6 6 0 0 0 12 0C12 7 6 0 6 0z" fill="currentColor" />
    </svg>
  )
}

function feelsLikeHint(temp: number, feels: number): string {
  const diff = Math.round(feels - temp)
  if (Math.abs(diff) < 1) return 'Igual à temperatura real'
  return diff > 0 ? `${diff}° acima da real` : `${Math.abs(diff)}° abaixo da real`
}
