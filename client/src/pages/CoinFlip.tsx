import './CoinFlip.css'

interface CoinFlipProps {
  rotation: number
  flipping: boolean
  onFlipEnd: () => void
}

export default function CoinFlip({ rotation, flipping, onFlipEnd }: CoinFlipProps) {
  return (
    <div className="coin" role="img" aria-label="Moneda: cara, pagas tú todo; cruz, pagan los demás">
      <div
        className={`coin__inner${flipping ? ' is-flipping' : ''}`}
        style={{ transform: `rotateY(${rotation}deg)` }}
        onTransitionEnd={onFlipEnd}
      >
        <div className="coin__face coin__face--front">
          <span className="coin__side">Cara</span>
          <strong>Pagas tú</strong>
        </div>
        <div className="coin__face coin__face--back">
          <span className="coin__side">Cruz</span>
          <strong>Pagan los demás</strong>
        </div>
      </div>
    </div>
  )
}
