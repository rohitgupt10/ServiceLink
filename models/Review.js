const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
  images: [
    {
      type: String,
      trim: true,
    },
  ],
  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  communicationRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  timelinessRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

reviewSchema.index(
  { booking: 1 },
  { unique: true, partialFilterExpression: { booking: { $exists: true } } },
);

module.exports = mongoose.model("Review", reviewSchema);
