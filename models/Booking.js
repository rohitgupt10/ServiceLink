const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 1,
    max: 24
  },
  priceAtBooking: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'complete'],
    default: 'pending'
  },
  userCompleted: {
    type: Boolean,
    default: false
  },
  providerCompleted: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  }
}, { timestamps: true });

bookingSchema.index({ user: 1, service: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
