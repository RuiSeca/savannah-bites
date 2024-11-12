import React, { useEffect, useState, useMemo } from "react";
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
import "./styles.css";
import PaymentDisclaimer from "../PaymentDisclaimer";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 2.5;

// Helper functions
const validateCartItem = (item) => {
  if (!item) throw new Error("Invalid cart item");

  const price = Number(item.selectedPrice || item.price);
  const quantity = Number(item.quantity);

  if (isNaN(price) || price <= 0) {
    throw new Error(`Invalid price for item: ${item.name}`);
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity for item: ${item.name}`);
  }

  return { price, quantity };
};

const validateCartAndCalculateTotals = (cart) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Cart is empty or invalid");
  }

  const itemTotals = cart.map((item) => {
    const { price, quantity } = validateCartItem(item);
    return price * quantity;
  });

  const subtotal = Number(
    itemTotals.reduce((sum, total) => sum + total, 0).toFixed(2)
  );
  const total = Number((subtotal + DELIVERY_FEE).toFixed(2));
  const amountInCents = Math.round(total * 100);

  return {
    subtotal,
    deliveryFee: DELIVERY_FEE,
    total,
    amountInCents,
  };
};

// Transform order data to match API expectations
const transformOrderData = (paymentIntentId, checkoutData) => {
  // Create delivery time Date object from the 24-hour format time
  const deliveryTime = new Date();
  const [hours, minutes] = checkoutData.customerInfo.deliveryTime.split(":");
  deliveryTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

  // If time has passed for today, set it for tomorrow
  if (deliveryTime <= new Date()) {
    deliveryTime.setDate(deliveryTime.getDate() + 1);
  }

  const transformedData = {
    paymentIntentId,
    orderDetails: checkoutData.items.map((item) => ({
      item: item.id || item._id, // Handle both id formats
      name: item.name,
      quantity: parseInt(item.quantity, 10),
      price: Number(item.price || item.selectedPrice),
      size: item.size || "regular",
      modifiers: [],
    })),
    customer: {
      name: checkoutData.customerInfo.name,
      email: checkoutData.customerInfo.email.toLowerCase(),
      phone: checkoutData.customerInfo.phone.replace(/\s+/g, ""),
    },
    address: {
      street: checkoutData.customerInfo.address,
      city: checkoutData.customerInfo.city,
      postcode: checkoutData.customerInfo.postcode,
    },
    amount: {
      subtotal: Number(checkoutData.subtotal),
      deliveryFee: Number(checkoutData.deliveryFee),
      total: Number(
        (checkoutData.subtotal + checkoutData.deliveryFee).toFixed(2)
      ),
      discount: 0,
    },
    deliveryTime: {
      requested: deliveryTime,
    },
    specialInstructions: checkoutData.customerInfo.specialInstructions || "",
    paymentDetails: {
      paymentIntentId,
      method: "card",
      status: "succeeded",
    },
    orderStatus: {
      current: "pending",
      history: [
        {
          status: "pending",
          timestamp: new Date(),
          note: "Order placed",
        },
      ],
    },
  };

  console.log(
    "Transformed order data:",
    JSON.stringify(transformedData, null, 2)
  );
  return transformedData;
};

// Helper function to validate the transformed data
const validateTransformedData = (data) => {
  const requiredFields = [
    "paymentIntentId",
    "orderDetails",
    "customer",
    "address",
    "amount",
    "deliveryTime",
    "paymentDetails",
    "orderStatus",
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  if (!Array.isArray(data.orderDetails) || data.orderDetails.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  return true;
};

function CheckoutForm({ orderDetails, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Calculate totals once and memoize the result
  const totals = useMemo(() => validateCartAndCalculateTotals(cart), [cart]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || isProcessing || !clientSecret) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Submit the payment form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(`Payment submission failed: ${submitError.message}`);
      }

      // Confirm payment
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
        throw new Error(paymentError.message || "Payment failed");
      }

      if (paymentIntent.status === "succeeded") {
        try {
          console.log("Payment succeeded, creating order...");

          // Transform and validate the order data
          const orderData = transformOrderData(paymentIntent.id, orderDetails);
          validateTransformedData(orderData);

          console.log(
            "Sending order data to API:",
            JSON.stringify(orderData, null, 2)
          );

          const { orderId } = await paymentAPI.createOrder(orderData);
          console.log("Order created successfully:", orderId);

          clearCart();

          // Store order information
          sessionStorage.setItem("orderId", orderId);
          sessionStorage.setItem("paymentIntentId", paymentIntent.id);

          // Navigate to confirmation
          navigate("/confirmation", {
            state: {
              orderId,
              paymentIntentId: paymentIntent.id,
            },
            replace: true,
          });
        } catch (orderError) {
          console.error("Order creation error:", orderError);
          throw new Error(
            `Payment successful but order creation failed: ${orderError.message}`
          );
        }
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setError(error.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-container">
      <ProgressSteps currentStep={2} />

      <div className="payment-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>Secure Payment</h1>

        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="items-list">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.size || "regular"}`}
                className="order-item"
              >
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.size && (
                    <span className="item-size">({item.size})</span>
                  )}
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
          {orderDetails?.customerInfo && (
            <>
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
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();

  const orderDetails = location.state?.orderDetails;

  useEffect(() => {
    const initializePayment = async () => {
      try {
        if (!orderDetails?.customerInfo) {
          throw new Error("Please complete your delivery information");
        }

        if (!cart?.length) {
          throw new Error("Your cart is empty");
        }

        const { amountInCents } = validateCartAndCalculateTotals(cart);

        console.log("Creating payment intent:", {
          amount: amountInCents,
          customer: orderDetails.customerInfo.name,
        });

        const response = await paymentAPI.createPaymentIntent({
          amount: amountInCents,
          currency: "gbp",
          metadata: {
            customerName: orderDetails.customerInfo.name,
            customerEmail: orderDetails.customerInfo.email,
            integration_check: "accept_a_payment",
          },
        });

        console.log("Payment intent response:", {
          hasClientSecret: !!response.clientSecret,
          hasId: !!response.id,
        });

        if (!response.clientSecret) {
          throw new Error("Failed to initialize payment");
        }

        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Payment initialization failed:", error);
        setError(error.message);
        setTimeout(() => {
          navigate("/checkout", {
            state: { error: error.message },
          });
        }, 100);
      } finally {
        setLoading(false);
      }
    };

    if (orderDetails && cart?.length) {
      initializePayment();
    } else {
      setLoading(false);
      setError("Missing order details or empty cart");
      setTimeout(() => navigate("/checkout"), 100);
    }
  }, [cart, orderDetails, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container" role="status">
        <div className="spinner" />
        <p>Setting up payment...</p>
      </div>
    );
  }

  // Error state
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

  // Success state
  return (
    <div className="payment-page">
      <PaymentDisclaimer />
      {clientSecret && (
        <>
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
            <CheckoutForm
              orderDetails={orderDetails}
              clientSecret={clientSecret}
            />
          </Elements>
          <div className="stripe-branding">
            <span>Powered by</span>
            <svg
              className="stripe-logo"
              viewBox="0 0 60 25"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
                fill="#6772e5"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

export default PaymentPage;
