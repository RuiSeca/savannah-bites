// Reservation.js - Model
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\d\s]{11,}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(v) {
        return v >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'Reservation date must be in the future'
    }
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    enum: {
      values: ["11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM"],
      message: 'Please select a valid time slot'
    }
  },
  guests: {
    type: String,
    required: [true, 'Number of guests is required'],
    validate: {
      validator: function(v) {
        return ['1', '2', '3', '4', '5', '6', '7+'].includes(v);
      },
      message: 'Please select a valid number of guests'
    }
  },
  allergies: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for date and time
reservationSchema.index({ date: 1, time: 1 });

// Method to check availability
reservationSchema.statics.checkAvailability = async function(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $ne: 'cancelled' }
    }).lean();

    const timeSlots = {
      "11:00 AM": 10,
      "1:00 PM": 10,
      "3:00 PM": 10,
      "5:00 PM": 10,
      "7:00 PM": 10,
      "9:00 PM": 10
    };

    // Subtract booked tables
    reservations.forEach(reservation => {
      if (timeSlots[reservation.time] !== undefined) {
        timeSlots[reservation.time] = Math.max(0, timeSlots[reservation.time] - 1);
      }
    });

    return timeSlots;
  } catch (error) {
    console.error('Error in checkAvailability:', error);
    throw error;
  }
};

module.exports = mongoose.model('Reservation', reservationSchema);