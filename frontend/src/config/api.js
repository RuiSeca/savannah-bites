// src/config/api.js
import axios from "axios";

// Environment and Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  environment: process.env.NODE_ENV,
  version: process.env.REACT_APP_VERSION,
};

// Error Classes
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

// Validation Functions
const validateAmount = (amount) => {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error(
      "Invalid amount provided: amount must be a positive number"
    );
  }
  return true;
};

const validateOrderData = (orderData) => {
  if (!orderData) throw new Error("Order data is required");
  if (!orderData.items || !Array.isArray(orderData.items)) {
    throw new Error("Order must contain items array");
  }
  if (!orderData.customerInfo)
    throw new Error("Customer information is required");
  return true;
};

// Axios Instance Configuration
const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    if (API_CONFIG.environment === "development") {
      console.log("API Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }
    return config;
  },
  (error) => {
    console.error("Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    if (API_CONFIG.environment === "development") {
      console.log("API Response:", {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Retry logic for failed requests
    if (
      !originalRequest._retry &&
      originalRequest.retryAttempt < API_CONFIG.retryAttempts
    ) {
      originalRequest._retry = true;
      originalRequest.retryAttempt = (originalRequest.retryAttempt || 0) + 1;

      await new Promise((resolve) =>
        setTimeout(resolve, API_CONFIG.retryDelay)
      );
      return api(originalRequest);
    }

    // Error handling
    if (error.response) {
      // Server responded with error status
      console.error("API Response Error:", {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest.url,
      });
    } else if (error.request) {
      // Request made but no response
      console.error("API No Response:", {
        request: error.request,
        url: originalRequest.url,
      });
    } else {
      // Request setup error
      console.error("API Request Setup Error:", error.message);
    }

    return Promise.reject(
      new APIError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        error.response?.data
      )
    );
  }
);

// Payment API
export const paymentAPI = {
  createPaymentIntent: async (data) => {
    try {
      validateAmount(data.amount);

      const response = await api.post("/orders/create-payment-intent", {
        amount: data.amount,
        currency: data.currency || "gbp",
        metadata: data.metadata || {},
      });

      if (!response.data.clientSecret) {
        throw new Error(
          "No client secret received from payment intent creation"
        );
      }

      return response.data;
    } catch (error) {
      console.error("Payment Intent Creation Error:", error);
      throw error.response?.data || error;
    }
  },

  createOrder: async (orderData) => {
    try {
      validateOrderData(orderData);

      const response = await api.post("/orders", orderData);
      return response.data;
    } catch (error) {
      console.error("Order Creation Error:", error);
      throw error.response?.data || error;
    }
  },

  confirmPayment: async (paymentIntentId) => {
    try {
      if (!paymentIntentId) throw new Error("Payment Intent ID is required");

      const response = await api.post("/orders/confirm-payment", {
        paymentIntentId,
      });
      return response.data;
    } catch (error) {
      console.error("Payment Confirmation Error:", error);
      throw error.response?.data || error;
    }
  },

  getPaymentStatus: async (paymentIntentId) => {
    try {
      if (!paymentIntentId) throw new Error("Payment Intent ID is required");

      const response = await api.get(
        `/orders/payment-status/${paymentIntentId}`
      );
      return response.data;
    } catch (error) {
      console.error("Payment Status Check Error:", error);
      throw error.response?.data || error;
    }
  },
};

// Order API
export const orderAPI = {
  create: async (orderData) => {
    try {
      validateOrderData(orderData);

      const response = await api.post("/orders", orderData);
      return response.data;
    } catch (error) {
      console.error("Order Creation Error:", error);
      throw error.response?.data || error;
    }
  },

  getStatus: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("Order Status Check Error:", error);
      throw error.response?.data || error;
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get("/orders/history");
      return response.data;
    } catch (error) {
      console.error("Order History Error:", error);
      throw error.response?.data || error;
    }
  },

  updateStatus: async (orderId, status) => {
    try {
      if (!orderId) throw new Error("Order ID is required");
      if (!status) throw new Error("Status is required");

      const response = await api.put(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error("Order Status Update Error:", error);
      throw error.response?.data || error;
    }
  },

  cancel: async (orderId, reason) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.post(`/orders/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error("Order Cancellation Error:", error);
      throw error.response?.data || error;
    }
  },
};

// Health Check
export const checkAPIHealth = async () => {
  try {
    const startTime = Date.now();
    const response = await api.get("/health");
    const endTime = Date.now();

    return {
      isHealthy: true,
      responseTime: endTime - startTime,
      status: response.data.status,
      timestamp: new Date().toISOString(),
      environment: API_CONFIG.environment,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: API_CONFIG.environment,
    };
  }
};

// Utility Functions
export const retryRequest = async (
  fn,
  retries = API_CONFIG.retryAttempts,
  delay = API_CONFIG.retryDelay
) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

export const getAPIConfig = () => ({
  ...API_CONFIG,
  currentTime: new Date().toISOString(),
});

export default {
  paymentAPI,
  orderAPI,
  checkAPIHealth,
  retryRequest,
  getAPIConfig,
};
