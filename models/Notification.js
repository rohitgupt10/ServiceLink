const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "booking_confirmed",
      "booking_requested",
      "booking_completed",
      "booking_cancelled",
      "review_received",
      "service_expired",
      "message",
      "payment_received",
      "payment_refunded",
      "verification_update",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },
  relatedService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
