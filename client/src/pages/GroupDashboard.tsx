import { useEffect } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchGroupExpenses, type Expense } from '../store/slices/expensesSlice'
import type { Group, GroupMember } from '../store/slices/groupsSlice'
import GroupExpensesChart, { type MemberPaid } from './GroupExpensesChart'
import './GroupDashboard.css'

const formatMoney = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

const SPLIT_LABELS: Record<Expense['splitMode'], string> = {
  equal: 'A partes iguales',
  percentage: 'Por porcentaje',
  roulette: 'Ruleta',
}

interface GroupDashboardProps {
  group: Group
  onBack: () => void
}

export default function GroupDashboard({ group, onBack }: GroupDashboardProps) {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const currentUser = useAppSelector((state) => state.auth.user)
  const currentUserId = currentUser?.id ?? currentUser?._id ?? ''
  const { items, listGroupId, loading, error } = useAppSelector((state) => state.expenses)

  useEffect(() => {
    if (token) void dispatch(fetchGroupExpenses({ token, groupId: group._id }))
  }, [dispatch, token, group._id])

  const expenses = listGroupId === group._id ? items : []
  const members = group.members.filter((m): m is GroupMember => typeof m !== 'string')
  const total = expenses.reduce((acc, expense) => acc + expense.amount, 0)

  const userName = (user: GroupMember | string) => {
    const id = typeof user === 'string' ? user : user._id
    if (id === currentUserId) return 'Tú'
    if (typeof user !== 'string') return user.name
    return members.find((m) => m._id === id)?.name ?? 'Miembro'
  }

  const paidByMember = new Map<string, MemberPaid>()
  for (const member of members) {
    paidByMember.set(member._id, { id: member._id, name: member._id === currentUserId ? `${member.name} (tú)` : member.name, paid: 0 })
  }
  for (const expense of expenses) {
    const payerId = typeof expense.payerId === 'string' ? expense.payerId : expense.payerId._id
    const entry = paidByMember.get(payerId) ?? { id: payerId, name: userName(expense.payerId), paid: 0 }
    entry.paid = Math.round((entry.paid + expense.amount) * 100) / 100
    paidByMember.set(payerId, entry)
  }
  const chartData = [...paidByMember.values()].sort((a, b) => b.paid - a.paid || a.name.localeCompare(b.name))

  return (
    <section className="dashboard-content" aria-labelledby="group-dashboard-title">
      <button type="button" className="group-dashboard__back" onClick={onBack}>
        <Icon name="arrow" size={16} /> Mis grupos
      </button>

      <header className="group-dashboard__header">
        <span className="group-dashboard__icon" aria-hidden="true"><Icon name="users" size={24} /></span>
        <div className="group-dashboard__heading">
          <h1 id="group-dashboard-title">{group.name}</h1>
          <p>{group.description || 'Sin descripción'}</p>
        </div>
        {group.inviteCode && (
          <span className="group-dashboard__code" title="Código de invitación">{group.inviteCode}</span>
        )}
      </header>

      <dl className="group-dashboard__stats">
        <div>
          <dt>Total gastado</dt>
          <dd>{formatMoney(total)}</dd>
        </div>
        <div>
          <dt>Gastos</dt>
          <dd>{expenses.length}</dd>
        </div>
        <div>
          <dt>Miembros</dt>
          <dd>{group.members.length}</dd>
        </div>
      </dl>

      {expenses.length > 0 && <GroupExpensesChart data={chartData} formatMoney={formatMoney} />}

      <h2 className="group-dashboard__subtitle">Gastos del grupo</h2>

      {loading && expenses.length === 0 ? (
        <p className="group-dashboard__message" role="status">Cargando gastos...</p>
      ) : error ? (
        <p className="group-dashboard__message group-dashboard__message--error" role="alert">{error}</p>
      ) : expenses.length === 0 ? (
        <div className="group-dashboard__empty">
          <span className="group-dashboard__empty-icon" aria-hidden="true"><Icon name="receipt" size={26} /></span>
          <h3>Todavía no hay gastos</h3>
          <p>Los gastos que se registren en este grupo aparecerán aquí.</p>
        </div>
      ) : (
        <ul className="group-expenses">
          {expenses.map((expense) => (
            <li key={expense._id} className="group-expense">
              <span className="group-expense__icon" aria-hidden="true"><Icon name="receipt" size={18} /></span>
              <div className="group-expense__info">
                <p className="group-expense__concept">{expense.concept}</p>
                <p className="group-expense__meta">
                  Pagado por <strong>{userName(expense.payerId)}</strong> · {formatDate(expense.createdAt)}
                </p>
                <p className="group-expense__split">
                  {SPLIT_LABELS[expense.splitMode] ?? expense.splitMode} · {expense.participants.length}{' '}
                  {expense.participants.length === 1 ? 'participante' : 'participantes'}
                </p>
              </div>
              <span className="group-expense__amount">{formatMoney(expense.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
