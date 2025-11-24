import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { addItem, updateQuantity, removeItem, clearCart } from '../redux/cartSlice';
import Button from './Button';
import PaymentModal from './PaymentModal';
import './CampusCafeteriaOrdering.css';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  stock?: number;
  image_url?: string;
  nutritional_info?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  allergens?: string[];
}

interface Cafeteria {
  id: string;
  name: string;
  description: string;
  image: string;
  menu: MenuItem[];
  queueTime: number; // in minutes
  rating: number;
  specialties: string[];
  mpesaInstructions?: {
    method: 'Pay Bill' | 'Buy Goods';
    number: string;
    account?: string;
  };
}

const cafeterias: Cafeteria[] = [
  {
    id: 'cafeteria-paul-caffe',
    name: "Paul Caffe",
    description: 'Traditional American comfort food with a modern twist',
    image: '/pauls-cafe.jpeg',
    menu: [], // To be populated dynamically
    queueTime: 5,
    rating: 4.2,
    specialties: ['Burgers', 'Sandwiches', 'Coffee'],
    mpesaInstructions: {
      method: 'Buy Goods',
      number: '5615977'
    }
  },
  {
    id: 'cafeteria-cafelater',
    name: 'Cafelater',
    description: 'Italian-inspired cuisine with fresh pasta and espresso',
    image: '/coffe.jpg',
    menu: [], // To be populated dynamically
    queueTime: 8,
    rating: 4.5,
    specialties: ['Pasta', 'Pizza', 'Espresso']
  },
  {
    id: 'cafeteria-sironi-student-center',
    name: 'Sironi Student Center',
    description: 'Quick bites and healthy options for busy students',
    image: '/humanity.png',
    menu: [], // To be populated dynamically
    queueTime: 3,
    rating: 4.0,
    specialties: ['Salads', 'Wraps', 'Smoothies'],
    mpesaInstructions: {
      method: 'Buy Goods',
      number: '8433606'
    }
  },
  {
    id: 'cafeteria-sironi-humanity',
    name: 'Sironi Humanity',
    description: 'Global fusion cuisine celebrating cultural diversity',
    image: '/humanity.png',
    menu: [], // To be populated dynamically
    queueTime: 12,
    rating: 4.7,
    specialties: ['Fusion', 'Vegan', 'International']
  }
];

const CampusCafeteriaOrdering: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Redirect admins away from cafeteria selection
  if (isAuthenticated && user?.role === 'admin') {
    navigate('/admin');
    return null;
  }

  const [selectedCafeteria, setSelectedCafeteria] = useState<Cafeteria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(150);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [showNutritional, setShowNutritional] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load menu items from API
  useEffect(() => {
    const loadMenuItems = async () => {
      if (!selectedCafeteria) return;

      setLoading(true);
      setError('');
      try {
        const { default: api } = await import('../utils/api');
        const response = await api.get('/menu');
        const menuData = response.data;

        // Transform API data to match our MenuItem interface
        const transformedMenu: MenuItem[] = menuData
          .filter((item: any) => item.cafeteria_id === selectedCafeteria.id) // Filter by selected cafeteria
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price),
            category: item.Category?.name || 'Other',
            available: item.available !== false, // Default to true if not specified
            stock: item.stock,
            image_url: item.image_url,
            nutritional_info: undefined, // API doesn't provide this yet
            allergens: [] // API doesn't provide this yet
          }));

        setMenuItems(transformedMenu);

        // Update cafeteria menu
        setSelectedCafeteria(prev => prev ? {
          ...prev,
          menu: transformedMenu
        } : null);

      } catch (err: any) {
        console.error('Failed to load menu items:', err);
        setError('Failed to load menu items. Using demo data.');

        // Fallback to mock data if API fails
        const mockMenuItems: MenuItem[] = [
          {
            id: '1',
            name: 'Classic Cheeseburger',
            description: 'Juicy beef patty with cheese, lettuce, tomato, and special sauce',
            price: 12.99,
            category: 'Burgers',
            available: true,
            image_url: '/burger.png',
            nutritional_info: { calories: 650, protein: 35, carbs: 45, fat: 32 },
            allergens: ['Dairy', 'Gluten']
          },
          {
            id: '2',
            name: 'Margherita Pizza',
            description: 'Fresh mozzarella, tomato sauce, and basil on thin crust',
            price: 14.99,
            category: 'Pizza',
            available: true,
            nutritional_info: { calories: 280, protein: 12, carbs: 35, fat: 8 },
            allergens: ['Dairy', 'Gluten']
          },
          {
            id: '3',
            name: 'Caesar Salad',
            description: 'Crisp romaine lettuce with parmesan, croutons, and caesar dressing',
            price: 9.99,
            category: 'Salads',
            available: true,
            nutritional_info: { calories: 180, protein: 8, carbs: 12, fat: 12 },
            allergens: ['Dairy', 'Eggs']
          }
        ];
        setMenuItems(mockMenuItems);
      } finally {
        setLoading(false);
      }
    };

    loadMenuItems();
  }, [selectedCafeteria?.id]);

  // Generate recommendations based on loaded menu items
  useEffect(() => {
    if (selectedCafeteria && user && menuItems.length > 0) {
      // Simple recommendation logic based on categories
      const userPrefs = ['Pizza', 'Pasta', 'Healthy', 'Salads'];
      const recommended = menuItems.filter(item =>
        userPrefs.some(pref => item.category.toLowerCase().includes(pref.toLowerCase()))
      );
      setRecommendations(recommended.slice(0, 3));
    }
  }, [selectedCafeteria, user, menuItems]);

  const filteredMenu = useMemo(() => {
    if (!selectedCafeteria) return [];

    let items = menuItems.length > 0 ? menuItems : selectedCafeteria.menu;

    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }

    return items;
  }, [selectedCafeteria, menuItems, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    if (!selectedCafeteria) return [];
    const cats = new Set(menuItems.length > 0 ? menuItems.map(item => item.category) : selectedCafeteria.menu.map(item => item.category));
    return ['All', ...Array.from(cats)];
  }, [selectedCafeteria, menuItems]);

  const handleAddToCart = (item: MenuItem) => {
    dispatch(addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1
    }));
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeItem(id));
    } else {
      dispatch(updateQuantity({ id, quantity }));
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }

    // Create order first
    try {
      const { default: api } = await import('../utils/api');
      // Use real menu item IDs from the cart
      const items = cartItems.map(item => ({ menuId: item.id, quantity: item.quantity }));
      const orderData = {
        items,
        total,
        paymentMethod: 'mpesa',
        phoneNumber: '254712345678' // Default phone for demo - in real app, get from user profile
      };

      console.log('Creating order with items:', items);
      const response = await api.post('/orders', orderData);
      console.log('Order created successfully:', response.data);
      setCurrentOrderId(response.data.orderId);
      setShowPayment(true);
    } catch (error: any) {
      console.error('Failed to create order:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to create order: ${error.response?.data?.error || error.message}`);
    }
  };

  const handlePaymentSuccess = (method: string) => {
    // Payment was successful, order is confirmed
    alert(`Payment processed via ${method}! Order placed successfully.`);
    dispatch(clearCart());
    setShowPayment(false);
    setShowCart(false);
    setCurrentOrderId(''); // Reset for next order
    // Award loyalty points
    setLoyaltyPoints(prev => prev + Math.floor(total / 10));
  };

  if (!selectedCafeteria) {
    return (
      <div className="cafeteria-selector">
        <h1>Choose Your Campus Cafeteria</h1>
        <div className="cafeteria-grid">
          {cafeterias.map((cafeteria) => (
            <div
              key={cafeteria.id}
              className="cafeteria-card"
              onClick={() => setSelectedCafeteria(cafeteria)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && setSelectedCafeteria(cafeteria)}
              aria-label={`Select ${cafeteria.name}`}
            >
              <div className="cafeteria-image">
                {cafeteria.image && <img src={cafeteria.image} alt={cafeteria.name} />}
                <div className="queue-indicator">
                  <span className={`queue-time ${cafeteria.queueTime <= 5 ? 'short' : cafeteria.queueTime <= 10 ? 'medium' : 'long'}`}>
                    {cafeteria.queueTime} min wait
                  </span>
                </div>
              </div>
              <div className="cafeteria-info">
                <h3>{cafeteria.name}</h3>
                <p>{cafeteria.description}</p>
                <div className="cafeteria-meta">
                  <span className="rating">⭐ {cafeteria.rating}</span>
                  <div className="specialties">
                    {cafeteria.specialties.map(specialty => (
                      <span key={specialty} className="specialty-tag">{specialty}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="campus-cafeteria">
      <header className="cafeteria-header" style={{ backgroundImage: `url(${selectedCafeteria.image})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(33, 150, 243, 0.5)' }}></div>
        <button
          className="back-button"
          onClick={() => setSelectedCafeteria(null)}
          aria-label="Back to cafeteria selection"
          style={{ position: 'relative', zIndex: 101 }}
        >
          ← Back to Cafeterias
        </button>
        <div className="cafeteria-info">
          <h1>{selectedCafeteria.name}</h1>
          <div className="cafeteria-stats">
            <span className="rating">⭐ {selectedCafeteria.rating}</span>
            <span className={`queue-time ${selectedCafeteria.queueTime <= 5 ? 'short' : selectedCafeteria.queueTime <= 10 ? 'medium' : 'long'}`}>
              {selectedCafeteria.queueTime} min wait
            </span>
          </div>
        </div>
        <div className="header-actions">
          <div className="loyalty-points">
            <span>Points: {loyaltyPoints}</span>
          </div>
          <button
            className="cart-button"
            onClick={() => setShowCart(!showCart)}
            aria-label={`Shopping cart with ${cartItems.length} items`}
            style={{ position: 'relative', zIndex: 101 }}
          >
            🛒 ({cartItems.length})
          </button>
        </div>
      </header>

      {recommendations.length > 0 && (
        <section className="recommendations">
          <h2>🍽️ Recommended for You</h2>
          <div className="recommendations-grid">
            {recommendations.map(item => (
              <div key={item.id} className="recommendation-card">
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <span className="price">KES {item.price}</span>
                <Button onClick={() => handleAddToCart(item)}>Add to Cart</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="menu-section">
        <div className="menu-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search menu items"
            />
          </div>
          <div className="category-filter">
            {categories.map(category => (
              <button
                key={category}
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="menu-grid">
          {loading ? (
            <div className="loading">Loading menu items...</div>
          ) : error ? (
            <div className="error">Error loading menu: {error}</div>
          ) : filteredMenu.length === 0 ? (
            <div className="no-items">No menu items available</div>
          ) : (
            filteredMenu.map(item => (
              <div key={item.id} className="menu-item-card">
                <div className="item-image">
                  {item.image_url && <img src={item.image_url} alt={item.name} />}
                  {!item.available && <div className="unavailable-overlay">Out of Stock</div>}
                  {item.nutritional_info && (
                    <button
                      className="nutrition-btn"
                      onClick={() => setShowNutritional(showNutritional === item.id ? null : item.id)}
                      aria-label="View nutritional information"
                    >
                      ℹ️
                    </button>
                  )}
                </div>
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="item-meta">
                    <span className="price">KES {item.price.toFixed(2)}</span>
                    <span className="category">{item.category}</span>
                  </div>
                  {item.stock !== undefined && (
                    <div className="stock-info">
                      <small>Stock: {item.stock}</small>
                    </div>
                  )}
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="allergens">
                      <small>Allergens: {item.allergens.join(', ')}</small>
                    </div>
                  )}
                  <Button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.available}
                  >
                    {item.available ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                </div>

                {showNutritional === item.id && item.nutritional_info && (
                  <div className="nutrition-overlay">
                    <h4>Nutritional Information</h4>
                    <div className="nutrition-grid">
                      <div>Calories: {item.nutritional_info.calories}</div>
                      <div>Protein: {item.nutritional_info.protein}g</div>
                      <div>Carbs: {item.nutritional_info.carbs}g</div>
                      <div>Fat: {item.nutritional_info.fat}g</div>
                    </div>
                    <button onClick={() => setShowNutritional(null)}>Close</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {showCart && (
        <div className="cart-sidebar">
          <div className="cart-header">
            <h2>Your Order</h2>
            <button onClick={() => setShowCart(false)}>×</button>
          </div>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <span>KES {item.price}</span>
                </div>
                <div className="quantity-controls">
                  <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button>
                </div>
                <span className="item-total">KES {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <strong>Total: KES {total.toFixed(2)}</strong>
              {loyaltyPoints >= 50 && (
                <div className="loyalty-discount">
                  <small>Use 50 points for KES 5 discount?</small>
                  <button onClick={() => setLoyaltyPoints(prev => prev - 50)}>
                    Apply Discount
                  </button>
                </div>
              )}
            </div>
            <div className="checkout-button-container">
              <Button onClick={handleCheckout} disabled={cartItems.length === 0}>
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onPaymentSuccess={handlePaymentSuccess}
        orderId={currentOrderId}
        cafeteriaName={selectedCafeteria?.name}
        mpesaInstructions={selectedCafeteria?.mpesaInstructions}
      />
    </div>
  );
};

export default CampusCafeteriaOrdering;