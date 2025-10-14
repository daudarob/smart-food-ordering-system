import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  order_items: Array<{
    quantity: number;
    price: number;
    menu_item: {
      name: string;
    };
  }>;
}

interface AdminState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  orders: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchAllOrders = createAsyncThunk(
  'admin/fetchAllOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/orders');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'admin/updateOrderStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      return { id, status };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update order status');
    }
  }
);

export const createCategory = createAsyncThunk(
  'admin/createCategory',
  async ({ name, description }: { name: string; description?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/categories', { name, description });
      console.log('Category created:', response.data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'admin/updateCategory',
  async ({ id, name, description }: { id: string; name?: string; description?: string }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/categories/${id}`, { name, description });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'admin/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete category');
    }
  }
);

export const createMenuItem = createAsyncThunk(
  'admin/createMenuItem',
  async ({ name, description, price, category_id, image_url, available }: { name: string; description: string; price: number; category_id: string; image_url?: string; available?: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/menu', { name, description, price, category_id, image_url, available });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create menu item');
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'admin/updateMenuItem',
  async ({ id, name, description, price, category_id, image_url, available }: { id: string; name?: string; description?: string; price?: number; category_id?: string; image_url?: string; available?: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/menu/${id}`, { name, description, price, category_id, image_url, available });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update menu item');
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'admin/deleteMenuItem',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/menu/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete menu item');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateOrderStatusLocally: (state, action) => {
      const order = state.orders.find(o => o.id === action.payload.id);
      if (order) order.status = action.payload.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action: PayloadAction<{ id: string; status: string }>) => {
        state.loading = false;
        const order = state.orders.find(o => o.id === action.payload.id);
        if (order) order.status = action.payload.status;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateOrderStatusLocally } = adminSlice.actions;
export default adminSlice.reducer;