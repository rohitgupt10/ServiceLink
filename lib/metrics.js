const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Service = require("../models/Service");
const User = require("../models/User");

async function recalculateProvider(providerId) {
  const normalizedProviderId = typeof providerId === "string" ? new mongoose.Types.ObjectId(providerId) : providerId;
  const serviceIds = await Service.find({ provider: normalizedProviderId, deletedAt: null }).distinct("_id");
  const [rating] = await Review.aggregate([
    { $match: { provider: normalizedProviderId } },
    { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
  ]);
  const completed = await Booking.find({ service: { $in: serviceIds }, status: "complete", paymentStatus: { $ne: "refunded" } }).select("totalPrice");
  await User.findByIdAndUpdate(normalizedProviderId, {
    averageRating: rating?.averageRating || 0,
    totalReviews: rating?.totalReviews || 0,
    completedServices: completed.length,
    totalEarnings: completed.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
  });
}

async function recalculateService(serviceId) {
  const service = await Service.findById(serviceId).select("provider");
  if (!service) return;
  const [rating] = await Review.aggregate([
    { $match: { service: service._id } },
    { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
  ]);
  await Service.findByIdAndUpdate(serviceId, {
    averageRating: rating?.averageRating || 0,
    totalReviews: rating?.totalReviews || 0,
  });
  await recalculateProvider(service.provider);
}

module.exports = { recalculateProvider, recalculateService };
