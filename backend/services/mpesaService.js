const axios = require('axios');

// M-Pesa API credentials (add to .env)
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';

// Check if M-Pesa credentials are configured
const isMpesaConfigured = () => {
  return MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_SHORTCODE && MPESA_PASSKEY;
};

// Get access token
const getAccessToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  try {
    const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error);
    throw error;
  }
};

// Initiate STK Push
const initiateSTKPush = async (phoneNumber, amount, accountReference, transactionDesc = 'Payment') => {
  if (!isMpesaConfigured()) {
    // Simulate M-Pesa STK push for development
    console.log('M-Pesa credentials not configured, simulating STK push');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    return {
      MerchantRequestID: `mr_${Date.now()}`,
      CheckoutRequestID: `ws_CO_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Success. Request accepted for processing'
    };
  }

  try {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: `${process.env.BACKEND_URL}/api/payments/webhook/mpesa`,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error initiating STK Push:', error);
    throw error;
  }
};

// Check payment status (for polling)
const checkPaymentStatus = async (checkoutRequestId) => {
  if (!isMpesaConfigured()) {
    // Simulate payment status for development
    // Randomly succeed after 10-20 seconds
    const elapsed = Date.now() - parseInt(checkoutRequestId.split('_')[2] || '0');
    if (elapsed > 15000) { // 15 seconds
      return { status: Math.random() > 0.1 ? 'paid' : 'failed' };
    }
    return { status: 'pending' };
  }

  // In production, implement actual status checking
  // This could involve querying M-Pesa API or checking database for webhook updates
  return { status: 'pending' }; // Default to pending
};

module.exports = { initiateSTKPush, checkPaymentStatus };