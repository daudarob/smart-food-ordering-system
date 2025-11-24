import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  cafeteria_id?: string;
  profile_picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialAuthChecked: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  initialAuthChecked: false,
  error: null,
};

// Initialize auth from localStorage
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      // Verify token with backend
      const response = await api.get('/auth/verify');
      console.log('Frontend: Token verified, user data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Frontend: Token verification failed:', error.response?.data || error.message);
      localStorage.removeItem('token');
      return rejectWithValue('Session expired');
    }
  }
);

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Frontend: Attempting login for', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Frontend: Login response received:', response.data);
      const { userId, token, name, role, email: responseEmail, cafeteria_id } = response.data;
      localStorage.setItem('token', token);
      console.log('Frontend: Token stored, returning user data');
      return { id: userId, email: responseEmail, name, role, cafeteria_id };
    } catch (error: any) {
      console.error('Frontend: Login error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      console.log('Frontend: Attempting registration for', email);
      const response = await api.post('/auth/register', { email, password, name });
      console.log('Frontend: Registration response received:', response.data);
      const { userId, token, name: responseName, role, email: responseEmail } = response.data;
      localStorage.setItem('token', token);
      console.log('Frontend: Token stored, returning user data');
      return { id: userId, name: responseName, email: responseEmail, role };
    } catch (error: any) {
      console.error('Frontend: Registration error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ name, phone, address }: { name: string; phone: string; address: string }, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/profile', { name, phone, address });
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Profile update failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialAuthChecked = true;
        state.error = null;
        console.log('Redux: Auth initialized, user set:', action.payload);
        console.log('Redux: Auth state after init - isAuthenticated:', state.isAuthenticated, 'user:', state.user);
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.initialAuthChecked = true;
        state.error = null;
        console.log('Redux: Auth initialization failed');
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        console.log('Redux: Login fulfilled, user set:', action.payload);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.log('Redux: Login rejected, error:', action.payload);
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        console.log('Redux: Registration fulfilled, user set:', action.payload);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.log('Redux: Registration rejected, error:', action.payload);
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;