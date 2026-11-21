import { Icon } from './AuthVisual'
import type { GroupBalances as GroupBalancesData } from '../store/slices/expensesSlice'
import type { GroupMember } from '../store/slices/groupsSlice'

interface GroupBalancesProps {
  data: GroupBalancesData | null
  loading: boolean
  error: string | null
  currentUserId: string
  formatMoney: (value: number) => string
}

export default function GroupBalances({ data, loading, error, currentUserId, formatMoney }: GroupBalancesProps) {
  const displayName = (user: GroupMember) => (user._id === currentUserId ? 'Tú' : user.name ?? 'Miembro')

  if (!data) {
    if (loading) return <p className="group-dashboard__message" role="status">Calculando saldos...</p>
    if (error) return <p className="group-dashboard__message group-dashboard__message--error" role="alert">{error}</p>
    return null
  }

  const myBalance = data.balances.find((b) => b.user._id === currentUserId)?.balance ?? 0
  const balances = [...data.balances].sort((a, b) => a.balance - b.balance)
  const transactions = [...data.transactions].sort((a, b) => {
    const mine = (t: typeof a) => (t.from._id === currentUserId || t.to._id === currentUserId ? 0 : 1)
    return mine(a) - mine(b) || b.amount - a.amount
  })

  const summary =
    myBalance < 0
      ? { tone: 'debt', label: 'Debes', value: formatMoney(-myBalance) }
      : myBalance > 0
        ? { tone: 'credit', label: 'Te deben', value: formatMoney(myBalance) }
        : { tone: 'even', label: 'Estás al día', value: formatMoney(0) }

  return (
    <section className="group-balances" aria-labelledby="group-balances-title">
      <header className="group-balances__header">
        <div>
          <h2 id="group-balances-title">Lo que debe cada uno</h2>
          <p>Saldos calculados con los gastos y los pagos ya confirmados.</p>
        </div>
        <div className={`group-balances__summary group-balances__summary--${summary.tone}`}>
          <span>{summary.label}</span>
          <strong>{summary.value}</strong>
        </div>
      </header>

      {error && <p className="group-balances__error" role="alert">{error}</p>}

      <div className="group-balances__grid">
        <div>
          <h3 className="group-balances__subtitle">Saldo de cada miembro</h3>
          <ul className="group-balances__list">
            {balances.map(({ user, balance }) => {
              const tone = balance < 0 ? 'debt' : balance > 0 ? 'credit' : 'even'
              const label = balance < 0 ? 'Debe' : balance > 0 ? 'Le deben' : 'Al día'
              return (
                <li key={user._id} className={`group-balance${user._id === currentUserId ? ' is-me' : ''}`}>
                  <span className="group-balance__name">{displayName(user)}</span>
                  <span className={`group-balance__status group-balance__status--${tone}`}>{label}</span>
                  <span className={`group-balance__amount group-balance__amount--${tone}`}>
                    {balance < 0 ? '−' : balance > 0 ? '+' : ''}
                    {formatMoney(Math.abs(balance))}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="group-balances__subtitle">Pagos para saldar las cuentas</h3>
          {transactions.length === 0 ? (
            <p className="group-balances__settled">
              <Icon name="check" size={16} /> No hay deudas pendientes en este grupo.
            </p>
          ) : (
            <ul className="group-balances__list">
              {transactions.map((t) => {
                const involvesMe = t.from._id === currentUserId || t.to._id === currentUserId
                const sentence =
                  t.from._id === currentUserId
                    ? <>Tú debes pagar a <strong>{t.to.name}</strong></>
                    : t.to._id === currentUserId
                      ? <><strong>{t.from.name}</strong> te debe pagar</>
                      : <><strong>{t.from.name}</strong> debe pagar a <strong>{t.to.name}</strong></>
                return (
                  <li key={`${t.from._id}-${t.to._id}`} className={`group-transfer${involvesMe ? ' is-me' : ''}`}>
                    <span className="group-transfer__text">{sentence}</span>
                    <span className="group-transfer__amount">{formatMoney(t.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
