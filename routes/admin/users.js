const express = require("express");
const User = require("../../models/User");
const { escapeRegex, isObjectId, safeText } = require("../../lib/validation");
const router = express.Router();
router.get("/", async (req, res) => { const q = safeText(req.query.q || "", { min: 0, max: 100 }) || ""; const rx = q ? new RegExp(escapeRegex(q), "i") : null; const users = await User.find(rx ? { $or: [{ name: rx }, { email: rx }] } : {}).select("-password").sort({ createdAt: -1 }).limit(200); res.render("admin/users", { pageTitle: "Users", users, q }); });
router.post("/:id/toggle", async (req, res) => { if (isObjectId(req.params.id) && req.params.id !== req.session.user.id) { const target = await User.findById(req.params.id); if (target && target.role !== "admin") { target.isActive = !target.isActive; await target.save(); } } res.redirect("/admin/users?notice=User+status+updated"); });
module.exports = router;
