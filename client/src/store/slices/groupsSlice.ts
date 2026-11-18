import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'

// El backend devuelve members y createdBy poblados ({ _id, name, email }).
// Se admite también el id como string por si alguna ruta no los puebla.
export interface GroupMember {
  _id: string
  name: string
  email: string
}

export interface Group {
  _id: string
  name: string
  description?: string
  inviteCode?: string
  createdBy: GroupMember | string
  members: (GroupMember | string)[]
  createdAt: string
  updatedAt: string
}

interface GroupsState {
  items: Group[]
  loading: boolean
  error: string | null
  joining: boolean
  joinError: string | null
  joinMessage: string | null
}

const initialState: GroupsState = {
  items: [],
  loading: false,
  error: null,
  joining: false,
  joinError: null,
  joinMessage: null,
}

// El token viene de authSlice. El backend deduce el usuario del JWT.
export const fetchMyGroups = createAsyncThunk<Group[], string, { rejectValue: string }>(
  'groups/fetchMyGroups',
  async (token, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        return rejectWithValue(
          response.status === 401
            ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
            : 'No se pudieron obtener tus grupos.'
        )
      }

      const groups: unknown = await response.json()
      if (!Array.isArray(groups)) {
        return rejectWithValue('La respuesta del servidor no es válida.')
      }
      return groups as Group[]
    } catch {
      return rejectWithValue('No se pudo conectar con el servidor.')
    }
  }
)

interface JoinGroupArgs {
  token: string
  inviteCode: string
}

interface JoinGroupResult {
  message: string
  group: Group
}

// POST /api/groups/join con { inviteCode }. El backend añade al usuario del JWT a los miembros.
export const joinGroup = createAsyncThunk<JoinGroupResult, JoinGroupArgs, { rejectValue: string }>(
  'groups/joinGroup',
  async ({ token, inviteCode }, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:5000/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      })

      const data: { message?: string; group?: Group } = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
        }
        return rejectWithValue(data.message ?? 'No se pudo unir al grupo.')
      }

      if (!data.group) {
        return rejectWithValue('La respuesta del servidor no es válida.')
      }
      return {
        message: data.message ?? 'Te has unido al grupo correctamente',
        group: data.group,
      }
    } catch {
      return rejectWithValue('No se pudo conectar con el servidor.')
    }
  }
)

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    clearJoinStatus: (state) => {
      state.joinError = null
      state.joinMessage = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyGroups.pending, (state) => {
        state.loading = true
        state.error = null
        state.items = []
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Error al cargar los grupos.'
      })
      .addCase(joinGroup.pending, (state) => {
        state.joining = true
        state.joinError = null
        state.joinMessage = null
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.joining = false
        state.joinMessage = action.payload.message
        const { group } = action.payload
        const index = state.items.findIndex((item) => item._id === group._id)
        if (index >= 0) state.items[index] = group
        else state.items.push(group)
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.joining = false
        state.joinError = action.payload ?? 'Error al unirse al grupo.'
      })
      .addCase(logout, () => initialState)
  },
})

export const { clearJoinStatus } = groupsSlice.actions
export default groupsSlice.reducer
