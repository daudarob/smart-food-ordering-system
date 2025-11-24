import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { createOrder } from '../redux/ordersSlice';
import { clearCart } from '../redux/cartSlice';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { io, Socket } from 'socket.io-client';
import CheckoutForm from '../components/CheckoutForm';
import { formatTimestamp } from '../utils/timestamp';
import './Checkout.css';

// Create a singleton socket instance for payment updates
let paymentSocket: Socket | null = null;

const getPaymentSocket = (): Socket => {
  if (!paymentSocket) {
    paymentSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    paymentSocket.on('connect', () => {
      console.log('Payment WebSocket connected, socket ID:', paymentSocket?.id);
    });

    paymentSocket.on('connect_error', (error) => {
      console.error('Payment WebSocket connection error:', error);
    });

    paymentSocket.on('disconnect', (reason) => {
      console.log('Payment WebSocket disconnected:', reason);
    });
  }
  return paymentSocket;
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const Checkout: React.FC = () => {
   const dispatch = useDispatch<AppDispatch>();
   const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { loading, error } = useSelector((state: RootState) => state.orders);

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'stripe'>('stripe');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [mpesaStatus, setMpesaStatus] = useState<string>('');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [manualConfirmLoading, setManualConfirmLoading] = useState<boolean>(false);

  // checkoutRequestId is used to store the M-Pesa checkout request ID
  // It's set when payment initiation succeeds and used for status polling
  console.log('Current checkoutRequestId:', checkoutRequestId);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Setup WebSocket connection for real-time payment updates
  useEffect(() => {
    if (isAuthenticated && !socket) {
      const paymentSocket = getPaymentSocket();

      // Join user-specific room for payment notifications
      if (isAuthenticated && user) {
        paymentSocket.emit('join', user.id);
        console.log('Joined user room for payments:', user.id);
      }

      // Set up payment success listener
      const handlePaymentSuccess = (data: any) => {
        console.log('Payment success received via WebSocket:', data, 'Current orderId:', orderId);
        // Check if this payment success matches the current order
        if (data.orderId === orderId) {
          console.log('Payment success matches current order, updating UI');
          const timestamp = formatTimestamp(data.timestamp);
          const amount = data.amount || total;
          setMpesaStatus(`Order #${data.orderId} - ${timestamp} - confirmed - KES ${amount}`);
          dispatch(clearCart());
          setCountdown(3);
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                // Navigate to menu instead of reload
                window.location.href = '/menu';
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          console.log('Payment success does not match current order, ignoring');
        }
      };

      paymentSocket.on('payment_success', handlePaymentSuccess);
      setSocket(paymentSocket);

      // Cleanup function - remove listeners but don't disconnect socket
      return () => {
        paymentSocket.off('payment_success', handlePaymentSuccess);
      };
    }
  }, [isAuthenticated, user?.id, orderId, dispatch]); // Include orderId to re-attach listeners when it changes

  const handlePaymentMethodChange = (method: 'mpesa' | 'stripe') => {
    setPaymentMethod(method);
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      alert('Please log in to place an order');
      return;
    }

    if (paymentMethod === 'mpesa' && !phoneNumber.trim()) {
      alert('Please enter your M-Pesa phone number');
      return;
    }

    const items = cartItems.map(item => ({ menuId: item.id, quantity: item.quantity }));
    const orderData = { items, total, paymentMethod, phoneNumber: paymentMethod === 'mpesa' ? phoneNumber.trim() : undefined };

    console.log('Creating order with:', orderData);
    try {
      const result = await dispatch(createOrder(orderData)).unwrap();
      console.log('Order creation result:', result);
      setOrderId(result.orderId);

      if (paymentMethod === 'stripe' && result.payment?.clientSecret) {
        setClientSecret(result.payment.clientSecret);
      } else if (paymentMethod === 'mpesa') {
        // For M-Pesa, initiate payment through the payments endpoint
        try {
          const { default: api } = await import('../utils/api');
          const paymentResponse = await api.post('/payments/mpesa/initiate', {
            orderId: result.orderId,
            phoneNumber: phoneNumber.trim(),
            amount: total.toString()
          });

          if (!paymentResponse.data) {
            throw new Error('No response data received');
          }

          const paymentResult = paymentResponse.data;
          console.log('Payment initiation result:', paymentResult);

          if (paymentResult.checkoutRequestId) {
            setCheckoutRequestId(paymentResult.checkoutRequestId);
            const message = paymentResult.customerMessage || 'STK Push sent to your phone. Please check your phone and enter your M-Pesa PIN to complete the payment.';
            setMpesaStatus(message);
            console.log('STK Push initiated successfully. Phone should receive PIN prompt now.');
            console.log('CheckoutRequestId:', paymentResult.checkoutRequestId);
            // Start polling for payment status
            pollPaymentStatus(paymentResult.checkoutRequestId, result.orderId);
          } else {
            console.error('Payment initiation failed:', paymentResult);
            alert('M-Pesa payment could not be initiated. Please try again.');
          }
        } catch (paymentError) {
          console.error('Payment initiation error:', paymentError);
          alert('Failed to initiate M-Pesa payment. Please try again.');
        }
      }
    } catch (err) {
      console.error('Order creation error:', err);
      alert('Failed to create order. Please try again.');
    }
  };

  const pollPaymentStatus = async (requestId: string, orderId: string) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes at 5 second intervals

    console.log('Starting payment status polling for order:', orderId, 'requestId:', requestId);

    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`Payment status poll #${pollCount} for order ${orderId}`);

      try {
        const { default: api } = await import('../utils/api');
        const response = await api.get(`/payments/status/${orderId}`);
        const statusData = response.data;
        console.log('Payment status poll result:', statusData, 'RequestId:', requestId);

        if (statusData.paymentStatus === 'paid') {
          console.log('Payment confirmed as paid via polling');
          clearInterval(pollInterval);
          const timestamp = formatTimestamp(statusData.timestamp);
          setMpesaStatus(`Order #${statusData.orderId} - ${timestamp} - confirmed - KES ${statusData.amount}`);
          dispatch(clearCart());
          setCountdown(3);
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                // Navigate to menu instead of reload
                window.location.href = '/menu';
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (statusData.paymentStatus === 'failed') {
          console.log('Payment marked as failed via polling');
          clearInterval(pollInterval);
          setMpesaStatus('Payment failed. Please check your M-Pesa balance and try again.');
        } else if (statusData.paymentStatus === 'cancelled') {
          console.log('Payment marked as cancelled via polling');
          clearInterval(pollInterval);
          setMpesaStatus('Payment was cancelled. Please try again if you wish to complete the order.');
        } else if (statusData.paymentStatus === 'pending') {
          setMpesaStatus('Waiting for payment confirmation... Please check your phone and enter your PIN.');
        } else {
          console.warn('Unknown payment status:', statusData.paymentStatus);
          setMpesaStatus('Processing payment... Please wait.');
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
        setMpesaStatus('Checking payment status...');
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.log('Payment polling timed out after', maxPolls, 'attempts');
        clearInterval(pollInterval);
        if (mpesaStatus.includes('Waiting') || mpesaStatus.includes('Checking')) {
          setMpesaStatus('Payment timeout. Please check your M-Pesa messages and try again. Your order has been saved.');
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleManualConfirm = async () => {
    if (!orderId) return;

    setManualConfirmLoading(true);
    try {
      const { default: api } = await import('../utils/api');
      const response = await api.post(`/payments/manual-confirm/${orderId}`);

      if (response.data.success) {
        const timestamp = formatTimestamp();
        setMpesaStatus(`Order #${orderId} - ${timestamp} - confirmed - KES ${total}`);
        dispatch(clearCart());
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Navigate to menu instead of reload
              window.location.href = '/menu';
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        alert('Failed to confirm payment. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Manual confirmation error:', error);
      alert('Failed to confirm payment. Please try again or contact support.');
    } finally {
      setManualConfirmLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return <div className="checkout"><p>Your cart is empty</p></div>;
  }

  return (
    <div className="checkout">
      <div className="checkout-header">
        <h2>Checkout</h2>
      </div>
      <div className="checkout-main">
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
        <div className="payment-section">
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
            <div className="mpesa-section">
              <div className="phone-input">
                <label htmlFor="phoneNumber">M-Pesa Phone Number:</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0711226429 or +254711226429"
                  required
                />
                <small>Enter your M-Pesa registered phone number</small>
              </div>
              <button onClick={handlePlaceOrder} disabled={loading}>
                {loading ? 'Processing...' : 'Pay with M-Pesa'}
              </button>
              {mpesaStatus && (
                <div className={`mpesa-status ${mpesaStatus.includes('confirmed') ? 'success' : mpesaStatus.includes('failed') || mpesaStatus.includes('cancelled') || mpesaStatus.includes('timeout') ? 'error' : 'pending'}`}>
                  <p>{mpesaStatus} {countdown > 0 && `Refreshing in ${countdown}...`}</p>
                  {mpesaStatus.includes('Waiting') && (
                    <button
                      onClick={handleManualConfirm}
                      className="manual-confirm-btn"
                      disabled={manualConfirmLoading}
                    >
                      {manualConfirmLoading ? 'Confirming...' : 'I Confirm Payment Was Successful'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {paymentMethod === 'stripe' && !clientSecret && (
            <button onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          )}
        </div>
      </div>
      <div className="checkout-footer">
        {error && <p className="error">Error: {error}</p>}
      </div>
    </div>
  );
};

export default Checkout;