import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import ProgressSteps from "../ProgressSteps/index.jsx";
import { paymentAPI } from "../../config/api"; // Only import what you need
import "./styles.css";

// Stripe initialization
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 2.5;

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const orderDetails = location.state?.orderDetails;

  // Validate order details
  useEffect(() => {
    if (!orderDetails?.customerInfo || !cart.length) {
      console.log(
        "Missing order details or empty cart, redirecting to checkout"
      );
      navigate("/checkout");
    }
  }, [orderDetails, cart, navigate]);

  const calculateTotals = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + (item.selectedPrice || item.price) * item.quantity,
      0
    );
    return {
      subtotal,
      deliveryFee: DELIVERY_FEE,
      total: subtotal + DELIVERY_FEE,
    };
  };

  const createOrder = async (paymentIntent) => {
    try {
      console.log("Creating order...");
      const { subtotal, deliveryFee, total } = calculateTotals();

      const orderData = {
        paymentIntentId: paymentIntent.id,
        orderDetails: {
          items: cart.map((item) => ({
            id: item._id || item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.selectedPrice || item.price,
            size: item.size || "regular",
          })),
          subtotal,
          deliveryFee,
          totalAmount: total,
          customerInfo: orderDetails.customerInfo,
        },
      };

      console.log("Sending order data:", orderData);
      const response = await paymentAPI.createOrder(orderData);
      console.log("Order created successfully:", response);
      return response;
    } catch (error) {
      console.error("Order creation failed:", error);
      throw new Error(
        "Failed to create order: " + (error.data?.message || error.message)
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      console.log("Submitting payment form...");
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      console.log("Confirming payment...");
      const { error: paymentError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/confirmation`,
            payment_method_data: {
              billing_details: {
                name: orderDetails.customerInfo.name,
                email: orderDetails.customerInfo.email,
                phone: orderDetails.customerInfo.phone,
                address: {
                  line1: orderDetails.customerInfo.address,
                  city: orderDetails.customerInfo.city,
                  postal_code: orderDetails.customerInfo.postcode,
                  country: "GB",
                },
              },
            },
          },
          redirect: "if_required",
        });

      if (paymentError) {
        console.error("Payment error:", paymentError);
        throw paymentError;
      }

      if (paymentIntent.status === "succeeded") {
        console.log("Payment succeeded, creating order...");
        const { orderId } = await createOrder(paymentIntent);
        clearCart();
        navigate("/confirmation", {
          state: {
            orderId,
            status: "success",
            paymentIntentId: paymentIntent.id,
          },
          replace: true,
        });
      }
    } catch (error) {
      console.error("Payment/Order error:", error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="payment-container">
      <ProgressSteps currentStep={2} />

      <div className="payment-header">
        <h1>Secure Payment</h1>
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="items-list">
            {cart.map((item) => (
              <div
                key={`${item.id || item._id}-${item.size || "regular"}`}
                className="order-item"
              >
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.size && <span className="item-size">{item.size}</span>}
                </div>
                <div className="item-price">
                  <span className="quantity">x{item.quantity}</span>
                  <span className="price">
                    £
                    {(
                      (item.selectedPrice || item.price) * item.quantity
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Delivery Fee</span>
              <span>£{DELIVERY_FEE.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total to Pay</span>
              <span>£{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="delivery-info">
          <h3>Delivery Details</h3>
          {orderDetails?.customerInfo &&
            Object.entries(orderDetails.customerInfo).map(
              ([key, value]) =>
                key !== "email" &&
                key !== "specialInstructions" && (
                  <div key={key} className="info-row">
                    <span>
                      {key.charAt(0).toUpperCase() +
                        key.slice(1).replace(/([A-Z])/g, " $1")}
                      :
                    </span>
                    <span>{value}</span>
                  </div>
                )
            )}
          {orderDetails?.customerInfo?.specialInstructions && (
            <div className="special-instructions">
              <h4>Special Instructions:</h4>
              <p>{orderDetails.customerInfo.specialInstructions}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="payment-element-container">
          <PaymentElement />
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="payment-button"
          disabled={!stripe || isProcessing}
        >
          <div className="button-content">
            {isProcessing ? (
              <>
                <div
                  className="spinner"
                  role="status"
                  aria-label="Processing payment"
                />
                <span>Processing...</span>
              </>
            ) : (
              <span>Pay £{total.toFixed(2)}</span>
            )}
          </div>
        </button>
      </form>

      <div className="security-info">
        <p>🔒 All payments are secure and encrypted</p>
      </div>
    </div>
  );
}

function PaymentPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();

  const orderDetails = location.state?.orderDetails;

  useEffect(() => {
    if (!orderDetails || !cart?.length) {
      console.log("Invalid payment page access, redirecting to checkout");
      navigate("/checkout");
      return;
    }

    const createPaymentIntent = async () => {
      try {
        console.log("Creating payment intent...");

        // Use the paymentAPI method instead of direct axios call
        const response = await paymentAPI.createPaymentIntent({
          amount: orderDetails.totalAmount,
          currency: "gbp",
          metadata: {
            customerName: orderDetails.customerInfo.name,
            customerEmail: orderDetails.customerInfo.email,
          },
        });

        console.log("Payment intent created:", response);

        // The response is already processed by your API layer
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Payment setup error:", error);

        // Error is already formatted by your API layer
        setError(
          error.data?.message ||
            error.message ||
            "Failed to setup payment. Please try again."
        );
      }
    };

    createPaymentIntent();
  }, [cart, orderDetails, navigate]);

  if (error) {
    return (
      <div className="error-container" role="alert">
        <h2>Payment Setup Failed</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/checkout")} className="return-button">
          Return to Checkout
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="loading-container" role="status">
        <div className="spinner" />
        <p>Setting up payment...</p>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#0a5c66",
              colorBackground: "#ffffff",
              colorText: "#30313d",
            },
          },
        }}
      >
        <CheckoutForm />
      </Elements>
    </div>
  );
}

export default PaymentPage;
