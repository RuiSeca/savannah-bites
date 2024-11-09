// src/config/api.js
import axios from "axios";

// Environment and Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api",
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  environment: process.env.NODE_ENV,
  version: process.env.REACT_APP_VERSION,
};

// Error Classes
class APIError extends Error {
  /*************  ✨ Codeium Command 🌟  *************/
  /**
   * Custom error class for API-related errors
   * @param {String} message - Error message
   * @param {Number} status - HTTP status code
   * @param {Object} data - Additional error data
   */
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

// Validation Functions
/******  fd8b752a-3588-4b2f-82d0-c1943b393113  *******/
const validateAmount = (amount) => {
  if (!amount || typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error(
      "Invalid amount provided: amount must be a positive number"
    );
  }
  if (!Number.isInteger(amount)) {
    throw new Error("Amount must be in cents (integer)");
  }
  return true;
};

const validateOrderData = (orderData) => {
  const errors = [];

  if (!orderData) {
    throw new Error("Order data is required");
  }

  // Validate items
  if (
    !orderData.orderDetails?.items ||
    !Array.isArray(orderData.orderDetails.items)
  ) {
    errors.push("Order must contain at least one item");
  } else if (orderData.orderDetails.items.length === 0) {
    errors.push("Order must contain at least one item");
  }

  // Validate customer info
  const customerInfo = orderData.orderDetails?.customerInfo;
  if (!customerInfo) {
    errors.push("Customer information is required");
  } else {
    const { name, email, phone, address, city, postcode } = customerInfo;
    if (!name) errors.push("Customer name is required");
    if (!email) errors.push("Customer email is required");
    if (!phone) errors.push("Customer phone is required");
    if (!address) errors.push("Delivery address is required");
    if (!city) errors.push("City is required");
    if (!postcode) errors.push("Postcode is required");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

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
      console.error("API Response Error:", {
        status: error.response.status,
        data: error.response.data,
        url: originalRequest.url,
      });
    } else if (error.request) {
      console.error("API No Response:", {
        request: error.request,
        url: originalRequest.url,
      });
    } else {
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

      console.log("Creating payment intent with data:", {
        amount: data.amount,
        currency: data.currency || "gbp",
      });

      // Update the endpoint path to include /api
      const response = await api.post("/api/orders/create-payment-intent", {
        amount: data.amount,
        currency: data.currency || "gbp",
        metadata: {
          ...data.metadata,
          timestamp: new Date().toISOString(),
        },
      });

      if (!response.data?.clientSecret) {
        throw new Error(
          "No client secret received from payment intent creation"
        );
      }

      return response.data;
    } catch (error) {
      console.error("Payment API Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  createOrder: async (data) => {
    try {
      console.log("Creating order with data:", data);
      const response = await api.post("/orders", data);

      if (!response.data?.orderId) {
        throw new Error("Order creation failed: No order ID received");
      }

      return {
        orderId: response.data.orderId,
        status: response.data.status,
      };
    } catch (error) {
      console.error("Order Creation Error:", error);
      throw new APIError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        error.response?.data
      );
    }
  },
};

// Order API
export const orderAPI = {
  getStatus: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("Order Status Check Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get("/orders/history");
      return response.data;
    } catch (error) {
      console.error("Order History Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
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
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  cancel: async (orderId, reason) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.post(`/orders/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error("Order Cancellation Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
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
      version: API_CONFIG.version,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: API_CONFIG.environment,
      version: API_CONFIG.version,
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
