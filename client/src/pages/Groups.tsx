import { Icon } from './AuthVisual'
import './Groups.css'

export default function Groups() {
  return (
    <section className="dashboard-content" aria-labelledby="groups-title">
      <h1 id="groups-title">Mis grupos</h1>

      <div className="groups-empty">
        <span className="groups-empty__icon" aria-hidden="true">
          <Icon name="users" size={28} />
        </span>
        <h2>Aún no hay grupos para mostrar</h2>
        <p>Los grupos a los que pertenezcas aparecerán aquí.</p>
      </div>
    </section>
  )
}
