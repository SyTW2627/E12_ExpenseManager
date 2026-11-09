import { useEffect, useState } from 'react'
import { useAppSelector } from './store'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
// ???
const currentPath = () => window.location.pathname.replace(/\/+$/, '') || '/'

function App() {
  const [path, setPath] = useState(currentPath)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  useEffect(() => {
    const onNavigation = () => setPath(currentPath())
    window.addEventListener('popstate', onNavigation)
    return () => window.removeEventListener('popstate', onNavigation)
  }, [])

  // Redirigir cuando Redux confirma el login o procesa el logout.
  // No es necesario recargar la página ni duplicar el estado de autenticación.
  useEffect(() => {
    if (isAuthenticated && path !== '/dashboard') {
      window.history.replaceState(null, '', '/dashboard')
      setPath('/dashboard')
    } else if (!isAuthenticated && path === '/dashboard') {
      window.history.replaceState(null, '', '/login')
      setPath('/login')
    }
  }, [isAuthenticated, path])

  useEffect(() => {
    const pageTitle = isAuthenticated
      ? 'Inicio'
      : path === '/register'
        ? 'Crear cuenta'
        : 'Iniciar sesión'

    document.title = `${pageTitle} | Cuentas Claras`
  }, [isAuthenticated, path])

  if (isAuthenticated) return <Dashboard />
  if (path === '/register') return <Register />
  return <Login />
}

export default App
