import { Brand, Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { logout } from '../store/slices/authSlice'
import Groups from './Groups'
import Expenses from './Expenses'
import './Dashboard.css'

type Section = 'home' | 'groups' | 'expenses'

interface DashboardProps {
  section: Section
  groupId?: string
  onNavigate: (section: Section) => void
  onOpenGroup: (groupId: string) => void
}

export default function Dashboard({ section, groupId, onNavigate, onOpenGroup }: DashboardProps) {
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
          <a
            href="/dashboard"
            className={`dashboard-nav__link${section === 'home' ? ' dashboard-nav__link--active' : ''}`}
            aria-current={section === 'home' ? 'page' : undefined}
            onClick={(event) => { event.preventDefault(); onNavigate('home') }}
          >
            <Icon name="chart" size={19} /> Inicio
          </a>
          <a
            href="/grupos"
            className={`dashboard-nav__link${section === 'groups' ? ' dashboard-nav__link--active' : ''}`}
            aria-current={section === 'groups' ? 'page' : undefined}
            onClick={(event) => { event.preventDefault(); onNavigate('groups') }}
          >
            <Icon name="users" size={19} /> Mis grupos
          </a>
          <a
            href="/gastos"
            className={`dashboard-nav__link${section === 'expenses' ? ' dashboard-nav__link--active' : ''}`}
            aria-current={section === 'expenses' ? 'page' : undefined}
            onClick={(event) => { event.preventDefault(); onNavigate('expenses') }}
          >
            <Icon name="receipt" size={19} /> Gastos
          </a>
        </nav>

        <button className="dashboard-logout" type="button" onClick={() => dispatch(logout())}>
          Cerrar sesión <Icon name="arrow" size={16} />
        </button>
      </aside>

      {section === 'groups' ? (
        <Groups groupId={groupId} onOpenGroup={onOpenGroup} onCloseGroup={() => onNavigate('groups')} />
      ) : section === 'expenses' ? (
        <Expenses />
      ) : (
        <section className="dashboard-content" aria-label="Inicio">
          <h1>Hola, {firstName}</h1>
        </section>
      )}
    </main>
  )
}
