import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

interface Order {
  id: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  mpesa_receipt_number: string | null;
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

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: string;
  available: boolean;
  stock?: number;
  Category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Discount {
  id: number;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'global' | 'category' | 'item';
  category_id?: string;
  menu_item_id?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_limit?: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  menuItem?: MenuItem;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  notes?: string;
  payment_terms?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  Cafeteria?: {
    name: string;
  };
  creator?: {
    name: string;
  };
}

interface PriceHistoryItem {
  id: number;
  menu_item_id: string;
  old_price: number;
  new_price: number;
  change_type: 'individual' | 'bulk_percentage' | 'bulk_fixed';
  change_reason?: string;
  changed_by: string;
  cafeteria_id: string;
  created_at: string;
  updated_at: string;
  menuItem?: {
    name: string;
    description: string;
  };
  changedBy?: {
    name: string;
    email: string;
  };
}

interface AdminState {
  orders: Order[];
  menuItems: MenuItem[];
  categories: Category[];
  discounts: Discount[];
  invoices: Invoice[];
  priceHistory: PriceHistoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  orders: [],
  menuItems: [],
  categories: [],
  discounts: [],
  invoices: [],
  priceHistory: [],
  loading: false, // Changed from true to false to prevent initial loading state blocking
  error: null,
};

// Async thunks
export const fetchAllOrders = createAsyncThunk(
  'admin/fetchAllOrders',
  async (_, { rejectWithValue }) => {
    try {
      console.log('AdminSlice: Fetching all orders from /admin/orders');
      const response = await api.get('/admin/orders');
      console.log('AdminSlice: Orders fetched successfully:', response.data);
      console.log('AdminSlice: Orders response type:', typeof response.data, 'isArray:', Array.isArray(response.data));
      console.log('AdminSlice: Orders response length:', response.data?.length || 'N/A');
      console.log('AdminSlice: First order sample:', response.data?.[0] || 'No orders');
      return response.data;
    } catch (error: any) {
      console.error('AdminSlice: Failed to fetch orders:', error.response?.data || error.message);
      console.error('AdminSlice: Error status:', error.response?.status, 'Error data:', error.response?.data);
      console.error('AdminSlice: Full error object:', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'admin/updateOrderStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.put(`/admin/orders/${id}/status`, { status });
      const { invoiceGenerated } = response.data;

      // If an invoice was generated, refresh the invoices list
      if (invoiceGenerated) {
        dispatch(fetchInvoices({}));
      }

      return { id, status, invoiceGenerated };
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
  async ({ name, description, price, category_id, image_url, available, stock }: { name: string; description: string; price: number; category_id: string; image_url?: string; available?: boolean; stock?: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/menu', { name, description, price, category_id, image_url, available, stock });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create menu item');
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'admin/updateMenuItem',
  async ({ id, name, description, price, category_id, image_url, available, stock }: { id: string; name?: string; description?: string; price?: number; category_id?: string; image_url?: string; available?: boolean; stock?: number }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/menu/${id}`, { name, description, price, category_id, image_url, available, stock });
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

// Fetch menu items for admin
export const fetchAdminMenuItems = createAsyncThunk(
  'admin/fetchAdminMenuItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/menu');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch menu items');
    }
  }
);

// Fetch categories for admin
export const fetchAdminCategories = createAsyncThunk(
  'admin/fetchAdminCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/menu/categories');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch categories');
    }
  }
);

// Update menu item stock
export const updateMenuItemStock = createAsyncThunk(
  'admin/updateMenuItemStock',
  async ({ id, stock }: { id: string; stock: number }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/menu/${id}`, { stock });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update stock');
    }
  }
);

// Discount async thunks
export const fetchDiscounts = createAsyncThunk(
  'admin/fetchDiscounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/discounts');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch discounts');
    }
  }
);

export const createDiscount = createAsyncThunk(
  'admin/createDiscount',
  async (discountData: Omit<Discount, 'id' | 'created_at' | 'updated_at' | 'usage_count'>, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/discounts', discountData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create discount');
    }
  }
);

export const updateDiscount = createAsyncThunk(
  'admin/updateDiscount',
  async ({ id, ...discountData }: Partial<Discount> & { id: number }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/discounts/${id}`, discountData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update discount');
    }
  }
);

export const deleteDiscount = createAsyncThunk(
  'admin/deleteDiscount',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/discounts/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete discount');
    }
  }
);

export const toggleDiscountStatus = createAsyncThunk(
  'admin/toggleDiscountStatus',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/discounts/${id}/toggle`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to toggle discount status');
    }
  }
);

// Invoice async thunks
export const fetchInvoices = createAsyncThunk(
  'admin/fetchInvoices',
  async (params: { page?: number; limit?: number; search?: string; status?: string; start_date?: string; end_date?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/invoices', { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch invoices');
    }
  }
);

export const createInvoice = createAsyncThunk(
  'admin/createInvoice',
  async (invoiceData: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/invoices', invoiceData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create invoice');
    }
  }
);

export const updateInvoice = createAsyncThunk(
  'admin/updateInvoice',
  async ({ id, ...invoiceData }: Partial<Invoice> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/admin/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update invoice');
    }
  }
);

export const deleteInvoice = createAsyncThunk(
  'admin/deleteInvoice',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/invoices/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete invoice');
    }
  }
);

export const generateInvoicePDF = createAsyncThunk(
  'admin/generateInvoicePDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/invoices/${id}/pdf`, {
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `invoice-${id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to generate PDF');
    }
  }
);

// Price History async thunks
export const fetchPriceHistory = createAsyncThunk(
  'admin/fetchPriceHistory',
  async (params: { page?: number; limit?: number; menu_item_id?: string; start_date?: string; end_date?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/price-history', { params });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch price history');
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
        console.log('AdminSlice: Orders stored in state:', state.orders.length, 'orders');
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
      })
      .addCase(fetchAdminMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminMenuItems.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.loading = false;
        state.menuItems = action.payload;
      })
      .addCase(fetchAdminMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAdminCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchAdminCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMenuItemStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMenuItemStock.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.loading = false;
        const index = state.menuItems.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.menuItems[index] = action.payload;
        }
      })
      .addCase(updateMenuItemStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Discount reducers
      .addCase(fetchDiscounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscounts.fulfilled, (state, action: PayloadAction<Discount[]>) => {
        state.loading = false;
        state.discounts = action.payload;
      })
      .addCase(fetchDiscounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.loading = false;
        state.menuItems.push(action.payload);
        // Clear any existing error
        state.error = null;
      })
      .addCase(createMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.loading = false;
        const index = state.menuItems.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.menuItems[index] = action.payload;
        }
        // Clear any existing error
        state.error = null;
      })
      .addCase(updateMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMenuItem.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.menuItems = state.menuItems.filter(item => item.id !== action.payload);
        // Clear any existing error
        state.error = null;
      })
      .addCase(deleteMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        state.categories.push(action.payload);
        // Clear any existing error
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.loading = false;
        const index = state.categories.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        // Clear any existing error
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.categories = state.categories.filter(cat => cat.id !== action.payload);
        // Clear any existing error
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDiscount.fulfilled, (state, action: PayloadAction<Discount>) => {
        state.loading = false;
        state.discounts.push(action.payload);
      })
      .addCase(createDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDiscount.fulfilled, (state, action: PayloadAction<Discount>) => {
        state.loading = false;
        const index = state.discounts.findIndex(discount => discount.id === action.payload.id);
        if (index !== -1) {
          state.discounts[index] = action.payload;
        }
      })
      .addCase(updateDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteDiscount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDiscount.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.discounts = state.discounts.filter(discount => discount.id !== action.payload);
      })
      .addCase(deleteDiscount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleDiscountStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleDiscountStatus.fulfilled, (state, action: PayloadAction<Discount>) => {
        state.loading = false;
        const index = state.discounts.findIndex(discount => discount.id === action.payload.id);
        if (index !== -1) {
          state.discounts[index] = action.payload;
        }
      })
      .addCase(toggleDiscountStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Invoice reducers
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<{ invoices: Invoice[]; pagination: any }>) => {
        state.loading = false;
        state.invoices = action.payload.invoices;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        state.invoices.unshift(action.payload);
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        const index = state.invoices.findIndex(invoice => invoice.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.invoices = state.invoices.filter(invoice => invoice.id !== action.payload);
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(generateInvoicePDF.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateInvoicePDF.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateInvoicePDF.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Price History reducers
      .addCase(fetchPriceHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPriceHistory.fulfilled, (state, action: PayloadAction<{ priceHistory: PriceHistoryItem[]; pagination: any }>) => {
        state.loading = false;
        state.priceHistory = action.payload.priceHistory;
      })
      .addCase(fetchPriceHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateOrderStatusLocally } = adminSlice.actions;
export default adminSlice.reducer;