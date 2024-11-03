// src/config/api.js

// Environment-based API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Common headers
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Generic API error class
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Generic fetch wrapper with error handling
async function fetchWithErrorHandling(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error || 'An error occurred',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error('API Request failed:', error);
    throw new APIError(
      'Failed to connect to the server',
      500,
      { originalError: error.message }
    );
  }
}

// Payment related API calls
export const paymentAPI = {
  createPaymentIntent: async (amount) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/create-payment-intent`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  createOrder: async (orderData) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  getOrderStatus: async (orderId) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: 'GET',
    });
  },
};

// Order related API calls
export const orderAPI = {
  create: async (orderData) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  getStatus: async (orderId) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: 'GET',
    });
  },
};

// Configuration object
export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
};

// Utility to check if API is available
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Validation utilities
export const validateAmount = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount provided');
  }
  return true;
};

// Usage example in your components:
/*
import { paymentAPI, orderAPI } from '../config/api';

// Creating a payment intent
try {
  const { clientSecret } = await paymentAPI.createPaymentIntent(1000);
  // Use client secret with Stripe
} catch (error) {
  console.error('Payment intent creation failed:', error.message);
}

// Creating an order
try {
  const orderResult = await orderAPI.create({
    // order data
  });
  console.log('Order created:', orderResult);
} catch (error) {
  console.error('Order creation failed:', error.message);
}
*/