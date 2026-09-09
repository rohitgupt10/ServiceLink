const express = require("express");
const User = require("../models/User");
const { removeUploadedImage, saveUploadedImage } = require("../lib/images");
const { isValidEmail, safeText } = require("../lib/validation");

const router = express.Router();

function sessionUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, contact: user.contact, avatar: user.avatar };
}

function replaceSession(req, user, callback) {
  req.session.regenerate((err) => {
    if (err) return callback(err);
    req.session.user = sessionUser(user);
    callback();
  });
}

router.get("/login", (req, res) => res.render("login", { user: req.session.user, error: null }));

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!isValidEmail(email) || !password) return res.status(400).render("login", { user: null, error: "Enter a valid email and password." });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).render("login", { user: null, error: "Invalid email or password." });
    if (!user.isActive) return res.status(403).render("login", { user: null, error: "This account has been disabled." });
    replaceSession(req, user, (err) => {
      if (err) return res.status(500).render("login", { user: null, error: "Could not start your session." });
      res.redirect(user.role === "admin" ? "/admin" : user.role === "provider" ? "/profile/dashboard/provider" : "/dashboard");
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).render("login", { user: null, error: "Failed to login." });
  }
});

router.get("/register", (req, res) => res.render("register", { user: req.session.user, error: null }));

router.post("/register", async (req, res) => {
  let savedAvatar = null;
  try {
    const name = safeText(req.body.name, { min: 2, max: 100 });
    const contact = safeText(req.body.contact, { min: 5, max: 30 });
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const role = ["user", "provider"].includes(req.body.role) ? req.body.role : null;
    if (req.imageUploadError) return res.status(400).render("register", { user: null, error: req.imageUploadError });
    if (!name || !contact || !isValidEmail(email) || password.length < 8 || password !== confirmPassword || !role) {
      return res.status(400).render("register", { user: null, error: "Use valid details, a matching password of at least 8 characters, and select a role." });
    }
    if (await User.exists({ email })) return res.status(409).render("register", { user: null, error: "Email already exists." });
    savedAvatar = await saveUploadedImage(req.file, "avatars", `${role}-${name}`);
    const user = await User.create({ name, email, contact, password, role, ...(savedAvatar ? { avatar: savedAvatar } : {}) });
    replaceSession(req, user, (err) => {
      if (err) return res.status(500).render("register", { user: null, error: "Account created, but login failed." });
      res.redirect(user.role === "provider" ? "/profile/dashboard/provider" : "/dashboard");
    });
  } catch (err) {
    if (savedAvatar) await removeUploadedImage(savedAvatar).catch(() => {});
    console.error("Error during registration:", err);
    res.status(500).render("register", { user: null, error: "Failed to register." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("servicelink.sid");
    res.redirect("/auth/login");
  });
});

module.exports = router;
