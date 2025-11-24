import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { RootState, AppDispatch } from '../redux/store';
import { addItem, updateQuantity, removeItem } from '../redux/cartSlice';
import { fetchCategories, fetchMenuItems, clearError } from '../redux/menuSlice';
import { fetchFavorites, addToFavorites, removeFromFavorites } from '../redux/favoritesSlice';
import MenuCard from '../components/MenuCard';
import './Menu.css';

const Menu: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: menuItems, categories, loading, error } = useSelector((state: RootState) => state.menu);
  const { user } = useSelector((state: RootState) => state.auth);
  const { favorites } = useSelector((state: RootState) => state.favorites);
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get cafeteria ID from URL params or user context
  const urlParams = new URLSearchParams(window.location.search);
  const cafeteriaId = urlParams.get('cafeteria') || (user?.role === 'cafeteria_admin' ? user.cafeteria_id : null);

  // Fetch menu data on component mount
  useEffect(() => {
    dispatch(clearError()); // Clear any previous errors
    dispatch(fetchCategories(cafeteriaId || undefined));
    dispatch(fetchMenuItems({ cafeteria: cafeteriaId || undefined }));
  }, [dispatch, cafeteriaId]);

  // Fetch favorites if user is authenticated
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, user?.id]);


  console.log('Menu component: menuItems count:', menuItems.length);
  console.log('Menu component: categories count:', categories.length);
  console.log('Menu component: loading:', loading, 'error:', error);
  console.log('Menu component: cafeteriaId from URL:', cafeteriaId, 'user role:', user?.role);
  console.log('Menu component: categories data:', categories);

  // Filter menu items by cafeteria for students
  const cafeteriaFilteredItems = React.useMemo(() => {
    if (!cafeteriaId || user?.role === 'cafeteria_admin') {
      // Admins see all items, or if no cafeteria specified, show all
      return menuItems;
    }
    // Students only see items from their selected cafeteria
    return menuItems.filter(item => item.cafeteria_id === cafeteriaId);
  }, [menuItems, cafeteriaId, user?.role]);

  console.log('Menu component: cafeteriaFilteredItems count:', cafeteriaFilteredItems.length);

  const filteredItems = React.useMemo(() => {
    let items = cafeteriaFilteredItems;

    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category_id === selectedCategory);
    }

    return items;
  }, [cafeteriaFilteredItems, selectedCategory]);

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredItems.forEach(item => {
      const catName = item.Category?.name || 'Uncategorized';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(item);
    });
    return groups;
  }, [filteredItems]);

  console.log('Menu component: filteredItems count:', filteredItems.length);

  const handleAddToCart = (id: string) => {
    const item = menuItems.find(item => item.id === id);
    if (item) {
      console.log('Menu component: Adding to cart:', item.name);
      dispatch(addItem({ id: item.id, name: item.name, price: item.price, quantity: 1 }));
    }
  };

  const handleToggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      dispatch(removeFromFavorites(id));
    } else {
      dispatch(addToFavorites(id));
    }
  };

  const handleCartIncrease = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      dispatch(updateQuantity({ id, quantity: item.quantity + 1 }));
    }
  };

  const handleCartDecrease = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item && item.quantity > 1) {
      dispatch(updateQuantity({ id, quantity: item.quantity - 1 }));
    }
  };

  const handleCartRemove = (id: string) => {
    dispatch(removeItem(id));
  };

  const handleCheckout = () => {
    if (!user) {
      alert(t('Please log in to checkout'));
      return;
    }
    navigate('/checkout');
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    console.log('Menu component: Showing loading state');
    return <div className="loading">{t('Loading menu...')}</div>;
  }
  if (error && !loading) {
    console.log('Menu component: Showing error state:', error);
    return <div className="error">{t('Error:')} {error}</div>;
  }

  console.log('Menu component: Rendering menu sections with groupedItems:', Object.keys(groupedItems).length);


  return (
    <div className="menu">
      <div className="menu-content">
        <div className="menu-main">
          <div className="category-filters">
            <button
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              {t('All Categories')}
            </button>
            {categories && categories.length > 0 ? (
              categories.map(category => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))
            ) : (
              !loading && <p className="no-categories">{t('Categories loading...')}</p>
            )}
          </div>

          <div className="menu-grid">
            {filteredItems.map(item => (
              <MenuCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                image_url={item.image_url}
                onAddToCart={handleAddToCart}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={user?.id ? handleToggleFavorite : undefined}
              />
            ))}
          </div>
        </div>

        <div className="cart-sidebar">
          <h3>{t('Cart')} ({cartItems.length})</h3>
          {cartItems.length === 0 ? (
            <p>{t('Your cart is empty')}</p>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <p>{t('KES')} {item.price.toFixed(2)}</p>
                    </div>
                    <div className="cart-item-controls">
                      <button onClick={() => handleCartDecrease(item.id)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => handleCartIncrease(item.id)}>+</button>
                      <button onClick={() => handleCartRemove(item.id)} className="remove-btn">×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <strong>{t('Total: KES')} {cartTotal.toFixed(2)}</strong>
              </div>
              <button onClick={handleCheckout} className="checkout-btn">
                {t('Proceed to Checkout')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Menu;