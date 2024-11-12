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
      )}
    </div>
  );
}

export default PaymentPage;
