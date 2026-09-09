const express = require("express");
const Dispute = require("../../models/Dispute");
const Notification = require("../../models/Notification");
const { isObjectId, safeText } = require("../../lib/validation");
const router = express.Router();
router.get("/", async (req, res) => { const disputes = await Dispute.find().populate("initiatedBy", "name email").populate({ path: "booking", populate: { path: "service", select: "title provider" } }).sort({ createdAt: -1 }).limit(200); res.render("admin/disputes", { pageTitle: "Disputes", disputes }); });
router.post("/:id/review", async (req, res) => { if (isObjectId(req.params.id)) await Dispute.findOneAndUpdate({ _id: req.params.id, status: "open" }, { status: "under_review" }); res.redirect("/admin/disputes?notice=Dispute+marked+under+review"); });
router.post("/:id/resolve", async (req, res) => { const resolution = ["refund", "rework", "partial_refund", "no_action"].includes(req.body.resolution) ? req.body.resolution : null; const details = safeText(req.body.resolutionDetails, { min: 3, max: 1000 }); if (isObjectId(req.params.id) && resolution && details) { const dispute = await Dispute.findOneAndUpdate({ _id: req.params.id, status: { $in: ["open", "under_review"] } }, { status: "resolved", resolution, resolutionDetails: details, resolvedAt: new Date() }, { new: true }); if (dispute) await Notification.create({ user: dispute.initiatedBy, type: "message", title: "Dispute resolved", message: `Your dispute was resolved: ${details}`, relatedBooking: dispute.booking }); } res.redirect("/admin/disputes?notice=Dispute+resolution+processed"); });
module.exports = router;
