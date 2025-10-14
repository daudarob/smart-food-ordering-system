import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { updateQuantity, removeItem } from '../redux/cartSlice';
import CartItem from '../components/CartItem';
import './Cart.css';

const Cart: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleIncrease = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item) {
      dispatch(updateQuantity({ id, quantity: item.quantity + 1 }));
    }
  };

  const handleDecrease = (id: string) => {
    const item = cartItems.find(item => item.id === id);
    if (item && item.quantity > 1) {
      dispatch(updateQuantity({ id, quantity: item.quantity - 1 }));
    }
  };

  const handleRemove = (id: string) => {
    dispatch(removeItem(id));
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      alert('Please log in to checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="cart">
      <div className="cart-items">
        {cartItems.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          cartItems.map(item => (
            <CartItem
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>
      <div className="order-summary">
        <h3>Order Summary</h3>
        <p>Total: KES {total.toFixed(2)}</p>
        <button onClick={handleCheckout} disabled={cartItems.length === 0}>
          Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;