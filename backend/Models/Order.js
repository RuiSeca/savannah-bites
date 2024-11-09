const mongoose = require("mongoose");
const validator = require("validator");

// Custom validators
const validateAmount = {
  validator: function (v) {
    return Number.isFinite(v) && v >= 0 && Number.isInteger(v * 100);
  },
  message: (props) =>
    `${props.value} is not a valid amount (must be a non-negative number with at most 2 decimal places)`,
};

const validateUKPostcode = {
  validator: function (v) {
    return /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i.test(v.trim());
  },
  message: (props) => `${props.value} is not a valid UK postcode`,
};

const validatePhoneNumber = {
  validator: function (v) {
    return !v || /^[\d\s-+()]{10,}$/.test(v.replace(/\s+/g, ""));
  },
  message: (props) => `${props.value} is not a valid phone number`,
};

// Schemas
const orderDetailsSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu",
    required: false,
  },
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true,
    minlength: [2, "Item name must be at least 2 characters"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
    validate: {
      validator: Number.isInteger,
      message: "{VALUE} is not a valid quantity (must be a whole number)",
    },
  },
  size: {
    type: String,
    enum: {
      values: ["small", "medium", "large", "regular"],
      message: "{VALUE} is not a supported size",
    },
    default: "regular",
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    validate: validateAmount,
  },
  modifiers: [
    {
      name: String,
      price: {
        type: Number,
        validate: validateAmount,
      },
    },
  ],
});

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: [true, "Street address is required"],
    trim: true,
    minlength: [5, "Street address is too short"],
  },
  city: {
    type: String,
    required: [true, "City is required"],
    trim: true,
    minlength: [2, "City name is too short"],
  },
  postcode: {
    type: String,
    required: [true, "Postcode is required"],
    trim: true,
    uppercase: true,
    validate: validateUKPostcode,
  },
});

const orderSchema = new mongoose.Schema(
  {
    customer: {
      name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true,
        minlength: [2, "Name is too short"],
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        validate: {
          validator: validator.isEmail,
          message: "Please provide a valid email address",
        },
      },
      phone: {
        type: String,
        trim: true,
        validate: validatePhoneNumber,
      },
    },
    orderDetails: {
      type: [orderDetailsSchema],
      required: [true, "Order must contain at least one item"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },
    address: addressSchema,
    amount: {
      subtotal: {
        type: Number,
        required: [true, "Subtotal is required"],
        validate: validateAmount,
      },
      deliveryFee: {
        type: Number,
        required: [true, "Delivery fee is required"],
        validate: validateAmount,
        default: 2.5,
      },
      total: {
        type: Number,
        required: [true, "Total amount is required"],
        validate: validateAmount,
      },
      discount: {
        type: Number,
        validate: validateAmount,
        default: 0,
      },
    },
    paymentDetails: {
      paymentIntentId: {
        type: String,
        required: [true, "Payment intent ID is required"],
        unique: true,
        trim: true,
      },
      status: {
        type: String,
        enum: {
          values: ["pending", "succeeded", "failed", "refunded"],
          message: "{VALUE} is not a valid payment status",
        },
        default: "pending",
      },
      method: {
        type: String,
        enum: {
          values: ["card", "cash"],
          message: "{VALUE} is not a valid payment method",
        },
        required: true,
      },
      refundDetails: {
        amount: {
          type: Number,
          validate: validateAmount,
        },
        reason: String,
        date: Date,
      },
    },
    orderStatus: {
      current: {
        type: String,
        enum: {
          values: [
            "pending",
            "confirmed",
            "preparing",
            "ready",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ],
          message: "{VALUE} is not a valid order status",
        },
        default: "pending",
      },
      history: [
        {
          status: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
          note: String,
          updatedBy: String,
        },
      ],
    },
    deliveryTime: {
      requested: {
        type: Date,
        required: [true, "Delivery time is required"],
        validate: {
          validator: function (v) {
            return v > new Date();
          },
          message: "Delivery time must be in the future",
        },
      },
      estimated: Date,
      actual: Date,
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxLength: [500, "Special instructions cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Middleware
orderSchema.pre("save", async function (next) {
  try {
    // Ensure monetary values are properly rounded
    if (this.amount.subtotal) {
      this.amount.subtotal = Number(this.amount.subtotal.toFixed(2));
    }
    if (this.amount.deliveryFee) {
      this.amount.deliveryFee = Number(this.amount.deliveryFee.toFixed(2));
    }
    if (this.amount.discount) {
      this.amount.discount = Number(this.amount.discount.toFixed(2));
    }

    // Calculate total with discount
    if (this.amount.subtotal && this.amount.deliveryFee) {
      this.amount.total = Number(
        (
          this.amount.subtotal +
          this.amount.deliveryFee -
          (this.amount.discount || 0)
        ).toFixed(2)
      );
    }

    // Validate total matches items
    const calculatedSubtotal = this.orderDetails.reduce((sum, item) => {
      const itemTotal = Number(item.price) * item.quantity;
      const modifiersTotal =
        item.modifiers?.reduce((mSum, mod) => mSum + (mod.price || 0), 0) || 0;
      return sum + itemTotal + modifiersTotal;
    }, 0);

    if (Math.abs(calculatedSubtotal - this.amount.subtotal) > 0.01) {
      throw new Error(
        `Order subtotal (${this.amount.subtotal}) does not match items total (${calculatedSubtotal})`
      );
    }

    // Update status history
    if (this.isModified("orderStatus.current")) {
      this.orderStatus.history.push({
        status: this.orderStatus.current,
        timestamp: new Date(),
        note: "Status updated",
        updatedBy: this.orderStatus.updatedBy || "system",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for better query performance
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ "orderStatus.current": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "paymentDetails.paymentIntentId": 1 }, { unique: true });
orderSchema.index({ "deliveryTime.requested": 1 });

// Virtual for order age
orderSchema.virtual("orderAge").get(function () {
  return new Date() - this.createdAt;
});

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  const nonCancellableStatuses = ["out_for_delivery", "delivered", "cancelled"];
  return !nonCancellableStatuses.includes(this.orderStatus.current);
};

// Method to check if order can be modified
orderSchema.methods.canBeModified = function () {
  const nonModifiableStatuses = [
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  return !nonModifiableStatuses.includes(this.orderStatus.current);
};

// Static method to find orders requiring attention
orderSchema.statics.findRequiringAttention = function () {
  const attentionStatuses = ["pending", "confirmed"];
  return this.find({
    "orderStatus.current": { $in: attentionStatuses },
    "deliveryTime.requested": { $lte: new Date(Date.now() + 30 * 60 * 1000) }, // Next 30 minutes
  }).sort("deliveryTime.requested");
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
