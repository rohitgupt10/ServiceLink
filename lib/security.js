const crypto = require("crypto");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: http: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  next();
}

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 300 } = {}) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const record = clients.get(key);
    if (!record || now - record.startedAt >= windowMs) {
      clients.set(key, { startedAt: now, count: 1 });
      return next();
    }
    record.count += 1;
    if (record.count > max) {
      res.setHeader("Retry-After", Math.ceil((windowMs - (now - record.startedAt)) / 1000));
      return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    }
    next();
  };
}

function csrfProtection(req, res, next) {
  if (!req.session) return next(new Error("Session middleware must run before CSRF protection"));
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.locals.csrfToken = req.session.csrfToken;

  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const supplied = req.get("x-csrf-token") || req.body?._csrf;
  const expected = req.session.csrfToken;
  const valid = typeof supplied === "string" && supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(403).json({ success: false, message: "Invalid or expired form token. Refresh and try again." });
    }
    return res.status(403).render("error", {
      user: req.session.user || null,
      status: 403,
      message: "This form expired. Refresh the page and try again.",
    });
  }
  next();
}

module.exports = { securityHeaders, createRateLimiter, csrfProtection };
