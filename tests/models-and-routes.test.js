const test = require("node:test");
const assert = require("node:assert/strict");

test("all route modules load", () => {
  for (const name of ["admin", "auth", "bookings", "disputes", "favorites", "notifications", "payments", "profile", "search", "services", "users"]) {
    assert.doesNotThrow(() => require(`../routes/${name}`), `routes/${name}.js`);
  }
});

test("MVP integrity fields and admin role are present", () => {
  const User = require("../models/User");
  const Service = require("../models/Service");
  const Booking = require("../models/Booking");
  const Review = require("../models/Review");
  const Payment = require("../models/Payment");
  assert.ok(User.schema.path("role").enumValues.includes("admin"));
  assert.ok(User.schema.path("isActive"));
  assert.ok(Service.schema.path("deletedAt"));
  assert.ok(Booking.schema.path("priceAtBooking"));
  assert.ok(Booking.schema.path("totalPrice"));
  assert.ok(Booking.schema.path("paymentStatus"));
  assert.ok(Booking.schema.path("payment"));
  assert.ok(Review.schema.path("booking"));
  assert.equal(Review.schema.path("verified").defaultValue, false);
  assert.ok(Payment.schema.path("transactionId"));
});
