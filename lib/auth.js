function currentUser(req) {
  return req.session && req.session.user ? req.session.user : null;
}

function wantsJson(req) {
  return req.originalUrl.startsWith("/api/") || req.xhr || req.get("accept") === "application/json";
}

function requireAuth(req, res, next) {
  if (currentUser(req)?.id) return next();
  if (wantsJson(req)) return res.status(401).json({ success: false, message: "Please log in first" });
  return res.redirect("/auth/login");
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = currentUser(req);
    if (!user?.id) return requireAuth(req, res, next);
    if (roles.includes(user.role)) return next();
    if (wantsJson(req)) return res.status(403).json({ success: false, message: "Not authorized" });
    return res.status(403).render("error", { user, status: 403, message: "You do not have permission to access this page." });
  };
}

module.exports = {
  currentUser,
  requireAuth,
  requireCustomer: requireRole("user"),
  requireProvider: requireRole("provider"),
  requireAdmin: requireRole("admin"),
  requireProviderOrAdmin: requireRole("provider", "admin"),
};
