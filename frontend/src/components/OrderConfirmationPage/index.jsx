import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ProgressSteps from "../ProgressSteps";
import AnimatedCookingLoader from "../AnimatedCookingLoader"; // Keep imports at the top
import "./styles.css";

// API configuration
const apiUrl =
  process.env.NODE_ENV === "development"
    ? process.env.REACT_APP_NGROK_URL || process.env.REACT_APP_API_BASE_URL
    : process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: apiUrl.endsWith("/api") ? apiUrl : `${apiUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orderId = location.state?.orderId || sessionStorage.getItem("orderId");
  const paymentIntentId =
    location.state?.paymentIntentId ||
    sessionStorage.getItem("paymentIntentId");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0); // This will scroll to top after the component mounts
  }, []);

  useEffect(() => {
    const cleanupSessionStorage = () => {
      sessionStorage.removeItem("paymentSuccess");
      sessionStorage.removeItem("orderId");
      sessionStorage.removeItem("paymentIntentId");
    };

    const fetchOrderDetails = async () => {
      try {
        if (!orderId) {
          console.log("No order ID provided, redirecting to home");
          cleanupSessionStorage();
          navigate("/");
          return;
        }

        console.log("Fetching order details for ID:", orderId);
        const response = await api.get(`/orders/${orderId}`);
        if (!response.data || !response.data.order) {
          throw new Error("Invalid response format from server");
        }
        setOrderDetails(response.data.order);
        cleanupSessionStorage();
      } catch (error) {
        console.error("Error fetching order details:", error);
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load order details"
        );
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 5000);
      }
    };

    fetchOrderDetails();

    return cleanupSessionStorage;
  }, [orderId, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="loading-container" role="status">
        <AnimatedCookingLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h2>Error Loading Order</h2>
        <p className="error-message">{error}</p>
        <button onClick={() => navigate("/")} className="return-button">
          Return to Home
        </button>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="error-container" role="alert">
        <h2>Order Not Found</h2>
        <p>We couldn't find the order details you're looking for.</p>
        <button onClick={() => navigate("/")} className="return-button">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="confirmation-container">
      <ProgressSteps currentStep={3} />

      <div className="confirmation-header">
        <h1>Order Confirmation</h1>
        <div
          className="status-badge"
          data-status={orderDetails.orderStatus?.current?.toLowerCase()}
        >
          <div className="success-icon">✓</div>
          <p className="confirmation-message">
            Thank you for your order! A confirmation email has been sent to:
          </p>
          <p className="customer-email">{orderDetails.customer?.email}</p>

          <div className="order-info">
            <p className="confirmation-id">Order ID: {orderId}</p>
            {paymentIntentId && (
              <p className="payment-id">Payment ID: {paymentIntentId}</p>
            )}
            <p className="order-status">
              Status: {orderDetails.orderStatus?.current || "Processing"}
            </p>
          </div>
        </div>
      </div>

      <div className="confirmation-content">
        <div className="customer-info section">
          <h2>Customer Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Name:</span>
              <span className="value">{orderDetails.customer?.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Phone:</span>
              <span className="value">{orderDetails.customer?.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{orderDetails.customer?.email}</span>
            </div>
          </div>
        </div>

        <div className="delivery-info section">
          <h2>Delivery Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Delivery Time:</span>
              <span className="value">
                {formatDate(orderDetails.deliveryTime?.requested)}
              </span>
            </div>
            <div className="address-details">
              <span className="label">Delivery Address:</span>
              <div className="value">
                <p>{orderDetails.address?.street}</p>
                <p>
                  {orderDetails.address?.city}, {orderDetails.address?.postcode}
                </p>
              </div>
            </div>
            {orderDetails.specialInstructions && (
              <div className="special-instructions">
                <span className="label">Special Instructions:</span>
                <p className="value">{orderDetails.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>

        <div className="order-details section">
          <h2>Order Summary</h2>
          <div className="items-grid">
            {orderDetails.orderDetails?.length > 0 ? (
              orderDetails.orderDetails.map((item, index) => (
                <div
                  key={`${item._id || item.id}-${index}`}
                  className="order-item"
                >
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    {item.size && (
                      <span className="item-size">{item.size}</span>
                    )}
                  </div>
                  <div className="item-details">
                    <span className="quantity">Qty: {item.quantity}</span>
                    <span className="price">
                      £{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-items">No items found in this order.</p>
            )}
          </div>

          <div className="price-summary">
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal:</span>
                <span>£{orderDetails.amount?.subtotal.toFixed(2)}</span>
              </div>
              <div className="price-row">
                <span>Delivery Fee:</span>
                <span>£{orderDetails.amount?.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <span>Total Amount:</span>
                <span>£{orderDetails.amount?.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="next-steps section">
          <h2>What's Next?</h2>
          <div className="steps-list">
            <div className="step">
              <span className="step-number">1</span>
              <p>You'll receive an email confirmation shortly</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <p>We'll start preparing your order</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <p>Your order will be delivered at the selected time</p>
            </div>
          </div>
        </div>

        <div className="actions section">
          <button onClick={() => navigate("/")} className="return-home-button">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
