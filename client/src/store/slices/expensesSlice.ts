import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { GroupMember } from './groupsSlice'

export type SplitMode = 'equal' | 'percentage'

export interface ExpenseParticipant {
  userId: GroupMember | string
  share: number
}

export interface Expense {
  _id: string
  groupId: string
  payerId: GroupMember | string
  concept: string
  amount: number
  splitMode: SplitMode | 'roulette'
  participants: ExpenseParticipant[]
  createdAt: string
  updatedAt: string
}

export interface NewExpense {
  groupId: string
  concept: string
  amount: number
  payerId: string
  splitMode: SplitMode
  participants: { userId: string; share: number }[]
}

interface ExpensesState {
  creating: boolean
  createError: string | null
  createMessage: string | null
}

const initialState: ExpensesState = {
  creating: false,
  createError: null,
  createMessage: null,
}

// POST /api/expenses. El backend comprueba que el pagador y los participantes sean del grupo.
export const createExpense = createAsyncThunk<
  Expense,
  { token: string; expense: NewExpense },
  { rejectValue: string }
>('expenses/createExpense', async ({ token, expense }, { rejectWithValue }) => {
  try {
    const response = await fetch('http://localhost:5000/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(expense),
    })

    const data: Partial<Expense> & { message?: string } = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      return rejectWithValue(data.message ?? 'No se pudo crear el gasto.')
    }

    if (!data._id) {
      return rejectWithValue('La respuesta del servidor no es válida.')
    }
    return data as Expense
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearCreateStatus: (state) => {
      state.createError = null
      state.createMessage = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createExpense.pending, (state) => {
        state.creating = true
        state.createError = null
        state.createMessage = null
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.creating = false
        state.createMessage = `Gasto "${action.payload.concept}" añadido correctamente.`
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.creating = false
        state.createError = action.payload ?? 'Error al crear el gasto.'
      })
      .addCase(logout, () => initialState)
  },
})

export const { clearCreateStatus } = expensesSlice.actions
export default expensesSlice.reducer
