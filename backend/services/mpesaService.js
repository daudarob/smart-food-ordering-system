const axios = require('axios');
const logger = require('../config/logger');
const { Transaction } = require('../models');

class MpesaService {
  constructor() {
    this.baseURL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE || '174379';
    this.passkey = process.env.MPESA_PASSKEY;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate access token
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Check if credentials are configured
      if (!this.consumerKey || !this.consumerSecret) {
        throw new Error('M-Pesa credentials not configured. Please set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET environment variables.');
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

      logger.info('Requesting new M-Pesa access token...');

      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from M-Pesa API: missing access_token');
      }

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour (3600 seconds)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('M-Pesa access token generated successfully', {
        expiresIn: response.data.expires_in,
        tokenExpiry: new Date(this.tokenExpiry).toISOString()
      });
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to generate M-Pesa access token:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`
      });
      throw new Error(`Failed to authenticate with M-Pesa API: ${error.message}`);
    }
  }

  // Generate timestamp and password for STK push
  generatePassword(timestamp) {
    const password = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  // Format phone number to 254XXXXXXXXX format
  formatPhoneNumber(phoneNumber) {
    // Remove any spaces, hyphens, or brackets
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // If it starts with 07, convert to 2547
    if (cleaned.startsWith('07') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    }

    // If it starts with 7, add 254
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }

    // If it starts with 01, convert to 2541
    if (cleaned.startsWith('01') && cleaned.length === 10) {
      cleaned = '254' + cleaned.substring(1);
    }

    // If it starts with 1, add 254
    if (cleaned.startsWith('1') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }

    // Validate the final format
    if (!/^254[17]\d{8}$/.test(cleaned)) {
      throw new Error('Invalid phone number format. Please use format: 254XXXXXXXXX');
    }

    return cleaned;
  }

  // Initiate STK Push
  async initiateSTKPush(amount, phoneNumber, orderId, callbackUrl = null) {
    try {
      // Validate required parameters
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount: must be greater than 0');
      }
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3); // YYYYMMDDHHMMSS
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Ensure amount is an integer and within M-Pesa limits
      const roundedAmount = Math.round(amount);
      if (roundedAmount < 1 || roundedAmount > 150000) {
        throw new Error('Amount must be between 1 and 150,000 KES');
      }

      const stkPushData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: roundedAmount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/mpesa/callback`,
        AccountReference: orderId,
        TransactionDesc: `Payment for order ${orderId}`
      };

      logger.info('Initiating M-Pesa STK Push:', {
        phoneNumber: formattedPhone,
        amount: roundedAmount,
        orderId,
        timestamp,
        callbackUrl: stkPushData.CallBackURL
      });

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 second timeout for STK push
          validateStatus: function (status) {
            return status < 500; // Resolve only if the status code is less than 500
          }
        }
      );

      logger.info('M-Pesa STK Push response:', response.data);

      // Check for successful response (ResponseCode '0')
      if (response.data && response.data.ResponseCode === '0') {
        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
          customerMessage: response.data.CustomerMessage
        };
      }

      // Handle M-Pesa API errors
      if (response.data && response.data.errorCode) {
        const errorMsg = response.data.errorMessage || 'M-Pesa API error';
        logger.error('M-Pesa API error:', {
          errorCode: response.data.errorCode,
          errorMessage: response.data.errorMessage,
          requestId: response.data.requestId
        });
        throw new Error(`M-Pesa API error: ${errorMsg} (${response.data.errorCode})`);
      }

      // Handle other errors
      const errorMsg = response.data?.ResponseDescription || response.data?.errorMessage || 'Unknown error from M-Pesa';
      throw new Error(`M-Pesa STK Push failed: ${errorMsg}`);

    } catch (error) {
      logger.error('M-Pesa STK Push error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        orderId,
        amount,
        phoneNumber
      });
      throw new Error(`M-Pesa payment initiation failed: ${error.message}`);
    }
  }

  // Query STK Push status (optional - for polling)
  async querySTKPushStatus(checkoutRequestId) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = this.generatePassword(timestamp);

      const queryData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('M-Pesa STK Push query error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Store transaction details in database
  async storeTransaction(orderId, checkoutRequestId, phoneNumber, amount, status = 'pending') {
    try {
      const transaction = await Transaction.create({
        order_id: orderId,
        checkout_request_id: checkoutRequestId,
        phone_number: phoneNumber,
        amount: amount,
        status: status
      });

      logger.info('Transaction stored successfully:', {
        transactionId: transaction.id,
        orderId,
        checkoutRequestId,
        amount,
        status
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to store transaction:', error.message);
      throw new Error('Failed to store transaction details');
    }
  }

  // Update transaction status
  async updateTransaction(checkoutRequestId, status, mpesaReceiptNumber = null) {
    try {
      const [updatedRows] = await Transaction.update(
        {
          status: status,
          mpesa_receipt_number: mpesaReceiptNumber
        },
        {
          where: { checkout_request_id: checkoutRequestId }
        }
      );

      if (updatedRows > 0) {
        logger.info('Transaction updated successfully:', {
          checkoutRequestId,
          status,
          mpesaReceiptNumber
        });
      } else {
        logger.warn('No transaction found with checkout request ID:', checkoutRequestId);
      }

      return updatedRows > 0;
    } catch (error) {
      logger.error('Failed to update transaction:', error.message);
      throw new Error('Failed to update transaction status');
    }
  }
}

module.exports = new MpesaService();