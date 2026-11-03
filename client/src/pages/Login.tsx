import { useState, type ReactNode, type SubmitEvent } from 'react'
import './Login.css'

type IconName = 'mail' | 'lock' | 'eye' | 'eye-off' | 'arrow' | 'check' | 'users' | 'sparkles' | 'chart'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14.5v2" /></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></>,
    'eye-off': <><path d="M3 3 21 21" /><path d="M10.6 7.1c.46-.07.92-.1 1.4-.1 6 0 9.5 5 9.5 5a15.6 15.6 0 0 1-3.1 3.05M6.3 8.3C3.8 10 2.5 12 2.5 12s3.5 5 9.5 5c.65 0 1.28-.06 1.86-.17" /><path d="M10 10a2.8 2.8 0 0 0 3.98 3.97" /></>,
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><path d="M17 5.5a3 3 0 0 1 0 5.5M18 14a5 5 0 0 1 3 4.6V20" /></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z" /></>,
    chart: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m7 15 3-4 3 2 4-5" /></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand--light' : ''}`} aria-label="Cuentas Claras">
      <span className="brand__symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M12 11h16l-5 6H12a3 3 0 0 0 0 6h11l5 6H12a9 9 0 0 1 0-18Z" fill="currentColor" />
          <path d="m25 11 6 0-5 6h-6l5-6Zm1 12h-6l5 6h6l-5-6Z" fill="currentColor" opacity=".65" />
        </svg>
      </span>
      <span className="brand__name">cuentas<span>claras</span><span className="brand__dot">.</span></span>
    </div>
  )
}

function VisualPanel() {
  return (
    <aside className="login-visual" aria-label="Presentación de Cuentas Claras">
      <div className="visual-glow visual-glow--top" aria-hidden="true" />
      <div className="visual-glow visual-glow--bottom" aria-hidden="true" />
      <div className="login-visual__content">
        <Brand light />

        <div className="visual-intro">
          <span className="eyebrow eyebrow--light"><span className="eyebrow__spark" /> LOS PLANES SE DISFRUTAN</span>
          <h2>Las cuentas claras.<br /><span>Los planes, mejores.</span></h2>
          <p>Organiza gastos compartidos, lleva el control de cada plan y olvídate de las cuentas complicadas.</p>
        </div>

        <div className="preview-area" aria-hidden="true">
          <div className="decor-ring decor-ring--one" />
          <div className="decor-ring decor-ring--two" />
          <div className="preview-card">
            <div className="preview-card__header">
              <div>
                <span className="preview-overline">TU GRUPO ACTUAL</span>
                <strong>Viaje a Madrid <span className="preview-emoji">✈</span></strong>
              </div>
              <div className="preview-avatars"><span>AL</span><span>MR</span><span>SC</span></div>
            </div>
            <div className="preview-card__balance">
              <div><span>Gasto total del grupo</span><strong>845,50 €</strong></div>
              <div className="preview-trend"><span>↗</span> Al día</div>
            </div>
            <div className="preview-chart">
              <div className="preview-chart__top"><span>Actividad de gastos</span><span>Esta semana</span></div>
              <div className="preview-chart__bars">
                {[37, 55, 43, 76, 58, 94, 69, 81, 61, 100, 75, 89].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="preview-chart__footer"><span>Lun</span><span>Mié</span><span>Vie</span><span>Dom</span></div>
            </div>
          </div>
          <div className="floating-badge floating-badge--positive"><span className="floating-badge__icon"><Icon name="check" size={16} /></span><div><strong>Todo bajo control</strong><span>Gastos organizados</span></div></div>
          <div className="floating-badge floating-badge--group"><span className="floating-badge__icon"><Icon name="users" size={18} /></span><div><strong>Gastos compartidos</strong><span>Más fácil en grupo</span></div></div>
        </div>

        <div className="visual-footer"><span><Icon name="sparkles" size={16} /> Comparte momentos, no complicaciones.</span><span className="visual-footer__decor">✳ ✳ ✳</span></div>
      </div>
    </aside>
  )
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('La conexión con el servidor se añadirá en una tarea posterior. Esta pantalla es solo visual.')
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
                <input id="login-email" type="email" name="email" placeholder="tu@email.com" autoComplete="email" required onChange={() => notice && setNotice('')} />
              </div>
            </div>

            <div className="form-field">
              <div className="label-row"><label htmlFor="login-password">Contraseña</label></div>
              <div className="input-shell">
                <Icon name="lock" size={19} />
                <input id="login-password" type={showPassword ? 'text' : 'password'} name="password" placeholder="Introduce tu contraseña" autoComplete="current-password" required onChange={() => notice && setNotice('')} />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button className="subtle-link" type="button" onClick={() => setNotice('La recuperación de contraseña se añadirá más adelante.')}>¿Has olvidado tu contraseña?</button>
            </div>

            <button className="login-submit" type="submit">Entrar a mi cuenta <Icon name="arrow" size={19} /></button>
            {notice && <p className="form-notice" role="status"><Icon name="chart" size={18} />{notice}</p>}
          </form>

          <div className="signup-prompt">¿Todavía no tienes cuenta? <button type="button" className="subtle-link" onClick={() => setNotice('La página de registro se diseñará en el siguiente paso.')}>Crear una cuenta</button></div>
        </div>

        <footer className="login-form-footer"><span>© 2026 Cuentas Claras</span><span>Haz que cada plan cuente <span aria-hidden="true">✳</span></span></footer>
      </section>
    </main>
  )
}
