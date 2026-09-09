const express = require("express");
const Booking = require("../models/Booking");
const Category = require("../models/Category");
const Favorite = require("../models/Favorite");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const Service = require("../models/Service");
const { requireCustomer, requireProvider } = require("../lib/auth");
const { DEFAULT_CATEGORIES } = require("../lib/categories");
const { cacheRemoteImage, removeUploadedImage } = require("../lib/images");
const { recalculateService } = require("../lib/metrics");
const { notifyServiceUnavailable } = require("../lib/notification-events");
const { escapeRegex, isObjectId, isSafeImageUrl, parsePositiveNumber, safeText } = require("../lib/validation");

const router = express.Router();

async function categoryNames() {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).select("name");
  return categories.length ? categories.map((category) => category.name) : DEFAULT_CATEGORIES;
}

function serviceInput(body) {
  const data = {
    title: safeText(body.title, { min: 3, max: 120 }),
    description: safeText(body.description, { min: 10, max: 2000 }),
    price: parsePositiveNumber(body.price, { min: 1, max: 10000000 }),
    location: safeText(body.location, { min: 2, max: 150 }),
    contact: safeText(body.contact, { min: 5, max: 50 }),
    category: safeText(body.category, { min: 2, max: 80 }),
    thumbnail: String(body.thumbnail || "").trim(),
    tags: String(body.tags || "").split(",").map((tag) => safeText(tag, { min: 1, max: 40 })).filter(Boolean).slice(0, 10),
  };
  if (!data.title || !data.description || data.price === null || !data.location || !data.contact || !data.category || !isSafeImageUrl(data.thumbnail)) return null;
  if (!data.thumbnail) delete data.thumbnail;
  return data;
}

router.get("/", async (req, res) => {
  try {
    const query = safeText(req.query.q || "", { min: 0, max: 100 }) ?? "";
    const category = safeText(req.query.category || "", { min: 0, max: 80 }) ?? "";
    const criteria = { deletedAt: null };
    if (req.session.user?.role === "provider") criteria.provider = req.session.user.id;
    else criteria.isActive = true;
    if (query) {
      const pattern = new RegExp(escapeRegex(query), "i");
      criteria.$or = [{ title: pattern }, { description: pattern }, { location: pattern }];
    }
    if (category) criteria.category = category;
    const services = await Service.find(criteria).sort({ averageRating: -1 }).populate("provider");
    const favorites = req.session.user?.role === "user" ? await Favorite.find({ user: req.session.user.id }).select("service") : [];
    res.render("services", { services, user: req.session.user, error: null, query, categories: await categoryNames(), selectedCategory: category, favoriteIds: favorites.map((favorite) => favorite.service.toString()) });
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).render("services", { services: [], user: req.session.user, error: "Failed to load services.", query: "", categories: [], selectedCategory: "", favoriteIds: [] });
  }
});

router.get("/add", requireProvider, async (req, res) => {
  res.render("addservice", { user: req.session.user, error: null, categories: await categoryNames() });
});

router.get("/:id/edit", requireProvider, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect("/services");
  const service = await Service.findOne({ _id: req.params.id, provider: req.session.user.id, deletedAt: null });
  if (!service) return res.status(404).render("error", { user: req.session.user, status: 404, message: "Service not found." });
  res.render("editservice", { user: req.session.user, service, categories: await categoryNames(), error: null });
});

router.get("/:id", async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.redirect("/services");
    const filter = { _id: req.params.id, deletedAt: null };
    if (req.session.user?.role !== "provider" && req.session.user?.role !== "admin") filter.isActive = true;
    const service = await Service.findOneAndUpdate(filter, { $inc: { viewCount: 1 } }, { new: true }).populate("provider");
    if (!service?.provider) return res.status(404).render("error", { user: req.session.user, status: 404, message: "Service not found." });
    if (!service.isActive && req.session.user?.id !== service.provider._id.toString() && req.session.user?.role !== "admin") return res.redirect("/services");
    const reviews = await Review.find({ service: service._id }).populate("user", "name avatar").sort({ createdAt: -1 });
    const isFavorited = req.session.user?.role === "user" && !!(await Favorite.exists({ user: req.session.user.id, service: service._id }));
    res.render("service", { service, reviews, user: req.session.user, isFavorited, reviewError: req.query.reviewError || null });
  } catch (err) {
    console.error("Error fetching service:", err);
    res.redirect("/services");
  }
});

router.post("/:id/reviews", requireCustomer, async (req, res) => {
  const cachedReviewImages = [];
  try {
    if (!isObjectId(req.params.id)) return res.redirect("/services");
    const rating = parsePositiveNumber(req.body.rating, { min: 1, max: 5 });
    const comment = safeText(req.body.comment, { min: 3, max: 1000 });
    const qualityRating = parsePositiveNumber(req.body.qualityRating, { min: 1, max: 5 });
    const communicationRating = parsePositiveNumber(req.body.communicationRating, { min: 1, max: 5 });
    const timelinessRating = parsePositiveNumber(req.body.timelinessRating, { min: 1, max: 5 });
    const imageUrls = String(req.body.images || "").split(/[\n,]/).map((url) => url.trim()).filter(Boolean).slice(0, 5);
    if (rating === null || !comment || imageUrls.some((url) => !isSafeImageUrl(url))) return res.redirect(`/services/${req.params.id}?reviewError=${encodeURIComponent("Enter a valid review and image URLs.")}`);
    const service = await Service.findOne({ _id: req.params.id, isActive: true, deletedAt: null });
    if (!service) return res.redirect("/services");
    const reviewedBookingIds = await Review.find({ user: req.session.user.id, service: service._id }).distinct("booking");
    const booking = await Booking.findOne({ user: req.session.user.id, service: service._id, status: "complete", _id: { $nin: reviewedBookingIds.filter(Boolean) } }).sort({ updatedAt: -1 });
    if (!booking) return res.redirect(`/services/${service._id}?reviewError=${encodeURIComponent("Only customers with a completed booking can review this service.")}`);
    for (let index = 0; index < imageUrls.length; index += 1) {
      cachedReviewImages.push(await cacheRemoteImage(imageUrls[index], { folder: "reviews", prefix: `review-${req.session.user.id}-${index + 1}` }));
    }
    await Review.create({ user: req.session.user.id, provider: service.provider, service: service._id, booking: booking._id, rating, comment, images: cachedReviewImages, qualityRating, communicationRating, timelinessRating, verified: true });
    await recalculateService(service._id);
    await Notification.create({ user: service.provider, type: "review_received", title: "New verified review", message: `${req.session.user.name} reviewed ${service.title}.`, relatedService: service._id });
    res.redirect(`/services/${service._id}`);
  } catch (err) {
    await Promise.all(cachedReviewImages.map((image) => removeUploadedImage(image).catch(() => {})));
    console.error("Error posting review:", err);
    res.redirect(`/services/${req.params.id}?reviewError=${encodeURIComponent("Could not save the review or download one of its images.")}`);
  }
});

router.post("/", requireProvider, async (req, res) => {
  const categories = await categoryNames();
  let cachedThumbnail = null;
  try {
    const data = serviceInput(req.body);
    if (!data || !categories.includes(data.category)) return res.status(400).render("addservice", { user: req.session.user, error: "Enter valid service details and, if supplied, an HTTP or HTTPS image URL.", categories });
    if (data.thumbnail) {
      cachedThumbnail = await cacheRemoteImage(data.thumbnail, { folder: "services", prefix: `service-${req.session.user.id}` });
      data.thumbnail = cachedThumbnail;
    }
    await Service.create({ ...data, provider: req.session.user.id });
    res.redirect("/services");
  } catch (err) {
    if (cachedThumbnail) await removeUploadedImage(cachedThumbnail).catch(() => {});
    console.error("Error adding service:", err);
    res.status(500).render("addservice", { user: req.session.user, error: "Failed to add the service or download its image.", categories });
  }
});

router.post("/:id/edit", requireProvider, async (req, res) => {
  const categories = await categoryNames();
  const service = isObjectId(req.params.id) ? await Service.findOne({ _id: req.params.id, provider: req.session.user.id, deletedAt: null }) : null;
  if (!service) return res.status(404).render("error", { user: req.session.user, status: 404, message: "Service not found." });
  let cachedThumbnail = null;
  try {
    const data = serviceInput(req.body);
    if (!data || !categories.includes(data.category)) return res.status(400).render("editservice", { user: req.session.user, service, categories, error: "Enter valid service details." });
    const previousThumbnail = service.thumbnail;
    if (data.thumbnail) {
      cachedThumbnail = await cacheRemoteImage(data.thumbnail, { folder: "services", prefix: `service-${service._id}` });
      data.thumbnail = cachedThumbnail;
    }
    Object.assign(service, data, { updatedAt: new Date() });
    await service.save();
    if (cachedThumbnail) await removeUploadedImage(previousThumbnail);
    res.redirect("/services");
  } catch (err) {
    if (cachedThumbnail) await removeUploadedImage(cachedThumbnail).catch(() => {});
    console.error("Error updating service:", err);
    res.status(500).render("editservice", { user: req.session.user, service, categories, error: "Failed to update the service or download its image." });
  }
});

router.post("/:id/toggle", requireProvider, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.redirect("/services");
  const service = await Service.findOne({ _id: req.params.id, provider: req.session.user.id, deletedAt: null });
  if (!service) return res.redirect("/services");
  service.isActive = !service.isActive;
  service.updatedAt = new Date();
  await service.save();
  if (!service.isActive) {
    await notifyServiceUnavailable(service, `${service.title} has been paused by its provider.`);
  }
  res.redirect("/services");
});

router.post("/:id/delete", requireProvider, async (req, res) => {
  if (isObjectId(req.params.id)) {
    const service = await Service.findOneAndUpdate({ _id: req.params.id, provider: req.session.user.id, deletedAt: null }, { isActive: false, deletedAt: new Date(), updatedAt: new Date() }, { new: true });
    if (service) await notifyServiceUnavailable(service, `${service.title} was removed by its provider.`);
  }
  res.redirect("/services");
});

module.exports = router;
