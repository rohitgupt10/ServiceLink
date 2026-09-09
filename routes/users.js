const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    if (req.session.user.role === "admin") return res.redirect("/admin");
    const user = await User.findById(req.session.user.id).select("name email contact role avatar isVerified isActive");
    if (!user || !user.isActive) return res.redirect("/auth/login");
    req.session.user = { ...req.session.user, name: user.name, email: user.email, role: user.role, contact: user.contact, avatar: user.avatar };
    res.render("dashboard", { user: req.session.user, error: null, success: null });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).render("dashboard", { user: req.session.user, error: "Failed to load profile.", success: null });
  }
});

module.exports = router;
