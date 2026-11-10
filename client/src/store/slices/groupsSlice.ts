import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'

export interface Group {
  _id: string
  name: string
  description?: string
  createdBy: string
  members: string[]
  createdAt: string
  updatedAt: string
}

interface GroupsState {
  items: Group[]
  loading: boolean
  error: string | null
}

const initialState: GroupsState = {
  items: [],
  loading: false,
  error: null,
}

// El token viene de authSlice. El backend deduce el usuario del JWT.
export const fetchMyGroups = createAsyncThunk<Group[], string, { rejectValue: string }>(
  'groups/fetchMyGroups',
  async (token, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:5000/api/groups/me', {
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

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {},
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
      .addCase(logout, () => initialState)
  },
})

export default groupsSlice.reducer
