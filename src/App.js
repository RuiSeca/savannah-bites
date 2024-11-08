import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import ScrollToTop from "./components/ScrollToTop";

import "./App.css";

// Load Stripe public key from environment variable
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Lazy load components
const HomePage = lazy(() => import("./components/HomePage"));
const MenuPage = lazy(() => import("./components/MenuPage"));
const CheckoutPage = lazy(() => import("./components/CheckoutPage"));
const PaymentPage = lazy(() => import("./components/PaymentPage"));
const AboutPage = lazy(() => import("./components/AboutPage"));
const ContactPage = lazy(() => import("./components/ContactPage"));
const Navigation = lazy(() => import("./components/Navigation"));
const FooterPage = lazy(() => import("./components/FooterPage"));
const OrderConfirmationPage = lazy(
  () => import("./components/OrderConfirmationPage")
);
const ReservationPage = lazy(() => import("./components/ReservationPage"));
const ReservationConfirmationPage = lazy(
  () => import("./components/ReservationConfirmationPage")
);

// Enhanced loading spinner component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const isCheckoutOrPayment = ["/checkout", "/payment"].includes(
    location.pathname
  );
  const isReservationFlow = [
    "/reservation",
    "/reservation-confirmation",
  ].includes(location.pathname);

  return (
    <div className="app">
      {!isCheckoutOrPayment && (
        <Suspense fallback={<LoadingSpinner />}>
          <Navigation />
        </Suspense>
      )}

      <ScrollToTop />

      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route
              path="/checkout"
              element={
                <div className="checkout-wrapper">
                  <CheckoutPage />
                </div>
              }
            />
            <Route
              path="/payment"
              element={
                <div className="payment-wrapper">
                  <PaymentPage />
                </div>
              }
            />
            <Route
              path="/reservation"
              element={
                <div className="reservation-wrapper">
                  <ReservationPage />
                </div>
              }
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/confirmation" element={<OrderConfirmationPage />} />
            <Route
              path="/reservation-confirmation"
              element={
                <div className="reservation-wrapper">
                  <ReservationConfirmationPage />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {!isCheckoutOrPayment && !isReservationFlow && (
        <Suspense fallback={<LoadingSpinner />}>
          <FooterPage />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <CartProvider>
        <Elements stripe={stripePromise}>
          <AppContent />
        </Elements>
      </CartProvider>
    </Router>
  );
}
