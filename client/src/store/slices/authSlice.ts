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
  profileSaving: boolean;
  profileError: string | null;
  profileNotice: string | null;
  deletingAccount: boolean;
  deleteError: string | null;
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
  profileSaving: false,
  profileError: null,
  profileNotice: null,
  deletingAccount: false,
  deleteError: null,
};

const USERS_URL = 'http://localhost:5000/api/users';

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

// PATCH /api/users/:id. El backend solo permite cambiar el nombre y el correo.
export const updateProfile = createAsyncThunk<
  { name: string; email: string },
  { token: string; userId: string; name: string; email: string },
  { rejectValue: string }
>('auth/updateProfile', async ({ token, userId, name, email }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${USERS_URL}/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      if (data.code === 11000) return rejectWithValue('Ese correo electrónico ya está en uso.');
      return rejectWithValue(data.message ?? 'No se pudo actualizar el perfil.');
    }

    return { name: data.name ?? name, email: data.email ?? email };
  } catch {
    return rejectWithValue('No se pudo conectar con el servidor.');
  }
});

// DELETE /api/users/:id. Después hay que cerrar la sesión con logout().
export const deleteAccount = createAsyncThunk<void, { token: string; userId: string }, { rejectValue: string }>(
  'auth/deleteAccount',
  async ({ token, userId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${USERS_URL}/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) return rejectWithValue('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        return rejectWithValue(data.message ?? 'No se pudo eliminar la cuenta.');
      }
    } catch {
      return rejectWithValue('No se pudo conectar con el servidor.');
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
      state.profileError = null;
      state.profileNotice = null;
      state.deleteError = null;
    },
    clearFeedback: (state) => {
      state.error = null;
      state.notice = null;
    },
    clearProfileFeedback: (state) => {
      state.profileError = null;
      state.profileNotice = null;
      state.deleteError = null;
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

    // Perfil
    builder
      .addCase(updateProfile.pending, (state) => {
        state.profileSaving = true;
        state.profileError = null;
        state.profileNotice = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profileSaving = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          localStorage.setItem('user', JSON.stringify(state.user));
        }
        state.profileNotice = 'Perfil actualizado correctamente.';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.profileSaving = false;
        state.profileError = action.payload ?? 'No se pudo actualizar el perfil.';
      })
      .addCase(deleteAccount.pending, (state) => {
        state.deletingAccount = true;
        state.deleteError = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.deletingAccount = false;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.deletingAccount = false;
        state.deleteError = action.payload ?? 'No se pudo eliminar la cuenta.';
      });
  },
});

export const { logout, clearFeedback, clearProfileFeedback } = authSlice.actions;
export default authSlice.reducer;