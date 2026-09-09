const Service = require("../models/Service");
const User = require("../models/User");

const accounts = [
  { name: "ServiceLink Admin", email: "admin@servicelink.local", password: "Admin123456!", contact: "Local administrator", role: "admin" },
  { name: "Demo Customer", email: "user@servicelink.local", password: "User12345!", contact: "9800000000", role: "user" },
  { name: "Demo Provider", email: "provider@servicelink.local", password: "Provider123!", contact: "9800000001", role: "provider" },
];

async function ensureAccount(account) {
  let user = await User.findOne({ email: account.email });
  if (!user) return User.create({ ...account, isVerified: true });
  user.role = account.role;
  user.isActive = true;
  user.isVerified = true;
  await user.save();
  return user;
}

async function seedLocalData() {
  const users = [];
  for (const account of accounts) users.push(await ensureAccount(account));
  const provider = users.find((user) => user.role === "provider");

  const services = [
    { title: "Home Technology Care", description: "Patient help for Wi-Fi, printers, laptops, smart TVs, and everyday device setup.", price: 500, location: "Damak, Jhapa", category: "Tech Support", tags: ["wifi", "computers"], thumbnail: "/images/services/service-6a99958c05f20cf3a7440029.jpg" },
    { title: "English & Mathematics Tutoring", description: "Structured one-to-one tutoring with patient explanations and guided practice.", price: 100, location: "Surunga, Jhapa", category: "Tutoring", tags: ["english", "mathematics"], thumbnail: "/images/services/service-6a99958c05f20cf3a744002a.jpg" },
    { title: "Move-in & Move-out Cleaning", description: "Detailed home and office cleaning with a careful room-by-room checklist.", price: 350, location: "Damak, Jhapa", category: "Cleaning", tags: ["deep clean", "office"], thumbnail: "/images/services/service-6a99958c05f20cf3a744002c.jpg" },
  ];

  for (const service of services) {
    await Service.updateOne(
      { title: service.title, provider: provider._id },
      {
        $set: { ...service, contact: provider.contact, provider: provider._id, isActive: true, deletedAt: null, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }
  console.log("Local demo accounts ready (passwords are documented in LOCAL-DEVELOPMENT.md).");
}

module.exports = { seedLocalData };
