import { useState, type SubmitEvent } from 'react'
import { Brand, Icon, VisualPanel } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { loginUser, clearFeedback } from '../store/slices/authSlice'

// Vista de login que únicamente lee datos y emite eventos
export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const dispatch = useAppDispatch()
  const { loading, error, notice } = useAppSelector((state) => state.auth)

  const handleInputChange = () => {
    if (error || notice) {
      dispatch(clearFeedback())
    }
  }
  
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Quitar el comentario de la siguiente línea para habilitar el login real
    void dispatch(loginUser({ email, password }))
    // Quitar el comentario de la siguiente línea para el login simulado
    /*dispatch(loginUser.fulfilled(
      {
        user: {
          name: 'Usuario de prueba',
          email: email
        }
      },
      'test-login',
      { email, password }
    )) */
  }

  return (
    <main className="login-page">
      <VisualPanel />
      <section className="login-form-panel" aria-labelledby="login-heading">
        <header className="login-mobile-brand"><Brand /></header>

        <div className="login-form-wrap">
          <span className="form-eyebrow"><span className="form-eyebrow__line" /> BIENVENIDO DE NUEVO</span>
          <h1 id="login-heading">Inicia sesión<span className="heading-period">.</span></h1>
          <p className="login-subtitle">Tu próximo plan empieza aquí. Accede a tu cuenta para continuar.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="input-shell">
                <Icon name="mail" size={19} />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    handleInputChange()
                  }}
                />
              </div>
            </div>

            <div className="form-field">
              <div className="label-row"><label htmlFor="login-password">Contraseña</label></div>
              <div className="input-shell">
                <Icon name="lock" size={19} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Introduce tu contraseña"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    handleInputChange()
                  }}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="subtle-link"
                type="button"
                onClick={() => alert('La recuperación de contraseña se añadirá próximamente.')}
              >
                ¿Has olvidado tu contraseña?
              </button>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Entrar a mi cuenta'} <Icon name="arrow" size={19} />
            </button>

            {error && <p className="form-notice form-notice--error" role="alert">{error}</p>}
            {notice && <p className="form-notice" role="status"><Icon name="chart" size={18} />{notice}</p>}
          </form>

          <div className="signup-prompt">
            ¿Todavía no tienes cuenta? <a className="subtle-link" href="/register">Crear una cuenta</a>
          </div>
        </div>

        <footer className="login-form-footer">
          <span>© 2026 Cuentas Claras</span>
          <span>Haz que cada plan cuente <span aria-hidden="true">✳</span></span>
        </footer>
      </section>
    </main>
  )
}