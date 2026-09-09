const test = require("node:test");
const assert = require("node:assert/strict");
const { TEST_CARDS, normalizeCardNumber, processDummyPayment } = require("../services/payment-gateway");

test("dummy gateway accepts only the documented success card", () => {
  const paid = processDummyPayment({ cardNumber: "4242 4242 4242 4242", amount: 1200 });
  assert.equal(paid.ok, true);
  assert.equal(paid.last4, "4242");
  assert.match(paid.transactionId, /^SL-DEMO-/);
  assert.equal(processDummyPayment({ cardNumber: TEST_CARDS.declined, amount: 1200 }).ok, false);
});

test("dummy gateway rejects invalid amounts and normalizes formatting", () => {
  assert.equal(normalizeCardNumber("4242-4242 4242-4242"), TEST_CARDS.success);
  assert.equal(processDummyPayment({ cardNumber: TEST_CARDS.success, amount: 0 }).ok, false);
});
