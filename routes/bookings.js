const express = require("express");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Service = require("../models/Service");
const { requireAuth, requireCustomer, requireProvider } = require("../lib/auth");
const { applyCompletion, canCancel, canConfirm } = require("../lib/booking-rules");
const { recalculateProvider } = require("../lib/metrics");
const { isObjectId, parseFutureDate, parsePositiveNumber } = require("../lib/validation");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = req.session.user.role === "provider"
      ? { service: { $in: await Service.find({ provider: req.session.user.id }).distinct("_id") } }
      : { user: req.session.user.id };
    const bookings = await Booking.find(query)
      .populate({ path: "service", populate: { path: "provider" } })
      .populate("user")
      .sort({ createdAt: -1 });
    res.render("bookings", { bookings: bookings.filter((booking) => booking.service), user: req.session.user, error: null });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).render("bookings", { bookings: [], user: req.session.user, error: "Failed to load bookings." });
  }
});

router.post("/create", requireCustomer, async (req, res) => {
  try {
    const date = parseFutureDate(req.body.date);
    const hours = parsePositiveNumber(req.body.hours, { min: 1, max: 8 });
    if (!isObjectId(req.body.serviceId) || !date || hours === null) return res.status(400).redirect("/services");
    const service = await Service.findOne({ _id: req.body.serviceId, isActive: true, deletedAt: null });
    if (!service) return res.status(404).redirect("/services");
    const existing = await Booking.exists({
      user: req.session.user.id,
      service: service._id,
      date,
      status: { $in: ["pending", "confirmed"] },
    });
    if (existing) return res.redirect("/bookings");
    const booking = await Booking.create({
      user: req.session.user.id,
      service: service._id,
      date,
      hours,
      priceAtBooking: service.price,
      totalPrice: service.price * hours,
    });
    await Notification.create({
      user: service.provider,
      type: "booking_requested",
      title: "New booking request",
      message: `${req.session.user.name} requested ${service.title} for ${date.toLocaleDateString()}.`,
      relatedBooking: booking._id,
      relatedService: service._id,
    });
    res.redirect("/bookings");
  } catch (err) {
    console.error("Error creating booking:", err);
    res.redirect("/services");
  }
});

router.post("/:id/cancel", requireCustomer, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.redirect("/bookings");
    const booking = await Booking.findOne({ _id: req.params.id, user: req.session.user.id, status: "pending" }).populate("service");
    if (!booking?.service || !canCancel(booking, req.session.user.id)) return res.redirect("/bookings");
    booking.status = "cancelled";
    await booking.save();
    await Notification.create({ user: booking.service.provider, type: "booking_cancelled", title: "Booking cancelled", message: `${req.session.user.name} cancelled a booking for ${booking.service.title}.`, relatedBooking: booking._id, relatedService: booking.service._id });
    res.redirect("/bookings");
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.redirect("/bookings");
  }
});

router.post("/:id/confirm", requireProvider, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.redirect("/bookings");
    const booking = await Booking.findOne({ _id: req.params.id, status: "pending" }).populate("service");
    if (!booking?.service || !canConfirm(booking, req.session.user.id)) return res.redirect("/bookings");
    booking.status = "confirmed";
    await booking.save();
    await Notification.create({ user: booking.user, type: "booking_confirmed", title: "Booking confirmed", message: `${booking.service.title} was confirmed by the provider.`, relatedBooking: booking._id, relatedService: booking.service._id });
    res.redirect("/bookings");
  } catch (err) {
    console.error("Error confirming booking:", err);
    res.redirect("/bookings");
  }
});

router.post("/:id/complete", requireAuth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.redirect("/bookings");
    const booking = await Booking.findOne({ _id: req.params.id, status: "confirmed" }).populate("service");
    if (!booking?.service || booking.paymentStatus !== "paid") return res.redirect("/bookings");
    if (booking.paymentStatus !== "paid") return res.redirect("/bookings?notice=Complete+payment+before+marking+the+booking+complete");
    const isCustomer = booking.user.toString() === req.session.user.id;
    const completion = applyCompletion(booking, req.session.user.id);
    if (!completion.authorized) return res.redirect("/bookings");
    const nowComplete = completion.complete;
    await booking.save();
    if (nowComplete) {
      await recalculateProvider(booking.service.provider);
      await Notification.insertMany([
        { user: booking.user, type: "booking_completed", title: "Booking completed", message: `${booking.service.title} is complete. You can now leave a verified review.`, relatedBooking: booking._id, relatedService: booking.service._id },
        { user: booking.service.provider, type: "booking_completed", title: "Booking completed", message: `${booking.service.title} was marked complete by both parties.`, relatedBooking: booking._id, relatedService: booking.service._id },
      ]);
    } else {
      const recipient = isCustomer ? booking.service.provider : booking.user;
      await Notification.create({ user: recipient, type: "message", title: "Completion confirmation needed", message: `The other party marked ${booking.service.title} complete.`, relatedBooking: booking._id, relatedService: booking.service._id });
    }
    res.redirect("/bookings");
  } catch (err) {
    console.error("Error completing booking:", err);
    res.redirect("/bookings");
  }
});

module.exports = router;
