const mongoose = require("mongoose");

function safeText(value, { min = 1, max = 500 } = {}) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ");
  return cleaned.length >= min && cleaned.length <= max ? cleaned : null;
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isSafeImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && value.length <= 2048;
  } catch {
    return false;
  }
}

function parsePositiveNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function isObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function parseFutureDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today ? date : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { safeText, isValidEmail, isSafeImageUrl, parsePositiveNumber, isObjectId, parseFutureDate, escapeRegex };
