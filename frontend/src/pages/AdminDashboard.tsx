import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { fetchAllOrders, updateOrderStatus, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem } from '../redux/adminSlice';
import { fetchCategories, fetchMenuItems } from '../redux/menuSlice';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './AdminDashboard.css';

const CAFETERIA_NAMES: { [key: string]: string } = {
  'pauls-cafe': 'Paul Caffe',
  'cafelater': 'Cafelater',
  'sironi-student': 'Sironi Student Center',
  'sironi-humanity': 'Sironi Humanity'
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { orders } = useSelector((state: RootState) => state.admin);
  const { categories, items } = useSelector((state: RootState) => state.menu);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', available: true, stock: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login');
    } else {
      console.log('AdminDashboard: Fetching data');
      dispatch(fetchAllOrders());
      dispatch(fetchCategories());
      dispatch(fetchMenuItems());
    }
  }, [isAuthenticated, user, navigate, dispatch]);
  const menuHeaders = ['ID', 'Name', 'Price', 'Category', 'Stock'];
  const menuData = items.map(item => [
    item.id,
    item.name,
    `KES ${item.price}`,
    item.Category?.name || 'N/A',
    (item as any).stock || 0
  ]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setShowCategoryModal(true);
  };

  const handleAddMenuItem = () => {
    setEditingMenuItem(null);
    setMenuForm({ name: '', description: '', price: '', category_id: '', image_url: '', available: true, stock: '' });
    setShowMenuModal(true);
  };

  const handleSaveCategory = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (editingCategory) {
        await dispatch(updateCategory({ id: editingCategory.id, ...categoryForm }));
      } else {
        await dispatch(createCategory(categoryForm));
      }
      dispatch(fetchCategories());
      setShowCategoryModal(false);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMenuItem = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setShowMenuModal(false); // Close modal immediately
    try {
      const form = { ...menuForm, price: parseFloat(menuForm.price), category_id: menuForm.category_id, stock: parseInt(menuForm.stock) };
      if (editingMenuItem) {
        await dispatch(updateMenuItem({ id: editingMenuItem.id, ...form }));
      } else {
        await dispatch(createMenuItem(form));
      }
      dispatch(fetchMenuItems());
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save menu item');
      setShowMenuModal(true); // Re-open modal on error
    } finally {
      setIsSaving(false);
    }
  };

  const orderHeaders = ['ID', 'Customer', 'Total', 'Status', 'Date', 'Actions'];
  const orderData = orders.map(order => [
    order.id,
    order.user.name,
    `KES ${order.total}`,
    order.status,
    new Date(order.created_at).toLocaleDateString(),
    <select key={order.id} value={order.status} onChange={(e) => dispatch(updateOrderStatus({ id: order.id, status: e.target.value }))}>
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="preparing">Preparing</option>
      <option value="ready">Ready</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
  ]);

  // Mock sales data for charts
  const salesData = [
    { date: '2025-10-08', sales: 120 },
    { date: '2025-10-09', sales: 150 },
    { date: '2025-10-10', sales: 180 },
    { date: '2025-10-11', sales: 140 },
    { date: '2025-10-12', sales: 160 },
  ];

  const lowStockItems = items.filter(item => (item as any).stock < 10);

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <div className="nav-brand">
          <h2>Admin Dashboard</h2>
          {user?.role === 'admin' && user?.cafeteria_id && (
            <p className="cafeteria-name">{CAFETERIA_NAMES[user.cafeteria_id] || user.cafeteria_id}</p>
          )}
        </div>
        <ul className="nav-links">
          <li><Button onClick={() => navigate('/')}>Home</Button></li>
          <li><Button onClick={() => navigate('/menu')}>Menu</Button></li>
          <li><Button onClick={() => navigate('/cart')}>Cart</Button></li>
          <li><Button onClick={() => navigate('/profile')}>Profile</Button></li>
          <li><Button onClick={() => window.location.reload()}>Refresh Data</Button></li>
        </ul>
        <div className="nav-user">
          <span>Welcome, {user?.name}</span>
          <Button onClick={() => { dispatch({ type: 'auth/logout' }); navigate('/login'); }}>Logout</Button>
        </div>
      </nav>
      <div className="stats">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>{orders.length}</p>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <p>KES {orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{new Set(orders.map(order => order.user.email)).size}</p>
        </div>
      </div>

      <div className="inventory-alerts">
        <h3>Low Stock Alerts</h3>
        {lowStockItems.length > 0 ? (
          <ul>
            {lowStockItems.map(item => (
              <li key={item.id} style={{ color: '#FFC107' }}>
                {item.name}: {(item as any).stock} left
              </li>
            ))}
          </ul>
        ) : (
          <p>All items are well stocked.</p>
        )}
      </div>

      <div className="analytics">
        <h3>Sales Analytics</h3>
        <LineChart width={600} height={300} data={salesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sales" stroke="#FFC107" />
        </LineChart>
      </div>
      <div className="tables">
        <div className="table-section">
          <h3>Manage Categories</h3>
          <Button onClick={handleAddCategory}>Add Category</Button>
          <Table headers={['ID', 'Name', 'Description', 'Actions']} data={categories.map(cat => [cat.id, cat.name, cat.description || '', (
            <div key={cat.id}>
              <Button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description || '' }); setShowCategoryModal(true); }}>Edit</Button>
              <Button onClick={() => dispatch(deleteCategory(cat.id))}>Delete</Button>
            </div>
          )])} />
        </div>
        <div className="table-section">
          <h3>Manage Menu</h3>
          <Button onClick={handleAddMenuItem}>Add Menu Item</Button>
          <Table headers={[...menuHeaders, 'Actions']} data={menuData.map((row, index) => [...row, (
            <div key={items[index].id}>
              <Button onClick={() => { setEditingMenuItem(items[index]); setMenuForm({ name: items[index].name, description: items[index].description, price: items[index].price.toString(), category_id: items[index].category_id, image_url: items[index].image_url || '', available: items[index].available, stock: (items[index] as any).stock?.toString() || '' }); setShowMenuModal(true); }}>Edit</Button>
              <Button onClick={() => setDeleteItemId(items[index].id)}>Delete</Button>
            </div>
          )])} />
        </div>
        <div className="table-section">
          <h3>Manage Orders</h3>
          <Table headers={orderHeaders} data={orderData} />
        </div>
      </div>

      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
        <FormInput label="Name" type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
        <FormInput label="Description" type="text" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
        {errorMessage && <p className="error">{errorMessage}</p>}
        <Button onClick={handleSaveCategory} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
      </Modal>

      <Modal isOpen={showMenuModal} onClose={() => setShowMenuModal(false)}>
        <h3>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
        <FormInput label="Name" type="text" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required />
        <FormInput label="Description" type="text" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} required />
        <FormInput label="Price" type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required />
        <div>
          <label>Category</label>
          <select value={menuForm.category_id} onChange={(e) => setMenuForm({ ...menuForm, category_id: e.target.value })} required>
            <option value="">Select Category</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <FormInput label="Image URL" type="text" value={menuForm.image_url} onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })} />
        <FormInput label="Stock" type="number" value={menuForm.stock} onChange={(e) => setMenuForm({ ...menuForm, stock: e.target.value })} required />
        {errorMessage && <p className="error">{errorMessage}</p>}
        <Button onClick={handleSaveMenuItem} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
      </Modal>

      <Modal isOpen={!!deleteItemId} onClose={() => setDeleteItemId(null)}>
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this menu item? This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Button onClick={() => setDeleteItemId(null)}>Cancel</Button>
          <Button onClick={() => { if (deleteItemId) { dispatch(deleteMenuItem(deleteItemId)); setDeleteItemId(null); } }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;