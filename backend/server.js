const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const morgan = require("morgan");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

// Import routes
const orderRoutes = require("./routes/orderRoutes");
const menuRoutes = require("./routes/menuRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

// Configuration
const CONFIG = {
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || "development",
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  cors: {
    origins: [
      "https://savannahbites.onrender.com",
      "https://savannah-bites.onrender.com",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
    maxAge: 86400, // CORS preflight cache time in seconds (24 hours)
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
};

// Initialize express app
const app = express();

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...CONFIG.cors.origins],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Logging Middleware
if (CONFIG.environment !== "test") {
  app.use(morgan(CONFIG.environment === "development" ? "dev" : "combined"));
}

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CONFIG.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: CONFIG.cors.credentials,
    methods: CONFIG.cors.methods,
    allowedHeaders: CONFIG.cors.allowedHeaders,
    maxAge: CONFIG.cors.maxAge,
  })
);

// Enable pre-flight for all routes
app.options("*", cors());

// Stripe Webhook Handler - Must be before body parser
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        CONFIG.stripe.webhookSecret
      );

      console.log("Stripe event received:", event.type);

      // Handle different event types
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentSuccess(event.data.object);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentFailure(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook Error:", err.message);
      res.status(400).json({
        status: "error",
        message: `Webhook Error: ${err.message}`,
      });
    }
  }
);

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    environment: CONFIG.environment,
  });
});

// API Routes
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: CONFIG.environment === "development" ? err.stack : undefined,
  });

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(CONFIG.environment === "development" && { stack: err.stack }),
  });
});

// Stripe Event Handlers
async function handlePaymentSuccess(paymentIntent) {
  console.log("Payment succeeded:", paymentIntent.id);
  try {
    // Add your payment success logic here
    // For example, update order status, send confirmation email, etc.
  } catch (error) {
    console.error("Error handling payment success:", error);
    // Handle the error appropriately
  }
}

async function handlePaymentFailure(paymentIntent) {
  console.log("Payment failed:", paymentIntent.id);
  try {
    // Add your payment failure logic here
    // For example, update order status, notify customer, etc.
  } catch (error) {
    console.error("Error handling payment failure:", error);
    // Handle the error appropriately
  }
}

// Database Connection
async function connectToDatabase() {
  try {
    await mongoose.connect(CONFIG.mongodb.uri, CONFIG.mongodb.options);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Server Startup
async function startServer() {
  try {
    await connectToDatabase();

    app.listen(CONFIG.port, () => {
      console.log(
        `Server running on port ${CONFIG.port} in ${CONFIG.environment} mode`
      );
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app; // For testing purposes
