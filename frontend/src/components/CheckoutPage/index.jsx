import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import ProgressSteps from "../ProgressSteps/index.jsx";
import "./styles.css";

// Import images
import suyaSkewersImage from "../../images/suya-skewers.png";
import jollofRiceImage from "../../images/jollof-rice.jpg";
import malvaPuddingImage from "../../images/malva-pudding.png";
import moiMoiImage from "../../images/moi-moi.jpg";
import puffPuffImage from "../../images/puff-puff.jpg";
import egusiSoupImage from "../../images/egusi-soup.jpg";
import jamaicanPattiesImage from "../../images/jamaican-patties.jpg";
import caluluImage from "../../images/calulu.jpg";
import cachupaImage from "../../images/cachupa.jpg";
import chinChinImage from "../../images/chin-chin.jpg";
import bananaFlambeImage from "../../images/banana-flambe.jpg";
import randburgSunImage from "../../images/randburg-sun.jpg"; // Added for Randburg Sun
import waterImage from "../../images/water.jpg";
import cokeImage from "../../images/coca-cola.jpg";
import iceTeaImage from "../../images/ice-tea.jpg";
import compalImage from "../../images/compal.jpg"; // Added for Compal
import strawberryShakeImage from "../../images/strawberry-milkshake.jpg";
import chocolateShakeImage from "../../images/chocolate-milkshake.jpg";
import vanillaShakeImage from "../../images/vanilla-milkshake.jpg";
import oreoShakeImage from "../../images/oreo-milkshake.jpg"; // Added for Oreo Milkshake
import summersBeerImage from "../../images/apple-somersby.jpg";
import superBockImage from "../../images/super-bock.jpg";
import stellaImage from "../../images/stella-artois.jpg";
import cucaImage from "../../images/cuca.jpg"; // Added for Cuca

// Image mapping
const images = {
  "suya-skewers.png": suyaSkewersImage,
  "jollof-rice.jpg": jollofRiceImage,
  "malva-pudding.png": malvaPuddingImage,
  "moi-moi.jpg": moiMoiImage,
  "puff-puff.jpg": puffPuffImage,
  "jamaican-patties.jpg": jamaicanPattiesImage,
  "egusi-soup.jpg": egusiSoupImage,
  "calulu.jpg": caluluImage,
  "cachupa.jpg": cachupaImage,
  "chin-chin.jpg": chinChinImage,
  "banana-flambe.jpg": bananaFlambeImage,
  "randburg-sun.jpg": randburgSunImage,
  "water.jpg": waterImage,
  "coca-cola.jpg": cokeImage,
  "ice-tea.jpg": iceTeaImage,
  "compal.jpg": compalImage,
  "strawberry-milkshake.jpg": strawberryShakeImage,
  "chocolate-milkshake.jpg": chocolateShakeImage,
  "vanilla-milkshake.jpg": vanillaShakeImage,
  "oreo-milkshake.jpg": oreoShakeImage,
  "apple-somersby.jpg": summersBeerImage,
  "super-bock.jpg": superBockImage,
  "stella-artois.jpg": stellaImage,
  "cuca.jpg": cucaImage,
};

const getImage = (filename) =>
  images[filename] || "https://via.placeholder.com/150";

const DELIVERY_FEE = 2.5;
const MINIMUM_ORDER_AMOUNT = 10.0;
const MAX_ITEMS_PER_ORDER = 20;

const DELIVERY_SLOTS = [
  { display: "10:00 AM - 12:00 PM", value: "10:00" },
  { display: "12:00 PM - 2:00 PM", value: "12:00" },
  { display: "2:00 PM - 4:00 PM", value: "14:00" },
  { display: "4:00 PM - 6:00 PM", value: "16:00" },
  { display: "6:00 PM - 8:00 PM", value: "18:00" },
];

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  postcode: "",
  deliveryTime: "",
  specialInstructions: "",
};

const validateUKPostcode = (postcode) => {
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s]{11,14}$/;
  return phoneRegex.test(phone);
};

function CheckoutPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format phone number as user types
  const formatPhoneNumber = useCallback((value) => {
    const phoneNumber = value.replace(/\D/g, "");
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 7)
      return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3)}`;
    return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 7)} ${phoneNumber.slice(7, 11)}`;
  }, []);

  // Handle all input changes
  const handleInputChange = useCallback(
    (e) => {
      const { id, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [id]: id === "phone" ? formatPhoneNumber(value) : value,
      }));

      // Clear errors for the changed field
      setErrors((prev) => ({
        ...prev,
        [id]: "",
        general: "",
      }));
    },
    [formatPhoneNumber]
  );

  // Calculate cart totals
  const { subtotal, totalPrice } = useMemo(() => {
    const subtotal = cart.reduce((total, item) => {
      const price = item.selectedPrice || item.price;
      return total + price * item.quantity;
    }, 0);

    return {
      subtotal,
      totalPrice: subtotal + DELIVERY_FEE,
    };
  }, [cart]);

  // Validate form data
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid UK phone number";
    }

    // Address validation
    if (!formData.street.trim()) {
      newErrors.street = "Street address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = "Postcode is required";
    } else if (!validateUKPostcode(formData.postcode)) {
      newErrors.postcode = "Please enter a valid UK postcode";
    }

    // Delivery time validation
    const deliveryTimeError = validateDeliveryTime(formData.deliveryTime);
    if (deliveryTimeError) {
      newErrors.deliveryTime = deliveryTimeError;
    }

    // Order amount validation
    if (subtotal < MINIMUM_ORDER_AMOUNT) {
      newErrors.general = `Minimum order amount is £${MINIMUM_ORDER_AMOUNT.toFixed(2)}`;
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > MAX_ITEMS_PER_ORDER) {
      newErrors.general = `Maximum ${MAX_ITEMS_PER_ORDER} items allowed per order`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, subtotal, cart]);

  // Quantity handlers
  const handleQuantityChange = useCallback(
    (itemId, newQuantity, size) => {
      if (newQuantity >= 1) {
        updateQuantity(itemId, newQuantity, size);
      }
    },
    [updateQuantity]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      if (cart.length === 0) {
        setErrors({ general: "Your cart is empty" });
        return;
      }

      try {
        setIsSubmitting(true);

        // Calculate totals here to ensure consistency
        const subtotal = cart.reduce((total, item) => {
          const price = Number(item.selectedPrice || item.price);
          return total + price * item.quantity;
        }, 0);

        const totalAmount = subtotal + DELIVERY_FEE;
        const amountInCents = Math.round(totalAmount * 100);

        // Find the delivery slot display value
        const selectedSlot = DELIVERY_SLOTS.find(
          (slot) => slot.value === formData.deliveryTime
        );

        navigate("/payment", {
          state: {
            orderDetails: {
              items: cart.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: parseInt(item.quantity, 10),
                price: Number(item.selectedPrice || item.price),
                size: item.size || "regular",
              })),
              customerInfo: {
                name: formData.name.trim(),
                email: formData.email.toLowerCase().trim(),
                phone: formData.phone,
                address: formData.street.trim(),
                city: formData.city.trim(),
                postcode: formData.postcode.toUpperCase().trim(),
                deliveryTime: formData.deliveryTime, // This will now be in 24-hour format
                specialInstructions: formData.specialInstructions.trim(),
              },
              subtotal: Number(subtotal.toFixed(2)),
              deliveryFee: DELIVERY_FEE,
              totalAmount: amountInCents,
              orderDate: new Date().toISOString(),
              selectedTimeSlot: selectedSlot?.display || "", // Store display value if needed
            },
          },
        });
      } catch (error) {
        console.error("Checkout error:", error);
        setErrors({
          general:
            "There was an error processing your order. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [cart, formData, navigate, validateForm]
  );

  // Empty cart view
  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h1 className="page-title">Checkout</h1>
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <button
              className="primary-button"
              onClick={() => navigate("/menu")}
            >
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout view
  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <ProgressSteps currentStep={1} />

        {/* Header */}
        <div className="checkout-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Checkout</h1>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>
          <ul className="cart-items">
            {cart.map((item) => (
              <li
                key={`${item.id}-${item.size || "default"}`}
                className="cart-item"
              >
                <div className="item-info">
                  <img
                    src={getImage(item.image)}
                    alt={item.name}
                    className="checkout-item-image"
                  />
                  <span className="item-name">
                    {item.name}
                    {item.size && (
                      <span className="item-size">({item.size})</span>
                    )}
                  </span>
                  <span className="item-price">
                    £{(item.selectedPrice || item.price).toFixed(2)}
                  </span>
                </div>

                <div className="quantity-controls">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(
                        item.id,
                        item.quantity - 1,
                        item.size
                      )
                    }
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(
                        item.id,
                        item.quantity + 1,
                        item.size
                      )
                    }
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id, item.size)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="price-summary">
            <div className="price-row">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Delivery Fee</span>
              <span>£{DELIVERY_FEE.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total</span>
              <span>£{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Details Form */}
        <form onSubmit={handleSubmit} className="delivery-form">
          <h2>Delivery Details</h2>

          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={errors.name ? "error" : ""}
                />
                {errors.name && (
                  <span className="error-text">{errors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className={errors.email ? "error" : ""}
                />
                {errors.email && (
                  <span className="error-text">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className={errors.phone ? "error" : ""}
                />
                {errors.phone && (
                  <span className="error-text">{errors.phone}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Delivery Address</h3>
            <div className="form-group">
              <label htmlFor="street">Street Address *</label>
              <textarea
                id="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Enter your street address"
                rows="2"
                className={errors.street ? "error" : ""}
              />
              {errors.street && (
                <span className="error-text">{errors.street}</span>
              )}
            </div>

            <div className="address-grid">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  className={errors.city ? "error" : ""}
                />
                {errors.city && (
                  <span className="error-text">{errors.city}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="postcode">Postcode *</label>
                <input
                  type="text"
                  id="postcode"
                  value={formData.postcode}
                  onChange={handleInputChange}
                  placeholder="Enter postcode"
                  className={errors.postcode ? "error" : ""}
                />
                {errors.postcode && (
                  <span className="error-text">{errors.postcode}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="summary-title">Delivery Options</h2>

            <div className="form-group">
              <label htmlFor="deliveryTime">Preferred Delivery Time *</label>
              <select
                id="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleInputChange}
                className={errors.deliveryTime ? "error" : ""}
              >
                <option value="">Select delivery time</option>
                {DELIVERY_SLOTS.map((slot) => (
                  <option key={slot.display} value={slot.value}>
                    {slot.display}
                  </option>
                ))}
              </select>
              {errors.deliveryTime && (
                <span className="error-message">{errors.deliveryTime}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="specialInstructions">
                Special Instructions (Optional)
              </label>
              <textarea
                id="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                placeholder="Add any special delivery instructions..."
                rows="3"
                className="special-instructions"
              />
            </div>

            {/* Price Summary */}
            <div className="price-summary">
              <div className="price-row">
                <span>Subtotal:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="price-row">
                <span>Delivery Fee:</span>
                <span>£{DELIVERY_FEE.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <span>Total Amount:</span>
                <span>£{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Minimum Order Notice */}
            <div className="order-notice">
              <p>* Minimum order: £{MINIMUM_ORDER_AMOUNT.toFixed(2)}</p>
              <p>* Maximum {MAX_ITEMS_PER_ORDER} items per order</p>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="error-message general">{errors.general}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <span>Proceed to Payment • £{totalPrice.toFixed(2)}</span>
              )}
            </button>
          </div>

          {/* Terms and Privacy */}
          <div className="terms-section">
            <p>
              By proceeding, you agree to our{" "}
              <a href="/terms" className="link">
                Terms & Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" className="link">
                Privacy Policy
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CheckoutPage;
