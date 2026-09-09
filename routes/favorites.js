const express = require("express");
const Favorite = require("../models/Favorite");
const Service = require("../models/Service");
const { requireCustomer } = require("../lib/auth");
const { isObjectId } = require("../lib/validation");

const router = express.Router();

router.post("/add", requireCustomer, async (req, res) => {
  try {
    if (!isObjectId(req.body.serviceId) || !(await Service.exists({ _id: req.body.serviceId, isActive: true, deletedAt: null }))) return res.status(404).json({ success: false, message: "Service not found." });
    await Favorite.updateOne({ user: req.session.user.id, service: req.body.serviceId }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    res.json({ message: "Added to favorites", success: true });
  } catch {
    res.status(500).json({ message: "Error adding to favorites", success: false });
  }
});

router.post("/remove", requireCustomer, async (req, res) => {
  if (isObjectId(req.body.serviceId)) await Favorite.findOneAndDelete({ user: req.session.user.id, service: req.body.serviceId });
  res.json({ message: "Removed from favorites", success: true });
});

router.get("/my-favorites", requireCustomer, async (req, res) => {
  const favorites = await Favorite.find({ user: req.session.user.id }).populate({ path: "service", match: { deletedAt: null }, populate: { path: "provider", select: "name avatar averageRating" } }).sort({ createdAt: -1 });
  res.json({ favorites: favorites.filter((favorite) => favorite.service), success: true });
});

router.get("/is-favorited/:serviceId", requireCustomer, async (req, res) => {
  const favorite = isObjectId(req.params.serviceId) && await Favorite.exists({ user: req.session.user.id, service: req.params.serviceId });
  res.json({ isFavorited: !!favorite, success: true });
});

module.exports = router;
