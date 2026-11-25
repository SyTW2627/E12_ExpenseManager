import type { RouletteCandidate } from '../utils/roulette'
import './RouletteWheel.css'

interface RouletteWheelProps {
  candidates: RouletteCandidate[]
  rotation: number
  spinning: boolean
  onSpinEnd: () => void
}

const SEGMENT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const DARK_TEXT_COLORS = new Set(['#eda100'])
const SIZE = 240
const RADIUS = 112
const CENTER = SIZE / 2

const pointAt = (angle: number, radius: number) => {
  const radians = (angle * Math.PI) / 180
  return { x: CENTER + radius * Math.sin(radians), y: CENTER - radius * Math.cos(radians) }
}

const shortName = (name: string) => {
  const first = name.trim().split(/\s+/)[0] ?? name
  return first.length > 10 ? `${first.slice(0, 9)}…` : first
}

export default function RouletteWheel({ candidates, rotation, spinning, onSpinEnd }: RouletteWheelProps) {
  const count = candidates.length
  const segment = count > 0 ? 360 / count : 360

  return (
    <div className="roulette">
      <span className="roulette__pointer" aria-hidden="true" />
      <svg
        className={`roulette__wheel${spinning ? ' is-spinning' : ''}`}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={onSpinEnd}
        role="img"
        aria-label={`Ruleta con ${count} ${count === 1 ? 'participante' : 'participantes'}: ${candidates.map((c) => c.name).join(', ')}`}
      >
        {count === 0 && <circle cx={CENTER} cy={CENTER} r={RADIUS} className="roulette__empty" />}
        {count === 1 && candidates[0] && (
          <g>
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={SEGMENT_COLORS[0]} />
            <text x={CENTER} y={CENTER - RADIUS * 0.55} className="roulette__label" fill="#fff">
              {shortName(candidates[0].name)}
            </text>
          </g>
        )}
        {count > 1 &&
          candidates.map((candidate, index) => {
            const start = index * segment
            const end = start + segment
            const from = pointAt(start, RADIUS)
            const to = pointAt(end, RADIUS)
            const largeArc = segment > 180 ? 1 : 0
            const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length] ?? SEGMENT_COLORS[0]!
            const middle = start + segment / 2
            const label = pointAt(middle, RADIUS * 0.64)
            return (
              <g key={candidate.id}>
                <path
                  d={`M ${CENTER} ${CENTER} L ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y} Z`}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={label.x}
                  y={label.y}
                  className="roulette__label"
                  fill={DARK_TEXT_COLORS.has(color) ? '#1a2340' : '#fff'}
                  transform={`rotate(${middle > 180 ? middle + 90 : middle - 90} ${label.x} ${label.y})`}
                >
                  {shortName(candidate.name)}
                </text>
              </g>
            )
          })}
        <circle cx={CENTER} cy={CENTER} r={18} className="roulette__hub" />
      </svg>
    </div>
  )
}
