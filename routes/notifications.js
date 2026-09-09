const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../lib/auth");
const { isObjectId } = require("../lib/validation");

const router = express.Router();

router.get("/all", requireAuth, async (req, res) => {
  const notifications = await Notification.find({ user: req.session.user.id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  res.json({ notifications, unreadCount, success: true });
});

router.get("/unread", requireAuth, async (req, res) => {
  const notifications = await Notification.find({ user: req.session.user.id, read: false }).sort({ createdAt: -1 }).limit(50);
  res.json({ notifications, success: true });
});

router.put("/mark-all-read", requireAuth, async (req, res) => {
  await Notification.updateMany({ user: req.session.user.id, read: false }, { read: true });
  res.json({ message: "All notifications marked as read", success: true });
});

router.put("/:notificationId/read", requireAuth, async (req, res) => {
  if (!isObjectId(req.params.notificationId)) return res.status(404).json({ success: false, message: "Notification not found." });
  const notification = await Notification.findOneAndUpdate({ _id: req.params.notificationId, user: req.session.user.id }, { read: true });
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
  res.json({ message: "Notification marked as read", success: true });
});

router.delete("/:notificationId", requireAuth, async (req, res) => {
  if (!isObjectId(req.params.notificationId)) return res.status(404).json({ success: false, message: "Notification not found." });
  const notification = await Notification.findOneAndDelete({ _id: req.params.notificationId, user: req.session.user.id });
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
  res.json({ message: "Notification deleted", success: true });
});

module.exports = router;
