import { useState, type SubmitEvent } from 'react'
import { Brand, Icon, VisualPanel } from './AuthVisual'
import './Register.css'

export default function Register() {
  // guarda los valores del formulario y controla la visibilidad de ambos campos de contrasena
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetFeedback = () => {
    // elimina los mensajes anteriores cuando el usuario empieza a corregir el formulario
    setNotice('')
    setError('')
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    // comprobacion del nombre que se va a enviar desde el frontend
    if (!name.trim()) {
      setError('Introduce tu nombre para continuar.')
      setNotice('')
      return
    }

    // comprueba si ambos campos contienen la misma contrasena
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.')
      setNotice('')
      return
    }

    setLoading(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la cuenta')
      }

      // Guardamos el token y usuario devueltos por el backend
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      setNotice('¡Cuenta creada con éxito! Redirigiendo...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // aviso de diferencia mientras se escribe la confirmacion
  const passwordsDiffer = confirmation.length > 0 && password !== confirmation

  return (
    <main className="login-page register-page">
      <VisualPanel />
      <section className="login-form-panel" aria-labelledby="register-heading">
        <header className="login-mobile-brand"><Brand /></header>

        <div className="login-form-wrap register-form-wrap">
          <span className="form-eyebrow"><span className="form-eyebrow__line" /> EMPECEMOS POR AQUÍ</span>
          <h1 id="register-heading">Crea tu cuenta<span className="heading-period">.</span></h1>
          <p className="login-subtitle">Menos cuentas pendientes, más planes juntos. Únete a Cuentas Claras en unos pasos.</p>

          <form className="login-form register-form" onSubmit={handleSubmit}>
            {/* campos de informacion personal */}
            <div className="form-field">
              <label htmlFor="register-name">Nombre</label>
              <div className="input-shell">
                <Icon name="user" size={19} />
                <input id="register-name" name="name" type="text" placeholder="¿Cómo te llamas?" autoComplete="name" maxLength={100} required onChange={resetFeedback} />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="register-email">Correo electrónico</label>
              <div className="input-shell">
                <Icon name="mail" size={19} />
                <input id="register-email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" required onChange={resetFeedback} />
              </div>
            </div>

            {/* las contrasenas deben tener al menos 8 caracteres y coincidir al confirmar */}
            {/* campo de contrasena con un interruptor de visibilidad */}
            <div className="form-field">
              <label htmlFor="register-password">Contraseña</label>
              <div className="input-shell">
                <Icon name="lock" size={19} />
                <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Crea una contraseña" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => { setPassword(event.target.value); resetFeedback() }} />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                </button>
              </div>
              <p className="register-hint"><Icon name="check" size={13} /> Al menos 8 caracteres</p>
            </div>

            {/* campo de confirmacion con un aviso de diferencia en tiempo real */}
            <div className="form-field">
              <label htmlFor="register-confirm">Confirmar contraseña</label>
              <div className={`input-shell${passwordsDiffer ? ' input-shell--invalid' : ''}`}>
                <Icon name="lock" size={19} />
                <input id="register-confirm" name="confirmPassword" type={showConfirmation ? 'text' : 'password'} placeholder="Repite tu contraseña" autoComplete="new-password" required value={confirmation} aria-invalid={passwordsDiffer} aria-describedby={passwordsDiffer ? 'register-password-error' : undefined} onChange={(event) => { setConfirmation(event.target.value); resetFeedback() }} />
                <button className="password-toggle" type="button" onClick={() => setShowConfirmation((current) => !current)} aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={showConfirmation}>
                  <Icon name={showConfirmation ? 'eye-off' : 'eye'} size={19} />
                </button>
              </div>
              {passwordsDiffer && <p className="register-error-hint" id="register-password-error">Las contraseñas no coinciden.</p>}
            </div>

            <button className="login-submit register-submit" type="submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : <>Crear mi cuenta <Icon name="arrow" size={19} /></>}
            </button>
            {error && <p className="form-notice form-notice--error" role="alert">{error}</p>}
            {notice && <p className="form-notice" role="status"><Icon name="chart" size={18} />{notice}</p>}
          </form>

          <p className="signup-prompt register-signin-prompt">¿Ya tienes una cuenta? <a href="/login" className="subtle-link">Inicia sesión</a></p>
        </div>

        <footer className="login-form-footer"><span>© 2026 Cuentas Claras</span><span>Haz que cada plan cuente <span aria-hidden="true">✳</span></span></footer>
      </section>
    </main>
  )
}
