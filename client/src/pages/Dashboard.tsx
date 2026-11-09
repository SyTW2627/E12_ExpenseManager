import { Brand, Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { logout } from '../store/slices/authSlice'
import './Dashboard.css'

export default function Dashboard() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'usuario'

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar" aria-label="Menú lateral">
        <div className="dashboard-sidebar__brand">
          <Brand light />
        </div>

        <nav className="dashboard-nav" aria-label="Secciones">
          <span className="dashboard-nav__link dashboard-nav__link--active" aria-current="page">
            <Icon name="chart" size={19} /> Inicio
          </span>
          <button className="dashboard-nav__link dashboard-nav__link--disabled" type="button" disabled>
            <Icon name="users" size={19} /> Mis grupos
          </button>
        </nav>

        <button className="dashboard-logout" type="button" onClick={() => dispatch(logout())}>
          Cerrar sesión <Icon name="arrow" size={16} />
        </button>
      </aside>

      <section className="dashboard-content" aria-label="Inicio">
        <h1>Hola, {firstName}</h1>
      </section>
    </main>
  )
}
