const test = require("node:test");
const assert = require("node:assert/strict");
const { requireCustomer, requireProvider } = require("../lib/auth");
const { applyCompletion, canCancel, canConfirm } = require("../lib/booking-rules");

function apiResponse() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, redirect() { throw new Error("unexpected redirect"); } };
}

test("role middleware permits the expected role and rejects another role", () => {
  let called = false;
  requireCustomer({ session: { user: { id: "u1", role: "user" } }, originalUrl: "/api/test", xhr: false, get: () => "application/json" }, apiResponse(), () => { called = true; });
  assert.equal(called, true);
  const response = apiResponse();
  requireProvider({ session: { user: { id: "u1", role: "user" } }, originalUrl: "/api/test", xhr: false, get: () => "application/json" }, response, () => {});
  assert.equal(response.code, 403);
});

test("only pending bookings can be cancelled or confirmed by their owner", () => {
  const booking = { status: "pending", user: { toString: () => "customer" }, service: { provider: { toString: () => "provider" } } };
  assert.equal(canCancel(booking, "customer"), true);
  assert.equal(canCancel(booking, "other"), false);
  assert.equal(canConfirm(booking, "provider"), true);
  booking.status = "cancelled";
  assert.equal(canConfirm(booking, "provider"), false);
});

test("completion requires both parties and rejects unrelated users", () => {
  const booking = { status: "confirmed", userCompleted: false, providerCompleted: false, user: { toString: () => "customer" }, service: { provider: { toString: () => "provider" } } };
  assert.deepEqual(applyCompletion(booking, "other"), { authorized: false, complete: false });
  assert.deepEqual(applyCompletion(booking, "customer"), { authorized: true, complete: false });
  assert.deepEqual(applyCompletion(booking, "provider"), { authorized: true, complete: true });
  assert.equal(booking.status, "complete");
});
