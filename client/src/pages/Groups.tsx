import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { clearJoinStatus, fetchMyGroups, joinGroup } from '../store/slices/groupsSlice'
import './Groups.css'

export default function Groups() {
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

  return (
    <section className="dashboard-content" aria-labelledby="groups-title">
      <h1 id="groups-title">Mis grupos</h1>

      {token && (
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
          {groups.map((group) => (
            <article className="groups-card" key={group._id}>
              <div className="groups-card__icon" aria-hidden="true">
                <Icon name="users" size={24} />
              </div>
              <div>
                <h2>{group.name}</h2>
                {group.description && <p>{group.description}</p>}
                <span className="groups-card__members">
                  {group.members.length} {group.members.length === 1 ? 'miembro' : 'miembros'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
