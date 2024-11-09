// src/config/api.js
import axios from "axios";

// Custom Error Class
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

// Environment and Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  environment: process.env.NODE_ENV,
};

// Validation Functions
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
  if (!orderData) throw new Error("Order data is required");

  const errors = [];

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
  const customerInfo = orderData.orderDetails?.customer;
  if (!customerInfo) {
    errors.push("Customer information is required");
  } else {
    const { name, email, phone } = customerInfo;
    if (!name) errors.push("Customer name is required");
    if (!email) errors.push("Customer email is required");
    if (!phone) errors.push("Customer phone is required");
  }

  // Validate address
  const address = orderData.orderDetails?.address;
  if (!address) {
    errors.push("Delivery address is required");
  } else {
    const { street, city, postcode } = address;
    if (!street) errors.push("Street address is required");
    if (!city) errors.push("City is required");
    if (!postcode) errors.push("Postcode is required");
  }

  // Validate delivery time
  if (!orderData.orderDetails?.deliveryTime?.requested) {
    errors.push("Delivery time is required");
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

    console.error("API Error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: originalRequest?.url,
    });

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
      console.error("Payment Intent Creation Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  createOrder: async (orderData) => {
    try {
      validateOrderData(orderData);

      const response = await api.post("/api/orders", orderData);

      if (!response.data?.orderId) {
        throw new Error("Order creation failed: No order ID received");
      }

      return {
        orderId: response.data.orderId,
        status: response.data.status,
      };
    } catch (error) {
      console.error("Order Creation Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  getOrder: async (orderId) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("Get Order Error:", error);
      throw error instanceof APIError
        ? error
        : new APIError(
            error.message,
            error.response?.status || 500,
            error.response?.data
          );
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      if (!orderId) throw new Error("Order ID is required");
      if (!status) throw new Error("Status is required");

      const response = await api.patch(`/api/orders/${orderId}/status`, {
        status,
      });
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

  cancelOrder: async (orderId, reason) => {
    try {
      if (!orderId) throw new Error("Order ID is required");

      const response = await api.post(`/api/orders/${orderId}/cancel`, {
        reason,
      });
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
    const response = await api.get("/api/health");
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
  api,
  paymentAPI,
  checkAPIHealth,
  retryRequest,
  getAPIConfig,
};
