import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchMyGroups, type GroupMember } from '../store/slices/groupsSlice'
import { clearCreateStatus, createExpense, type SplitMode } from '../store/slices/expensesSlice'
import RouletteWheel from './RouletteWheel'
import { rotationToLand, type RouletteCandidate } from '../utils/roulette'
import CoinFlip from './CoinFlip'
import SplitSummary from './SplitSummary'
import { coinRotationToLand, type AllOrNothingResult } from '../utils/allOrNothing'
import './Expenses.css'

interface CoinToss {
  result: AllOrNothingResult
  amount: number
  othersCount: number
  flipping: boolean
}

interface RouletteSpin {
  candidates: RouletteCandidate[]
  winner: RouletteCandidate
  amount: number
  spinning: boolean
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Mismo redondeo que el backend para el reparto equitativo
const equalShare = (count: number) => Math.round((100 / count) * 100) / 100

const SHARE_COLORS = ['#7661d7', '#1baf7a', '#eb6834', '#2a78d6', '#eda100', '#e87ba4', '#008300', '#e34948']

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
  const [rouletteRotation, setRouletteRotation] = useState(0)
  const [spin, setSpin] = useState<RouletteSpin | null>(null)
  const [coinRotation, setCoinRotation] = useState(0)
  const [toss, setToss] = useState<CoinToss | null>(null)

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
  const isAllOrNothing = splitMode === 'allOrNothing'
  const payerId = isAllOrNothing
    ? currentUserId
    : chosenPayerId || (memberIds.includes(currentUserId) ? currentUserId : memberIds[0] ?? '')

  const resetFeedback = () => {
    if (localError) setLocalError('')
    if (createError || createMessage) dispatch(clearCreateStatus())
    if (spin && !spin.spinning) setSpin(null)
    if (toss && !toss.flipping) setToss(null)
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
    splitMode === 'equal'
      ? equalShare(selected.length)
      : splitMode === 'percentage'
        ? Number(percentages[id]) || 0
        : 0

  const memberColor = (id: string) => SHARE_COLORS[Math.max(memberIds.indexOf(id), 0) % SHARE_COLORS.length]!
  const displayName = (m: GroupMember) => (m._id === currentUserId ? `${m.name} (tú)` : m.name)
  const payer = members.find((m) => m._id === payerId)
  const summarySlices = members
    .filter((m) => selected.includes(m._id))
    .map((m) => ({ id: m._id, name: displayName(m), share: shareFor(m._id), color: memberColor(m._id) }))

  const liveCandidates: RouletteCandidate[] = members
    .filter((m) => selected.includes(m._id))
    .map((m) => ({ id: m._id, name: m._id === currentUserId ? `${m.name} (tú)` : m.name }))
  const wheelCandidates = spin?.candidates ?? liveCandidates

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return

    if (!group) return setLocalError('Elige un grupo.')
    if (!concept.trim()) return setLocalError('Escribe un concepto para el gasto.')
    if (!(amountValue > 0)) return setLocalError('El importe debe ser mayor que 0.')
    if (isAllOrNothing && !memberIds.includes(currentUserId)) {
      return setLocalError('Solo puedes jugar a Todo o nada en un grupo del que formas parte.')
    }
    if (isAllOrNothing && !selected.some((id) => id !== currentUserId)) {
      return setLocalError('Elige al menos a otra persona además de ti para jugar a Todo o nada.')
    }
    if (!isAllOrNothing && selected.length === 0) return setLocalError('Selecciona al menos un participante.')
    if (splitMode === 'roulette' && selected.length < 2) {
      return setLocalError('Selecciona al menos dos participantes para la ruleta.')
    }
    if (splitMode === 'percentage' && Math.abs(percentageTotal - 100) > 0.1) {
      return setLocalError(`Los porcentajes deben sumar 100% (ahora suman ${percentageTotal}%).`)
    }

    const candidates = liveCandidates
    setSpin(null)
    setToss(null)

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

      const loser = result.payload.participants[0]?.userId
      const winnerIndex = candidates.findIndex((c) => c.id === (typeof loser === 'string' ? loser : loser?._id))
      const winner = candidates[winnerIndex]
      if (splitMode === 'roulette' && winner) {
        setRouletteRotation((current) => rotationToLand(current, winnerIndex, candidates.length))
        setSpin({ candidates, winner, amount: result.payload.amount, spinning: !prefersReducedMotion() })
      }

      const coinResult = result.payload.allOrNothingResult
      if (isAllOrNothing && coinResult) {
        setCoinRotation((current) => coinRotationToLand(current, coinResult))
        setToss({
          result: coinResult,
          amount: result.payload.amount,
          othersCount: result.payload.participants.length,
          flipping: !prefersReducedMotion(),
        })
      }
    }
  }

  const finishSpin = () => setSpin((current) => (current ? { ...current, spinning: false } : current))
  const finishFlip = () => setToss((current) => (current ? { ...current, flipping: false } : current))

  const activeError = localError || createError
  const isSpinning = (spin?.spinning ?? false) || (toss?.flipping ?? false)

  return (
    <section className="dashboard-content expenses-page" aria-labelledby="expenses-title">
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
        <form className="expense-layout" onSubmit={handleSubmit} noValidate>
          <section className="expense-card expense-details" aria-labelledby="expense-details-title">
            <header className="expense-card__header">
              <span className="expense-card__icon" aria-hidden="true"><Icon name="receipt" size={22} /></span>
              <div>
                <h2 id="expense-details-title">Nuevo gasto</h2>
                <p>Registra lo que has pagado y cómo se reparte.</p>
              </div>
            </header>

            <div className="expense-field">
              <label htmlFor="expense-group">Grupo</label>
              <select id="expense-group" value={groupId} onChange={(e) => selectGroup(e.target.value)} disabled={creating}>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>

            <div className="expense-field">
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

            <div className="expense-details__row">
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

              <div className="expense-field">
                <label htmlFor="expense-payer">Pagado por</label>
                <select id="expense-payer" value={payerId} onChange={(e) => { setChosenPayerId(e.target.value); resetFeedback() }} disabled={creating || isAllOrNothing}>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>{m._id === currentUserId ? `${m.name} (tú)` : m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="expense-field expense-split">
              <legend>Reparto</legend>
              <div className="expense-split__options">
                {([['equal', 'A partes iguales'], ['percentage', 'Por porcentaje'], ['roulette', 'Ruleta'], ['allOrNothing', 'Todo o nada']] as const).map(([mode, label]) => (
                  <label key={mode} className={`expense-split__option${splitMode === mode ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="split-mode"
                      value={mode}
                      checked={splitMode === mode}
                      onChange={() => { setSplitMode(mode); resetFeedback() }}
                      disabled={creating || isSpinning}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="expense-participants__head">
              <span>Participantes</span>
              {splitMode === 'percentage' && selected.length > 0 && (
                <span className={`expense-participants__total${Math.abs(percentageTotal - 100) <= 0.1 ? ' is-ok' : ''}`}>
                  Total: {percentageTotal}%
                </span>
              )}
            </div>
            <fieldset className="expense-participants">
              <legend className="expense-sr-only">Participantes</legend>
              <ul>
                {members.map((m) => {
                  const locked = isAllOrNothing && m._id === currentUserId
                  const checked = locked || selected.includes(m._id)
                  const share = checked ? shareFor(m._id) : 0
                  const showsShare = checked && (splitMode === 'equal' || splitMode === 'percentage')
                  return (
                    <li key={m._id} className={`expense-participant${checked ? ' is-checked' : ''}`}>
                      <label className="expense-participant__name">
                        <input type="checkbox" checked={checked} onChange={() => toggleParticipant(m._id)} disabled={creating || locked} />
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
                        {checked && (splitMode === 'roulette' || isAllOrNothing)
                          ? '¿?'
                          : checked && amountValue > 0
                            ? formatMoney((amountValue * share) / 100)
                            : '—'}
                      </span>

                      {showsShare && (
                        <span className="expense-participant__bar" aria-hidden="true">
                          <span style={{ width: `${Math.min(share, 100)}%`, background: memberColor(m._id) }} />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <div className="expense-actions">
              {activeError && <p className="expense-feedback expense-feedback--error" role="alert">{activeError}</p>}
              {createMessage && !isSpinning && (
                <p className="expense-feedback expense-feedback--success" role="status">{createMessage}</p>
              )}

              <button className="expense-submit" type="submit" disabled={creating || isSpinning}>
                {creating
                  ? 'Guardando...'
                  : toss?.flipping
                    ? 'Lanzando la moneda...'
                    : isSpinning
                      ? 'Girando la ruleta...'
                      : splitMode === 'roulette'
                        ? 'Girar la ruleta y añadir gasto'
                        : isAllOrNothing
                          ? 'Lanzar la moneda y añadir gasto'
                          : 'Añadir gasto'}
              </button>
            </div>
          </section>

          <section className="expense-card expense-distribution" aria-labelledby="expense-distribution-title">
            <header className="expense-distribution__header">
              <h2 id="expense-distribution-title">Cómo se reparte</h2>
              <p>
                {amountValue > 0 ? formatMoney(amountValue) : 'El importe'} entre {selected.length}{' '}
                {selected.length === 1 ? 'persona' : 'personas'} de {group?.name}
              </p>
            </header>

            {(splitMode === 'equal' || splitMode === 'percentage') && !spin && !toss && (
              <section className="expense-game" aria-label="Resumen del reparto">
                <SplitSummary
                  mode={splitMode}
                  slices={summarySlices}
                  amount={amountValue > 0 ? amountValue : 0}
                  payerId={payerId}
                  payerName={payer ? displayName(payer) : ''}
                  percentageTotal={percentageTotal}
                  formatMoney={formatMoney}
                />
              </section>
            )}

            {(splitMode === 'roulette' || spin) && (
              <section className="expense-game" aria-label="Ruleta">
                <p className="expense-game__intro">
                  La ruleta elige al azar a una sola persona de los participantes, que asumirá el gasto completo.
                </p>
                <RouletteWheel
                  candidates={wheelCandidates}
                  rotation={rouletteRotation}
                  spinning={isSpinning}
                  onSpinEnd={finishSpin}
                />
                <p className="expense-game__result" role="status" aria-live="polite">
                  {isSpinning
                    ? 'Girando...'
                    : spin
                      ? <>Le ha tocado a <strong>{spin.winner.name}</strong>: asume {formatMoney(spin.amount)}.</>
                      : ''}
                </p>
              </section>
            )}

            {(isAllOrNothing || toss) && (
              <section className="expense-game" aria-label="Todo o nada">
                <p className="expense-game__intro">
                  Lanza la moneda: con cara pagas tú todo el gasto; con cruz se lo reparten a partes iguales los demás
                  participantes que hayas elegido.
                </p>
                <CoinFlip rotation={coinRotation} flipping={toss?.flipping ?? false} onFlipEnd={finishFlip} />
                <p className="expense-game__result" role="status" aria-live="polite">
                  {toss?.flipping
                    ? 'Lanzando la moneda...'
                    : toss?.result === 'payerPaysAll'
                      ? <>¡Cara! <strong>Pagas tú</strong> los {formatMoney(toss.amount)}.</>
                      : toss
                        ? <>¡Cruz! <strong>Los otros {toss.othersCount}</strong> se reparten {formatMoney(toss.amount)}.</>
                        : ''}
                </p>
              </section>
            )}
          </section>
        </form>
      )}
    </section>
  )
}
