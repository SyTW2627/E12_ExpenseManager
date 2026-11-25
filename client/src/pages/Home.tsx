import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import { clearProfileFeedback, deleteAccount, logout, updateProfile } from '../store/slices/authSlice'
import './Home.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function ProfilePanel() {
  const dispatch = useAppDispatch()
  const { user, token, profileSaving, profileError, profileNotice, deletingAccount, deleteError } = useAppSelector(
    (state) => state.auth
  )
  const userId = user?.id ?? user?._id ?? ''

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [localError, setLocalError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => () => { dispatch(clearProfileFeedback()) }, [dispatch])

  const resetFeedback = () => {
    if (localError) setLocalError('')
    if (profileError || profileNotice || deleteError) dispatch(clearProfileFeedback())
  }

  const openEditor = () => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    resetFeedback()
    setEditing(true)
  }

  const closeEditor = () => {
    setEditing(false)
    setConfirmingDelete(false)
    resetFeedback()
  }

  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const hasChanges = trimmedName !== (user?.name ?? '') || trimmedEmail !== (user?.email ?? '')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token || !userId) return
    if (!trimmedName) return setLocalError('El nombre no puede estar vacío.')
    if (!EMAIL_PATTERN.test(trimmedEmail)) return setLocalError('Introduce un correo electrónico válido.')

    const result = await dispatch(updateProfile({ token, userId, name: trimmedName, email: trimmedEmail }))
    if (updateProfile.fulfilled.match(result)) {
      setEditing(false)
      setConfirmingDelete(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !userId) return
    const result = await dispatch(deleteAccount({ token, userId }))
    if (deleteAccount.fulfilled.match(result)) dispatch(logout())
  }

  const activeError = localError || profileError

  return (
    <section className="profile-panel" aria-labelledby="profile-title">
      <header className="profile-panel__header">
        <div>
          <h2 id="profile-title">Mi perfil</h2>
          <p>Gestiona tus datos personales y tu cuenta.</p>
        </div>
        <button
          type="button"
          className={`profile-edit-toggle${editing ? ' is-open' : ''}`}
          onClick={editing ? closeEditor : openEditor}
          aria-label={editing ? 'Cerrar edición del perfil' : 'Editar perfil'}
          title={editing ? 'Cerrar' : 'Editar perfil'}
          aria-expanded={editing}
          aria-controls="profile-editor"
        >
          <Icon name={editing ? 'close' : 'pencil'} size={18} />
        </button>
      </header>

      <div className="profile-avatar">
        <span className="profile-avatar__image" aria-hidden="true">{initials(user?.name ?? '') || '?'}</span>
        <div className="profile-avatar__info">
          <p className="profile-avatar__name">{user?.name}</p>
          <p className="profile-avatar__email">{user?.email}</p>
          {editing && (
            <button type="button" className="profile-avatar__button" disabled>
              <Icon name="camera" size={16} /> Cambiar foto
            </button>
          )}
        </div>
      </div>

      {!editing && profileNotice && (
        <p className="profile-feedback profile-feedback--success" role="status">{profileNotice}</p>
      )}

      {editing && (
        <div id="profile-editor" className="profile-editor">
          <form className="profile-section" onSubmit={handleSubmit} noValidate>
            <h3>Datos personales</h3>

            <div className="profile-field">
              <label htmlFor="profile-name">Nombre</label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => { setName(event.target.value); resetFeedback() }}
                disabled={profileSaving}
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-email">Correo electrónico</label>
              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); resetFeedback() }}
                disabled={profileSaving}
              />
            </div>

            {activeError && <p className="profile-feedback profile-feedback--error" role="alert">{activeError}</p>}

            <button className="profile-button" type="submit" disabled={profileSaving || !hasChanges}>
              {profileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>

          <form className="profile-section" onSubmit={(event) => event.preventDefault()}>
            <h3>Contraseña</h3>
            <fieldset disabled className="profile-fieldset">
              <div className="profile-field">
                <label htmlFor="profile-current-password">Contraseña actual</label>
                <input id="profile-current-password" type="password" autoComplete="current-password" />
              </div>
              <div className="profile-field">
                <label htmlFor="profile-new-password">Nueva contraseña</label>
                <input id="profile-new-password" type="password" autoComplete="new-password" />
              </div>
              <div className="profile-field">
                <label htmlFor="profile-confirm-password">Repite la nueva contraseña</label>
                <input id="profile-confirm-password" type="password" autoComplete="new-password" />
              </div>
              <button className="profile-button" type="submit">Cambiar contraseña</button>
            </fieldset>
          </form>

          <div className="profile-section profile-danger">
            <h3>Eliminar cuenta</h3>
            <p>Se borrará tu cuenta de forma permanente. Esta acción no se puede deshacer.</p>

            {deleteError && <p className="profile-feedback profile-feedback--error" role="alert">{deleteError}</p>}

            {confirmingDelete ? (
              <div className="profile-danger__confirm">
                <p>¿Seguro que quieres eliminar tu cuenta?</p>
                <div className="profile-danger__actions">
                  <button type="button" className="profile-danger__button" onClick={handleDelete} disabled={deletingAccount}>
                    {deletingAccount ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
                  </button>
                  <button
                    type="button"
                    className="profile-danger__cancel"
                    onClick={() => { setConfirmingDelete(false); resetFeedback() }}
                    disabled={deletingAccount}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="profile-danger__button" onClick={() => setConfirmingDelete(true)}>
                <Icon name="trash" size={16} /> Eliminar mi cuenta
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default function Home({ firstName }: { firstName: string }) {
  return (
    <section className="dashboard-content" aria-labelledby="home-title">
      <h1 id="home-title">Hola, {firstName}</h1>

      <div className="home-layout">
        <ProfilePanel />

        <section className="home-stats" aria-labelledby="stats-title">
          <span className="home-stats__icon" aria-hidden="true"><Icon name="chart" size={26} /></span>
          <h2 id="stats-title">Tus estadísticas</h2>
          <p>Aquí verás tu nivel de confianza, tus gastos del mes y más. Próximamente.</p>
        </section>
      </div>
    </section>
  )
}
