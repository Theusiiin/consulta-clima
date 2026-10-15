import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { describeError, searchCities, type City } from '../lib/api'
import { formatPlace } from '../lib/format'

interface Props {
  onSelect: (city: City) => void
  onUseLocation: () => void
  locating: boolean
  geolocationAvailable: boolean
}

type Status = 'idle' | 'loading' | 'done' | 'error'

const DEBOUNCE_MS = 350

function flagEmoji(countryCode?: string) {
  if (!countryCode || countryCode.length !== 2) return ''
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

export function SearchBox({ onSelect, onUseLocation, locating, geolocationAvailable }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<City[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const runSearch = async (text: string) => {
    abortRef.current?.abort()
    const term = text.trim()
    if (term.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setOpen(true)
    try {
      const cities = await searchCities(term, controller.signal)
      if (controller.signal.aborted) return
      setResults(cities)
      setActive(cities.length ? 0 : -1)
      setStatus('done')
    } catch (err) {
      if (controller.signal.aborted) return
      setResults([])
      setError(describeError(err))
      setStatus('error')
    }
  }

  useEffect(
    () => () => {
      abortRef.current?.abort()
      window.clearTimeout(timerRef.current)
    },
    [],
  )

  const onChange = (text: string) => {
    setQuery(text)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => runSearch(text), DEBOUNCE_MS)
  }

  const choose = (city: City) => {
    onSelect(city)
    setQuery('')
    setResults([])
    setStatus('idle')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (open && active >= 0 && results[active] && status === 'done') return choose(results[active])
    window.clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setError('Digite pelo menos 2 letras do nome da cidade.')
      setStatus('error')
      setOpen(true)
      return
    }
    runSearch(query)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showPanel = open && status !== 'idle'

  return (
    <div className="search">
      <form role="search" className="search__form" onSubmit={onSubmit}>
        <label htmlFor="city-search" className="sr-only">
          Pesquisar cidade
        </label>
        <svg className="search__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="city-search"
          type="search"
          placeholder="Pesquisar cidade… (ex.: Recife, Lisboa)"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? `${listId}-${active}` : undefined}
        />
        <button type="submit" className="btn btn--primary">
          Buscar
        </button>
      </form>
      {geolocationAvailable && (
        <button type="button" className="btn btn--link" onClick={onUseLocation} disabled={locating}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {locating ? 'Obtendo localização…' : 'Usar minha localização'}
        </button>
      )}

      <div className={`search__panel${showPanel ? ' is-open' : ''}`} aria-live="polite">
        {showPanel && status === 'loading' && <p className="search__status">Buscando cidades…</p>}
        {showPanel && status === 'error' && (
          <p className="search__status search__status--error" role="alert">
            {error}
          </p>
        )}
        {showPanel && status === 'done' && results.length === 0 && (
          <p className="search__status">Nenhuma cidade encontrada para “{query.trim()}”. Confira a grafia ou tente um nome mais curto.</p>
        )}
        <ul id={listId} role="listbox" aria-label="Cidades encontradas" hidden={!(showPanel && status === 'done' && results.length > 0)}>
          {results.map((city, i) => (
            <li
              key={city.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(city)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search__flag" aria-hidden="true">
                {flagEmoji(city.countryCode)}
              </span>
              <span>
                <strong>{city.name}</strong>
                <small>{formatPlace(city)}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
