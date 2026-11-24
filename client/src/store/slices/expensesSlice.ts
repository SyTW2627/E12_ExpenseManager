import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { logout } from './authSlice'
import type { GroupMember } from './groupsSlice'

export type SplitMode = 'equal' | 'percentage' | 'roulette'

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

export interface MemberBalance {
  user: GroupMember
  balance: number
}

export interface SettlementTransaction {
  from: GroupMember
  to: GroupMember
  amount: number
}

export interface GroupBalances {
  groupId: string
  balances: MemberBalance[]
  transactions: SettlementTransaction[]
}

interface ExpensesState {
  balances: GroupBalances | null
  balancesLoading: boolean
  balancesError: string | null
  items: Expense[]
  listGroupId: string | null
  loading: boolean
  error: string | null
  creating: boolean
  createError: string | null
  createMessage: string | null
}

const initialState: ExpensesState = {
  balances: null,
  balancesLoading: false,
  balancesError: null,
  items: [],
  listGroupId: null,
  loading: false,
  error: null,
  creating: false,
  createError: null,
  createMessage: null,
}

export const fetchGroupBalances = createAsyncThunk<
  GroupBalances,
  { token: string; groupId: string },
  { rejectValue: string }
>('expenses/fetchGroupBalances', async ({ token, groupId }, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/expenses/simplified/${encodeURIComponent(groupId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const data: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      const message = (data as { message?: string } | null)?.message
      return rejectWithValue(message ?? 'No se pudieron calcular los saldos del grupo.')
    }

    const result = data as Partial<GroupBalances> | null
    if (!result || !Array.isArray(result.balances) || !Array.isArray(result.transactions)) {
      return rejectWithValue('La respuesta del servidor no es válida.')
    }
    return { groupId, balances: result.balances, transactions: result.transactions }
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

export const fetchGroupExpenses = createAsyncThunk<
  Expense[],
  { token: string; groupId: string },
  { rejectValue: string }
>('expenses/fetchGroupExpenses', async ({ token, groupId }, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/expenses?groupId=${encodeURIComponent(groupId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const data: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      if (response.status === 401) {
        return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.')
      }
      const message = (data as { message?: string } | null)?.message
      return rejectWithValue(message ?? 'No se pudieron obtener los gastos del grupo.')
    }

    if (!Array.isArray(data)) {
      return rejectWithValue('La respuesta del servidor no es válida.')
    }
    return data as Expense[]
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.')
  }
})

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
        if (String(action.payload.groupId) === state.listGroupId) {
          state.items.unshift(action.payload)
        }
      })
      .addCase(fetchGroupBalances.pending, (state, action) => {
        state.balancesLoading = true
        state.balancesError = null
        if (state.balances?.groupId !== action.meta.arg.groupId) state.balances = null
      })
      .addCase(fetchGroupBalances.fulfilled, (state, action) => {
        state.balancesLoading = false
        state.balances = action.payload
      })
      .addCase(fetchGroupBalances.rejected, (state, action) => {
        state.balancesLoading = false
        state.balancesError = action.payload ?? 'Error al cargar los saldos.'
      })
      .addCase(fetchGroupExpenses.pending, (state, action) => {
        state.loading = true
        state.error = null
        if (state.listGroupId !== action.meta.arg.groupId) {
          state.items = []
          state.listGroupId = action.meta.arg.groupId
        }
      })
      .addCase(fetchGroupExpenses.fulfilled, (state, action) => {
        if (state.listGroupId !== action.meta.arg.groupId) return
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchGroupExpenses.rejected, (state, action) => {
        if (state.listGroupId !== action.meta.arg.groupId) return
        state.loading = false
        state.error = action.payload ?? 'Error al cargar los gastos.'
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
