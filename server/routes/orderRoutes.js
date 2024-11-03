const express = require('express');
const router = express.Router();
const Order = require('../Models/Order');

const orderEmailService = require('../Services/orderEmailService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper function to parse delivery time
const parseDeliveryTime = (timeString) => {
  // If timeString is in format "10:00 AM - 12:00 PM"
  const startTime = timeString.split(' - ')[0];
  const today = new Date();
  const [hours, minutes] = startTime.match(/(\d+):(\d+)/).slice(1);
  const isPM = startTime.includes('PM');

  const deliveryDate = new Date(today);
  deliveryDate.setHours(
    isPM && parseInt(hours) !== 12 ? parseInt(hours) + 12 : parseInt(hours),
    parseInt(minutes),
    0,
    0
  );

  // If the delivery time has already passed for today, set it to the next day
  if (deliveryDate < today) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  // Ensure that the delivery time is in the future
  if (deliveryDate <= today) {
    throw new Error('Delivery time must be in the future');
  }

  return deliveryDate;
};

// Create a payment intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid amount provided'
      });
    }

    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        integration_check: 'accept_a_payment',
      }
    });

    res.json({
      status: 'success',
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to create payment intent',
      message: error.message
    });
  }
});

// Handle order creation
router.post('/', async (req, res) => {
  try {
    const { paymentIntentId, orderDetails } = req.body;

    // Validate required fields
    if (!orderDetails || !paymentIntentId) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required order details or payment intent ID'
      });
    }

    // Verify payment intent with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          status: 'error',
          error: 'Payment has not been completed successfully'
        });
      }
    } catch (stripeError) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid payment information'
      });
    }

    // Validate customer information
    const customerInfo = orderDetails.customerInfo || {};
    const { email, address, city, postcode, deliveryTime, name, phone } = customerInfo;

    if (!email || !address || !city || !postcode || !deliveryTime) {
      return res.status(400).json({
        status: 'error',
        error: 'Customer information is incomplete. Please provide email, address, city, postcode, and delivery time.'
      });
    }

    if (!address.trim()) {
      return res.status(400).json({
        status: 'error',
        error: 'Street address is required'
      });
    }

    // Parse and validate the requested delivery time
    let requestedDeliveryTime;
    try {
      requestedDeliveryTime = parseDeliveryTime(deliveryTime);
    } catch (deliveryError) {
      return res.status(400).json({
        status: 'error',
        error: deliveryError.message
      });
    }

    // Calculate amounts
    const subtotal = Number((orderDetails.totalAmount - 2.50).toFixed(2));
    const deliveryFee = 2.50;
    const total = Number(orderDetails.totalAmount.toFixed(2));

    // Validate order items
    if (!Array.isArray(orderDetails.items) || orderDetails.items.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Order must contain at least one item'
      });
    }

    // Create the order object
    const newOrder = new Order({
      customer: {
        name: name || 'Customer',
        email: email.toLowerCase().trim(),
        phone: phone || ''
      },
      orderDetails: orderDetails.items.map(item => ({
        item: item.id,
        name: item.name,
        quantity: parseInt(item.quantity),
        price: Number(item.selectedPrice || item.price),
        size: item.size || 'regular'
      })),
      amount: {
        subtotal,
        deliveryFee,
        total
      },
      paymentDetails: {
        paymentIntentId,
        method: 'card',
        status: 'succeeded'
      },
      address: {
        street: address.trim(),
        city: city.trim(),
        postcode: postcode.trim().toUpperCase()
      },
      deliveryTime: {
        requested: requestedDeliveryTime
      },
      orderStatus: {
        current: 'pending',
        history: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed'
        }]
      }
    });

    // Validate the order against the schema
    const validationError = newOrder.validateSync();
    if (validationError) {
      return res.status(400).json({
        status: 'error',
        error: 'Validation failed',
        details: validationError.errors
      });
    }

    // Save the order
    await newOrder.save();

    // Send confirmation email
    try {
      await orderEmailService.sendOrderConfirmation(email, newOrder);
      console.log('Order confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError, {
        orderId: newOrder._id,
        customerEmail: email,
        orderData: newOrder.toObject()
      });
      // Don't return here - we still want to return the successful order
    }

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      orderId: newOrder._id
    });

  } catch (error) {
    console.error('Order creation failed:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      status: 'error',
      error: 'Failed to create order',
      message: error.message
    });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    // Fetch all orders, sorted by creation date in descending order
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch orders'
    });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('Received orderId:', orderId);
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        status: 'error',
        error: 'Order not found'
      });
    }
    
    res.json({
      status: 'success',
      order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch order details'
    });
  }
});

module.exports = router;