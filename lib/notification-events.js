const Booking = require("../models/Booking");
const Notification = require("../models/Notification");

async function notifyServiceUnavailable(service, message) {
  const bookings = await Booking.find({ service: service._id, status: { $in: ["pending", "confirmed"] } }).select("user");
  if (!bookings.length) return;
  await Notification.insertMany(bookings.map((booking) => ({
    user: booking.user,
    type: "service_expired",
    title: "Service unavailable",
    message: message || `${service.title} is currently unavailable.`,
    relatedService: service._id,
    relatedBooking: booking._id,
  })));
}

module.exports = { notifyServiceUnavailable };
