import React, { useState } from 'react';
import Button from './Button';
import FormInput from './FormInput';
import api from '../utils/api';
import './PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentSuccess: (method: string) => void;
  orderId: string;
  cafeteriaName?: string;
  mpesaInstructions?: {
    method: 'Pay Bill' | 'Buy Goods';
    number: string;
    account?: string;
  };
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, total, onPaymentSuccess, orderId, cafeteriaName, mpesaInstructions }) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Credit Card State
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
    address: '',
    city: '',
    zipCode: ''
  });

  // M-Pesa State
  const [mpesaData, setMpesaData] = useState({
    phone: '',
    amount: total.toString(),
    reference: ''
  });

  // Payment Status State
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiated' | 'awaiting_payment' | 'processing' | 'success' | 'failed'>('idle');

  // Checkout Request ID for polling (keeping for future use)
  // const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // Digital Wallet State
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  // Polling for payment status
  const pollPaymentStatus = async (orderId: string) => {
    let pollCount = 0;
    const maxPolls = 40; // 2 minutes max (40 * 3 seconds)

    const poll = async () => {
      try {
        pollCount++;
        const response = await api.get(`/payments/status/${orderId}`);
        const { paymentStatus } = response.data;

        console.log(`Payment status poll ${pollCount}:`, paymentStatus);

        if (paymentStatus === 'paid') {
          setPaymentStatus('success');
          setTimeout(() => {
            onPaymentSuccess('M-Pesa');
            onClose();
          }, 2000);
        } else if (paymentStatus === 'failed') {
          setPaymentStatus('failed');
        } else if (pollCount < maxPolls) {
          // Continue polling
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          // Timeout after 2 minutes
          console.warn('Payment polling timed out after 2 minutes');
          setPaymentStatus('failed');
          setError('Payment verification timed out. Please check your M-Pesa messages and contact support if needed.');
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
        if (pollCount < maxPolls) {
          setTimeout(poll, 3000);
        } else {
          setPaymentStatus('failed');
          setError('Failed to verify payment status. Please contact support.');
        }
      }
    };
    poll();
  };

  const handlePayment = async (method: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock success/failure
      if (Math.random() > 0.1) { // 90% success rate
        setSuccess(`Payment of KES ${total.toFixed(2)} processed successfully via ${method}!`);
        setTimeout(() => {
          onPaymentSuccess(method);
          onClose();
        }, 2000);
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during payment processing.');
    } finally {
      setLoading(false);
    }
  };

  const validateCardData = () => {
    const { name, number, expiry, cvv, address, city, zipCode } = cardData;
    if (!name || !number || !expiry || !cvv || !address || !city || !zipCode) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (number.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number.');
      return false;
    }
    if (cvv.length !== 3) {
      setError('Please enter a valid 3-digit CVV.');
      return false;
    }
    return true;
  };

  const validateMpesaData = () => {
    const { phone, amount } = mpesaData;
    if (!phone || !amount) {
      setError('Please fill in all required fields.');
      return false;
    }
    // Accept both 10-digit (07xxxxxxxx) and 12-digit (2547xxxxxxxx) formats
    if (phone.length !== 10 && phone.length !== 12) {
      setError('Please enter a valid phone number (10 or 12 digits).');
      return false;
    }
    return true;
  };

  const handleCardPayment = () => {
    if (validateCardData()) {
      handlePayment('Credit Card');
    }
  };

  const handleMpesaPayment = async () => {
    if (validateMpesaData()) {
      setLoading(true);
      setError('');
      try {
        const response = await api.post('/payments/mpesa/initiate', {
          orderId: orderId,
          phoneNumber: mpesaData.phone,
          amount: total.toString()
        });

        console.log('M-Pesa initiation response:', response.data);

        if (response.data.success) {
          setPaymentStatus('initiated');
          // STK push sent, now await payment
          setTimeout(() => {
            setPaymentStatus('awaiting_payment');
            // Start polling for status
            pollPaymentStatus(orderId);
          }, 2000);
        } else {
          throw new Error(response.data.message || 'Failed to initiate M-Pesa payment');
        }
      } catch (err: any) {
        console.error('M-Pesa payment error:', err);
        setError(err.response?.data?.error || err.response?.data?.details || 'Failed to initiate M-Pesa payment. Please try again.');
        setPaymentStatus('idle');
      } finally {
        setLoading(false);
      }
    }
  };


  const handleWalletPayment = () => {
    if (!selectedWallet) {
      setError('Please select a digital wallet.');
      return;
    }
    handlePayment(selectedWallet);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-header">
          <h2>Choose Payment Method</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="payment-content">
          <div className="payment-summary">
            <h3>Order Total: KES {total.toFixed(2)}</h3>
          </div>

          {!selectedMethod ? (
            <div className="payment-options">
              <button
                className="payment-option credit-card"
                onClick={() => setSelectedMethod('credit-card')}
              >
                💳 Credit Card
              </button>
              <button
                className="payment-option mpesa"
                onClick={() => setSelectedMethod('mpesa')}
              >
                📱 M-Pesa
              </button>
              <button
                className="payment-option wallet"
                onClick={() => setSelectedMethod('wallet')}
              >
                👛 Digital Wallet
              </button>
            </div>
          ) : (
            <div className="payment-form">
              {selectedMethod === 'credit-card' && (
                <div className="credit-card-form">
                  <h3>Credit Card Payment</h3>
                  <FormInput
                    label="Cardholder Name"
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    required
                  />
                  <FormInput
                    label="Card Number"
                    type="text"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                  <div className="form-row">
                    <FormInput
                      label="Expiry Date"
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                    />
                    <FormInput
                      label="CVV"
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                      maxLength={3}
                      required
                    />
                  </div>
                  <FormInput
                    label="Billing Address"
                    type="text"
                    value={cardData.address}
                    onChange={(e) => setCardData({ ...cardData, address: e.target.value })}
                    required
                  />
                  <div className="form-row">
                    <FormInput
                      label="City"
                      type="text"
                      value={cardData.city}
                      onChange={(e) => setCardData({ ...cardData, city: e.target.value })}
                      required
                    />
                    <FormInput
                      label="ZIP Code"
                      type="text"
                      value={cardData.zipCode}
                      onChange={(e) => setCardData({ ...cardData, zipCode: e.target.value })}
                      required
                    />
                  </div>
                  <Button onClick={handleCardPayment} disabled={loading}>
                    {loading ? 'Processing...' : 'Pay with Credit Card'}
                  </Button>
                </div>
              )}

              {selectedMethod === 'mpesa' && (
                <div className="mpesa-form">
                  {paymentStatus === 'idle' && (
                    <>
                      <h3>M-Pesa Payment</h3>
                      <p>You will be redirected to M-Pesa to complete your payment.</p>
                      <FormInput
                        label="Phone Number"
                        type="tel"
                        value={mpesaData.phone}
                        onChange={(e) => setMpesaData({ ...mpesaData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                        placeholder="254712345678"
                        maxLength={12}
                        required
                      />
                      <FormInput
                        label="Amount"
                        type="number"
                        value={mpesaData.amount}
                        onChange={(e) => setMpesaData({ ...mpesaData, amount: e.target.value })}
                        readOnly
                      />
                      <FormInput
                        label="Reference (Optional)"
                        type="text"
                        value={mpesaData.reference}
                        onChange={(e) => setMpesaData({ ...mpesaData, reference: e.target.value })}
                        placeholder="Order reference"
                      />
                      <div className="mpesa-instructions">
                        <p><strong>Instructions for {cafeteriaName || 'Cafeteria'}:</strong></p>
                        <ol>
                          <li>Click "Pay with M-Pesa" to open M-Pesa</li>
                          <li>Select "Lipa na M-Pesa" {' > '} "{mpesaInstructions?.method || 'Pay Bill'}"</li>
                          <li>Enter {mpesaInstructions?.method === 'Buy Goods' ? 'Till Number' : 'Business Number'}: {mpesaInstructions?.number || '123456'}</li>
                          {mpesaInstructions?.account && <li>Enter Account Number: {mpesaInstructions.account}</li>}
                          <li>Enter Amount: {total.toFixed(2)}</li>
                          <li>Enter your M-Pesa PIN and confirm</li>
                        </ol>
                      </div>
                      <Button onClick={handleMpesaPayment} disabled={loading}>
                        {loading ? 'Processing...' : 'Pay with M-Pesa'}
                      </Button>
                    </>
                  )}
                  {paymentStatus === 'initiated' && (
                    <div className="payment-status">
                      <h3>Payment Initiated</h3>
                      <p>📱 Sending STK push to {mpesaData.phone}...</p>
                      <div className="loading-spinner">Please wait...</div>
                    </div>
                  )}
                  {paymentStatus === 'awaiting_payment' && (
                    <div className="payment-status">
                      <h3>Awaiting Payment</h3>
                      <p>📱 A payment prompt has been sent to your phone ({mpesaData.phone}). Please check your phone and enter your M-Pesa PIN to complete the payment.</p>
                      <div className="loading-spinner">Waiting for payment confirmation...</div>
                    </div>
                  )}
                  {paymentStatus === 'processing' && (
                    <div className="payment-status">
                      <h3>Processing Payment</h3>
                      <p>Verifying PIN and processing transaction...</p>
                      <div className="loading-spinner">Please wait...</div>
                    </div>
                  )}
                  {paymentStatus === 'success' && (
                    <div className="payment-success">
                      <h3>Payment Successful</h3>
                      <p>✅ Payment of KES {total.toFixed(2)} processed successfully via M-Pesa!</p>
                    </div>
                  )}
                  {paymentStatus === 'failed' && (
                    <div className="payment-error">
                      <h3>Payment Failed</h3>
                      <p>❌ Payment could not be processed. Please try again.</p>
                      <Button onClick={() => setPaymentStatus('idle')}>Try Again</Button>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === 'wallet' && (
                <div className="wallet-form">
                  <h3>Digital Wallet Payment</h3>
                  <div className="wallet-options">
                    <button
                      className={`wallet-option ${selectedWallet === 'PayPal' ? 'selected' : ''}`}
                      onClick={() => setSelectedWallet('PayPal')}
                    >
                      🅿️ PayPal
                    </button>
                    <button
                      className={`wallet-option ${selectedWallet === 'Apple Pay' ? 'selected' : ''}`}
                      onClick={() => setSelectedWallet('Apple Pay')}
                    >
                      🍎 Apple Pay
                    </button>
                    <button
                      className={`wallet-option ${selectedWallet === 'Google Pay' ? 'selected' : ''}`}
                      onClick={() => setSelectedWallet('Google Pay')}
                    >
                      🤖 Google Pay
                    </button>
                  </div>
                  {selectedWallet && (
                    <div className="wallet-auth">
                      <p>Authenticate with {selectedWallet}</p>
                      <p>Use your device's biometric authentication or PIN.</p>
                    </div>
                  )}
                  <Button onClick={handleWalletPayment} disabled={loading || !selectedWallet}>
                    {loading ? 'Processing...' : `Pay with ${selectedWallet || 'Digital Wallet'}`}
                  </Button>
                </div>
              )}

              <button className="back-button" onClick={() => setSelectedMethod('')}>
                ← Back to Payment Options
              </button>
            </div>
          )}

          {error && <div className="payment-error">{error}</div>}
          {success && <div className="payment-success">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;