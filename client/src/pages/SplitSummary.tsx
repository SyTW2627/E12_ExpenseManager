import './SplitSummary.css'

export interface SummarySlice {
  id: string
  name: string
  share: number
  color: string
}

interface SplitSummaryProps {
  mode: 'equal' | 'percentage'
  slices: SummarySlice[]
  amount: number
  payerId: string
  payerName: string
  percentageTotal: number
  formatMoney: (value: number) => string
}

const formatPercent = (value: number) =>
  `${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`

export default function SplitSummary({
  mode,
  slices,
  amount,
  payerId,
  payerName,
  percentageTotal,
  formatMoney,
}: SplitSummaryProps) {
  const hasAmount = amount > 0
  const amountFor = (share: number) => (amount * share) / 100
  const totalShare = slices.reduce((acc, slice) => acc + slice.share, 0)
  // Si los porcentajes pasan de 100 se dibujan escalados para que el círculo no se desborde
  const scale = totalShare > 100 ? 100 / totalShare : 1

  const visible = slices.filter((slice) => slice.share > 0)
  const segments = visible.map((slice, index) => ({
    ...slice,
    length: slice.share * scale,
    offset: visible.slice(0, index).reduce((acc, previous) => acc + previous.share * scale, 0),
  }))

  const payerShare = slices.find((slice) => slice.id === payerId)?.share ?? 0
  const owedToPayer = hasAmount ? amount - amountFor(payerShare) : 0
  const difference = Math.round((100 - percentageTotal) * 100) / 100

  let message: string
  if (slices.length === 0) {
    message = 'Selecciona al menos un participante para ver el reparto.'
  } else if (mode === 'equal') {
    const share = slices[0]?.share ?? 0
    message = hasAmount
      ? `Cada persona paga ${formatMoney(amountFor(share))} (${formatPercent(share)} del total).`
      : `Cada persona paga el ${formatPercent(share)} del importe.`
  } else if (Math.abs(difference) <= 0.1) {
    message = 'Los porcentajes suman el 100 %. El reparto está listo.'
  } else if (difference > 0) {
    message = `Faltan ${formatPercent(difference)} por repartir.`
  } else {
    message = `Te has pasado un ${formatPercent(-difference)}: los porcentajes no pueden sumar más del 100 %.`
  }

  return (
    <div className="split-summary">
      <div className="split-summary__chart">
        <svg viewBox="0 0 42 42" role="img" aria-label="Gráfico con la parte que paga cada participante">
          <circle className="split-summary__track" cx="21" cy="21" r="15.915" />
          {segments.map((segment) => (
            <circle
              key={segment.id}
              className="split-summary__segment"
              cx="21"
              cy="21"
              r="15.915"
              stroke={segment.color}
              strokeDasharray={`${segment.length} ${100 - segment.length}`}
              strokeDashoffset={25 - segment.offset}
            />
          ))}
        </svg>
        <div className="split-summary__center">
          <strong>{hasAmount ? formatMoney(amount) : '—'}</strong>
          <span>{hasAmount ? 'en total' : 'sin importe'}</span>
        </div>
      </div>

      <div className="split-summary__details">
        <p className={`split-summary__message${mode === 'percentage' && Math.abs(difference) > 0.1 ? ' is-warning' : ''}`}>
          {message}
        </p>

        {slices.length > 0 && (
          <ul className="split-summary__legend">
            {slices.map((slice) => (
              <li key={slice.id}>
                <span className="split-summary__dot" style={{ background: slice.color }} aria-hidden="true" />
                <span className="split-summary__name">{slice.name}</span>
                <span className="split-summary__percent">{formatPercent(slice.share)}</span>
                <span className="split-summary__amount">{hasAmount ? formatMoney(amountFor(slice.share)) : '—'}</span>
              </li>
            ))}
          </ul>
        )}

        {hasAmount && slices.length > 0 && payerName && (
          <p className="split-summary__payer">
            <strong>{payerName}</strong> adelanta el pago
            {owedToPayer > 0.004 ? <> y le deberán <strong>{formatMoney(owedToPayer)}</strong>.</> : '.'}
          </p>
        )}
      </div>
    </div>
  )
}
