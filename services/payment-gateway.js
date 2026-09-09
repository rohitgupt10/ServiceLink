const crypto = require("crypto");

const TEST_CARDS = Object.freeze({
  success: "4242424242424242",
  declined: "4000000000000002",
});

function normalizeCardNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function processDummyPayment({ cardNumber, amount }) {
  const normalized = normalizeCardNumber(cardNumber);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Invalid payment amount." };
  if (normalized !== TEST_CARDS.success) {
    return { ok: false, message: normalized === TEST_CARDS.declined ? "The demo card was declined." : "Use the supported demo card number." };
  }
  return {
    ok: true,
    transactionId: `SL-DEMO-${crypto.randomUUID().split("-")[0].toUpperCase()}`,
    last4: normalized.slice(-4),
  };
}

module.exports = { TEST_CARDS, normalizeCardNumber, processDummyPayment };
