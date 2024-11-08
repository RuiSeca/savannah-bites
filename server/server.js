const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const orderRoutes = require("./routes/orderRoutes");
const menuRoutes = require("./routes/menuRoutes");
const reservationRoutes = require("./routes/ReservationRoutes");
const morgan = require("morgan");
require("dotenv").config();

// Initialize Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// Logging middleware
app.use(morgan("dev"));

// Update CORS configuration in server.js
app.use(
  cors({
    origin: [
      "https://savannahbites.onrender.com", // Your frontend Render URL
      "https://savannah-bites.onrender.com", // Alternative frontend URL format
      "http://localhost:3000", // Local development URL
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  })
);
app.options("*", cors()); // Enable pre-flight for all routes

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Stripe webhook route - Must be before body parser
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log("Stripe event received:", event.type);

      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("Payment succeeded:", paymentIntent.id);
          break;

        case "payment_intent.payment_failed":
          const failedPayment = event.data.object;
          console.log("Payment failed:", failedPayment.id);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// Body parser middleware - after webhook route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    status: "success",
    message: "API is working",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
