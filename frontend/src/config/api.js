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

  // Validate payment intent ID
  if (!orderData.paymentIntentId) {
    errors.push("Payment intent ID is required");
  }

  // Validate order items
  if (!Array.isArray(orderData.orderDetails)) {
    errors.push("Order details must be an array");
  } else if (orderData.orderDetails.length === 0) {
    errors.push("Order must contain at least one item");
  } else {
    orderData.orderDetails.forEach((item, index) => {
      if (!item.name) errors.push(`Item ${index + 1} is missing a name`);
      if (!item.quantity || item.quantity <= 0)
        errors.push(`Item ${index + 1} has invalid quantity`);
      if (!item.price) errors.push(`Item ${index + 1} is missing a price`);
    });
  }

  // Validate customer
  if (!orderData.customer) {
    errors.push("Customer information is required");
  } else {
    const { name, email, phone } = orderData.customer;
    if (!name) errors.push("Customer name is required");
    if (!email) errors.push("Customer email is required");
    if (!phone) errors.push("Customer phone is required");
  }

  // Validate address
  if (!orderData.address) {
    errors.push("Address is required");
  } else {
    const { street, city, postcode } = orderData.address;
    if (!street) errors.push("Street address is required");
    if (!city) errors.push("City is required");
    if (!postcode) errors.push("Postcode is required");
  }

  // Validate amount
  if (!orderData.amount) {
    errors.push("Amount information is required");
  } else {
    const { subtotal, total, deliveryFee } = orderData.amount;
    if (typeof subtotal !== "number") errors.push("Subtotal must be a number");
    if (typeof total !== "number") errors.push("Total must be a number");
    if (typeof deliveryFee !== "number")
      errors.push("Delivery fee must be a number");
  }

  // Validate delivery time
  if (!orderData.deliveryTime?.requested) {
    errors.push("Delivery time is required");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return true;
};

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // Add any additional headers your API requires
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

      console.log(
        "Sending order data to API:",
        JSON.stringify(orderData, null, 2)
      );

      const response = await api.post("/api/orders", orderData);

      console.log("API Response:", response.data);

      if (!response.data?.orderId) {
        throw new Error("Order creation failed: No order ID received");
      }

      return {
        orderId: response.data.orderId,
        status: response.data.status,
      };
    } catch (error) {
      if (error.response?.data?.details) {
        console.error("Validation errors:", error.response.data.details);
        throw new APIError(
          "Order validation failed: " + error.response.data.details.join(", "),
          error.response.status,
          error.response.data
        );
      }
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

const apiService = {
  api,
  paymentAPI,
  checkAPIHealth,
  retryRequest,
  getAPIConfig,
};

export default apiService;
