const express = require("express");
const Booking = require("../../models/Booking");
const router = express.Router();
router.get("/", async (req, res) => { const status = ["pending", "confirmed", "cancelled", "complete"].includes(req.query.status) ? req.query.status : ""; const bookings = await Booking.find(status ? { status } : {}).populate("user", "name email").populate({ path: "service", populate: { path: "provider", select: "name email" } }).sort({ createdAt: -1 }).limit(250); res.render("admin/bookings", { pageTitle: "Bookings", bookings: bookings.filter((item) => item.service), status }); });
module.exports = router;
