import { useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  // frontend pequeno de dos paginas que se puede reemplazar con react router mas adelante
  // la ruta actual decide que pantalla de autenticacion se muestra
  const isRegisterPage = window.location.pathname.replace(/\/+$/, '') === '/register'

  useEffect(() => {
    document.title = `${isRegisterPage ? 'Crear cuenta' : 'Iniciar sesión'} | Cuentas Claras`
  }, [isRegisterPage])

  return isRegisterPage ? <Register /> : <Login />
}

export default App
