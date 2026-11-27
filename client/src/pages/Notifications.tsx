import { useEffect, useState } from 'react'
import { Icon } from './AuthVisual'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
  type NotificationType,
} from '../store/slices/notificationsSlice'
import './Notifications.css'

interface NotificationsPanelProps {
  id: string
  onOpenGroup: (groupId: string) => void
  onClose: () => void
}

type FilterMode = 'all' | 'unread'

const typeLabels: Record<NotificationType, string> = {
  expense_created: 'Nuevo gasto',
  payment_created: 'Pago registrado',
  payment_completed: 'Pago confirmado',
  all_or_nothing: 'Todo o nada',
  low_trust_score: 'Reputación',
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const formatDate = (iso: string) => {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  return dateFormatter.format(parsed)
}

const extractGroupInfo = (groupRef: NotificationItem['groupId']) => {
  if (!groupRef) return { id: null, name: null }
  if (typeof groupRef === 'string') return { id: groupRef, name: null }
  return { id: groupRef._id, name: groupRef.name }
}

export default function NotificationsPanel({ id, onOpenGroup, onClose }: NotificationsPanelProps) {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth.token)
  const { items, loading, error, markingId, markingAll } = useAppSelector((state) => state.notifications)
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    if (token) {
      dispatch(fetchNotifications({ token }))
    }
  }, [dispatch, token])

  const unreadCount = items.filter((n) => !n.read).length
  const visibleItems = filter === 'unread' ? items.filter((n) => !n.read) : items

  const handleMarkAsRead = (id: string) => {
    if (!token) return
    dispatch(markNotificationAsRead({ token, id }))
  }

  const handleMarkAllAsRead = () => {
    if (!token || unreadCount === 0) return
    dispatch(markAllNotificationsAsRead({ token }))
  }

  const handleOpenGroup = (notification: NotificationItem, groupId: string) => {
    if (!notification.read && token) {
      dispatch(markNotificationAsRead({ token, id: notification._id }))
    }
    onOpenGroup(groupId)
  }

  const subtitle =
    unreadCount > 0
      ? `Tienes ${unreadCount} ${unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}.`
      : 'Estás al día con tus notificaciones.'

  return (
    <section id={id} className="notifications-panel" aria-labelledby="notifications-heading">
      <header className="notifications-header">
        <div>
          <h2 id="notifications-heading">Notificaciones</h2>
          <p className="notifications-subtitle">{subtitle}</p>
        </div>
        <button type="button" className="notifications-close" onClick={onClose} aria-label="Cerrar notificaciones">
          <Icon name="close" size={18} />
        </button>
      </header>

      <div className="notifications-actions">
        <div className="notifications-filters" role="group" aria-label="Filtrar notificaciones">
          <button
            type="button"
            className={`notifications-filter${filter === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            Todas
          </button>
          <button
            type="button"
            className={`notifications-filter${filter === 'unread' ? ' is-active' : ''}`}
            onClick={() => setFilter('unread')}
            aria-pressed={filter === 'unread'}
          >
            Sin leer ({unreadCount})
          </button>
        </div>

        <button
          type="button"
          className="notifications-mark-all"
          disabled={unreadCount === 0 || markingAll}
          onClick={handleMarkAllAsRead}
        >
          {markingAll ? 'Marcando...' : 'Marcar todas como leídas'}
        </button>
      </div>

      <div className="notifications-body">
        {error && (
          <p className="notifications-message notifications-message--error" role="alert">
            {error}
          </p>
        )}

        {loading && items.length === 0 ? (
          <p className="notifications-message" role="status">
            Cargando notificaciones...
          </p>
        ) : visibleItems.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty__icon">
              <Icon name="bell" size={28} />
            </div>
            <h3>{filter === 'unread' ? 'No tienes notificaciones sin leer' : 'Todavía no tienes notificaciones'}</h3>
            <p>
              {filter === 'unread'
                ? 'Cuando se añada un gasto nuevo o se confirme un pago en tus grupos, aparecerá aquí.'
                : 'Aquí verás los avisos de nuevos gastos, pagos pendientes o confirmados y partidas de Todo o nada.'}
            </p>
          </div>
        ) : (
          <ul className="notifications-list">
            {visibleItems.map((notification) => {
              const { id: targetGroupId, name: groupName } = extractGroupInfo(notification.groupId)
              const isBusy = markingId === notification._id || markingAll

              return (
                <li
                  key={notification._id}
                  className={`notification-card${notification.read ? '' : ' notification-card--unread'}`}
                >
                  <div className="notification-card__top">
                    <div className="notification-card__meta">
                      {!notification.read && <span className="notification-card__dot" aria-label="Sin leer" />}
                      <span className={`notification-badge notification-badge--${notification.type}`}>
                        {typeLabels[notification.type] ?? 'Aviso'}
                      </span>
                      {groupName && <span className="notification-card__group">{groupName}</span>}
                    </div>
                    <time className="notification-card__date" dateTime={notification.createdAt}>
                      {formatDate(notification.createdAt)}
                    </time>
                  </div>

                  <p className="notification-card__message">{notification.message}</p>

                  <div className="notification-card__actions">
                    {!notification.read && (
                      <button
                        type="button"
                        className="notification-btn notification-btn--secondary"
                        disabled={isBusy}
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        {markingId === notification._id ? 'Marcando...' : 'Marcar leída'}
                      </button>
                    )}
                    {targetGroupId && (
                      <button
                        type="button"
                        className="notification-btn notification-btn--primary"
                        onClick={() => handleOpenGroup(notification, targetGroupId)}
                      >
                        Ver grupo <Icon name="arrow" size={14} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
