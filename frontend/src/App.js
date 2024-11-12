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
import ScrollToTopButton from "./components/ScrollToTopButton";

import "./App.css";

// Load Stripe
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

// Single Loading Spinner
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

  // Simplified navigation handling
  React.useEffect(() => {
    const handleNavigation = () => {
      // Only reload if this isn't the initial page load
      if (performance.navigation.type !== performance.navigation.TYPE_RELOAD) {
        window.scrollTo(0, 0);
      }
    };

    handleNavigation();
  }, [location.pathname]);

  return (
    <div className="app">
      {!isCheckoutOrPayment && <Navigation />}

      <main className="main-content">
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
      </main>

      <ScrollToTopButton />

      {!isCheckoutOrPayment && !isReservationFlow && <FooterPage />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <CartProvider>
          <Elements stripe={stripePromise}>
            <Suspense fallback={<LoadingSpinner />}>
              <AppContent />
            </Suspense>
          </Elements>
        </CartProvider>
      </ErrorBoundary>
    </Router>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong.</h1>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default App;
