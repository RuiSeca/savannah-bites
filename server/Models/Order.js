const mongoose = require('mongoose');
const validator = require('validator');

const orderDetailsSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    // Made optional since you might not always have the Menu item reference
    required: false
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  size: {
    type: String,
    enum: {
      values: ['small', 'medium', 'large', 'regular'],
      message: '{VALUE} is not a supported size'
    },
    default: 'regular'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(v) {
        return Number.isFinite(v) && v >= 0;
      },
      message: props => `${props.value} is not a valid price`
    }
  }
});

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    minlength: [5, 'Street address is too short']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    minlength: [2, 'City name is too short']
  },
  postcode: {
    type: String,
    required: [true, 'Postcode is required'],
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // More lenient UK postcode validation
        return /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i.test(v.trim());
      },
      message: props => `${props.value} is not a valid UK postcode`
    }
  }
});

const orderSchema = new mongoose.Schema({
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Name is too short']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          // More lenient phone validation
          return !v || /^[\d\s-+()]{10,}$/.test(v.replace(/\s+/g, ''));
        },
        message: props => `${props.value} is not a valid phone number`
      }
    }
  },
  orderDetails: {
    type: [orderDetailsSchema],
    required: [true, 'Order must contain at least one item'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  address: addressSchema,
  amount: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
      validate: {
        validator: function(v) {
          return Number.isFinite(v) && v >= 0;
        },
        message: props => `${props.value} is not a valid subtotal`
      }
    },
    deliveryFee: {
      type: Number,
      required: [true, 'Delivery fee is required'],
      min: [0, 'Delivery fee cannot be negative'],
      default: 2.50
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    }
  },
  paymentDetails: {
    paymentIntentId: {
      type: String,
      required: [true, 'Payment intent ID is required'],
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'succeeded', 'failed'],
        message: '{VALUE} is not a valid payment status'
      },
      default: 'pending'
    },
    method: {
      type: String,
      enum: {
        values: ['card', 'cash'],
        message: '{VALUE} is not a valid payment method'
      },
      required: true
    }
  },
  orderStatus: {
    current: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid order status'
      },
      default: 'pending'
    },
    history: [{
      status: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      note: String
    }]
  },
  deliveryTime: {
    requested: {
      type: Date,
      required: [true, 'Delivery time is required'],
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'Delivery time must be in the future'
      }
    },
    actual: Date
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxLength: [500, 'Special instructions cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Improved pre-save middleware
orderSchema.pre('save', async function(next) {
  try {
    // Round monetary values to 2 decimal places
    if (this.amount.subtotal) {
      this.amount.subtotal = Number(this.amount.subtotal.toFixed(2));
    }
    if (this.amount.deliveryFee) {
      this.amount.deliveryFee = Number(this.amount.deliveryFee.toFixed(2));
    }
    
    // Calculate total
    if (this.amount.subtotal && this.amount.deliveryFee) {
      this.amount.total = Number((this.amount.subtotal + this.amount.deliveryFee).toFixed(2));
    }

    // Validate order total matches items
    const calculatedSubtotal = this.orderDetails.reduce(
      (sum, item) => sum + (Number(item.price) * item.quantity),
      0
    );
    
    if (Math.abs(calculatedSubtotal - this.amount.subtotal) > 0.01) {
      throw new Error(`Order subtotal (${this.amount.subtotal}) does not match items total (${calculatedSubtotal})`);
    }

    // Add status to history if changed
    if (this.isModified('orderStatus.current')) {
      this.orderStatus.history.push({
        status: this.orderStatus.current,
        timestamp: new Date(),
        note: 'Status updated'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Improved indexes
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'orderStatus.current': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentDetails.paymentIntentId': 1 }, { unique: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;