import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: string;
  cafeteria_id: string;
  available: boolean;
  Category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface MenuState {
  items: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
}

const initialState: MenuState = {
  items: [],
  categories: [],
  loading: false, // Changed from true to false to prevent initial loading state blocking
  error: null,
  isOffline: false,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'menu/fetchCategories',
  async (cafeteria: string | undefined, { rejectWithValue }) => {
    try {
      const params: any = {};
      if (cafeteria) params.cafeteria = cafeteria;
      console.log('MenuSlice: Fetching categories from /menu/categories with params:', params);
      const response = await api.get('/menu/categories', { params });
      console.log('MenuSlice: Categories fetched successfully:', response.data);
      console.log('MenuSlice: Categories response type:', typeof response.data, 'isArray:', Array.isArray(response.data));
      console.log('MenuSlice: Categories response length:', response.data?.length || 'N/A');
      if (response.data && response.data.length > 0) {
        console.log('MenuSlice: Sample categories:', response.data.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name })));
      }
      return response.data;
    } catch (error: any) {
      console.error('MenuSlice: Failed to fetch categories:', error.response?.data || error.message);
      console.error('MenuSlice: Error status:', error.response?.status, 'Error data:', error.response?.data);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch categories');
    }
  }
);

export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async ({ category, cafeteria }: { category?: string; cafeteria?: string }, { rejectWithValue }) => {
    try {
      const params: any = {};
      if (category) params.category = category;
      if (cafeteria) params.cafeteria = cafeteria;
      console.log('MenuSlice: Fetching menu items from /menu with params:', params);
      const response = await api.get('/menu', { params });
      console.log('MenuSlice: Menu items fetched successfully:', response.data);
      console.log('MenuSlice: Menu items response type:', typeof response.data, 'isArray:', Array.isArray(response.data));
      console.log('MenuSlice: Menu items response length:', response.data?.length || 'N/A');
      if (response.data && response.data.length > 0) {
        console.log('MenuSlice: First menu item sample:', {
          id: response.data[0].id,
          name: response.data[0].name,
          cafeteria_id: response.data[0].cafeteria_id,
          category: response.data[0].Category?.name
        });
        console.log('MenuSlice: Sample of all cafeteria_ids:', [...new Set(response.data.map((item: any) => item.cafeteria_id))]);
      }
      return response.data;
    } catch (error: any) {
      console.error('MenuSlice: Failed to fetch menu items:', error.response?.data || error.message);
      console.error('MenuSlice: Error status:', error.response?.status, 'Error data:', error.response?.data);

      // If it's a network error and we're offline, return cached data if available
      if (!navigator.onLine || error.code === 'NETWORK_ERROR') {
        console.log('MenuSlice: User appears to be offline, attempting to use cached data');
        // For now, just reject - in a full implementation, we'd check service worker cache
      }

      return rejectWithValue(error.response?.data?.error || 'Failed to fetch menu items');
    }
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setOfflineMode } = menuSlice.actions;
export default menuSlice.reducer;