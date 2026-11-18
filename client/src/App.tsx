import { useEffect, useState } from 'react'
import { useAppSelector } from './store'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'

// Redux controla el acceso; las rutas solo deciden qué sección se muestra.
const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/'
const privatePaths = ['/dashboard', '/grupos', '/gastos']

type PrivatePath = '/dashboard' | '/grupos' | '/gastos'

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
    if (isAuthenticated && !privatePaths.includes(path)) {
      window.history.replaceState(null, '', '/dashboard')
      setPath('/dashboard')
    } else if (!isAuthenticated && privatePaths.includes(path)) {
      window.history.replaceState(null, '', '/login')
      setPath('/login')
    }
  }, [isAuthenticated, path])
  
  const navigatePrivate = (destination: PrivatePath) => {
    if (destination === path) return
    window.history.pushState(null, '', destination)
    setPath(destination)
  }

  useEffect(() => {
    const pageTitle = isAuthenticated
      ? path === '/grupos' ? 'Mis grupos' : path === '/gastos' ? 'Gastos' : 'Inicio'
      : path === '/register' ? 'Crear cuenta' : 'Iniciar sesión'

    document.title = `${pageTitle} | Cuentas Claras`
  }, [isAuthenticated, path])

  if (isAuthenticated) {
    return (
      <Dashboard
        section={sectionByPath[path as PrivatePath] ?? 'home'}
        onNavigate={(section) => navigatePrivate(pathBySection[section])}
      />
    )
  }

  if (path === '/register') return <Register />
  return <Login />
}

export default App
