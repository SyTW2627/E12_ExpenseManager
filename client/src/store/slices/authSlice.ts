import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

const API_BASE_URL = 'http://localhost:5000/api/auth';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  notice: string | null;
}

// Recuperar sesión en el navegador si existe
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  isAuthenticated: !!storedToken,
  loading: false,
  error: null,
  notice: null,
};

// Acción para iniciar sesión
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Credenciales incorrectas');
      }

      // Guardar token y usuario en localStorage
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error de conexión con el servidor');
    }
  }
);

// Acción para registrar un nuevo usuario
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Error en el registro');
      }

      // Si el backend devuelve token al registrar, lo persistimos
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error de conexión con el servidor');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.notice = null;
    },
    clearFeedback: (state) => {
      state.error = null;
      state.notice = null;
    },
  },
  extraReducers: (builder) => {
    // LoginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<{ user: User; token?: string; message?: string }>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token ?? null;
        state.notice = action.payload.message || '¡Inicio de sesión exitoso!';
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'No se pudo iniciar sesión';
      });

    // RegisterUser
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<{ user: User; token?: string; message?: string }>) => {
        state.loading = false;
        if (action.payload.token) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
        }
        state.user = action.payload.user;
        state.notice = action.payload.message || '¡Cuenta creada con éxito!';
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'No se pudo registrar la cuenta';
      });
  },
});

export const { logout, clearFeedback } = authSlice.actions;
export default authSlice.reducer;