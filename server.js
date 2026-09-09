const path = require("path");
const dotenv = require("dotenv");
const ejsLayouts = require("express-ejs-layouts");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

dotenv.config();

const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const bookingRoutes = require("./routes/bookings");
const usersRoutes = require("./routes/users");
const favoritesRoutes = require("./routes/favorites");
const notificationsRoutes = require("./routes/notifications");
const searchRoutes = require("./routes/search");
const profileRoutes = require("./routes/profile");
const disputesRoutes = require("./routes/disputes");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payments");
const Category = require("./models/Category");
const Favorite = require("./models/Favorite");
const Notification = require("./models/Notification");
const Service = require("./models/Service");
const User = require("./models/User");
const { DEFAULT_CATEGORIES } = require("./lib/categories");
const { requireAuth } = require("./lib/auth");
const { parseAvatarUpload } = require("./lib/images");
const { createRateLimiter, csrfProtection, securityHeaders } = require("./lib/security");

let httpServer = null;
let localDatabase = null;
let shutdownHandlersRegistered = false;

function createApp({ mongoClient } = {}) {
  const app = express();
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(express.static(path.join(__dirname, "public"), { maxAge: process.env.NODE_ENV === "production" ? "1d" : 0 }));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(ejsLayouts);
  app.set("layout", "layouts/main.ejs");

  const sessionStore = MongoStore.create(mongoClient
    ? { client: mongoClient }
    : { mongoUrl: process.env.MONGODB_URI });
  sessionStore.on("error", (error) => {
    console.error("Session store error:", error.message);
  });
  sessionStore.collectionP.catch((error) => {
    console.error("Session store unavailable:", error.message);
  });

  app.use(session({
    name: "servicelink.sid",
    secret: process.env.SESSION_SECRET || "development-only-change-me",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 },
  }));
  app.post(["/auth/register", "/profile/update"], parseAvatarUpload);
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.unreadNotificationCount = 0;
    res.locals.navCategories = DEFAULT_CATEGORIES;
    next();
  });
  app.use(csrfProtection);

  app.use(async (req, res, next) => {
    try {
      if (req.session.user?.id) {
        const account = await User.findById(req.session.user.id).select("name email contact role avatar isActive");
        if (!account?.isActive) {
          req.session.user = null;
        } else {
          req.session.user = { id: account._id.toString(), name: account.name, email: account.email, contact: account.contact, role: account.role, avatar: account.avatar };
        }
      }
      res.locals.user = req.session.user || null;
      res.locals.unreadNotificationCount = req.session.user?.id ? await Notification.countDocuments({ user: req.session.user.id, read: false }) : 0;
      const categories = await Category.find({ isActive: true }).sort({ name: 1 }).select("name");
      res.locals.navCategories = categories.length ? categories.map((category) => category.name) : DEFAULT_CATEGORIES;
      next();
    } catch (err) {
      console.error("Error preparing page navigation:", err);
      res.locals.user = req.session.user || null;
      res.locals.unreadNotificationCount = 0;
      res.locals.navCategories = DEFAULT_CATEGORIES;
      next();
    }
  });

  app.use("/auth", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }), authRoutes);
  app.use("/services", serviceRoutes);
  app.use("/bookings", bookingRoutes);
  app.use("/api/favorites", favoritesRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/profile", profileRoutes);
  app.use("/api/disputes", disputesRoutes);
  app.use("/payments", paymentRoutes);
  app.use("/admin", adminRoutes);

  app.get("/favorites", requireAuth, async (req, res) => {
    const favorites = await Favorite.find({ user: req.session.user.id }).populate({ path: "service", match: { deletedAt: null }, populate: { path: "provider", select: "name avatar averageRating" } }).sort({ createdAt: -1 });
    res.render("favorites", { favorites: favorites.filter((favorite) => favorite.service), user: req.session.user });
  });
  app.get("/notifications", requireAuth, (req, res) => res.render("notifications", { user: req.session.user }));
  app.get("/disputes", requireAuth, (req, res) => res.render("disputes", { user: req.session.user }));
  app.get("/advanced-search", (req, res) => res.render("advanced-search", { user: req.session.user }));
  app.use("/", usersRoutes);

  app.get("/", async (req, res) => {
    const featuredServices = await Service.find({ isActive: true, deletedAt: null }).sort({ averageRating: -1, totalReviews: -1 }).limit(3).populate("provider");
    res.render("index", { user: req.session.user, featuredServices });
  });

  app.use((req, res) => res.status(404).render("error", { user: req.session.user || null, status: 404, message: "Page not found." }));
  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    if (req.originalUrl.startsWith("/api/")) return res.status(500).json({ success: false, message: "Unexpected server error." });
    res.status(500).render("error", { user: req.session?.user || null, status: 500, message: "Unexpected server error." });
  });
  return app;
}

async function connectDatabase() {
  if (process.env.USE_LOCAL_DB === "true") {
    const { startLocalDatabase } = require("./lib/local-database");
    localDatabase = await startLocalDatabase();
    await mongoose.connect(localDatabase.uri);
    console.log(`Database mode: local (${localDatabase.dataPath})`);
    return "local";
  }

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Database mode: MongoDB Atlas");
  return "atlas";
}

async function stop() {
  if (httpServer?.listening) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  httpServer = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (localDatabase) {
    await localDatabase.stop();
    localDatabase = null;
  }
}

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      stop()
        .catch((error) => console.error("Shutdown failed:", error.message))
        .finally(() => process.exit(0));
    });
  }
}

async function start() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required in production");
  try {
    const databaseMode = await connectDatabase();
    await Promise.all(DEFAULT_CATEGORIES.map((name) => Category.updateOne({ name }, { $setOnInsert: { name, isActive: true } }, { upsert: true })));
    if (databaseMode === "local") {
      const { seedLocalData } = require("./lib/local-seed");
      await seedLocalData();
    }

    const port = Number(process.env.PORT) || 3000;
    const app = createApp({ mongoClient: mongoose.connection.getClient() });
    httpServer = await new Promise((resolve, reject) => {
      const server = app.listen(port, () => resolve(server));
      server.once("error", reject);
    });
    registerShutdownHandlers();
    console.log(`Server running on port ${port}`);
    return httpServer;
  } catch (error) {
    await stop().catch(() => {});
    throw error;
  }
}

if (require.main === module) start().catch((err) => { console.error("Startup failed:", err); process.exitCode = 1; });

module.exports = { connectDatabase, createApp, start, stop };
