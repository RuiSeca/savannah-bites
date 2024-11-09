import React, { useEffect, useState, useCallback } from "react";
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

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const DELIVERY_FEE = 2.5;

// Validation functions
const validateCartItem = (item) => {
  if (!item) throw new Error("Invalid cart item");

  const price = Number(item.selectedPrice || item.price);
  const quantity = Number(item.quantity);

  if (typeof price !== "number" || isNaN(price) || price <= 0) {
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

  // Validate and calculate each item
  const itemTotals = cart.map((item) => {
    const { price, quantity } = validateCartItem(item);
    return price * quantity;
  });

  // Calculate totals
  const subtotal = Number(
    itemTotals.reduce((sum, total) => sum + total, 0).toFixed(2)
  );
  const total = Number((subtotal + DELIVERY_FEE).toFixed(2));
  const amountInCents = Math.round(total * 100);

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

const validateCustomerInfo = (customerInfo) => {
  if (!customerInfo) throw new Error("Customer information is required");

  const requiredFields = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "postcode",
    "deliveryTime",
  ];

  const missingFields = requiredFields.filter((field) => !customerInfo[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerInfo.email)) {
    throw new Error("Invalid email format");
  }

  // Validate UK postcode
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  if (!postcodeRegex.test(customerInfo.postcode.trim())) {
    throw new Error("Invalid UK postcode format");
  }

  // Validate phone number
  const phoneRegex = /^[\d\s-+()]{10,}$/;
  if (!phoneRegex.test(customerInfo.phone.replace(/\s+/g, ""))) {
    throw new Error("Invalid phone number format");
  }
};

const parseDeliveryDateTime = (timeString) => {
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    const deliveryDate = new Date();
    deliveryDate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, set it for tomorrow
    if (deliveryDate <= new Date()) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    return deliveryDate;
  } catch (error) {
    throw new Error("Invalid delivery time format");
  }
};

function CheckoutForm({ orderDetails, clientSecret }) {
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

  const createOrder = useCallback(
    async (paymentIntent) => {
      try {
        console.log("Creating order with payment intent:", paymentIntent.id);

        if (!cart?.length) {
          throw new Error("Cart is empty or invalid");
        }

        validateCustomerInfo(orderDetails.customerInfo);

        // Calculate totals
        const totals = validateCartAndCalculateTotals(cart);

        const orderData = {
          customer: {
            name: orderDetails.customerInfo.name,
            email: orderDetails.customerInfo.email.toLowerCase().trim(),
            phone: orderDetails.customerInfo.phone,
          },
          orderDetails: cart.map((item) => ({
            item: item._id || item.id,
            name: item.name,
            quantity: parseInt(item.quantity, 10),
            price: Number(item.selectedPrice || item.price),
            size: item.size || "regular",
            modifiers: item.modifiers || [],
          })),
          address: {
            street: orderDetails.customerInfo.address.trim(),
            city: orderDetails.customerInfo.city.trim(),
            postcode: orderDetails.customerInfo.postcode.trim().toUpperCase(),
          },
          amount: {
            subtotal: totals.subtotal,
            deliveryFee: totals.deliveryFee,
            total: totals.total,
            discount: 0,
          },
          paymentDetails: {
            paymentIntentId: paymentIntent.id,
            method: "card",
            status: paymentIntent.status,
          },
          deliveryTime: {
            requested: parseDeliveryDateTime(
              orderDetails.customerInfo.deliveryTime
            ),
          },
          specialInstructions:
            orderDetails.customerInfo.specialInstructions || "",
          orderStatus: {
            current: "pending",
            history: [
              {
                status: "pending",
                timestamp: new Date(),
                note: "Order placed",
                updatedBy: "customer",
              },
            ],
          },
        };

        console.log("Sending order data:", orderData);
        const response = await paymentAPI.createOrder({
          paymentIntentId: paymentIntent.id,
          orderDetails: orderData,
        });
        console.log("Order created successfully:", response);
        return response;
      } catch (error) {
        console.error("Order creation failed:", error);
        throw new Error(error.data?.message || error.message);
      }
    },
    [cart, orderDetails]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || isProcessing || !clientSecret) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const totals = validateCartAndCalculateTotals(cart);
      console.log("Processing payment for amount:", totals.amountInCents);

      // Submit the form first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(`Payment submission failed: ${submitError.message}`);
      }

      // Confirm the payment
      const { error: paymentError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          redirect: "if_required",
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
        });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent.status === "succeeded") {
        // Create order after successful payment
        const orderData = {
          customer: {
            name: orderDetails.customerInfo.name,
            email: orderDetails.customerInfo.email.toLowerCase().trim(),
            phone: orderDetails.customerInfo.phone,
          },
          orderDetails: cart.map((item) => ({
            item: item._id || item.id,
            name: item.name,
            quantity: parseInt(item.quantity, 10),
            price: Number(item.selectedPrice || item.price),
            size: item.size || "regular",
          })),
          address: {
            street: orderDetails.customerInfo.address.trim(),
            city: orderDetails.customerInfo.city.trim(),
            postcode: orderDetails.customerInfo.postcode.trim().toUpperCase(),
          },
          amount: {
            subtotal: totals.subtotal,
            deliveryFee: totals.deliveryFee,
            total: totals.total,
            discount: 0,
          },
          paymentDetails: {
            paymentIntentId: paymentIntent.id,
            method: "card",
            status: paymentIntent.status,
          },
          deliveryTime: {
            requested: parseDeliveryDateTime(
              orderDetails.customerInfo.deliveryTime
            ),
          },
          specialInstructions:
            orderDetails.customerInfo.specialInstructions || "",
        };

        const response = await paymentAPI.createOrder(orderData);
        clearCart();

        // Store order information in sessionStorage as backup
        sessionStorage.setItem("orderId", response.orderId);
        sessionStorage.setItem("paymentIntentId", paymentIntent.id);

        // Navigate to confirmation page
        navigate("/confirmation", {
          state: {
            orderId: response.orderId,
            paymentIntentId: paymentIntent.id,
          },
          replace: true,
        });
      } else {
        throw new Error(`Unexpected payment status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error("Payment/Order error:", error);
      setError(error.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const totals = validateCartAndCalculateTotals(cart);

  return (
    <div className="payment-container">
      <ProgressSteps currentStep={2} />

      <div className="payment-header">
        <h1>Secure Payment</h1>
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="items-list">
            {cart.map((item) => {
              const { price } = validateCartItem(item);
              return (
                <div
                  key={`${item.id || item._id}-${item.size || "regular"}`}
                  className="order-item"
                >
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    {item.size && (
                      <span className="item-size">{item.size}</span>
                    )}
                  </div>
                  <div className="item-price">
                    <span className="quantity">x{item.quantity}</span>
                    <span className="price">
                      £{(price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
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
              {Object.entries(orderDetails.customerInfo).map(
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
        setLoading(true);

        if (!cart?.length) {
          throw new Error("Your cart is empty");
        }

        if (!orderDetails?.customerInfo) {
          throw new Error("Please complete your delivery information");
        }

        validateCustomerInfo(orderDetails.customerInfo);

        const { amountInCents } = validateCartAndCalculateTotals(cart);
        console.log("Creating payment intent with amount:", amountInCents);

        const response = await paymentAPI.createPaymentIntent({
          amount: amountInCents,
          currency: "gbp",
          metadata: {
            customerName: orderDetails.customerInfo.name,
            customerEmail: orderDetails.customerInfo.email,
            integration_check: "accept_a_payment",
          },
        });

        if (!response.clientSecret) {
          throw new Error(
            "No client secret received from payment intent creation"
          );
        }

        console.log("Payment intent created successfully");
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Payment initialization failed:", error);
        setError(error.message || "Failed to initialize payment");
        navigate("/checkout");
      } finally {
        setLoading(false);
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

  if (loading || !clientSecret) {
    return (
      <div className="loading-container" role="status">
        <div className="spinner" />
        <p>Setting up payment...</p>
      </div>
    );
  }

  return (
    <div className="payment-page">
      {!loading && clientSecret && (
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
            clientSecret={clientSecret} // Pass clientSecret here
          />
        </Elements>
      )}
    </div>
  );
}

export default PaymentPage;
