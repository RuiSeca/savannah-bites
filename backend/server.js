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
const Order = require("./Models/Order");

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
      "http://localhost:3001",
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
      "http://10.77.228.19:3000",
      "http://10.77.228.19:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "stripe-signature",
      "Origin",
      "Accept",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
    ],
    exposedHeaders: ["Access-Control-Allow-Origin"],
    maxAge: 86400,
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: "2023-10-16",
  },
};

// Initialize express app
const app = express();

// Security Middleware with relaxed CSP for development
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          ...CONFIG.cors.origins,
          "https://api.stripe.com",
          "*",
        ],
        imgSrc: ["'self'", "data:", "https:", "*"],
        scriptSrc: [
          "'self'",
          "https://js.stripe.com",
          "'unsafe-inline'",
          "'unsafe-eval'",
        ],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Logging Middleware
if (CONFIG.environment !== "test") {
  app.use(morgan(CONFIG.environment === "development" ? "dev" : "combined"));
}

// CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (CONFIG.environment === "development") {
        callback(null, true);
      } else if (!origin || CONFIG.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: CONFIG.cors.methods,
    allowedHeaders: CONFIG.cors.allowedHeaders,
    exposedHeaders: CONFIG.cors.exposedHeaders,
  })
);

// Add CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Development mode - allow all origins including IP addresses
  if (CONFIG.environment === "development") {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", CONFIG.cors.methods.join(","));
    res.header(
      "Access-Control-Allow-Headers",
      CONFIG.cors.allowedHeaders.join(",")
    );
    return next();
  }

  // Production mode - check against allowed origins
  if (origin && CONFIG.cors.origins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", CONFIG.cors.methods.join(","));
    res.header(
      "Access-Control-Allow-Headers",
      CONFIG.cors.allowedHeaders.join(",")
    );
    return next();
  }

  // Log rejected origins in development
  if (CONFIG.environment === "development") {
    console.log(`Rejected Origin: ${origin}`);
  }

  next();
});

// Update the CORS configuration for Express
app.use(
  cors({
    origin: function (origin, callback) {
      if (CONFIG.environment === "development") {
        callback(null, true);
      } else if (!origin || CONFIG.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: CONFIG.cors.methods,
    allowedHeaders: CONFIG.cors.allowedHeaders,
    exposedHeaders: CONFIG.cors.exposedHeaders,
  })
);

// Add specific handling for payment route
app.use("/api/orders/create-payment-intent", (req, res, next) => {
  const origin = req.headers.origin;

  if (
    CONFIG.environment === "development" ||
    CONFIG.cors.origins.includes(origin)
  ) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).json({ body: "OK" });
  }

  next();
});

// Enable pre-flight for all routes
app.options(
  "*",
  cors({
    origin: CONFIG.environment === "development" ? true : CONFIG.cors.origins,
    credentials: true,
    methods: CONFIG.cors.methods,
    allowedHeaders: CONFIG.cors.allowedHeaders,
    maxAge: CONFIG.cors.maxAge,
  })
);

// Development request logging
if (CONFIG.environment === "development") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("Headers:", req.headers);
    if (req.body && Object.keys(req.body).length) {
      console.log("Body:", {
        ...req.body,
        ...(req.body.card && { card: "****" }),
      });
    }
    next();
  });
}

// Stripe webhook handler - Must be before body parser
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

      console.log("Stripe webhook received:", {
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString(),
      });

      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentSuccess(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await handlePaymentFailure(event.data.object);
          break;
        case "charge.succeeded":
          await handleChargeSuccess(event.data.object);
          break;
        case "charge.failed":
          await handleChargeFailure(event.data.object);
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
    cors: {
      origins: CONFIG.cors.origins,
    },
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
    path: req.path,
    method: req.method,
    body: req.body,
    origin: req.headers.origin,
  });

  // Handle Stripe errors
  if (err.type === "StripeError") {
    return res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message,
      code: err.code,
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Handle CORS errors
  if (err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      status: "error",
      message: "CORS error",
      allowedOrigins: CONFIG.cors.origins,
      requestOrigin: req.headers.origin,
    });
  }

  // Handle other errors
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
    const order = await Order.findOne({
      "paymentDetails.paymentIntentId": paymentIntent.id,
    });

    if (order) {
      order.paymentDetails.status = "succeeded";
      order.orderStatus.current = "confirmed";
      order.orderStatus.history.push({
        status: "confirmed",
        timestamp: new Date(),
        note: "Payment confirmed",
      });

      await order.save();
      console.log(`Order ${order._id} updated with successful payment`);
    } else {
      console.log(`No order found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentFailure(paymentIntent) {
  console.log("Payment failed:", paymentIntent.id);
  try {
    const order = await Order.findOne({
      "paymentDetails.paymentIntentId": paymentIntent.id,
    });

    if (order) {
      order.paymentDetails.status = "failed";
      order.orderStatus.current = "cancelled";
      order.orderStatus.history.push({
        status: "cancelled",
        timestamp: new Date(),
        note: "Payment failed",
      });

      await order.save();
      console.log(`Order ${order._id} updated with failed payment`);
    } else {
      console.log(`No order found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handleChargeSuccess(charge) {
  console.log("Charge succeeded:", charge.id);
  try {
    const order = await Order.findOne({
      "paymentDetails.paymentIntentId": charge.payment_intent,
    });

    if (order) {
      order.orderStatus.history.push({
        status: "payment_processed",
        timestamp: new Date(),
        note: `Charge processed: ${charge.id}`,
      });

      await order.save();
      console.log(`Order ${order._id} updated with successful charge`);
    }
  } catch (error) {
    console.error("Error handling charge success:", error);
  }
}

async function handleChargeFailure(charge) {
  console.log("Charge failed:", charge.id);
  try {
    const order = await Order.findOne({
      "paymentDetails.paymentIntentId": charge.payment_intent,
    });

    if (order) {
      order.orderStatus.history.push({
        status: "payment_failed",
        timestamp: new Date(),
        note: `Charge failed: ${charge.id} - ${charge.failure_message}`,
      });

      await order.save();
      console.log(`Order ${order._id} updated with failed charge`);
    }
  } catch (error) {
    console.error("Error handling charge failure:", error);
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
      console.log(`CORS enabled for origins:`, CONFIG.cors.origins);
      console.log(`Webhook endpoint: ${process.env.WEBHOOK_URL || "/webhook"}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

// Error Handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
