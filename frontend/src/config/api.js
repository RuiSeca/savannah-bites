// src/config/api.js

// Environment-based API URL with validation
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

// Validate API URL configuration
const validateAPIUrl = () => {
  if (!API_BASE_URL) {
    console.error("API Base URL is not configured properly");
    throw new Error("API_BASE_URL is not defined");
  }
};

// Common headers
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

// Generic API error class with enhanced error details
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

// Enhanced fetch wrapper with comprehensive error handling
async function fetchWithErrorHandling(url, options) {
  validateAPIUrl();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
      credentials: "include", // For handling cookies if needed
    });

    // Handle different response types
    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new APIError(
        typeof data === "object" ? data.error : "An error occurred",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    console.error("API Request failed:", {
      url,
      error: error.message,
      baseUrl: API_BASE_URL,
    });

    throw new APIError("Failed to connect to the server", 500, {
      originalError: error.message,
    });
  }
}

// Payment related API calls
export const paymentAPI = {
  createPaymentIntent: async (amount) => {
    validateAmount(amount);
    return fetchWithErrorHandling(
      `${API_BASE_URL}/api/orders/create-payment-intent`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      }
    );
  },

  createOrder: async (orderData) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  },

  getOrderStatus: async (orderId) => {
    if (!orderId) throw new Error("Order ID is required");
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: "GET",
    });
  },

  // New method for handling payment confirmation
  confirmPayment: async (paymentIntentId) => {
    if (!paymentIntentId) throw new Error("Payment Intent ID is required");
    return fetchWithErrorHandling(
      `${API_BASE_URL}/api/orders/confirm-payment`,
      {
        method: "POST",
        body: JSON.stringify({ paymentIntentId }),
      }
    );
  },
};

// Order related API calls with enhanced error handling
export const orderAPI = {
  create: async (orderData) => {
    if (!orderData) throw new Error("Order data is required");
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  },

  getStatus: async (orderId) => {
    if (!orderId) throw new Error("Order ID is required");
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: "GET",
    });
  },

  // New method for getting order history
  getHistory: async () => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/orders/history`, {
      method: "GET",
    });
  },

  // New method for updating order status
  updateStatus: async (orderId, status) => {
    if (!orderId) throw new Error("Order ID is required");
    if (!status) throw new Error("Status is required");
    return fetchWithErrorHandling(
      `${API_BASE_URL}/api/orders/${orderId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
  },
};

// Configuration object with additional options
export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 15000, // 15 seconds timeout
  retryAttempts: 3,
};

// Enhanced API health check
export const checkAPIHealth = async () => {
  try {
    console.log("Checking API health at:", API_BASE_URL);
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: DEFAULT_HEADERS,
    });
    const endTime = Date.now();

    const healthStatus = {
      isHealthy: response.ok,
      responseTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log("API health status:", healthStatus);
    return healthStatus;
  } catch (error) {
    console.error("API health check failed:", {
      error: error.message,
      baseUrl: API_BASE_URL,
      timestamp: new Date().toISOString(),
    });
    return {
      isHealthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Enhanced validation utilities
export const validateAmount = (amount) => {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error(
      "Invalid amount provided: amount must be a positive number"
    );
  }
  return true;
};

// New utility for retrying failed requests
export const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
};

// Export environment information
export const getEnvironmentInfo = () => ({
  apiUrl: API_BASE_URL,
  environment: process.env.NODE_ENV,
  version: process.env.REACT_APP_VERSION,
});
