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
import { paymentAPI } from "../../config/api";
import "./styles.css";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 2.5;

const validateCartItem = (item) => {
  if (!item) throw new Error("Invalid cart item");

  const price = item.selectedPrice || item.price;
  const quantity = item.quantity;

  if (typeof price !== "number" || price <= 0) {
    throw new Error(`Invalid price for item: ${item.name}`);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity for item: ${item.name}`);
  }

  return true;
};

const calculateTotals = (cart) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Cart is empty or invalid");
  }

  // Calculate subtotal from cart items
  const subtotal = cart.reduce((sum, item) => {
    const price = parseFloat(item.selectedPrice || item.price);
    const quantity = parseInt(item.quantity, 10);

    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price for item: ${item.name}`);
    }
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for item: ${item.name}`);
    }

    return sum + price * quantity;
  }, 0);

  // Calculate totals
  const total = subtotal + DELIVERY_FEE;
  const amountInCents = Math.round(total * 100); // Convert to cents for Stripe

  console.log("Payment calculations:", {
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
};

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const orderDetails = location.state?.orderDetails;

  useEffect(() => {
    if (!orderDetails?.customerInfo || !cart?.length) {
      console.log("Missing requirements, redirecting to checkout");
      navigate("/checkout");
    }
  }, [orderDetails, cart, navigate]);

  const createOrder = async (paymentIntent) => {
    try {
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
          subtotal,
          deliveryFee,
          totalAmount: amountInCents,
          customerInfo: orderDetails.customerInfo,
        },
      };

      console.log("Creating order with data:", orderData);
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

      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

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
              <span>£{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Delivery Fee</span>
              <span>£{totals.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total to Pay</span>
              <span>£{totals.total.toFixed(2)}</span>
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
              <span>Pay £{totals.total.toFixed(2)}</span>
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
        if (!cart?.length || !orderDetails?.customerInfo) {
          throw new Error("Missing required payment information");
        }

        const totals = calculateTotals(cart);
        console.log("Sending to API - amount in cents:", totals.amountInCents);

        const response = await paymentAPI.createPaymentIntent({
          amount: totals.amountInCents, // This is already in cents
          currency: "gbp",
          metadata: {
            customerName: orderDetails.customerInfo.name,
            customerEmail: orderDetails.customerInfo.email,
          },
        });

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
