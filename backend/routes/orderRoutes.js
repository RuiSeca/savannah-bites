const express = require("express");
const router = express.Router();
const Order = require("../Models/Order");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const orderEmailService = require("../Services/orderEmailService");

// Helper function to validate and parse delivery time
const parseDeliveryTime = (timeString) => {
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    const today = new Date();
    const deliveryDate = new Date(today);

    deliveryDate.setHours(hours, minutes, 0, 0);

    // If time has passed for today, set for tomorrow
    if (deliveryDate <= today) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    return deliveryDate;
  } catch (error) {
    throw new Error("Invalid delivery time format");
  }
};

// Create payment intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    // Log the received amount
    console.log("Received amount:", amount);

    // Validate amount
    if (!amount || typeof amount !== "number" || amount <= 0) {
      console.error("Invalid amount:", amount);
      return res.status(400).json({
        status: "error",
        error: "Invalid amount provided: amount must be a positive number",
      });
    }

    // Ensure amount is an integer (whole number of cents)
    const roundedAmount = Math.round(amount);
    console.log("Creating payment intent with amount:", roundedAmount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: roundedAmount,
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("Payment intent created successfully");
    res.json({
      status: "success",
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to create payment intent",
      message: error.message,
    });
  }
});

// Create order route
router.post("/", async (req, res) => {
  try {
    console.log("Received order creation request:", req.body);
    const { paymentIntentId, orderDetails } = req.body;

    // Initial validation
    if (!orderDetails || !paymentIntentId) {
      return res.status(400).json({
        status: "error",
        error: "Missing required order details or payment intent ID",
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(
      "Retrieved payment intent:",
      paymentIntent.id,
      "Status:",
      paymentIntent.status
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        status: "error",
        error: "Payment has not been completed successfully",
      });
    }

    // Validate order data
    const validationErrors = validateOrderData(orderDetails, paymentIntent);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: "error",
        error: "Order validation failed",
        details: validationErrors,
      });
    }

    // Convert amounts
    const amountInPounds = paymentIntent.amount / 100;
    const deliveryFee = 2.5;
    const subtotalInPounds = Number((amountInPounds - deliveryFee).toFixed(2));

    // Parse delivery time
    const deliveryTime = parseDeliveryTime(
      orderDetails.customerInfo.deliveryTime
    );

    // Create order object
    const newOrder = new Order({
      customer: {
        name: orderDetails.customerInfo.name,
        email: orderDetails.customerInfo.email.toLowerCase().trim(),
        phone: orderDetails.customerInfo.phone,
      },
      orderDetails: orderDetails.items.map((item) => ({
        item: item.id,
        name: item.name,
        quantity: parseInt(item.quantity, 10),
        price: Number(item.selectedPrice || item.price),
        size: item.size || "regular",
      })),
      amount: {
        subtotal: subtotalInPounds,
        deliveryFee,
        total: amountInPounds,
        discount: orderDetails.discount || 0,
      },
      paymentDetails: {
        paymentIntentId,
        method: "card",
        status: "succeeded",
      },
      address: {
        street: orderDetails.customerInfo.address.trim(),
        city: orderDetails.customerInfo.city.trim(),
        postcode: orderDetails.customerInfo.postcode.trim().toUpperCase(),
      },
      deliveryTime: {
        requested: deliveryTime,
      },
      specialInstructions: orderDetails.customerInfo.specialInstructions,
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
    });

    // Validate against schema
    const validationError = newOrder.validateSync();
    if (validationError) {
      console.error("Order validation failed:", validationError);
      return res.status(400).json({
        status: "error",
        error: "Validation failed",
        details: validationError.errors,
      });
    }

    // Save order
    const savedOrder = await newOrder.save();
    console.log("Order saved successfully:", savedOrder._id);

    // Send confirmation email
    try {
      await orderEmailService.sendOrderConfirmation(
        orderDetails.customerInfo.email,
        savedOrder
      );
      console.log("Order confirmation email sent");
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Log but don't fail the order
    }

    // Send success response
    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      orderId: savedOrder._id,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to create order",
      message: error.message,
    });
  }
});

// Get all orders with optional filtering
router.get("/", async (req, res) => {
  try {
    const { status, date, email } = req.query;
    let query = {};

    // Apply filters if provided
    if (status) {
      query["orderStatus.current"] = status;
    }
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query.createdAt = { $gte: startOfDay, $lt: endOfDay };
    }
    if (email) {
      query["customer.email"] = email.toLowerCase();
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      status: "success",
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to fetch orders",
    });
  }
});

// Get order by ID
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: "error",
        error: "Order not found",
      });
    }

    res.json({
      status: "success",
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to fetch order details",
    });
  }
});

// Update order status
router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        status: "error",
        error: "Status is required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "error",
        error: "Order not found",
      });
    }

    // Update status
    order.orderStatus.current = status;
    order.orderStatus.history.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`,
    });

    await order.save();

    // Attempt to send status update email
    try {
      await orderEmailService.sendStatusUpdate(order.customer.email, order);
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    res.json({
      status: "success",
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to update order status",
    });
  }
});

// Cancel order
router.post("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "error",
        error: "Order not found",
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        status: "error",
        error: "Order cannot be cancelled in its current state",
      });
    }

    // Process refund if payment was made
    if (order.paymentDetails.status === "succeeded") {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.paymentDetails.paymentIntentId,
        });

        order.paymentDetails.refundDetails = {
          amount: order.amount.total,
          reason: reason || "Customer requested cancellation",
          date: new Date(),
        };
      } catch (refundError) {
        console.error("Refund failed:", refundError);
        return res.status(500).json({
          status: "error",
          error: "Failed to process refund",
        });
      }
    }

    // Update order status
    order.orderStatus.current = "cancelled";
    order.orderStatus.history.push({
      status: "cancelled",
      timestamp: new Date(),
      note: reason || "Order cancelled by customer",
    });

    await order.save();

    // Send cancellation email
    try {
      await orderEmailService.sendCancellationEmail(
        order.customer.email,
        order
      );
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    res.json({
      status: "success",
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to cancel order",
    });
  }
});

// Get orders requiring attention (for admin dashboard)
router.get("/admin/attention", async (req, res) => {
  try {
    const orders = await Order.findRequiringAttention();

    res.json({
      status: "success",
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders requiring attention:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to fetch orders requiring attention",
    });
  }
});

module.exports = router;
