import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import {
  clearCreateGroupStatus,
  clearJoinStatus,
  createGroup,
  fetchMyGroups,
  joinGroup,
  type Group,
} from '../store/slices/groupsSlice'
import GroupDashboard from './GroupDashboard'
import './Groups.css'

// Paleta de colores para las tarjetas; se asigna por posición para que dos vecinas nunca coincidan
const CARD_COLORS = ['violet', 'teal', 'coral', 'amber', 'blue', 'pink'] as const

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const MAX_AVATARS = 4

interface GroupCardProps {
  group: Group
  color: (typeof CARD_COLORS)[number]
  onOpen: (groupId: string) => void
}

function GroupCard({ group, color, onOpen }: GroupCardProps) {
  const members = group.members.map((m) => (typeof m === 'string' ? { _id: m, name: '?' } : m))
  const visible = members.slice(0, MAX_AVATARS)
  const extra = members.length - visible.length
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!group.inviteCode) return
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // El portapapeles puede no estar disponible (p. ej. sin HTTPS); no es crítico
    }
  }

  return (
    <article className={`groups-card groups-card--${color}`}>
      <header className="groups-card__header">
        <div className="groups-card__icon" aria-hidden="true">
          <Icon name="users" size={22} />
        </div>
        <h2 className="groups-card__title">{group.name}</h2>
        {group.inviteCode && (
          <button
            type="button"
            className="groups-card__code"
            onClick={copyCode}
            title="Copiar código de invitación"
            aria-label={`Copiar código de invitación ${group.inviteCode}`}
          >
            {copied ? '¡Copiado!' : group.inviteCode}
          </button>
        )}
      </header>

      <p className="groups-card__description">{group.description || 'Sin descripción'}</p>

      <footer className="groups-card__footer">
        <div className="groups-card__people">
          <ul className="groups-card__avatars" aria-label="Miembros">
            {visible.map((member) => (
              <li key={member._id} className="groups-card__avatar" title={member.name}>
                {initials(member.name)}
              </li>
            ))}
            {extra > 0 && <li className="groups-card__avatar groups-card__avatar--more">+{extra}</li>}
          </ul>
          <span className="groups-card__members">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
        <button
          type="button"
          className="groups-card__open"
          onClick={() => onOpen(group._id)}
          aria-label={`Ver gastos de ${group.name}`}
        >
          Ver gastos <Icon name="arrow" size={14} />
        </button>
      </footer>
    </article>
  )
}

/**
 * Función que crea el formulario para crear un grupo.
 * @param param0 - Token de autenticación del usuario.
 * @returns El componente del formulario para crear un grupo.
 */
function CreateGroupForm({ token }: { token: string }) {
  const dispatch = useAppDispatch()
  const { creating, createError, createMessage } = useAppSelector((state) => state.groups)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => () => { dispatch(clearCreateGroupStatus()) }, [dispatch])

  const resetFeedback = () => {
    if (localError) setLocalError('')
    if (createError || createMessage) dispatch(clearCreateGroupStatus())
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return setLocalError('Escribe un nombre para el grupo.')

    const result = await dispatch(createGroup({ token, name: trimmedName, description: description.trim() }))
    if (createGroup.fulfilled.match(result)) {
      setName('')
      setDescription('')
    }
  }

  const activeError = localError || createError

  return (
    <form className="group-form" onSubmit={handleSubmit} noValidate>
      <header className="group-form__header">
        <span className="group-form__icon" aria-hidden="true"><Icon name="users" size={22} /></span>
        <div>
          <h2>Nuevo grupo</h2>
          <p>Crea un grupo e invita a otras personas con su código.</p>
        </div>
      </header>

      <div className="group-field">
        <label htmlFor="group-name">Nombre</label>
        <input
          id="group-name"
          type="text"
          placeholder="Ej. Viaje a Lisboa"
          maxLength={60}
          value={name}
          onChange={(event) => { setName(event.target.value); resetFeedback() }}
          disabled={creating}
        />
      </div>

      <div className="group-field">
        <label htmlFor="group-description">Descripción <span>(opcional)</span></label>
        <textarea
          id="group-description"
          placeholder="¿Para qué es este grupo?"
          rows={3}
          maxLength={200}
          value={description}
          onChange={(event) => { setDescription(event.target.value); resetFeedback() }}
          disabled={creating}
        />
      </div>

      {activeError && <p className="group-form__feedback group-form__feedback--error" role="alert">{activeError}</p>}
      {createMessage && <p className="group-form__feedback group-form__feedback--success" role="status">{createMessage}</p>}

      <button className="group-form__submit" type="submit" disabled={creating}>
        {creating ? 'Creando...' : 'Crear grupo'}
      </button>
    </form>
  )
}

interface GroupsProps {
  groupId?: string
  onOpenGroup: (groupId: string) => void
  onCloseGroup: () => void
}

export default function Groups({ groupId, onOpenGroup, onCloseGroup }: GroupsProps) {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const { items: groups, loading, error, joining, joinError, joinMessage } = useAppSelector(
    (state) => state.groups
  )
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    if (token) void dispatch(fetchMyGroups(token))
    return () => { dispatch(clearJoinStatus()) }
  }, [dispatch, token])

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = inviteCode.trim()
    if (!token || !code) return
    const result = await dispatch(joinGroup({ token, inviteCode: code }))
    if (joinGroup.fulfilled.match(result)) setInviteCode('')
  }

  if (groupId) {
    const openGroup = groups.find((group) => group._id === groupId)
    if (openGroup) return <GroupDashboard group={openGroup} onBack={onCloseGroup} />

    return (
      <section className="dashboard-content" aria-labelledby="groups-title">
        <h1 id="groups-title">Mis grupos</h1>
        {loading ? (
          <p className="groups-message" role="status">Cargando grupo...</p>
        ) : (
          <p className={`groups-message${error ? ' groups-message--error' : ''}`} role="alert">
            {error ?? 'No se ha encontrado el grupo o no perteneces a él.'}{' '}
            <button type="button" className="groups-message__link" onClick={onCloseGroup}>Volver a mis grupos</button>
          </p>
        )}
      </section>
    )
  }

  return (
    <section className="dashboard-content" aria-labelledby="groups-title">
      <h1 id="groups-title">Mis grupos</h1>

      {token && (
        <div className="groups-forms">
          <CreateGroupForm token={token} />

          <form className="groups-join" onSubmit={handleJoin}>
            <label htmlFor="invite-code">Unirse a un grupo</label>
            <div className="groups-join__row">
              <input
                id="invite-code"
                type="text"
                placeholder="Código de invitación"
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase())
                  if (joinError || joinMessage) dispatch(clearJoinStatus())
                }}
                autoComplete="off"
                spellCheck={false}
                disabled={joining}
              />
              <button type="submit" disabled={joining || !inviteCode.trim()}>
                {joining ? 'Uniéndote...' : 'Unirse'}
              </button>
            </div>
            {joinError && (
              <p className="groups-join__feedback groups-join__feedback--error" role="alert">{joinError}</p>
            )}
            {joinMessage && (
              <p className="groups-join__feedback groups-join__feedback--success" role="status">{joinMessage}</p>
            )}
          </form>
        </div>
      )}

      {!token ? (
        <p className="groups-message" role="alert">Inicia sesión para consultar tus grupos.</p>
      ) : loading ? (
        <p className="groups-message" role="status">Cargando grupos...</p>
      ) : error ? (
        <p className="groups-message groups-message--error" role="alert">{error}</p>
      ) : groups.length === 0 ? (
        <div className="groups-empty">
          <span className="groups-empty__icon" aria-hidden="true">
            <Icon name="users" size={28} />
          </span>
          <h2>Aún no hay grupos para mostrar</h2>
          <p>Los grupos a los que pertenezcas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map((group, index) => (
            <GroupCard
              key={group._id}
              group={group}
              color={CARD_COLORS[index % CARD_COLORS.length] ?? 'violet'}
              onOpen={onOpenGroup}
            />
          ))}
        </div>
      )}
    </section>
  )
}
