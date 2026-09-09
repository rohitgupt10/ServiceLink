const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeRegex, isObjectId, isSafeImageUrl, isValidEmail, parseFutureDate, parsePositiveNumber, safeText } = require("../lib/validation");

test("safeText trims and normalizes text", () => assert.equal(safeText("  Hello   world  "), "Hello world"));
test("safeText rejects values outside limits", () => assert.equal(safeText("a", { min: 2, max: 5 }), null));
test("email validation accepts normal addresses and rejects malformed ones", () => {
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});
test("image URLs only allow HTTP and HTTPS", () => {
  assert.equal(isSafeImageUrl("https://example.com/image.jpg"), true);
  assert.equal(isSafeImageUrl("javascript:alert(1)"), false);
  assert.equal(isSafeImageUrl(""), true);
});
test("positive number parsing enforces bounds", () => {
  assert.equal(parsePositiveNumber("4", { min: 1, max: 8 }), 4);
  assert.equal(parsePositiveNumber("9", { min: 1, max: 8 }), null);
  assert.equal(parsePositiveNumber("nope"), null);
});
test("future dates reject past and invalid values", () => {
  assert.equal(parseFutureDate("not-a-date"), null);
  assert.equal(parseFutureDate("2000-01-01"), null);
  assert.ok(parseFutureDate("2999-01-01") instanceof Date);
});
test("ObjectId validation and regex escaping are safe", () => {
  assert.equal(isObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isObjectId("bad"), false);
  assert.equal(escapeRegex("a+b?"), "a\\+b\\?");
});
