import { useEffect, useState } from 'react'
import { useAppSelector } from './store'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'

// Redux controla el acceso; las rutas solo deciden qué sección se muestra.
const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/'
const privatePaths = ['/dashboard', '/grupos', '/gastos']

type PrivatePath = '/dashboard' | '/grupos' | '/gastos'

const groupPathPattern = /^\/grupos\/([^/]+)$/
const groupIdFromPath = (path: string) => groupPathPattern.exec(path)?.[1]
const isPrivatePath = (path: string) => privatePaths.includes(path) || groupIdFromPath(path) !== undefined

const sectionByPath = { '/dashboard': 'home', '/grupos': 'groups', '/gastos': 'expenses' } as const
const pathBySection = { home: '/dashboard', groups: '/grupos', expenses: '/gastos' } as const

function App() {
  const [path, setPath] = useState(currentPath)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  useEffect(() => {
    const onNavigation = () => setPath(currentPath())
    window.addEventListener('popstate', onNavigation)
    return () => window.removeEventListener('popstate', onNavigation)
  }, [])

  // redirige al inicio tras autenticarse y al login al cerrar sesión.
  useEffect(() => {
    if (isAuthenticated && !isPrivatePath(path)) {
      window.history.replaceState(null, '', '/dashboard')
      setPath('/dashboard')
    } else if (!isAuthenticated && isPrivatePath(path)) {
      window.history.replaceState(null, '', '/login')
      setPath('/login')
    }
  }, [isAuthenticated, path])
  
  const navigatePrivate = (destination: string) => {
    if (destination === path) return
    window.history.pushState(null, '', destination)
    setPath(destination)
  }

  useEffect(() => {
    const pageTitle = isAuthenticated
      ? path === '/grupos' ? 'Mis grupos' : groupIdFromPath(path) ? 'Grupo' : path === '/gastos' ? 'Gastos' : 'Inicio'
      : path === '/register' ? 'Crear cuenta' : 'Iniciar sesión'

    document.title = `${pageTitle} | Cuentas Claras`
  }, [isAuthenticated, path])

  if (isAuthenticated) {
    const groupId = groupIdFromPath(path)
    return (
      <Dashboard
        section={groupId ? 'groups' : sectionByPath[path as PrivatePath] ?? 'home'}
        groupId={groupId}
        onNavigate={(section) => navigatePrivate(pathBySection[section])}
        onOpenGroup={(id) => navigatePrivate(`/grupos/${encodeURIComponent(id)}`)}
      />
    )
  }

  if (path === '/register') return <Register />
  return <Login />
}

export default App
