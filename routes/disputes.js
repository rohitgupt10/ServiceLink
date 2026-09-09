const express = require("express");
const Booking = require("../models/Booking");
const Dispute = require("../models/Dispute");
const Notification = require("../models/Notification");
const Service = require("../models/Service");
const { requireAuth, requireCustomer, requireProviderOrAdmin } = require("../lib/auth");
const { isObjectId, safeText } = require("../lib/validation");

const router = express.Router();
const RESOLUTIONS = ["refund", "rework", "partial_refund", "no_action"];

router.post("/create", requireCustomer, async (req, res) => {
  try {
    const title = safeText(req.body.title, { min: 3, max: 120 });
    const description = safeText(req.body.description, { min: 10, max: 2000 });
    if (!isObjectId(req.body.bookingId) || !title || !description) return res.status(400).json({ message: "Enter valid dispute details.", success: false });
    const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.session.user.id, status: { $in: ["complete", "cancelled"] } }).populate("service");
    if (!booking?.service) return res.status(404).json({ message: "Eligible booking not found.", success: false });
    if (await Dispute.exists({ booking: booking._id, initiatedBy: req.session.user.id, status: { $ne: "closed" } })) return res.status(409).json({ message: "An active dispute already exists for this booking.", success: false });
    const dispute = await Dispute.create({ booking: booking._id, initiatedBy: req.session.user.id, title, description });
    await Notification.create({ user: booking.service.provider, type: "message", title: "Dispute raised", message: `A dispute was raised for ${booking.service.title}: ${title}`, relatedBooking: booking._id, relatedService: booking.service._id });
    res.status(201).json({ message: "Dispute created successfully", dispute, success: true });
  } catch (err) {
    console.error("Error creating dispute:", err);
    res.status(500).json({ message: "Error creating dispute", success: false });
  }
});

router.get("/my-disputes", requireAuth, async (req, res) => {
  const disputes = await Dispute.find({ initiatedBy: req.session.user.id }).populate({ path: "booking", populate: { path: "service", select: "title provider" } }).sort({ createdAt: -1 });
  res.json({ disputes, success: true });
});

router.get("/provider-disputes", requireProviderOrAdmin, async (req, res) => {
  const filter = req.session.user.role === "admin"
    ? {}
    : { booking: { $in: await Booking.find({ service: { $in: await Service.find({ provider: req.session.user.id }).distinct("_id") } }).distinct("_id") } };
  const disputes = await Dispute.find(filter).populate({ path: "booking", populate: { path: "service", select: "title provider" } }).populate("initiatedBy", "name email contact").sort({ createdAt: -1 });
  res.json({ disputes, success: true });
});

router.put("/:disputeId/resolve", requireProviderOrAdmin, async (req, res) => {
  try {
    const resolution = RESOLUTIONS.includes(req.body.resolution) ? req.body.resolution : null;
    const resolutionDetails = safeText(req.body.resolutionDetails, { min: 3, max: 1000 });
    if (!isObjectId(req.params.disputeId) || !resolution || !resolutionDetails) return res.status(400).json({ message: "Enter a valid resolution.", success: false });
    const dispute = await Dispute.findOne({ _id: req.params.disputeId, status: { $in: ["open", "under_review"] } }).populate({ path: "booking", populate: { path: "service" } });
    if (!dispute?.booking?.service) return res.status(404).json({ message: "Dispute not found.", success: false });
    const ownsService = dispute.booking.service.provider.toString() === req.session.user.id;
    if (req.session.user.role !== "admin" && !ownsService) return res.status(403).json({ message: "Not authorized.", success: false });
    dispute.status = "resolved";
    dispute.resolution = resolution;
    dispute.resolutionDetails = resolutionDetails;
    dispute.resolvedAt = new Date();
    await dispute.save();
    await Notification.create({ user: dispute.initiatedBy, type: "message", title: "Dispute resolved", message: `Your dispute was resolved: ${resolutionDetails}`, relatedBooking: dispute.booking._id, relatedService: dispute.booking.service._id });
    res.json({ message: "Dispute resolved", dispute, success: true });
  } catch (err) {
    console.error("Error resolving dispute:", err);
    res.status(500).json({ message: "Error resolving dispute", success: false });
  }
});

router.put("/:disputeId/close", requireAuth, async (req, res) => {
  if (!isObjectId(req.params.disputeId)) return res.status(404).json({ message: "Dispute not found.", success: false });
  const filter = { _id: req.params.disputeId, status: "resolved" };
  if (req.session.user.role !== "admin") filter.initiatedBy = req.session.user.id;
  const dispute = await Dispute.findOneAndUpdate(filter, { status: "closed" }, { new: true });
  if (!dispute) return res.status(404).json({ message: "Dispute not found or not ready to close.", success: false });
  res.json({ message: "Dispute closed", dispute, success: true });
});

module.exports = router;
