import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { fetchAllOrders, updateOrderStatus, fetchAdminMenuItems, fetchAdminCategories, createMenuItem, updateMenuItem, deleteMenuItem, createCategory, updateCategory, updateMenuItemStock, fetchDiscounts, createDiscount, updateDiscount, deleteDiscount, toggleDiscountStatus, fetchInvoices, createInvoice, updateInvoice, deleteInvoice, generateInvoicePDF, fetchPriceHistory } from '../redux/adminSlice';
import Table from '../components/Table';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  console.log('AdminDashboard: Component rendering start');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, initialAuthChecked } = useSelector((state: RootState) => state.auth);
  const { orders, menuItems, categories, discounts, invoices, priceHistory, loading, error } = useSelector((state: RootState) => state.admin);
  console.log('AdminDashboard: Auth state - isAuthenticated:', isAuthenticated, 'user:', user);
  console.log('AdminDashboard: Admin state - loading:', loading, 'error:', error, 'orders length:', orders.length, 'menuItems length:', menuItems.length, 'categories length:', categories.length, 'discounts length:', discounts.length);
  const [activeTab, setActiveTab] = useState('orders');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Menu management state
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    available: true,
    stock: ''
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  // Reports state
  const [reportType, setReportType] = useState('daily');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Price management state
  const [bulkPriceUpdate, setBulkPriceUpdate] = useState({
    categoryId: '',
    percentage: '',
    fixedAmount: '',
    updateType: 'percentage' // 'percentage' or 'fixed'
  });
  const [priceUpdateStatus, setPriceUpdateStatus] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
    itemId?: string;
  }>({ type: null, message: '' });
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);

  // Discount management state
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    scope: 'global' as 'global' | 'category' | 'item',
    category_id: '',
    menu_item_id: '',
    start_date: '',
    end_date: '',
    usage_limit: undefined as number | undefined
  });
  const [editingDiscount, setEditingDiscount] = useState<any>(null);

  // Invoice management state
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [currentInvoicePage, setCurrentInvoicePage] = useState(1);
  const [invoicePageSize] = useState(10);
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: 0,
    discount_amount: 0,
    due_date: '',
    notes: '',
    payment_terms: 'Net 30'
  });

  // Authentication check
  useEffect(() => {
    console.log('AdminDashboard: Auth check - isAuthenticated:', isAuthenticated, 'user:', user, 'authLoading:', authLoading, 'initialAuthChecked:', initialAuthChecked);
    if (!initialAuthChecked) {
      console.log('AdminDashboard: Initial auth check not completed, waiting...');
      return;
    }
    if (!isAuthenticated || !user) {
      console.log('AdminDashboard: Not authenticated, navigating to /login');
      navigate('/login');
      return;
    }

    if (user.role !== 'cafeteria_admin') {
      console.log('AdminDashboard: User role not cafeteria_admin, navigating to /');
      navigate('/');
      return;
    }
    console.log('AdminDashboard: Auth check passed, user is cafeteria_admin');
  }, [isAuthenticated, user, authLoading, initialAuthChecked, navigate]);

  // Fetch initial data
  useEffect(() => {
    if (isAuthenticated && user?.role === 'cafeteria_admin') {
      dispatch(fetchAllOrders());
      dispatch(fetchAdminMenuItems());
      dispatch(fetchAdminCategories());
      dispatch(fetchDiscounts());
      dispatch(fetchInvoices({}));
      dispatch(fetchPriceHistory({}));
    }
  }, [dispatch, isAuthenticated, user]);

  // Filter and sort orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const orderDate = new Date(order.created_at);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate);
    return matchesStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
    if (sortColumn === null) return 0;
    const aValue = a[Object.keys(a)[sortColumn] as keyof typeof a];
    const bValue = b[Object.keys(b)[sortColumn] as keyof typeof b];
    if (aValue == null || bValue == null) return 0;
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter payments (using orders data)
  const filteredPayments = orders.filter(order => {
    const matchesPaymentStatus = !paymentStatusFilter || order.payment_status === paymentStatusFilter;
    const orderDate = new Date(order.created_at);
    const matchesStartDate = !paymentStartDate || orderDate >= new Date(paymentStartDate);
    const matchesEndDate = !paymentEndDate || orderDate <= new Date(paymentEndDate);
    return matchesPaymentStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
    const aDate = new Date(a.created_at);
    const bDate = new Date(b.created_at);
    return bDate.getTime() - aDate.getTime(); // Most recent first
  });

  const handleSort = (column: number) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const result = await dispatch(updateOrderStatus({ id: orderId, status: newStatus }));
      if (result.payload && (result.payload as any).invoiceGenerated) {
        alert('Order status updated successfully! An invoice has been automatically generated.');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Menu management handlers
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createMenuItem({
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: parseFloat(newMenuItem.price),
        category_id: newMenuItem.category_id,
        image_url: newMenuItem.image_url,
        available: newMenuItem.available,
        stock: parseInt(newMenuItem.stock) || 0
      }));
      setShowAddMenuItem(false);
      setNewMenuItem({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        available: true,
        stock: ''
      });
      dispatch(fetchAdminMenuItems());
    } catch (error) {
      console.error('Failed to add menu item:', error);
      alert('Failed to add menu item. Please try again.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createCategory({
        name: newCategory.name,
        description: newCategory.description
      }));
      setShowAddCategory(false);
      setNewCategory({
        name: '',
        description: ''
      });
      dispatch(fetchAdminCategories());
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('Failed to add category. Please try again.');
    }
  };

  const handleEditMenuItem = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await dispatch(updateMenuItem({
        id,
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        category_id: editingItem.category_id,
        available: editingItem.available,
        stock: editingItem.stock
      }));
      setEditingItem(null);
      dispatch(fetchAdminMenuItems());
    } catch (error) {
      console.error('Failed to update menu item:', error);
      alert('Failed to update menu item. Please try again.');
    }
  };

  const handleEditCategory = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await dispatch(updateCategory({
        id,
        name: editingCategory.name,
        description: editingCategory.description
      }));
      setEditingCategory(null);
      dispatch(fetchAdminCategories());
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await dispatch(deleteMenuItem(id));
        dispatch(fetchAdminMenuItems());
      } catch (error) {
        console.error('Failed to delete menu item:', error);
        alert('Failed to delete menu item. Please try again.');
      }
    }
  };

  const handleStockUpdate = async (id: string, stock: number) => {
    try {
      await dispatch(updateMenuItemStock({ id, stock }));
      dispatch(fetchAdminMenuItems());
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };

  const handleAvailabilityToggle = async (id: string, available: boolean) => {
    try {
      await dispatch(updateMenuItem({ id, available }));
      dispatch(fetchAdminMenuItems());
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  // Reports handler
  const generateReport = () => {
    // The report is generated dynamically based on the current data and filters
    // No additional action needed as the UI updates automatically
    console.log('Generating report:', reportType, 'from', reportStartDate, 'to', reportEndDate);
  };

  // Price management handlers
  const handleIndividualPriceUpdate = async (itemId: string, newPrice: number) => {
    try {
      // Validate price
      if (newPrice < 0) {
        setPriceUpdateStatus({
          type: 'error',
          message: 'Price cannot be negative',
          itemId
        });
        setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
        throw new Error('Invalid price');
      }

      if (newPrice > 10000) {
        setPriceUpdateStatus({
          type: 'warning',
          message: 'Price seems unusually high. Please confirm.',
          itemId
        });
        setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
      }

      await dispatch(updateMenuItem({ id: itemId, price: newPrice }));

      // Show success feedback
      setPriceUpdateStatus({
        type: 'success',
        message: 'Price updated successfully',
        itemId
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 2000);

      // UI updates immediately via Redux state change, no need for additional fetch
    } catch (error: any) {
      console.error('Failed to update price:', error);

      // Show error feedback
      setPriceUpdateStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to update price. Please try again.',
        itemId
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 5000);

      throw error; // Re-throw to be handled by the calling function
    }
  };

  const handleBulkPriceUpdate = async () => {
    // Validation
    if (!bulkPriceUpdate.percentage && !bulkPriceUpdate.fixedAmount) {
      setPriceUpdateStatus({
        type: 'error',
        message: 'Please enter a percentage or fixed amount.'
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
      return;
    }

    const percentage = bulkPriceUpdate.updateType === 'percentage' ? parseFloat(bulkPriceUpdate.percentage) : 0;
    const fixedAmount = bulkPriceUpdate.updateType === 'fixed' ? parseFloat(bulkPriceUpdate.fixedAmount) : 0;

    if (bulkPriceUpdate.updateType === 'percentage' && (percentage < -50 || percentage > 100)) {
      setPriceUpdateStatus({
        type: 'error',
        message: 'Percentage must be between -50% and +100%.'
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
      return;
    }

    if (bulkPriceUpdate.updateType === 'fixed' && Math.abs(fixedAmount) > 1000) {
      setPriceUpdateStatus({
        type: 'warning',
        message: 'Fixed amount seems unusually large. Please review.'
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
    }

    // Calculate preview data
    const itemsToUpdate = menuItems.filter(item =>
      !bulkPriceUpdate.categoryId || item.category_id === bulkPriceUpdate.categoryId
    );

    if (itemsToUpdate.length === 0) {
      setPriceUpdateStatus({
        type: 'error',
        message: 'No items found matching the selected criteria.'
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
      return;
    }

    // Generate preview
    const previewData = itemsToUpdate.map(item => {
      let newPrice = item.price;
      if (bulkPriceUpdate.updateType === 'percentage' && bulkPriceUpdate.percentage) {
        newPrice = item.price * (1 + percentage / 100);
      } else if (bulkPriceUpdate.updateType === 'fixed' && bulkPriceUpdate.fixedAmount) {
        newPrice = item.price + fixedAmount;
      }
      return {
        ...item,
        newPrice: Math.max(0, Math.round(newPrice * 100) / 100), // Ensure non-negative and round to 2 decimals
        difference: Math.round((newPrice - item.price) * 100) / 100
      };
    });

    setBulkPreviewData(previewData);
    setShowBulkConfirmDialog(true);
  };

  const confirmBulkPriceUpdate = async () => {
    setShowBulkConfirmDialog(false);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of bulkPreviewData) {
        try {
          if (item.newPrice !== item.price && item.newPrice >= 0) {
            await dispatch(updateMenuItem({ id: item.id, price: item.newPrice }));
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to update price for item ${item.id}:`, error);
          failCount++;
        }
      }

      // Clear the form
      setBulkPriceUpdate({
        categoryId: '',
        percentage: '',
        fixedAmount: '',
        updateType: 'percentage'
      });
      setBulkPreviewData([]);

      // Provide feedback
      if (successCount > 0) {
        setPriceUpdateStatus({
          type: 'success',
          message: `Bulk price update completed! ${successCount} items updated successfully.${failCount > 0 ? ` ${failCount} items failed to update.` : ''}`
        });
      } else {
        setPriceUpdateStatus({
          type: 'error',
          message: 'No items were updated. Please check your input values.'
        });
      }

      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 5000);

    } catch (error) {
      console.error('Failed to apply bulk price update:', error);
      setPriceUpdateStatus({
        type: 'error',
        message: 'Failed to apply bulk price update. Please try again.'
      });
      setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 5000);
    }
  };

  // Discount management handlers
  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createDiscount({
        name: newDiscount.name,
        description: newDiscount.description,
        type: newDiscount.type,
        value: newDiscount.value,
        scope: newDiscount.scope,
        category_id: newDiscount.scope === 'category' ? newDiscount.category_id : undefined,
        menu_item_id: newDiscount.scope === 'item' ? newDiscount.menu_item_id : undefined,
        start_date: newDiscount.start_date,
        end_date: newDiscount.end_date,
        usage_limit: newDiscount.usage_limit,
        is_active: true
      }));
      setShowAddDiscount(false);
      setNewDiscount({
        name: '',
        description: '',
        type: 'percentage' as 'percentage' | 'fixed',
        value: 0,
        scope: 'global' as 'global' | 'category' | 'item',
        category_id: '',
        menu_item_id: '',
        start_date: '',
        end_date: '',
        usage_limit: undefined as number | undefined
      });
      dispatch(fetchDiscounts());
    } catch (error) {
      console.error('Failed to create discount:', error);
      alert('Failed to create discount. Please try again.');
    }
  };

  const handleUpdateDiscount = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    try {
      await dispatch(updateDiscount({
        id,
        name: editingDiscount.name,
        description: editingDiscount.description,
        type: editingDiscount.type,
        value: editingDiscount.value,
        start_date: editingDiscount.start_date,
        end_date: editingDiscount.end_date,
        usage_limit: editingDiscount.usage_limit
      }));
      setEditingDiscount(null);
      dispatch(fetchDiscounts());
    } catch (error) {
      console.error('Failed to update discount:', error);
      alert('Failed to update discount. Please try again.');
    }
  };

  const handleToggleDiscountStatus = async (id: number) => {
    try {
      await dispatch(toggleDiscountStatus(id));
      dispatch(fetchDiscounts());
    } catch (error) {
      console.error('Failed to toggle discount status:', error);
      alert('Failed to toggle discount status. Please try again.');
    }
  };

  const handleDeleteDiscount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      try {
        await dispatch(deleteDiscount(id));
        dispatch(fetchDiscounts());
      } catch (error) {
        console.error('Failed to delete discount:', error);
        alert('Failed to delete discount. Please try again.');
      }
    }
  };

  // Invoice handlers
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createInvoice(newInvoice));
      setShowAddInvoice(false);
      setNewInvoice({
        invoice_number: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        items: [{ description: '', quantity: 1, unit_price: 0 }],
        tax_rate: 0,
        discount_amount: 0,
        due_date: '',
        notes: '',
        payment_terms: 'Net 30'
      });
      dispatch(fetchInvoices({}));
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await dispatch(updateInvoice({ id, ...editingInvoice }));
      setEditingInvoice(null);
      dispatch(fetchInvoices({}));
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert('Failed to update invoice. Please try again.');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await dispatch(deleteInvoice(id));
        dispatch(fetchInvoices({}));
      } catch (error) {
        console.error('Failed to delete invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  const handleGeneratePDF = async (id: string) => {
    try {
      const result = await dispatch(generateInvoicePDF(id));
      if (result.payload && (result.payload as any).success) {
        alert('PDF downloaded successfully!');
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeInvoiceItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  // Loading state
  if (loading) {
    console.log('AdminDashboard: Rendering loading state');
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh' }}>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    console.log('AdminDashboard: Rendering error state, error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center', minHeight: '100vh' }}>
        <h2>Error loading dashboard</h2>
        <p>{error}</p>
        <button onClick={() => dispatch(fetchAllOrders())}>
          Retry
        </button>
      </div>
    );
  }

  console.log('AdminDashboard: Rendering main dashboard, activeTab:', activeTab);

  const tabs = [
    { id: 'orders', label: 'Orders' },
    { id: 'payments', label: 'Payments' },
    { id: 'menu', label: 'Menu Management' },
    { id: 'reports', label: 'Reports' },
    { id: 'prices', label: 'Price Management' },
    { id: 'discounts', label: 'Discount Management' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'invoices', label: 'Invoices' },
  ];

  console.log('AdminDashboard: About to return main JSX');
  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5', fontSize: '16px', lineHeight: '1.5' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Admin Dashboard</h1>
      <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '20px' }}>Welcome, {user?.name}!</p>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              marginRight: '10px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#007bff' : '#fff',
              color: activeTab === tab.id ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontSize: '1rem',
              fontWeight: 'bold',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '4px', minHeight: '400px' }}>
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Orders Management</h2>
            <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '20px' }}>Total Orders: {orders.length}</p>

            {/* Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />

              <button
                onClick={() => {
                  setStatusFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                style={{ padding: '10px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
              >
                Clear Filters
              </button>
            </div>

            {/* Orders Table */}
            {filteredOrders.length > 0 ? (
              <Table
                headers={['Order ID', 'Customer Name', 'Items', 'Total Amount', 'Status', 'Payment Status', 'Timestamp', 'Actions']}
                data={filteredOrders.map(order => [
                  order?.id || 'N/A',
                  order?.user?.name || 'N/A',
                  order?.order_items?.map(item => `${item?.menu_item?.name || 'Unknown'} (${item?.quantity || 0})`).join(', ') || 'No items',
                  `$${order?.total || 0}`,
                  <select
                    key={`status-${order.id}`}
                    value={order?.status || 'pending'}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    disabled={updatingOrderId === order.id}
                    style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', opacity: updatingOrderId === order.id ? 0.6 : 1, fontSize: '0.9rem' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>,
                  order?.payment_status || 'N/A',
                  order?.created_at ? new Date(order.created_at).toLocaleString() : 'N/A',
                  <button
                    key={`view-${order.id}`}
                    onClick={() => {/* TODO: Implement view details */}}
                    style={{ padding: '6px 12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    View Details
                  </button>
                ])}
                onSort={handleSort}
              />
            ) : (
              <p style={{ fontSize: '1.1rem', color: '#666', textAlign: 'center', marginTop: '20px' }}>No orders found matching the current filters.</p>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Payment Transactions</h2>
            <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '20px' }}>Total Transactions: {filteredPayments.length}</p>

            {/* Payment Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">All Payment Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>

              <input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                placeholder="Start Date"
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />

              <input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                placeholder="End Date"
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />

              <button
                onClick={() => {
                  setPaymentStatusFilter('');
                  setPaymentStartDate('');
                  setPaymentEndDate('');
                }}
                style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            </div>

            {/* Payments Table */}
            {filteredPayments.length > 0 ? (
              <Table
                headers={['Order ID', 'Customer Name', 'Amount', 'Payment Status', 'Payment Method', 'Transaction ID/Receipt', 'Timestamp']}
                data={filteredPayments.map(order => [
                  order?.id || 'N/A',
                  order?.user?.name || 'N/A',
                  `KES ${(order?.total || 0).toLocaleString()}`,
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: (order?.payment_status || 'pending') === 'paid' ? '#d4edda' : (order?.payment_status || 'pending') === 'failed' ? '#f8d7da' : '#fff3cd',
                    color: (order?.payment_status || 'pending') === 'paid' ? '#155724' : (order?.payment_status || 'pending') === 'failed' ? '#721c24' : '#856404'
                  }}>
                    {((order?.payment_status || 'pending').charAt(0).toUpperCase() + (order?.payment_status || 'pending').slice(1))}
                  </span>,
                  order?.payment_method ? order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1) : 'N/A',
                  order?.mpesa_receipt_number || 'N/A',
                  order?.created_at ? new Date(order.created_at).toLocaleString('en-KE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'
                ])}
              />
            ) : (
              <p>No payment transactions found matching the current filters.</p>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
           <div>
             {(() => { console.log('AdminDashboard: Rendering menu section, categories:', categories.length, 'menuItems:', menuItems.length); return null; })()}
             <h2 className="admin-heading" style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>Menu Management</h2>

            {/* Action Buttons */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAddMenuItem(true)}
                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Add Menu Item
              </button>
              <button
                onClick={() => setShowAddCategory(true)}
                style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Add Category
              </button>
            </div>

            {/* Categories Section */}
            <div style={{ marginBottom: '30px' }}>
              <h3 className="admin-heading">Categories</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {categories.map(category => (
                  <div key={category.id} style={{ padding: '8px 12px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{category.name}</span>
                    <button
                      onClick={() => setEditingCategory(category)}
                      style={{ padding: '2px 6px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu Items Table */}
            <h3>Menu Items</h3>
            {menuItems.length > 0 ? (
              <Table
                headers={['Name', 'Description', 'Price', 'Category', 'Stock', 'Available', 'Actions']}
                data={menuItems.map(item => [
                  item.name,
                  item.description,
                  `KES ${item.price}`,
                  item.Category?.name || 'N/A',
                  <input
                    key={`stock-${item.id}`}
                    type="number"
                    value={item.stock || 0}
                    onChange={(e) => handleStockUpdate(item.id, parseInt(e.target.value) || 0)}
                    style={{ width: '60px', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
                  />,
                  <input
                    key={`available-${item.id}`}
                    type="checkbox"
                    checked={item.available}
                    onChange={(e) => handleAvailabilityToggle(item.id, e.target.checked)}
                  />,
                  <div key={`actions-${item.id}`} style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => setEditingItem(item)}
                      style={{ padding: '4px 8px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                ])}
              />
            ) : (
              <p>No menu items found.</p>
            )}

            {/* Add Menu Item Modal */}
            {showAddMenuItem && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '500px',
                  maxWidth: '90vw'
                }}>
                  <h3>Add Menu Item</h3>
                  <form onSubmit={handleAddMenuItem}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={newMenuItem.description}
                        onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Price (KES):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Category:</label>
                      <select
                        value={newMenuItem.category_id}
                        onChange={(e) => setNewMenuItem({...newMenuItem, category_id: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Stock:</label>
                      <input
                        type="number"
                        value={newMenuItem.stock}
                        onChange={(e) => setNewMenuItem({...newMenuItem, stock: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={newMenuItem.available}
                          onChange={(e) => setNewMenuItem({...newMenuItem, available: e.target.checked})}
                        />
                        Available
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddMenuItem(false)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Add Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add Category Modal */}
            {showAddCategory && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '400px',
                  maxWidth: '90vw'
                }}>
                  <h3>Add Category</h3>
                  <form onSubmit={handleAddCategory}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(false)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Add Category
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Menu Item Modal */}
            {editingItem && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '500px',
                  maxWidth: '90vw'
                }}>
                  <h3>Edit Menu Item</h3>
                  <form onSubmit={(e) => handleEditMenuItem(e, editingItem.id)}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={editingItem.description}
                        onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Price (KES):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Category:</label>
                      <select
                        value={editingItem.category_id}
                        onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Stock:</label>
                      <input
                        type="number"
                        value={editingItem.stock || 0}
                        onChange={(e) => setEditingItem({...editingItem, stock: parseInt(e.target.value) || 0})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={editingItem.available}
                          onChange={(e) => setEditingItem({...editingItem, available: e.target.checked})}
                        />
                        Available
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Update Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '400px',
                  maxWidth: '90vw'
                }}>
                  <h3>Edit Category</h3>
                  <form onSubmit={(e) => handleEditCategory(e, editingCategory.id)}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Update Category
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'prices' && (
            <div>
              {(() => { console.log('AdminDashboard: Rendering prices section, menuItems:', menuItems.length); return null; })()}
              <h2 className="admin-heading">Price Management</h2>

              {/* Status Messages */}
              {priceUpdateStatus.type && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '20px',
                  borderRadius: '6px',
                  border: `1px solid ${
                    priceUpdateStatus.type === 'success' ? '#d4edda' :
                    priceUpdateStatus.type === 'error' ? '#f8d7da' :
                    '#fff3cd'
                  }`,
                  backgroundColor: priceUpdateStatus.type === 'success' ? '#d4edda' :
                                   priceUpdateStatus.type === 'error' ? '#f8d7da' :
                                   '#fff3cd',
                  color: priceUpdateStatus.type === 'success' ? '#155724' :
                         priceUpdateStatus.type === 'error' ? '#721c24' :
                         '#856404'
                }}>
                  <strong>
                    {priceUpdateStatus.type === 'success' ? '✓ ' :
                     priceUpdateStatus.type === 'error' ? '✗ ' :
                     '⚠ '}
                    {priceUpdateStatus.type.charAt(0).toUpperCase() + priceUpdateStatus.type.slice(1)}:
                  </strong> {priceUpdateStatus.message}
                </div>
              )}

             {/* Individual Price Updates */}
             <div style={{ marginBottom: '30px' }}>
               <h3>Individual Item Prices</h3>
               <Table
                 headers={['Item Name', 'Current Price', 'Category', 'New Price', 'Actions']}
                 data={menuItems.map(item => [
                   item.name,
                   `KES ${item.price.toFixed(2)}`,
                   item.Category?.name || 'N/A',
                   <input
                     key={`price-${item.id}-${item.price}`} // Force re-render when price changes
                     type="number"
                     step="0.01"
                     defaultValue={item.price}
                     min="0"
                     style={{ width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
                   />,
                   <button
                     key={`update-price-${item.id}`}
                     onClick={async (e) => {
                       const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                       const newPrice = parseFloat(input.value);
                       if (!isNaN(newPrice) && newPrice >= 0) {
                         try {
                           await handleIndividualPriceUpdate(item.id, newPrice);
                           // Success feedback
                           const button = e.currentTarget;
                           const originalText = button.textContent;
                           button.textContent = '✓ Updated';
                           button.style.backgroundColor = '#28a745';
                           setTimeout(() => {
                             button.textContent = originalText;
                             button.style.backgroundColor = '#28a745';
                           }, 2000);
                         } catch (error) {
                           // Error handling is done in handleIndividualPriceUpdate
                           const button = e.currentTarget;
                           button.textContent = '✗ Failed';
                           button.style.backgroundColor = '#dc3545';
                           setTimeout(() => {
                             button.textContent = 'Update';
                             button.style.backgroundColor = '#28a745';
                           }, 2000);
                         }
                       } else {
                         setPriceUpdateStatus({
                           type: 'error',
                           message: 'Please enter a valid price (0 or greater)',
                           itemId: item.id
                         });
                         setTimeout(() => setPriceUpdateStatus({ type: null, message: '' }), 3000);
                       }
                     }}
                     disabled={loading}
                     style={{
                       padding: '4px 8px',
                       backgroundColor: '#28a745',
                       color: '#fff',
                       border: 'none',
                       borderRadius: '3px',
                       cursor: loading ? 'not-allowed' : 'pointer',
                       fontSize: '12px',
                       opacity: loading ? 0.6 : 1
                     }}
                   >
                     Update
                   </button>
                 ])}
               />
               {loading && <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>Updating price...</p>}
             </div>

            {/* Bulk Price Updates */}
            <div style={{ marginBottom: '30px' }}>
              <h3>Bulk Price Updates</h3>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <label>Category:</label>
                  <select
                    value={bulkPriceUpdate.categoryId}
                    onChange={(e) => setBulkPriceUpdate({...bulkPriceUpdate, categoryId: e.target.value})}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginLeft: '5px' }}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Update Type:</label>
                  <select
                    value={bulkPriceUpdate.updateType}
                    onChange={(e) => setBulkPriceUpdate({...bulkPriceUpdate, updateType: e.target.value})}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginLeft: '5px' }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (KES)</option>
                  </select>
                </div>

                <div>
                  <label>{bulkPriceUpdate.updateType === 'percentage' ? 'Percentage:' : 'Amount (KES):'}</label>
                  <input
                    type="number"
                    step={bulkPriceUpdate.updateType === 'percentage' ? '0.1' : '0.01'}
                    value={bulkPriceUpdate.updateType === 'percentage' ? bulkPriceUpdate.percentage : bulkPriceUpdate.fixedAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (bulkPriceUpdate.updateType === 'percentage') {
                        setBulkPriceUpdate({...bulkPriceUpdate, percentage: value});
                      } else {
                        setBulkPriceUpdate({...bulkPriceUpdate, fixedAmount: value});
                      }
                    }}
                    placeholder={bulkPriceUpdate.updateType === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
                    style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginLeft: '5px' }}
                  />
                </div>

                <button
                  onClick={handleBulkPriceUpdate}
                  style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Preview Bulk Update
                </button>
              </div>

              {/* Preview of changes */}
              {bulkPriceUpdate.categoryId || bulkPriceUpdate.percentage || bulkPriceUpdate.fixedAmount ? (
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4>Preview of Changes</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#e9ecef' }}>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Current Price</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>New Price</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {menuItems
                          .filter(item => !bulkPriceUpdate.categoryId || item.category_id === bulkPriceUpdate.categoryId)
                          .slice(0, 5) // Show first 5 items as preview
                          .map(item => {
                            let newPrice = item.price;
                            if (bulkPriceUpdate.updateType === 'percentage' && bulkPriceUpdate.percentage) {
                              const percentage = parseFloat(bulkPriceUpdate.percentage);
                              newPrice = item.price * (1 + percentage / 100);
                            } else if (bulkPriceUpdate.updateType === 'fixed' && bulkPriceUpdate.fixedAmount) {
                              const fixedAmount = parseFloat(bulkPriceUpdate.fixedAmount);
                              newPrice = item.price + fixedAmount;
                            }
                            const difference = newPrice - item.price;
                            return (
                              <tr key={item.id}>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{item.name}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>KES {item.price.toFixed(2)}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>KES {newPrice.toFixed(2)}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', color: difference >= 0 ? '#28a745' : '#dc3545' }}>
                                  {difference >= 0 ? '+' : ''}KES {difference.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {menuItems.filter(item => !bulkPriceUpdate.categoryId || item.category_id === bulkPriceUpdate.categoryId).length > 5 && (
                      <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                        ... and {menuItems.filter(item => !bulkPriceUpdate.categoryId || item.category_id === bulkPriceUpdate.categoryId).length - 5} more items
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Price History */}
            <div>
              <h3>Price History</h3>
              <p style={{ color: '#6c757d', marginBottom: '15px' }}>
                Track all price changes made to menu items
              </p>

              {/* Price History Filters */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  value={''}
                  onChange={(e) => dispatch(fetchPriceHistory({ menu_item_id: e.target.value || undefined }))}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">All Items</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>

                <input
                  type="date"
                  onChange={(e) => dispatch(fetchPriceHistory({ start_date: e.target.value || undefined }))}
                  placeholder="Start Date"
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />

                <input
                  type="date"
                  onChange={(e) => dispatch(fetchPriceHistory({ end_date: e.target.value || undefined }))}
                  placeholder="End Date"
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />

                <button
                  onClick={() => dispatch(fetchPriceHistory({}))}
                  style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Refresh
                </button>
              </div>

              {/* Price History Table */}
              {priceHistory.length > 0 ? (
                <Table
                  headers={['Item Name', 'Old Price', 'New Price', 'Change', 'Type', 'Changed By', 'Date']}
                  data={priceHistory.map(history => [
                    history.menuItem?.name || 'Unknown Item',
                    `KES ${history.old_price.toFixed(2)}`,
                    `KES ${history.new_price.toFixed(2)}`,
                    <span style={{
                      color: history.new_price > history.old_price ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {history.new_price > history.old_price ? '+' : ''}KES {(history.new_price - history.old_price).toFixed(2)}
                    </span>,
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: history.change_type === 'individual' ? '#e9ecef' : '#fff3cd',
                      fontSize: '12px'
                    }}>
                      {history.change_type.replace('_', ' ').toUpperCase()}
                    </span>,
                    history.changedBy?.name || 'Unknown',
                    new Date(history.created_at).toLocaleString('en-KE')
                  ])}
                />
              ) : (
                <p style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                  No price changes recorded yet. Price changes will appear here when you update item prices.
                </p>
              )}
            </div>

            {/* Bulk Price Update Confirmation Dialog */}
            {showBulkConfirmDialog && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '90%',
                  maxWidth: '800px',
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }}>
                  <h3>Confirm Bulk Price Update</h3>
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    You are about to update prices for <strong>{bulkPreviewData.length}</strong> items.
                    This action cannot be undone. Please review the changes below:
                  </p>

                  <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Current Price</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>New Price</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #dee2e6' }}>Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreviewData.slice(0, 10).map(item => (
                          <tr key={item.id}>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{item.name}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>KES {item.price.toFixed(2)}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>KES {item.newPrice.toFixed(2)}</td>
                            <td style={{
                              padding: '8px',
                              border: '1px solid #dee2e6',
                              color: item.difference >= 0 ? '#28a745' : '#dc3545'
                            }}>
                              {item.difference >= 0 ? '+' : ''}KES {item.difference.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkPreviewData.length > 10 && (
                      <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
                        ... and {bulkPreviewData.length - 10} more items
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowBulkConfirmDialog(false);
                        setBulkPreviewData([]);
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmBulkPriceUpdate}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Confirm Update
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
            <div>
              {(() => {
                console.log('AdminDashboard: Rendering reports section');
                console.log('AdminDashboard: Reports data - orders:', orders.length, 'menuItems:', menuItems.length, 'categories:', categories.length);
                console.log('AdminDashboard: Sample order:', orders[0]);
                console.log('AdminDashboard: Sample menuItem:', menuItems[0]);
                return null;
              })()}
              <h2 className="admin-heading">Sales and Inventory Reports</h2>

            {/* Report Filters */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="daily">Daily Sales</option>
                <option value="inventory">Inventory Status</option>
                <option value="category">Category Analysis</option>
              </select>

              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />

              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />

              <button
                onClick={generateReport}
                style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Generate Report
              </button>
            </div>

            {/* Report Content */}
            {(() => { console.log('AdminDashboard: Rendering daily report'); return null; })()}
            {reportType === 'daily' && (
              <div>
                <h3>Daily Sales Report</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                    <h4>Total Revenue</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      KES {orders.filter(o => o?.payment_status === 'paid').reduce((sum, o) => sum + (o?.total || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                    <h4>Total Orders</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {orders.length}
                    </p>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                    <h4>Average Order Value</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                      KES {orders.length > 0 ? (orders.reduce((sum, o) => sum + (o?.total || 0), 0) / orders.length).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>

                <h4>Recent Orders</h4>
                <Table
                  headers={['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Time']}
                  data={orders.slice(0, 10).map(order => [
                    order?.id || 'N/A',
                    order?.user?.name || 'N/A',
                    order?.order_items?.map(item => `${item?.menu_item?.name || 'Unknown'} (${item?.quantity || 0})`).join(', ') || 'No items',
                    `KES ${order?.total || 0}`,
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: (order?.status || 'pending') === 'completed' ? '#d4edda' : (order?.status || 'pending') === 'pending' ? '#fff3cd' : '#e2e3e5',
                      color: (order?.status || 'pending') === 'completed' ? '#155724' : (order?.status || 'pending') === 'pending' ? '#856404' : '#383d41'
                    }}>
                      {order?.status || 'pending'}
                    </span>,
                    order?.created_at ? new Date(order.created_at).toLocaleString('en-KE') : 'N/A'
                  ])}
                />
              </div>
            )}

            {reportType === 'inventory' && (
              <div>
                <h3>Inventory Status Report</h3>
                <Table
                  headers={['Item Name', 'Category', 'Stock Level', 'Status', 'Price']}
                  data={menuItems.map(item => [
                    item.name,
                    item.Category?.name || 'N/A',
                    item.stock || 0,
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: (item.stock || 0) === 0 ? '#f8d7da' : (item.stock || 0) < 10 ? '#fff3cd' : '#d4edda',
                      color: (item.stock || 0) === 0 ? '#721c24' : (item.stock || 0) < 10 ? '#856404' : '#155724'
                    }}>
                      {(item.stock || 0) === 0 ? 'Out of Stock' : (item.stock || 0) < 10 ? 'Low Stock' : 'In Stock'}
                    </span>,
                    `KES ${item.price}`
                  ])}
                />
              </div>
            )}

            {reportType === 'category' && (
              <div>
                <h3>Category-wise Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  {categories.map(category => {
                    const categoryItems = menuItems.filter(item => item.category_id === category.id);
                    const totalValue = categoryItems.reduce((sum, item) => sum + ((item.stock || 0) * item.price), 0);
                    const lowStockItems = categoryItems.filter(item => (item.stock || 0) < 10);

                    return (
                      <div key={category.id} style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <h4>{category.name}</h4>
                        <p><strong>Items:</strong> {categoryItems.length}</p>
                        <p><strong>Total Value:</strong> KES {totalValue.toLocaleString()}</p>
                        <p><strong>Low Stock Items:</strong> {lowStockItems.length}</p>
                        <p><strong>Out of Stock:</strong> {categoryItems.filter(item => (item.stock || 0) === 0).length}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discounts' && (
           <div>
             {(() => { console.log('AdminDashboard: Rendering discounts section, discounts:', discounts.length); return null; })()}
             <h2 className="admin-heading">Discount Management</h2>
             <p className="admin-text">Manage discounts for menu items and categories</p>

            {/* Action Buttons */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAddDiscount(true)}
                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Create Discount
              </button>
            </div>

            {/* Discounts Table */}
            {discounts.length > 0 ? (
              <Table
                headers={['Name', 'Type', 'Value', 'Scope', 'Status', 'Valid Period', 'Usage', 'Actions']}
                data={discounts.map(discount => [
                  discount.name,
                  discount.type.charAt(0).toUpperCase() + discount.type.slice(1),
                  discount.type === 'percentage' ? `${discount.value}%` : `KES ${discount.value}`,
                  discount.scope.charAt(0).toUpperCase() + discount.scope.slice(1),
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: discount.is_active ? '#d4edda' : '#f8d7da',
                    color: discount.is_active ? '#155724' : '#721c24'
                  }}>
                    {discount.is_active ? 'Active' : 'Inactive'}
                  </span>,
                  `${new Date(discount.start_date).toLocaleDateString()} - ${new Date(discount.end_date).toLocaleDateString()}`,
                  discount.usage_limit ? `${discount.usage_count}/${discount.usage_limit}` : `${discount.usage_count}`,
                  <div key={`actions-${discount.id}`} style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => setEditingDiscount(discount)}
                      style={{ padding: '4px 8px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleDiscountStatus(discount.id)}
                      style={{ padding: '4px 8px', backgroundColor: discount.is_active ? '#dc3545' : '#28a745', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {discount.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                ])}
              />
            ) : (
              <p>No discounts found. Create your first discount to get started.</p>
            )}

            {/* Create Discount Modal */}
            {showAddDiscount && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '500px',
                  maxWidth: '90vw'
                }}>
                  <h3>Create Discount</h3>
                  <form onSubmit={handleCreateDiscount}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={newDiscount.name}
                        onChange={(e) => setNewDiscount({...newDiscount, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={newDiscount.description}
                        onChange={(e) => setNewDiscount({...newDiscount, description: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Type:</label>
                      <select
                        value={newDiscount.type}
                        onChange={(e) => setNewDiscount({...newDiscount, type: e.target.value as 'percentage' | 'fixed'})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (KES)</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Value ({newDiscount.type === 'percentage' ? '%' : 'KES'}):</label>
                      <input
                        type="number"
                        step={newDiscount.type === 'percentage' ? '0.1' : '0.01'}
                        value={newDiscount.value}
                        onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value)})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Scope:</label>
                      <select
                        value={newDiscount.scope}
                        onChange={(e) => setNewDiscount({...newDiscount, scope: e.target.value as 'global' | 'category' | 'item'})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="global">Global (All Items)</option>
                        <option value="category">Category</option>
                        <option value="item">Specific Item</option>
                      </select>
                    </div>
                    {newDiscount.scope === 'category' && (
                      <div style={{ marginBottom: '15px' }}>
                        <label>Category:</label>
                        <select
                          value={newDiscount.category_id || ''}
                          onChange={(e) => setNewDiscount({...newDiscount, category_id: e.target.value})}
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {newDiscount.scope === 'item' && (
                      <div style={{ marginBottom: '15px' }}>
                        <label>Menu Item:</label>
                        <select
                          value={newDiscount.menu_item_id || ''}
                          onChange={(e) => setNewDiscount({...newDiscount, menu_item_id: e.target.value})}
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                          <option value="">Select Item</option>
                          {menuItems.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div style={{ marginBottom: '15px' }}>
                      <label>Start Date:</label>
                      <input
                        type="datetime-local"
                        value={newDiscount.start_date}
                        onChange={(e) => setNewDiscount({...newDiscount, start_date: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>End Date:</label>
                      <input
                        type="datetime-local"
                        value={newDiscount.end_date}
                        onChange={(e) => setNewDiscount({...newDiscount, end_date: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Usage Limit (optional):</label>
                      <input
                        type="number"
                        value={newDiscount.usage_limit || ''}
                        onChange={(e) => setNewDiscount({...newDiscount, usage_limit: e.target.value ? parseInt(e.target.value) : undefined})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddDiscount(false)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Create Discount
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Discount Modal */}
            {editingDiscount && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '8px',
                  width: '500px',
                  maxWidth: '90vw'
                }}>
                  <h3>Edit Discount</h3>
                  <form onSubmit={(e) => handleUpdateDiscount(e, editingDiscount.id)}>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={editingDiscount.name}
                        onChange={(e) => setEditingDiscount({...editingDiscount, name: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Description:</label>
                      <textarea
                        value={editingDiscount.description || ''}
                        onChange={(e) => setEditingDiscount({...editingDiscount, description: e.target.value})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Type:</label>
                      <select
                        value={editingDiscount.type}
                        onChange={(e) => setEditingDiscount({...editingDiscount, type: e.target.value as 'percentage' | 'fixed'})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (KES)</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Value ({editingDiscount.type === 'percentage' ? '%' : 'KES'}):</label>
                      <input
                        type="number"
                        step={editingDiscount.type === 'percentage' ? '0.1' : '0.01'}
                        value={editingDiscount.value}
                        onChange={(e) => setEditingDiscount({...editingDiscount, value: parseFloat(e.target.value)})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Start Date:</label>
                      <input
                        type="datetime-local"
                        value={editingDiscount.start_date.slice(0, 16)}
                        onChange={(e) => setEditingDiscount({...editingDiscount, start_date: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>End Date:</label>
                      <input
                        type="datetime-local"
                        value={editingDiscount.end_date.slice(0, 16)}
                        onChange={(e) => setEditingDiscount({...editingDiscount, end_date: e.target.value})}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label>Usage Limit (optional):</label>
                      <input
                        type="number"
                        value={editingDiscount.usage_limit || ''}
                        onChange={(e) => setEditingDiscount({...editingDiscount, usage_limit: e.target.value ? parseInt(e.target.value) : undefined})}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setEditingDiscount(null)}
                        style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Update Discount
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h2 className="admin-heading">Notifications</h2>
            <div className="admin-text">Notifications content will be implemented here</div>
          </div>
        )}

        {activeTab === 'invoices' && (
           <div>
             <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Invoice Management</h2>
             <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '20px' }}>Total Invoices: {invoices.length}</p>

             {/* Action Buttons */}
             <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               <button
                 onClick={() => setShowAddInvoice(true)}
                 style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               >
                 Create Invoice
               </button>
             </div>

             {/* Filters */}
             <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               <input
                 type="text"
                 placeholder="Search invoices..."
                 value={invoiceSearch}
                 onChange={(e) => setInvoiceSearch(e.target.value)}
                 style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', minWidth: '200px' }}
               />

               <select
                 value={invoiceStatusFilter}
                 onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                 style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
               >
                 <option value="">All Statuses</option>
                 <option value="draft">Draft</option>
                 <option value="sent">Sent</option>
                 <option value="paid">Paid</option>
                 <option value="overdue">Overdue</option>
                 <option value="cancelled">Cancelled</option>
               </select>

               <input
                 type="date"
                 value={invoiceStartDate}
                 onChange={(e) => setInvoiceStartDate(e.target.value)}
                 placeholder="Start Date"
                 style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
               />

               <input
                 type="date"
                 value={invoiceEndDate}
                 onChange={(e) => setInvoiceEndDate(e.target.value)}
                 placeholder="End Date"
                 style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
               />

               <button
                 onClick={() => {
                   setInvoiceSearch('');
                   setInvoiceStatusFilter('');
                   setInvoiceStartDate('');
                   setInvoiceEndDate('');
                   dispatch(fetchInvoices({}));
                 }}
                 style={{ padding: '10px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
               >
                 Clear Filters
               </button>
             </div>

             {/* Invoices Table */}
             {invoices.length > 0 ? (
               <Table
                 headers={['Invoice #', 'Client', 'Amount', 'Status', 'Due Date', 'Created', 'Actions']}
                 data={invoices.map(invoice => [
                   invoice.invoice_number,
                   invoice.client_name,
                   `KES ${invoice.total.toLocaleString()}`,
                   <span style={{
                     padding: '4px 8px',
                     borderRadius: '4px',
                     backgroundColor: invoice.status === 'paid' ? '#d4edda' : invoice.status === 'overdue' ? '#f8d7da' : invoice.status === 'sent' ? '#fff3cd' : '#e2e3e5',
                     color: invoice.status === 'paid' ? '#155724' : invoice.status === 'overdue' ? '#721c24' : invoice.status === 'sent' ? '#856404' : '#383d41'
                   }}>
                     {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                   </span>,
                   new Date(invoice.due_date).toLocaleDateString(),
                   new Date(invoice.created_at).toLocaleDateString(),
                   <div key={`actions-${invoice.id}`} style={{ display: 'flex', gap: '5px' }}>
                     <button
                       onClick={() => setEditingInvoice(invoice)}
                       style={{ padding: '4px 8px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                     >
                       Edit
                     </button>
                     <button
                       onClick={() => handleGeneratePDF(invoice.id)}
                       style={{ padding: '4px 8px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                     >
                       PDF
                     </button>
                     <button
                       onClick={() => handleDeleteInvoice(invoice.id)}
                       style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                     >
                       Delete
                     </button>
                   </div>
                 ])}
               />
             ) : (
               <p style={{ fontSize: '1.1rem', color: '#666', textAlign: 'center', marginTop: '20px' }}>No invoices found matching the current filters.</p>
             )}

             {/* Create Invoice Modal */}
             {showAddInvoice && (
               <div style={{
                 position: 'fixed',
                 top: 0,
                 left: 0,
                 right: 0,
                 bottom: 0,
                 backgroundColor: 'rgba(0,0,0,0.5)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 zIndex: 1000
               }}>
                 <div style={{
                   backgroundColor: '#fff',
                   padding: '20px',
                   borderRadius: '8px',
                   width: '600px',
                   maxWidth: '90vw',
                   maxHeight: '90vh',
                   overflowY: 'auto'
                 }}>
                   <h3>Create Invoice</h3>
                   <form onSubmit={handleCreateInvoice}>
                     <div style={{ marginBottom: '15px' }}>
                       <label>Invoice Number (optional):</label>
                       <input
                         type="text"
                         value={newInvoice.invoice_number}
                         onChange={(e) => setNewInvoice({...newInvoice, invoice_number: e.target.value})}
                         placeholder="Auto-generated if empty"
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       />
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Client Name:</label>
                       <input
                         type="text"
                         value={newInvoice.client_name}
                         onChange={(e) => setNewInvoice({...newInvoice, client_name: e.target.value})}
                         required
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       />
                     </div>

                     <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                       <div style={{ flex: 1 }}>
                         <label>Client Email:</label>
                         <input
                           type="email"
                           value={newInvoice.client_email}
                           onChange={(e) => setNewInvoice({...newInvoice, client_email: e.target.value})}
                           style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                         />
                       </div>
                       <div style={{ flex: 1 }}>
                         <label>Client Phone:</label>
                         <input
                           type="tel"
                           value={newInvoice.client_phone}
                           onChange={(e) => setNewInvoice({...newInvoice, client_phone: e.target.value})}
                           style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                         />
                       </div>
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Client Address:</label>
                       <textarea
                         value={newInvoice.client_address}
                         onChange={(e) => setNewInvoice({...newInvoice, client_address: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                       />
                     </div>

                     {/* Invoice Items */}
                     <div style={{ marginBottom: '15px' }}>
                       <label>Items:</label>
                       {newInvoice.items.map((item, index) => (
                         <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                           <input
                             type="text"
                             placeholder="Description"
                             value={item.description}
                             onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                             style={{ flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                             required
                           />
                           <input
                             type="number"
                             placeholder="Qty"
                             value={item.quantity}
                             onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                             style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                             min="1"
                             required
                           />
                           <input
                             type="number"
                             placeholder="Unit Price"
                             value={item.unit_price}
                             onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                             style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                             step="0.01"
                             min="0"
                             required
                           />
                           {newInvoice.items.length > 1 && (
                             <button
                               type="button"
                               onClick={() => removeInvoiceItem(index)}
                               style={{ padding: '8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                             >
                               ×
                             </button>
                           )}
                         </div>
                       ))}
                       <button
                         type="button"
                         onClick={addInvoiceItem}
                         style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                       >
                         Add Item
                       </button>
                     </div>

                     <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                       <div style={{ flex: 1 }}>
                         <label>Tax Rate (%):</label>
                         <input
                           type="number"
                           value={newInvoice.tax_rate}
                           onChange={(e) => setNewInvoice({...newInvoice, tax_rate: parseFloat(e.target.value) || 0})}
                           style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                           step="0.01"
                           min="0"
                           max="100"
                         />
                       </div>
                       <div style={{ flex: 1 }}>
                         <label>Discount Amount:</label>
                         <input
                           type="number"
                           value={newInvoice.discount_amount}
                           onChange={(e) => setNewInvoice({...newInvoice, discount_amount: parseFloat(e.target.value) || 0})}
                           style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                           step="0.01"
                           min="0"
                         />
                       </div>
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Due Date:</label>
                       <input
                         type="date"
                         value={newInvoice.due_date}
                         onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                         required
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       />
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Payment Terms:</label>
                       <input
                         type="text"
                         value={newInvoice.payment_terms}
                         onChange={(e) => setNewInvoice({...newInvoice, payment_terms: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       />
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Notes:</label>
                       <textarea
                         value={newInvoice.notes}
                         onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                       />
                     </div>

                     <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                       <button
                         type="button"
                         onClick={() => setShowAddInvoice(false)}
                         style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                       >
                         Cancel
                       </button>
                       <button
                         type="submit"
                         style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                       >
                         Create Invoice
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
             )}

             {/* Edit Invoice Modal */}
             {editingInvoice && (
               <div style={{
                 position: 'fixed',
                 top: 0,
                 left: 0,
                 right: 0,
                 bottom: 0,
                 backgroundColor: 'rgba(0,0,0,0.5)',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 zIndex: 1000
               }}>
                 <div style={{
                   backgroundColor: '#fff',
                   padding: '20px',
                   borderRadius: '8px',
                   width: '500px',
                   maxWidth: '90vw'
                 }}>
                   <h3>Edit Invoice</h3>
                   <form onSubmit={(e) => handleUpdateInvoice(e, editingInvoice.id)}>
                     <div style={{ marginBottom: '15px' }}>
                       <label>Status:</label>
                       <select
                         value={editingInvoice.status}
                         onChange={(e) => setEditingInvoice({...editingInvoice, status: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       >
                         <option value="draft">Draft</option>
                         <option value="sent">Sent</option>
                         <option value="paid">Paid</option>
                         <option value="overdue">Overdue</option>
                         <option value="cancelled">Cancelled</option>
                       </select>
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Due Date:</label>
                       <input
                         type="date"
                         value={editingInvoice.due_date.slice(0, 10)}
                         onChange={(e) => setEditingInvoice({...editingInvoice, due_date: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                       />
                     </div>

                     <div style={{ marginBottom: '15px' }}>
                       <label>Notes:</label>
                       <textarea
                         value={editingInvoice.notes || ''}
                         onChange={(e) => setEditingInvoice({...editingInvoice, notes: e.target.value})}
                         style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
                       />
                     </div>

                     <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                       <button
                         type="button"
                         onClick={() => setEditingInvoice(null)}
                         style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                       >
                         Cancel
                       </button>
                       <button
                         type="submit"
                         style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                       >
                         Update Invoice
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
};

export default AdminDashboard;