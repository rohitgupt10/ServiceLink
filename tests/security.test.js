const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter, csrfProtection, securityHeaders } = require("../lib/security");

function response() {
  return { locals: {}, headers: {}, statusCode: 200, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, render(view, body) { this.body = { view, ...body }; return this; } };
}

test("security headers remove common browser risks", () => {
  const res = response(); let called = false;
  securityHeaders({}, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(res.headers["X-Frame-Options"], "DENY");
  assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
});

test("CSRF protection creates and verifies a session token", () => {
  const session = {}; const getRes = response(); let getCalled = false;
  csrfProtection({ method: "GET", session, get() {}, body: {}, originalUrl: "/form" }, getRes, () => { getCalled = true; });
  assert.equal(getCalled, true); assert.ok(session.csrfToken);
  let postCalled = false;
  csrfProtection({ method: "POST", session, get: () => session.csrfToken, body: {}, originalUrl: "/api/test" }, response(), () => { postCalled = true; });
  assert.equal(postCalled, true);
});

test("CSRF protection rejects an invalid API token", () => {
  const res = response();
  csrfProtection({ method: "POST", session: { csrfToken: "a".repeat(64) }, get: () => "b".repeat(64), body: {}, originalUrl: "/api/test" }, res, () => {});
  assert.equal(res.statusCode, 403); assert.equal(res.body.success, false);
});

test("rate limiter blocks requests over the configured maximum", () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
  const req = { ip: "127.0.0.1" }; let called = 0;
  limiter(req, response(), () => { called += 1; });
  const blocked = response(); limiter(req, blocked, () => { called += 1; });
  assert.equal(called, 1); assert.equal(blocked.statusCode, 429);
});
