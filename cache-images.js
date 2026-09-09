require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("./models/Review");
const Service = require("./models/Service");
const User = require("./models/User");
const { cacheRemoteImage } = require("./lib/images");

const DEFAULT_AVATAR = "/images/default-avatar.svg";
const DEFAULT_SERVICE = "/images/service-placeholder.svg";

function isUnreliablePlaceholder(value) {
  return !value || /(?:via\.placeholder\.com|placehold\.co)/i.test(value);
}

async function cacheRecordImage(value, options, fallback) {
  if (isUnreliablePlaceholder(value)) return fallback;
  if (String(value).startsWith("/")) return value;
  try {
    return await cacheRemoteImage(value, { ...options, permanent: true });
  } catch (error) {
    console.warn(`Using fallback for ${options.prefix}: ${error.message}`);
    return fallback;
  }
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(process.env.MONGODB_URI);
  const [users, services, reviews] = await Promise.all([User.find(), Service.find(), Review.find({ images: { $exists: true, $ne: [] } })]);

  for (const user of users) {
    user.avatar = await cacheRecordImage(user.avatar, { folder: "avatars", prefix: `user-${user._id}` }, DEFAULT_AVATAR);
    await user.save();
  }

  for (const service of services) {
    service.thumbnail = await cacheRecordImage(service.thumbnail, { folder: "services", prefix: `service-${service._id}` }, DEFAULT_SERVICE);
    await service.save();
  }

  for (const review of reviews) {
    review.images = await Promise.all(review.images.map((image, index) => cacheRecordImage(image, { folder: "reviews", prefix: `review-${review._id}-${index + 1}` }, DEFAULT_SERVICE)));
    await review.save();
  }

  console.log(`Cached images for ${users.length} users, ${services.length} services, and ${reviews.length} reviews.`);
}

run().catch((error) => {
  console.error("Image caching failed:", error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
