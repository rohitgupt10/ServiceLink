const express = require("express");
const Review = require("../../models/Review");
const { recalculateService } = require("../../lib/metrics");
const { isObjectId } = require("../../lib/validation");
const router = express.Router();
router.get("/", async (req, res) => { const reviews = await Review.find().populate("user", "name email").populate("service", "title").sort({ createdAt: -1 }).limit(200); res.render("admin/reviews", { pageTitle: "Reviews", reviews }); });
router.post("/:id/delete", async (req, res) => { if (isObjectId(req.params.id)) { const review = await Review.findByIdAndDelete(req.params.id); if (review) await recalculateService(review.service); } res.redirect("/admin/reviews?notice=Review+removed"); });
module.exports = router;
