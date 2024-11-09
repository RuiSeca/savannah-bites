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
import ProgressSteps from "../ProgressSteps";
import { paymentAPI } from "../../config/api";
import Spinner from "../Spinner";
import ErrorBoundary from "../ErrorBoundary";
import "./PaymentPage.css";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 2.5;

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
};

const validateCartItem = (item) => {
  if (!item || typeof item !== "object") {
    throw new Error("Invalid cart item");
  }

  const price = parseFloat(item.selectedPrice || item.price);
  const quantity = parseInt(item.quantity, 10);

  if (isNaN(price) || price <= 0) {
    throw new Error(`Invalid price for ${item.name}: ${price}`);
  }
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity for ${item.name}: ${quantity}`);
  }

  return {
    price,
    quantity,
    total: price * quantity,
  };
};

const calculateTotals = (cart) => {
  console.log("Calculating totals for cart:", cart);

  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Cart is empty or invalid");
  }

  // Calculate totals with validation
  try {
    const itemTotals = cart.map((item) => {
      const validatedItem = validateCartItem(item);
      console.log(`Validated item ${item.name}:`, validatedItem);
      return validatedItem.total;
    });

    const subtotal = itemTotals.reduce((sum, total) => sum + total, 0);
    const total = subtotal + DELIVERY_FEE;
    const amountInCents = Math.round(total * 100);

    console.log("Calculation results:", {
      subtotal,
      deliveryFee: DELIVERY_FEE,
      total,
      amountInCents,
    });

    return {
      subtotal,
      deliveryFee: DELIVERY_FEE,
      total,
      amountInCents,
    };
  } catch (error) {
    console.error("Error calculating totals:", error);
    throw new Error(`Failed to calculate totals: ${error.message}`);
  }
};

function CheckoutForm({ orderDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderDetails?.customerInfo || !cart?.length) {
      console.log("Missing requirements, redirecting to checkout");
      navigate("/checkout");
    }
  }, [orderDetails, cart, navigate]);

  const createOrder = async (paymentIntent) => {
    try {
      console.log("Creating order with payment intent:", paymentIntent.id);
      const { subtotal, deliveryFee, amountInCents } = calculateTotals(cart);

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
          customerInfo: {
            ...orderDetails.customerInfo,
            email: orderDetails.customerInfo.email.toLowerCase().trim(),
          },
          subtotal,
          deliveryFee,
          totalAmount: amountInCents / 100, // Convert back to pounds for display
        },
      };

      console.log("Sending order data:", orderData);
      const response = await paymentAPI.createOrder(orderData);
      console.log("Order created successfully:", response);
      return response;
    } catch (error) {
      console.error("Order creation failed:", error);
      throw new Error(
        `Failed to create order: ${error.data?.message || error.message}`
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

  const totals = calculateTotals(cart);

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
                    {formatCurrency(
                      (item.selectedPrice || item.price) * item.quantity
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="price-row">
              <span>Delivery Fee</span>
              <span>{formatCurrency(totals.deliveryFee)}</span>
            </div>
            <div className="price-row total">
              <span>Total to Pay</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="delivery-info">
          <h3>Delivery Details</h3>
          {orderDetails?.customerInfo && (
            <>
              <div className="info-grid">
                <div className="info-row">
                  <span>Name:</span>
                  <span>{orderDetails.customerInfo.name}</span>
                </div>
                <div className="info-row">
                  <span>Phone:</span>
                  <span>{orderDetails.customerInfo.phone}</span>
                </div>
                <div className="info-row">
                  <span>Address:</span>
                  <span>{orderDetails.customerInfo.address}</span>
                </div>
                <div className="info-row">
                  <span>City:</span>
                  <span>{orderDetails.customerInfo.city}</span>
                </div>
                <div className="info-row">
                  <span>Postcode:</span>
                  <span>{orderDetails.customerInfo.postcode}</span>
                </div>
                <div className="info-row">
                  <span>Delivery Time:</span>
                  <span>{orderDetails.customerInfo.deliveryTime}</span>
                </div>
              </div>
              {orderDetails.customerInfo.specialInstructions && (
                <div className="special-instructions">
                  <h4>Special Instructions:</h4>
                  <p>{orderDetails.customerInfo.specialInstructions}</p>
                </div>
              )}
            </>
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
                <Spinner size="small" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Pay {formatCurrency(totals.total)}</span>
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
    const initializePayment = async () => {
      try {
        console.log("Initializing payment with cart:", cart);

        if (!cart?.length || !orderDetails?.customerInfo) {
          throw new Error("Missing required payment information");
        }

        const { amountInCents } = calculateTotals(cart);
        console.log("Sending to API - amount in cents:", amountInCents);

        const response = await paymentAPI.createPaymentIntent({
          amount: amountInCents,
          currency: "gbp",
          metadata: {
            customerName: orderDetails.customerInfo.name,
            customerEmail: orderDetails.customerInfo.email,
          },
        });

        console.log("Payment intent created successfully");
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Payment initialization failed:", error);
        setError(error.message);
      }
    };

    initializePayment();
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
        <Spinner />
        <p>Setting up payment...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                colorDanger: "#df1b41",
                fontFamily: "Inter, system-ui, sans-serif",
                borderRadius: "4px",
              },
            },
          }}
        >
          <CheckoutForm orderDetails={orderDetails} />
        </Elements>
      </div>
    </ErrorBoundary>
  );
}

export default PaymentPage;
