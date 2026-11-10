import { useEffect } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { fetchMyGroups } from '../store/slices/groupsSlice'
import './Groups.css'

export default function Groups() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const { items: groups, loading, error } = useAppSelector((state) => state.groups)

  useEffect(() => {
    if (token) void dispatch(fetchMyGroups(token))
  }, [dispatch, token])

  return (
    <section className="dashboard-content" aria-labelledby="groups-title">
      <h1 id="groups-title">Mis grupos</h1>

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
