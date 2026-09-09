const express = require("express");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Service = require("../models/Service");
const User = require("../models/User");
const { requireAuth, requireProvider } = require("../lib/auth");
const { removeUploadedImage, saveUploadedImage } = require("../lib/images");
const { recalculateProvider } = require("../lib/metrics");
const { isObjectId, safeText } = require("../lib/validation");

const router = express.Router();

router.get("/dashboard/provider", requireProvider, async (req, res) => {
  try {
    await recalculateProvider(req.session.user.id);
    const provider = await User.findById(req.session.user.id).select("-password");
    const services = await Service.find({ provider: provider._id, deletedAt: null });
    const totalBookings = await Booking.countDocuments({ service: { $in: services.map((service) => service._id) } });
    const completedBookings = await Booking.countDocuments({ service: { $in: services.map((service) => service._id) }, status: "complete" });
    const recentReviews = await Review.find({ provider: provider._id }).populate("user", "name avatar").sort({ createdAt: -1 }).limit(5);
    res.render("provider-dashboard", {
      user: req.session.user,
      provider,
      services,
      recentReviews,
      stats: { totalServices: services.length, activeServices: services.filter((service) => service.isActive).length, totalBookings, completedBookings, totalReviews: provider.totalReviews, averageRating: provider.averageRating, totalEarnings: provider.totalEarnings, completionRate: totalBookings ? ((completedBookings / totalBookings) * 100).toFixed(1) : "0.0" },
    });
  } catch (err) {
    console.error("Error loading provider dashboard:", err);
    res.status(500).render("error", { user: req.session.user, status: 500, message: "Could not load the provider dashboard." });
  }
});

router.get("/bookings/history", requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.session.user.id, status: { $in: ["complete", "cancelled"] } }).populate("service", "title price thumbnail provider").sort({ date: -1 });
    res.json({ bookings: bookings.filter((booking) => booking.service), success: true });
  } catch {
    res.status(500).json({ message: "Error fetching booking history", success: false });
  }
});

router.post("/update", requireAuth, async (req, res) => {
  let savedAvatar = null;
  try {
    const name = safeText(req.body.name, { min: 2, max: 100 });
    const contact = safeText(req.body.contact, { min: 5, max: 30 });
    const bio = safeText(req.body.bio || "", { min: 0, max: 500 });
    if (req.imageUploadError) return res.status(400).redirect(`/profile/${req.session.user.id}?error=${encodeURIComponent(req.imageUploadError)}`);
    if (!name || !contact || bio === null) return res.status(400).redirect(`/profile/${req.session.user.id}?error=Invalid+profile+details`);
    const existing = await User.findById(req.session.user.id).select("avatar role");
    if (!existing) return res.redirect("/auth/login");
    savedAvatar = await saveUploadedImage(req.file, "avatars", `${existing.role}-${name}`);
    const updated = await User.findByIdAndUpdate(req.session.user.id, { name, contact, bio, ...(savedAvatar ? { avatar: savedAvatar } : {}) }, { new: true, runValidators: true });
    if (savedAvatar) await removeUploadedImage(existing.avatar);
    req.session.user = { ...req.session.user, name: updated.name, contact: updated.contact, avatar: updated.avatar };
    res.redirect(`/profile/${updated._id}?updated=1`);
  } catch (err) {
    if (savedAvatar) await removeUploadedImage(savedAvatar).catch(() => {});
    console.error("Error updating profile:", err);
    res.status(500).redirect(`/profile/${req.session.user.id}?error=Could+not+update+profile`);
  }
});

router.get("/:userId", async (req, res) => {
  try {
    if (!isObjectId(req.params.userId)) return res.status(404).render("error", { user: req.session.user, status: 404, message: "User not found." });
    const profile = await User.findById(req.params.userId).select("-password");
    if (!profile || !profile.isActive) return res.status(404).render("error", { user: req.session.user, status: 404, message: "User not found." });
    const isSelfProfile = req.session.user?.id === profile._id.toString();
    const reviews = profile.role === "provider"
      ? await Review.find({ provider: profile._id }).populate("user", "name avatar").sort({ createdAt: -1 }).limit(20)
      : await Review.find({ user: profile._id }).populate("user", "name avatar").populate("service", "title").sort({ createdAt: -1 }).limit(20);
    const completedBookings = profile.role === "provider"
      ? await Booking.countDocuments({ service: { $in: await Service.find({ provider: profile._id }).distinct("_id") }, status: "complete" })
      : 0;
    const canViewPrivate = isSelfProfile || req.session.user?.role === "admin";
    res.render("profile", { profile, reviews, completedBookings, isSelfProfile, canViewPrivate, error: req.query.error || null, updated: req.query.updated === "1", user: req.session.user || null });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).render("error", { user: req.session.user, status: 500, message: "Error loading profile." });
  }
});

module.exports = router;
