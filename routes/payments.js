const express = require("express");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { isObjectId, safeText } = require("../lib/validation");
const { TEST_CARDS, processDummyPayment } = require("../services/payment-gateway");

const router = express.Router();

router.get("/checkout/:bookingId", requireCustomer, async (req, res) => {
  if (!isObjectId(req.params.bookingId)) return res.redirect("/bookings");
  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.session.user.id, status: "confirmed", paymentStatus: "unpaid" })
    .populate({ path: "service", populate: { path: "provider", select: "name email" } });
  if (!booking?.service) return res.redirect("/bookings");
  res.render("payments/checkout", { booking, error: req.query.error || null, testCards: TEST_CARDS, pageTitle: "Demo checkout" });
});

router.post("/checkout/:bookingId", requireCustomer, async (req, res) => {
  try {
    if (!isObjectId(req.params.bookingId)) return res.redirect("/bookings");
    const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.session.user.id, status: "confirmed", paymentStatus: "unpaid" }).populate("service");
    if (!booking?.service) return res.redirect("/bookings");
    const cardholder = safeText(req.body.cardholder, { min: 2, max: 100 });
    const result = processDummyPayment({ cardNumber: req.body.cardNumber, amount: booking.totalPrice });
    if (!cardholder || !result.ok) {
      const message = !cardholder ? "Enter the cardholder name." : result.message;
      return res.redirect(`/payments/checkout/${booking._id}?error=${encodeURIComponent(message)}`);
    }
    const payment = await Payment.findOneAndUpdate(
      { booking: booking._id },
      { customer: booking.user, provider: booking.service.provider, amount: booking.totalPrice, currency: "NPR", method: "dummy_card", status: "paid", transactionId: result.transactionId, last4: result.last4, failureReason: "", paidAt: new Date(), refundedAt: null },
      { upsert: true, new: true, runValidators: true },
    );
    booking.payment = payment._id;
    booking.paymentStatus = "paid";
    await booking.save();
    await Notification.insertMany([
      { user: booking.user, type: "payment_received", title: "Demo payment successful", message: `Your demo payment of Rs.${booking.totalPrice.toFixed(2)} was recorded.`, relatedBooking: booking._id, relatedService: booking.service._id },
      { user: booking.service.provider, type: "payment_received", title: "Booking paid", message: `${booking.service.title} has been paid through the demo gateway.`, relatedBooking: booking._id, relatedService: booking.service._id },
    ]);
    res.redirect(`/payments/${payment._id}/receipt`);
  } catch (err) {
    console.error("Error processing demo payment:", err);
    res.redirect(`/payments/checkout/${req.params.bookingId}?error=${encodeURIComponent("The demo payment could not be processed.")}`);
  }
});

router.get("/:paymentId/receipt", requireAuth, async (req, res) => {
  if (!isObjectId(req.params.paymentId)) return res.redirect("/bookings");
  const payment = await Payment.findById(req.params.paymentId)
    .populate("customer", "name email")
    .populate("provider", "name email")
    .populate({ path: "booking", populate: { path: "service", select: "title thumbnail" } });
  if (!payment?.booking?.service) return res.redirect("/bookings");
  const allowed = req.session.user.role === "admin" || payment.customer?._id.toString() === req.session.user.id || payment.provider?._id.toString() === req.session.user.id;
  if (!allowed) return res.status(403).render("error", { status: 403, message: "You cannot view this receipt.", pageTitle: "Access denied" });
  res.render("payments/receipt", { payment, pageTitle: "Payment receipt" });
});

module.exports = router;
