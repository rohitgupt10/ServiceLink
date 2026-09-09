const express = require("express");
const Notification = require("../../models/Notification");
const User = require("../../models/User");
const { isObjectId } = require("../../lib/validation");
const router = express.Router();
router.get("/", async (req, res) => res.render("admin/verifications", { pageTitle: "Provider verification", providers: await User.find({ role: "provider" }).select("-password").sort({ isVerified: 1, createdAt: -1 }) }));
router.post("/:id/toggle", async (req, res) => { if (isObjectId(req.params.id)) { const provider = await User.findOne({ _id: req.params.id, role: "provider" }); if (provider) { provider.isVerified = !provider.isVerified; await provider.save(); await Notification.create({ user: provider._id, type: "verification_update", title: "Verification updated", message: provider.isVerified ? "Your provider account is now verified." : "Your provider verification has been removed." }); } } res.redirect("/admin/verifications?notice=Verification+updated"); });
module.exports = router;
