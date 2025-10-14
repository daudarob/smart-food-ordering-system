import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../redux/store';
import { createOrder } from '../redux/ordersSlice';
import { clearCart } from '../redux/cartSlice';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import './Checkout.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const Checkout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { loading, error } = useSelector((state: RootState) => state.orders);

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'stripe'>('stripe');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePaymentMethodChange = (method: 'mpesa' | 'stripe') => {
    setPaymentMethod(method);
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      alert('Please log in to place an order');
      return;
    }
    const items = cartItems.map(item => ({ menuId: item.id, quantity: item.quantity }));
    console.log('Creating order with:', { items, total, paymentMethod });
    try {
      const result = await dispatch(createOrder({ items, total, paymentMethod })).unwrap();
      console.log('Order creation result:', result);
      setOrderId(result.orderId);
      if (paymentMethod === 'stripe' && result.payment?.clientSecret) {
        setClientSecret(result.payment.clientSecret);
      } else if (paymentMethod === 'mpesa') {
        console.log('Clearing cart for M-Pesa payment');
        alert('M-Pesa payment initiated. Check your phone.');
        dispatch(clearCart());
        navigate('/profile');
      }
    } catch (err) {
      console.error('Order creation error:', err);
    }
  };

  if (cartItems.length === 0) {
    return <div className="checkout"><p>Your cart is empty</p></div>;
  }

  return (
    <div className="checkout">
      <h2>Checkout</h2>
      <div className="order-summary">
        <h3>Order Summary</h3>
        <ul>
          {cartItems.map(item => (
            <li key={item.id}>
              {item.name} x {item.quantity} - KES {item.price * item.quantity}
            </li>
          ))}
        </ul>
        <p>Total: KES {total.toFixed(2)}</p>
      </div>
      <div className="payment-method">
        <h3>Select Payment Method</h3>
        <label>
          <input
            type="radio"
            value="stripe"
            checked={paymentMethod === 'stripe'}
            onChange={() => handlePaymentMethodChange('stripe')}
          />
          Credit/Debit Card (Stripe)
        </label>
        <label>
          <input
            type="radio"
            value="mpesa"
            checked={paymentMethod === 'mpesa'}
            onChange={() => handlePaymentMethodChange('mpesa')}
          />
          M-Pesa
        </label>
      </div>
      {paymentMethod === 'stripe' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm orderId={orderId} />
        </Elements>
      )}
      {paymentMethod === 'mpesa' && (
        <button onClick={handlePlaceOrder} disabled={loading}>
          {loading ? 'Processing...' : 'Pay with M-Pesa'}
        </button>
      )}
      {paymentMethod === 'stripe' && !clientSecret && (
        <button onClick={handlePlaceOrder} disabled={loading}>
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      )}
      {error && <p className="error">Error: {error}</p>}
    </div>
  );
};

export default Checkout;