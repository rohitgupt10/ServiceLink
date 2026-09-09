const express = require("express");
const Booking = require("../../models/Booking");
const Dispute = require("../../models/Dispute");
const Payment = require("../../models/Payment");
const Review = require("../../models/Review");
const Service = require("../../models/Service");
const User = require("../../models/User");
const { requireAdmin } = require("../../lib/auth");

const router = express.Router();
router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.layout = "layouts/admin";
  res.locals.currentAdminPath = `/admin${req.path === "/" ? "" : req.path}`;
  res.locals.adminNotice = req.query.notice || null;
  next();
});
router.get("/", async (req, res) => {
  const [users, providers, services, bookings, openDisputes, reviews, payments, recentBookings, recentDisputes] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: "provider" }), Service.countDocuments({ deletedAt: null }), Booking.countDocuments(), Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }), Review.countDocuments(), Payment.countDocuments({ status: "paid" }),
    Booking.find().populate("user", "name").populate("service", "title").sort({ createdAt: -1 }).limit(5),
    Dispute.find().populate("initiatedBy", "name").sort({ createdAt: -1 }).limit(4),
  ]);
  res.render("admin/dashboard", { pageTitle: "Admin overview", stats: { users, providers, services, bookings, openDisputes, reviews, payments }, recentBookings, recentDisputes });
});
router.use("/users", require("./users"));
router.use("/services", require("./services"));
router.use("/bookings", require("./bookings"));
router.use("/disputes", require("./disputes"));
router.use("/categories", require("./categories"));
router.use("/reviews", require("./reviews"));
router.use("/verifications", require("./verifications"));
router.use("/payments", require("./payments"));
module.exports = router;
