const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../Models/Order'); // Adjust the path as necessary

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      await handleFailedPayment(failedPaymentIntent);
      break;
    case 'payment_intent.created':
      const createdPaymentIntent = event.data.object;
      console.log('PaymentIntent was created:', createdPaymentIntent.id);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

async function handleSuccessfulPayment(paymentIntent) {
  try {
    const order = await Order.findOne({ paymentIntentId: paymentIntent.id });
    if (order) {
      order.status = 'paid';
      await order.save();
      console.log('Order payment succeeded:', order.id);
    } else {
      console.log('Order not found for payment intent:', paymentIntent.id);
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleFailedPayment(paymentIntent) {
  try {
    const order = await Order.findOne({ paymentIntentId: paymentIntent.id });
    if (order) {
      order.status = 'failed';
      await order.save();
      console.log('Order payment failed:', order.id);
    } else {
      console.log('Order not found for failed payment intent:', paymentIntent.id);
    }
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

module.exports = { handleWebhook };
