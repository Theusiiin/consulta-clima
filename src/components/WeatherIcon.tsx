import type { ReactNode } from 'react'
import type { IconName } from '../lib/weatherCodes'

interface Props {
  icon: IconName
  isDay?: boolean
  size?: number
  /** texto alternativo; omitido quando a condição já aparece em texto ao lado */
  title?: string
}

const SUN = '#fbbf24'
const MOON = '#e2e8f0'
const CLOUD = '#cbd5e1'
const DARK_CLOUD = '#94a3b8'
const RAIN = '#38bdf8'
const SNOW = '#f1f5f9'
const BOLT = '#facc15'

function Sun({ cx = 32, cy = 32, r = 11 }: { cx?: number; cy?: number; r?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * (r + 4)}
        y1={cy + Math.sin(a) * (r + 4)}
        x2={cx + Math.cos(a) * (r + 9)}
        y2={cy + Math.sin(a) * (r + 9)}
        stroke={SUN}
        strokeWidth="3"
        strokeLinecap="round"
      />
    )
  })
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  )
}

function Moon({ cx = 32, cy = 30 }: { cx?: number; cy?: number }) {
  return <path d={`M${cx + 6} ${cy - 14} a14 14 0 1 0 10 22 a11 11 0 1 1 -10 -22z`} fill={MOON} />
}

function Cloud({ dark = false, y = 0 }: { dark?: boolean; y?: number }) {
  return (
    <path
      transform={`translate(0 ${y})`}
      d="M20 50h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3 9 9 0 0 0 1 23z"
      fill={dark ? DARK_CLOUD : CLOUD}
    />
  )
}

function Drops({ count = 3, color = RAIN, long = true }: { count?: number; color?: string; long?: boolean }) {
  const xs = count === 2 ? [26, 38] : [22, 32, 42]
  return (
    <g stroke={color} strokeWidth="3" strokeLinecap="round">
      {xs.map((x) => (
        <line key={x} x1={x} y1={52} x2={x - 3} y2={long ? 61 : 57} />
      ))}
    </g>
  )
}

function Flakes() {
  return (
    <g fill={SNOW} stroke={DARK_CLOUD} strokeWidth="0.8">
      {[22, 32, 42].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 60 : 56} r="3" />
      ))}
    </g>
  )
}

export function WeatherIcon({ icon, isDay = true, size = 48, title }: Props) {
  const celestial = isDay ? <Sun cx={24} cy={24} r={9} /> : <Moon cx={20} cy={22} />
  let content: ReactNode
  switch (icon) {
    case 'clear':
      content = isDay ? <Sun /> : <Moon cx={26} cy={30} />
      break
    case 'mostly-clear':
      content = (
        <>
          {isDay ? <Sun cx={28} cy={28} /> : <Moon cx={24} cy={26} />}
          <path d="M34 54h16a7 7 0 0 0 0-14 10 10 0 0 0-18-1 6.5 6.5 0 0 0 2 15z" fill={CLOUD} />
        </>
      )
      break
    case 'partly-cloudy':
      content = (
        <>
          {celestial}
          <Cloud />
        </>
      )
      break
    case 'cloudy':
      content = (
        <>
          <path d="M30 40h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 7 7 0 0 0 1 18z" fill={DARK_CLOUD} />
          <Cloud y={4} />
        </>
      )
      break
    case 'fog':
      content = (
        <>
          <Cloud y={-6} />
          <g stroke={CLOUD} strokeWidth="3" strokeLinecap="round">
            <line x1="14" y1="52" x2="50" y2="52" />
            <line x1="18" y1="59" x2="46" y2="59" />
          </g>
        </>
      )
      break
    case 'drizzle':
      content = (
        <>
          <Cloud y={-4} />
          <Drops count={2} long={false} />
        </>
      )
      break
    case 'rain':
      content = (
        <>
          <Cloud dark y={-4} />
          <Drops />
        </>
      )
      break
    case 'freezing-rain':
      content = (
        <>
          <Cloud dark y={-4} />
          <Drops color={SNOW} />
        </>
      )
      break
    case 'showers':
      content = (
        <>
          {celestial}
          <Cloud dark y={-4} />
          <Drops count={2} />
        </>
      )
      break
    case 'snow':
      content = (
        <>
          <Cloud y={-4} />
          <Flakes />
        </>
      )
      break
    case 'thunderstorm':
      content = (
        <>
          <Cloud dark y={-6} />
          <path d="M34 44l-8 12h7l-4 9 11-14h-7l4-7z" fill={BOLT} />
        </>
      )
      break
  }
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="weather-icon"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {content}
    </svg>
  )
}
