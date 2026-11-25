import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'

export type NotificationType =
  | 'expense_created'
  | 'payment_created'
  | 'payment_completed'
  | 'all_or_nothing'
  | 'low_trust_score'

export interface NotificationGroupRef {
  _id: string
  name: string
}

export interface NotificationItem {
  _id: string
  userId: string
  groupId: NotificationGroupRef | string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
  updatedAt: string
}

interface NotificationsState {
  items: NotificationItem[]
  loading: boolean
  error: string | null
  markingId: string | null
  markingAll: boolean
}

const initialState: NotificationsState = {
  items: [],
  loading: false,
  error: null,
  markingId: null,
  markingAll: false,
}

export const fetchNotifications = createAsyncThunk<
  NotificationItem[],
  { token: string; unreadOnly?: boolean },
  { rejectValue: string }
>('notifications/fetchNotifications', async ({ token, unreadOnly = false }, { rejectWithValue }) => {
  try {
    const query = unreadOnly ? '?unreadOnly=true' : ''
    const response = await fetch(`http://localhost:5000/api/notifications${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      const message = (data as { message?: string } | null)?.message
      return rejectWithValue(message ?? 'No se pudieron cargar las notificaciones.')
    }

    if (!Array.isArray(data)) {
      return rejectWithValue('La respuesta del servidor no es válida.')
    }
    return data as NotificationItem[]
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

export const markNotificationAsRead = createAsyncThunk<
  NotificationItem,
  { token: string; id: string },
  { rejectValue: string }
>('notifications/markNotificationAsRead', async ({ token, id }, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/notifications/${encodeURIComponent(id)}/read`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    const data: Partial<NotificationItem> & { message?: string } = await response
      .json()
      .catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      return rejectWithValue(data.message ?? 'No se pudo marcar la notificación como leída.')
    }

    if (!data._id) {
      return rejectWithValue('La respuesta del servidor no es válida.')
    }
    return data as NotificationItem
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

export const markAllNotificationsAsRead = createAsyncThunk<
  void,
  { token: string },
  { rejectValue: string }
>('notifications/markAllNotificationsAsRead', async ({ token }, { rejectWithValue }) => {
  try {
    const response = await fetch('http://localhost:5000/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })

    const data: { message?: string } | null = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      return rejectWithValue(data?.message ?? 'No se pudieron marcar las notificaciones como leídas.')
    }
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Error al cargar las notificaciones.'
      })
      .addCase(markNotificationAsRead.pending, (state, action) => {
        state.markingId = action.meta.arg.id
        state.error = null
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.markingId = null
        const updated = action.payload
        const index = state.items.findIndex((item) => item._id === updated._id)
        if (index >= 0) {
          state.items[index] = { ...state.items[index], ...updated, read: true }
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.markingId = null
        state.error = action.payload ?? 'Error al marcar la notificación.'
      })
      .addCase(markAllNotificationsAsRead.pending, (state) => {
        state.markingAll = true
        state.error = null
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.markingAll = false
        state.items = state.items.map((item) => ({ ...item, read: true }))
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.markingAll = false
        state.error = action.payload ?? 'Error al marcar todas las notificaciones.'
      })
      .addCase(logout, () => initialState)
  },
})

export default notificationsSlice.reducer
