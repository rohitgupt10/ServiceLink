require("dotenv").config();
const mongoose = require("mongoose");
const Service = require("./models/Service");
const User = require("./models/User");
const { cacheRemoteImage } = require("./lib/images");

const providerIds = [
  "68b3194bc6c9e8de2895f53e",
  "68b2b2ec3efbd0ca79c59cd0",
  "68b2699679786b0f0618aceb",
  "68cad8a363ab3dfbbaccfa88",
  "68ce66e702817a98f4815ff5",
];

const services = [
  {
    title: "Home Technology Care",
    description:
      "Patient, practical help for Wi-Fi, printers, laptops, smart TVs, and everyday device setup. I explain each step clearly and leave your home technology working reliably.",
    price: 500,
    location: "Damak, Jhapa",
    contact: "9820202020",
    category: "Tech Support",
    providerIndex: 0,
    averageRating: 4.8,
    totalReviews: 18,
    viewCount: 142,
    tags: ["wifi", "computer setup", "device support"],
    thumbnail:
      "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "English & Mathematics Tutoring",
    description:
      "Structured one-to-one tutoring for school learners, with patient explanations, guided practice, and a simple learning plan tailored to each student's goals.",
    price: 100,
    location: "Surunga, Jhapa",
    contact: "+9779814971345",
    category: "Tutoring",
    providerIndex: 1,
    averageRating: 4.9,
    totalReviews: 24,
    viewCount: 218,
    tags: ["school support", "english", "mathematics"],
    thumbnail:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Exam Preparation Coaching",
    description:
      "Focused study sessions that turn difficult topics into a manageable weekly plan. Ideal for revision, homework support, and building confident exam habits.",
    price: 150,
    location: "Shivasatakshi, Jhapa",
    contact: "9827948346",
    category: "Tutoring",
    providerIndex: 2,
    averageRating: 4.6,
    totalReviews: 11,
    viewCount: 96,
    tags: ["exam prep", "homework", "study plan"],
    thumbnail:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Move-in & Move-out Cleaning",
    description:
      "Detailed cleaning for homes, rented rooms, and offices. I bring a careful checklist for kitchens, bathrooms, floors, windows, and the finishing touches that make a space feel ready.",
    price: 350,
    location: "Damak, Jhapa",
    contact: "9816946415",
    category: "Cleaning",
    providerIndex: 2,
    averageRating: 4.7,
    totalReviews: 16,
    viewCount: 173,
    tags: ["deep clean", "move-out", "office cleaning"],
    thumbnail:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Garden Care & Seasonal Planting",
    description:
      "Reliable garden maintenance including trimming, soil preparation, planting, pruning, and practical advice for keeping outdoor spaces healthy through the seasons.",
    price: 300,
    location: "Pathari, Morang",
    contact: "9824203020",
    category: "Gardening",
    providerIndex: 0,
    averageRating: 4.8,
    totalReviews: 9,
    viewCount: 84,
    tags: ["plant care", "pruning", "landscaping"],
    thumbnail:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Careful Home Moving Assistance",
    description:
      "A dependable moving team for packing, lifting, furniture disassembly, transport coordination, and careful unloading. Clear planning helps your move stay on schedule.",
    price: 800,
    location: "Shivasatakshi, Jhapa",
    contact: "9820104050",
    category: "Moving",
    providerIndex: 2,
    averageRating: 4.7,
    totalReviews: 13,
    viewCount: 127,
    tags: ["packing", "lifting", "home moving"],
    thumbnail:
      "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Furniture Assembly & Repairs",
    description:
      "Professional assembly for flat-pack, office, and custom furniture, with minor repairs and adjustments to make every piece stable, aligned, and ready to use.",
    price: 500,
    location: "Pathari, Morang",
    contact: "9824203020",
    category: "Furniture Assembly",
    providerIndex: 0,
    averageRating: 4.9,
    totalReviews: 21,
    viewCount: 204,
    tags: ["ikea assembly", "furniture repair", "installation"],
    thumbnail:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Personal Errands & Admin Support",
    description:
      "Professional support for scheduling, document organization, errands, calls, and day-to-day coordination. I work from a clear priority list and keep communication straightforward.",
    price: 500,
    location: "Dudhe, Jhapa",
    contact: "9840506010",
    category: "Personal Assistant",
    providerIndex: 3,
    averageRating: 4.8,
    totalReviews: 7,
    viewCount: 65,
    tags: ["errands", "scheduling", "admin support"],
    thumbnail:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Same-day Local Delivery",
    description:
      "Secure delivery for food, groceries, documents, and small packages across the local area. I provide dependable pickup, careful handling, and timely drop-off updates.",
    price: 350,
    location: "Birtamode, Jhapa",
    contact: "9840506010",
    category: "Delivery",
    providerIndex: 3,
    averageRating: 4.7,
    totalReviews: 14,
    viewCount: 156,
    tags: ["same day", "documents", "groceries"],
    thumbnail:
      "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Residential Plumbing & Fixes",
    description:
      "Practical plumbing support for leaks, taps, sinks, drainage, water connections, and small household repairs, with transparent assessment before work begins.",
    price: 450,
    location: "Birtamode, Jhapa",
    contact: "9814785946",
    category: "Handyman",
    providerIndex: 4,
    averageRating: 4.6,
    totalReviews: 8,
    viewCount: 91,
    tags: ["plumbing", "leak repair", "home maintenance"],
    thumbnail:
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Home Painting & Wall Refresh",
    description:
      "Neat interior painting for bedrooms, living spaces, and offices. I help with color preparation, surface touch-ups, clean edges, and an organized finish.",
    price: 650,
    location: "Damak, Jhapa",
    contact: "9820202020",
    category: "Handyman",
    providerIndex: 0,
    averageRating: 4.8,
    totalReviews: 10,
    viewCount: 119,
    tags: ["painting", "interiors", "wall repair"],
    thumbnail:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80",
  },
];

async function seedServices() {
  await mongoose.connect(process.env.MONGODB_URI);

  const referenceProviders = await User.find({
    _id: { $in: providerIds },
    role: "provider",
  }).select("_id");
  let seedProviderIds = referenceProviders.map((provider) =>
    provider._id.toString(),
  );

  if (seedProviderIds.length === 0) {
    const availableProviders = await User.find({ role: "provider" })
      .select("_id")
      .sort({ createdAt: 1 })
      .limit(providerIds.length);
    seedProviderIds = availableProviders.map((provider) =>
      provider._id.toString(),
    );
  }

  if (seedProviderIds.length === 0) {
    throw new Error(
      "No provider accounts found. Create a provider account before seeding services.",
    );
  }

  const locallyStoredServices = [];
  for (const service of services) {
    locallyStoredServices.push({
      ...service,
      thumbnail: await cacheRemoteImage(service.thumbnail, { folder: "services", prefix: `seed-${service.title}`, permanent: true }),
    });
  }

  const operations = locallyStoredServices.map(({ providerIndex, ...service }) => ({
    updateOne: {
      filter: {
        title: service.title,
        provider: seedProviderIds[providerIndex % seedProviderIds.length],
      },
      update: {
        $set: {
          ...service,
          provider: seedProviderIds[providerIndex % seedProviderIds.length],
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  const result = await Service.bulkWrite(operations);
  console.log(
    `Services seeded: ${result.upsertedCount} added, ${result.modifiedCount} updated.`,
  );
}

seedServices()
  .catch((error) => {
    console.error("Service seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
