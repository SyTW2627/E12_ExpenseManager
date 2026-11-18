import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchMyGroups, type GroupMember } from '../store/slices/groupsSlice'
import { clearCreateStatus, createExpense, type SplitMode } from '../store/slices/expensesSlice'
import './Expenses.css'

// Mismo redondeo que el backend para el reparto equitativo
const equalShare = (count: number) => Math.round((100 / count) * 100) / 100

const formatMoney = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

export default function Expenses() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const currentUser = useAppSelector((state) => state.auth.user)
  const currentUserId = currentUser?.id ?? currentUser?._id ?? ''
  const { items: groups, loading: loadingGroups, error: groupsError } = useAppSelector((state) => state.groups)
  const { creating, createError, createMessage } = useAppSelector((state) => state.expenses)

  // Los valores vacíos/null significan "usar el valor por defecto", que se calcula en cada render:
  // primer grupo, paga el usuario actual y participan todos los miembros.
  const [chosenGroupId, setChosenGroupId] = useState('')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [chosenPayerId, setChosenPayerId] = useState('')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [chosenParticipants, setChosenParticipants] = useState<string[] | null>(null)
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [localError, setLocalError] = useState('')

  const needsGroups = groups.length === 0

  // Cargar los grupos si aún no están en el store (p. ej. al entrar directamente en /gastos)
  useEffect(() => {
    if (token && needsGroups) void dispatch(fetchMyGroups(token))
  }, [dispatch, token, needsGroups])

  // Limpiar los mensajes al salir de la página
  useEffect(() => () => { dispatch(clearCreateStatus()) }, [dispatch])

  const group = groups.find((g) => g._id === chosenGroupId) ?? groups[0]
  const groupId = group?._id ?? ''
  const members = useMemo<GroupMember[]>(
    () => (group?.members ?? []).filter((m): m is GroupMember => typeof m !== 'string'),
    [group]
  )
  const memberIds = members.map((m) => m._id)
  const selected = chosenParticipants ?? memberIds
  const payerId = chosenPayerId || (memberIds.includes(currentUserId) ? currentUserId : memberIds[0] ?? '')

  const resetFeedback = () => {
    if (localError) setLocalError('')
    if (createError || createMessage) dispatch(clearCreateStatus())
  }

  // Al cambiar de grupo se vuelve a los valores por defecto
  const selectGroup = (id: string) => {
    setChosenGroupId(id)
    setChosenPayerId('')
    setChosenParticipants(null)
    setPercentages({})
    resetFeedback()
  }

  const toggleParticipant = (id: string) => {
    setChosenParticipants(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    resetFeedback()
  }

  const amountValue = Number(amount.replace(',', '.'))
  const percentageTotal = selected.reduce((acc, id) => acc + (Number(percentages[id]) || 0), 0)
  const shareFor = (id: string) =>
    splitMode === 'equal' ? equalShare(selected.length) : Number(percentages[id]) || 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return

    if (!group) return setLocalError('Elige un grupo.')
    if (!concept.trim()) return setLocalError('Escribe un concepto para el gasto.')
    if (!(amountValue > 0)) return setLocalError('El importe debe ser mayor que 0.')
    if (selected.length === 0) return setLocalError('Selecciona al menos un participante.')
    if (splitMode === 'percentage' && Math.abs(percentageTotal - 100) > 0.1) {
      return setLocalError(`Los porcentajes deben sumar 100% (ahora suman ${percentageTotal}%).`)
    }

    const result = await dispatch(createExpense({
      token,
      expense: {
        groupId,
        concept: concept.trim(),
        amount: Math.round(amountValue * 100) / 100,
        payerId,
        splitMode,
        participants: selected.map((userId) => ({ userId, share: shareFor(userId) })),
      },
    }))

    if (createExpense.fulfilled.match(result)) {
      setConcept('')
      setAmount('')
      setPercentages({})
    }
  }

  const activeError = localError || createError

  return (
    <section className="dashboard-content" aria-labelledby="expenses-title">
      <h1 id="expenses-title">Gastos</h1>

      {!token ? (
        <p className="expenses-message" role="alert">Inicia sesión para registrar gastos.</p>
      ) : loadingGroups && groups.length === 0 ? (
        <p className="expenses-message" role="status">Cargando tus grupos...</p>
      ) : groupsError && groups.length === 0 ? (
        <p className="expenses-message expenses-message--error" role="alert">{groupsError}</p>
      ) : groups.length === 0 ? (
        <div className="expenses-empty">
          <span className="expenses-empty__icon" aria-hidden="true"><Icon name="receipt" size={28} /></span>
          <h2>Aún no perteneces a ningún grupo</h2>
          <p>Únete a un grupo desde "Mis grupos" para empezar a registrar gastos.</p>
        </div>
      ) : (
        <form className="expense-form" onSubmit={handleSubmit} noValidate>
          <header className="expense-form__header">
            <span className="expense-form__icon" aria-hidden="true"><Icon name="receipt" size={22} /></span>
            <div>
              <h2>Nuevo gasto</h2>
              <p>Registra lo que has pagado y cómo se reparte.</p>
            </div>
          </header>

          <div className="expense-form__grid">
            <div className="expense-field">
              <label htmlFor="expense-group">Grupo</label>
              <select id="expense-group" value={groupId} onChange={(e) => selectGroup(e.target.value)} disabled={creating}>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>

            <div className="expense-field">
              <label htmlFor="expense-payer">Pagado por</label>
              <select id="expense-payer" value={payerId} onChange={(e) => { setChosenPayerId(e.target.value); resetFeedback() }} disabled={creating}>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>{m._id === currentUserId ? `${m.name} (tú)` : m.name}</option>
                ))}
              </select>
            </div>

            <div className="expense-field expense-field--wide">
              <label htmlFor="expense-concept">Concepto</label>
              <input
                id="expense-concept"
                type="text"
                placeholder="Ej. Compra del supermercado"
                maxLength={100}
                value={concept}
                onChange={(e) => { setConcept(e.target.value); resetFeedback() }}
                disabled={creating}
              />
            </div>

            <div className="expense-field">
              <label htmlFor="expense-amount">Importe</label>
              <div className="expense-amount">
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); resetFeedback() }}
                  disabled={creating}
                />
                <span aria-hidden="true">€</span>
              </div>
            </div>

            <fieldset className="expense-field expense-split">
              <legend>Reparto</legend>
              <div className="expense-split__options">
                {([['equal', 'A partes iguales'], ['percentage', 'Por porcentaje']] as const).map(([mode, label]) => (
                  <label key={mode} className={`expense-split__option${splitMode === mode ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="split-mode"
                      value={mode}
                      checked={splitMode === mode}
                      onChange={() => { setSplitMode(mode); resetFeedback() }}
                      disabled={creating}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="expense-participants">
            <legend>
              Participantes
              {splitMode === 'percentage' && selected.length > 0 && (
                <span className={`expense-participants__total${Math.abs(percentageTotal - 100) <= 0.1 ? ' is-ok' : ''}`}>
                  Total: {percentageTotal}%
                </span>
              )}
            </legend>

            <ul>
              {members.map((m) => {
                const checked = selected.includes(m._id)
                const share = checked ? shareFor(m._id) : 0
                return (
                  <li key={m._id} className={`expense-participant${checked ? ' is-checked' : ''}`}>
                    <label className="expense-participant__name">
                      <input type="checkbox" checked={checked} onChange={() => toggleParticipant(m._id)} disabled={creating} />
                      {m._id === currentUserId ? `${m.name} (tú)` : m.name}
                    </label>

                    {checked && splitMode === 'percentage' && (
                      <div className="expense-participant__percent">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`Porcentaje de ${m.name}`}
                          value={percentages[m._id] ?? ''}
                          onChange={(e) => { setPercentages((p) => ({ ...p, [m._id]: e.target.value })); resetFeedback() }}
                          disabled={creating}
                        />
                        <span aria-hidden="true">%</span>
                      </div>
                    )}

                    <span className="expense-participant__amount">
                      {checked && amountValue > 0 ? formatMoney((amountValue * share) / 100) : '—'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          {activeError && <p className="expense-feedback expense-feedback--error" role="alert">{activeError}</p>}
          {createMessage && <p className="expense-feedback expense-feedback--success" role="status">{createMessage}</p>}

          <button className="expense-submit" type="submit" disabled={creating}>
            {creating ? 'Guardando...' : 'Añadir gasto'}
          </button>
        </form>
      )}
    </section>
  )
}
